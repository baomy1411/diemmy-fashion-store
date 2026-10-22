// Giỏ hàng, tổng tiền, mã giảm giá
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
async function applyVoucher() {
    const code = document.getElementById('voucherInput').value.trim().toUpperCase();
    if (!code) { alert('Vui lòng nhập mã giảm giá.'); return; }
    try {
        const res = await fetch('/api/voucher', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        activeVoucherDiscount = data.rate; activeVoucherCode = code;
        alert(`Áp dụng mã ${code} thành công! Giảm ${Math.round(data.rate * 100)}% đơn hàng.`);
    } catch (e) {
        activeVoucherDiscount = 0; activeVoucherCode = '';
        alert('Mã giảm giá không hợp lệ!');
    }
    calculateCartTotals();
}

        /* Wishlist logic */
