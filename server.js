require('dotenv').config();
const express = require('express'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { MongoClient } = require('mongodb');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!process.env.MONGODB_URI) { console.error('Thiếu MONGODB_URI'); process.exit(1); }
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) { console.error('Thiếu ADMIN_PASSWORD (>= 8 ký tự) trong file .env'); process.exit(1); }

// Cấu hình giá trị đơn hàng (PHẢI khớp public/js/config.js)
const CFG = { freeShip: 2000000, shipFee: 30000, vouchers: { DIEMMY10: 0.10, DIEMMYVIP: 0.20 } };

const app = express();
app.set('trust proxy', 1);                       // chạy sau proxy của Render: lấy đúng IP khách
app.disable('x-powered-by');
app.use((req, res, next) => {                    // header bảo mật cơ bản
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  next();
});
app.get('/healthz', (req, res) => res.send('ok'));

// Báo đơn mới về điện thoại chủ shop qua Telegram (tuỳ chọn, cần TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID)
function notifyOrder(o) {
  const { TELEGRAM_BOT_TOKEN: t, TELEGRAM_CHAT_ID: c } = process.env;
  if (!t || !c) return;
  const text = `ĐƠN MỚI #${o.id}\n${o.name} - ${o.phone}\n${o.address}\n` +
    o.items.map(i => `- ${i.name} (${i.size}/${i.color}) x${i.qty}`).join('\n') +
    `\nTổng: ${o.total.toLocaleString('vi-VN')} đ (${o.payment === 'VIETQR' ? 'chuyển khoản' : 'COD'})` + (o.notes ? `\nGhi chú: ${o.notes}` : '');
  fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: c, text })
  }).catch(e => console.error('Telegram lỗi:', e.message));
}
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

let Products, Orders;
const NOID = { projection: { _id: 0 } };
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Lỗi máy chủ, thử lại sau' }); });
const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);

// ---- Quản trị: đăng nhập bằng mật khẩu, nhận token tạm ----
const tokens = new Map();
const fails = new Map();
app.post('/api/admin/login', (req, res) => {
  const ip = req.ip, f = fails.get(ip) || { n: 0, t: 0 };
  if (f.n >= 5 && Date.now() - f.t < 15 * 60000) return res.status(429).json({ error: 'Thử quá nhiều lần, đợi 15 phút' });
  const a = Buffer.from(str(req.body.password, 100)), b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { fails.set(ip, { n: f.n + 1, t: Date.now() }); return res.status(401).json({ error: 'Sai mật khẩu' }); }
  fails.delete(ip);
  const t = crypto.randomBytes(24).toString('hex'); tokens.set(t, Date.now() + 8 * 3600000);
  res.json({ token: t });
});
const auth = (req, res, next) => {
  const exp = tokens.get(req.get('x-admin-token'));
  if (!exp || exp < Date.now()) return res.status(401).json({ error: 'Chưa đăng nhập' });
  next();
};

// ---- Sản phẩm ----
app.get('/api/products', wrap(async (req, res) => res.json(await Products.find({}, NOID).sort({ _id: 1 }).toArray())));
const cleanProduct = (b, id) => ({
  id, name: str(b.name, 150), category: str(b.category, 30),
  price: Math.max(0, Number(b.price) || 0), originalPrice: Math.max(0, Number(b.originalPrice) || 0),
  rating: Math.min(5, Number(b.rating) || 5), badge: str(b.badge, 20), image: str(b.image, 500),
  sizes: [].concat(b.sizes || []).map(s => str(s, 20)).filter(Boolean),
  colors: [].concat(b.colors || []).map(s => str(s, 40)).filter(Boolean),
  material: str(b.material, 150), desc: str(b.desc, 800)
});
app.post('/api/admin/products', auth, wrap(async (req, res) => {
  const p = cleanProduct(req.body, 'DMF-' + Date.now().toString().slice(-6));
  if (!p.name || !p.price || !p.sizes.length || !p.colors.length) return res.status(400).json({ error: 'Thiếu tên, giá, size hoặc màu' });
  await Products.insertOne({ ...p }); res.json(p);
}));
app.put('/api/admin/products/:id', auth, wrap(async (req, res) => {
  const p = cleanProduct(req.body, req.params.id);
  const r = await Products.replaceOne({ id: p.id }, p);
  if (!r.matchedCount) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json(p);
}));
app.delete('/api/admin/products/:id', auth, wrap(async (req, res) => {
  await Products.deleteOne({ id: req.params.id }); res.json({ ok: true });
}));

// ---- Đơn hàng: server tự tính lại tiền, không tin giá từ trình duyệt ----
app.post('/api/orders', wrap(async (req, res) => {
  const b = req.body, items = [];
  const phone = str(b.phone, 15).replace(/\s/g, '');
  if (!str(b.name) || !str(b.address) || !/^(0|\+84)\d{9}$/.test(phone)) return res.status(400).json({ error: 'Thông tin giao hàng chưa hợp lệ' });
  const cart = [].concat(b.items || []).slice(0, 50);
  const found = await Products.find({ id: { $in: cart.map(i => str(i.id, 30)) } }, NOID).toArray();
  for (const it of cart) {
    const p = found.find(x => x.id === it.id), qty = Math.floor(Number(it.qty));
    if (!p || !(qty >= 1 && qty <= 99)) return res.status(400).json({ error: 'Sản phẩm trong giỏ không hợp lệ' });
    items.push({ id: p.id, name: p.name, price: p.price, size: str(it.size, 20), color: str(it.color, 40), qty });
  }
  if (!items.length) return res.status(400).json({ error: 'Giỏ hàng trống' });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const rate = CFG.vouchers[str(b.voucher, 30).toUpperCase()] || 0;
  const discount = Math.round(subtotal * rate), after = subtotal - discount;
  const shipping = after >= CFG.freeShip ? 0 : CFG.shipFee;
  let id = str(b.orderId, 12);
  if (!/^DMF\d{6}$/.test(id) || await Orders.findOne({ id })) id = 'DMF' + Date.now().toString().slice(-6);
  const order = { id, name: str(b.name, 100), phone, address: str(b.address, 300), notes: str(b.notes, 500),
    payment: b.payment === 'VIETQR' ? 'VIETQR' : 'COD', items, subtotal, discount, shipping, total: after + shipping,
    status: 'Mới', createdAt: new Date().toISOString() };
  await Orders.insertOne({ ...order }); notifyOrder(order);
  res.json({ id: order.id, total: order.total });
}));
const STATUS = ['Mới', 'Đã xác nhận', 'Đang giao', 'Hoàn thành', 'Đã huỷ'];
app.get('/api/admin/orders', auth, wrap(async (req, res) => res.json(await Orders.find({}, NOID).sort({ createdAt: -1 }).limit(500).toArray())));
app.patch('/api/admin/orders/:id', auth, wrap(async (req, res) => {
  if (!STATUS.includes(req.body.status)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  const r = await Orders.updateOne({ id: req.params.id }, { $set: { status: req.body.status } });
  if (!r.matchedCount) return res.status(404).json({ error: 'Không tìm thấy đơn' });
  res.json({ ok: true });
}));

// ---- Kết nối MongoDB rồi mới mở cổng ----
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'diemmy');
  Products = db.collection('products'); Orders = db.collection('orders');
  await Products.createIndex({ id: 1 }, { unique: true });
  await Orders.createIndex({ id: 1 }, { unique: true });
  if (await Products.countDocuments() === 0) {            // lần đầu: nhập sản phẩm mẫu
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8'));
    await Products.insertMany(seed); console.log('Đã nhập', seed.length, 'sản phẩm mẫu');
  }
  app.listen(process.env.PORT || 3000, () => console.log('Chạy tại cổng ' + (process.env.PORT || 3000)));
})().catch(e => { console.error('Không kết nối được MongoDB:', e.message); process.exit(1); });
