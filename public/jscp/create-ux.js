/* Creator flow: edit in either orientation, preview, then review the existing checkout. */
(function () {
    'use strict';
    function init() {
        if (window.birthdayAPI?.getWebsiteIdFromURL()) return;
        const modal = document.getElementById('settingsModal');
        const settingsButton = document.getElementById('settingsButton');
        const apply = document.getElementById('applySettings');
        const pricing = document.getElementById('pricingContainer');
        const auth = document.getElementById('googleAuthContainer');
        if (!modal || !settingsButton || !apply || !pricing) return;

        document.body.appendChild(modal);
        document.body.classList.add('td-creator');
        apply.removeAttribute('data-i18n');
        apply.textContent = '👀 Xem thử món quà';

        const body = modal.querySelector('.modal-body');
        const content = modal.querySelector('.modal-content');
        const heading = modal.querySelector('.modal-header h2');
        heading.removeAttribute('data-i18n');
        heading.id = 'tdEditorTitle';
        heading.textContent = 'Tạo Matrix DLove';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'tdEditorTitle');
        const close = modal.querySelector('.close');
        close.setAttribute('role', 'button');
        close.setAttribute('tabindex', '0');
        close.setAttribute('aria-label', 'Đóng và xem thiệp');
        close.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close.click(); } });
        const intro = document.createElement('div');
        intro.className = 'td-intro';
        intro.innerHTML = '<div class="td-steps"><b>1. Viết lời chúc</b><span>2. Xem thử</span><span>3. Tạo thiệp</span></div><p>Viết vài lời dành cho người bạn muốn gửi tặng. Bạn có thể xem thử và chỉnh sửa trước khi tạo link.</p>';
        body.prepend(intro);
        const section = id => document.getElementById(id)?.closest('.settings-section');
        const letter = section('letterTitle'), sequence = section('sequenceText'), music = section('backgroundMusic'), photos = section('photoFileInput');
        const rename = (el, title) => { const h = el?.querySelector('h3'); if (h) { h.removeAttribute('data-i18n'); h.textContent = title; } };
        rename(letter, 'Lá thư của bạn');
        rename(sequence, 'Lời chúc mở đầu');
        rename(music, 'Nhạc nền');
        let anchor = intro;
        for (const el of [letter, sequence, photos, music]) { if (el) { anchor.after(el); anchor = el; } }
        // Move the real controls, preserving their listeners and checkout payload IDs.
        const matrixSection = section('matrixText');
        sequence.appendChild(document.getElementById('matrixText').closest('.form-group'));
        const rainLabel = sequence.querySelector('label[for="matrixText"]');
        rainLabel.removeAttribute('data-i18n');
        rainLabel.textContent = 'Chữ chạy ở nền';
        const previewHint = document.createElement('p');
        previewHint.className = 'td-preview-hint';
        previewHint.textContent = 'Màu sắc và thời gian đếm ngược được chỉnh ngay trên màn xem thử.';
        sequence.appendChild(previewHint);

        const tools = document.createElement('div');
        tools.id = 'tdPreviewTools';
        tools.setAttribute('aria-label', 'Tùy chỉnh màn xem thử');
        tools.innerHTML = '<button type="button" id="tdColorButton" aria-expanded="false" aria-controls="tdColorPanel">🎨 Màu sắc</button><button type="button" id="tdCountdownButton" aria-expanded="false" aria-controls="tdCountdownPanel">⏱ Đếm ngược · <span>3 giây</span></button><section id="tdColorPanel" class="td-tool-panel" aria-labelledby="tdColorButton" hidden></section><section id="tdCountdownPanel" class="td-tool-panel" aria-labelledby="tdCountdownButton" hidden><h3>Thời gian đếm ngược</h3><p>Chọn thời gian mở đầu trước lời chúc.</p><div class="td-countdown-options"></div></section>';
        document.body.appendChild(tools);
        const versions = document.createElement('div');
        versions.className = 'td-version-switch';
        versions.setAttribute('role', 'group');
        versions.setAttribute('aria-label', 'Phiên bản chữ');
        versions.innerHTML = '<button type="button" data-font="default" aria-pressed="true">Bản 1 · Chữ hạt</button><button type="button" data-font="mau2" aria-pressed="false">Bản 2 · Chữ nổi mới</button>';
        tools.appendChild(versions);
        versions.addEventListener('click', event => {
            const button = event.target.closest('[data-font]');
            if (!button) return;
            settings.fontStyle = button.dataset.font;
            if (window.settings) window.settings.fontStyle = settings.fontStyle;
            versions.querySelectorAll('button').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
            closeTools();
            resetWebsiteState();
        });
        const colorPanel = tools.querySelector('#tdColorPanel');
        colorPanel.appendChild(matrixSection);
        colorPanel.appendChild(document.getElementById('sequenceColorSection'));
        rename(matrixSection, 'Màu sắc của thiệp');
        const countdownPanel = tools.querySelector('#tdCountdownPanel');
        const countdownSection = section('countdownTime');
        countdownSection.hidden = true;
        countdownPanel.appendChild(countdownSection);
        const countdown = document.getElementById('countdownTime');
        const pairs = [
            [tools.querySelector('#tdColorButton'), colorPanel],
            [tools.querySelector('#tdCountdownButton'), countdownPanel]
        ];
        function closeTools() {
            pairs.forEach(([button, panel]) => { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); });
        }
        function syncTools() {
            tools.querySelector('#tdCountdownButton span').textContent = `${countdown.value} giây`;
            tools.querySelectorAll('[data-countdown]').forEach(button => {
                button.setAttribute('aria-pressed', String(button.dataset.countdown === countdown.value));
            });
            colorPanel.querySelectorAll('.color-theme-btn').forEach(button => {
                button.setAttribute('aria-pressed', String(button.classList.contains('active')));
            });
        }
        function applyPreviewControls() {
            const values = { countdown: Number(countdown.value), colorTheme: colorPanel.querySelector('.color-theme-btn.active')?.dataset.theme };
            for (const id of ['matrixColor1', 'matrixColor2', 'sequenceColor']) values[id] = document.getElementById(id).value;
            Object.assign(settings, values);
            // The renderer may hold a different object from the form settings.
            Object.assign(window.settings || (window.settings = settings), values);
            syncTools();
            resetWebsiteState();
        }
        pairs.forEach(([button, panel]) => button.addEventListener('click', () => {
            const opening = panel.hidden;
            closeTools();
            if (opening) { syncTools(); panel.hidden = false; button.setAttribute('aria-expanded', 'true'); }
        }));
        for (const option of countdown.options) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.countdown = option.value;
            button.textContent = option.textContent;
            button.addEventListener('click', () => {
                countdown.value = option.value;
                countdown.dispatchEvent(new Event('change', { bubbles: true }));
                applyPreviewControls();
                closeTools();
                tools.querySelector('#tdCountdownButton').focus();
            });
            countdownPanel.querySelector('.td-countdown-options').appendChild(button);
        }
        colorPanel.addEventListener('click', event => {
            const button = event.target.closest('.color-theme-btn');
            if (!button) return;
            // populateModal's existing target listener has already applied the theme.
            syncTools();
            if (button.dataset.theme !== 'custom') {
                applyPreviewControls();
                closeTools();
                tools.querySelector('#tdColorButton').focus();
            }
        });
        colorPanel.addEventListener('change', event => {
            if (event.target.matches('input[type="color"]')) applyPreviewControls();
        });
        document.addEventListener('click', event => { if (!tools.contains(event.target)) closeTools(); });
        tools.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            const pair = pairs.find(([, panel]) => !panel.hidden);
            closeTools();
            pair?.[0].focus();
        });
        const letterFields = Object.fromEntries(['letterTitle', 'letterContent', 'letterSignature', 'envelopeText'].map(id => [id, document.getElementById(id)]));
        for (const id of ['letterTitle', 'letterSignature', 'envelopeText']) letterFields[id].closest('.form-group').hidden = true;
        const draft = document.createElement('textarea');
        draft.id = 'tdLetterDraft'; draft.rows = 10; draft.maxLength = 5000;
        draft.placeholder = 'Cô kính mến,\n\nCảm ơn cô đã luôn tận tâm dạy dỗ chúng em. Chúc cô thật nhiều sức khỏe và niềm vui!\n\nHọc trò Minh';
        letterFields.letterContent.hidden = true;
        letterFields.letterContent.after(draft);
        letter.querySelector('label[for="letterContent"]').htmlFor = draft.id;
        function syncLetterDraft() {
            const parsed = window.TeacherLetterDraft.parse(draft.value);
            for (const [id, value] of Object.entries(parsed)) letterFields[id].value = value;
            letterFields.envelopeText.value = 'Chúc mừng\nNgày Nhà giáo\nViệt Nam 20/11';
        }
        draft.addEventListener('input', syncLetterDraft);
        const originalSequence = document.getElementById('sequenceText');
        const lines = document.createElement('textarea');
        lines.id = 'tdSequenceLines'; lines.rows = 4;
        lines.setAttribute('aria-label', 'Lời chúc mở đầu, mỗi dòng một cụm chữ');
        originalSequence.hidden = true;
        originalSequence.after(lines);
        const seqLabel = sequence.querySelector('label[for="sequenceText"]');
        seqLabel.removeAttribute('data-i18n'); seqLabel.htmlFor = lines.id;
        seqLabel.textContent = 'Mỗi dòng là một cụm chữ xuất hiện trên thiệp';
        const note = sequence.querySelector('[data-i18n="noteSequence"]');
        if (note) note.hidden = true;
        lines.addEventListener('input', () => {
            originalSequence.value = lines.value.split('\n').map(s => s.trim()).filter(Boolean).join('|');
            originalSequence.dispatchEvent(new Event('input', {bubbles:true}));
        });
        const footer = document.createElement('div');
        footer.className = 'td-editor-footer';
        footer.innerHTML = '<span>Xem thử chưa tạo đơn hoặc thanh toán.</span>';
        footer.appendChild(apply); content.appendChild(footer);
        const error = document.createElement('p'); error.className = 'td-form-error'; error.setAttribute('role','alert'); error.hidden = true;
        footer.prepend(error);
        let previewReady = false;
        const required = [draft.id];
        apply.addEventListener('click', e => {
            syncLetterDraft();
            const invalid = required.map(id => document.getElementById(id)).filter(el => !el.value.trim());
            required.forEach(id => document.getElementById(id).setAttribute('aria-invalid', String(!document.getElementById(id).value.trim())));
            if (invalid.length) {
                e.stopImmediatePropagation(); e.preventDefault(); error.hidden = false;
                error.textContent = 'Bạn hãy viết nội dung lá thư trước khi xem thử.';
                invalid[0].focus(); invalid[0].scrollIntoView({block:'center',behavior:'smooth'}); return;
            }
            const musicError = window.TeacherMusic?.validate();
            if (musicError) {
                e.stopImmediatePropagation(); e.preventDefault(); error.hidden = false;
                error.textContent = musicError;
                document.querySelector('#tdUploadTab[aria-selected="true"]') ? document.querySelector('.td-file-picker')?.focus() : document.getElementById('tdPresetTab')?.focus(); return;
            }
            error.hidden = true; previewReady = true;
            document.getElementById('musicPreviewAudio')?.pause();
        }, true);
        body.addEventListener('change', () => { previewReady = false; });
        body.addEventListener('input', e => {
            previewReady = false;
            error.hidden = true;
            if (e.target.matches('[aria-invalid]') && e.target.value.trim()) e.target.setAttribute('aria-invalid','false');
        });

        const dock = document.createElement('div');
        dock.id = 'tdActionDock';
        dock.innerHTML = '<button type="button" class="td-edit">✏️ Chỉnh sửa</button><button type="button" class="td-create">Tạo link thiệp →</button>';
        document.body.appendChild(dock);

        const checkout = document.createElement('div');
        checkout.id = 'tdCheckout';
        checkout.hidden = true;
        checkout.innerHTML = '<div class="td-checkout-card" role="dialog" aria-modal="true" aria-labelledby="tdCheckoutTitle"><div class="td-checkout-header"><div><small>BƯỚC CUỐI</small><h2 id="tdCheckoutTitle">Tạo thiệp của bạn</h2></div><button type="button" class="td-checkout-close" aria-label="Đóng">×</button></div><div class="td-checkout-body"><p class="td-checkout-intro">Đăng nhập để lưu thiệp vào tài khoản. Kiểm tra chi phí bên dưới trước khi tạo link.</p><div class="td-auth-slot"></div><div class="td-pricing-slot"></div><button type="button" class="td-back">← Quay lại chỉnh sửa</button></div></div>';
        document.body.appendChild(checkout);
        if (auth) checkout.querySelector('.td-auth-slot').appendChild(auth);
        checkout.querySelector('.td-pricing-slot').appendChild(pricing);
        const action = document.getElementById('actionButton');
        const toggle = document.getElementById('togglePricing');
        if (toggle) toggle.hidden = true;

        let populated = false;
        function formOpen() {
            closeTools();
            checkout.hidden = true;
            document.body.classList.remove('td-payment-flow');
            document.body.classList.add('td-form-phase');
            if (!populated) {
                settingsButton.click();
                draft.value = window.TeacherLetterDraft.compose(Object.fromEntries(['letterTitle', 'letterContent', 'letterSignature'].map(id => [id, letterFields[id].value])));
                syncLetterDraft();
                populated = true;
            }
            else modal.style.display = 'block';
            lines.value = originalSequence.value.split('|').join('\n');
            const body = modal.querySelector('.modal-body');
            if (body) body.scrollTop = 0;
        }
        function closeCheckout() {
            if (window.pricingCalculator?._isSubmitting) return;
            checkout.hidden = true;
            document.body.classList.remove('td-checkout-phase');
        }
        function openCheckout() {
            document.body.classList.remove('td-form-phase', 'td-payment-flow');
            document.body.classList.add('td-checkout-phase');
            checkout.hidden = false;
            window.pricingCalculator?.updatePricing();
            checkout.querySelector('.td-checkout-close').focus();
        }
        dock.querySelector('.td-edit').addEventListener('click', formOpen);
        dock.querySelector('.td-create').addEventListener('click', () => { if (previewReady) openCheckout(); else formOpen(); });
        checkout.querySelector('.td-back').addEventListener('click', function () { if (window.pricingCalculator?._isSubmitting) return; closeCheckout(); formOpen(); });
        checkout.querySelector('.td-checkout-close').addEventListener('click', closeCheckout);
        checkout.addEventListener('click', function (event) { if (event.target === checkout) closeCheckout(); });
        settingsButton.addEventListener('click', function () { document.body.classList.add('td-form-phase'); });
        if (action) action.addEventListener('click', function (e) {
            if (!window.getJwt?.()) {
                e.stopImmediatePropagation();
                checkout.querySelector('.td-checkout-intro').textContent = 'Bạn cần đăng nhập Google để tạo và lưu thiệp.';
                document.getElementById('googleLoginBtn')?.focus();
                return;
            }
            // Keep checkout visible until the order and payment URL are ready.
        }, true);
        new MutationObserver(function () {
            const open = modal.style.display === 'block';
            document.body.classList.toggle('td-form-phase', open);
        }).observe(modal, { attributes: true, attributeFilter: ['style'] });
        document.addEventListener('keydown', e => {
            const active = !checkout.hidden ? checkout : modal.style.display === 'block' ? modal : null;
            if (!active) return;
            if (e.key === 'Escape') { if (active === checkout) closeCheckout(); else close.click(); }
            if (e.key !== 'Tab') return;
            const focusable = [...active.querySelectorAll('button, input, select, textarea, a[href], summary, [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
            const first = focusable[0], last = focusable.at(-1);
            if (e.shiftKey && (document.activeElement === first || !active.contains(document.activeElement))) { e.preventDefault(); last?.focus(); }
            else if (!e.shiftKey && (document.activeElement === last || !active.contains(document.activeElement))) { e.preventDefault(); first?.focus(); }
        });
        formOpen();
        window.TeacherMusic.mount(music);
        syncTools();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
