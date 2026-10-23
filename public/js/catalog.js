// Danh mục, hiển thị, lọc, tìm kiếm và tải sản phẩm từ API
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
                        ${p.stock === 0 ? '<span class="absolute inset-0 z-10 bg-black/65 flex items-center justify-center text-white font-bold text-sm tracking-widest pointer-events-none">HẾT HÀNG</span>' : ''}
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
                result = result.filter(p => (p.name || '').toLowerCase().includes(searchKeyword) || (p.desc || '').toLowerCase().includes(searchKeyword));
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
let _productsSig = '';
// Luôn lấy sản phẩm mới nhất từ máy chủ; lỗi mạng thì dùng danh sách mẫu trong products.js
function loadProducts() {
    return fetch('/api/products', { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(list => {
            if (!Array.isArray(list)) throw new Error('Dữ liệu sản phẩm không hợp lệ');
            const sig = JSON.stringify(list);
            if (sig === _productsSig) return;
            _productsSig = sig;
            products = list;
            syncCartWithCatalog();
            applyFilters();
        })
        .catch(err => {
            console.error('Không tải được sản phẩm:', err);
            if (!_productsSig) { _productsSig = 'static'; applyFilters(); }
        });
}

// Đồng bộ giỏ hàng với giá/tên mới nhất; bỏ sản phẩm đã bị xoá khỏi cửa hàng
function syncCartWithCatalog() {
    const before = JSON.stringify(cart);
    cart = cart.filter(i => products.some(p => p.id === i.id)).map(i => {
        const p = products.find(x => x.id === i.id);
        return { ...i, price: p.price, name: p.name, image: p.image };
    });
    if (JSON.stringify(cart) !== before) { saveCart(); renderCartDrawer(); calculateCartTotals(); }
}
