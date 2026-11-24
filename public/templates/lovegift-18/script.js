// ========== URL PARAMS DECODER ==========
function decodeData(encodedString) {
  try {
    let base64 = encodedString
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decompressed = pako.inflate(bytes, { to: 'string' });
    const data = JSON.parse(decompressed);
    console.log("📦 Decoded data:", data);
    return data;
  } catch (e) {
    console.error("Lỗi khi giải mã dữ liệu:", e);
    return null;
  }
}

// ---- HÀM LẤY THAM SỐ TỪ URL ----
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);

  // Thử giải mã từ param "c" (compressed)
  const compressedContent = urlParams.get("c");
  if (compressedContent) {
    const content = decodeData(compressedContent);
    if (content) {
      // Card content
      if (name === "text" && content.text) return content.text;
      if (name === "text1" && content.text1) return content.text1;
      if (name === "text2" && content.text2) return content.text2;
      if (name === "name" && content.name) return content.name;
      if (name === "introduce" && content.introduce) return content.introduce;
      if (name === "loopText" && content.loopText) return content.loopText;
      if (name === "message" && content.message) return content.message;

      // Media
      if (name === "music" && content.music) return content.music;
      if (name === "image" && content.image) return content.image;
      if (name === "coverImage" && content.coverImage) return content.coverImage;

      // Modal content
      if (name === "modalTitle" && content.modalTitle) return content.modalTitle;
      if (name === "modalContent" && content.modalContent) return content.modalContent;

      // Other
      if (name === "title" && content.title) return content.title;
      if (name === "subtitle" && content.subtitle) return content.subtitle;
      if (name === "dateText" && content.dateText) return content.dateText;
      if (name === "welcomeText" && content.welcomeText) return content.welcomeText;
      if (name === "instructionText" && content.instructionText) return content.instructionText;
      if (name === "unlockCode" && content.unlockCode) return content.unlockCode;
      if (name === "lockTitle" && content.lockTitle) return content.lockTitle;
      if (name === "cardTitle" && content.cardTitle) return content.cardTitle;
      if (name === "cardMessage" && content.cardMessage) return content.cardMessage;
      if (name === "scratchText" && content.scratchText) return content.scratchText;

      // Image string (comma separated)
      if (name === "image" && content.image) return content.image;
    }
  }

  // Tham số thông thường
  const regularParam = urlParams.get(name);
  if (regularParam) {
    return decodeURIComponent(regularParam);
  }

  // Giá trị mặc định
  if (name === "unlockCode") return "1402";
  if (name === "lockTitle") return "Ngày Chúng Mình Bên Nhau";
  if (name === "cardTitle") return "CHÚC MỪNG 3 NĂM<br>BÊN NHAU";
  if (name === "cardMessage") return "Ba năm bên em là khoảng thời gian tuyệt vời nhất cuộc đời anh. Mỗi khoảnh khắc, mỗi nụ cười, mỗi cái nắm tay đều khiến anh thêm yêu em hơn. Em là nguồn sáng, là nơi bình yên của anh. Cảm ơn em đã đến bên anh và cho anh một tình yêu trọn vẹn đến như vậy.";
  if (name === "scratchText") return "Cào để xem những điều bí mật nhé.";
  // Không có nhạc mặc định: chỉ phát nhạc người dùng tải lên
  if (name === "image") return "1.jpeg,2.jpeg,3.jpeg,4.jpeg";

  return null;
}

// ========== CONFIGURATION ==========
// Set your unlock code here (DDMM format - e.g., "1402" for 14/02)
let UNLOCK_CODE = getUrlParameter("unlockCode") || "1402";

// ========== BACKGROUND MUSIC ==========
const musicUrl = getUrlParameter("music") || '';
const bgMusic = new Audio();
if (musicUrl) bgMusic.src = musicUrl;
// Chưa có nhạc (người dùng không tải lên) thì không phát gì
const hasMusic = () => Boolean(bgMusic.getAttribute('src'));
bgMusic.loop = true;
bgMusic.volume = 0.5;

// Try to autoplay
const playMusic = () => {
    if (!hasMusic()) return;
    bgMusic.play().catch(() => {
        // Autoplay blocked, will try on user interaction
        console.log('Autoplay blocked - waiting for user interaction');
    });
};

// Try autoplay immediately
playMusic();

// Play on first user interaction if autoplay was blocked
let musicStarted = false;
const startMusicOnInteraction = () => {
    if (!musicStarted && hasMusic()) {
        bgMusic.play().then(() => {
            musicStarted = true;
            // Remove listeners after music starts
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('touchstart', startMusicOnInteraction);
            document.removeEventListener('keydown', startMusicOnInteraction);
        }).catch((e) => {
            console.log('Music play failed:', e);
        });
    }
};

document.addEventListener('click', startMusicOnInteraction);
document.addEventListener('touchstart', startMusicOnInteraction);
document.addEventListener('keydown', startMusicOnInteraction);

// ========== GALLERY SLIDESHOW ANIMATION ==========
// The photo gallery is a pure-CSS "stacked cards" slideshow. Its timing
// (per-card delays + keyframe percentages) depends on the number of photos,
// which is fixed to 4 in style.css. This regenerates everything for any N
// (up to 50) so the shuffle effect stays smooth regardless of photo count.
function setupGalleryAnimation(container, count) {
    if (!count || count < 1) return;

    const SECONDS_PER_IMAGE = 2;            // time each photo stays on top
    const total = count * SECONDS_PER_IMAGE; // full loop duration
    const u = 1 / count;                     // fraction of the cycle per photo
    const rotations = [16, -8, -15, 10, -12, 6]; // slight tilt, cycled per card

    // Full loop duration is read from --d by the CSS `animation` shorthand.
    container.style.setProperty('--d', total + 's');

    // Give every card its own delay + tilt (CSS only covers the first 4).
    const imgs = container.querySelectorAll('img');
    imgs.forEach((img, i) => {
        img.style.animationDelay = (-i * SECONDS_PER_IMAGE) + 's';
        img.style.setProperty('--r', rotations[i % rotations.length] + 'deg');
    });

    // Percentages that reproduce the original 4-photo timing when count === 4:
    const out = (u / 2 * 100).toFixed(4);   // card fully slid out
    const rest = (u * 100).toFixed(4);      // card back at rest
    const backNormal = ((1 - u) * 100).toFixed(4); // regains top z-index one slot before its turn
    const backLast = ((1 - u / 2) * 100).toFixed(4); // last card variant

    const css = `
        @keyframes slide {
            ${out}% { transform: translateX(120%) rotate(var(--r)); }
            0%, 100%, ${rest}% { transform: translateX(0%) rotate(var(--r)); }
        }
        @keyframes z-order {
            ${out}%, ${rest}% { z-index: 1; }
            ${backNormal}% { z-index: 2; }
        }
        @keyframes z-order-last {
            ${out}%, ${rest}% { z-index: 1; }
            ${backLast}% { z-index: 2; }
        }
    `;

    let styleTag = document.getElementById('gallery-anim-style');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'gallery-anim-style';
        document.head.appendChild(styleTag);
    }
    styleTag.textContent = css;
}

// ========== IMAGE ZOOM MODAL FUNCTIONS ==========
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-image');
const closeBtn = document.querySelector('.modal-close');

// Function to open modal with image
function openImageModal(imgSrc) {
    modal.classList.add('active');
    modalImg.src = imgSrc;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

// Function to close modal
function closeImageModal() {
    modal.classList.remove('active');
    // Restore body scroll
    document.body.style.overflow = '';
}

// Add click event to all gallery images
function initGalleryImageClicks() {
    const galleryImages = document.querySelectorAll('.photo-gallery > img');
    galleryImages.forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            openImageModal(img.src);
        });
    });
}

// Close modal when clicking the X button
closeBtn.addEventListener('click', closeImageModal);

// Close modal when clicking outside the image
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeImageModal();
    }
});

// Close modal with ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeImageModal();
    }
});

// ========== LOCK SCREEN LOGIC ==========
const digits = document.querySelectorAll('.digit');
const upButtons = document.querySelectorAll('.arrow.up');
const downButtons = document.querySelectorAll('.arrow.down');
const lockScreen = document.getElementById('lock-screen');
const cardScreen = document.getElementById('card-screen');
const numberInputs = document.querySelector('.number-inputs');

// Check if code is correct
function checkCode() {
    const code = Array.from(digits).map(d => d.value).join('');

    if (code === UNLOCK_CODE) {
        // Success - transition to card screen
        lockScreen.style.transition = 'opacity 0.5s ease';
        lockScreen.style.opacity = '0';

        setTimeout(() => {
            lockScreen.classList.remove('active');
            cardScreen.classList.add('active');
            initScratchCanvas();
            // Initialize gallery image clicks after a short delay
            setTimeout(initGalleryImageClicks, 500);
        }, 500);
    }
}

// Handle up arrow clicks
upButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const index = btn.dataset.index;
        const digit = digits[index];
        let value = parseInt(digit.value);
        value = (value + 1) % 10;
        digit.value = value;
        checkCode();
    });
});

// Handle down arrow clicks
downButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const index = btn.dataset.index;
        const digit = digits[index];
        let value = parseInt(digit.value);
        value = (value - 1 + 10) % 10;
        digit.value = value;
        checkCode();
    });
});

// ========== SCRATCH CANVAS LOGIC ==========
function initScratchCanvas() {
    const canvas = document.getElementById('scratch-canvas');
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    // Set canvas size
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    // Draw scratch layer
    ctx.fillStyle = '#a8a8a8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add scratch texture/text
    ctx.fillStyle = '#666';
    // Adjust font size based on screen width
    const isMobile = window.innerWidth <= 800;
    const textFontSize = isMobile ? '14px' : '18px';
    const iconFontSize = isMobile ? '24px' : '32px';
    const textOffset = isMobile ? 10 : 15;
    const iconOffset = isMobile ? 20 : 25;

    ctx.font = `bold ${textFontSize} Poppins`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Cào ở đây!', canvas.width / 2, canvas.height / 2 - textOffset);

    // Draw a small scratch icon
    ctx.font = `${iconFontSize} Arial`;
    ctx.fillText('✨', canvas.width / 2, canvas.height / 2 + iconOffset);

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // Get position relative to canvas
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if (e.touches) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    // Scratch function
    function scratch(x, y) {
        const scratchRadius = isMobile ? 20 : 30;
        const scratchLineWidth = isMobile ? 40 : 60;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, scratchRadius, 0, Math.PI * 2);
        ctx.fill();

        // Also draw line for smoother scratch
        ctx.lineWidth = scratchLineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        lastX = x;
        lastY = y;

        // Check if enough scratched
        checkScratchProgress();
    }

    // Check how much has been scratched
    function checkScratchProgress() {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let transparent = 0;

        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] === 0) {
                transparent++;
            }
        }

        const percentage = (transparent / (pixels.length / 4)) * 100;

        // If more than 50% scratched, reveal everything
        if (percentage > 50) {
            canvas.style.transition = 'opacity 0.5s ease';
            canvas.style.opacity = '0';
            setTimeout(() => {
                canvas.style.display = 'none';
            }, 500);
        }
    }

    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const pos = getPos(e);
        scratch(pos.x, pos.y);
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
    });

    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDrawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const pos = getPos(e);
        scratch(pos.x, pos.y);
    });

    canvas.addEventListener('touchend', () => {
        isDrawing = false;
    });
}

// Initialize if starting on card screen (for testing)
if (cardScreen.classList.contains('active')) {
    initScratchCanvas();
    // Initialize gallery image clicks for testing
    setTimeout(initGalleryImageClicks, 500);
}

// ========== LOAD CONTENT FROM URL PARAMS ==========
function initContent() {
    // Check if preview mode
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get("isPreview") === "true";

    if (isPreview) {
        const previewNotice = document.getElementById("preview-notice");
        if (previewNotice) {
            // Get the actual unlock code
            const unlockCode = getUrlParameter("unlockCode") || "1402";
            previewNotice.textContent = `Đang xem ở chế độ demo - Mã mở khóa: ${unlockCode}`;
            previewNotice.style.display = "block";
        }
    }

    // Load lock title
    const lockTitle = getUrlParameter("lockTitle");
    if (lockTitle) {
        const lockTitleEl = document.querySelector(".lock-title");
        if (lockTitleEl) lockTitleEl.textContent = lockTitle;
    }

    // Load card title
    const cardTitle = getUrlParameter("cardTitle");
    if (cardTitle) {
        const cardTitleEl = document.querySelector(".card-title");
        if (cardTitleEl) cardTitleEl.innerHTML = cardTitle;
    }

    // Load card message
    const cardMessage = getUrlParameter("cardMessage");
    if (cardMessage) {
        const cardMessageEl = document.querySelector(".card-message");
        if (cardMessageEl) cardMessageEl.textContent = cardMessage;
    }

    // Load scratch instruction
    const scratchText = getUrlParameter("scratchText");
    if (scratchText) {
        const scratchEl = document.querySelector(".scratch-instruction");
        if (scratchEl) scratchEl.innerHTML = scratchText;
    }

    // Load gallery images
    const imageValue = getUrlParameter("image");
    if (imageValue) {
        // The API may send `image` either as an array of URLs or as a single
        // comma-separated string. Only split strings, so URLs that themselves
        // contain commas (e.g. CDN transform params) aren't shattered.
        let images = Array.isArray(imageValue)
            ? imageValue
            : String(imageValue).split(',');
        images = images.map(url => String(url).trim()).filter(url => url);

        // Support up to 50 photos in the gallery slideshow
        const MAX_GALLERY_IMAGES = 50;
        const limitedImages = images.slice(0, MAX_GALLERY_IMAGES);

        if (limitedImages.length > 0) {
            const galleryContainer = document.querySelector(".photo-gallery");
            if (galleryContainer) {
                galleryContainer.innerHTML = '';
                limitedImages.forEach((imgUrl, index) => {
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.alt = "Kỷ niệm của chúng mình";
                    img.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openImageModal(img.src);
                    });
                    galleryContainer.appendChild(img);
                });

                // The stacked-card slideshow timing depends on the number of
                // photos, so regenerate it for the actual count.
                setupGalleryAnimation(galleryContainer, limitedImages.length);
            }
        }
    }

    // Load heart lock image if provided
    const coverImage = getUrlParameter("coverImage");
    if (coverImage) {
        const heartImg = document.querySelector(".heart-lock-image");
        if (heartImg) heartImg.src = coverImage;
    }
}

// Update meta tags for sharing
function updateMetaTags() {
    const cardTitle = getUrlParameter("cardTitle");
    const cardMessage = getUrlParameter("cardMessage");

    // Keep page title fixed
    document.title = "Thiệp Tình Yêu Online";

    if (cardTitle) {
        // Update OG tags only (for social sharing)
        const plainTitle = cardTitle.replace(/<br>/g, ' ').replace(/<[^>]*>/g, '');

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = plainTitle;

        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) twitterTitle.content = plainTitle;
    }

    if (cardMessage) {
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = cardMessage.substring(0, 150) + '...';

        const twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (twitterDesc) twitterDesc.content = cardMessage.substring(0, 150) + '...';
    }
}

// Initialize content when page loads
document.addEventListener('DOMContentLoaded', () => {
    initContent();
    updateMetaTags();
});

// Also init immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // Still loading
} else {
    // DOM already loaded
    initContent();
    updateMetaTags();
}

// ========== LOAD CONFIG FROM API (when ?id=...) ==========
function applyApiSettings(settings) {
    if (!settings) return;

    // Unlock code
    if (settings.unlockCode) {
        UNLOCK_CODE = String(settings.unlockCode);
    }

    // Background music
    if (settings.music) {
        try {
            bgMusic.src = settings.music;
            bgMusic.load();
            bgMusic.play().catch(() => {});
        } catch (e) {
            console.error('Lỗi cập nhật nhạc:', e);
        }
    }

    // Lock title
    if (settings.lockTitle) {
        const lockTitleEl = document.querySelector('.lock-title');
        if (lockTitleEl) lockTitleEl.textContent = settings.lockTitle;
    }

    // Card title
    if (settings.cardTitle) {
        const cardTitleEl = document.querySelector('.card-title');
        if (cardTitleEl) cardTitleEl.innerHTML = settings.cardTitle;
    }

    // Card message — preserve line breaks, escape HTML, ensure responsive wrapping
    if (settings.cardMessage) {
        const cardMessageEl = document.querySelector('.card-message');
        if (cardMessageEl) {
            const escaped = String(settings.cardMessage)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/\r\n|\r|\n/g, '<br>');
            cardMessageEl.innerHTML = escaped;
            cardMessageEl.style.wordWrap = 'break-word';
            cardMessageEl.style.overflowWrap = 'break-word';
            cardMessageEl.style.whiteSpace = 'normal';
        }
    }

    // Gallery images (array)
    if (Array.isArray(settings.image) && settings.image.length > 0) {
        const galleryContainer = document.querySelector('.photo-gallery');
        if (galleryContainer) {
            // Support up to 50 photos in the gallery slideshow
            const MAX_GALLERY_IMAGES = 50;
            const limitedImages = settings.image.slice(0, MAX_GALLERY_IMAGES);

            galleryContainer.innerHTML = '';
            limitedImages.forEach((imgUrl) => {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = 'Kỷ niệm của chúng mình';
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openImageModal(img.src);
                });
                galleryContainer.appendChild(img);
            });

            // The stacked-card slideshow timing depends on the number of
            // photos, so regenerate it for the actual count (CSS only covers 4).
            setupGalleryAnimation(galleryContainer, limitedImages.length);
        }
    }

    // Update preview notice if visible
    const previewNotice = document.getElementById('preview-notice');
    if (previewNotice && previewNotice.style.display !== 'none' && settings.unlockCode) {
        previewNotice.textContent = `Đang xem ở chế độ demo - Mã mở khóa: ${settings.unlockCode}`;
    }

    // Meta tags for sharing
    if (settings.cardTitle) {
        const plainTitle = String(settings.cardTitle).replace(/<br>/g, ' ').replace(/<[^>]*>/g, '');
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = plainTitle;
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) twitterTitle.content = plainTitle;
    }
    if (settings.cardMessage) {
        const desc = String(settings.cardMessage).substring(0, 150) + '...';
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = desc;
        const twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (twitterDesc) twitterDesc.content = desc;
    }
}

const cfgId = new URLSearchParams(window.location.search).get('id');
if (cfgId) {
    fetch('https://lovegift.online/api/settings/' + cfgId)
        .then((r) => r.json())
        .then((data) => {
            if (data && data.success && data.data && data.data.settings) {
                const apply = () => applyApiSettings(data.data.settings);
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', apply);
                } else {
                    apply();
                }
                console.log('Config loaded from API:', data.data.settings);
            }
        })
        .catch((err) => {
            console.error('Lỗi load config từ API:', err);
        });
}

// ========== FLOATING HEARTS - Pure CSS Animation ==========
// Hearts are now rendered with pure CSS - no JavaScript needed!

