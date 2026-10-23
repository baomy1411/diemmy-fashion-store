// Cửa sổ xem nhanh và thêm vào giỏ
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
                    <img src="${product.image}" alt="${product.name}" class="max-h-[240px] md:max-h-[350px] w-full object-cover rounded-xl border border-neutral-800">
                </div>
                <div class="md:w-1/2 p-6 flex flex-col justify-between space-y-4">
                    <div>
                        <span class="text-xs font-bold text-gold uppercase tracking-widest">${product.category}</span>
                        <h3 class="text-xl font-bold font-serif-luxury text-white mt-1">${product.name}</h3>
                        <div class="flex items-center space-x-2 mt-2">
                            <span id="quickViewPrice" class="text-lg font-bold text-gold"></span>
                            <span id="quickViewOrig" class="text-xs text-neutral-500 line-through"></span>
                        </div>
                        <p class="text-xs text-neutral-400 mt-3 leading-relaxed">${product.desc}</p>
                    </div>

                    <div class="space-y-3 pt-2 border-t border-neutral-800">
                        <!-- Size selection -->
                        <div>
                            <label class="block text-xs font-semibold text-neutral-300 mb-1">Kích Thước (Size):</label>
                            <div class="flex flex-wrap gap-2" id="quickViewSizes">
                                ${product.sizes.map((s, idx) => `
                                    <button onclick="selectSize('${s}')" data-v="${s}" class="size-btn text-xs px-3 py-1.5 rounded border border-neutral-700 text-neutral-300 hover:border-gold hover:text-gold ${idx === 0 ? 'border-gold text-gold font-bold' : ''}">${s}${hasVariantPrices(product) ? ' · ' + formatVND(priceOf(product, s)) : ''}</button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Color selection -->
                        <div class=\"${product.colors.length ? '' : 'hidden'}\">
                            <label class="block text-xs font-semibold text-neutral-300 mb-1">Màu Sắc:</label>
                            <div class="flex flex-wrap gap-2" id="quickViewColors">
                                ${product.colors.map((c, idx) => `
                                    <button onclick="selectColor('${c}')" data-v="${c}" class="color-btn text-xs px-3 py-1 rounded border border-neutral-700 text-neutral-300 hover:border-gold ${idx === 0 ? 'border-gold text-gold font-bold' : ''}">${c}</button>
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
            selectedProductForQuickView.selectedColor = product.colors[0] || '';
            updateQuickViewPrice();
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
            updateQuickViewPrice();
            document.querySelectorAll('#quickViewSizes .size-btn').forEach(btn => {
                if(btn.dataset.v === size) {
                    btn.classList.add('border-gold', 'text-gold', 'font-bold');
                } else {
                    btn.classList.remove('border-gold', 'text-gold', 'font-bold');
                }
            });
        }

        function selectColor(color) {
            selectedProductForQuickView.selectedColor = color;
            document.querySelectorAll('#quickViewColors .color-btn').forEach(btn => {
                if(btn.dataset.v === color) {
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
            const max = selectedProductForQuickView.stock;
            if (typeof max === 'number' && current > max) current = Math.max(1, max);
            selectedProductForQuickView.selectedQty = current;
            document.getElementById('quickViewQty').innerText = current;
        }

        /* ==========================================================================
           CART & WISHLIST LOGIC (LOCALSTORAGE PERSISTENCE)
           ========================================================================== */
        function addSelectedToCart() {
            if (!selectedProductForQuickView) return;
            const stock = selectedProductForQuickView.stock;
            if (stock === 0) { alert('Sản phẩm này đã hết hàng.'); return; }
            if (typeof stock === 'number') {
                const inCart = cart.filter(i => i.id === selectedProductForQuickView.id).reduce((s, i) => s + i.qty, 0);
                if (inCart + (selectedProductForQuickView.selectedQty || 1) > stock) { alert(`Chỉ còn ${stock} sản phẩm (bạn đã có ${inCart} trong giỏ).`); return; }
            }
            const cartItemKey = `${selectedProductForQuickView.id}-${selectedProductForQuickView.selectedSize}-${selectedProductForQuickView.selectedColor}`;
            const existingIndex = cart.findIndex(item => item.key === cartItemKey);

            if (existingIndex > -1) {
                cart[existingIndex].qty += selectedProductForQuickView.selectedQty;
            } else {
                cart.push({
                    key: cartItemKey,
                    id: selectedProductForQuickView.id,
                    name: selectedProductForQuickView.name,
                    price: priceOf(selectedProductForQuickView, selectedProductForQuickView.selectedSize),
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

// Giá hiển thị theo size đang chọn; giá gốc gạch ngang chỉ hiện khi size đó dùng giá chung
function updateQuickViewPrice() {
    const p = selectedProductForQuickView; if (!p) return;
    const custom = !!(p.sizePrices && p.sizePrices[p.selectedSize]);
    document.getElementById('quickViewPrice').innerText = formatVND(priceOf(p, p.selectedSize));
    document.getElementById('quickViewOrig').innerText = (p.originalPrice && !custom && !hasVariantPrices(p)) ? formatVND(p.originalPrice) : '';
}
