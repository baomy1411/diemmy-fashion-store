// Hàm tiện ích
        function formatVND(amount) {
            return amount.toLocaleString('vi-VN') + ' đ';
        }

        // Render Category Tabs

// Giá theo size: size có giá riêng (nước hoa 30ml/50ml...) thì dùng giá đó, không thì dùng giá chung
const priceOf = (p, size) => (p.sizePrices && p.sizePrices[size]) || p.price;
const fromPrice = p => { const v = (p.sizes || []).map(s => priceOf(p, s)); return v.length ? Math.min(...v) : p.price; };
const hasVariantPrices = p => new Set((p.sizes || []).map(s => priceOf(p, s))).size > 1;
const escHtml = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
