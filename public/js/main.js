// Khởi động trang, đếm ngược flash sale, phím tắt
        document.addEventListener('DOMContentLoaded', () => {
    renderCategoryTabs();
    loadSettings();
    loadProducts();
    loadSlides();
    setInterval(loadProducts, 30000);                                   // tự làm mới sản phẩm mỗi 30 giây
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loadProducts(); });
    updateCartBadge();
    updateWishlistBadge();
    startFlashSaleCountdown();
});

// Phí ship lấy từ máy chủ để luôn khớp với số tiền server tính
function loadSettings() {
    fetch('/api/config').then(r => (r.ok ? r.json() : null)).then(c => {
        if (!c) return;
        SHOP.freeShipThreshold = c.freeShipThreshold; SHOP.shippingFee = c.shippingFee;
        calculateCartTotals();
    }).catch(() => {});
}

        // Format Currency Helper
        function startFlashSaleCountdown() {
            let totalSeconds = 8 * 3600 + 42 * 60 + 19;
            setInterval(() => {
                if (totalSeconds <= 0) return;
                totalSeconds--;

                const hrs = Math.floor(totalSeconds / 3600);
                const mins = Math.floor((totalSeconds % 3600) / 60);
                const secs = totalSeconds % 60;

                document.getElementById('hours').innerText = String(hrs).padStart(2, '0');
                document.getElementById('minutes').innerText = String(mins).padStart(2, '0');
                document.getElementById('seconds').innerText = String(secs).padStart(2, '0');
            }, 1000);
        }
    
// Nhấn Esc để đóng các cửa sổ đang mở
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeQuickView(); closeCheckoutModal(); closeSuccessModal(); toggleCartDrawer(false);
});

// Luôn lấy sản phẩm mới nhất từ máy chủ
