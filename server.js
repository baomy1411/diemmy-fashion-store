require('dotenv').config();
const express = require('express'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
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

const F = n => path.join(__dirname, 'data', n + '.json');
const load = n => { try { return JSON.parse(fs.readFileSync(F(n), 'utf8')); } catch { return []; } };
const save = (n, d) => fs.writeFileSync(F(n), JSON.stringify(d, null, 2));
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
app.get('/api/products', (req, res) => res.json(load('products')));
const cleanProduct = (b, id) => ({
  id, name: str(b.name, 150), category: str(b.category, 30),
  price: Math.max(0, Number(b.price) || 0), originalPrice: Math.max(0, Number(b.originalPrice) || 0),
  rating: Math.min(5, Number(b.rating) || 5), badge: str(b.badge, 20), image: str(b.image, 500),
  sizes: [].concat(b.sizes || []).map(s => str(s, 20)).filter(Boolean),
  colors: [].concat(b.colors || []).map(s => str(s, 40)).filter(Boolean),
  material: str(b.material, 150), desc: str(b.desc, 800)
});
app.post('/api/admin/products', auth, (req, res) => {
  const list = load('products'), p = cleanProduct(req.body, 'DMF-' + Date.now().toString().slice(-6));
  if (!p.name || !p.price || !p.sizes.length || !p.colors.length) return res.status(400).json({ error: 'Thiếu tên, giá, size hoặc màu' });
  list.push(p); save('products', list); res.json(p);
});
app.put('/api/admin/products/:id', auth, (req, res) => {
  const list = load('products'), i = list.findIndex(p => p.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Không tìm thấy' });
  list[i] = cleanProduct(req.body, list[i].id); save('products', list); res.json(list[i]);
});
app.delete('/api/admin/products/:id', auth, (req, res) => {
  save('products', load('products').filter(p => p.id !== req.params.id)); res.json({ ok: true });
});

// ---- Đơn hàng: server tự tính lại tiền, không tin giá từ trình duyệt ----
app.post('/api/orders', (req, res) => {
  const b = req.body, products = load('products'), items = [];
  const phone = str(b.phone, 15).replace(/\s/g, '');
  if (!str(b.name) || !str(b.address) || !/^(0|\+84)\d{9}$/.test(phone)) return res.status(400).json({ error: 'Thông tin giao hàng chưa hợp lệ' });
  for (const it of [].concat(b.items || []).slice(0, 50)) {
    const p = products.find(x => x.id === it.id), qty = Math.floor(Number(it.qty));
    if (!p || !(qty >= 1 && qty <= 99)) return res.status(400).json({ error: 'Sản phẩm trong giỏ không hợp lệ' });
    items.push({ id: p.id, name: p.name, price: p.price, size: str(it.size, 20), color: str(it.color, 40), qty });
  }
  if (!items.length) return res.status(400).json({ error: 'Giỏ hàng trống' });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const rate = CFG.vouchers[str(b.voucher, 30).toUpperCase()] || 0;
  const discount = Math.round(subtotal * rate), after = subtotal - discount;
  const shipping = after >= CFG.freeShip ? 0 : CFG.shipFee;
  const orders = load('orders');
  let id = str(b.orderId, 12); if (!/^DMF\d{6}$/.test(id) || orders.some(o => o.id === id)) id = 'DMF' + Date.now().toString().slice(-6);
  const order = { id, name: str(b.name, 100), phone, address: str(b.address, 300), notes: str(b.notes, 500),
    payment: b.payment === 'VIETQR' ? 'VIETQR' : 'COD', items, subtotal, discount, shipping, total: after + shipping,
    status: 'Mới', createdAt: new Date().toISOString() };
  orders.push(order); save('orders', orders); notifyOrder(order);
  res.json({ id: order.id, total: order.total });
});
const STATUS = ['Mới', 'Đã xác nhận', 'Đang giao', 'Hoàn thành', 'Đã huỷ'];
app.get('/api/admin/orders', auth, (req, res) => res.json(load('orders').reverse()));
app.patch('/api/admin/orders/:id', auth, (req, res) => {
  const list = load('orders'), o = list.find(x => x.id === req.params.id);
  if (!o || !STATUS.includes(req.body.status)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  o.status = req.body.status; save('orders', list); res.json(o);
});

app.listen(process.env.PORT || 3000, () => console.log('Chạy tại http://localhost:' + (process.env.PORT || 3000)));
