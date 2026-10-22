const router = require('express').Router();
const config = require('../config');
const { db, NOID } = require('../db');
const { str, wrap } = require('../utils');
const { getUser, requireAdmin, requireUser } = require('../security');
const { notifyOrder } = require('../notify');

const { freeShipThreshold, shippingFee, vouchers } = config.shop;
const STATUS = ['Mới', 'Đã xác nhận', 'Đang giao', 'Hoàn thành', 'Đã huỷ'];

// Trang web lấy phí ship từ đây => chỉ cần sửa ở src/config.js
router.get('/config', (req, res) => res.json({ freeShipThreshold, shippingFee }));
router.post('/voucher', (req, res) => {
  const rate = vouchers[str(req.body.code, 30).toUpperCase()];
  rate ? res.json({ rate }) : res.status(404).json({ error: 'Mã giảm giá không hợp lệ' });
});

// Server tự tính lại tiền từ giá trong kho, không tin giá từ trình duyệt
router.post('/orders', wrap(async (req, res) => {
  const b = req.body, items = [];
  const phone = str(b.phone, 15).replace(/\s/g, '');
  if (!str(b.name) || !str(b.address) || !/^(0|\+84)\d{9}$/.test(phone)) return res.status(400).json({ error: 'Thông tin giao hàng chưa hợp lệ' });
  const cart = [].concat(b.items || []).slice(0, 50);
  const found = await db.Products.find({ id: { $in: cart.map(i => str(i.id, 30)) } }, NOID).toArray();
  for (const it of cart) {
    const p = found.find(x => x.id === it.id), qty = Math.floor(Number(it.qty));
    if (!p || !(qty >= 1 && qty <= 99)) return res.status(400).json({ error: 'Có sản phẩm trong giỏ không còn bán, vui lòng tải lại trang' });
    items.push({ id: p.id, name: p.name, price: p.price, size: str(it.size, 20), color: str(it.color, 40), qty });
  }
  if (!items.length) return res.status(400).json({ error: 'Giỏ hàng trống' });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = Math.round(subtotal * (vouchers[str(b.voucher, 30).toUpperCase()] || 0)), after = subtotal - discount;
  const shipping = after >= freeShipThreshold ? 0 : shippingFee;
  let id = str(b.orderId, 12);
  if (!/^DMF\d{6}$/.test(id) || await db.Orders.findOne({ id })) id = 'DMF' + Date.now().toString().slice(-6);
  const order = { id, name: str(b.name, 100), phone, address: str(b.address, 300), notes: str(b.notes, 500),
    payment: b.payment === 'VIETQR' ? 'VIETQR' : 'COD', items, subtotal, discount, shipping, total: after + shipping,
    status: 'Mới', userId: (getUser(req) || {}).uid || null, createdAt: new Date().toISOString() };
  await db.Orders.insertOne({ ...order }); notifyOrder(order);
  res.json({ id: order.id, total: order.total });
}));

router.get('/my-orders', requireUser, wrap(async (req, res) =>
  res.json(await db.Orders.find({ userId: req.user.uid }, NOID).sort({ createdAt: -1 }).limit(100).toArray())));
router.get('/admin/orders', requireAdmin, wrap(async (req, res) =>
  res.json(await db.Orders.find({}, NOID).sort({ createdAt: -1 }).limit(500).toArray())));
router.patch('/admin/orders/:id', requireAdmin, wrap(async (req, res) => {
  if (!STATUS.includes(req.body.status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  const r = await db.Orders.updateOne({ id: req.params.id }, { $set: { status: req.body.status } });
  if (!r.matchedCount) return res.status(404).json({ error: 'Không tìm thấy đơn' });
  res.json({ ok: true });
}));
router.delete('/admin/orders/:id', requireAdmin, wrap(async (req, res) => {   // chỉ xoá được đơn đã huỷ
  const r = await db.Orders.deleteOne({ id: req.params.id, status: 'Đã huỷ' });
  if (!r.deletedCount) return res.status(400).json({ error: 'Chỉ xoá được đơn ở trạng thái Đã huỷ' });
  res.json({ ok: true });
}));
module.exports = router;
