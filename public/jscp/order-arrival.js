// One arrival per login session on this page; no overlay or focus trap.
(() => {
    let token = '', seen = false, layer = null, timer = 0, frame = 0;
    const badge = () => document.getElementById('donBadge');
    function clear() {
        clearTimeout(timer); cancelAnimationFrame(frame);
        layer?.remove(); layer = null;
        badge()?.classList.remove('gift-landed');
    }
    function session(next) {
        if (token === next) return;
        clear(); token = next; seen = false;
        if (badge()) badge().hidden = true;
    }
    function finish(pulse = false) {
        clear();
        if (pulse && badge() && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            badge().classList.add('gift-landed');
            timer = setTimeout(() => badge()?.classList.remove('gift-landed'), 450);
        }
    }
    function targetRect() {
        const el = badge();
        if (!el || el.hidden || !el.getClientRects().length) return null;
        const rect = el.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth ? rect : null;
    }
    function modalOpen() {
        return [...document.querySelectorAll('.auth-dialog-overlay, #globalLoginOverlay, .order-history-modal.show, #paymentModal')]
            .some(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    }
    function show(owner, count) {
        if (!owner || owner !== token || owner !== localStorage.getItem('token') || seen || !(count > 0)) return;
        seen = true;
        let attempts = 0;
        const start = () => {
            if (owner !== token || owner !== localStorage.getItem('token') || document.hidden) return;
            if (modalOpen()) { if (++attempts < 100) timer = setTimeout(start, 150); return; }
            if (!targetRect()) return;
            layer = document.createElement('div'); layer.className = 'gift-arrival'; layer.setAttribute('aria-hidden', 'true');
            const card = document.createElement('div'); card.className = 'gift-arrival-card';
            const number = document.createElement('strong'); number.className = 'gift-arrival-number'; number.textContent = count > 999 ? '999+' : String(count);
            const label = document.createElement('p'); label.textContent = 'Đơn đã tạo';
            card.append(number, label); layer.append(card); document.body.append(layer);
            timer = setTimeout(() => {
                if (!layer || modalOpen() || !targetRect() || matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
                const rect = number.getBoundingClientRect(), x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
                const orb = document.createElement('span'); orb.className = 'gift-arrival-orb'; orb.textContent = number.textContent;
                orb.style.left = x + 'px'; orb.style.top = y + 'px'; orb.style.transform = 'translate(-50%, -50%)';
                layer.append(orb); card.classList.add('is-flying');
                const began = performance.now();
                const move = now => {
                    const end = targetRect();
                    if (!end || !layer || modalOpen() || owner !== localStorage.getItem('token')) { finish(); return; }
                    const t = Math.min(1, (now - began) / 700), p = 1 - (1 - t) ** 3;
                    orb.style.left = `${x + (end.left + end.width / 2 - x) * p - Math.sin(Math.PI * p) * 36}px`;
                    orb.style.top = `${y + (end.top + end.height / 2 - y) * p}px`;
                    orb.style.transform = `translate(-50%, -50%) scale(${1 - p * (1 - end.width / 64)})`;
                    if (t < 1) frame = requestAnimationFrame(move); else finish(true);
                };
                frame = requestAnimationFrame(move);
            }, 2000);
        };
        start();
    }
    document.getElementById('btnOrderHistory')?.addEventListener('click', () => { seen = true; finish(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
    window.addEventListener('pagehide', () => finish());
    window.addEventListener('storage', event => { if (event.key === 'token' || event.key === null) session(localStorage.getItem('token') || ''); });
    window.dloveOrderArrival = { session, show };
})();
