// ---- GIÁ TRỊ MẶC ĐỊNH ----
const defaultData = {
    "template": "valentine-envelope",
    "data": {
        "text1": "Dear",
        "text": "My Love",
        "text2": "❤",
        "name": "Gửi anh yêu,",
        "message": "Từ ngày có anh, cuộc sống của em trở nên tươi đẹp hơn bao giờ hết. Cảm ơn anh vì đã luôn ở bên em, yêu thương và che chở cho em.\nYêu anh nhiều lắm!",
        "music": "", // Không có nhạc mặc định: chỉ phát nhạc người dùng tải lên
        "images": ["image1.jpeg", "image2.jpeg", "image3.jpeg"]
    }
};

// Lưu settings đã load từ API
var loadedSettings = null;

// ---- HÀM GIẢI MÃ DỮ LIỆU NÉN ----
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
  // Nếu đã load từ API, ưu tiên dùng settings từ API
  if (loadedSettings) {
    if (name === "text1" && loadedSettings.text1) return loadedSettings.text1;
    if (name === "text" && loadedSettings.text) return loadedSettings.text;
    if (name === "text2" && loadedSettings.text2) return loadedSettings.text2;
    if (name === "name" && loadedSettings.name) return loadedSettings.name;
    if (name === "message" && loadedSettings.message) return loadedSettings.message;
    if (name === "music" && loadedSettings.music) return loadedSettings.music;
    if (name === "images" && loadedSettings.images) return loadedSettings.images;
    if (name === "title" && loadedSettings.title) return loadedSettings.title;
  }

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
      // Tương thích ngược: gộp introduce + loopText cũ thành message
      if (name === "message") {
        if (content.message) return content.message;
        if (content.introduce) {
          var msg = content.introduce;
          if (content.loopText) msg += '\n' + content.loopText;
          return msg;
        }
      }

      // Media
      if (name === "music" && content.music) return content.music;
      if (name === "images" && content.image) {
        var imgs = Array.isArray(content.image) ? content.image : content.image.split(",").map(function(s) { return s.trim(); });
        return imgs;
      }
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
    }
  }

  // Tham số thông thường
  const regularParam = urlParams.get(name);
  if (regularParam) {
    return decodeURIComponent(regularParam);
  }

  // Tương thích ngược: introduce + loopText cũ → message mới
  if (name === "message") {
    var oldIntroduce = urlParams.get("introduce");
    var oldLoopText = urlParams.get("loopText");
    if (oldIntroduce) {
      var combined = decodeURIComponent(oldIntroduce);
      if (oldLoopText) combined += '\n' + decodeURIComponent(oldLoopText);
      return combined;
    }
  }
  // Tương thích ngược: image cũ (string) → images mới (array)
  if (name === "images") {
    var oldImage = urlParams.get("image");
    if (oldImage) {
      return decodeURIComponent(oldImage).split(',').map(function(s) { return s.trim(); });
    }
  }

  // Giá trị mặc định
  if (name === "text1") return defaultData.data.text1;
  if (name === "text") return defaultData.data.text;
  if (name === "text2") return defaultData.data.text2;
  if (name === "name") return defaultData.data.name;
  if (name === "music") return defaultData.data.music;
  if (name === "message") return defaultData.data.message;

  return null;
}

// ---- KHỞI TẠO DỮ LIỆU TỪ API SETTINGS ----
function initWithApiSettings(settings) {
    // Gộp introduce + loopText thành message (xuống dòng phân cách)
    var message = null;
    if (settings.introduce) {
        message = settings.introduce;
        if (settings.loopText) message += '\n' + settings.loopText;
    }

    loadedSettings = {
        music: settings.music || null,
        name: settings.name || null,
        message: message,
        images: settings.image ? (Array.isArray(settings.image) ? settings.image : settings.image.split(',').map(function(s) { return s.trim(); })) : null,
        text1: settings.text1 || null,
        text: settings.text || null,
        text2: settings.text2 || null
    };
    console.log("Dữ liệu từ API đã load:", loadedSettings);
}

// ---- CHECK ID PARAM -> FETCH TỪ API ----
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const cfgId = urlParams.get('id');

    if (cfgId) {
        // Tạo promise để đợi data ready
        window._heartloveReady = new Promise(function(resolve) {
            fetch('https://lovegift.online/api/settings/' + cfgId)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success && data.data && data.data.settings) {
                        initWithApiSettings(data.data.settings);
                    }
                    resolve();
                })
                .catch(function(err) {
                    console.error("Lỗi khi fetch settings từ API:", err);
                    resolve();
                });
        });
    }
})();

// ---- ELEMENTS ----
const envelopeWrapper = document.getElementById("envelopeWrapper");
const envelope = document.getElementById("envelope");
const card = document.getElementById("card");
const clickInstruction = document.getElementById("clickInstruction");
let isEnvelopeOpen = false;

// ---- ENVELOPE CLICK ----
envelopeWrapper.addEventListener("click", function (e) {
  e.stopPropagation();

  if (!isEnvelopeOpen) {
    // Open envelope (add class to wrapper)
    envelopeWrapper.classList.add("open");
    isEnvelopeOpen = true;

    // Hide instruction
    if (clickInstruction) {
      clickInstruction.style.opacity = "0";
    }

    // Add animation-done class after animation completes (1.5s + 0.3s delay)
    setTimeout(() => {
      if (card) {
        card.classList.add("animation-done");
      }
    }, 1800);
  } else if (card && card.classList.contains("animation-done")) {
    // Card is visible and animation done → open modal
    openModal();
  }
});

// ---- TYPEWRITER EFFECT ----
let typewriterStarted = false;

function startTypewriterEffect() {
  if (typewriterStarted) return;
  typewriterStarted = true;

  const cardGreeting = document.querySelector(".card-greeting");
  const cardMessage = document.querySelector(".card-message");
  const cardEnding = document.querySelector(".card-ending");

  const elements = [cardGreeting, cardMessage, cardEnding];
  let totalDelay = 0;

  elements.forEach((el) => {
    if (!el) return;
    const text = el.textContent;
    el.innerHTML = "";
    el.classList.add("typewriter");

    for (let i = 0; i < text.length; i++) {
      const span = document.createElement("span");
      span.textContent = text[i] === " " ? "\u00A0" : text[i];
      span.style.animationDelay = `${totalDelay + i * 50}ms`;
      el.appendChild(span);
    }
    totalDelay += text.length * 50 + 300;
  });
}

// Start typewriter when card is hovered (opened)
card.addEventListener("mouseenter", function () {
  if (card.classList.contains("animation-done")) {
    startTypewriterEffect();
  }
});

// ---- CLICK OUTSIDE TO CLOSE ----
document.addEventListener("click", function (e) {
  if (isEnvelopeOpen && !envelopeWrapper.contains(e.target)) {
    // Close envelope
    envelopeWrapper.classList.remove("open");
    isEnvelopeOpen = false;

    // Remove animation-done class
    if (card) {
      card.classList.remove("animation-done");
    }

    if (clickInstruction) {
      clickInstruction.style.opacity = "1";
    }
  }
});

// ---- INITIALIZE ON LOAD ----
window.onload = function() {
  function startApp() {
    initializeContent();
    playMusic();
    initializeFlyingHearts();
  }

  // Nếu có promise từ API fetch, đợi nó hoàn thành trước
  if (window._heartloveReady) {
    window._heartloveReady.then(startApp);
  } else {
    startApp();
  }
};

// ---- FLYING HEARTS ----
const flyingHeartsContainer = document.getElementById("flyingHearts");

function createFlyingHeart() {
  if (!flyingHeartsContainer) return;

  const heart = document.createElement("div");
  heart.className = "flying-heart";

  // Random horizontal position
  const startPositionX = Math.random() * window.innerWidth;

  // Random size (10-25px)
  const size = Math.random() * 15 + 10;

  // Random animation duration (4-7 seconds)
  const duration = Math.random() * 3 + 4;

  // Random colors for variety
  const colors = ["#ff526f", "#ff7a8a", "#ff9a9e", "#fecfef", "#ffb3ba", "#e91e63"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // Random delay (0-2 seconds)
  const delay = Math.random() * 2;

  // Set heart styles
  heart.style.width = `${size}px`;
  heart.style.height = `${size}px`;
  heart.style.left = `${startPositionX}px`;
  heart.style.backgroundColor = color;
  heart.style.animationDuration = `${duration}s`;
  heart.style.animationDelay = `${delay}s`;
  heart.style.bottom = "-50px";

  flyingHeartsContainer.appendChild(heart);

  // Remove heart after animation completes
  setTimeout(() => {
    if (heart.parentNode) {
      heart.remove();
    }
  }, (duration + delay + 2) * 1000);
}

function initializeFlyingHearts() {
  const isMobile = window.innerWidth <= 768;
  const initialHearts = isMobile ? 15 : 20;
  const heartInterval = isMobile ? 600 : 500;

  // Create initial hearts with staggered timing
  for (let i = 0; i < initialHearts; i++) {
    setTimeout(() => {
      createFlyingHeart();
    }, i * 200);
  }

  // Create hearts continuously
  setInterval(createFlyingHeart, heartInterval);
}

// Initialize content from URL parameters
function initializeContent() {
  // Card cover title
  const cardTitleMain = document.querySelector(".card-title-main");
  const cardTitleSecondary = document.querySelectorAll(".card-title-secondary");

  const text1 = getUrlParameter("text1") || "Happy";
  const text2 = getUrlParameter("text") || "Valentine's";
  const text3 = getUrlParameter("text2") || "Day";

  if (cardTitleSecondary[0]) cardTitleSecondary[0].textContent = text1;
  if (cardTitleMain) cardTitleMain.textContent = text2;
  if (cardTitleSecondary[1]) cardTitleSecondary[1].textContent = text3;

  // Card body content
  const cardGreeting = document.querySelector(".card-greeting");
  const cardMessage = document.querySelector(".card-message");
  const cardEnding = document.querySelector(".card-ending");

  const greeting = getUrlParameter("name") || "To my love,";
  const rawMessage = getUrlParameter("message") || defaultData.data.message;
  // Chuyển \n thành <br> để xuống dòng
  const messageHtml = rawMessage.replace(/\n/g, '<br>');

  if (cardGreeting) cardGreeting.textContent = greeting;
  if (cardMessage) cardMessage.innerHTML = messageHtml;
  // Ẩn card-ending vì đã gộp vào message
  if (cardEnding) cardEnding.style.display = 'none';

  // Modal content
  const modalTitle = document.querySelector(".polaroid-text h2");
  const modalMessage = document.querySelector(".polaroid-text p:first-of-type");
  const modalIntro = document.querySelector(".polaroid-text p:nth-of-type(2)");
  const modalSignature = document.querySelector(".polaroid-text .signature");

  const title = getUrlParameter("name") || "Gửi anh yêu,";

  if (modalTitle) modalTitle.innerHTML = title;
  if (modalMessage) modalMessage.innerHTML = messageHtml;
  // Ẩn các phần không cần nữa
  if (modalIntro) modalIntro.style.display = 'none';
  if (modalSignature) modalSignature.style.display = 'none';

  // Images - array ảnh, lấy ảnh đầu tiên cho card và modal
  var images = getUrlParameter("images") || defaultData.data.images;
  if (!Array.isArray(images)) {
    images = images.split(',').map(function(s) { return s.trim(); });
  }
  // Lưu danh sách ảnh để dùng cho flying images
  window._allImages = images;
  const imageUrl = images[0] || "image1.png";
  const cardBack = document.querySelector(".card-back");
  const modalImageContainer = document.querySelector(".polaroid-image");

  if (cardBack) {
    cardBack.style.backgroundImage = `url('${imageUrl}')`;
    cardBack.classList.add("has-image");
  }
  if (modalImageContainer) {
    const modalImage = document.querySelector(".polaroid-image img");
    if (modalImage) modalImage.src = imageUrl;
  }

  // Music
  const musicUrl = getUrlParameter("music");
  if (musicUrl) {
    const bgMusic = document.getElementById("bgMusic");
    if (bgMusic) bgMusic.src = musicUrl;
  } else {
    // Không có nhạc người dùng → ẩn nút loa
    const toggle = document.getElementById("musicToggle");
    if (toggle) toggle.style.display = "none";
  }
}

// ---- MUSIC CONTROL ----
let isPlaying = false;
const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");
const musicIcon = document.getElementById("musicIcon");

function playMusic() {
  if (!bgMusic) return;

  function setPlayingState() {
    isPlaying = true;
    if (musicToggle) musicToggle.classList.add("playing");
    if (musicIcon) {
      musicIcon.classList.add("playing");
      musicIcon.classList.remove("muted");
    }
  }

  function setMutedState() {
    isPlaying = false;
    if (musicToggle) musicToggle.classList.remove("playing");
    if (musicIcon) {
      musicIcon.classList.remove("playing");
      musicIcon.classList.add("muted");
    }
  }

  if (!bgMusic.getAttribute("src")) return;
  const playPromise = bgMusic.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        setPlayingState();
      })
      .catch(() => {
        setMutedState();

        // Listen for any user interaction to start music
        const interactionEvents = ["click", "touchstart", "keydown", "scroll"];

        function playOnInteraction() {
          bgMusic.play().then(() => {
            setPlayingState();
          }).catch(() => {});
          // Remove all listeners after first successful interaction
          interactionEvents.forEach((evt) => {
            document.removeEventListener(evt, playOnInteraction);
          });
        }

        interactionEvents.forEach((evt) => {
          document.addEventListener(evt, playOnInteraction, { once: true });
        });
      });
  }
}

function toggleMusic() {
  if (!bgMusic) return;

  if (isPlaying) {
    bgMusic.pause();
    isPlaying = false;
    if (musicToggle) musicToggle.classList.remove("playing");
    if (musicIcon) {
      musicIcon.classList.remove("playing");
      musicIcon.classList.add("muted");
    }
  } else {
    bgMusic.play();
    isPlaying = true;
    if (musicToggle) musicToggle.classList.add("playing");
    if (musicIcon) {
      musicIcon.classList.add("playing");
      musicIcon.classList.remove("muted");
    }
  }
}

// ---- MODAL FUNCTIONS ----
// Lưu nội dung gốc của modal để reset
let modalOriginalContent = {};

function saveModalOriginalContent() {
  const modal = document.getElementById("wishModal");
  if (!modal) return;
  const elements = modal.querySelectorAll('.polaroid-text h2, .polaroid-text p, .polaroid-text .signature');
  elements.forEach((el, index) => {
    modalOriginalContent[index] = el.innerHTML;
  });
}

function applyTypewriterToElement(el, text, startDelay) {
  el.innerHTML = '';
  el.classList.add('typewriter-modal');

  // Tách thành từng từ (giữ khoảng trắng giữa các từ)
  // Xử lý HTML tags riêng
  const tokens = [];
  let i = 0;
  let currentWord = '';

  while (i < text.length) {
    if (text[i] === '<') {
      if (currentWord) { tokens.push({ type: 'word', value: currentWord }); currentWord = ''; }
      const end = text.indexOf('>', i);
      if (end !== -1) {
        tokens.push({ type: 'tag', value: text.substring(i, end + 1) });
        i = end + 1;
        continue;
      }
    }
    if (text[i] === '&') {
      const end = text.indexOf(';', i);
      if (end !== -1) {
        currentWord += text.substring(i, end + 1);
        i = end + 1;
        continue;
      }
    }
    if (text[i] === ' ') {
      if (currentWord) { tokens.push({ type: 'word', value: currentWord }); currentWord = ''; }
      tokens.push({ type: 'space' });
      i++;
      continue;
    }
    currentWord += text[i];
    i++;
  }
  if (currentWord) tokens.push({ type: 'word', value: currentWord });

  let charIndex = 0;
  tokens.forEach((token) => {
    if (token.type === 'tag') {
      const node = document.createRange().createContextualFragment(token.value);
      el.appendChild(node);
    } else if (token.type === 'space') {
      // Dùng text node bình thường để trình duyệt tự xuống dòng
      el.appendChild(document.createTextNode(' '));
    } else {
      // Từng ký tự trong từ
      for (let j = 0; j < token.value.length; j++) {
        const span = document.createElement('span');
        span.textContent = token.value[j];
        span.style.animationDelay = `${startDelay + charIndex * 40}ms`;
        el.appendChild(span);
        charIndex++;
      }
    }
  });

  return charIndex;
}

function openModal() {
  const modal = document.getElementById("wishModal");
  if (modal) {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";

    // Hiện ảnh trước
    const polaroidImage = modal.querySelector('.polaroid-image');
    if (polaroidImage) {
      polaroidImage.classList.remove('fade-in');
      setTimeout(() => {
        polaroidImage.classList.add('fade-in');
      }, 200);
    }

    // Lưu nội dung gốc nếu chưa lưu
    if (Object.keys(modalOriginalContent).length === 0) {
      saveModalOriginalContent();
    }

    // Typewriter cho từng phần text
    const elements = modal.querySelectorAll('.polaroid-text h2, .polaroid-text p, .polaroid-text .signature');
    let totalDelay = 500; // Bắt đầu sau khi ảnh hiện

    elements.forEach((el, index) => {
      const text = modalOriginalContent[index] || el.innerHTML;
      const charCount = applyTypewriterToElement(el, text, totalDelay);
      totalDelay += charCount * 40 + 300; // Cộng thêm khoảng nghỉ giữa các đoạn
    });
  }
}

function closeModal() {
  const modal = document.getElementById("wishModal");
  if (modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "auto";

    // Reset ảnh
    const polaroidImage = modal.querySelector('.polaroid-image');
    if (polaroidImage) polaroidImage.classList.remove('fade-in');

    // Reset text về nội dung gốc
    const elements = modal.querySelectorAll('.polaroid-text h2, .polaroid-text p, .polaroid-text .signature');
    elements.forEach((el, index) => {
      if (modalOriginalContent[index] !== undefined) {
        el.innerHTML = modalOriginalContent[index];
        el.classList.remove('typewriter-modal');
      }
    });
  }
}

window.addEventListener("click", function (event) {
  const modal = document.getElementById("wishModal");
  if (event.target === modal) {
    closeModal();
  }
});

window.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeModal();
    envelopeWrapper.classList.remove("open");
    isEnvelopeOpen = false;
    if (card) {
      card.classList.remove("animation-done");
    }
    if (clickInstruction) {
      clickInstruction.style.opacity = "1";
    }
  }
});

// ---- HEART TAP → TẮT POPUP, ẨN THƯ, ẢNH BAY LÊN ----
function onHeartTap() {
  // 1. Tắt popup modal
  closeModal();

  // 2. Ẩn lá thư và phong bì
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.classList.add('hidden');
  }

  // 3. Ảnh bay lên lần lượt
  var images = window._allImages || defaultData.data.images;
  launchFlyingImages(images);
}

function launchFlyingImages(images) {
  var container = document.getElementById('flyingImages');
  if (!container || !images || images.length === 0) return;

  // Xóa ảnh cũ nếu có
  container.innerHTML = '';

  var screenW = window.innerWidth;
  var isMobile = screenW <= 480;

  function rand(min, max) { return min + Math.random() * (max - min); }

  // Kích thước ảnh CỐ ĐỊNH hợp lý (không chia theo số ảnh) + biến thiên nhẹ cho tự nhiên.
  // Ảnh gần (to) và xa (nhỏ) đan xen tạo chiều sâu.
  var baseSize = isMobile
    ? Math.min(150, screenW * 0.38)   // mobile: ~110-150px
    : Math.min(200, screenW * 0.16);  // desktop: ~140-200px

  // Bay theo từng đợt: mỗi đợt tối đa 3 ảnh, đợt sau chờ đợt trước bay lên hẳn.
  var BATCH_SIZE = 3;
  var BATCH_INTERVAL = 2200; // khoảng cách giữa các đợt (ms)

  // 3 vùng ngang (trái - giữa - phải) để ảnh trong cùng đợt không đè nhau
  var LANES = [
    [8, 30],
    [38, 62],
    [70, 92]
  ];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var maxDur = 0;
  var maxDelay = 0;
  var laneOrder = shuffle(LANES);

  images.forEach(function(imgSrc, index) {
    // Wrapper lo việc bay lên + mờ dần; ảnh bên trong đung đưa như con lắc.
    // Tách 2 lớp để chuyển động ngang mượt (ease-in-out qua lại) độc lập với chiều dọc.
    var wrap = document.createElement('div');
    wrap.className = 'flying-photo-wrap';

    var img = document.createElement('img');
    img.src = imgSrc;
    img.className = 'flying-photo';

    var batchIndex = Math.floor(index / BATCH_SIZE);
    var posInBatch = index % BATCH_SIZE;

    // Đầu mỗi đợt: xáo lại thứ tự vùng để các đợt không thẳng hàng nhau
    if (posInBatch === 0) laneOrder = shuffle(LANES);

    // Kích thước riêng từng ảnh: 80% - 115% baseSize
    var size = Math.round(baseSize * rand(0.8, 1.15));

    // Mỗi ảnh trong đợt nhận một vùng ngang riêng, random trong vùng đó
    var lane = laneOrder[posInBatch];
    var startX = rand(lane[0], lane[1]);

    // Đung đưa: biên độ, chu kỳ và pha lệch ngẫu nhiên để không ảnh nào giống ảnh nào
    var sway = rand(24, 55);
    var swayDur = rand(2400, 3600);
    var swayDelay = -rand(0, swayDur); // pha bắt đầu ngẫu nhiên
    var tilt = rand(4, 8); // ảnh nghiêng theo chiều đung đưa
    var dur = rand(6500, 9000);
    // Delay theo đợt + jitter nhẹ trong đợt để không xuất phát cùng lúc tuyệt đối
    var delay = batchIndex * BATCH_INTERVAL + rand(0, 500);

    wrap.style.setProperty('--startX', startX + '%');
    wrap.style.setProperty('--dur', dur + 'ms');
    wrap.style.setProperty('--delay', Math.round(delay) + 'ms');

    img.style.setProperty('--size', size + 'px');
    img.style.setProperty('--sway', sway.toFixed(0) + 'px');
    img.style.setProperty('--tilt', tilt.toFixed(1) + 'deg');
    img.style.setProperty('--swayDur', Math.round(swayDur) + 'ms');
    img.style.setProperty('--swayDelay', Math.round(swayDelay) + 'ms');

    if (dur > maxDur) maxDur = dur;
    if (delay > maxDelay) maxDelay = delay;

    wrap.appendChild(img);
    container.appendChild(wrap);
  });

  // Xóa tất cả + hiện lại thư sau khi ảnh cuối cùng bay xong
  var totalTime = maxDelay + maxDur + 500;
  setTimeout(function() {
    container.innerHTML = '';
    var mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.classList.remove('hidden');
    }
    // Reset envelope state
    envelopeWrapper.classList.remove("open");
    isEnvelopeOpen = false;
    if (card) card.classList.remove("animation-done");
    if (clickInstruction) clickInstruction.style.opacity = "1";
    typewriterStarted = false;
  }, totalTime);
}

// ---- ROSE INTRO (WARP TUNNEL) ----
(function initRoseIntro() {
  const roseIntro = document.getElementById('roseIntro');
  const roseWarp = document.getElementById('roseWarp');
  if (!roseIntro || !roseWarp) return;

  const ROSE_IMAGES = [
    'images/rose1.png',
    'images/rose2.png',
    'images/rose3.png',
    'images/rose4.png',
    'images/rose5.png',
    'images/rose6.png'
  ];
  const WARP_COUNT = 90;
  const SPAWN_WINDOW = 4500;
  const MAX_ROSE_DURATION = 3000;
  const FADE_OUT_DELAY = SPAWN_WINDOW + MAX_ROSE_DURATION - 500;
  const AUTO_START_DELAY = 5000;

  let started = false;
  let autoTimer = setTimeout(startWarp, AUTO_START_DELAY);

  function startWarp() {
    if (started) return;
    started = true;
    if (autoTimer) clearTimeout(autoTimer);

    roseIntro.classList.add('flash', 'warping');
    setTimeout(spawnAllRoses, 250);

    setTimeout(() => {
      roseIntro.classList.add('fading');
      const mainContent = document.querySelector('.main-content');
      if (mainContent) mainContent.classList.remove('hidden');
      setTimeout(() => roseIntro.classList.add('gone'), 700);
    }, FADE_OUT_DELAY);
  }

  function spawnAllRoses() {
    const interval = SPAWN_WINDOW / WARP_COUNT;
    for (let i = 0; i < WARP_COUNT; i++) {
      const delay = i * interval + Math.random() * (interval * 0.6);
      setTimeout(createWarpRose, delay);
    }
  }

  function createWarpRose() {
    const img = document.createElement('img');
    img.src = ROSE_IMAGES[Math.floor(Math.random() * ROSE_IMAGES.length)];
    img.className = 'warp-rose';
    img.alt = '';

    const xRange = window.innerWidth * 0.7;
    const yRange = window.innerHeight * 0.7;
    const x = (Math.random() - 0.5) * xRange;
    const y = (Math.random() - 0.5) * yRange;

    const rs = Math.random() * 360;
    const re = rs + (Math.random() - 0.5) * 540;

    const viewportMin = Math.min(window.innerWidth, window.innerHeight);
    const sizeScale = Math.max(0.45, Math.min(1, viewportMin / 800));
    const size = (60 + Math.random() * 120) * sizeScale;
    const duration = 2200 + Math.random() * 800;

    img.style.setProperty('--x', x + 'px');
    img.style.setProperty('--y', y + 'px');
    img.style.setProperty('--rs', rs + 'deg');
    img.style.setProperty('--re', re + 'deg');
    img.style.setProperty('--size', size + 'px');
    img.style.setProperty('--dur', duration + 'ms');

    roseWarp.appendChild(img);
    setTimeout(() => img.remove(), duration + 200);
  }

  roseIntro.addEventListener('click', startWarp);
})();
