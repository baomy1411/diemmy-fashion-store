const router = require('express').Router();
const { db, NOID } = require('../db');
const { str, wrap } = require('../utils');
const { requireAdmin } = require('../security');

const list = v => [].concat(v || []).map(s => str(s, 40)).filter(Boolean);
const okImage = u => /^(https?:\/\/|\/img\/[a-f0-9]{24}$)/.test(u);   // chặn javascript: và đường dẫn lạ
const clean = (b, id) => ({
  id, name: str(b.name, 150), category: str(b.category, 30),
  price: Math.max(0, Math.round(Number(b.price)) || 0), originalPrice: Math.max(0, Math.round(Number(b.originalPrice)) || 0),
  rating: Math.min(5, Number(b.rating) || 5), badge: str(b.badge, 20), image: str(b.image, 500),
  sizes: list(b.sizes), colors: list(b.colors), material: str(b.material, 150), desc: str(b.desc, 800)
});
const problem = p => !p.name || !p.price || !p.sizes.length || !p.colors.length ? 'Thiếu tên, giá, size hoặc màu'
  : !okImage(p.image) ? 'Link ảnh không hợp lệ (dùng nút tải ảnh lên hoặc link bắt đầu bằng https://)' : null;

router.get('/products', wrap(async (req, res) => res.json(await db.Products.find({}, NOID).sort({ _id: 1 }).toArray())));

router.post('/admin/products', requireAdmin, wrap(async (req, res) => {
  const p = clean(req.body, 'DMF-' + Date.now().toString().slice(-6)), err = problem(p);
  if (err) return res.status(400).json({ error: err });
  await db.Products.insertOne({ ...p }); res.json(p);
}));
router.put('/admin/products/:id', requireAdmin, wrap(async (req, res) => {
  const p = clean(req.body, req.params.id), err = problem(p);
  if (err) return res.status(400).json({ error: err });
  const r = await db.Products.replaceOne({ id: p.id }, p);
  if (!r.matchedCount) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  res.json(p);
}));
router.delete('/admin/products/:id', requireAdmin, wrap(async (req, res) => {
  await db.Products.deleteOne({ id: req.params.id }); res.json({ ok: true });
}));
module.exports = router;
