const crypto = require('crypto');
const router = require('express').Router();
const config = require('../config');
const { db, NOID } = require('../db');
const { str, wrap } = require('../utils');
const { getUser, requireAdmin, requireUser } = require('../security');
const { notifyOrder, sendMail, orderMailHtml } = require('../notify');

const { freeShipThreshold, shippingFee, vouchers } = config.shop;
const STATUS = ['Mới', 'Đã xác nhận', 'Đang giao', 'Hoàn thành', 'Đã huỷ'];

// ---- Tồn kho: trừ nguyên tử ($gte + $inc) để 2 khách đặt cùng lúc không làm âm kho ----
// Sản phẩm không đặt số tồn (stock = null) coi như không giới hạn.
async function releaseStock(items) {
  for (const it of items) await db.Products.updateOne({ id: it.id, stock: { $gte: 0 } }, { $inc: { stock: it.qty } });
}
async function reserveStock(items, products) {
  const done = [];
  for (const it of items) {
    const p = products.find(x => x.id === it.id);
    if (typeof p.stock !== 'number') continue;
    const r = await db.Products.updateOne({ id: it.id, stock: { $gte: it.qty } }, { $inc: { stock: -it.qty } });
    if (!r.matchedCount) {
      await releaseStock(done);
      const cur = await db.Products.findOne({ id: it.id }, NOID);
      return `"${p.name}" chỉ còn ${cur && typeof cur.stock === 'number' ? cur.stock : 0} sản phẩm`;
    }
    done.push(it);
  }
  return null;
}

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

  const user = getUser(req);
  let email = str(b.email, 100).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = '';
  if (!email && user && user.role !== 'admin') { const acc = await db.Users.findOne({ uid: user.uid }); email = acc ? acc.email : ''; }

  const shortage = await reserveStock(items, found);
  if (shortage) return res.status(409).json({ error: shortage });

  let id = str(b.orderId, 12);
  if (!/^DMF\d{6}$/.test(id) || await db.Orders.findOne({ id })) id = 'DMF' + Date.now().toString().slice(-6);
  const order = { id, name: str(b.name, 100), phone, email, address: str(b.address, 300), notes: str(b.notes, 500),
    payment: b.payment === 'VIETQR' ? 'VIETQR' : 'COD', items, subtotal, discount, shipping, total: after + shipping,
    status: 'Mới', paid: false, userId: (user || {}).uid || null, createdAt: new Date().toISOString() };
  try { await db.Orders.insertOne({ ...order }); } catch (e) { await releaseStock(items); throw e; }
  notifyOrder(order);
  if (email) sendMail(email, `Xác nhận đơn hàng #${order.id} - Diễm My Fashion`, orderMailHtml(order)).catch(e => console.error('Gửi mail đơn lỗi:', e.message));
  res.json({ id: order.id, total: order.total });
}));

router.get('/my-orders', requireUser, wrap(async (req, res) =>
  res.json(await db.Orders.find({ userId: req.user.uid }, NOID).sort({ createdAt: -1 }).limit(100).toArray())));
router.get('/admin/orders', requireAdmin, wrap(async (req, res) =>
  res.json(await db.Orders.find({}, NOID).sort({ createdAt: -1 }).limit(500).toArray())));
router.patch('/admin/orders/:id', requireAdmin, wrap(async (req, res) => {
  const status = req.body.status, o = await db.Orders.findOne({ id: req.params.id });
  if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn' });
  if (!STATUS.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  if (o.status === 'Đã huỷ' && status !== 'Đã huỷ') return res.status(400).json({ error: 'Đơn đã huỷ không thể mở lại, hãy nhờ khách đặt đơn mới' });
  if (status === 'Đã huỷ' && o.status !== 'Đã huỷ') await releaseStock(o.items);     // huỷ đơn => trả hàng về kho
  await db.Orders.updateOne({ id: o.id }, { $set: { status } });
  res.json({ ok: true });
}));
router.delete('/admin/orders/:id', requireAdmin, wrap(async (req, res) => {   // chỉ xoá được đơn đã huỷ
  const r = await db.Orders.deleteOne({ id: req.params.id, status: 'Đã huỷ' });
  if (!r.deletedCount) return res.status(400).json({ error: 'Chỉ xoá được đơn ở trạng thái Đã huỷ' });
  res.json({ ok: true });
}));

// ---- SePay webhook: tự xác nhận chuyển khoản khi nội dung chứa mã đơn (DMFxxxxxx) ----
router.post('/webhook/sepay', wrap(async (req, res) => {
  if (!config.sepayKey) return res.status(503).json({ success: false, error: 'Chưa bật SePay' });
  const a = Buffer.from(req.get('authorization') || ''), b = Buffer.from('Apikey ' + config.sepayKey);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ success: false });
  const d = req.body || {};
  const m = d.transferType === 'in' && /DMF\d{6}/i.exec(String(d.content || ''));
  const o = m && await db.Orders.findOne({ id: m[0].toUpperCase() });
  const txn = String(d.id ?? '');
  if (!o || !txn || (o.paidTxns || []).includes(txn)) return res.json({ success: true });   // bỏ qua giao dịch lạ / trùng
  const paidAmount = (o.paidAmount || 0) + (Number(d.transferAmount) || 0);
  const set = { paidAmount, paidTxns: [...(o.paidTxns || []), txn] };
  if (paidAmount >= o.total) { set.paid = true; set.paidAt = new Date().toISOString(); if (o.status === 'Mới') set.status = 'Đã xác nhận'; }
  await db.Orders.updateOne({ id: o.id }, { $set: set });
  res.json({ success: true });
}));
module.exports = router;
