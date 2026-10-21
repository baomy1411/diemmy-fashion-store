// Dữ liệu danh mục Sản phẩm B2C Thời trang Diễm My
const products = [
    {
        id: 1,
        name: "Váy Dạ Hội Luxury Gold",
        category: "quan-ao",
        price: 2500000,
        oldPrice: 3200000,
        rating: 5,
        tag: "HOT",
        sizes: ["S", "M", "L"],
        colors: ["Vàng Gold", "Đen"],
        description: "Thiết kế tôn dáng chuẩn phong cách hoàng gia, chất liệu lụa cao cấp đính đá pha lê thủ công.",
        img: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=500"
    },
    {
        id: 2,
        name: "Túi Xách Da Bò Hermès Style",
        category: "tui-xach",
        price: 3800000,
        oldPrice: 4500000,
        rating: 5,
        tag: "BEST SELLER",
        sizes: ["Free Size"],
        colors: ["Nâu Đất", "Đen", "Cam"],
        description: "Da bò thật 100% nguyên tấm, phụ kiện khóa mạ vàng 18k sang trọng bền bỉ.",
        img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=500"
    },
    {
        id: 3,
        name: "Nước Hoa Diễm My Elegance 100ml",
        category: "nuoc-hoa",
        price: 1950000,
        oldPrice: 2300000,
        rating: 4.8,
        tag: "EXCLUSIVE",
        sizes: ["100ml"],
        colors: ["Chai Thủy Tinh"],
        description: "Hương thơm quý phái với nốt hương hoa hồng Pháp, gỗ đàn hương và vani ngọt ngào.",
        img: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=500"
    },
    {
        id: 4,
        name: "Giày Cao Gót Stiletto Satin 9cm",
        category: "giay-dep",
        price: 1450000,
        oldPrice: 1800000,
        rating: 4.9,
        tag: "NEW",
        sizes: ["35", "36", "37", "38"],
        colors: ["Đỏ", "Đen", "Nude"],
        description: "Giày cao gót quai mảnh êm chân, đế cao su chống trượt giúp di chuyển tự tin.",
        img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=500"
    },
    {
        id: 5,
        name: "Kính Mát Cat-Eye Mạ Vàng",
        category: "phu-kien",
        price: 850000,
        oldPrice: 1100000,
        rating: 4.7,
        tag: "SALE",
        sizes: ["Free Size"],
        colors: ["Vàng Gold"],
        description: "Chống tia UV400 tuyệt đối, gọng kim loại siêu nhẹ kiểu dáng mắt mèo thời thượng.",
        img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=500"
    },
    {
        id: 6,
        name: "Áo Sơ Mi Lụa Satin Cổ Thắt Nơ",
        category: "quan-ao",
        price: 920000,
        oldPrice: 1200000,
        rating: 4.6,
        tag: "TRENDING",
        sizes: ["S", "M", "L"],
        colors: ["Trắng Ngọc Trai", "Hồng Nude"],
        description: "Chất lụa mịn mát không nhăn, phù hợp cho môi trường công sở sang trọng và sự kiện.",
        img: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=500"
    }
];

// State
let cart = JSON.parse(localStorage.getItem('dm_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('dm_wishlist')) || [];
let currentCategory = 'all';
let appliedDiscount = 0;
let currentPdpProduct = null;
let selectedSize = '';
let selectedColor = '';

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    renderProducts(products);
    updateCartUI();
    updateWishlistUI();
});

// Render Product List
function renderProducts(items) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">Không tìm thấy sản phẩm phù hợp.</p>';
        return;
    }

    items.forEach(p => {
        const isWish = wishlist.includes(p.id);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <span class="badge-tag">${p.tag}</span>
            <button class="btn-wishlist" onclick="toggleWishlist(${p.id})">
                <i class="${isWish ? 'fas' : 'far'} fa-heart" style="color: ${isWish ? '#e74c3c' : '#333'}"></i>
            </button>
            <img src="${p.img}" alt="${p.name}">
            <div class="product-card-body">
                <span class="p-cat">${p.category.replace('-', ' ')}</span>
                <h3 class="p-title">${p.name}</h3>
                <div class="p-rating"><i class="fas fa-star"></i> ${p.rating}</div>
                <div class="p-price-box">
                    <span class="p-price">${p.price.toLocaleString('vi-VN')} đ</span>
                    <span class="p-old-price">${p.oldPrice.toLocaleString('vi-VN')} đ</span>
                </div>
                <button class="btn-quick-view" onclick="openPdpModal(${p.id})">XEM CHI TIẾT</button>
            </div>
        `;
        grid.appendChild(card);
    });

    document.getElementById('product-count-text').innerText = `Hiển thị ${items.length} sản phẩm`;
}

// Category Filtering
function filterCategory(cat, element) {
    currentCategory = cat;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    document.getElementById('catalog-title').innerText = element.innerText;
    applyFilters();
}

// Multi-Filter (Search, Price, Sort)
function applyFilters() {
    let result = [...products];

    // Filter Category
    if (currentCategory !== 'all') {
        result = result.filter(p => p.category === currentCategory);
    }

    // Search Keyword
    const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
    if (searchVal) {
        result = result.filter(p => p.name.toLowerCase().includes(searchVal));
    }

    // Price Range
    const minP = parseFloat(document.getElementById('min-price').value) || 0;
    const maxP = parseFloat(document.getElementById('max-price').value) || Infinity;
    result = result.filter(p => p.price >= minP && p.price <= maxP);

    // Sorting
    const sortVal = document.getElementById('sort-select').value;
    if (sortVal === 'price-asc') result.sort((a,b) => a.price - b.price);
    if (sortVal === 'price-desc') result.sort((a,b) => b.price - a.price);
    if (sortVal === 'rating') result.sort((a,b) => b.rating - a.rating);

    renderProducts(result);
}

function handleSearch() { applyFilters(); }

function scrollToCatalog() {
    document.getElementById('catalog-section').scrollIntoView({ behavior: 'smooth' });
}

// PDP Modal
function openPdpModal(id) {
    currentPdpProduct = products.find(p => p.id === id);
    selectedSize = currentPdpProduct.sizes[0];
    selectedColor = currentPdpProduct.colors[0];

    const container = document.getElementById('pdp-container');
    container.innerHTML = `
        <div class="pdp-grid">
            <img src="${currentPdpProduct.img}" alt="${currentPdpProduct.name}">
            <div>
                <h2>${currentPdpProduct.name}</h2>
                <p style="color: var(--primary-gold); margin: 5px 0;"><i class="fas fa-star"></i> ${currentPdpProduct.rating} / 5.0</p>
                <div class="p-price-box">
                    <span class="p-price" style="font-size: 22px;">${currentPdpProduct.price.toLocaleString('vi-VN')} VNĐ</span>
                    <span class="p-old-price">${currentPdpProduct.oldPrice.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <p style="font-size: 14px; color: #555; margin: 15px 0;">${currentPdpProduct.description}</p>

                <!-- Size selector -->
                <div class="variant-selector">
                    <label>Kích thước:</label>
                    <div class="options-group" id="size-options">
                        ${currentPdpProduct.sizes.map(s => `
                            <button class="opt-btn ${s === selectedSize ? 'selected' : ''}" onclick="selectSize('${s}', this)">${s}</button>
                        `).join('')}
                    </div>
                </div>

                <!-- Color selector -->
                <div class="variant-selector">
                    <label>Màu sắc:</label>
                    <div class="options-group" id="color-options">
                        ${currentPdpProduct.colors.map(c => `
                            <button class="opt-btn ${c === selectedColor ? 'selected' : ''}" onclick="selectColor('${c}', this)">${c}</button>
                        `).join('')}
                    </div>
                </div>

                <button class="btn-pdp-add" onclick="addPdpToCart()">THÊM VÀO GIỎ HÀNG</button>
            </div>
        </div>
    `;

    document.getElementById('pdp-modal').style.display = 'flex';
}

function closePdpModal() { document.getElementById('pdp-modal').style.display = 'none'; }

function selectSize(size, btn) {
    selectedSize = size;
    document.querySelectorAll('#size-options .opt-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

function selectColor(color, btn) {
    selectedColor = color;
    document.querySelectorAll('#color-options .opt-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

function addPdpToCart() {
    addToCart(currentPdpProduct.id, selectedSize, selectedColor);
    closePdpModal();
    toggleCartDrawer(true);
}

// Cart Management
function addToCart(productId, size = 'Free Size', color = 'Tiêu Chuẩn') {
    const product = products.find(p => p.id === productId);
    const cartKey = `${productId}-${size}-${color}`;
    
    const existing = cart.find(item => item.key === cartKey);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            key: cartKey,
            id: product.id,
            name: product.name,
            price: product.price,
            img: product.img,
            size: size,
            color: color,
            qty: 1
        });
    }

    saveCart();
    updateCartUI();
}

function updateCartQty(key, delta) {
    const item = cart.find(i => i.key === key);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.key !== key);
    }
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('dm_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    const cartCount = document.getElementById('cart-count');
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountEl = document.getElementById('cart-discount');
    const totalEl = document.getElementById('cart-total');

    cartCount.innerText = cart.reduce((sum, item) => sum + item.qty, 0);

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888; padding: 30px;">Giỏ hàng của chị Diễm My đang trống.</p>';
        subtotalEl.innerText = '0 VNĐ';
        totalEl.innerText = '0 VNĐ';
        return;
    }

    container.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <img src="${item.img}" alt="${item.name}">
            <div style="flex: 1;">
                <strong>${item.name}</strong>
                <div style="font-size: 12px; color: #777;">Phân loại: ${item.size} / ${item.color}</div>
                <div style="color: var(--primary-gold); font-weight: bold;">${item.price.toLocaleString('vi-VN')} đ</div>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 5px;">
                    <button onclick="updateCartQty('${item.key}', -1)" style="width: 22px;">-</button>
                    <span>${item.qty}</span>
                    <button onclick="updateCartQty('${item.key}', 1)" style="width: 22px;">+</button>
                </div>
            </div>
            <strong>${itemTotal.toLocaleString('vi-VN')} đ</strong>
        `;
        container.appendChild(row);
    });

    const discountAmount = subtotal * appliedDiscount;
    const finalTotal = subtotal - discountAmount;

    subtotalEl.innerText = subtotal.toLocaleString('vi-VN') + ' VNĐ';
    if (appliedDiscount > 0) {
        document.getElementById('discount-line').style.display = 'flex';
        discountEl.innerText = '-' + discountAmount.toLocaleString('vi-VN') + ' VNĐ';
    } else {
        document.getElementById('discount-line').style.display = 'none';
    }
    totalEl.innerText = finalTotal.toLocaleString('vi-VN') + ' VNĐ';
}

function toggleCartDrawer(open = null) {
    const drawer = document.getElementById('cart-drawer');
    if (open === true) drawer.classList.add('open');
    else if (open === false) drawer.classList.remove('open');
    else drawer.classList.toggle('open');
}

function applyCoupon() {
    const code = document.getElementById('coupon-input').value.trim().toUpperCase();
    if (code === 'DIEMMY10') {
        appliedDiscount = 0.10;
        alert("Chúc mừng chị Diễm My! Đã áp dụng mã giảm 10%.");
    } else {
        alert("Mã giảm giá không hợp lệ.");
        appliedDiscount = 0;
    }
    updateCartUI();
}

// Wishlist
function toggleWishlist(id) {
    if (wishlist.includes(id)) {
        wishlist = wishlist.filter(item => item !== id);
    } else {
        wishlist.push(id);
    }
    localStorage.setItem('dm_wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
    applyFilters();
}

function updateWishlistUI() {
    document.getElementById('wishlist-count').innerText = wishlist.length;
    const container = document.getElementById('wishlist-items-container');

    if (wishlist.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888;">Chưa có sản phẩm yêu thích.</p>';
        return;
    }

    container.innerHTML = '';
    wishlist.forEach(id => {
        const p = products.find(item => item.id === id);
        if (p) {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.gap = '10px';
            div.style.marginBottom = '10px';
            div.innerHTML = `
                <img src="${p.img}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                <div>
                    <strong>${p.name}</strong><br>
                    <small style="color: var(--primary-gold);">${p.price.toLocaleString('vi-VN')} VNĐ</small>
                </div>
            `;
            container.appendChild(div);
        }
    });
}

function toggleWishlistModal() {
    const modal = document.getElementById('wishlist-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

// Checkout & VietQR
function openCheckoutModal() {
    if (cart.length === 0) {
        alert("Giỏ hàng của chị đang trống!");
        return;
    }
    toggleCartDrawer(false);

    // Calculate final total
    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const finalTotal = subtotal * (1 - appliedDiscount);

    document.getElementById('checkout-final-amount').innerText = finalTotal.toLocaleString('vi-VN') + ' VNĐ';

    // Summary items
    const summaryBox = document.getElementById('checkout-summary-items');
    summaryBox.innerHTML = cart.map(i => `
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px;">
            <span>${i.name} (x${i.qty})</span>
            <strong>${(i.price * i.qty).toLocaleString('vi-VN')} đ</strong>
        </div>
    `).join('');

    togglePaymentView();
    document.getElementById('checkout-modal').style.display = 'flex';
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'none';
}

function togglePaymentView() {
    const method = document.querySelector('input[name="payment_method"]:checked').value;
    const qrBox = document.getElementById('vietqr-box');

    if (method === 'VIETQR') {
        const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
        const amount = Math.round(subtotal * (1 - appliedDiscount));
        const orderId = 'DMF' + Math.floor(100000 + Math.random() * 900000);

        document.getElementById('qr-memo').innerText = orderId;
        // Generating VietQR dynamic URL
        const qrUrl = `https://img.vietqr.io/image/MB-0900123456-compact2.png?amount=${amount}&addInfo=${orderId}&accountName=DIEMMY%20FASHION`;
        document.getElementById('vietqr-img').src = qrUrl;

        qrBox.style.display = 'block';
    } else {
        qrBox.style.display = 'none';
    }
}

function handlePlaceOrder(e) {
    e.preventDefault();
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const address = document.getElementById('cust-address').value;

    alert(`🎉 ĐẶT HÀNG THÀNH CÔNG!\nCảm ơn chị ${name} (${phone}). Đơn hàng sẽ được giao đến địa chỉ: ${address}.`);

    cart = [];
    saveCart();
    updateCartUI();
    closeCheckoutModal();
}