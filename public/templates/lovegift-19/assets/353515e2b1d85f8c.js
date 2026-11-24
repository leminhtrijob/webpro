// ---- HÀM LẤY THAM SỐ TỪ URL ----
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);

  // Kiểm tra nếu có tham số c (encoded content)
  const encodedContent = urlParams.get("c");
  if (encodedContent) {
    try {
      // Giải mã base64 đã được URL-safe
      const base64 = encodedContent.replace(/-/g, "+").replace(/_/g, "/");
      const decodedString = decodeURIComponent(escape(atob(base64)));
      const content = JSON.parse(decodedString);

      // Kiểm tra và trả về giá trị tương ứng
      if (name === "title" && content.title) return content.title;
      if (name === "message" && content.message) return content.message;
      if (name === "image" && content.image) return content.image;
      if (name === "music" && content.music) return content.music;
    } catch (e) {
      console.error("Lỗi khi giải mã Base64:", e);
    }
  }

  // Kiểm tra tham số thông thường trong URL (không mã hóa)
  const regularParam = urlParams.get(name);
  if (regularParam) {
    return regularParam;
  }

  // Trả về giá trị mặc định nếu không có trong URL
  if (name === "title") return "Chúc Mừng 20/10 Em Yêu 💕";
  if (name === "message") return "Gửi em - người con gái anh thương nhất! Nhân ngày Phụ nữ Việt Nam 20/10, anh muốn nói rằng cảm ơn em đã luôn ở bên anh, cùng anh đi qua những ngày vui lẫn ngày buồn. Em là món quà tuyệt vời nhất mà anh có. Chúc em luôn xinh đẹp, rạng rỡ, hạnh phúc và mãi được yêu thương. Anh yêu em nhiều lắm! 💐";
  if (name === "image") return "20-10.jpeg";
  // Không có nhạc mặc định: chỉ phát nhạc người dùng tải lên

  return null;
}

// ---- SETTINGS TỪ LOVEGIFT.ONLINE (?id=...) ----
const API_BASE = "https://lovegift.online/api/settings/";
let apiSettings = null;

function loadApiSettings() {
    const cfgId = new URLSearchParams(window.location.search).get("id");
    if (!cfgId) return Promise.resolve();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    return fetch(API_BASE + encodeURIComponent(cfgId), { signal: controller.signal })
        .then((response) => response.json())
        .then((data) => {
            if (data && data.success && data.data && data.data.settings) {
                apiSettings = data.data.settings;
            }
        })
        .catch((err) => console.error("Lỗi load config từ API:", err))
        .then(() => clearTimeout(timeout));
}

// Ưu tiên settings từ API, sau đó tới tham số URL / giá trị mặc định
function getSetting(name) {
    if (apiSettings) {
        const value = apiSettings[name];
        if (name === "image") {
            const images = (Array.isArray(value) ? value : [value]).filter(Boolean);
            if (images.length) return images;
        } else if (typeof value === "string" && value.trim()) {
            return value;
        }
    }
    const fallback = getUrlParameter(name);
    return name === "image" ? [fallback] : fallback;
}

let contentImages = [];
const contentReady = loadApiSettings().then(initializeContent);

onload = () => {
    document.body.classList.remove("container");

    // Add sparkle effect when card appears
    setTimeout(() => {
        createSparkles();
    }, 6000);

    // Auto play music with user interaction (sau khi đã có link nhạc)
    contentReady.then(playMusic);

    // Show preview button if isPreview=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('isPreview') === 'true') {
        document.getElementById('previewBtn').style.display = 'block';
    }
};

// Initialize content from API settings / URL parameters
function initializeContent() {
    const title = getSetting('title');
    const message = getSetting('message');
    const images = getSetting('image');
    const music = getSetting('music');
    contentImages = images;

    // Update card text
    const cardText = document.querySelector('.valentine-container .card .text');
    cardText.textContent = title;

    // Update modal title
    document.querySelector('.modal-title').textContent = title;

    // Update modal message (typewriter)
    const typewriterEl = document.querySelector('.typewriter-text');
    typewriterEl.dataset.fullText = message;
    typewriterEl.textContent = '';

    // Update image (ảnh đầu tiên cho polaroid), preload các ảnh còn lại cho hiệu ứng bay
    document.querySelector('.polaroid-image img').src = images[0];
    images.slice(1).forEach((src) => { new Image().src = src; });

    // Update music (không có nhạc người dùng → ẩn nút loa, không phát)
    if (music) {
        document.getElementById('bgMusic').src = music;
    } else {
        document.getElementById('musicToggle').style.display = 'none';
    }
}

// Music control
let isPlaying = false;
const bgMusic = document.getElementById('bgMusic');
const musicToggle = document.getElementById('musicToggle');
const musicIcon = document.getElementById('musicIcon');

function playMusic() {
    if (!bgMusic.getAttribute('src')) return;
    // Try to play music
    const playPromise = bgMusic.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            isPlaying = true;
            musicToggle.classList.add('playing');
            musicIcon.classList.add('playing');
            musicIcon.classList.remove('muted');
        }).catch(() => {
            // Autoplay was prevented, need user interaction
            isPlaying = false;
            musicToggle.classList.remove('playing');
            musicIcon.classList.remove('playing');
            musicIcon.classList.add('muted');

            // Play on first user interaction (click, touch, scroll, keydown)
            function playOnInteraction() {
                if (isPlaying) return;
                bgMusic.play().then(() => {
                    isPlaying = true;
                    musicToggle.classList.add('playing');
                    musicIcon.classList.add('playing');
                    musicIcon.classList.remove('muted');
                }).catch(() => {});
                ['click', 'touchstart', 'scroll', 'keydown'].forEach(evt => {
                    document.removeEventListener(evt, playOnInteraction);
                });
            }
            ['click', 'touchstart', 'scroll', 'keydown'].forEach(evt => {
                document.addEventListener(evt, playOnInteraction, { once: true });
            });
        });
    }
}

function toggleMusic() {
    if (isPlaying) {
        bgMusic.pause();
        isPlaying = false;
        musicToggle.classList.remove('playing');
        musicIcon.classList.remove('playing');
        musicIcon.classList.add('muted');
    } else {
        bgMusic.play();
        isPlaying = true;
        musicToggle.classList.add('playing');
        musicIcon.classList.add('playing');
        musicIcon.classList.remove('muted');
    }
}

// Create sparkle particles around the card
function createSparkles() {
    const sparkleCount = 20;
    const container = document.querySelector('.valentine-container');

    for (let i = 0; i < sparkleCount; i++) {
        setTimeout(() => {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: #ffd700;
                border-radius: 50%;
                box-shadow: 0 0 10px #ffd700;
                pointer-events: none;
                left: 50%;
                top: 50%;
                animation: sparkle-burst 1s ease-out forwards;
                --angle: ${(360 / sparkleCount) * i}deg;
            `;
            container.appendChild(sparkle);

            setTimeout(() => sparkle.remove(), 1000);
        }, i * 30);
    }
}

// Typewriter effect
let typewriterTimer = null;

function startTypewriter() {
    const el = document.querySelector('.typewriter-text');
    if (!el) return;
    const fullText = el.dataset.fullText || '';
    el.textContent = '';
    el.classList.remove('done');
    let i = 0;
    const charsPerTick = 2;

    if (typewriterTimer) clearInterval(typewriterTimer);

    typewriterTimer = setInterval(function() {
        if (i < fullText.length) {
            const end = Math.min(i + charsPerTick, fullText.length);
            el.textContent = fullText.substring(0, end);
            i = end;
            const box = el.parentElement;
            box.scrollTop = box.scrollHeight;
        } else {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
            el.classList.add('done');
        }
    }, 50);
}

// Modal functions
function openModal() {
    const modal = document.getElementById('wishModal');
    if (modal.classList.contains('show')) return;
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    startTypewriter();
}

function closeModal() {
    const modal = document.getElementById('wishModal');
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    if (typewriterTimer) {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
    }

    // Đóng thư: ẩn lá thư và cho các ảnh bay lên
    if (!letterClosed) {
        letterClosed = true;
        document.querySelector('.valentine-container').classList.add('is-hidden');
        startFloatingPhotos();
    }
}

// ---- ẢNH BAY LÊN SAU KHI ĐÓNG THƯ ----
let letterClosed = false;

function startFloatingPhotos() {
    const container = document.createElement('div');
    container.className = 'photos-container';
    document.body.appendChild(container);

    const images = contentImages.length ? contentImages : [document.querySelector('.polaroid-image img').src];
    const lanes = [15, 50, 85, 32, 68, 22, 78, 42];
    const duration = 12; // giây cho mỗi ảnh bay từ dưới lên trên
    // Luôn có ít nhất 6 ảnh trên màn, lặp lại nếu khách chỉ có ít ảnh
    const count = Math.max(images.length, 6);

    for (let i = 0; i < count; i++) {
        const photo = document.createElement('div');
        photo.className = 'floating-photo';
        photo.style.left = lanes[i % lanes.length] + '%';
        photo.style.animationDuration = duration + 's';
        photo.style.animationDelay = (i * duration / count) + 's';
        photo.style.setProperty('--tilt', (i % 2 ? 1 : -1) * (4 + (i * 3) % 7) + 'deg');

        const img = document.createElement('img');
        img.src = images[i % images.length];
        img.alt = '';
        img.loading = 'eager';
        photo.appendChild(img);
        container.appendChild(photo);
    }
}

// Valentine card - tap anywhere on screen to open (after card drops in)
(function() {
    let cardReady = false;
    let tapped = false; // Prevent double-fire from touch + click
    // Card drops in after 6s delay + 2s animation = ~8s
    setTimeout(() => { cardReady = true; }, 8000);

    function handleScreenTap(e) {
        if (!cardReady || letterClosed) return;
        if (tapped) return;
        const modal = document.getElementById('wishModal');
        // Don't open if modal is already showing, or if tapping modal/close/music controls
        if (modal.classList.contains('show')) return;
        if (e.target.closest('.modal.show, .music-toggle, .brand-tag')) return;
        tapped = true;
        setTimeout(() => { tapped = false; }, 400);
        contentReady.then(openModal);
    }

    document.addEventListener('click', handleScreenTap);
    document.addEventListener('touchend', handleScreenTap);

    // Close modal when clicking close button or outside
    const modal = document.getElementById('wishModal');
    if (modal) {
        document.getElementById('closeModalBtn').addEventListener('click', function(e) {
            e.stopPropagation();
            closeModal();
        });
        document.getElementById('closeModalBtn').addEventListener('touchend', function(e) {
            e.stopPropagation();
            e.preventDefault();
            closeModal();
        });
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                e.stopPropagation();
                closeModal();
            }
        });
        modal.addEventListener('touchend', function(e) {
            if (e.target === modal) {
                e.stopPropagation();
                closeModal();
            }
        });
    }
}());

// Add sparkle animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes sparkle-burst {
        0% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0) scale(1);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(150px) scale(0);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);