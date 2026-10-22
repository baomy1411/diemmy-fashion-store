const path = require('path');
const express = require('express');
const config = require('./src/config');
const { connect } = require('./src/db');

try { config.assert(); } catch (e) { console.error(e.message); process.exit(1); }

const app = express();
app.set('trust proxy', 1);                         // chạy sau proxy của Render: lấy đúng IP khách
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  next();
});
app.use(express.json({ limit: '100kb' }));
app.get('/healthz', (req, res) => res.send('ok'));
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });   // dữ liệu API không bao giờ bị lưu tạm
app.use('/api', require('./src/routes/auth'));
app.use('/api', require('./src/routes/products'));
app.use('/api', require('./src/routes/orders'));
app.use(require('./src/routes/upload'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Không tìm thấy' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((err, req, res, next) => {                 // JSON lỗi cú pháp, body quá lớn...
  if (err.status && err.status < 500) return res.status(err.status).json({ error: 'Dữ liệu gửi lên không hợp lệ' });
  console.error(err); res.status(500).json({ error: 'Lỗi máy chủ' });
});

connect()
  .then(() => app.listen(config.port, () => console.log('Chạy tại cổng ' + config.port)))
  .catch(e => { console.error('Không kết nối được MongoDB:', e.message); process.exit(1); });
