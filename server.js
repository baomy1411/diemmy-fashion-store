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
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
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

let Products, Orders, Users, Images, Resets;
const NOID = { projection: { _id: 0 } };
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Lỗi máy chủ, thử lại sau' }); });
const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);

// ---- Tài khoản: khách + quản trị dùng chung 1 form đăng nhập ----
const ADMIN_EMAIL = str(process.env.ADMIN_EMAIL || 'admin', 100).toLowerCase();
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('dm|' + ADMIN_PASSWORD).digest('hex');
const sign = d => { const b = Buffer.from(JSON.stringify({ ...d, exp: Date.now() + 7 * 864e5 })).toString('base64url');
  return b + '.' + crypto.createHmac('sha256', SECRET).update(b).digest('base64url'); };
const verify = t => { try {
  const [b, s] = String(t).split('.'), e = crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
  if (s.length !== e.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e))) return null;
  const d = JSON.parse(Buffer.from(b, 'base64url')); return d.exp > Date.now() ? d : null; } catch { return null; } };
const getUser = req => verify((req.get('authorization') || '').replace(/^Bearer /, ''));
const auth = (req, res, next) => { const u = getUser(req); if (!u || u.role !== 'admin') return res.status(401).json({ error: 'Chưa đăng nhập quản trị' }); next(); };
const needUser = (req, res, next) => { const u = getUser(req); if (!u) return res.status(401).json({ error: 'Vui lòng đăng nhập' }); req.user = u; next(); };
const hashPw = pw => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex'); };
const checkPw = (pw, h) => { const [salt, k] = String(h).split(':'); const t = crypto.scryptSync(pw, salt, 64), kb = Buffer.from(k || '', 'hex'); return kb.length === t.length && crypto.timingSafeEqual(t, kb); };
const fails = new Map();
const blocked = ip => { const f = fails.get(ip); return f && f.n >= 8 && Date.now() - f.t < 15 * 60000; };
const fail = ip => fails.set(ip, { n: (fails.get(ip)?.n || 0) + 1, t: Date.now() });
const session = (uid, name, role) => ({ token: sign({ uid, name, role }), user: { name, role } });

app.post('/api/register', wrap(async (req, res) => {
  if (blocked(req.ip)) return res.status(429).json({ error: 'Thử quá nhiều lần, đợi 15 phút' });
  const b = req.body, name = str(b.name, 100), email = str(b.email, 100).toLowerCase(), phone = str(b.phone, 15).replace(/\s/g, ''), pw = str(b.password, 100);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === ADMIN_EMAIL) return res.status(400).json({ error: 'Họ tên hoặc email không hợp lệ' });
  if (phone && !/^(0|\+84)\d{9}$/.test(phone)) return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
  if (pw.length < 8) return res.status(400).json({ error: 'Mật khẩu tối thiểu 8 ký tự' });
  const uid = 'U' + crypto.randomBytes(6).toString('hex');
  try { await Users.insertOne({ uid, name, email, phone, pass: hashPw(pw), createdAt: new Date().toISOString() }); }
  catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'Email này đã được đăng ký' }); throw e; }
  fail(req.ip);
  res.json(session(uid, name, 'customer'));
}));
app.post('/api/login', wrap(async (req, res) => {
  if (blocked(req.ip)) return res.status(429).json({ error: 'Thử quá nhiều lần, đợi 15 phút' });
  const email = str(req.body.email, 100).toLowerCase(), pw = str(req.body.password, 100);
  if (email === ADMIN_EMAIL) {
    const a = Buffer.from(pw), b = Buffer.from(ADMIN_PASSWORD);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) { fails.delete(req.ip); return res.json(session('admin', 'Quản trị viên', 'admin')); }
  } else {
    const u = await Users.findOne({ email });
    if (u && checkPw(pw, u.pass)) { fails.delete(req.ip); return res.json(session(u.uid, u.name, 'customer')); }
  }
  fail(req.ip); res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
}));
app.get('/api/my-orders', needUser, wrap(async (req, res) =>
  res.json(await Orders.find({ userId: req.user.uid }, NOID).sort({ createdAt: -1 }).limit(100).toArray())));

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
    status: 'Mới', userId: (getUser(req) || {}).uid || null, createdAt: new Date().toISOString() };
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

app.delete('/api/admin/orders/:id', auth, wrap(async (req, res) => {      // chỉ xoá được đơn đã huỷ
  const r = await Orders.deleteOne({ id: req.params.id, status: 'Đã huỷ' });
  if (!r.deletedCount) return res.status(400).json({ error: 'Chỉ xoá được đơn ở trạng thái Đã huỷ' });
  res.json({ ok: true });
}));

// ---- Upload ảnh sản phẩm: lưu thẳng trong MongoDB, phục vụ tại /img/<mã> ----
app.post('/api/admin/upload', auth, express.raw({ type: 'image/jpeg', limit: '1mb' }), wrap(async (req, res) => {
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || buf.length < 100 || buf[0] !== 0xFF || buf[1] !== 0xD8) return res.status(400).json({ error: 'Ảnh không hợp lệ (cần JPEG dưới 1MB)' });
  const id = crypto.randomBytes(12).toString('hex');
  await Images.insertOne({ id, b64: buf.toString('base64'), createdAt: new Date().toISOString() });
  res.json({ url: '/img/' + id });
}));
app.get('/img/:id', wrap(async (req, res) => {
  const doc = /^[a-f0-9]{24}$/.test(req.params.id) ? await Images.findOne({ id: req.params.id }) : null;
  if (!doc) return res.status(404).end();
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(Buffer.from(doc.b64, 'base64'));
}));

// ---- Quên mật khẩu: gửi liên kết đặt lại qua email (Brevo) ----
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const escHtml = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function sendMail(to, subject, html) {
  const key = process.env.BREVO_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from) { console.error('Chưa cấu hình BREVO_API_KEY / MAIL_FROM nên không gửi được email'); return false; }
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'Diễm My Fashion', email: from }, to: [{ email: to }], subject, htmlContent: html })
  });
  if (!r.ok) console.error('Brevo lỗi', r.status, await r.text());
  return r.ok;
}
app.post('/api/forgot', wrap(async (req, res) => {
  if (blocked(req.ip)) return res.status(429).json({ error: 'Thử quá nhiều lần, đợi 15 phút' });
  fail(req.ip);
  const u = await Users.findOne({ email: str(req.body.email, 100).toLowerCase() });
  const base = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL;
  if (u && base) {
    const token = crypto.randomBytes(32).toString('hex');
    await Resets.deleteMany({ uid: u.uid });
    await Resets.insertOne({ h: sha(token), uid: u.uid, exp: Date.now() + 3600000 });
    const link = base.replace(/\/$/, '') + '/?reset=' + token;
    sendMail(u.email, 'Đặt lại mật khẩu - Diễm My Fashion',
      `<p>Chào ${escHtml(u.name)},</p><p>Bấm vào liên kết dưới đây để đặt mật khẩu mới (có hiệu lực 1 giờ):</p><p><a href="${link}">${link}</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`
    ).catch(e => console.error('Gửi mail lỗi:', e.message));
  }
  res.json({ ok: true });      // luôn trả như nhau để không lộ email nào đã đăng ký
}));
app.post('/api/reset', wrap(async (req, res) => {
  const pw = str(req.body.password, 100);
  if (pw.length < 8) return res.status(400).json({ error: 'Mật khẩu tối thiểu 8 ký tự' });
  const r = await Resets.findOne({ h: sha(str(req.body.token, 100)) });
  if (!r || r.exp < Date.now()) return res.status(400).json({ error: 'Liên kết đã hết hạn hoặc không hợp lệ' });
  await Users.updateOne({ uid: r.uid }, { $set: { pass: hashPw(pw) } });
  await Resets.deleteMany({ uid: r.uid });
  res.json({ ok: true });
}));

// ---- Kết nối MongoDB rồi mới mở cổng ----
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'diemmy');
  Products = db.collection('products'); Orders = db.collection('orders'); Users = db.collection('users'); Images = db.collection('images'); Resets = db.collection('resets');
  await Images.createIndex({ id: 1 }, { unique: true });
  await Users.createIndex({ email: 1 }, { unique: true });
  await Products.createIndex({ id: 1 }, { unique: true });
  await Orders.createIndex({ id: 1 }, { unique: true });
  if (await Products.countDocuments() === 0) {            // lần đầu: nhập sản phẩm mẫu
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8'));
    await Products.insertMany(seed); console.log('Đã nhập', seed.length, 'sản phẩm mẫu');
  }
  app.listen(process.env.PORT || 3000, () => console.log('Chạy tại cổng ' + (process.env.PORT || 3000)));
})().catch(e => { console.error('Không kết nối được MongoDB:', e.message); process.exit(1); });
