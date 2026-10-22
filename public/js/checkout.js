// Thanh toán và gửi đơn hàng
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
