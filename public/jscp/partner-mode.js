/**
 * partner-mode.js — Partner Credit mode cho trang TẠO WomensDay (config.html).
 *
 * Khách ẩn danh (của shop đối tác) tạo quà → TRỪ 1 credit của shop, KHÔNG thanh
 * toán, KHÔNG đăng nhập. Kích hoạt bằng URL:
 *   ?partner=<slug>[&packageId=<gói>]   (shop mode)  hoặc  ?token=<token>  (link 1-lần)
 *
 * Module THÊM MỚI, KHÔNG phẫu thuật core. Nếu không phải partner mode → return
 * ngay, luồng B2C nguyên vẹn. Chokepoint DUY NHẤT: override window.createWebsite.
 *
 * Tham chiếu: PARTNER_CREDIT_EDITOR_WIRING.md + Happy-Birthday/jscp/partner-mode.js.
 */
(function () {
    'use strict';

    var params = new URLSearchParams(location.search);
    var SLUG  = (params.get('partner') || '').trim();
    var TOKEN = (params.get('token')   || '').trim();
    var TOKEN_MODE   = !!TOKEN && !SLUG;       // token ưu tiên khi KHÔNG có partner
    var PARTNER_MODE = !!(SLUG || TOKEN);
    if (!PARTNER_MODE) return;                 // ← B2C: thoát, không đụng gì

    window.PARTNER_MODE = true;
    window.PARTNER_SLUG = SLUG;
    window.PARTNER_TOKEN_MODE = TOKEN_MODE;
    window.PARTNER_SELECTED_PACKAGE = null;    // { templateType, packageId }

    var API = (typeof API_BASE === 'string' && API_BASE) ? API_BASE
            : 'https://apiv2.deargift.online/api/v2';
    var TEMPLATE = 'womenday';
    var selectedPkgId = null;
    var partnerSubmitting = false;

    // ── Helpers ──────────────────────────────────────────────────────────────
    function jfetch(url, opts) {
        return fetch(url, opts).then(function (r) {
            return r.json().then(function (j) { return { ok: r.ok, status: r.status, json: j }; })
                           .catch(function () { return { ok: r.ok, status: r.status, json: null }; });
        }).catch(function (e) { return { ok: false, status: 0, json: null, err: e }; });
    }
    function postJson(url, body, idem) {
        var h = { 'Content-Type': 'application/json' };          // KHÔNG Authorization
        if (idem) h['Idempotency-Key'] = idem;
        return jfetch(url, { method: 'POST', headers: h, body: JSON.stringify(body) });
    }
    function makeIdem() {
        try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
        var s = 'xxxxxxxxxxxxxxxx'.replace(/x/g, function () {
            return '0123456789abcdefghijklmnopqrstuvwxyz'[(Math.random() * 36) | 0];
        });
        return 'pc-' + s;
    }
    function notify(msg, type) {
        try { if (typeof toast === 'function') { toast(msg, type || 'error'); return; } } catch (e) {}
        try { alert(msg); } catch (e) {}
    }
    function whenReady(getter, cb, maxTries, ms) {
        var t = 0, iv = setInterval(function () {
            var v; try { v = getter(); } catch (e) { v = null; }
            if (v) { clearInterval(iv); cb(v); }
            else if (++t > (maxTries || 40)) clearInterval(iv);
        }, ms || 200);
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function isData(s) { return typeof s === 'string' && /^data:/.test(s); }

    // data:URL → Blob (để presign + PUT R2).
    function dataUrlToBlob(dataUrl) {
        var parts = dataUrl.split(',');
        var meta = parts[0] || '';
        var mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
        var bin = atob(parts[1] || '');
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime });
    }

    // ── PartnerPublicAPI (ẩn danh, KHÔNG gửi Authorization) ─────────────────
    function getPartner()  { return jfetch(API + '/partners/public/' + encodeURIComponent(SLUG)); }
    function getPackages() { return jfetch(API + '/partners/public/' + encodeURIComponent(SLUG) + '/packages'); }
    function resolveToken(){ return jfetch(API + '/partner-links/' + encodeURIComponent(TOKEN)); }
    function createPartnerWebsite(payload, idem) {
        return postJson(API + '/partners/public/' + encodeURIComponent(SLUG) + '/websites', {
            templateType: TEMPLATE, packageId: payload.packageId, config: payload.config,
            customerEmail: payload.customerEmail, customerMarketingConsent: !!payload.customerMarketingConsent,
            customSlug: payload.customSlug || undefined, idempotencyKey: idem,
        }, idem);
    }
    function createViaToken(payload, idem) {
        return postJson(API + '/partner-links/' + encodeURIComponent(TOKEN) + '/create', {
            config: payload.config, customerEmail: payload.customerEmail,
            customerMarketingConsent: !!payload.customerMarketingConsent,
            customSlug: payload.customSlug || undefined, idempotencyKey: idem,
        }, idem);
    }
    // Upload ảnh công khai (KHÔNG auth): presign → PUT thẳng R2 → publicUrl (tuyệt đối).
    // TOKEN mode: presign theo token; SLUG mode: theo slug + templateType/packageId.
    function partnerPresignAndPut(input) {
        return Promise.resolve().then(function () {
            if (!isData(input)) return input;              // http(s)/asset → giữ nguyên
            var blob = dataUrlToBlob(input);
            var ctype = blob.type || 'image/jpeg', url, body;
            if (TOKEN_MODE) {
                url = API + '/partner-links/' + encodeURIComponent(TOKEN) + '/uploads/presign';
                body = { contentType: ctype, sizeBytes: blob.size };
            } else {
                url = API + '/partners/public/' + encodeURIComponent(SLUG) + '/uploads/presign';
                body = { templateType: TEMPLATE, packageId: selectedPkgId, contentType: ctype, sizeBytes: blob.size };
            }
            return postJson(url, body).then(function (r) {
                var d = (r.json && r.json.data) || {};
                if (!r.ok || !d.uploadUrl) throw new Error('presign_fail_' + r.status);
                return fetch(d.uploadUrl, { method: 'PUT', headers: { 'Content-Type': ctype }, body: blob })
                    .then(function (put) { if (!put.ok) throw new Error('r2_put_fail_' + put.status); return d.publicUrl; });
            });
        });
    }

    // ── CSS + ẩn chrome B2C ──────────────────────────────────────────────────
    function injectCss() {
        if (document.getElementById('wd-partner-styles')) return;
        var css =
            // Ẩn login overlay + gói chọn (gói cố định theo credit) + giá/voucher/
            // thanh toán trong checkout (khách KHÔNG thanh toán).
            'body.wd-partner-mode #globalLoginOverlay{display:none !important;}' +
            'body.wd-partner-mode.auth-required-no-scroll{overflow:auto !important;}' +
            'body.wd-partner-mode #packageSelector,body.wd-partner-mode #packageChosenBar,' +
            'body.wd-partner-mode #btnOrderHistory,body.wd-partner-mode #authContainer,' +
            'body.wd-partner-mode #pricingSummaryCard,body.wd-partner-mode #voucherCard{display:none !important;}' +
            'body.wd-partner-mode.wd-pick-pending .content-panel{display:block !important;}' +
            '.wd-partner-banner{background:linear-gradient(135deg,#fff0f6,#ffe3ef);border:1px solid #f2d3df;border-radius:12px;padding:12px 14px;margin:0 0 14px;font-size:13px;color:#7a4a5a;line-height:1.5;}' +
            '.wd-partner-banner b{color:#d63384;}' +
            '.wd-partner-fields{margin:0 0 14px;padding:14px;border:1px solid #f2d3df;border-radius:12px;background:#fff;}' +
            '.wd-partner-fields label{display:block;font-size:13px;font-weight:600;color:#5a4a55;margin:0 0 6px;}' +
            '.wd-partner-fields input[type=email]{width:100%;padding:11px 13px;border:1.5px solid #f2d3df;border-radius:10px;font-size:15px;box-sizing:border-box;}' +
            '.wd-partner-fields input[type=email]:focus{outline:none;border-color:#d63384;}' +
            '.wd-partner-consent{display:flex;align-items:flex-start;gap:8px;margin-top:10px;font-size:12.5px;color:#6a5a63;font-weight:400;}' +
            '.wd-partner-consent input{margin-top:2px;}' +
            '.wd-partner-note{font-size:11.5px;color:#a06070;margin-top:8px;line-height:1.5;}';
        var st = document.createElement('style'); st.id = 'wd-partner-styles'; st.textContent = css;
        document.head.appendChild(st);
    }

    // Banner shop (đầu form) + ô email/consent (trong màn checkout, trước nút Tạo).
    function showBanner(name) {
        if (document.getElementById('wdPartnerBanner')) return;
        var host = document.querySelector('.form-col');
        if (!host) return;
        var b = document.createElement('div');
        b.id = 'wdPartnerBanner'; b.className = 'wd-partner-banner';
        b.innerHTML = '🌸 Bạn đang tạo quà qua <b>' + esc(name || 'cửa hàng đối tác') + '</b>. Điền nội dung rồi bấm <b>Tạo quà tặng</b> — miễn phí với bạn.';
        host.insertBefore(b, host.firstChild);
    }
    function buildPartnerFields() {
        if (document.getElementById('wdPartnerFields')) return false;
        var inner = document.querySelector('#checkoutScreen .wd-checkout-inner');
        if (!inner) return false;
        var wrap = document.createElement('div');
        wrap.id = 'wdPartnerFields'; wrap.className = 'wd-partner-fields';
        wrap.innerHTML =
            '<label for="partnerCustomerEmail">📧 Email của bạn (để nhận link quà)</label>' +
            '<input type="email" id="partnerCustomerEmail" placeholder="email@example.com" autocomplete="email">' +
            '<label class="wd-partner-consent"><input type="checkbox" id="partnerPrivacyConsent">' +
            '<span>Tôi đồng ý cung cấp thông tin để tạo món quà này.</span></label>' +
            '<label class="wd-partner-consent"><input type="checkbox" id="partnerMarketingConsent">' +
            '<span>(Tuỳ chọn) Nhận thông tin ưu đãi qua email.</span></label>' +
            '<div class="wd-partner-note">Món quà được tạo bằng credit của cửa hàng — bạn KHÔNG phải thanh toán.</div>';
        // chèn ngay sau header (đầu inner)
        var head = inner.querySelector('.wd-checkout-head');
        if (head && head.nextSibling) inner.insertBefore(wrap, head.nextSibling);
        else inner.insertBefore(wrap, inner.firstChild);
        return true;
    }
    var PARTNER_CREATE_LABEL = '🌸 Tạo quà tặng';
    function relabelCreateBtn() {
        var btn = document.getElementById('btnCreateWebsite');
        if (!btn) return;
        btn.textContent = PARTNER_CREATE_LABEL;
        // updatePricingSummary (B2C) hay ghi đè nhãn theo tổng tiền → giữ lại bằng
        // MutationObserver (guard tránh vòng lặp: chỉ set khi khác).
        try {
            if (btn.__wdPartnerObs) return;
            var mo = new MutationObserver(function () {
                if (btn.textContent.indexOf('Tạo quà tặng') === -1 && !btn.disabled) btn.textContent = PARTNER_CREATE_LABEL;
            });
            mo.observe(btn, { childList: true, characterData: true, subtree: true });
            btn.__wdPartnerObs = mo;
        } catch (e) {}
    }

    // ── Nguồn gói: gói shop CÓ credit (lọc theo template womenday) ───────────
    function enter(pkgId) {
        selectedPkgId = pkgId;
        window.PARTNER_SELECTED_PACKAGE = { templateType: TEMPLATE, packageId: pkgId };
        // Vào chế độ điền nội dung của womenday = selectPackage() (bỏ pick-pending,
        // hiện content). Chờ SERVER_PRICING.packages có gói này.
        whenReady(function () {
            var sp = (typeof SERVER_PRICING !== 'undefined' && SERVER_PRICING) ? SERVER_PRICING : window.SERVER_PRICING;
            return (sp && Array.isArray(sp.packages) && sp.packages.some(function (p) { return p.id === pkgId; })) ? sp : null;
        }, function () {
            try { if (typeof selectPackage === 'function') selectPackage(pkgId); } catch (e) {}
        }, 60, 250);
    }
    function loadPackages() {
        if (TOKEN_MODE) {
            resolveToken().then(function (r) {
                var d = (r.json && r.json.data) || {};
                if (!r.ok || !d.usable) { notify(tokenError(d, r.status)); return; }
                if (d.partner && d.partner.name) showBanner(d.partner.name);
                enter(d.packageId);
            });
            return;
        }
        getPartner().then(function (r) {
            var p = (r.json && r.json.data && r.json.data.partner) || null;
            if (p && p.name) showBanner(p.name);
        });
        getPackages().then(function (r) {
            var list = (r.json && r.json.data && r.json.data.packages) || [];
            // CHỈ gói của CHÍNH template womenday (public trả gói mọi template của shop).
            var ids = list.filter(function (x) { return x && x.available && x.templateType === TEMPLATE; })
                          .map(function (x) { return x.packageId; });
            if (!ids.length) { notify('Cửa hàng chưa có gói khả dụng để tạo quà.'); return; }
            var wantPkg = (params.get('packageId') || '').trim();  // nút gallery mở link public
            if (wantPkg) {
                if (ids.indexOf(wantPkg) === -1) { notify('Gói được chọn hiện không khả dụng. Vui lòng liên hệ cửa hàng.'); return; }
                enter(wantPkg); return;
            }
            enter(ids[0]);   // ≥2 gói không có packageId → chọn gói đầu (đúng cũ)
        });
    }

    function tokenError(d, status) {
        var s = d && d.status;
        if (s === 'used') return 'Link này đã được dùng rồi.';
        if (s === 'expired') return 'Link đã hết hạn.';
        if (s === 'revoked') return 'Link đã bị thu hồi.';
        if (status === 404) return 'Link không tồn tại.';
        return 'Link không dùng được, vui lòng liên hệ cửa hàng.';
    }
    function submitErr(res) {
        var st = res.status, j = res.json || {}, msg = (j.error && (j.error.message || j.error)) || '';
        if (st === 409) return 'Đường dẫn riêng đã có người dùng — hãy đổi link đẹp khác.';
        if (st === 404) return 'Không tìm thấy cửa hàng/link.';
        if (st === 400) return msg || 'Cửa hàng đã hết credit hoặc dữ liệu không hợp lệ.';
        if (st === 0)   return 'Lỗi mạng, thử lại giúp mình nhé.';
        return msg || ('Tạo quà thất bại (' + st + ').');
    }

    // ── Success dialog ───────────────────────────────────────────────────────
    function showSuccess(link) {
        var ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100050;display:flex;align-items:center;justify-content:center;padding:20px;';
        ov.innerHTML =
            '<div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:24px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.25);">' +
            '<div style="font-size:44px;">🎉</div>' +
            '<h3 style="margin:8px 0 4px;color:#d63384;">Đã tạo quà thành công!</h3>' +
            '<p style="font-size:13px;color:#6a5a63;margin:0 0 14px;">Gửi link này cho người nhận nhé:</p>' +
            '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="display:block;word-break:break-all;color:#d63384;font-weight:600;font-size:14px;margin-bottom:16px;">' + esc(link) + '</a>' +
            '<button id="wdPartnerCopy" style="width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#ff6fae,#d63384);color:#fff;font-weight:700;cursor:pointer;margin-bottom:8px;">📋 Sao chép link</button>' +
            '<button id="wdPartnerOpen" style="width:100%;padding:12px;border:1.5px solid #f2d3df;border-radius:12px;background:#fff5f8;color:#d63384;font-weight:700;cursor:pointer;">Mở xem quà</button>' +
            '</div>';
        document.body.appendChild(ov);
        var c = ov.querySelector('#wdPartnerCopy');
        if (c) c.onclick = function () { try { navigator.clipboard.writeText(link); c.textContent = '✓ Đã sao chép'; } catch (e) {} };
        var o = ov.querySelector('#wdPartnerOpen');
        if (o) o.onclick = function () { try { window.open(link, '_blank'); } catch (e) {} };
    }

    // ── Chokepoint: tạo quà bằng credit ──────────────────────────────────────
    window.submitPartnerCredit = async function () {
        if (partnerSubmitting) return;                         // (a) chặn re-entry
        var packageId = selectedPkgId || (window.PARTNER_SELECTED_PACKAGE && window.PARTNER_SELECTED_PACKAGE.packageId);
        if (!packageId) { notify('Chưa chọn được gói quà. Tải lại trang giúp mình.'); return; }

        // 1) email + consent
        var emailEl = document.getElementById('partnerCustomerEmail');
        var email = emailEl ? (emailEl.value || '').trim() : '';
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify('Vui lòng nhập email hợp lệ để nhận link quà.'); if (emailEl) emailEl.focus(); return; }
        if (!(document.getElementById('partnerPrivacyConsent') || {}).checked) { notify('Vui lòng tích ô đồng ý để tiếp tục.'); return; }
        var marketing = !!(document.getElementById('partnerMarketingConsent') || {}).checked;

        // 2) validate nội dung THẬT (KHÔNG seed ảnh mẫu)
        var cfgForValidate, errs;
        try { cfgForValidate = collectConfig(); errs = validate(cfgForValidate); }
        catch (e) { notify('Không đọc được nội dung, thử lại giúp mình.'); return; }
        if (errs && errs.length) {
            try { if (typeof showValidationErrors === 'function') showValidationErrors(errs); } catch (e) {}
            notify(errs[0].msg || 'Nội dung chưa hợp lệ.'); return;
        }

        // 3) build config (bỏ field checkout — BE partner không dùng)
        var cfg;
        try { cfg = buildApiPayload(); } catch (e) { notify('Không dựng được nội dung, thử lại.'); return; }
        var slugState = window._slugFormState || {};
        var customSlug = (slugState.available && slugState.value) ? slugState.value : undefined;

        // 4) KHOÁ double-submit + loading NGAY — TRƯỚC mọi await (tránh trừ 2 credit)
        partnerSubmitting = true;
        var btn = document.getElementById('btnCreateWebsite');
        var oldTxt = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang tạo quà...'; }

        try {
            // 5) upload ảnh khách (data:URL → publicUrl). Lỗi → CHẶN, KHÔNG trừ credit,
            //    KHÔNG lén dùng ảnh mẫu. Nhạc: buộc preset (né upload audio ẩn danh).
            try {
                if (cfg.appIcon && isData(cfg.appIcon))           cfg.appIcon = await partnerPresignAndPut(cfg.appIcon);
                if (cfg.particleImage && isData(cfg.particleImage)) cfg.particleImage = await partnerPresignAndPut(cfg.particleImage);
                if (Array.isArray(cfg.sphereImages)) {
                    for (var i = 0; i < cfg.sphereImages.length; i++) {
                        if (isData(cfg.sphereImages[i])) cfg.sphereImages[i] = await partnerPresignAndPut(cfg.sphereImages[i]);
                    }
                }
                if (cfg.letter && isData(cfg.letter.image)) cfg.letter.image = await partnerPresignAndPut(cfg.letter.image);
            } catch (upErr) {
                notify('Chưa tải được ảnh lên — CHƯA tạo quà, không trừ credit. Thử lại giúp mình nhé.');
                return;
            }
            if (typeof cfg.bgMusic === 'string' && /^(blob:|data:)/.test(cfg.bgMusic)) cfg.bgMusic = 'musics/noinaycoanh.mp3';

            // 6) tạo — token hoặc slug — idempotency key 1 lần (header == body)
            var idem = makeIdem();
            var payload = { config: cfg, customerEmail: email, customerMarketingConsent: marketing, customSlug: customSlug };
            var res = TOKEN_MODE ? await createViaToken(payload, idem)
                                 : await createPartnerWebsite(Object.assign({ packageId: packageId }, payload), idem);
            if (res.ok && res.json && res.json.data) {
                var d = res.json.data;
                var link = d.link || d.linkproduct || d.url;
                if (link) { showSuccess(link); return; }
            }
            notify(submitErr(res));
        } catch (e) {
            notify('Tạo quà lỗi: ' + (e && e.message ? e.message : 'không rõ') + '. Thử lại giúp mình nhé.');
        } finally {
            partnerSubmitting = false;                         // (b) luôn nhả khoá
            if (btn) { btn.disabled = false; btn.textContent = oldTxt || '🌸 Tạo quà tặng'; }
        }
    };

    // Override chokepoint B2C: mọi đường tạo đi qua window.createWebsite.
    var _origCreate = window.createWebsite;
    window.createWebsite = function () {
        if (window.PARTNER_MODE) return window.submitPartnerCredit();
        return _origCreate ? _origCreate.apply(this, arguments) : undefined;
    };
    // Vô hiệu hoá bắt đăng nhập B2C (khách ẩn danh).
    window.showLoginDialog = function () {};
    var _origAuthUI = window.updateAuthUI;
    window.updateAuthUI = function () {
        var ov = document.getElementById('globalLoginOverlay');
        if (ov) ov.style.display = 'none';
        document.body.classList.remove('auth-required-no-scroll');
    };

    // ── Init ─────────────────────────────────────────────────────────────────
    function hideLogin() {
        var ov = document.getElementById('globalLoginOverlay');
        if (ov) ov.style.display = 'none';
        document.body.classList.remove('auth-required-no-scroll');
    }
    function init() {
        injectCss();
        document.body.classList.add('wd-partner-mode');
        hideLogin();
        // Hạ login overlay vài lần (auth async có thể bật lại).
        var n = 0, iv = setInterval(function () { hideLogin(); if (++n > 20) clearInterval(iv); }, 300);
        // Dựng email/consent trong checkout + đổi nhãn nút tạo (chờ DOM).
        whenReady(function () { return document.querySelector('#checkoutScreen .wd-checkout-inner'); }, function () { buildPartnerFields(); }, 60, 200);
        whenReady(function () { return document.getElementById('btnCreateWebsite'); }, function () { relabelCreateBtn(); }, 60, 200);
        // Nạp gói khả dụng của shop → vào chế độ điền nội dung.
        loadPackages();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
