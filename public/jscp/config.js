/**
 * 20-11/jscp/config.js
 *
 * V2 constants cho template Teachersday (20/11). Load AS NON-MODULE script
 * trước api.js / auth.js / voucher.js / main.js để mọi nơi đọc được từ
 * `window.*` (jscp files được wire vào index.html theo thứ tự).
 *
 * - API_BASE        : Auto chọn localhost (dev) hoặc api.deargift.online (prod).
 * - SERVER_URL_PROD : Alias backward-compat (một số đoạn legacy đọc tên này).
 * - TEMPLATE_TYPE   : 'teachersday' — slug trong BE registry & DB.
 * - VIEWER_ORIGIN   : Domain hiển thị quà sau khi tạo (catch-all viewer).
 */
(function () {
    const isLocal = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    const API_BASE = isLocal
        ? 'https://apiv2.deargift.online/api/v2'
        : 'https://apiv2.deargift.online/api/v2';

    window.API_BASE        = API_BASE;
    window.SERVER_URL_PROD = API_BASE;  // alias legacy
    window.TEMPLATE_TYPE   = 'teachersday';
    window.VIEWER_ORIGIN   = 'https://e.dlove.vn';

    // JWT helper — đọc dg_jwt (convention V2) hoặc fallback null.
    window.getJwt = function () {
        return localStorage.getItem('dg_jwt') || null;
    };
})();
