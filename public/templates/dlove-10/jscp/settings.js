// All preview/save/pricing paths use the active source, never a hidden upload.
function getSelectedMusic() {
    const chosen = window.TeacherMusic?.getValue();
    if (chosen !== null && chosen !== undefined) return chosen;
    return document.getElementById('audioDataInput')?.value || document.getElementById('backgroundMusic')?.value || '';
}

const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.querySelector('.close');
const applySettingsButton = document.getElementById('applySettings');
let settings = {
    music: './music/nhacnenfree.mp3',
    fontStyle: 'default',
    countdown: 3,
    matrixText: 'HAPPY',
    matrixColor1: '#ff69b4', // Màu pink mẫu
    matrixColor2: '#ff1493', // Màu pink mẫu
    sequence: 'HAPPY|TEACHER\'S|DAY|20/11',
    sequenceColor: '#ff69b4', // Màu pink mẫu
    isSave: false,
    letterTitle: 'Thầy cô thân mến!',
    letterContent: `Cảm ơn thầy cô vì đã luôn là ngọn hải đăng soi sáng, dẫn đường và truyền cảm hứng cho em luôn nỗ lực trong học tập cũng như cuộc sống hàng ngày. 
    Nhân dịp 20/11 chúng em cũng không biết nói gì hơn ngoài lời cảm ơn sâu sắc đến thầy cô`,
    letterSignature: 'cảm ơn thầy cô ❤️',
    envelopeText: 'Happy\n Teacher\'s\n Day!',
    photos: [
        './image/z6742427403891_49b13d2c6cf180587fee8dc730dfbae1.jpg',
        './image/z6742427412545_e15564300676cfbf93577dbb6e1af325.jpg',
        './image/z6742427461367_48fa789a498f3e3311cb6afe1d4bdd45.jpg'
    ],
};

// Biến global để lưu trạng thái checkbox isSave
window.lastIsSaveState = false;

// ════════════════════════════════════════════════════════════════════════
// V2 Wave 5 — Dynamic pricing UI (teachersday / 20-11)
// ════════════════════════════════════════════════════════════════════════
function _tdCurrency() {
    const checked = document.querySelector('input[name="paymentMethod"]:checked');
    return checked && checked.value === 'POLAR' ? 'USD' : 'VND';
}

function _tdFormatPrice(amount, currency) {
    if (!amount) return null;
    if (currency === 'USD') {
        const n = Number(amount) || 0;
        return '$' + n.toFixed(2).replace(/\.00$/, '');
    }
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function refreshTdPricingUI() {
    const pricing = window.__tdServerPricing;
    const currency = _tdCurrency();

    // Gallery section title
    const photosTitle = document.getElementById('photosSectionTitle');
    if (photosTitle) {
        const photosCfg = pricing?.features?.photos;
        const photosPrice = photosCfg
            ? (currency === 'USD' ? (photosCfg.priceUsd ?? 0) : (photosCfg.price ?? 0))
            : FALLBACK_TD_PHOTOS_VND;
        const extra = photosCfg ? (currency === 'USD' ? (photosCfg.perExtraUsd ?? 0) : (photosCfg.perExtra ?? 0)) : 5000;
        photosTitle.textContent = `🖼️ Ảnh bay (tối đa 15 ảnh)`;
        let tiers = document.getElementById('tdPhotoTierPrices');
        if (!tiers) { tiers = document.createElement('p'); tiers.id = 'tdPhotoTierPrices'; tiers.className = 'td-music-hint'; photosTitle.after(tiers); }
        tiers.textContent = `1–10 ảnh: +${_tdFormatPrice(photosPrice, currency) || '0đ'} · 11–15 ảnh: +${_tdFormatPrice(photosPrice + extra, currency) || '0đ'}`;
    }

    // Save forever checkbox label
    const saveLabel = document.getElementById('saveForeverPriceLabel');
    if (saveLabel) {
        const foreverCfg = pricing?.expiration?.forever;
        const foreverPrice = foreverCfg
            ? (currency === 'USD' ? (foreverCfg.priceUsd ?? 0) : (foreverCfg.price ?? 0))
            : FALLBACK_TD_FOREVER_VND;
        if (foreverPrice) {
            saveLabel.textContent = `(+${_tdFormatPrice(foreverPrice, currency)})`;
            saveLabel.style.display = '';
        } else {
            saveLabel.textContent = '';
            saveLabel.style.display = 'none';
        }
    }
}
const FALLBACK_TD_PHOTOS_VND  = 15000;
const FALLBACK_TD_FOREVER_VND = 30000;

if (typeof window !== 'undefined') {
    window.refreshTdPricingUI = refreshTdPricingUI;
}

window.addEventListener('td:pricing-loaded', () => refreshTdPricingUI());
document.addEventListener('change', (e) => {
    if (e.target && e.target.name === 'paymentMethod') refreshTdPricingUI();
});
document.addEventListener('DOMContentLoaded', () => refreshTdPricingUI());

const musicOptions = [
    { value: './music/nhacnenfree.mp3', label: 'Nhạc nền miễn phí (Mặc định)' },
    { value: './music/happy-birthday.mp3', label: 'Happy Birthday (Miễn phí)' },
    { value: './music/happybirthday_domixi.mp3', label: 'Happy Birthday (Độ Mixi)' },
    { value: './music/happybirtday_uia.mp3', label: 'Happy Birthday (Mèo UIA)' },
    { value: './music/happybirthday.mp3', label: 'Happy Birthday (Piano)' },
    { value: './music/postcardnam.mp3', label: 'Podcast chúc mừng (Giọng nam)' },
    { value: './music/podcardnu.mp3', label: 'Podcast chúc mừng (Giọng nữ)' },
    { value: './music/anhnangcuaanh.mp3', label: 'Ánh nắng của anh' },
    { value: './music/buiphan.mp3', label: 'Bụi phấn' },
    { value: './music/buocnhevaotimanh.mp3', label: 'Bước nhẹ vào tim anh' },
    { value: './music/codoidieu.mp3', label: 'Có đôi điều' },
    { value: './music/coem.mp3', label: 'Có em' },
    { value: './music/denbenanh.mp3', label: 'Đến bên anh' },
    { value: './music/dunglamtraitimanhdau.mp3', label: 'Đừng làm trái tim anh đau' },
    { value: './music/emlacogiaovungcao.mp3', label: 'Em là cô giáo vùng cao' },
    { value: './music/emlacogiaovungcaoremix.mp3', label: 'Em là cô giáo vùng cao (Remix)' },
    { value: './music/emnay.mp3', label: 'Em này' },
    { value: './music/givemeyourforever.mp3', label: 'Give Me Your Forever' },
    { value: './music/lambantraianhe.mp3', label: 'Làm bạn trai anh nhé' },
    { value: './music/lathuguithay.mp3', label: 'Lá thư gửi thầy' },
    { value: './music/loithayco.mp3', label: 'Lời thầy cô' },
    { value: './music/minhcungnhaudongbang.mp3', label: 'Mình cùng nhau đóng băng' },
    { value: './music/motdoi.mp3', label: 'Một đời' },
    { value: './music/music.mp3', label: 'Nhạc nền ngẫu nhiên' },
    { value: './music/neunhucohaitraitim.mp3', label: 'Nếu như có hai trái tim' },
    { value: './music/ngayxuaay.mp3', label: 'Ngày xưa ấy' },
    { value: './music/nguoidautien.mp3', label: 'Người đầu tiên' },
    { value: './music/nguoigieomamxanh.mp3', label: 'Người gieo mầm xanh' },
    { value: './music/nguoithay.mp3', label: 'Người thầy' },
    { value: './music/Như 1 vì tinh tú.mp3', label: 'Như một vì tinh tú' },
    { value: './music/perfect.mp3', label: 'Perfect' },
    { value: './music/phepmau.mp3', label: 'Phép màu' },
    { value: './music/suynghitronganh.mp3', label: 'Suy nghĩ trong anh' },
    { value: './music/tinhyeudieuky.mp3', label: 'Tình yêu diệu kỳ' },
    { value: './music/trentinhbanduoitinhyeu.mp3', label: 'Trên tình bạn dưới tình yêu' },
    { value: './music/tungngayyeuem.mp3', label: 'Từng ngày yêu em' },
    { value: './music/yeuemratnhieu.mp3', label: 'Yêu em rất nhiều' },
    { value: './music/coemcho.mp3', label: 'Có em cho' },
    { value: './music/untilyou.mp3', label: 'Until You' }
];

// Định nghĩa các mẫu màu sẵn (chỉ 3 mẫu + tùy chỉnh)
const colorThemes = {
    pink: {
        matrixColor1: '#ff69b4',
        matrixColor2: '#ff1493',
        sequenceColor: '#ff69b4',
        name: 'Hồng ngọt ngào'
    },
    blue: {
        matrixColor1: '#87ceeb',
        matrixColor2: '#4169e1',
        sequenceColor: '#1e90ff',
        name: 'Xanh dương mát mẻ'
    },
    purple: {
        matrixColor1: '#dda0dd',
        matrixColor2: '#9370db',
        sequenceColor: '#8a2be2',
        name: 'Tím mộng mơ'
    },
    custom: {
        matrixColor1: '#ffb6c1',
        matrixColor2: '#ffc0cb',
        sequenceColor: '#d39b9b',
        name: 'Tùy chỉnh màu'
    }
};

// Tạo hàm reset chung có thể tái sử dụng
function resetWebsiteState() {

    // Reset website state
    const canvas = document.querySelector('.canvas');
    const matrixCanvas = document.getElementById('matrix-rain');
    const contentDisplay = document.getElementById('contentDisplay');
    const fireworkContainer = document.getElementById('fireworkContainer');
    const birthdayAudio = document.getElementById('birthdayAudio');

    const envelope = document.getElementById('envelopeContainer');
    if (envelope) envelope.style.display = 'none';
    const letter = document.querySelector('.wrapperLetterForm');
    if (letter) letter.style.display = 'none';
    const gallery = document.getElementById('photoGallery');
    if (gallery) gallery.style.display = 'none';
    // Ẩn sao khi reset
    if (typeof hideStars === 'function') {
        hideStars();
    }

    if (contentDisplay) {
        contentDisplay.classList.remove('show');
    }
    if (fireworkContainer) {
        fireworkContainer.style.display = 'none';
        fireworkContainer.style.opacity = '0';
        fireworkContainer.innerHTML = '';
    }

    // Reset canvas visibility
    if (canvas) {
        canvas.style.display = 'block';
    }
    if (matrixCanvas) {
        matrixCanvas.style.display = 'block';
    }

    window.TeacherText?.refresh();

    // Apply music settings
    if (birthdayAudio && window.settings) {
        birthdayAudio.src = window.settings.music;
        if (typeof isPlaying !== 'undefined' && isPlaying) {
            birthdayAudio.play().catch(error => {
            });
        }
    }

    // Reset and restart matrix rain với màu mới
    if (window.settings && typeof matrixChars !== 'undefined') {
        matrixChars = window.settings.matrixText.split('');

        if (typeof matrixInterval !== 'undefined' && matrixInterval) {
            clearInterval(matrixInterval);
            matrixInterval = null;
            if (matrixCanvas) {
                const matrixCtx = matrixCanvas.getContext('2d');
                matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
            }
        }
        if (typeof initMatrixRain === 'function') {
            initMatrixRain();
        }
    }

    // Reset and restart the sequence với màu mới
    if (typeof S !== 'undefined' && S.UI && window.settings) {
        const sequence = `|#countdown ${window.settings.countdown}|${window.settings.sequence}|`;
        S.UI.simulate(sequence);
    }

    // Cập nhật gallery ảnh nếu có (từ array)
    updatePhotoGallery(window.settings?.photos || []);

}

// Hàm cập nhật gallery ảnh bay (tạo động)
function updatePhotoGallery(photosArray) {
    const photoGallery = document.getElementById('photoGallery');
    if (photoGallery) window.TeacherPhotoGallery.render(photoGallery, photosArray);
}

// Export function để sử dụng từ index.html
window.updatePhotoGallery = updatePhotoGallery;

// Function để khởi tạo default settings
function initializeDefaultSettings() {

    window.settings = {
        music: './music/nhacnenfree.mp3',
        fontStyle: 'default',
        countdown: 3,
        matrixText: 'HAPPY',
        matrixColor1: '#ff69b4', // Màu pink mẫu
        matrixColor2: '#ff1493', // Màu pink mẫu
        sequence: 'HAPPY|TEACHER\'S|DAY|20/11',
        sequenceColor: '#ff69b4', // Màu pink mẫu
        isSave: false,  
        colorTheme: 'pink',
        letterTitle: '',
        letterContent: ``,
        letterSignature: '',
        envelopeText: '',
        photos: [],
    };
}


// Function để apply settings đã load
function applyLoadedSettings() {
    const settings = window.settings;
    window.TeacherText?.refresh();

    // Apply music settings
    const birthdayAudio = document.getElementById('birthdayAudio');
    if (birthdayAudio) {
        birthdayAudio.src = settings.music;
    }


    // Playback starts only after settings and orientation are both ready.
    matrixChars = settings.matrixText.split('');

}

settingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'block';
    populateModal();
});

closeModal.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

// Sửa lại hàm populateModal
function populateModal() {
    // Đồng bộ settings local với window.settings nếu có
    if (window.settings) {
        settings = { ...settings, ...window.settings };
    }
    
    const musicSelect = document.getElementById('backgroundMusic');
    musicSelect.innerHTML = musicOptions.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
    
    // Nếu music là URL từ R2 hoặc base64 (không có trong musicOptions), thêm vào select
    if (settings.music && !musicOptions.find(opt => opt.value === settings.music)) {
        const customOption = document.createElement('option');
        customOption.value = settings.music;
        if (settings.music.startsWith('data:')) {
            customOption.textContent = `🎵 File đã chọn (Chưa upload)`;
        } else {
            customOption.textContent = `🎵 File đã upload`;
        }
        musicSelect.appendChild(customOption);
    }
    
    musicSelect.value = settings.music;
    musicSelect.dispatchEvent(new Event('change'));
    
    // Nếu music là base64, hiển thị preview
    const audioDataInput = document.getElementById('audioDataInput');
    const audioPreviewContainer = document.getElementById('audioPreviewContainer');
    if (settings.music && settings.music.startsWith('data:') && audioDataInput && audioPreviewContainer) {
        audioDataInput.value = settings.music;
        audioPreviewContainer.innerHTML = `
            <div style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">🎵</span>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 5px;">File đã chọn</div>
                        <div style="font-size: 12px; color: #666;">Sẽ upload khi tạo website</div>
                    </div>
                    <button type="button" id="removeAudioBtn" style="
                        background: #f44336;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 5px 10px;
                        cursor: pointer;
                        font-size: 12px;
                    ">Xóa</button>
                </div>
            </div>
        `;
        
        // Event listener cho nút xóa
        const removeBtn = document.getElementById('removeAudioBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                audioPreviewContainer.innerHTML = '';
                audioDataInput.value = '';
                const audioFileInput = document.getElementById('audioFileInput');
                if (audioFileInput) audioFileInput.value = '';
                // Xóa option khỏi select
                const optionToRemove = Array.from(musicSelect.options).find(opt => opt.value === settings.music && opt.value.startsWith('data:'));
                if (optionToRemove) {
                    optionToRemove.remove();
                }
                // Reset về option đầu tiên
                if (musicSelect.options.length > 0) {
                    musicSelect.value = musicSelect.options[0].value;
                    settings.music = musicSelect.value;
                    if (window.settings) window.settings.music = musicSelect.value;
                    musicSelect.dispatchEvent(new Event('change'));
                }
            });
        }
    } else {
        // Reset preview nếu không có base64
        if (audioPreviewContainer) audioPreviewContainer.innerHTML = '';
        if (audioDataInput) audioDataInput.value = '';
    }

    const countdownSelect = document.getElementById('countdownTime');
    countdownSelect.value = settings.countdown;

    const isSaveCheckbox = document.getElementById('isSave');
    if (isSaveCheckbox) {
        const savedState = window.lastIsSaveState !== undefined ? window.lastIsSaveState : settings.isSave;
        isSaveCheckbox.checked = savedState;
    }

    const matrixTextInput = document.getElementById('matrixText');
    matrixTextInput.value = settings.matrixText;

    const matrixColor1Input = document.getElementById('matrixColor1');
    matrixColor1Input.value = settings.matrixColor1;

    const matrixColor2Input = document.getElementById('matrixColor2');
    matrixColor2Input.value = settings.matrixColor2;

    const sequenceInput = document.getElementById('sequenceText');
    sequenceInput.value = settings.sequence;

    const sequenceColorInput = document.getElementById('sequenceColor');
    sequenceColorInput.value = settings.sequenceColor;

    // Sử dụng colorTheme đã lưu thay vì detect
    const currentTheme = settings.colorTheme || detectCurrentColorTheme();
    
    // Thêm event listener cho các nút màu
    const colorButtons = document.querySelectorAll('.color-theme-btn');
    colorButtons.forEach(button => {
        button.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            handleColorThemeChange(theme);
        });
    });
    
    // Khởi tạo với mẫu màu hiện tại
    handleColorThemeChange(currentTheme);

    // Thêm custom color listeners
    addCustomColorListeners();

    // Thêm sự kiện input để cập nhật màu preview
    matrixColor1Input.addEventListener('input', () => {
        const matrixColor1Preview = document.getElementById('matrixColor1Preview');
        if (matrixColor1Preview) {
            matrixColor1Preview.style.backgroundColor = matrixColor1Input.value;
        }
    });

    matrixColor2Input.addEventListener('input', () => {
        const matrixColor2Preview = document.getElementById('matrixColor2Preview');
        if (matrixColor2Preview) {
            matrixColor2Preview.style.backgroundColor = matrixColor2Input.value;
        }
    });

    sequenceColorInput.addEventListener('input', () => {
        const sequenceColorPreview = document.getElementById('sequenceColorPreview');
        if (sequenceColorPreview) {
            sequenceColorPreview.style.backgroundColor = sequenceColorInput.value;
        }
    });

    // Cài đặt lá thư
    // Logic: Luôn ưu tiên window.settings nếu có (kể cả empty string - đã áp dụng settings)
    // Chỉ để trống khi window.settings không có trường đó (undefined) và không có websiteId (lần đầu)
    const websiteId = window.birthdayAPI?.getWebsiteIdFromURL();
    
    const letterTitleInput = document.getElementById('letterTitle');
    if (letterTitleInput) {
        // Nếu window.settings có trường này (kể cả empty string) → dùng nó
        // Nếu không có websiteId và window.settings không có trường này → để trống (lần đầu)
        if (window.settings && 'letterTitle' in window.settings) {
            letterTitleInput.value = window.settings.letterTitle || '';
        } else if (!websiteId) {
            letterTitleInput.value = ''; // Chỉ để trống khi thực sự chưa có dữ liệu (lần đầu)
        } else {
            letterTitleInput.value = settings.letterTitle || '';
        }
        // Reset border color khi user nhập
        letterTitleInput.addEventListener('input', function() {
            if (this.value.trim()) {
                this.style.borderColor = '';
            }
        });
    }

    const letterContentInput = document.getElementById('letterContent');
    if (letterContentInput) {
        if (window.settings && 'letterContent' in window.settings) {
            letterContentInput.value = window.settings.letterContent || '';
        } else if (!websiteId) {
            letterContentInput.value = ''; // Chỉ để trống khi thực sự chưa có dữ liệu (lần đầu)
        } else {
            letterContentInput.value = settings.letterContent || '';
        }
        // Reset border color khi user nhập
        letterContentInput.addEventListener('input', function() {
            if (this.value.trim()) {
                this.style.borderColor = '';
            }
        });
    }

    const letterSignatureInput = document.getElementById('letterSignature');
    if (letterSignatureInput) {
        if (window.settings && 'letterSignature' in window.settings) {
            letterSignatureInput.value = window.settings.letterSignature || '';
        } else if (!websiteId) {
            letterSignatureInput.value = ''; // Chỉ để trống khi thực sự chưa có dữ liệu (lần đầu)
        } else {
            letterSignatureInput.value = settings.letterSignature || '';
        }
        // Reset border color khi user nhập
        letterSignatureInput.addEventListener('input', function() {
            if (this.value.trim()) {
                this.style.borderColor = '';
            }
        });
    }

    const envelopeTextInput = document.getElementById('envelopeText');
    if (envelopeTextInput) {
        if (window.settings && 'envelopeText' in window.settings) {
            envelopeTextInput.value = window.settings.envelopeText || '';
        } else if (!websiteId) {
            envelopeTextInput.value = ''; // Chỉ để trống khi thực sự chưa có dữ liệu (lần đầu)
        } else {
            envelopeTextInput.value = settings.envelopeText || '';
        }
        // Reset border color khi user nhập
        envelopeTextInput.addEventListener('input', function() {
            if (this.value.trim()) {
                this.style.borderColor = '';
            }
        });
    }

    // Cài đặt gallery ảnh - render ảnh động từ array
    // Nếu window.settings có photos (kể cả mảng rỗng) → dùng nó
    // Nếu không có websiteId và window.settings không có photos → để trống (lần đầu)
    let photosToRender = [];
    if (window.settings && 'photos' in window.settings) {
        photosToRender = window.settings.photos || [];
    } else if (!websiteId) {
        photosToRender = []; // Chỉ để trống khi thực sự chưa có dữ liệu (lần đầu)
    } else {
        photosToRender = settings.photos || [];
    }
    renderPhotoGallerySettings(photosToRender);

    if (window.pricingCalculator) {
        window.pricingCalculator.updateFromSettings(settings);
    }

    const fieldsToWatch = [
        'backgroundMusic'
    ];

    fieldsToWatch.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('change', function () {
                updatePricingFromModal();
            });
        }
    });

    // Thêm event listener riêng cho checkbox isSave
    const isSaveField = document.getElementById('isSave');
    if (isSaveField) {
        isSaveField.addEventListener('change', function () {
            // Lưu trạng thái mới nhất
            window.lastIsSaveState = this.checked;
            updatePricingFromModal();
            updateExpireDateDisplay();
        });
    }

    // Cập nhật giá khi populate modal
    if (typeof refreshTdPricingUI === 'function') refreshTdPricingUI();
    updatePricingFromModal();
    updateExpireDateDisplay();

    // Fix space input issue
    const allInputs = document.querySelectorAll('.modal-content input[type="text"], .modal-content textarea');
    allInputs.forEach(input => {
        input.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.code === 'Space') {
                e.stopPropagation();
                return true;
            }
        });

        input.addEventListener('input', function (e) {
            e.stopPropagation();
        });
    });
}


// Sửa lại hàm handleColorThemeChange để lưu theme được chọn
function handleColorThemeChange(selectedTheme) {
    const matrixColor1Input = document.getElementById('matrixColor1');
    const matrixColor2Input = document.getElementById('matrixColor2');
    const sequenceColorInput = document.getElementById('sequenceColor');
    const customColorSection = document.getElementById('customColorSection');
    const sequenceColorSection = document.getElementById('sequenceColorSection');
    
    // Lưu theme được chọn vào settings
    settings.colorTheme = selectedTheme;
    
    // Cập nhật trạng thái active của các nút
    const allButtons = document.querySelectorAll('.color-theme-btn');
    allButtons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = document.querySelector(`[data-theme="${selectedTheme}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Hiển thị/ẩn phần tùy chỉnh màu
    if (selectedTheme === 'custom') {
        customColorSection.style.display = 'flex';
        sequenceColorSection.style.display = 'block';
    } else {
        customColorSection.style.display = 'none';
        sequenceColorSection.style.display = 'none';
        
        // Chỉ cập nhật màu nếu không phải custom
        const theme = colorThemes[selectedTheme];
        if (theme && matrixColor1Input && matrixColor2Input && sequenceColorInput) {
            matrixColor1Input.value = theme.matrixColor1;
            matrixColor2Input.value = theme.matrixColor2;
            sequenceColorInput.value = theme.sequenceColor;
            
            // Cập nhật settings với màu mới
            settings.matrixColor1 = theme.matrixColor1;
            settings.matrixColor2 = theme.matrixColor2;
            settings.sequenceColor = theme.sequenceColor;
            
            // Trigger change event để cập nhật preview nếu có
            matrixColor1Input.dispatchEvent(new Event('input'));
            matrixColor2Input.dispatchEvent(new Event('input'));
            sequenceColorInput.dispatchEvent(new Event('input'));
        }
    }
}




// Thêm event listeners cho custom color inputs để tự động chuyển sang custom theme
function addCustomColorListeners() {
    const matrixColor1Input = document.getElementById('matrixColor1');
    const matrixColor2Input = document.getElementById('matrixColor2');
    const sequenceColorInput = document.getElementById('sequenceColor');
    
    if (matrixColor1Input) {
        matrixColor1Input.addEventListener('input', function() {
            // Chỉ cập nhật settings khi đang ở chế độ custom
            if (settings.colorTheme === 'custom') {
                settings.matrixColor1 = this.value;
                
                // Cập nhật preview nếu có
                const matrixColor1Preview = document.getElementById('matrixColor1Preview');
                if (matrixColor1Preview) {
                    matrixColor1Preview.style.backgroundColor = this.value;
                }
            }
        });
    }
    
    if (matrixColor2Input) {
        matrixColor2Input.addEventListener('input', function() {
            if (settings.colorTheme === 'custom') {
                settings.matrixColor2 = this.value;
                
                const matrixColor2Preview = document.getElementById('matrixColor2Preview');
                if (matrixColor2Preview) {
                    matrixColor2Preview.style.backgroundColor = this.value;
                }
            }
        });
    }
    
    if (sequenceColorInput) {
        sequenceColorInput.addEventListener('input', function() {
            if (settings.colorTheme === 'custom') {
                settings.sequenceColor = this.value;
                
                const sequenceColorPreview = document.getElementById('sequenceColorPreview');
                if (sequenceColorPreview) {
                    sequenceColorPreview.style.backgroundColor = this.value;
                }
            }
        });
    }
}

// Sửa lại hàm detectCurrentColorTheme để ưu tiên colorTheme đã lưu
function detectCurrentColorTheme() {
    // Nếu đã có colorTheme được lưu, sử dụng nó
    if (settings.colorTheme) {
        return settings.colorTheme;
    }
    
    const matrixColor1Input = document.getElementById('matrixColor1');
    const matrixColor2Input = document.getElementById('matrixColor2');
    const sequenceColorInput = document.getElementById('sequenceColor');
    
    if (matrixColor1Input && matrixColor2Input && sequenceColorInput) {
        const currentMatrix1 = matrixColor1Input.value;
        const currentMatrix2 = matrixColor2Input.value;
        const currentSequence = sequenceColorInput.value;
        
        // Tìm mẫu màu phù hợp nhất (bao gồm cả custom)
        for (const [themeKey, theme] of Object.entries(colorThemes)) {
            if (theme.matrixColor1 === currentMatrix1 && 
                theme.matrixColor2 === currentMatrix2 && 
                theme.sequenceColor === currentSequence) {
                return themeKey;
            }
        }
    }
    
    // Mặc định trả về pink nếu không tìm thấy
    return 'pink';
}

// Hàm render gallery ảnh settings (dynamic)
function renderPhotoGallerySettings(photosArray) {
    const photoGallerySettings = document.getElementById('photoGallerySettings');
    const photoFileInput = document.getElementById('photoFileInput');
    
    if (!photoGallerySettings || !photoFileInput) return;

    // Xóa nội dung cũ
    photoGallerySettings.innerHTML = '';

    // Render preview từng ảnh
    (photosArray || []).forEach((photoUrl, index) => {
        const photoItem = createPhotoPreviewItem(index, photoUrl);
        photoGallerySettings.appendChild(photoItem);
    });

    // Setup event cho file input - chọn nhiều ảnh cùng lúc
    photoFileInput.onchange = function(e) {
        const files = Array.from(e.target.files);
        const maxPhotos = 15;
        
        // Giới hạn số lượng ảnh
        const filesToProcess = files.slice(0, maxPhotos);
        
        if (files.length > maxPhotos) {
            alert(`Bạn đã chọn ${files.length} ảnh. Chỉ ${maxPhotos} ảnh đầu tiên sẽ được sử dụng.`);
        }
        
        // Xóa preview cũ
        photoGallerySettings.innerHTML = '';
        
        // Xử lý từng file - chuyển thành base64 (chưa upload)
        let processedCount = 0;
        filesToProcess.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64 = e.target.result;
                const photoItem = createPhotoPreviewItem(processedCount, base64);
                photoGallerySettings.appendChild(photoItem);
                processedCount++;
                if (processedCount === filesToProcess.length) {
                    updatePricingFromModal();
                }
            };
            reader.readAsDataURL(file);
        });
    };
}

// Hàm tạo một photo preview item (chỉ preview, không có input file)
function createPhotoPreviewItem(index, photoUrl) {
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    photoItem.dataset.index = index;

    photoItem.innerHTML = `
        <div class="form-group">
            <div class="photo-preview">
                <img class="photo-preview-img" data-index="${index}" src="${photoUrl}" alt="Preview ${index + 1}">
                <button type="button" class="remove-photo-btn" data-index="${index}" title="Xóa ảnh">×</button>
            </div>
            <input type="hidden" class="photo-data-input" data-index="${index}" value="${photoUrl}">
        </div>
    `;

    // Setup event cho nút xóa
    const removeBtn = photoItem.querySelector('.remove-photo-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            removePhotoItem(index);
        });
    }

    return photoItem;
}

// Hàm thêm photo preview item mới (không cần nữa vì dùng multiple file input)

// Hàm xóa photo item
function removePhotoItem(index) {
    const photoGallerySettings = document.getElementById('photoGallerySettings');
    if (!photoGallerySettings) return;

    const photoItem = photoGallerySettings.querySelector(`.photo-item[data-index="${index}"]`);
    if (photoItem) {
        photoItem.remove();
        
        // Reindex tất cả các items
        const allItems = photoGallerySettings.querySelectorAll('.photo-item');
        allItems.forEach((item, newIndex) => {
            item.dataset.index = newIndex;
            const label = item.querySelector('label');
            if (label) label.textContent = `Ảnh ${newIndex + 1}:`;
            
            const previewImg = item.querySelector('.photo-preview-img');
            const dataInput = item.querySelector('.photo-data-input');
            const removeBtn = item.querySelector('.remove-photo-btn');
            
            if (previewImg) previewImg.dataset.index = newIndex;
            if (dataInput) dataInput.dataset.index = newIndex;
            if (removeBtn) {
                removeBtn.dataset.index = newIndex;
                removeBtn.onclick = function() {
                    removePhotoItem(newIndex);
                };
            }
        });
        updatePricingFromModal();
    }
}

function saveFormDataToSettings() {
    try {
        // Lưu các settings cơ bản
        settings.music = getSelectedMusic();

        const countdownSelect = document.getElementById('countdownTime');
        if (countdownSelect) settings.countdown = parseInt(countdownSelect.value) || 3;

        const isSaveCheckbox = document.getElementById('isSave');
        if (isSaveCheckbox) settings.isSave = isSaveCheckbox.checked;

        const matrixTextInput = document.getElementById('matrixText');
        if (matrixTextInput) settings.matrixText = matrixTextInput.value;

        const matrixColor1Input = document.getElementById('matrixColor1');
        if (matrixColor1Input) settings.matrixColor1 = matrixColor1Input.value;

        const matrixColor2Input = document.getElementById('matrixColor2');
        if (matrixColor2Input) settings.matrixColor2 = matrixColor2Input.value;

        const sequenceInput = document.getElementById('sequenceText');
        if (sequenceInput) settings.sequence = sequenceInput.value;

        const sequenceColorInput = document.getElementById('sequenceColor');
        if (sequenceColorInput) settings.sequenceColor = sequenceColorInput.value;

        // Lưu cài đặt lá thư
        const letterTitleInput = document.getElementById('letterTitle');
        if (letterTitleInput) settings.letterTitle = letterTitleInput.value;

        const letterContentInput = document.getElementById('letterContent');
        if (letterContentInput) settings.letterContent = letterContentInput.value;

        const letterSignatureInput = document.getElementById('letterSignature');
        if (letterSignatureInput) settings.letterSignature = letterSignatureInput.value;

        const envelopeTextInput = document.getElementById('envelopeText');
        if (envelopeTextInput) settings.envelopeText = envelopeTextInput.value;

        // Lưu cài đặt gallery ảnh từ array (lấy từ hidden inputs)
        const photoGallerySettings = document.getElementById('photoGallerySettings');
        const photosArray = [];
        if (photoGallerySettings) {
            const photoDataInputs = photoGallerySettings.querySelectorAll('.photo-data-input');
            photoDataInputs.forEach(input => {
                if (input.value) {
                    photosArray.push(input.value);
                }
            });
        }
        settings.photos = photosArray;

        // Lưu mẫu màu đã chọn
        const activeButton = document.querySelector('.color-theme-btn.active');
        if (activeButton) {
            settings.colorTheme = activeButton.getAttribute('data-theme');
        }

    } catch (error) {
        console.error('Error saving form data:', error);
    }
}

// Hàm cập nhật giá từ modal
function updatePricingFromModal() {
    if (!window.pricingCalculator) return;
    const photoGallerySettings = document.getElementById('photoGallerySettings');
    const photosArray = [];
    if (photoGallerySettings) {
        photoGallerySettings.querySelectorAll('.photo-data-input').forEach(input => {
            if (input.value) photosArray.push(input.value);
        });
    }
    const musicValue = getSelectedMusic();

    window.pricingCalculator.updateFromSettings({
        music:  musicValue,
        isSave: document.getElementById('isSave')?.checked || false,
        photos: photosArray,
    });
}

// Hàm cập nhật hiển thị hạn sử dụng
function updateExpireDateDisplay() {
    const isSaveCheckbox = document.getElementById('isSave');
    const expireDateElement = document.getElementById('expireDate');
    const expireContainer = expireDateElement?.parentElement;
    
    if (isSaveCheckbox && expireDateElement && expireContainer) {
        if (isSaveCheckbox.checked) {
            expireDateElement.textContent = t('saveForever');
            expireDateElement.style.color = '#4caf50'; // Màu xanh lá
            expireContainer.innerHTML = `⏳ ${t('expireText')} <b id="expireDate" style="color: #4caf50;">${t('saveForever')}</b>`;
        } else {
            expireDateElement.textContent = t('fifteenDays') || t('thirtyDays') || '15 ngày';
            expireDateElement.style.color = '';
            expireContainer.innerHTML = `⏳ ${t('expireText')} <b id="expireDate">${t('fifteenDays') || t('thirtyDays') || '15 ngày'}</b>`;
        }
    }
}


// Xử lý chọn audio file (giống như ảnh - chuyển thành base64)
function setupAudioUpload() {
    if (window.TeacherMusic) return;
    const audioFileInput = document.getElementById('audioFileInput');
    const audioPreviewContainer = document.getElementById('audioPreviewContainer');
    const audioDataInput = document.getElementById('audioDataInput');
    const musicSelect = document.getElementById('backgroundMusic');

    if (!audioFileInput || !audioPreviewContainer || !audioDataInput || !musicSelect) {
        return;
    }

    audioFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (!file) {
            audioPreviewContainer.innerHTML = '';
            audioDataInput.value = '';
            return;
        }

        // Kiểm tra định dạng file
        if (!file.type.startsWith('audio/')) {
            alert('⚠️ File không phải là file âm thanh!');
            audioFileInput.value = '';
            return;
        }

        // Chuyển file thành base64 (giống như ảnh)
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            
            // Lưu base64 vào hidden input
            audioDataInput.value = base64;
            
            // Hiển thị preview
            audioPreviewContainer.innerHTML = `
                <div style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">🎵</span>
                        <div style="flex: 1;">
                            <div style="font-weight: bold; margin-bottom: 5px;">${file.name}</div>
                            <div style="font-size: 12px; color: #666;">File đã chọn (sẽ upload khi tạo website)</div>
                        </div>
                        <button type="button" id="removeAudioBtn" style="
                            background: #f44336;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            padding: 5px 10px;
                            cursor: pointer;
                            font-size: 12px;
                        ">Xóa</button>
                    </div>
                </div>
            `;

            // Thêm option mới vào select với base64 (tạm thời)
            const existingOption = Array.from(musicSelect.options).find(opt => opt.value === base64);
            if (!existingOption) {
                const newOption = document.createElement('option');
                newOption.value = base64;
                newOption.textContent = `🎵 ${file.name} (Chưa upload)`;
                musicSelect.appendChild(newOption);
                musicSelect.value = base64;
                musicSelect.dispatchEvent(new Event('change'));
            }
            updatePricingFromModal();

            // Event listener cho nút xóa
            const removeBtn = document.getElementById('removeAudioBtn');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    audioPreviewContainer.innerHTML = '';
                    audioDataInput.value = '';
                    audioFileInput.value = '';
                    // Xóa option khỏi select
                    const optionToRemove = Array.from(musicSelect.options).find(opt => opt.value === base64);
                    if (optionToRemove && optionToRemove.value.startsWith('data:')) {
                        optionToRemove.remove();
                    }
                    // Reset về option đầu tiên
                    if (musicSelect.options.length > 0) {
                        musicSelect.value = musicSelect.options[0].value;
                        musicSelect.dispatchEvent(new Event('change'));
                    }
                });
            }

        };
        reader.readAsDataURL(file);
    });
}

function setupMusicPreview() {
    const previewBtn = document.getElementById('previewMusicButton');
    const previewStatus = document.getElementById('previewMusicStatus');
    const previewAudio = document.getElementById('musicPreviewAudio');
    const musicSelect = document.getElementById('backgroundMusic');

    if (!previewBtn || !previewStatus || !previewAudio || !musicSelect) {
        return;
    }

    let lastSource = '';

    const updateButtonState = (state, message) => {
        previewBtn.dataset.state = state;
        previewBtn.textContent = state === 'playing' ? '⏸ Dừng thử' : '🎧 Nghe thử';
        previewStatus.textContent = message;
    };

    const applySelectedSource = () => {
        const source = getSelectedMusic();
        if (!source) {
            previewAudio.removeAttribute('src');
            lastSource = '';
            return '';
        }
        if (source !== lastSource) {
            previewAudio.src = source;
            lastSource = source;
        }
        return source;
    };

    musicSelect.addEventListener('change', () => {
        const wasPlaying = previewBtn.dataset.state === 'playing';
        applySelectedSource();
        if (wasPlaying) {
            previewAudio.pause();
        }
        updateButtonState('idle', getSelectedMusic() ? 'Sẵn sàng nghe thử' : 'Chưa chọn file nhạc');
    });

    previewBtn.addEventListener('click', () => {
        const source = applySelectedSource();
        if (!source) {
            updateButtonState('idle', 'Chưa có bài nhạc');
            return;
        }

        if (previewAudio.paused) {
            previewAudio.currentTime = 0;
            previewAudio.play().then(() => {
                if (!previewAudio.paused && getSelectedMusic() === source) updateButtonState('playing', 'Đang phát thử...');
            }).catch(() => {
                updateButtonState('idle', 'Không phát được bài này');
            });
        } else {
            previewAudio.pause();
        }
    });

    previewAudio.addEventListener('ended', () => {
        updateButtonState('idle', 'Đã phát xong');
    });

    previewAudio.addEventListener('pause', () => {
        if (previewBtn.dataset.state === 'playing') {
            updateButtonState('idle', 'Đã dừng');
        }
    });

    applySelectedSource();
    updateButtonState('idle', previewStatus.textContent || 'Chưa phát');
}

// Sửa DOMContentLoaded: KHÔNG gọi startWebsite ở đây nữa
document.addEventListener('DOMContentLoaded', function () {
    // Setup audio upload handler
    setupAudioUpload();
    setupMusicPreview();
    // ✅ Khởi tạo settings trước khi khởi tạo pricing
    const websiteId = window.birthdayAPI?.getWebsiteIdFromURL();
    if (websiteId) {
        const googleAuthContainer = document.getElementById('googleAuthContainer');
        if (googleAuthContainer) googleAuthContainer.style.display = 'none';
        loadWebsiteFromServer();
    } else {
        initializeDefaultSettings();
        applyLoadedSettings();
        if (window.initializePricingCalculator) {
            window.initializePricingCalculator();
        }
        if (window.pricingCalculator) {
            window.pricingCalculator.updatePricing();
        }
        window.isWebsiteReady = true;
        tryStartWebsiteWhenLandscape();
    }
});
// Tạo UI loading
function createLoadingUI() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
 
loadingOverlay.innerHTML = `
    <div class="loading-content">
        <div class="loading-spinner"></div>
        <h2>${t('loading')}</h2>
        <p>${t('waitingIsHappiness')}</p>
    </div>
`;


    // Thêm CSS cho loading UI
    const loadingStyles = document.createElement('style');
    loadingStyles.textContent = `
        #loadingOverlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            animation: fadeIn 0.3s ease-in-out;
        }
        
        .loading-content {
            text-align: center;
            color: white;
            padding: 20px;
        }
        
        .loading-spinner {
            width: 30px;
            height: 30px;
            border: 4px solid rgba(51, 10, 58, 0.3);
            border-top: 4px solid #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
      .loading-content h2 {
        font-size: 24px;
        margin-bottom: 10px;
        font-family: 'Pacifico', Arial, sans-serif;
    }
    
    .loading-content p {
        font-size: 16px;
        opacity: 0.8;
        font-family: 'Pacifico', Arial, sans-serif;
    }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;

    document.head.appendChild(loadingStyles);
    document.body.appendChild(loadingOverlay);

    return loadingOverlay;
}

// Xóa UI loading
function removeLoadingUI() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.animation = 'fadeOut 0.3s ease-in-out';
        setTimeout(() => {
            loadingOverlay.remove();
        }, 300);
    }
}

window.isWebsiteReady = false;
// Hàm load dữ liệu từ server
async function loadWebsiteFromServer() {
    const websiteId = window.birthdayAPI.getWebsiteIdFromURL();

    if (!websiteId) {
        initializeDefaultSettings();
        applyLoadedSettings();
        window.isWebsiteReady = true;
        if (typeof startWebsite === 'function') tryStartWebsiteWhenLandscape();;
        return;
    }


    // Ẩn settings button, settings hint và pricing UI khi load từ server
    const settingsButton = document.getElementById('settingsButton');
    const settingsHint = document.getElementById('settingsHint');
    const pricingContainer = document.getElementById('pricingContainer');

    if (settingsButton) {
        settingsButton.style.display = 'none';
    }

    if (settingsHint) {
        settingsHint.style.display = 'none';
    }

    if (pricingContainer) {
        pricingContainer.style.display = 'none';
    }

//     // Ẩn nút chuyển ngôn ngữ ở đây
const languageSwitchBtn = document.getElementById('langSwitchBtn');
if (languageSwitchBtn) {
    languageSwitchBtn.style.display = 'none';
}

    // Hiển thị loading UI
    const loadingOverlay = createLoadingUI();

    try {
        // Gọi API để lấy dữ liệu
        const result = await window.birthdayAPI.getBirthdayWebsiteByWebsiteId(websiteId);

        if (result.success && result.data) {

            // Cập nhật settings từ dữ liệu server
            const serverSettings = result.data.settings;

            // Kiểm tra status và ẩn copyright nếu PAID
            const status = result.data.status;
            const copyrightElement = document.querySelector('.copyright');

            if (status === 'PAID' && copyrightElement) {
                copyrightElement.style.display = 'none';
            } else {
            }

            // Xử lý photos array - ưu tiên photos array (kể cả mảng rỗng), fallback về photo1, photo2, photo3
            let photosArray = [];
            if (serverSettings.photos !== undefined && Array.isArray(serverSettings.photos)) {
                // Sử dụng photos array nếu có (kể cả mảng rỗng)
                photosArray = serverSettings.photos;
            } else if (serverSettings.photo1 || serverSettings.photo2 || serverSettings.photo3) {
                // Fallback về photo1, photo2, photo3 nếu không có photos array (backward compatibility)
                photosArray = [
                    serverSettings.photo1,
                    serverSettings.photo2,
                    serverSettings.photo3
                ].filter(p => p); // Loại bỏ giá trị null/undefined
            } else {
                // Giá trị mặc định (chỉ khi không có photos và không có photo1/2/3)
                photosArray = [
                    './image/z6742427403891_49b13d2c6cf180587fee8dc730dfbae1.jpg',
                    './image/z6742427412545_e15564300676cfbf93577dbb6e1af325.jpg',
                    './image/z6742427461367_48fa789a498f3e3311cb6afe1d4bdd45.jpg'
                ];
            }

            window.settings = {
                music: serverSettings.music || './music/nhacnenfree.mp3',
                fontStyle: serverSettings.fontStyle === 'mau2' ? 'mau2' : 'default',
                countdown: serverSettings.countdown || 3,
                matrixText: serverSettings.matrixText || 'HAPPY',
                matrixColor1: serverSettings.matrixColor1 || '#ff69b4',
                matrixColor2: serverSettings.matrixColor2 || '#ff1493',
                sequence: serverSettings.sequence || 'HAPPY|TEACHER\'S|DAY|20/11',
                sequenceColor: serverSettings.sequenceColor || '#ff69b4',
                isSave: serverSettings.isSave !== undefined ? serverSettings.isSave : false,
                letterTitle: serverSettings.letterTitle ?? 'Thầy cô thân mến!',
                letterContent: serverSettings.letterContent ?? 'Cảm ơn thầy cô vì đã luôn là ngọn hải đăng soi sáng, dẫn đường và truyền cảm hứng cho em luôn nỗ lực trong học tập cũng như cuộc sống hàng ngày.\n\nNhân dịp 20/11 chúng em cũng không biết nói gì hơn ngoài lời cảm ơn sâu sắc đến thầy cô',
                letterSignature: serverSettings.letterSignature ?? 'cảm ơn thầy cô ❤️',
                envelopeText: serverSettings.envelopeText || 'Happy\n Teacher\'s\n Day!',
                photos: photosArray
            };


            // Đợi một chút để user thấy loading (UX tốt hơn)
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Xóa loading UI
            removeLoadingUI();

            applyLoadedSettings();
            
            // Cập nhật trạng thái nút mũi tên sau khi load từ server
            if (typeof window.updateArrowButtonVisibility === 'function') {
                window.updateArrowButtonVisibility();
            }
            
            window.isWebsiteReady = true;
            if (typeof startWebsite === 'function') tryStartWebsiteWhenLandscape();;


        } else {
            throw new Error(result.error || 'Không thể tải dữ liệu từ server');
        }

    } catch (error) {

        initializeDefaultSettings();
        applyLoadedSettings();
        window.isWebsiteReady = true;
        if (typeof startWebsite === 'function') tryStartWebsiteWhenLandscape();;
    }
}

// Cập nhật event listener cho apply settings để sử dụng hàm reset chung
applySettingsButton.addEventListener('click', () => {
    // Lấy các input elements
    const letterTitleInput = document.getElementById('letterTitle');
    const letterContentInput = document.getElementById('letterContent');
    const letterSignatureInput = document.getElementById('letterSignature');
    const envelopeTextInput = document.getElementById('envelopeText');
    const photoGallerySettings = document.getElementById('photoGallerySettings');
    
    // The combined draft may contain only a title and signature; do not
    // require hidden legacy fields or invent text for missing optional parts.
    const draft = document.getElementById('tdLetterDraft');
    const errors = [];
    if (draft ? !draft.value.trim() : !letterContentInput?.value.trim()) {
        errors.push('Vui lòng viết nội dung lá thư');
    }

    // Lấy danh sách ảnh (không bắt buộc - có thể để trống)
    const photosArray = [];
    if (photoGallerySettings) {
        const photoDataInputs = photoGallerySettings.querySelectorAll('.photo-data-input');
        photoDataInputs.forEach(input => {
            if (input.value) {
                photosArray.push(input.value);
            }
        });
    }
    
    // Nếu có lỗi, hiển thị thông báo và dừng lại
    if (errors.length > 0) {
        alert(errors.join('\n'));
        
        (draft || letterContentInput)?.focus();

        return; // Dừng lại, không áp dụng settings
    }
    
    // Nếu không có lỗi, tiếp tục lưu settings
    // Cập nhật settings từ form
    settings.music = getSelectedMusic();
    settings.countdown = parseInt(document.getElementById('countdownTime').value) || 3;
    settings.matrixText = document.getElementById('matrixText').value || '';
    settings.matrixColor1 = document.getElementById('matrixColor1').value;
    settings.matrixColor2 = document.getElementById('matrixColor2').value;
    settings.sequence = document.getElementById('sequenceText').value || '';
    settings.sequenceColor = document.getElementById('sequenceColor').value;
    
    // Lưu cài đặt lá thư
    if (letterTitleInput) settings.letterTitle = letterTitleInput.value.trim();
    if (letterContentInput) settings.letterContent = letterContentInput.value.trim();
    if (letterSignatureInput) settings.letterSignature = letterSignatureInput.value.trim();
    if (envelopeTextInput) settings.envelopeText = envelopeTextInput.value.trim();
    
    // Lưu cài đặt gallery ảnh (có thể là mảng rỗng)
    settings.photos = photosArray;
    
    // Lưu mẫu màu đã chọn
    const activeButton = document.querySelector('.color-theme-btn.active');
    if (activeButton) {
        settings.colorTheme = activeButton.getAttribute('data-theme');
    }

    settings.isSave = document.getElementById('isSave')?.checked || false;
    
    // Cập nhật trạng thái global
    window.lastIsSaveState = settings.isSave;

    // Cập nhật pricing
    if (window.pricingCalculator) {
        window.pricingCalculator.updateFromSettings(settings);
    }

    // Cập nhật window.settings
    window.settings = settings;

    // Cập nhật trạng thái nút mũi tên sau khi áp dụng settings
    if (typeof window.updateArrowButtonVisibility === 'function') {
        window.updateArrowButtonVisibility();
    }

    // Close modal
    settingsModal.style.display = 'none';

    // Ensure website is started
    if (typeof startWebsite === 'function') {
        tryStartWebsiteWhenLandscape(true);
    }
});

function isAndroid() {
    return /android/i.test(navigator.userAgent);
}
const fullscreenBtn = document.getElementById('fullscreenBtn');
fullscreenBtn.style.zIndex = 9009999;

function updateFullscreenBtnVisibility() {
    if (
        fullscreenBtn &&
        isAndroid() &&
        !document.fullscreenElement // Chỉ hiện nếu chưa fullscreen
    ) {
        fullscreenBtn.style.display = 'block';

        // Ẩn nút sau 3 giây nếu chưa bấm
        if (fullscreenBtn.hideTimeout) clearTimeout(fullscreenBtn.hideTimeout);
        fullscreenBtn.hideTimeout = setTimeout(() => {
            fullscreenBtn.style.display = 'none';
        }, 2500);
    } else if (fullscreenBtn) {
        fullscreenBtn.style.display = 'none';
        if (fullscreenBtn.hideTimeout) clearTimeout(fullscreenBtn.hideTimeout);
    }
}

updateFullscreenBtnVisibility();

fullscreenBtn.onclick = function () {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            elem.requestFullscreen();
        }
    } else {
        alert(t('fullscreenNotSupported'));
    }
    // Ẩn nút ngay khi bấm
    fullscreenBtn.style.display = 'none';
    if (fullscreenBtn.hideTimeout) clearTimeout(fullscreenBtn.hideTimeout);
};

// Ẩn nút nếu user chuyển sang fullscreen bằng cách khác
document.addEventListener('fullscreenchange', function () {
    updateFullscreenBtnVisibility();
});
function isLandscapeMode() {
    return window.innerWidth > window.innerHeight;
}

function tryStartWebsiteWhenLandscape(restart = false) {
    // checkOrientation owns the single orientation subscription. A separate
    // resize listener here used to restart the countdown a second time.
    if (typeof startWebsite === 'function') startWebsite(restart);
}
