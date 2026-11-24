/* Independent preset/upload drafts; only the selected source reaches preview and checkout. */
(function () {
    'use strict';
    let mounted = false, mode = 'preset', uploaded = '', uploadName = '', reading = false;
    let libraryStatus = 'loading', libraryUrls = new Set();
    window.TeacherMusic = {
        isLibraryMusic: value => libraryUrls.has(value),
        getValue: () => !mounted ? null : mode === 'file' ? uploaded : document.getElementById('backgroundMusic').value,
        validate: () => mode === 'file' && (reading || !uploaded) ? (reading ? 'Đang đọc file nhạc, bạn chờ một chút nhé.' : 'Bạn hãy chọn file nhạc hoặc chuyển sang Nhạc có sẵn.') : mode === 'preset' && (libraryStatus !== 'ready' || !document.getElementById('backgroundMusic')?.value) ? (libraryStatus === 'loading' ? 'Đang tải thư viện nhạc, bạn chờ một chút nhé.' : 'Bạn hãy tải lại thư viện nhạc hoặc chọn file riêng.') : '',
        mount(section) {
            if (mounted) return;
            const select = document.getElementById('backgroundMusic');
            const file = document.getElementById('audioFileInput');
            const data = document.getElementById('audioDataInput');
            const preview = document.getElementById('audioPreviewContainer');
            const audio = document.getElementById('musicPreviewAudio');
            const previewButton = document.getElementById('previewMusicButton');
            const presetPanel = select.closest('.form-group');
            const filePanel = file.closest('.form-group');
            presetPanel.id = 'tdPresetPanel'; filePanel.id = 'tdUploadPanel';
            const initialMusic = select.value;
            if (initialMusic.startsWith('data:')) { uploaded = initialMusic; uploadName = 'File nhạc đã chọn'; mode = 'file'; }
            select.replaceChildren();
            const tabs = document.createElement('div'); tabs.className = 'td-music-tabs';
            tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Nguồn nhạc nền');
            tabs.innerHTML = '<button type="button" id="tdPresetTab" role="tab" data-mode="preset" aria-controls="tdPresetPanel">♫ Nhạc có sẵn</button><button type="button" id="tdUploadTab" role="tab" data-mode="file" aria-controls="tdUploadPanel">↑ Tải nhạc lên</button>';
            presetPanel.before(tabs);
            for (const [panel, id] of [[presetPanel, 'tdPresetTab'], [filePanel, 'tdUploadTab']]) {
                panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', id);
            }
            const presetLabel = presetPanel.querySelector('label'); presetLabel.removeAttribute('data-i18n'); presetLabel.textContent = 'Chọn bài hát';
            select.hidden = true;
            presetLabel.removeAttribute('for');
            const libraryState = document.createElement('p'); libraryState.className = 'td-library-state'; libraryState.setAttribute('role', 'status');
            const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'td-library-retry'; retry.textContent = 'Thử tải lại'; retry.hidden = true;
            const grid = document.createElement('div'); grid.className = 'td-music-grid'; grid.id = 'tdMusicGrid'; grid.setAttribute('aria-label', 'Danh sách bài hát');
            const more = document.createElement('button'); more.type = 'button'; more.className = 'td-music-more'; more.hidden = true; more.setAttribute('aria-controls', grid.id);
            presetPanel.append(libraryState, retry, grid, more);
            let tracks = [], expanded = false;
            function renderLibrary() {
                grid.replaceChildren();
                const selected = tracks.find(track => track.url === select.value);
                const visible = expanded ? tracks : selected && tracks.indexOf(selected) >= 6 ? [selected, ...tracks.filter(track => track !== selected).slice(0, 5)] : tracks.slice(0, 6);
                for (const track of visible) {
                    const card = document.createElement('button'); card.type = 'button'; card.className = 'td-music-card';
                    card.setAttribute('aria-pressed', String(track.url === select.value));
                    card.title = track.name; card.setAttribute('aria-label', track.name);
                    const icon = document.createElement('span'); icon.className = 'td-track-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = track.url === select.value ? '✓' : '♫';
                    const title = document.createElement('span'); title.className = 'td-track-title'; title.textContent = track.name;
                    const duration = document.createElement('span'); duration.className = 'td-track-duration';
                    const seconds = Math.floor(Number(track.durationSec));
                    duration.textContent = seconds > 0 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'Nhạc có sẵn';
                    card.append(icon, title, duration);
                    card.addEventListener('click', () => { select.value = track.url; changed(); renderLibrary(); grid.querySelector('[aria-pressed="true"]')?.focus(); });
                    grid.appendChild(card);
                }
                grid.classList.toggle('td-expanded', expanded);
                more.hidden = tracks.length <= 6;
                more.textContent = expanded ? 'Thu gọn' : `Xem tất cả (${tracks.length} bài)`;
                more.setAttribute('aria-expanded', String(expanded));
                if (libraryStatus === 'ready') libraryState.textContent = selected ? `Đang chọn: ${selected.name}` : 'Chưa có bài hát trong thư viện.';
            }
            more.addEventListener('click', () => { expanded = !expanded; renderLibrary(); });
            async function loadLibrary() {
                libraryStatus = 'loading'; libraryState.textContent = 'Đang tải thư viện nhạc…'; retry.hidden = true;
                const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
                try {
                    const endpoint = ['localhost', '127.0.0.1'].includes(location.hostname) ? '/__local/music/teachersday' : `${window.API_BASE}/music/${window.TEMPLATE_TYPE || 'teachersday'}`;
                    const response = await fetch(endpoint, {signal: controller.signal});
                    const payload = await response.json();
                    if (!response.ok || !payload.success || !Array.isArray(payload.data?.items)) throw new Error('Invalid music catalog');
                    const seen = new Set();
                    tracks = payload.data.items.filter(track => {
                        if (!track || typeof track.name !== 'string' || typeof track.url !== 'string' || !/^https?:\/\//i.test(track.url) || seen.has(track.url)) return false;
                        seen.add(track.url); return true;
                    });
                    libraryUrls = new Set([...tracks.map(track => track.url), ...(Array.isArray(payload.data.systemMusicUrls) ? payload.data.systemMusicUrls.filter(url => typeof url === 'string') : [])]);
                    const previous = select.value || initialMusic;
                    select.replaceChildren(...tracks.map(track => { const option = document.createElement('option'); option.value = track.url; option.textContent = track.name; return option; }));
                    select.value = tracks.some(track => track.url === previous) ? previous : tracks[0]?.url || '';
                    libraryStatus = 'ready'; renderLibrary(); changed();
                } catch (error) {
                    libraryStatus = 'error'; libraryState.textContent = 'Chưa tải được thư viện nhạc. Bạn thử lại hoặc tải file riêng lên nhé.'; retry.hidden = false;
                } finally { clearTimeout(timeout); }
            }
            retry.addEventListener('click', loadLibrary);
            const fileLabel = filePanel.querySelector('label'); fileLabel.textContent = 'Chọn file âm thanh'; fileLabel.className = 'td-upload-label';
            file.hidden = true;
            const picker = document.createElement('button'); picker.type = 'button'; picker.className = 'td-file-picker'; picker.textContent = 'Chọn file từ thiết bị';
            picker.addEventListener('click', () => file.click());
            file.after(picker);
            const hint = document.createElement('p'); hint.className = 'td-music-hint'; hint.textContent = 'File âm thanh tối đa 10 MB.'; picker.after(hint);
            const message = document.createElement('p'); message.className = 'td-music-error'; message.setAttribute('role', 'alert'); message.hidden = true;
            preview.after(message);
            // Share playback controls, but resolve their source from the active tab.
            const playback = previewButton.closest('.music-preview-actions'); section.append(playback, audio);
            mounted = true;
            let generation = 0;
            function render() {
                presetPanel.hidden = mode !== 'preset'; filePanel.hidden = mode !== 'file';
                tabs.querySelectorAll('button').forEach(button => {
                    const selected = button.dataset.mode === mode;
                    button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
                });
                data.value = mode === 'file' ? uploaded : '';
                previewButton.disabled = reading && mode === 'file' || !window.TeacherMusic.getValue();
                picker.textContent = reading ? 'Đang đọc file…' : uploaded ? 'Đổi file nhạc' : 'Chọn file từ thiết bị';
                preview.replaceChildren();
                if (uploaded) {
                    const row = document.createElement('div'); row.className = 'td-selected-audio';
                    const name = document.createElement('span'); name.textContent = uploadName;
                    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Xóa file';
                    remove.addEventListener('click', () => { generation++; uploaded = ''; uploadName = ''; reading = false; file.value = ''; changed(); });
                    row.append(name, remove); preview.appendChild(row);
                }
            }
            function changed() {
                audio.pause(); render();
                select.dispatchEvent(new Event('change', {bubbles: true}));
                section.dispatchEvent(new Event('input', {bubbles: true}));
                if (typeof updatePricingFromModal === 'function') updatePricingFromModal();
            }
            tabs.addEventListener('click', event => {
                const button = event.target.closest('[data-mode]'); if (!button) return;
                mode = button.dataset.mode; message.hidden = true; changed();
            });
            tabs.addEventListener('keydown', event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const target = event.key === 'Home' ? 'preset' : event.key === 'End' ? 'file' : mode === 'preset' ? 'file' : 'preset';
                const button = tabs.querySelector(`[data-mode="${target}"]`); button.click(); button.focus();
            });
            select.addEventListener('change', () => { audio.pause(); previewButton.disabled = Boolean(window.TeacherMusic.validate()) || !window.TeacherMusic.getValue(); });
            file.addEventListener('change', () => {
                const selected = file.files[0]; if (!selected) return;
                const token = ++generation;
                message.hidden = true;
                if (!selected.type.startsWith('audio/') || selected.size > 10 * 1024 * 1024) {
                    reading = false; file.value = '';
                    message.textContent = selected.size > 10 * 1024 * 1024 ? 'File vượt quá 10 MB. Bạn hãy chọn file nhỏ hơn.' : 'Bạn hãy chọn một file âm thanh.';
                    message.hidden = false; changed(); return;
                }
                reading = true; changed();
                const reader = new FileReader();
                reader.onload = () => {
                    if (token !== generation) return;
                    uploaded = reader.result; uploadName = selected.name; reading = false; changed();
                };
                reader.onerror = () => {
                    if (token !== generation) return;
                    reading = false; message.textContent = 'Không đọc được file. Bạn thử chọn lại nhé.'; message.hidden = false; changed();
                };
                reader.readAsDataURL(selected);
            });
            render();
            loadLibrary();
        }
    };
})();
