const router = require('express').Router();
const { db, NOID } = require('../db');
const { wrap } = require('../utils');
const { requireAdmin } = require('../security');

// Ô bắt đầu bằng = + - @ bị Excel hiểu là công thức => thêm dấu ' phía trước để chặn chèn công thức
const cell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };

router.get('/admin/export/orders.csv', requireAdmin, wrap(async (req, res) => {
  const orders = await db.Orders.find({}, NOID).sort({ createdAt: -1 }).toArray();
  const head = ['Mã đơn', 'Thời gian', 'Khách hàng', 'Điện thoại', 'Email', 'Địa chỉ', 'Sản phẩm', 'Phí ship', 'Giảm giá', 'Tổng tiền', 'Thanh toán', 'Đã nhận tiền', 'Trạng thái', 'Ghi chú'];
  const rows = orders.map(o => [o.id, new Date(o.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }), o.name, o.phone, o.email || '', o.address,
    o.items.map(i => `${i.name} (${i.size}/${i.color}) x${i.qty}`).join('; '), o.shipping, o.discount, o.total,
    o.payment === 'VIETQR' ? 'Chuyển khoản' : 'COD', o.paid ? 'Đã nhận' : (o.paidAmount ? 'Mới nhận ' + o.paidAmount : 'Chưa'), o.status, o.notes]);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="don-hang.csv"' });
  res.send('\ufeff' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n'));     // BOM để Excel đọc đúng tiếng Việt
}));

router.get('/admin/backup.json', requireAdmin, wrap(async (req, res) => {
  const [products, orders, users] = await Promise.all([
    db.Products.find({}, NOID).toArray(), db.Orders.find({}, NOID).toArray(),
    db.Users.find({}, { projection: { _id: 0, name: 1, email: 1, phone: 1, createdAt: 1 } }).toArray()]);   // không xuất mật khẩu
  res.set({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="sao-luu.json"' });
  res.send(JSON.stringify({ exportedAt: new Date().toISOString(), products, orders, users }, null, 2));
}));
module.exports = router;
