// ===== Đăng nhập / đăng ký / đơn hàng của tôi =====
const AUTH_KEY = 'dmauth';
let authState = null;
try { authState = JSON.parse(localStorage.getItem(AUTH_KEY)); } catch {}
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function authHeaders() { return authState && authState.token ? { Authorization: 'Bearer ' + authState.token } : {}; }
function renderAccountBtn() {
    document.getElementById('accountLabel').innerText = authState ? authState.user.name.split(' ').pop() : 'Đăng nhập';
}
function authView(v) {
    ['Login', 'Register', 'Forgot', 'Reset', 'Account'].forEach(x => document.getElementById('auth' + x).classList.toggle('hidden', x !== v));
}
function openAuth() {
    if (authState) {
        document.getElementById('accName').innerText = authState.user.name;
        document.getElementById('adminLink').classList.toggle('hidden', authState.user.role !== 'admin');
        authView('Account'); loadMyOrders();
    } else authView('Login');
    document.getElementById('authModal').classList.remove('opacity-0', 'pointer-events-none');
}
function closeAuth() { document.getElementById('authModal').classList.add('opacity-0', 'pointer-events-none'); }
async function authCall(path, body, msgId) {
    const msg = document.getElementById(msgId); msg.innerText = ''; msg.className = 'text-red-400 text-sm mb-2';
    try {
        const r = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Có lỗi xảy ra');
        authState = d; localStorage.setItem(AUTH_KEY, JSON.stringify(d)); renderAccountBtn(); openAuth();
    } catch (e) { msg.innerText = e.message; }
}
function doLogin(e) { e.preventDefault(); authCall('login', { email: lEmail.value, password: lPass.value }, 'lMsg'); }
function doRegister(e) { e.preventDefault(); authCall('register', { name: rName.value, email: rEmail.value, phone: rPhone.value, password: rPass.value }, 'rMsg'); }
function doLogout() { authState = null; localStorage.removeItem(AUTH_KEY); renderAccountBtn(); closeAuth(); }
async function loadMyOrders() {
    const box = document.getElementById('myOrders'); box.innerText = 'Đang tải...';
    try {
        const r = await fetch('/api/my-orders', { headers: authHeaders() });
        if (r.status === 401) { doLogout(); return; }
        const list = await r.json();
        box.innerHTML = list.length ? list.map(o => `<div class="border border-neutral-800 rounded-lg p-3">
            <div class="flex justify-between"><b class="text-gold">#${escH(o.id)}</b><span>${escH(o.status)}</span></div>
            <div class="text-xs text-neutral-500">${new Date(o.createdAt).toLocaleString('vi-VN')}</div>
            <div class="mt-1">${o.items.map(i => `${escH(i.name)} x${i.qty}`).join(', ')}</div>
            <div class="mt-1 font-semibold">${formatVND(o.total)}</div></div>`).join('') : 'Bạn chưa có đơn hàng nào.';
    } catch { box.innerText = 'Không tải được đơn hàng.'; }
}
// Tự điền tên và số điện thoại khi đã đăng nhập
const _openCheckout = openCheckoutModal;
openCheckoutModal = function () {
    _openCheckout();
    if (authState && authState.user.role !== 'admin') { const n = document.getElementById('custName'); if (!n.value) n.value = authState.user.name; }
};
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAuth(); });
renderAccountBtn();

// ===== Quên mật khẩu / đặt lại mật khẩu =====
async function postJson(path, body) {
    const r = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Có lỗi xảy ra'); return d;
}
async function doForgot(e) {
    e.preventDefault();
    const m = document.getElementById('fMsg');
    try {
        await postJson('forgot', { email: fEmail.value });
        m.className = 'text-green-400 text-sm mb-2';
        m.innerText = 'Nếu email này đã đăng ký, liên kết đặt lại mật khẩu đã được gửi. Hãy kiểm tra cả mục Spam.';
    } catch (err) { m.className = 'text-red-400 text-sm mb-2'; m.innerText = err.message; }
}
let resetToken = new URLSearchParams(location.search).get('reset') || '';
async function doReset(e) {
    e.preventDefault();
    try {
        await postJson('reset', { token: resetToken, password: nPass.value });
        resetToken = ''; authView('Login');
        const m = document.getElementById('lMsg'); m.className = 'text-green-400 text-sm mb-2'; m.innerText = 'Đã đổi mật khẩu. Hãy đăng nhập.';
    } catch (err) { document.getElementById('nMsg').innerText = err.message; }
}
if (resetToken) {
    history.replaceState(null, '', location.pathname);
    document.getElementById('authModal').classList.remove('opacity-0', 'pointer-events-none');
    authView('Reset');
}
