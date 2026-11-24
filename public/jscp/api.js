/**
 * 20-11/jscp/api.js — V2 atomic flow wrapper cho template teachersday.
 *
 * Ported từ V1 BirthdayAPI sang V2 atomic endpoint:
 *   POST /api/v2/websites/teachersday   → 1 round-trip tạo website + payment
 *   GET  /api/v2/access/teachersday/:id → viewer mode
 *   POST /api/v2/uploads/presign        → R2 presigned upload
 *
 * GIỮ NGUYÊN API surface của BirthdayAPI class (createBirthdayWebsite,
 * getBirthdayWebsiteByWebsiteId, uploadImageToR2, uploadAudioToR2,
 * createShareableURL, getWebsiteIdFromURL) để main.js không phải refactor
 * toàn diện — chỉ patch nhánh handlePaidCreation + processPayment để dùng
 * paymentUrl trả về từ atomic call.
 *
 * Khác V1:
 *   - createBirthdayWebsite trả về thêm { paymentUrl, orderCode } để main.js
 *     skip /api/payment/create.
 *   - getBirthdayWebsiteByWebsiteId map V2 flat config → V1 settings shape
 *     để code render (settings.js loadWebsiteFromServer) không phải sửa.
 *   - uploadImageToR2 / uploadAudioToR2 dùng presigned R2 (V2) thay vì proxy
 *     /api/r2/upload (V1).
 */

(function () {
    const API_BASE      = window.API_BASE      || 'https://apiv2.deargift.online/api/v2';
    const TEMPLATE_TYPE = window.TEMPLATE_TYPE || 'teachersday';

    // ── Referral (mã giới thiệu CTV ?ref=CODE) ───────────────────────────────
    // Khách vào từ link CTV → lưu mã (localStorage, 60 ngày, last-click-wins).
    // Khi tạo website gửi kèm referralCode để BE giảm giá đơn đầu + ghi hoa hồng.
    const REF_KEY = 'dg_ref';
    const REF_RE = /^[A-Z0-9]{4,12}$/i;
    function captureReferralFromUrl() {
        try {
            const raw = new URLSearchParams(window.location.search).get('ref');
            if (!raw) return;
            const code = raw.trim().toUpperCase();
            if (!REF_RE.test(code)) return;
            localStorage.setItem(REF_KEY, JSON.stringify({ code, savedAt: Date.now() }));
        } catch (_) { /* noop */ }
    }
    function getStoredReferralCode() {
        try {
            const raw = localStorage.getItem(REF_KEY);
            if (!raw) return null;
            const { code, savedAt } = JSON.parse(raw);
            if (!code || !savedAt) return null;
            if (Date.now() - savedAt > 60 * 86400000) { localStorage.removeItem(REF_KEY); return null; }
            return code;
        } catch (_) { return null; }
    }
    captureReferralFromUrl();

    // ── Helpers ─────────────────────────────────────────────────────────────

    function dataURLtoFile(dataurl, filename) {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new File([u8arr], filename, { type: mime });
    }

    function buildIdempotencyKey() {
        // crypto.randomUUID là chuẩn modern; fallback random hex nếu thiếu.
        if (window.crypto?.randomUUID) return window.crypto.randomUUID();
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * R2 presigned upload — 2 round-trip:
     *   1) POST /uploads/presign → { uploadUrl, publicUrl }
     *   2) PUT uploadUrl (direct to R2) với binary file
     * Trả về URL công khai của file.
     *
     * @param {File} file
     * @param {string} fileType - 'image' | 'audio'
     */
    async function presignAndPut(file, fileType) {
        const jwt = window.getJwt?.();
        const presignRes = await fetch(`${API_BASE}/uploads/presign`, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(jwt ? { 'Authorization': 'Bearer ' + jwt } : {}),
            },
            body: JSON.stringify({
                templateType: TEMPLATE_TYPE,
                fileType,
                contentType: file.type || (fileType === 'audio' ? 'audio/mpeg' : 'image/png'),
                fileSizeBytes: file.size,
            }),
        });
        const presignData = await presignRes.json();
        if (!presignRes.ok || !presignData.success) {
            throw new Error(presignData.error?.message || presignData.message || 'Presign upload thất bại');
        }

        const { uploadUrl, publicUrl, fileUrl: legacyFileUrl } = presignData.data || presignData;
        const fileUrl = publicUrl || legacyFileUrl;
        if (!uploadUrl || !fileUrl) throw new Error('Presign response thiếu uploadUrl/publicUrl');

        // PUT direct lên R2 — không có Authorization header (signed URL đã chứa token).
        const putRes = await fetch(uploadUrl, {
            method:  'PUT',
            headers: { 'Content-Type': file.type || (fileType === 'audio' ? 'audio/mpeg' : 'image/png') },
            body:    file,
        });
        if (!putRes.ok) {
            throw new Error(`Upload R2 PUT thất bại (HTTP ${putRes.status})`);
        }
        return fileUrl;
    }

    /**
     * Map V1 settings (legacy 20-11) → V2 config payload cho schema teachersday.
     * V1 dùng `music` (preset hoặc URL upload) — V2 schema dùng `bgMusic` (cùng
     * format alternation). Đa số field name trùng nhau, chỉ chuẩn hoá preset path.
     */
    function buildV2Config(settings) {
        // Normalize preset music: legacy lưu `./music/<name>.mp3` (dot-prefix).
        // V2 schema chỉ accept `music/<name>.mp3` (no dot). Strip leading `./` hoặc `/`.
        let bgMusic = (settings.music || '').trim();
        if (bgMusic.startsWith('./'))  bgMusic = bgMusic.slice(2);
        else if (bgMusic.startsWith('/')) bgMusic = bgMusic.slice(1);
        // Nếu là http(s) URL hoặc match `music/<name>.mp3` → giữ. Khác = preset
        // không hợp lệ → để rỗng (viewer sẽ fallback nhạc default).
        if (bgMusic && !/^https?:\/\//.test(bgMusic) && !/^music\/[A-Za-z0-9_.\-]+\.mp3$/.test(bgMusic)) {
            bgMusic = '';
        }

        // Photos: V1 settings.photos là array URL (đã upload R2 ở prepareCompleteSettings).
        // Chỉ accept http(s) URL — strip preset paths (sẽ free khi viewer load asset bundle).
        const photos = Array.isArray(settings.photos)
            ? settings.photos.filter(p => typeof p === 'string' && /^https?:\/\//.test(p))
            : [];

        return {
            websiteTitle:    settings.websiteTitle    || 'Happy Teacher\'s Day',
            appTitle:        settings.appTitle        || '',
            appIcon:         settings.appIcon         || '',
            enableWebsiteInfo: settings.enableWebsiteInfo ?? true,

            bgMusic,
            fontStyle: settings.fontStyle === 'mau2' ? 'mau2' : 'default',
            countdown: Number(settings.countdown) || 3,

            matrixText:   settings.matrixText   || 'HAPPY',
            matrixColor1: settings.matrixColor1 || '#ff69b4',
            matrixColor2: settings.matrixColor2 || '#ff1493',

            sequence:      settings.sequence      || 'HAPPY|TEACHER\'S|DAY|20/11',
            sequenceColor: settings.sequenceColor || '#ff69b4',

            envelopeText:    settings.envelopeText    || 'Happy\n Teacher\'s\n Day!',
            letterTitle:     settings.letterTitle     ?? 'Thầy cô thân mến!',
            letterContent:   settings.letterContent   || '',
            letterSignature: settings.letterSignature || '',

            photos,
        };
    }

    /**
     * Map V2 access response (flat fields) → V1 settings shape mà settings.js
     * loadWebsiteFromServer mong đợi (`{ data: { settings: {...}, status } }`).
     */
    function v2AccessToV1Shape(v2) {
        const cfg = v2.config || v2; // /access trả config dưới key `config` (sau sanitize)
        return {
            success: true,
            data: {
                websiteId: cfg.websiteId,
                status:    cfg.showWatermark ? 'FREE' : 'PAID',  // viewer cũ check status để ẩn copyright
                settings: {
                    music:           cfg.bgMusic || '',
                    fontStyle:       cfg.fontStyle === 'mau2' ? 'mau2' : 'default',
                    countdown:       cfg.countdown ?? 3,
                    matrixText:      cfg.matrixText      ?? 'HAPPY',
                    matrixColor1:    cfg.matrixColor1    ?? '#ff69b4',
                    matrixColor2:    cfg.matrixColor2    ?? '#ff1493',
                    sequence:        cfg.sequence        ?? '',
                    sequenceColor:   cfg.sequenceColor   ?? '#ff69b4',
                    envelopeText:    cfg.envelopeText    ?? '',
                    letterTitle:     cfg.letterTitle     ?? '',
                    letterContent:   cfg.letterContent   ?? '',
                    letterSignature: cfg.letterSignature ?? '',
                    photos:          Array.isArray(cfg.photos) ? cfg.photos : [],
                    isSave:          cfg.expiresAt === null, // forever khi expiresAt=null
                },
            },
        };
    }

    // ── Class ──────────────────────────────────────────────────────────────

    class BirthdayAPI {
        constructor() {
            this.baseURL          = API_BASE;
            this.currentWebsiteId = null;
        }

        // ── R2 upload (V2 presigned) ───────────────────────────────────────

        async uploadImageToR2(base64OrFile, _prefix = 'teachersday') {
            const file = (typeof base64OrFile === 'string' && base64OrFile.startsWith('data:'))
                ? dataURLtoFile(base64OrFile, 'upload.png')
                : base64OrFile;
            return await presignAndPut(file, 'image');
        }

        async uploadAudioToR2(fileOrBase64, _prefix = 'teachersday') {
            const file = (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:'))
                ? dataURLtoFile(fileOrBase64, 'upload.mp3')
                : fileOrBase64;
            return await presignAndPut(file, 'audio');
        }

        async fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload  = () => resolve(reader.result);
                reader.onerror = err => reject(err);
                reader.readAsDataURL(file);
            });
        }

        // ── Atomic V2 create — TỪ V1 createBirthdayWebsite ─────────────────
        //
        // V1 signature: createBirthdayWebsite(settings, status='Free')
        // V2 chấp nhận thêm options object (atomic body):
        //   createBirthdayWebsite(settings, status, opts) → {success, websiteId,
        //     paymentUrl, orderCode, data}
        // opts = { paymentMethod, currency, voucherCode, tip, customerEmail, features }
        //
        // Main.js cũ chỉ truyền (settings, 'PAID') — vẫn hoạt động nhờ default
        // opts. handlePaidCreation đã patch để truyền đủ.
        async createBirthdayWebsite(settings, status = 'PAID', opts = {}) {
            try {
                if (!settings || typeof settings !== 'object') {
                    throw new Error('Settings là object bắt buộc');
                }

                const v2Config = buildV2Config(settings);

                const paymentMethod = (opts.paymentMethod || 'PAYOS').toUpperCase();
                const currency      = (opts.currency || (paymentMethod === 'POLAR' ? 'USD' : 'VND')).toUpperCase();
                const isUsd         = currency === 'USD';
                const tipVal        = isUsd
                    ? Math.max(0, Number(opts.tipUsd ?? opts.tip) || 0)
                    : Math.max(0, parseInt(opts.tip, 10) || 0);

                const features = {
                    expiration: settings.isSave ? 'forever' : '15d',
                    tip:        tipVal,
                };

                const referralCode = opts.referralCode || getStoredReferralCode();
                const body = {
                    config:         v2Config,
                    features,
                    currency,
                    paymentMethod,
                    customerEmail:  opts.customerEmail || localStorage.getItem('customerEmail') || '',
                    voucherCode:    opts.voucherCode || null,
                    ...(referralCode ? { referralCode } : {}),
                };

                const jwt = window.getJwt?.();
                const res = await fetch(`${API_BASE}/websites/${TEMPLATE_TYPE}`, {
                    method:  'POST',
                    headers: {
                        'Content-Type':    'application/json',
                        'Idempotency-Key': buildIdempotencyKey(),
                        ...(jwt ? { 'Authorization': 'Bearer ' + jwt } : {}),
                    },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    const msg = data.error?.message || data.message || `HTTP ${res.status}`;
                    throw new Error(msg);
                }

                const d = data.data || data;
                this.currentWebsiteId = d.websiteId || d.websiteid;
                if (this.currentWebsiteId) {
                    localStorage.setItem('deargiftproWebsiteId', this.currentWebsiteId);
                }

                return {
                    success:     true,
                    websiteId:   this.currentWebsiteId,
                    paymentUrl:  d.paymentUrl  || d.checkoutUrl || '',
                    orderCode:   d.orderCode   || '',
                    finalAmount: d.finalAmount || d.amount || d.price || 0,
                    currency:    d.currency    || currency,
                    needsPayment: d.needsPayment !== undefined ? !!d.needsPayment : !!(d.paymentUrl || d.checkoutUrl),
                    data:        d,
                };
            } catch (error) {
                console.error('❌ [V2 atomic] createBirthdayWebsite:', error);
                return { success: false, error: error.message };
            }
        }

        // ── Viewer fetch — TỪ V1 getBirthdayWebsiteByWebsiteId ────────────
        async getBirthdayWebsiteByWebsiteId(websiteId) {
            try {
                const res = await fetch(`${API_BASE}/access/${TEMPLATE_TYPE}/${websiteId}`);
                const data = await res.json();
                if (!res.ok || !data.success) {
                    const msg = data.error?.message || data.message || `HTTP ${res.status}`;
                    throw new Error(msg);
                }
                const v2 = data.data || data;
                return v2AccessToV1Shape(v2);
            } catch (error) {
                console.error('❌ [V2 access] getBirthdayWebsiteByWebsiteId:', error);
                return { success: false, error: error.message };
            }
        }

        // ── URL helpers (legacy parity) ───────────────────────────────────
        createShareableURL(websiteId) {
            const origin = window.VIEWER_ORIGIN || (window.location.origin + window.location.pathname);
            const url = new URL(origin);
            url.search = ''; url.hash = '';
            url.searchParams.set('websiteId', websiteId);
            return url.href;
        }

        getWebsiteIdFromURL() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('websiteId') || (/^[a-f0-9]{16}$/i.test(window.location.search.slice(1)) ? window.location.search.slice(1) : null);
        }

        getCurrentWebsiteId() {
            return this.currentWebsiteId || localStorage.getItem('deargiftproWebsiteId');
        }

        clearWebsiteId() {
            localStorage.removeItem('deargiftproWebsiteId');
            this.currentWebsiteId = null;
        }
    }

    const birthdayAPI = new BirthdayAPI();
    window.birthdayAPI = birthdayAPI;
    // Expose helpers cho main.js patch:
    window._v2BuildConfig = buildV2Config;
    window._v2PresignAndPut = presignAndPut;
})();
