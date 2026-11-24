// loveplannetvn/js/createProduct.js — V2 atomic create + presigned R2 upload.
//
// V1 đã thay:
//   POST /api/products            → POST /api/v2/websites/loveplannet (atomic)
//   POST /api/galaxy-configs      → MERGE vào atomic body.config
//   POST /api/r2/upload[-audio]   → POST /api/v2/uploads/presign + PUT R2 trực tiếp
//
// Hàm export giữ tên cũ để sphere.js không phải refactor heavy:
//   fileToBase64, uploadImageToR2, uploadAudioToR2 → vẫn dùng được như cũ.
//
// Hàm export mới:
//   buildV2Config({...legacyState})  → chuyển legacy field names → V2 schema shape.
//   createWebsiteV2({...})           → gọi POST /api/v2/websites/loveplannet,
//                                       trả {websiteId, orderCode, paymentUrl, ...}.

import { API_BASE, TEMPLATE_TYPE, VIEWER_ORIGIN, MAX_FLOWER_IMAGES, getStoredReferralCode } from './config.js';

// ── JWT auth ────────────────────────────────────────────────────────────────
// Sau khi auth.js login, lưu token ở 'dg_jwt' (convention V2).
function getJwt() {
    const jwt = localStorage.getItem('dg_jwt');
    if (!jwt) throw new Error('Chưa đăng nhập (thiếu dg_jwt). Vui lòng đăng nhập lại.');
    return jwt;
}

// ── Utilities ───────────────────────────────────────────────────────────────
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function dataURLtoFile(dataurl, filename) {
    const arr  = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
}

// ── Presigned R2 upload ─────────────────────────────────────────────────────
//
// 1) POST /api/v2/uploads/presign với templateType + fileType → uploadUrl, publicUrl
// 2) PUT trực tiếp lên uploadUrl với Content-Type khớp.
async function presignAndPut(file, fileType /* 'image' | 'audio' */) {
    const jwt = getJwt();

    const r1 = await fetch(`${API_BASE}/uploads/presign`, {
        method:  'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + jwt,
        },
        body: JSON.stringify({
            templateType:  TEMPLATE_TYPE,
            fileType,
            contentType:   file.type,
            fileSizeBytes: file.size,
        }),
    });
    const json = await r1.json();
    if (!r1.ok || !json.success) {
        throw new Error(json.error?.message || json.message || 'Không lấy được presigned URL');
    }
    const { uploadUrl, publicUrl } = json.data;

    const r2 = await fetch(uploadUrl, {
        method:  'PUT',
        headers: { 'Content-Type': file.type },
        body:    file,
    });
    if (!r2.ok) throw new Error('Upload lên R2 thất bại (' + r2.status + ')');

    return publicUrl;
}

// Public helpers — giữ tên cũ để sphere.js không cần đổi.
// Accept base64 dataURL (legacy convention) hoặc File trực tiếp.
export async function uploadImageToR2(input, _prefix = '') {
    let file = input;
    if (typeof input === 'string' && input.startsWith('data:')) {
        const ext = (input.match(/data:image\/([a-z]+)/i)?.[1] || 'png').toLowerCase();
        file = dataURLtoFile(input, `upload.${ext}`);
    }
    return presignAndPut(file, 'image');
}

export async function uploadAudioToR2(input, _prefix = '') {
    let file = input;
    if (typeof input === 'string' && input.startsWith('data:')) {
        file = dataURLtoFile(input, 'upload.mp3');
    }
    return presignAndPut(file, 'audio');
}

// ── Legacy → V2 shape mapper ────────────────────────────────────────────────
//
// Legacy `getCurrentConfig()` trả về object với nhiều field tên cũ:
//   imageUrls, audioUrl, centralHeartEnabled, meteorEnabled, savePermanently,
//   text3d.color = integer 0xff66aa, ...
//
// V2 schema (src/templates/loveplannet/schema.js) yêu cầu:
//   flowerImages[], bgMusic, enableCentralHeart, enableMeteorFeature,
//   text3d.color = '#rrggbb' hex string, sphereParams nested, colors nested.
//
// Helper này chuyển 1 lần khi atomic create. Trả object sạch để FE log/preview.

function intToHex(intColor, fallback = '#ffffff') {
    if (typeof intColor === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(intColor)) {
        return intColor.toLowerCase();
    }
    if (typeof intColor === 'number' && Number.isFinite(intColor)) {
        const hex = intColor.toString(16).padStart(6, '0').slice(-6);
        return '#' + hex;
    }
    return fallback;
}

function normalizeBgMusic(legacyAudioUrl, presetSelectValue) {
    // Logic ưu tiên:
    //   1) audioUrl đã upload (http URL) → giữ nguyên.
    //   2) presetSelectValue (vd 'musics/1000anhmat.mp3') → giữ nguyên.
    //   3) audioUrl bắt đầu 'assets/musics/' → strip 'assets/' để match preset
    //      regex `musics/<file>.mp3` (schema dùng pattern này).
    //   4) Default ''.
    const audio = (legacyAudioUrl || '').trim();
    if (audio && /^https?:\/\//i.test(audio)) return audio;
    if (audio.startsWith('assets/musics/')) return audio.replace(/^assets\//, '');
    if (presetSelectValue && presetSelectValue.startsWith('musics/')) return presetSelectValue;
    return '';
}

/**
 * Build V2 config object từ legacy state.
 *
 * @param {Object} legacy - kết quả getCurrentConfig() + extras (imageUrls, audioUrl).
 * @param {Object} [opts]
 * @param {string} [opts.websiteTitle] - tiêu đề website (header / share).
 * @param {string} [opts.presetAudio]  - giá trị #presetAudioSelect (nếu không upload).
 * @returns {Object} V2-shaped config phù hợp schema.
 */
export function buildV2Config(legacy = {}, opts = {}) {
    const safe = legacy || {};
    const t3 = safe.text3d || {};

    return {
        websiteTitle: opts.websiteTitle || '',
        appTitle:     '',
        appIcon:      '',

        enableWebsiteInfo:   false,
        enableCentralHeart:  !!safe.centralHeartEnabled,
        enableMeteorFeature: !!safe.meteorEnabled,

        text3d: {
            text:          (t3.text || '').toString().slice(0, 180),
            fontName:      t3.fontName     || 'bevietnampro',
            size:          Number.isFinite(t3.size) ? Math.min(30, Math.max(10, Number(t3.size))) : 20,
            color:         intToHex(t3.color,         '#ffffff'),
            effectType:    t3.effectType   || 'none',
            appearEffect:  t3.appearEffect || 'none',
            emissiveColor: intToHex(t3.emissiveColor, ''),
        },

        sphereParams: {
            bodySize:             Number(safe.size              ?? safe.bodySize             ?? 6),
            rotationSpeed:        Number(safe.rotationSpeed     ?? 0.005),
            particleSpeed:        Number(safe.particleSpeed     ?? 1.0),
            diskRotationSpeed:    Number(safe.diskRotationSpeed ?? 0.001),
            textureRotationSpeed: Number(safe.textureRotationSpeed ?? 0.002),
        },

        colors: {
            backgroundColor: intToHex(safe.backgroundColor, '#ffffff'),
            innerDiskColor:  intToHex(safe.innerDiskColor,  '#ffccf2'),
            diskColor:       intToHex(safe.diskColor,       '#ffccf2'),
            outermostColor:  intToHex(safe.outermostColor,  '#ffccf2'),
        },

        flowerImages: Array.isArray(safe.imageUrls) ? safe.imageUrls.filter(Boolean).slice(0, MAX_FLOWER_IMAGES) : [],
        bgMusic:      normalizeBgMusic(safe.audioUrl, opts.presetAudio),
    };
}

// ── Atomic V2 create ────────────────────────────────────────────────────────
//
// POST /api/v2/websites/loveplannet với:
//   - Idempotency-Key header (chống double-tap UI tạo trùng đơn)
//   - body { config, features, currency, paymentMethod, customerEmail,
//            voucherCode, affiliateCode }
//
// Response:
//   { success, data: { websiteId, orderCode, linkproduct, paymentUrl,
//                      total, currency, voucher? } }

function generateIdempotencyKey() {
    // 16 ký tự hex random — đủ chống collision tay người.
    const arr = new Uint8Array(8);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function createWebsiteV2(payload) {
    const jwt = getJwt();
    // Đính mã giới thiệu CTV (từ ?ref= đã lưu, còn trong 60 ngày) nếu payload
    // chưa có — BE giảm giá đơn đầu + ghi nhận hoa hồng cho CTV.
    const referralCode = payload.referralCode || getStoredReferralCode();
    const finalPayload = referralCode ? { ...payload, referralCode } : payload;
    const res = await fetch(`${API_BASE}/websites/${TEMPLATE_TYPE}`, {
        method:  'POST',
        headers: {
            'Content-Type':    'application/json',
            'Authorization':   'Bearer ' + jwt,
            'Idempotency-Key': generateIdempotencyKey(),
        },
        body: JSON.stringify(finalPayload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
        const msg = json.error?.message || json.message || `Tạo website thất bại (${res.status})`;
        const err = new Error(msg);
        err.status  = res.status;
        err.details = json.error?.details || json.details;
        throw err;
    }
    return json.data;
}

// ── Legacy alias ────────────────────────────────────────────────────────────
//
// sphere.js cũ gọi `createDataProduct({uid, name, type, price, images, linkproduct})`.
// Giữ alias chuyển hướng sang createWebsiteV2 + warning để dev biết là deprecated.
// KHÔNG support đầy đủ — chỉ làm fallback nếu code cũ còn import.
export async function createDataProduct(_legacyArgs) {
    console.warn('[createDataProduct] DEPRECATED — V2 dùng createWebsiteV2(payload). ' +
                 'Args cũ {uid, name, type, price, images, linkproduct} bị ignore. ' +
                 'Refactor sphere.js → gọi createWebsiteV2.');
    throw new Error('createDataProduct deprecated — dùng createWebsiteV2(payload) thay thế.');
}

// Re-export VIEWER_ORIGIN để sphere.js build linkproduct fallback nếu cần.
export { VIEWER_ORIGIN };
