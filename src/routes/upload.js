const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { wrap } = require('../utils');
const { requireAdmin } = require('../security');

// Ảnh JPEG (trình duyệt đã thu nhỏ) lưu trong MongoDB, phục vụ tại /img/<mã>
router.post('/api/admin/upload', requireAdmin, express.raw({ type: 'image/jpeg', limit: '1mb' }), wrap(async (req, res) => {
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || buf.length < 100 || buf[0] !== 0xFF || buf[1] !== 0xD8) return res.status(400).json({ error: 'Ảnh không hợp lệ (cần JPEG dưới 1MB)' });
  const id = crypto.randomBytes(12).toString('hex');
  await db.Images.insertOne({ id, b64: buf.toString('base64'), createdAt: new Date().toISOString() });
  res.json({ url: '/img/' + id });
}));
router.get('/img/:id', wrap(async (req, res) => {
  const doc = /^[a-f0-9]{24}$/.test(req.params.id) ? await db.Images.findOne({ id: req.params.id }) : null;
  if (!doc) return res.status(404).end();
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(Buffer.from(doc.b64, 'base64'));
}));
module.exports = router;
