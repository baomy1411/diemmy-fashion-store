const crypto = require('crypto');
const config = require('./config');

const secret = () => config.sessionSecret || crypto.createHash('sha256').update('dm|' + config.adminPassword).digest('hex');
const sign = d => {
  const b = Buffer.from(JSON.stringify({ ...d, exp: Date.now() + 7 * 864e5 })).toString('base64url');
  return b + '.' + crypto.createHmac('sha256', secret()).update(b).digest('base64url');
};
const verify = t => {
  try {
    const [b, s] = String(t).split('.'), e = crypto.createHmac('sha256', secret()).update(b).digest('base64url');
    if (!s || s.length !== e.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e))) return null;
    const d = JSON.parse(Buffer.from(b, 'base64url')); return d.exp > Date.now() ? d : null;
  } catch { return null; }
};
const getUser = req => verify((req.get('authorization') || '').replace(/^Bearer /, ''));
const requireAdmin = (req, res, next) => {
  const u = getUser(req);
  if (!u || u.role !== 'admin') return res.status(401).json({ error: 'Chưa đăng nhập quản trị' });
  next();
};
const requireUser = (req, res, next) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  req.user = u; next();
};
const hashPw = pw => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex'); };
const checkPw = (pw, h) => {
  const [salt, k] = String(h).split(':'), t = crypto.scryptSync(pw, salt, 64), kb = Buffer.from(k || '', 'hex');
  return kb.length === t.length && crypto.timingSafeEqual(t, kb);
};
// Giới hạn thử sai theo IP: 8 lần / 15 phút
const fails = new Map();
const blocked = ip => { const f = fails.get(ip); return !!f && f.n >= 8 && Date.now() - f.t < 15 * 60000; };
const fail = ip => fails.set(ip, { n: (fails.get(ip)?.n || 0) + 1, t: Date.now() });
const clearFails = ip => fails.delete(ip);
const session = (uid, name, role) => ({ token: sign({ uid, name, role }), user: { name, role } });

module.exports = { sign, verify, getUser, requireAdmin, requireUser, hashPw, checkPw, blocked, fail, clearFails, session };
