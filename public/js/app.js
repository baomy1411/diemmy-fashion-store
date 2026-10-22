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

        const categories = [
            { id: 'all', label: 'Tất Cả' },
            { id: 'quan-ao', label: 'Quần Áo' },
            { id: 'tui-xach', label: 'Túi Xách' },
            { id: 'nuoc-hoa', label: 'Nước Hoa' },
            { id: 'giay-dep', label: 'Giày Dép' },
            { id: 'phu-kien', label: 'Phụ Kiện' }
        ];

        /* ==========================================================================
           INITIALIZATION & RENDERING
           ========================================================================== */
        document.addEventListener('DOMContentLoaded', () => {
            renderCategoryTabs();
            loadProducts();
            setInterval(loadProducts, 30000);
            document.addEventListener('visibilitychange', () => { if (!document.hidden) loadProducts(); });
            updateCartBadge();
            updateWishlistBadge();
            startFlashSaleCountdown();
        });

        // Format Currency Helper
        function formatVND(amount) {
            return amount.toLocaleString('vi-VN') + ' đ';
        }

        // Render Category Tabs
        function renderCategoryTabs() {
            const tabsContainer = document.getElementById('category-tabs');
            tabsContainer.innerHTML = categories.map(cat => `
                <button onclick="filterCategory('${cat.id}')" 
                    class="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition duration-200 ${currentCategory === cat.id ? 'bg-gold text-black shadow-md' : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-gold'}">
                    ${cat.label}
                </button>
            `).join('');
        }

        // Render Products List
        function renderProducts(items) {
            const grid = document.getElementById('product-grid');
            const noProducts = document.getElementById('no-products');

            if (items.length === 0) {
                grid.innerHTML = '';
                noProducts.classList.remove('hidden');
                return;
            }

            noProducts.classList.add('hidden');
            grid.innerHTML = items.map(p => {
                const isWishlisted = wishlist.includes(p.id);
                return `
                <div class="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col group gold-border-glow">
                    <!-- Image Wrapper -->
                    <div class="relative overflow-hidden aspect-[4/5] bg-neutral-950">
                        <img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                        
                        <!-- Badge -->
                        ${p.badge ? `<span class="absolute top-3 left-3 bg-gold text-black font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider shadow">${p.badge}</span>` : ''}

                        <!-- Wishlist Button -->
                        <button onclick="toggleWishlist('${p.id}')" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center hover:text-gold transition">
                            <i class="${isWishlisted ? 'fas text-gold' : 'far'} fa-heart text-sm"></i>
                        </button>

                        <!-- Quick View Hover Overlay Button -->
                        <div class="absolute inset-x-0 bottom-3 px-4 opacity-0 group-hover:opacity-100 transition duration-300 flex gap-2">
                            <button onclick="openQuickView('${p.id}')" class="flex-1 bg-black/80 hover:bg-gold hover:text-black border border-gold/40 text-gold text-xs font-semibold py-2 rounded-lg transition duration-200 uppercase tracking-wider backdrop-blur-sm">
                                <i class="fas fa-eye mr-1"></i> Xem Nhanh
                            </button>
                        </div>
                    </div>

                    <!-- Product Details -->
                    <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                            <div class="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                                <span class="uppercase tracking-wider font-semibold text-gold">${p.category.replace('-', ' ')}</span>
                                <span class="text-amber-400"><i class="fas fa-star text-[10px] mr-1"></i>${p.rating}</span>
                            </div>
                            <h3 class="text-sm font-semibold text-neutral-100 group-hover:text-gold transition line-clamp-1">${p.name}</h3>
                        </div>

                        <div class="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                            <div>
                                <div class="text-sm font-bold text-gold">${formatVND(p.price)}</div>
                                ${p.originalPrice ? `<div class="text-[11px] text-neutral-500 line-through">${formatVND(p.originalPrice)}</div>` : ''}
                            </div>
                            <button onclick="openQuickView('${p.id}')" class="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-gold hover:text-black text-neutral-200 flex items-center justify-center transition">
                                <i class="fas fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `}).join('');
        }

        /* ==========================================================================
           FILTERING & SEARCH LOGIC
           ========================================================================== */
        function filterCategory(catId) {
            currentCategory = catId;
            renderCategoryTabs();
            applyFilters();
        }

        function applyFilters() {
            let result = [...products];

            // 1. Category filter
            if (currentCategory !== 'all') {
                result = result.filter(p => p.category === currentCategory);
            }

            // 2. Price filter
            const priceVal = document.getElementById('priceFilter').value;
            if (priceVal === 'under-1m') {
                result = result.filter(p => p.price < 1000000);
            } else if (priceVal === '1m-3m') {
                result = result.filter(p => p.price >= 1000000 && p.price <= 3000000);
            } else if (priceVal === 'above-3m') {
                result = result.filter(p => p.price > 3000000);
            }

            // 3. Search Keyword
            const searchKeyword = (document.getElementById('searchInput').value || document.getElementById('mobileSearchInput').value).toLowerCase().trim();
            if (searchKeyword) {
                result = result.filter(p => p.name.toLowerCase().includes(searchKeyword) || p.desc.toLowerCase().includes(searchKeyword));
            }

            // 4. Sort filter
            const sortVal = document.getElementById('sortBy').value;
            if (sortVal === 'price-asc') {
                result.sort((a, b) => a.price - b.price);
            } else if (sortVal === 'price-desc') {
                result.sort((a, b) => b.price - a.price);
            } else if (sortVal === 'rating') {
                result.sort((a, b) => b.rating - a.rating);
            }

            renderProducts(result);
        }

        function handleSearch() {
            applyFilters();
        }

        function handleMobileSearch() {
            applyFilters();
        }

        function resetFilters() {
            document.getElementById('priceFilter').value = 'all';
            document.getElementById('sortBy').value = 'default';
            document.getElementById('searchInput').value = '';
            document.getElementById('mobileSearchInput').value = '';
            currentCategory = 'all';
            renderCategoryTabs();
            applyFilters();
        }

        function scrollToProducts() {
            document.getElementById('products-section').scrollIntoView({ behavior: 'smooth' });
        }

        /* ==========================================================================
           QUICK VIEW & MODAL LOGIC
           ========================================================================== */
        function openQuickView(productId) {
            const product = products.find(p => p.id === productId);
            if (!product) return;
            selectedProductForQuickView = product;

            const modal = document.getElementById('quickViewModal');
            const content = document.getElementById('quickViewContent');

            content.innerHTML = `
                <button onclick="closeQuickView()" class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-gold hover:text-black transition">
                    <i class="fas fa-times"></i>
                </button>
                <div class="md:w-1/2 bg-neutral-950 p-4 flex items-center justify-center">
                    <img src="${product.image}" alt="${product.name}" class="max-h-[350px] w-full object-cover rounded-xl border border-neutral-800">
                </div>
                <div class="md:w-1/2 p-6 flex flex-col justify-between space-y-4">
                    <div>
                        <span class="text-xs font-bold text-gold uppercase tracking-widest">${product.category}</span>
                        <h3 class="text-xl font-bold font-serif-luxury text-white mt-1">${product.name}</h3>
                        <div class="flex items-center space-x-2 mt-2">
                            <span class="text-lg font-bold text-gold">${formatVND(product.price)}</span>
                            ${product.originalPrice ? `<span class="text-xs text-neutral-500 line-through">${formatVND(product.originalPrice)}</span>` : ''}
                        </div>
                        <p class="text-xs text-neutral-400 mt-3 leading-relaxed">${product.desc}</p>
                    </div>

                    <div class="space-y-3 pt-2 border-t border-neutral-800">
                        <!-- Size selection -->
                        <div>
                            <label class="block text-xs font-semibold text-neutral-300 mb-1">Kích Thước (Size):</label>
                            <div class="flex gap-2" id="quickViewSizes">
                                ${product.sizes.map((s, idx) => `
                                    <button onclick="selectSize('${s}')" class="size-btn text-xs px-3 py-1.5 rounded border border-neutral-700 text-neutral-300 hover:border-gold hover:text-gold ${idx === 0 ? 'border-gold text-gold font-bold' : ''}">${s}</button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Color selection -->
                        <div>
                            <label class="block text-xs font-semibold text-neutral-300 mb-1">Màu Sắc:</label>
                            <div class="flex gap-2" id="quickViewColors">
                                ${product.colors.map((c, idx) => `
                                    <button onclick="selectColor('${c}')" class="color-btn text-xs px-3 py-1 rounded border border-neutral-700 text-neutral-300 hover:border-gold ${idx === 0 ? 'border-gold text-gold font-bold' : ''}">${c}</button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Quantity Selection -->
                        <div>
                            <label class="block text-xs font-semibold text-neutral-300 mb-1">Số Lượng:</label>
                            <div class="flex items-center space-x-3">
                                <div class="flex items-center border border-neutral-700 rounded bg-neutral-950">
                                    <button onclick="adjustQuickViewQty(-1)" class="px-3 py-1 text-neutral-400 hover:text-white">-</button>
                                    <span id="quickViewQty" class="px-3 text-xs font-bold text-white">1</span>
                                    <button onclick="adjustQuickViewQty(1)" class="px-3 py-1 text-neutral-400 hover:text-white">+</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onclick="addSelectedToCart()" class="w-full bg-gold hover:bg-gold-hover text-black font-bold py-3 rounded-lg text-xs uppercase tracking-widest transition">
                        Thêm Vào Giỏ Hàng
                    </button>
                </div>
            `;

            // Set default selected attributes
            selectedProductForQuickView.selectedSize = product.sizes[0];
            selectedProductForQuickView.selectedColor = product.colors[0];
            selectedProductForQuickView.selectedQty = 1;

            modal.classList.remove('opacity-0', 'pointer-events-none');
            content.classList.remove('scale-95');
        }

        function closeQuickView() {
            const modal = document.getElementById('quickViewModal');
            modal.classList.add('opacity-0', 'pointer-events-none');
        }

        function selectSize(size) {
            selectedProductForQuickView.selectedSize = size;
            document.querySelectorAll('#quickViewSizes .size-btn').forEach(btn => {
                if(btn.innerText === size) {
                    btn.classList.add('border-gold', 'text-gold', 'font-bold');
                } else {
                    btn.classList.remove('border-gold', 'text-gold', 'font-bold');
                }
            });
        }

        function selectColor(color) {
            selectedProductForQuickView.selectedColor = color;
            document.querySelectorAll('#quickViewColors .color-btn').forEach(btn => {
                if(btn.innerText === color) {
                    btn.classList.add('border-gold', 'text-gold', 'font-bold');
                } else {
                    btn.classList.remove('border-gold', 'text-gold', 'font-bold');
                }
            });
        }

        function adjustQuickViewQty(delta) {
            let current = selectedProductForQuickView.selectedQty || 1;
            current += delta;
            if (current < 1) current = 1;
            selectedProductForQuickView.selectedQty = current;
            document.getElementById('quickViewQty').innerText = current;
        }

        /* ==========================================================================
           CART & WISHLIST LOGIC (LOCALSTORAGE PERSISTENCE)
           ========================================================================== */
        function addSelectedToCart() {
            if (!selectedProductForQuickView) return;
            
            const cartItemKey = `${selectedProductForQuickView.id}-${selectedProductForQuickView.selectedSize}-${selectedProductForQuickView.selectedColor}`;
            const existingIndex = cart.findIndex(item => item.key === cartItemKey);

            if (existingIndex > -1) {
                cart[existingIndex].qty += selectedProductForQuickView.selectedQty;
            } else {
                cart.push({
                    key: cartItemKey,
                    id: selectedProductForQuickView.id,
                    name: selectedProductForQuickView.name,
                    price: selectedProductForQuickView.price,
                    image: selectedProductForQuickView.image,
                    size: selectedProductForQuickView.selectedSize,
                    color: selectedProductForQuickView.selectedColor,
                    qty: selectedProductForQuickView.selectedQty
                });
            }

            saveCart();
            closeQuickView();
            toggleCartDrawer(true);
        }

        function saveCart() {
            localStorage.setItem('diemmy_cart', JSON.stringify(cart));
            updateCartBadge();
            renderCartDrawer();
        }

        function updateCartBadge() {
            const count = cart.reduce((acc, item) => acc + item.qty, 0);
            document.getElementById('cart-count').innerText = count;
        }

        function toggleCartDrawer(open) {
            const drawer = document.getElementById('cartDrawer');
            const panel = document.getElementById('cartDrawerPanel');

            if (open) {
                renderCartDrawer();
                drawer.classList.remove('opacity-0', 'pointer-events-none');
                panel.classList.remove('translate-x-full');
            } else {
                drawer.classList.add('opacity-0', 'pointer-events-none');
                panel.classList.add('translate-x-full');
            }
        }

        function renderCartDrawer() {
            const container = document.getElementById('cartDrawerItems');
            if (cart.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12 text-neutral-500 space-y-2">
                        <i class="fas fa-shopping-bag text-3xl"></i>
                        <p class="text-xs">Giỏ hàng của bạn đang trống.</p>
                    </div>
                `;
            } else {
                container.innerHTML = cart.map(item => `
                    <div class="flex gap-3 pt-3">
                        <img src="${item.image}" alt="${item.name}" class="w-16 h-20 object-cover rounded border border-neutral-800">
                        <div class="flex-1 text-xs space-y-1">
                            <h4 class="font-semibold text-white line-clamp-1">${item.name}</h4>
                            <p class="text-[10px] text-neutral-400">Size: ${item.size} | Màu: ${item.color}</p>
                            <div class="text-gold font-bold">${formatVND(item.price)}</div>
                            <div class="flex items-center justify-between pt-1">
                                <div class="flex items-center border border-neutral-800 rounded bg-neutral-950">
                                    <button onclick="updateCartQty('${item.key}', -1)" class="px-2 py-0.5 text-neutral-400">-</button>
                                    <span class="px-2 font-bold text-white">${item.qty}</span>
                                    <button onclick="updateCartQty('${item.key}', 1)" class="px-2 py-0.5 text-neutral-400">+</button>
                                </div>
                                <button onclick="removeCartItem('${item.key}')" class="text-red-400 hover:text-red-300 text-xs">
                                    <i class="far fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            calculateCartTotals();
        }

        function updateCartQty(key, delta) {
            const index = cart.findIndex(item => item.key === key);
            if (index > -1) {
                cart[index].qty += delta;
                if (cart[index].qty <= 0) {
                    cart.splice(index, 1);
                }
                saveCart();
            }
        }

        function removeCartItem(key) {
            cart = cart.filter(item => item.key !== key);
            saveCart();
        }

        function getTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discount = Math.round(subtotal * activeVoucherDiscount);
    const after = subtotal - discount;
    const shipping = subtotal === 0 || after >= SHOP.freeShipThreshold ? 0 : SHOP.shippingFee;
    return { subtotal, discount, shipping, total: after + shipping };
}
function calculateCartTotals() {
    const t = getTotals();
    document.getElementById('cartSubtotal').innerText = formatVND(t.subtotal);
    document.getElementById('cartDiscount').innerText = `-${formatVND(t.discount)}`;
    document.getElementById('cartShipping').innerText = t.shipping === 0 ? 'Miễn phí' : formatVND(t.shipping);
    document.getElementById('cartTotal').innerText = formatVND(t.total);
    document.getElementById('checkoutTotalAmount').innerText = formatVND(t.total);
}

        function applyVoucher() {
    const code = document.getElementById('voucherInput').value.trim().toUpperCase();
    if (SHOP.vouchers[code]) {
        activeVoucherDiscount = SHOP.vouchers[code]; activeVoucherCode = code;
        alert(`Áp dụng mã ${code} thành công! Giảm ${SHOP.vouchers[code] * 100}% đơn hàng.`);
    } else {
        activeVoucherDiscount = 0;
        alert('Mã giảm giá không hợp lệ!');
    }
    calculateCartTotals();
}

        /* Wishlist logic */
        function toggleWishlist(id) {
            if (wishlist.includes(id)) {
                wishlist = wishlist.filter(item => item !== id);
            } else {
                wishlist.push(id);
            }
            localStorage.setItem('diemmy_wishlist', JSON.stringify(wishlist));
            updateWishlistBadge();
            applyFilters();
        }

        function updateWishlistBadge() {
            const badge = document.getElementById('wishlist-badge');
            if (wishlist.length > 0) {
                badge.innerText = wishlist.length;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        function toggleWishlistModal() {
            if (wishlist.length === 0) {
                alert('Danh sách yêu thích của chị Diễm My hiện chưa có sản phẩm nào!');
                return;
            }
            let wishProducts = products.filter(p => wishlist.includes(p.id));
            renderProducts(wishProducts);
        }

        /* ==========================================================================
           CHECKOUT & VIETQR PAYMENT LOGIC
           ========================================================================== */
        function openCheckoutModal() {
    if (cart.length === 0) {
        alert('Giỏ hàng trống! Vui lòng chọn sản phẩm trước khi thanh toán.');
        return;
    }
    toggleCartDrawer(false);
    currentOrderId = 'DMF' + Date.now().toString().slice(-6);
    document.querySelector('input[name="paymentMethod"][value="COD"]').checked = true;
    calculateCartTotals();
    togglePaymentView('COD');
    document.getElementById('checkoutModal').classList.remove('opacity-0', 'pointer-events-none');
}

        function closeCheckoutModal() {
            const modal = document.getElementById('checkoutModal');
            modal.classList.add('opacity-0', 'pointer-events-none');
        }

        function togglePaymentView(method) {
    const box = document.getElementById('vietqrContainer');
    if (method !== 'VIETQR') { box.classList.add('hidden'); return; }
    const b = SHOP.bank;
    document.getElementById('qrMemo').innerText = currentOrderId;
    document.getElementById('qrAccount').innerText = b.account;
    document.getElementById('vietqrImg').src =
        `https://img.vietqr.io/image/${b.bin}-${b.account}-compact2.png?amount=${getTotals().total}&addInfo=${currentOrderId}&accountName=${encodeURIComponent(b.owner)}`;
    box.classList.remove('hidden');
}

        async function processOrder(e) {
    e.preventDefault();
    const phone = document.getElementById('custPhone').value.replace(/\s/g, '');
    if (!/^(0|\+84)\d{9}$/.test(phone)) { alert('Số điện thoại không hợp lệ (ví dụ 0901234567).'); return; }
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        const res = await fetch('/api/orders', {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
                orderId: currentOrderId, phone, voucher: activeVoucherCode,
                name: document.getElementById('custName').value, address: document.getElementById('custAddress').value,
                notes: document.getElementById('custNotes').value,
                payment: document.querySelector('input[name="paymentMethod"]:checked').value,
                items: cart.map(i => ({ id: i.id, size: i.size, color: i.color, qty: i.qty }))
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi đặt hàng');
        const name = document.getElementById('custName').value;
        closeCheckoutModal();
        cart = []; activeVoucherDiscount = 0; activeVoucherCode = '';
        document.getElementById('voucherInput').value = '';
        document.getElementById('checkoutForm').reset();
        saveCart();
        document.getElementById('successOrderId').innerText = '#' + data.id;
        document.getElementById('successCustomerName').innerText = name;
        document.getElementById('successTotalAmount').innerText = formatVND(data.total);
        document.getElementById('successModal').classList.remove('opacity-0', 'pointer-events-none');
    } catch (err) {
        alert(err.message + '. Vui lòng thử lại hoặc gọi hotline.');
    } finally { btn.disabled = false; }
}
function closeSuccessModal() {
            const successModal = document.getElementById('successModal');
            successModal.classList.add('opacity-0', 'pointer-events-none');
        }

        /* ==========================================================================
           FLASH SALE COUNTDOWN TIMER
           ========================================================================== */
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

// Luôn lấy sản phẩm mới nhất từ máy chủ (khi mở trang, mỗi 30 giây, và khi quay lại tab)
let _productsSig = '';
function loadProducts() {
    return fetch('/api/products', { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(list => { const sig = JSON.stringify(list); if (sig === _productsSig) return; _productsSig = sig; products = list; applyFilters(); })
        .catch(err => { console.error('Không tải được sản phẩm:', err); if (!_productsSig) { _productsSig = 'static'; applyFilters(); } });
}
