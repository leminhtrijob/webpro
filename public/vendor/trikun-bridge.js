/**
 * TriKun Studio Universal Gift Bridge v3.0
 * - Chạy đầu <head> của toàn bộ 48 engine mẫu HTML/CSS/JS local
 * - Tự động chuẩn hóa URL pathname/search/hash cho từng loại engine (React Router, Next.js App Router, Vite, Vanilla)
 *   sau khi đã lưu lại mã quà TriKun (?id=TK... / ?data=...) vào biến closure.
 * - Tự động cung cấp bộ 6 ảnh Demo cực cute (/demo/photos/1.jpg..6.jpg) & nhạc nền lãng mạn (/demo/music/romantic.mp3)
 * - Tự động chặn (intercept) mọi request fetch/XHR tới API cũ (lovegift.online, deargift.online, dlove.vn)
 *   và trả về dữ liệu chuẩn kết hợp với MongoDB TriKun (/api/gifts?id=...).
 * - Tự động chữa lành (auto-heal) 100% thẻ <img> bị lỗi sang ảnh demo cute local.
 */
(function () {
  if (typeof window === 'undefined' || window.__TRIKUN_BRIDGE_LOADED__) return;
  window.__TRIKUN_BRIDGE_LOADED__ = true;

  var NativeFetch = window.fetch ? window.fetch.bind(window) : null;

  // Lưu lại tham số gốc từ URL trước khi chuẩn hóa route cho các SPA (React Router / Next.js)
  var initialParams = new URLSearchParams(window.location.search);
  var initialGiftId = initialParams.get('id') || '';
  var initialDataParam = initialParams.get('data') || '';
  var initialPathname = window.location.pathname || '';

  var DEMO_PHOTOS = [
    '/demo/photos/1.jpg?v=chibi',
    '/demo/photos/2.jpg?v=chibi',
    '/demo/photos/3.jpg?v=chibi',
    '/demo/photos/4.jpg?v=chibi',
    '/demo/photos/5.jpg?v=chibi',
    '/demo/photos/6.jpg?v=chibi'
  ];

  var DEMO_MESSAGES = [
    'Luôn luôn bên nhau ♡',
    'Yêu em nhiều lắm 💖',
    'Cảm ơn vì đã đến bên anh ✨',
    'Mãi là của nhau nhé 🌹',
    'Em là cả thế giới của anh 💝',
    'Thương em nhất trên đời 💕'
  ];

  var DEFAULT_GIFT = {
    recipientName: 'Bé Yêu ♡',
    senderName: 'Người Thương Của Em',
    letterTitle: 'Gửi Người Làm Thế Giới Của Anh Dịu Lại ♡',
    letterContent:
      'Cảm ơn em vì đã luôn ở bên, mang đến thật nhiều nụ cười và những khoảnh khắc ngọt ngào nhất. Chúc người anh thương luôn xinh đẹp, rạng rỡ, bình yên và hạnh phúc mỗi ngày nhé! Yêu em thật nhiều ♡',
    images: DEMO_PHOTOS.slice(),
    messages: DEMO_MESSAGES.slice(),
    musicUrl: '/demo/music/romantic.mp3',
    musicTitle: 'Giai Điệu Tình Yêu - TriKun Studio',
    passcodeEnabled: false,
    passcode: '',
    passcodeHint: '',
    particleColor: '#ff4f86'
  };

  var currentGift = JSON.parse(JSON.stringify(DEFAULT_GIFT));
  var giftResolvePromise = null;
  var audioEl = null;
  var isMusicPlaying = false;
  var passcodeUnlocked = false;

  window.IS_DEMO_MODE = true;

  // ==================== 1. AUTO-HEAL BROKEN IMAGES ====================
  var healCounter = 0;
  function getNextDemoPhoto(seedStr) {
    if (seedStr) {
      var sum = 0;
      for (var i = 0; i < seedStr.length; i++) sum += seedStr.charCodeAt(i);
      return DEMO_PHOTOS[sum % DEMO_PHOTOS.length];
    }
    var p = DEMO_PHOTOS[healCounter % DEMO_PHOTOS.length];
    healCounter++;
    return p;
  }

  window.addEventListener(
    'error',
    function (e) {
      var el = e && e.target;
      if (el && el.tagName === 'IMG') {
        var curSrc = el.getAttribute('src') || '';
        if (el.dataset.tkHealed === '2') return;
        el.dataset.tkHealed = el.dataset.tkHealed === '1' ? '2' : '1';
        var pool =
          currentGift && Array.isArray(currentGift.images) && currentGift.images.length > 0
            ? currentGift.images
            : DEMO_PHOTOS;
        var replacement = pool[healCounter % pool.length] || getNextDemoPhoto(curSrc);
        healCounter++;
        if (curSrc !== replacement) {
          el.src = replacement;
        }
      }
    },
    true
  );

  // ==================== 2. BUILD UNIFIED API PAYLOAD ====================
  function normalizeGiftConfig(raw) {
    raw = raw || {};
    var validImgs = Array.isArray(raw.images)
      ? raw.images.filter(function (u) {
          return (
            typeof u === 'string' &&
            u.trim() &&
            !u.includes('trikun-photo-placeholder.svg') &&
            !u.includes('trikun-heart.svg')
          );
        })
      : [];
    var imgs = validImgs.length > 0 ? validImgs : DEMO_PHOTOS.slice();

    var rawMusic = raw.musicUrl || raw.bgMusic || raw.music || '';
    if (!rawMusic || rawMusic.includes('trikun-theme.wav')) {
      rawMusic = DEFAULT_GIFT.musicUrl;
    }

    var msgs =
      Array.isArray(raw.messages) && raw.messages.length > 0
        ? raw.messages.slice()
        : [
            raw.recipientName ? 'Gửi ' + raw.recipientName + ' ♡' : DEMO_MESSAGES[0],
            raw.letterTitle || DEMO_MESSAGES[1],
            DEMO_MESSAGES[2],
            DEMO_MESSAGES[3],
            raw.senderName ? 'Thương yêu từ ' + raw.senderName + ' 💕' : DEMO_MESSAGES[4]
          ];

    return {
      recipientName: raw.recipientName || DEFAULT_GIFT.recipientName,
      senderName: raw.senderName || DEFAULT_GIFT.senderName,
      letterTitle: raw.letterTitle || DEFAULT_GIFT.letterTitle,
      letterContent: raw.letterContent || DEFAULT_GIFT.letterContent,
      images: imgs,
      messages: msgs,
      musicUrl: rawMusic,
      musicTitle: raw.musicTitle || DEFAULT_GIFT.musicTitle,
      passcodeEnabled: !!raw.passcodeEnabled,
      passcode: raw.passcode || '',
      passcodeHint: raw.passcodeHint || '',
      particleColor: raw.particleColor || DEFAULT_GIFT.particleColor
    };
  }

  function buildUniversalApiPayload(g) {
    g = normalizeGiftConfig(g);
    var fullLetterText =
      'Gửi ' +
      g.recipientName +
      ',\n\n' +
      g.letterContent +
      '\n\nThương gửi,\n' +
      g.senderName +
      ' ♡';

    var payloadData = {
      allowed: true,
      websiteId: 'trikun-gift',
      status: 'PAID',
      productType: 'photobouquet',
      appTitle: g.letterTitle || 'Gửi ' + g.recipientName,
      websiteTitle: g.letterTitle || 'Gửi ' + g.recipientName,
      title: g.letterTitle || 'Gửi ' + g.recipientName,
      subtitle: 'Món quà dành tặng ' + g.recipientName,
      recipientName: g.recipientName,
      senderName: g.senderName,
      appIcon: '/assets/images/icons/couple.png',
      enableMorphEffect: true,
      enablePasscode: false,
      enableSphere: true,
      enableSphereFlyingImages: true,
      enableLetter: true,
      enableRain: true,
      flyingHearts: true,
      enableCentralHeart: true,
      centralHeartEnabled: true,
      enableMeteorFeature: true,
      meteorEnabled: true,
      showWatermark: false,
      expiresAt: null,
      palette: 'hongdon',
      color: g.particleColor || '#ff4f86',
      colors: g.particleColor || '#ff6b9d',
      icons: ['♥', '💖', '❤️', '💕', '🌹', '✨'],
      isHeart: true,
      textHeart: g.recipientName,
      text3d: {
        text: g.recipientName,
        color: '#ff69b4'
      },
      fontStyle: 'default',
      countdown: 3,
      matrixText: 'LOVE',
      matrixColor1: '#ff69b4',
      matrixColor2: '#ff1493',
      sequence: 'HAPPY|SPECIAL|DAY|' + (g.recipientName || 'BÉ YÊU').toUpperCase(),
      sequenceColor: '#ff69b4',
      morphTexts: [g.recipientName, g.senderName, 'Forever Love ♥'],
      particleImage: '/assets/images/characters/bearflower.png',
      messages: g.messages,
      flyingTexts: g.messages,
      images: g.images,
      photos: g.images,
      flowerImages: g.images,
      imageUrls: g.images,
      sphereImages: g.images,
      flyingImages: g.images,
      bouquetImages: g.images.slice(0, 6),
      bgMusic: g.musicUrl,
      audioUrl: g.musicUrl,
      music: g.musicUrl,
      song: g.musicUrl,
      letterTitle: g.letterTitle,
      letterContent: g.letterContent,
      letterSignature: g.senderName,
      envelopeText: 'Gửi ' + g.recipientName + ' ♡',
      letter: {
        style: 'pink',
        text: fullLetterText,
        image: g.images[0],
        photo: g.images[0],
        caption: g.senderName + ' ♡',
        envelope: {
          topLine: 'Món quà gửi tặng',
          headline: g.recipientName,
          bottomLine: 'Từ ' + g.senderName + ' ♡'
        }
      },
      config: null,
      settings: {
        toName: g.recipientName,
        fromName: g.senderName,
        intro: 'Gửi ' + g.recipientName + ' — Chạm để mở món quà đặc biệt ♡',
        introTitle: g.letterTitle,
        title: g.letterTitle,
        subtitle: 'Dành tặng ' + g.recipientName,
        titleMessage: g.letterTitle,
        message: g.letterContent,
        popupMessage: g.letterContent,
        modalTitle: g.letterTitle,
        modalContent: g.letterContent,
        cardText: 'Gửi ' + g.recipientName,
        finalMessage: g.letterContent,
        textBack: 'Thương gửi từ ' + g.senderName + ' ♡',
        letterTitle: g.letterTitle,
        letterContent: g.letterContent,
        letterSignature: g.senderName,
        envelopeText: 'Gửi\n' + g.recipientName + '\n♡',
        sequence: 'HAPPY|SPECIAL|DAY|' + (g.recipientName || 'BÉ YÊU').toUpperCase(),
        matrixText: 'LOVE',
        countdown: 3,
        arrayText: g.messages,
        listText: g.messages,
        messages: g.messages,
        image: g.images,
        images: g.images,
        photos: g.images,
        music: g.musicUrl,
        color: g.particleColor || '#ff4f86'
      }
    };
    payloadData.config = Object.assign({}, payloadData);

    return {
      success: true,
      data: payloadData,
      settings: payloadData.settings
    };
  }

  // ==================== 3. SYNC TO LOCALSTORAGE & WINDOW GLOBALS ====================
  function syncGlobalsAndStorage(g) {
    g = normalizeGiftConfig(g);
    currentGift = g;
    var universal = buildUniversalApiPayload(g);
    var d = universal.data;

    try {
      window.settings = Object.assign({}, window.settings || {}, {
        letterTitle: g.letterTitle,
        letterContent: g.letterContent,
        letterSignature: g.senderName,
        envelopeText: 'Gửi\n' + g.recipientName + '\n♡',
        photos: g.images
      });

      window.LOVEGIFT_IMAGES = g.images.slice();
      localStorage.setItem('TRUNGTHUV2_CONFIG', JSON.stringify(d));
      localStorage.setItem(
        'deargift_demo_data',
        JSON.stringify({
          messages: g.messages,
          icons: ['♥', '💖', '❤️', '💕', '✨'],
          colors: g.particleColor || '#ff6b9d',
          images: g.images,
          song: g.musicUrl,
          isHeart: true,
          textHeart: g.recipientName,
          isSave: true,
          createdAt: new Date().toISOString()
        })
      );
      localStorage.setItem('WOMENDAY_CONFIG', JSON.stringify(d));
    } catch (e) {}
  }

  // Khởi tạo ngay lập tức trước khi script của template chạy
  syncGlobalsAndStorage(DEFAULT_GIFT);

  // Chuẩn hóa URL cho từng loại engine để kích hoạt đúng Viewer Mode mà không bao giờ nhảy sang trang Editor/404
  try {
    var curUrl = new URL(window.location.href);
    var p = initialPathname;
    var activeId = initialGiftId || 'TRIKUN_DEMO';

    if (/\/dlove-(?:1|2|5|6)\//.test(p)) {
      curUrl.searchParams.set('preview', '1');
      window.history.replaceState(null, '', curUrl.pathname + '?' + curUrl.searchParams.toString());
    } else if (p.includes('/dlove-7/')) {
      window.history.replaceState(null, '', '/galaxy-viewer.html?demo=1');
    } else if (p.includes('/dlove-8/')) {
      window.history.replaceState(null, '', curUrl.pathname + '#id=' + encodeURIComponent(activeId));
    } else if (p.includes('/dlove-9/') || p.includes('/dlove-4/')) {
      curUrl.searchParams.set('id', activeId);
      window.history.replaceState(null, '', curUrl.pathname + '?' + curUrl.searchParams.toString());
    } else if (p.includes('/dlove-10/') || p.includes('/dlove-11/')) {
      curUrl.searchParams.set('websiteId', activeId);
      window.history.replaceState(null, '', curUrl.pathname + '?' + curUrl.searchParams.toString());
    } else if (/\/lovegift-(?:3|8|9|12|16|17)\//.test(p)) {
      // Các mẫu Next.js App Router static export cần pathname là "/" để hydrate không lỗi route
      window.history.replaceState(null, '', '/?id=' + encodeURIComponent(activeId));
    } else if (p.includes('/lovegift-')) {
      curUrl.searchParams.set('id', activeId);
      window.history.replaceState(null, '', curUrl.pathname + '?' + curUrl.searchParams.toString());
    }
  } catch (e) {}

  // ==================== 4. RESOLVE GIFT FROM TRIKUN MONGODB / LZSTRING ====================
  function resolveInitialGift() {
    if (giftResolvePromise) return giftResolvePromise;

    if (initialDataParam) {
      try {
        if (window.LZString) {
          var dec = window.LZString.decompressFromEncodedURIComponent(initialDataParam);
          if (dec) {
            var parsed = normalizeGiftConfig(JSON.parse(dec));
            syncGlobalsAndStorage(parsed);
            giftResolvePromise = Promise.resolve(parsed);
            return giftResolvePromise;
          }
        }
      } catch (e) {}
    }

    if (initialGiftId && initialGiftId !== 'TRIKUN_DEMO' && NativeFetch) {
      giftResolvePromise = NativeFetch('/api/gifts?id=' + encodeURIComponent(initialGiftId) + '&view=1')
        .then(function (r) {
          return r.json();
        })
        .then(function (res) {
          if (res && res.success && res.data) {
            var merged = normalizeGiftConfig(res.data);
            syncGlobalsAndStorage(merged);
            return merged;
          }
          return currentGift;
        })
        .catch(function () {
          return currentGift;
        });
      return giftResolvePromise;
    }

    giftResolvePromise = Promise.resolve(currentGift);
    return giftResolvePromise;
  }

  // ==================== 5. INTERCEPT FETCH & XHR TO LEGACY EXTERNAL APIS ====================
  function isLegacyGiftApi(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    return (
      urlStr.includes('lovegift.online/api/settings') ||
      urlStr.includes('apiv2.deargift.online/api') ||
      urlStr.includes('api.deargift.online/api') ||
      urlStr.includes('localhost:5002/api')
    );
  }

  if (NativeFetch) {
    window.fetch = function (input, init) {
      var urlStr = typeof input === 'string' ? input : input && input.url ? input.url : String(input);
      if (isLegacyGiftApi(urlStr)) {
        return resolveInitialGift().then(function (g) {
          var bodyObj = buildUniversalApiPayload(g);
          return new Response(JSON.stringify(bodyObj), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        });
      }
      return NativeFetch(input, init);
    };
  }

  // ==================== 6. FLOATING UI, LOVE LETTER MODAL & MUSIC PLAYER ====================
  function injectStyles() {
    if (document.getElementById('trikun-bridge-styles')) return;
    var style = document.createElement('style');
    style.id = 'trikun-bridge-styles';
    style.textContent = [
      '/* Ẩn các banner chế độ demo, nút cài đặt cũ hoặc watermark bên thứ ba */',
      '#demoModeBanner1, #demoModeBanner2, #demoModeBanner3, #btnBackToCreate,',
      '.nhan-xemthu, .dau-dlove, #settingsButton, #settingsHint, #settingsModal,',
      '#google_translate_element, #langSwitchBtn, #logoutBtn { display: none !important; }',
      '#trikun-floating-bar {',
      '  position: fixed; bottom: 18px; left: 72px; z-index: 99990;',
      '  display: flex; align-items: center; gap: 10px; font-family: system-ui, -apple-system, sans-serif;',
      '}',
      '.tk-crystal-btn {',
      '  display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;',
      '  border-radius: 999px; border: 1.5px solid rgba(255, 182, 219, 0.75);',
      '  background: linear-gradient(135deg, rgba(255, 30, 106, 0.88), rgba(147, 51, 234, 0.88));',
      '  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);',
      '  color: #fff; font-size: 13px; font-weight: 800; cursor: pointer;',
      '  box-shadow: 0 8px 25px rgba(255, 30, 106, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.7);',
      '  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); user-select: none;',
      '}',
      '.tk-crystal-btn:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 12px 30px rgba(255, 30, 106, 0.65); }',
      '.tk-crystal-btn:active { transform: scale(0.96); }',
      '.tk-music-btn {',
      '  width: 40px; height: 40px; padding: 0; justify-content: center; border-radius: 50%;',
      '  background: rgba(255, 255, 255, 0.92); color: #FF1E6A; border: 1.5px solid #FFB3D1;',
      '}',
      '.tk-music-btn.playing { animation: tkSpin 5s linear infinite; background: linear-gradient(135deg, #FF1E6A, #A838FF); color: #fff; }',
      '@keyframes tkSpin { 100% { transform: rotate(360deg); } }',
      '#trikun-letter-modal {',
      '  position: fixed; inset: 0; z-index: 99995; display: none; align-items: center; justify-content: center;',
      '  padding: 18px; background: rgba(14, 5, 24, 0.72); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);',
      '  font-family: system-ui, -apple-system, sans-serif;',
      '}',
      '#trikun-letter-modal.open { display: flex; animation: tkFadeIn 0.28s ease-out; }',
      '@keyframes tkFadeIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }',
      '.tk-modal-card {',
      '  width: 100%; max-width: 480px; max-height: 86vh; overflow-y: auto;',
      '  background: linear-gradient(180deg, rgba(255, 250, 253, 0.97) 0%, rgba(255, 240, 248, 0.97) 100%);',
      '  border: 2px solid #FFB8D5; border-radius: 28px; padding: 24px;',
      '  box-shadow: 0 24px 60px rgba(255, 22, 128, 0.35), inset 0 2px 3px #fff;',
      '  color: #29104E; position: relative;',
      '}',
      '.tk-modal-close {',
      '  position: absolute; top: 16px; right: 16px; width: 34px; height: 34px; border-radius: 50%;',
      '  border: 1px solid #FFD0E3; background: #fff; color: #FF1E6A; font-weight: 900; font-size: 16px;',
      '  cursor: pointer; display: flex; align-items: center; justify-content: center;',
      '}',
      '.tk-modal-badge {',
      '  display: inline-flex; align-items: center; gap: 6px; padding: 5px 13px; border-radius: 999px;',
      '  background: linear-gradient(90deg, #FFE3F0, #F3E5FF); color: #D9006C; font-size: 11px; font-weight: 800;',
      '  margin-bottom: 12px;',
      '}',
      '.tk-modal-title { font-size: 21px; font-weight: 900; color: #29104E; margin: 0 0 12px; line-height: 1.35; }',
      '.tk-modal-body {',
      '  font-size: 14.5px; line-height: 1.75; color: #4A2556; white-space: pre-line;',
      '  background: rgba(255, 255, 255, 0.78); border: 1px solid #FFD8E8; border-radius: 18px; padding: 16px;',
      '}',
      '.tk-modal-gallery {',
      '  display: grid; grid-template-columns: repeat(auto-fill, minmax(115px, 1fr)); gap: 10px; margin-top: 14px;',
      '}',
      '.tk-modal-gallery img {',
      '  width: 100%; height: 115px; object-fit: cover; border-radius: 14px; border: 2px solid #fff;',
      '  box-shadow: 0 6px 14px rgba(255, 30, 106, 0.16); cursor: pointer; transition: transform 0.2s;',
      '}',
      '.tk-modal-gallery img:hover { transform: scale(1.04); }',
      '.tk-modal-footer {',
      '  margin-top: 16px; padding-top: 12px; border-top: 1px dashed #FFB8D5;',
      '  display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: #7A4B88; font-weight: 700;',
      '}',
      '.tk-modal-sender { color: #FF1E6A; font-weight: 900; font-size: 14px; }',
      '#trikun-passcode-gate {',
      '  position: fixed; inset: 0; z-index: 99999; display: none; flex-direction: column;',
      '  align-items: center; justify-content: center; padding: 20px;',
      '  background: radial-gradient(circle at center, rgba(45, 12, 68, 0.96), rgba(12, 4, 22, 0.99));',
      '  backdrop-filter: blur(20px); color: #fff; font-family: system-ui, -apple-system, sans-serif;',
      '}',
      '#trikun-passcode-gate.active { display: flex; }',
      '.tk-pass-box {',
      '  width: 100%; max-width: 350px; background: rgba(255, 255, 255, 0.1);',
      '  border: 1.5px solid rgba(255, 182, 224, 0.45); border-radius: 28px; padding: 26px 22px;',
      '  text-align: center; box-shadow: 0 20px 55px rgba(255, 22, 128, 0.35);',
      '}',
      '.tk-pass-input {',
      '  width: 100%; box-sizing: border-box; margin-top: 14px; padding: 12px 16px; border-radius: 14px;',
      '  border: 1.5px solid rgba(255, 182, 224, 0.6); background: rgba(0, 0, 0, 0.35);',
      '  color: #fff; font-size: 18px; font-weight: 800; text-align: center; letter-spacing: 6px; outline: none;',
      '}',
      '.tk-pass-submit {',
      '  width: 100%; margin-top: 12px; padding: 12px; border-radius: 14px; border: none;',
      '  background: linear-gradient(90deg, #FF1E6A, #A838FF); color: #fff; font-weight: 900; font-size: 14px; cursor: pointer;',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureUI() {
    if (!document.body) return;
    injectStyles();

    if (!document.getElementById('trikun-floating-bar')) {
      var bar = document.createElement('div');
      bar.id = 'trikun-floating-bar';
      bar.innerHTML = [
        '<button type="button" id="tk-open-letter-btn" class="tk-crystal-btn" title="Xem thư tình & ảnh kỷ niệm">',
        '  <span>💌</span>',
        '  <span id="tk-recipient-pill">Thư gửi Bé Yêu ♡</span>',
        '</button>',
        '<button type="button" id="tk-toggle-music-btn" class="tk-crystal-btn tk-music-btn" title="Bật / Tắt nhạc nền">',
        '  <span>🎵</span>',
        '</button>'
      ].join('');
      document.body.appendChild(bar);

      document.getElementById('tk-open-letter-btn').addEventListener('click', function () {
        var modal = document.getElementById('trikun-letter-modal');
        if (modal) modal.classList.add('open');
      });

      document.getElementById('tk-toggle-music-btn').addEventListener('click', function () {
        toggleMusic();
      });
    }

    if (!document.getElementById('trikun-letter-modal')) {
      var modal = document.createElement('div');
      modal.id = 'trikun-letter-modal';
      modal.innerHTML = [
        '<div class="tk-modal-card" id="tk-modal-card">',
        '  <button type="button" class="tk-modal-close" id="tk-close-letter-btn">✕</button>',
        '  <div class="tk-modal-badge">✨ Món Quà Yêu Thương • TriKun Studio</div>',
        '  <h3 class="tk-modal-title" id="tk-letter-title">Gửi Người Thương ♡</h3>',
        '  <div class="tk-modal-body" id="tk-letter-content"></div>',
        '  <div class="tk-modal-gallery" id="tk-letter-gallery"></div>',
        '  <div class="tk-modal-footer">',
        '    <span>Người gửi tặng:</span>',
        '    <span class="tk-modal-sender" id="tk-letter-sender">Trí Kun ♡</span>',
        '  </div>',
        '</div>'
      ].join('');
      document.body.appendChild(modal);

      modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.classList.remove('open');
      });
      document.getElementById('tk-close-letter-btn').addEventListener('click', function () {
        modal.classList.remove('open');
      });
    }

    if (!document.getElementById('trikun-passcode-gate')) {
      var gate = document.createElement('div');
      gate.id = 'trikun-passcode-gate';
      gate.innerHTML = [
        '<div class="tk-pass-box">',
        '  <div style="font-size:36px;margin-bottom:8px;">🔒</div>',
        '  <h3 style="margin:0 0 6px;font-size:18px;font-weight:900;">Món Quà Được Bảo Mật</h3>',
        '  <p id="tk-pass-hint" style="margin:0;font-size:12.5px;color:#FFB8D5;">Nhập mật khẩu kỷ niệm để mở quà nhé ♡</p>',
        '  <input type="password" id="tk-pass-input" class="tk-pass-input" placeholder="••••" />',
        '  <p id="tk-pass-err" style="margin:6px 0 0;font-size:12px;color:#FF4F86;display:none;">Mật khẩu chưa đúng, thử lại nhé!</p>',
        '  <button type="button" id="tk-pass-submit" class="tk-pass-submit">Mở Quà Ngay ♡</button>',
        '</div>'
      ].join('');
      document.body.appendChild(gate);

      var checkPass = function () {
        if (!currentGift || !currentGift.passcode) {
          gate.classList.remove('active');
          return;
        }
        var val = (document.getElementById('tk-pass-input').value || '').trim();
        if (val === String(currentGift.passcode).trim()) {
          passcodeUnlocked = true;
          gate.classList.remove('active');
          playMusicIfAllowed();
        } else {
          document.getElementById('tk-pass-err').style.display = 'block';
        }
      };

      document.getElementById('tk-pass-submit').addEventListener('click', checkPass);
      document.getElementById('tk-pass-input').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') checkPass();
      });
    }
  }

  function hasActiveTemplateAudio() {
    var audios = document.querySelectorAll('audio');
    for (var i = 0; i < audios.length; i++) {
      if (!audios[i].paused && audios[i].currentTime > 0) return true;
    }
    return false;
  }

  function toggleMusic() {
    var existingAudio = document.querySelector('audio[src]:not([src=""])');
    var targetAudio = existingAudio || audioEl;

    if (!targetAudio) {
      var src = (currentGift && currentGift.musicUrl) || DEFAULT_GIFT.musicUrl;
      audioEl = new Audio(src);
      audioEl.loop = true;
      audioEl.volume = 0.65;
      targetAudio = audioEl;
    }

    var btn = document.getElementById('tk-toggle-music-btn');
    if (isMusicPlaying || !targetAudio.paused) {
      targetAudio.pause();
      isMusicPlaying = false;
      if (btn) btn.classList.remove('playing');
    } else {
      targetAudio
        .play()
        .then(function () {
          isMusicPlaying = true;
          if (btn) btn.classList.add('playing');
        })
        .catch(function () {});
    }
  }

  function playMusicIfAllowed() {
    if (hasActiveTemplateAudio()) {
      var btn = document.getElementById('tk-toggle-music-btn');
      if (btn) btn.classList.add('playing');
      return;
    }
    if (!audioEl) {
      var src = (currentGift && currentGift.musicUrl) || DEFAULT_GIFT.musicUrl;
      audioEl = new Audio(src);
      audioEl.loop = true;
      audioEl.volume = 0.65;
    }
    if (!isMusicPlaying) {
      audioEl
        .play()
        .then(function () {
          isMusicPlaying = true;
          var btn = document.getElementById('tk-toggle-music-btn');
          if (btn) btn.classList.add('playing');
        })
        .catch(function () {});
    }
  }

  function applyGiftDataToUI(gift) {
    if (!gift) return;
    gift = normalizeGiftConfig(gift);
    syncGlobalsAndStorage(gift);
    ensureUI();

    var pill = document.getElementById('tk-recipient-pill');
    if (pill) {
      pill.textContent = 'Thư gửi ' + gift.recipientName;
    }

    var titleEl = document.getElementById('tk-letter-title');
    if (titleEl) {
      titleEl.textContent = gift.letterTitle || 'Gửi ' + gift.recipientName + ' ♡';
    }

    var contentEl = document.getElementById('tk-letter-content');
    if (contentEl) {
      contentEl.textContent = gift.letterContent;
    }

    var senderEl = document.getElementById('tk-letter-sender');
    if (senderEl) {
      senderEl.textContent = gift.senderName + ' ♡';
    }

    var galleryEl = document.getElementById('tk-letter-gallery');
    if (galleryEl) {
      galleryEl.innerHTML = '';
      gift.images.forEach(function (imgUrl) {
        if (!imgUrl) return;
        var img = document.createElement('img');
        img.src = imgUrl;
        img.alt = 'Ảnh kỷ niệm';
        img.addEventListener('click', function () {
          window.open(imgUrl, '_blank');
        });
        galleryEl.appendChild(img);
      });
    }

    var gate = document.getElementById('trikun-passcode-gate');
    if (gate) {
      if (gift.passcodeEnabled && gift.passcode && !passcodeUnlocked) {
        var hint = document.getElementById('tk-pass-hint');
        if (hint) {
          hint.textContent = gift.passcodeHint
            ? 'Gợi ý: ' + gift.passcodeHint
            : 'Nhập mật khẩu kỷ niệm để mở quà nhé ♡';
        }
        gate.classList.add('active');
      } else {
        gate.classList.remove('active');
      }
    }

    if (audioEl && gift.musicUrl && audioEl.src !== gift.musicUrl) {
      var wasPlaying = isMusicPlaying;
      audioEl.src = gift.musicUrl;
      if (wasPlaying) audioEl.play().catch(function () {});
    }
  }

  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (msg && msg.type === 'TRIKUN_LIVE_CONFIG' && msg.config) {
      applyGiftDataToUI(msg.config);
    }
  });

  function initOnDomReady() {
    ensureUI();
    applyGiftDataToUI(currentGift);
    resolveInitialGift().then(function (g) {
      applyGiftDataToUI(g);
    });

    var unlockAudioOnce = function () {
      playMusicIfAllowed();
      document.removeEventListener('click', unlockAudioOnce);
      document.removeEventListener('touchstart', unlockAudioOnce);
    };
    document.addEventListener('click', unlockAudioOnce, { passive: true });
    document.addEventListener('touchstart', unlockAudioOnce, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnDomReady);
  } else {
    initOnDomReady();
  }
})();
