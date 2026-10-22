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
