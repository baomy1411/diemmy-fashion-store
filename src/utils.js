const crypto = require('crypto');
const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const escHtml = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Express 4 không tự bắt lỗi của hàm async: bọc lại để lỗi trả về 500 thay vì làm treo request
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(e => {
  console.error(e); res.status(500).json({ error: 'Lỗi máy chủ, thử lại sau' });
});
module.exports = { str, sha, escHtml, wrap };
