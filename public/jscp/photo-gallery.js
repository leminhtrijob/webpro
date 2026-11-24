/* Three seamless photo ribbons; the center row travels in the opposite direction. */
(function () {
    function layout(photos, area) {
        const gap = Math.max(8, Math.min(14, area.h * .025));
        const padding = Math.max(36, Math.min(64, area.h * .08));
        const height = Math.max(24, Math.min(196, (area.h - padding * 2 - gap * 2) / 3));
        const width = Math.round(height * 1.4);
        const speed = area.h <= 500 ? 26 : 34;
        return {gap, height, width, rows: [0, 1, 2].map(row => {
            let indexes = photos.map((_, index) => index).filter(index => index % 3 === row);
            // Small albums use every photo in each row, staggered to avoid a row of identical copies.
            if (photos.length <= 5) indexes = photos.map((_, index) => (index + row) % photos.length);
            if (!indexes.length) return {indexes: [], distance: 0, duration: 0};
            const copies = Math.max(1, Math.ceil(area.w / ((width + gap) * indexes.length)));
            indexes = Array.from({length: copies}, () => indexes).flat();
            const distance = indexes.length * (width + gap);
            return {indexes, distance, duration: distance / speed, direction: row === 1 ? 'normal' : 'reverse'};
        })};
    }
    let active = null;
    function updatePause() {
        if (!active) return;
        active.container.classList.toggle('is-paused', active.paused);
        const button = active.container.querySelector('.td-gallery-pause');
        if (button) {
            button.textContent = active.paused ? '▶ Tiếp tục' : 'Ⅱ Tạm dừng';
            button.setAttribute('aria-pressed', String(active.paused));
        }
    }
    function paint() {
        const {container, photos} = active;
        const area = window.TeacherTextLayout.viewport();
        const plan = layout(photos, area);
        active.area = area;
        container.replaceChildren();
        container.classList.add('td-photo-gallery');
        container.style.setProperty('--gallery-row-height', plan.height + 'px');
        container.style.setProperty('--gallery-card-width', plan.width + 'px');
        container.style.setProperty('--gallery-gap', plan.gap + 'px');
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'td-gallery-close';
        close.textContent = '×';
        close.setAttribute('aria-label', 'Đóng bộ ảnh');
        close.onclick = event => { event.stopPropagation(); container.style.display = 'none'; };
        container.appendChild(close);
        const lanes = document.createElement('div');
        lanes.className = 'td-gallery-lanes';
        plan.rows.forEach((row, rowIndex) => {
            const lane = document.createElement('div');
            lane.className = 'td-gallery-lane';
            lane.setAttribute('aria-label', `Hàng ảnh ${rowIndex + 1}`);
            const track = document.createElement('div');
            track.className = 'td-gallery-track';
            track.style.setProperty('--gallery-distance', row.distance + 'px');
            track.style.animationDuration = row.duration + 's';
            track.style.animationDirection = row.direction;
            track.style.animationDelay = -(row.duration * rowIndex / 6) + 's';
            for (let copy = 0; copy < 2; copy++) {
                const group = document.createElement('div');
                group.className = 'td-gallery-group';
                if (copy) group.setAttribute('aria-hidden', 'true');
                row.indexes.forEach(index => {
                    const card = document.createElement('div');
                    card.className = 'td-gallery-photo';
                    const backdrop = document.createElement('img');
                    backdrop.className = 'td-gallery-backdrop';
                    backdrop.src = photos[index];
                    backdrop.alt = '';
                    backdrop.setAttribute('aria-hidden', 'true');
                    const image = document.createElement('img');
                    image.className = 'td-gallery-image';
                    image.src = photos[index];
                    image.alt = copy ? '' : `Ảnh kỷ niệm ${index + 1}`;
                    image.decoding = 'async';
                    image.draggable = false;
                    card.appendChild(backdrop);
                    card.appendChild(image);
                    group.appendChild(card);
                });
                track.appendChild(group);
            }
            lane.appendChild(track);
            lanes.appendChild(lane);
        });
        container.appendChild(lanes);
        const pause = document.createElement('button');
        pause.type = 'button';
        pause.className = 'td-gallery-pause';
        pause.onclick = event => { event.stopPropagation(); active.paused = !active.paused; updatePause(); };
        container.appendChild(pause);
        updatePause();
    }
    function render(container, input) {
        const photos = Array.isArray(input) ? input.filter(url => typeof url === 'string' && url.trim()) : [];
        if (!photos.length) { container.replaceChildren(); active = null; return; }
        active = {container, photos, paused: window.matchMedia('(prefers-reduced-motion: reduce)').matches};
        paint();
    }
    let resizeTimer;
    function refit() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (!active) return;
            const area = window.TeacherTextLayout.viewport();
            if (area.w !== active.area.w || area.h !== active.area.h) paint();
        }, 120);
    }
    window.addEventListener('resize', refit);
    window.visualViewport?.addEventListener('resize', refit);
    window.TeacherPhotoGallery = {layout, render};
})();
