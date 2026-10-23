// Trạng thái dùng chung: giỏ hàng, yêu thích, bộ lọc
/* ==========================================================================
           APP STATE MANAGEMENT & LOCAL STORAGE
           ========================================================================== */
        let cart = JSON.parse(localStorage.getItem('diemmy_cart')) || [];
        let wishlist = JSON.parse(localStorage.getItem('diemmy_wishlist')) || [];
        let currentCategory = 'all';
        let activeVoucherDiscount = 0;
        let selectedProductForQuickView = null;
let currentOrderId = '';
let activeVoucherCode = '';
let lastResultCount = 0;     // số sản phẩm khớp bộ lọc/tìm kiếm gần nhất
