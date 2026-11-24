// loveplannetvn/js/config.js — V2 endpoints
//
// V2 backend phơi base prefix '/api/v2'. FE tự switch local vs prod theo
// hostname để dev OK (giống convention Valentine/WomensDay).
//
// Sau khi port:
//   - Mọi fetch trỏ về SERVER_URL hoặc API_BASE.
//   - Không còn /api/products, /api/galaxy-configs, /api/r2/upload — đã thay
//     bằng atomic POST /api/v2/websites/loveplannet + presigned URL.

const PROD_API_BASE = 'https://apiv2.deargift.online/api/v2';
const DEV_API_BASE  = 'https://apiv2.deargift.online/api/v2';

const isLocal = (typeof location !== 'undefined') &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

export const API_BASE  = isLocal ? DEV_API_BASE : PROD_API_BASE;

// Backward-compat: 1 vài file legacy import SERVER_URL_PROD trực tiếp.
// Alias để không phải đổi mọi import path. Lưu ý: SERVER_URL_PROD trước đây
// KHÔNG có '/api/v2' suffix — giờ thì có. Các fetch legacy phải tự bỏ '/api/'
// prefix trong path (vd: fetch(`${SERVER_URL_PROD}/products`) thay vì
// `${SERVER_URL_PROD}/api/products`).
export const SERVER_URL_PROD = API_BASE;
export const SERVER_URL_LOCAL = DEV_API_BASE;

// Template type — dùng cho upload presign + atomic create.
export const TEMPLATE_TYPE = 'loveplannet';

// Số ảnh tối đa cho vòng ảnh (flower ring). Khớp BE loveplannet/schema.js .max(15).
export const MAX_FLOWER_IMAGES = 15;

// Domain công khai cho linkproduct (custom-slug viewer). Khớp với
// src/templates/loveplannet/meta.js → domain.
export const VIEWER_ORIGIN = 'https://p.deargift.online';

// ── Referral (mã giới thiệu CTV ?ref=CODE) ───────────────────────────────────
// Khách vào từ link CTV (vd: p.deargift.online/?ref=ABC123) → lưu mã vào
// localStorage (giữ 60 ngày, last-click-wins). Khi tạo website gửi kèm
// referralCode để BE giảm giá đơn đầu + ghi nhận hoa hồng cho CTV.
const REF_KEY = 'dg_ref';
const REF_WINDOW_DAYS = 60;
const REF_RE = /^[A-Z0-9]{4,12}$/i;

export function captureReferralFromUrl() {
    try {
        const raw = new URLSearchParams(location.search).get('ref');
        if (!raw) return;
        const code = raw.trim().toUpperCase();
        if (!REF_RE.test(code)) return;
        localStorage.setItem(REF_KEY, JSON.stringify({ code, savedAt: Date.now() }));
    } catch (_) { /* noop */ }
}

export function getStoredReferralCode() {
    try {
        const raw = localStorage.getItem(REF_KEY);
        if (!raw) return null;
        const { code, savedAt } = JSON.parse(raw);
        if (!code || !savedAt) return null;
        if (Date.now() - savedAt > REF_WINDOW_DAYS * 86400000) {
            localStorage.removeItem(REF_KEY);
            return null;
        }
        return code;
    } catch (_) { return null; }
}

// Bắt mã ngay khi module load (link CTV luôn là entry point — full page load).
if (typeof location !== 'undefined') captureReferralFromUrl();
