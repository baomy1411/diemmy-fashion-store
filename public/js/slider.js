// Slider ảnh đầu trang. Ảnh do admin thêm ở tab "Banner"; chưa có ảnh nào thì dùng ảnh mặc định bên dưới.
const DEFAULT_SLIDES = [{ src: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800', title: 'Đầm Dạ Hội Satin Bán Chạy Nhất' }];
let slides = [], slideIdx = 0, slideTimer = null;

function loadSlides() {
    return fetch('/api/slides', { cache: 'no-store' }).then(r => (r.ok ? r.json() : [])).catch(() => [])
        .then(list => { slides = Array.isArray(list) && list.length ? list : DEFAULT_SLIDES; renderSlider(); });
}
function renderSlider() {
    const root = document.getElementById('heroSlider'); if (!root) return;
    clearInterval(slideTimer); slideIdx = 0;
    const many = slides.length > 1;
    const arrow = (dir, side) => `<button type="button" onclick="goSlide(slideIdx${dir})" aria-label="${dir === '-1' ? 'Ảnh trước' : 'Ảnh sau'}" class="absolute ${side}-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 text-white hover:bg-gold hover:text-black transition"><i class="fas fa-chevron-${side}"></i></button>`;
    root.innerHTML = slides.map((s, i) => `
        <div class="hero-slide absolute inset-0 transition-opacity duration-700 ${i === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}">
            <img src="${escHtml(s.src)}" alt="${escHtml(s.title || 'Diễm My Fashion')}" ${i ? 'loading="lazy"' : ''} class="w-full h-full object-cover" onerror="this.style.visibility='hidden'">
            ${s.title ? `<div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/60 to-transparent p-6 ${many ? 'pb-10' : ''}"><span class="text-xs text-gold uppercase tracking-widest font-semibold">New Arrival</span><h3 class="text-lg font-serif-luxury text-white">${escHtml(s.title)}</h3></div>` : ''}
        </div>`).join('') + (many ? arrow('-1', 'left') + arrow('+1', 'right') +
        `<div class="absolute bottom-3 inset-x-0 z-10 flex justify-center gap-2">${slides.map((_, i) => `<button type="button" onclick="goSlide(${i})" aria-label="Ảnh ${i + 1}" class="hero-dot h-2 rounded-full transition-all ${i === 0 ? 'w-6 bg-gold' : 'w-2 bg-white/50'}"></button>`).join('')}</div>` : '');
    let x0 = 0;
    root.onmouseenter = () => clearInterval(slideTimer);                // dừng khi rê chuột / chạm
    root.onmouseleave = startSlideTimer;
    root.ontouchstart = e => { x0 = e.touches[0].clientX; clearInterval(slideTimer); };
    root.ontouchend = e => { const dx = e.changedTouches[0].clientX - x0; if (many && Math.abs(dx) > 40) goSlide(slideIdx + (dx < 0 ? 1 : -1)); startSlideTimer(); };
    startSlideTimer();
}
function goSlide(i) {
    const root = document.getElementById('heroSlider'); if (!root || !slides.length) return;
    slideIdx = (i + slides.length) % slides.length;
    root.querySelectorAll('.hero-slide').forEach((el, k) => {
        el.classList.toggle('opacity-100', k === slideIdx); el.classList.toggle('opacity-0', k !== slideIdx); el.classList.toggle('pointer-events-none', k !== slideIdx);
    });
    root.querySelectorAll('.hero-dot').forEach((el, k) => {
        el.classList.toggle('w-6', k === slideIdx); el.classList.toggle('bg-gold', k === slideIdx);
        el.classList.toggle('w-2', k !== slideIdx); el.classList.toggle('bg-white/50', k !== slideIdx);
    });
}
function startSlideTimer() {
    clearInterval(slideTimer);
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;   // người dùng tắt hiệu ứng chuyển động
    if (slides.length > 1 && !calm) slideTimer = setInterval(() => goSlide(slideIdx + 1), 5000);
}
