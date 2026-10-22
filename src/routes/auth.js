const crypto = require('crypto');
const router = require('express').Router();
const config = require('../config');
const { db } = require('../db');
const { str, sha, wrap } = require('../utils');
const S = require('../security');
const { sendMail, resetMailHtml } = require('../notify');

router.post('/register', wrap(async (req, res) => {
  if (S.blocked(req.ip)) return res.status(429).json({ error: 'Thử quá nhiều lần, đợi 15 phút' });
  const b = req.body, name = str(b.name, 100), email = str(b.email, 100).toLowerCase(), phone = str(b.phone, 15).replace(/\s/g, ''), pw = str(b.password, 100);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === config.adminEmail) return res.status(400).json({ error: 'Họ tên hoặc email không hợp lệ' });
  if (phone && !/^(0|\+84)\d{9}$/.test(phone)) return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
  if (pw.length < 8) return res.status(400).json({ error: 'Mật khẩu tối thiểu 8 ký tự' });
  const uid = 'U' + crypto.randomBytes(6).toString('hex');
  try { await db.Users.insertOne({ uid, name, email, phone, pass: S.hashPw(pw), createdAt: new Date().toISOString() }); }
  catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'Email này đã được đăng ký' }); throw e; }
  S.fail(req.ip);
  res.json(S.session(uid, name, 'customer'));
}));

router.post('/login', wrap(async (req, res) => {
  if (S.blocked(req.ip)) return res.status(429).json({ error: 'Thử quá nhiều lần, đợi 15 phút' });
  const email = str(req.body.email, 100).toLowerCase(), pw = str(req.body.password, 100);
  if (email === config.adminEmail) {
    const a = Buffer.from(pw), b = Buffer.from(config.adminPassword);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) { S.clearFails(req.ip); return res.json(S.session('admin', 'Quản trị viên', 'admin')); }
  } else {
    const u = await db.Users.findOne({ email });
    if (u && S.checkPw(pw, u.pass)) { S.clearFails(req.ip); return res.json(S.session(u.uid, u.name, 'customer')); }
  }
  S.fail(req.ip); res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
}));

router.post('/forgot', wrap(async (req, res) => {
  if (S.blocked(req.ip)) return res.status(429).json({ error: 'Thử quá nhiều lần, đợi 15 phút' });
  S.fail(req.ip);
  const u = await db.Users.findOne({ email: str(req.body.email, 100).toLowerCase() });
  if (u && config.baseUrl) {
    const token = crypto.randomBytes(32).toString('hex');
    await db.Resets.deleteMany({ uid: u.uid });
    await db.Resets.insertOne({ h: sha(token), uid: u.uid, exp: Date.now() + 3600000 });
    const link = config.baseUrl.replace(/\/$/, '') + '/?reset=' + token;
    sendMail(u.email, 'Đặt lại mật khẩu - Diễm My Fashion', resetMailHtml(u.name, link)).catch(e => console.error('Gửi mail lỗi:', e.message));
  }
  res.json({ ok: true });       // luôn trả như nhau để không lộ email nào đã đăng ký
}));

router.post('/reset', wrap(async (req, res) => {
  const pw = str(req.body.password, 100);
  if (pw.length < 8) return res.status(400).json({ error: 'Mật khẩu tối thiểu 8 ký tự' });
  const r = await db.Resets.findOne({ h: sha(str(req.body.token, 100)) });
  if (!r || r.exp < Date.now()) return res.status(400).json({ error: 'Liên kết đã hết hạn hoặc không hợp lệ' });
  await db.Users.updateOne({ uid: r.uid }, { $set: { pass: S.hashPw(pw) } });
  await db.Resets.deleteMany({ uid: r.uid });
  res.json({ ok: true });
}));
module.exports = router;
