const router = require('express').Router();
const { db, NOID } = require('../db');
const { str, wrap } = require('../utils');
const { requireAdmin } = require('../security');

const strip = s => str(s, 40).replace(/['"\\<>&`]/g, '').trim();      // bỏ ký tự có thể làm hỏng giao diện
const list = v => [].concat(v || []).map(strip).filter(Boolean);
const okImage = u => /^(https?:\/\/|\/img\/[a-f0-9]{24}$)/.test(u);   // chặn javascript: và đường dẫn lạ
const clean = (b, id) => {
  const sizes = list(b.sizes), colors = list(b.colors), raw = (b.sizePrices && typeof b.sizePrices === 'object') ? b.sizePrices : {};
  // Giá riêng theo size (vd nước hoa 30ml / 50ml / 100ml); size không có giá riêng dùng giá bán chung
  const sizePrices = Object.fromEntries(sizes.map(s => [s, Math.round(Number(raw[s]))]).filter(([, v]) => v > 0));
  let price = Math.max(0, Math.round(Number(b.price)) || 0);
  if (!price && Object.keys(sizePrices).length) price = Math.min(...Object.values(sizePrices));
  return {
    id, name: str(b.name, 150), category: str(b.category, 30), price, originalPrice: Math.max(0, Math.round(Number(b.originalPrice)) || 0),
    rating: Math.min(5, Number(b.rating) || 5), badge: str(b.badge, 20), stock: (b.stock === '' || b.stock == null) ? null : Math.max(0, Math.floor(Number(b.stock)) || 0),
    image: str(b.image, 500), sizes, sizePrices, colors, material: str(b.material, 150), desc: str(b.desc, 800)
  };
};
const problem = p => !p.name || !p.price || !p.sizes.length ? 'Thiếu tên, giá hoặc size'
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

// ---- Banner (slider) đầu trang chủ: tối đa 10 ảnh, admin thêm/xoá/sắp xếp ----
router.get('/slides', wrap(async (req, res) => { const d = await db.Settings.findOne({ key: 'slides' }, NOID); res.json(d ? d.list : []); }));
router.put('/admin/slides', requireAdmin, wrap(async (req, res) => {
  const list = [].concat(req.body.slides || []).slice(0, 10).map(s => ({ src: str(s.src, 500), title: str(s.title, 80) }));
  if (list.some(s => !okImage(s.src))) return res.status(400).json({ error: 'Có ảnh không hợp lệ' });
  (await db.Settings.findOne({ key: 'slides' })) ? await db.Settings.updateOne({ key: 'slides' }, { $set: { list } }) : await db.Settings.insertOne({ key: 'slides', list });
  res.json({ ok: true, count: list.length });
}));
module.exports = router;
