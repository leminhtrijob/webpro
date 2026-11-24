import * as THREE from 'three';
import { fileToBase64, uploadImageToR2, uploadAudioToR2, buildV2Config, createWebsiteV2 } from './createProduct.js';
import { SERVER_URL_PROD, API_BASE, VIEWER_ORIGIN, TEMPLATE_TYPE, MAX_FLOWER_IMAGES } from './config.js';
import { processPayment, showToast, startPaymentPolling, cleanupPaymentState } from './payment.js';
import { setupVoucherListeners, loadUserVouchers, getFinalPrice, updateTotalPrice, getSelectedVoucherCode, getSelectedVoucherInfo } from './vouchers.js';
import { createNebulaSystem, getDefaultNebulaColors, getWarmNebulaColors, getCoolNebulaColors, createGlowMaterial } from './nebula-system.js';

// ════════════════════════════════════════════════════════════════════════════
// SERVER-AUTHORITATIVE PRICING (P1)
// ════════════════════════════════════════════════════════════════════════════
//
// BE trả pricing config qua GET /api/v2/pricing/loveplannet — gồm features +
// expiration kèm cả 2 giá VND/USD. FE cache 5 phút (khớp BE TTL) để không
// phải fetch lại mỗi lần click.
//
// Khi cache load xong (async, có thể sau khi UI mount) → bắn event
// 'pricing:loaded' để code có thể trigger updateTotalPrice tính lại.
//
// Fallback: nếu fetch fail (offline, BE down, 4xx/5xx) → calculateTotalPrice
// dùng FALLBACK_PRICES hard-code (giữ behavior cũ, không vỡ flow create).
// FALLBACK phải khớp src/templates/loveplannet/pricing.js để tránh lệch.
const PRICING_CACHE_TTL_MS = 5 * 60 * 1000;
const POLAR_MIN_USD = 3;
const FALLBACK_PRICES = {
    centralHeart:    10000,
    flowerImageExtra: 3000, // perExtra cho flowerImages, freeCount=1
    customMusic:      5000,
    meteors:          5000,
    customSlug:      10000,
    expiration: { '15d': 0, '1year': 30000, 'forever': 60000 },
};
const FALLBACK_USD = {
    centralHeart:     0.4,
    flowerImageExtra: 0.12,
    customMusic:      0.2,
    meteors:          0.2,
    customSlug:       0.4,
    expiration: { '15d': 0, '1year': 1.2, 'forever': 2.4 },
};
let _pricingCache = null;
let _pricingFetchedAt = 0;
let _pricingInFlight = null;

/**
 * Fetch pricing config từ BE — cache TTL 5 phút.
 * Idempotent: nhiều caller gọi cùng lúc → chỉ 1 request thực sự bay đi.
 * @returns {Promise<object|null>} pricing config hoặc null nếu fail (caller fallback).
 */
async function fetchPricingConfig() {
    const now = Date.now();
    if (_pricingCache && (now - _pricingFetchedAt) < PRICING_CACHE_TTL_MS) {
        return _pricingCache;
    }
    if (_pricingInFlight) return _pricingInFlight;

    _pricingInFlight = (async () => {
        try {
            const res = await fetch(`${API_BASE}/pricing/${TEMPLATE_TYPE}`);
            if (!res.ok) throw new Error(`pricing HTTP ${res.status}`);
            const json = await res.json();
            if (!json || !json.success || !json.data) throw new Error('pricing payload invalid');
            _pricingCache = json.data;
            _pricingFetchedAt = Date.now();
            window.__lpUsdPricingReady = isUsdPricingReady();
            // Báo cho code đang chờ pricing (vd: calculateTotalPrice đã render
            // bằng fallback) để recompute với giá đúng.
            window.dispatchEvent(new CustomEvent('pricing:loaded', { detail: _pricingCache }));
            return _pricingCache;
        } catch (err) {
            console.warn('[pricing] fetch failed, dùng fallback hard-code:', err.message);
            return null;
        } finally {
            _pricingInFlight = null;
        }
    })();
    return _pricingInFlight;
}

/**
 * Đọc giá feature từ cache (đã fetch) hoặc fallback.
 * @param {string} key - key feature trong src/templates/loveplannet/pricing.js
 * @returns {number} giá VND (0 nếu key không tồn tại)
 */
function getFeaturePrice(key) {
    if (_pricingCache && _pricingCache.features && _pricingCache.features[key]) {
        const f = _pricingCache.features[key];
        return Number(f.price) || 0;
    }
    return FALLBACK_PRICES[key] || 0;
}

/**
 * Đọc perExtra cho feature có quota free (vd: flowerImages free 1, extra +3k).
 * @returns {number} perExtra VND
 */
function getFeaturePerExtra(key) {
    if (_pricingCache && _pricingCache.features && _pricingCache.features[key]) {
        const f = _pricingCache.features[key];
        if (typeof f.perExtra === 'number') return f.perExtra;
    }
    // FALLBACK_PRICES dùng key 'flowerImageExtra' cho rõ — chỉ flowerImages có perExtra ở loveplannet.
    if (key === 'flowerImages') return FALLBACK_PRICES.flowerImageExtra;
    return 0;
}

/**
 * Đọc freeCount cho feature có quota.
 */
function getFeatureFreeCount(key) {
    if (_pricingCache && _pricingCache.features && _pricingCache.features[key]) {
        const f = _pricingCache.features[key];
        if (typeof f.freeCount === 'number') return f.freeCount;
    }
    if (key === 'flowerImages') return 1;
    return 0;
}

/**
 * Đọc giá expiration tier.
 * @param {string} tier - '15d' | '1year' | 'forever'
 */
function getExpirationPrice(tier) {
    if (_pricingCache && _pricingCache.expiration && _pricingCache.expiration[tier]) {
        return Number(_pricingCache.expiration[tier].price) || 0;
    }
    return FALLBACK_PRICES.expiration[tier] || 0;
}

function getSelectedCurrency() {
    const polar = document.querySelector('input[name="paymentMethod"][value="POLAR"]');
    return (polar && polar.checked) ? 'USD' : 'VND';
}

function isUsdPricingReady() {
    return !!(_pricingCache && _pricingCache.features);
}

function getFeaturePriceCurrency(key, currency) {
    const isUsd = currency === 'USD';
    if (_pricingCache && _pricingCache.features && _pricingCache.features[key]) {
        const f = _pricingCache.features[key];
        return isUsd ? (Number(f.priceUsd) || 0) : (Number(f.price) || 0);
    }
    if (isUsd) return FALLBACK_USD[key] ?? 0;
    return FALLBACK_PRICES[key] ?? 0;
}

function getFeaturePerExtraCurrency(key, currency) {
    const isUsd = currency === 'USD';
    if (_pricingCache && _pricingCache.features && _pricingCache.features[key]) {
        const f = _pricingCache.features[key];
        if (isUsd && typeof f.perExtraUsd === 'number') return f.perExtraUsd;
        if (!isUsd && typeof f.perExtra === 'number') return f.perExtra;
    }
    if (key === 'flowerImages') {
        return isUsd ? FALLBACK_USD.flowerImageExtra : FALLBACK_PRICES.flowerImageExtra;
    }
    return 0;
}

function getExpirationPriceCurrency(tier, currency) {
    const isUsd = currency === 'USD';
    if (_pricingCache && _pricingCache.expiration && _pricingCache.expiration[tier]) {
        const e = _pricingCache.expiration[tier];
        return isUsd ? (Number(e.priceUsd) || 0) : (Number(e.price) || 0);
    }
    if (isUsd) return FALLBACK_USD.expiration[tier] ?? 0;
    return FALLBACK_PRICES.expiration[tier] ?? 0;
}

function getExpirationLabel(tier) {
    const EXP_LABELS = { '15d': '15 ngày', '1year': '1 năm', 'forever': 'Vĩnh viễn' };
    if (_pricingCache && _pricingCache.expiration && _pricingCache.expiration[tier]) {
        const beLabel = _pricingCache.expiration[tier].label;
        if (beLabel) return beLabel;
    }
    return EXP_LABELS[tier] || tier;
}

function formatPriceAmount(amount, currency) {
    const n = Number(amount) || 0;
    if (!n) return 'Miễn phí';
    if (currency === 'USD') {
        const fixed = n.toFixed(2).replace(/\.00$/, '');
        return '$' + fixed;
    }
    return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';
}

function getSlugPriceDisplay(currency) {
    const p = getFeaturePriceCurrency('customSlug', currency);
    return p ? ('+' + formatPriceAmount(p, currency)) : 'Miễn phí';
}

function refreshExpirationSelect(currency) {
    const sel = document.getElementById('expirationSelect');
    if (!sel) return;
    const current = sel.value || '15d';
    const tiers = (_pricingCache && _pricingCache.expiration)
        ? Object.keys(_pricingCache.expiration)
        : Object.keys(FALLBACK_PRICES.expiration);

    sel.innerHTML = tiers.map(tier => {
        const label = getExpirationLabel(tier);
        const price = getExpirationPriceCurrency(tier, currency);
        const suffix = price > 0 ? ` (+${formatPriceAmount(price, currency)})` : ' (miễn phí)';
        return `<option value="${tier}">${label}${suffix}</option>`;
    }).join('');

    if (tiers.includes(current)) sel.value = current;
    else sel.value = '15d';
}

function refreshPriceTable(currency) {
    const el = document.getElementById('priceTableDetails');
    if (!el) return;
    const ch  = getFeaturePriceCurrency('centralHeart', currency);
    const fe  = getFeaturePerExtraCurrency('flowerImages', currency);
    const mu  = getFeaturePriceCurrency('customMusic', currency);
    const met = getFeaturePriceCurrency('meteors', currency);
    const sl  = getFeaturePriceCurrency('customSlug', currency);
    const expRows = ((_pricingCache && _pricingCache.expiration)
        ? Object.entries(_pricingCache.expiration)
        : Object.entries(FALLBACK_PRICES.expiration).map(([k, v]) => [k, { price: v }])
    ).map(([tier]) => {
        const label = getExpirationLabel(tier);
        const price = getExpirationPriceCurrency(tier, currency);
        const priceText = price > 0 ? ('+' + formatPriceAmount(price, currency)) : 'Miễn phí';
        return `<div>⏰ ${label}: <strong>${priceText}</strong></div>`;
    }).join('');

    el.innerHTML = `
        <div style="font-weight:600;color:#333;margin-bottom:8px;font-size:1em;">📋 Bảng giá:</div>
        <div style="font-weight:600;color:#555;margin:6px 0 4px;font-size:0.9em;">Tính năng:</div>
        <div>💖 Trái tim 3D ở giữa: +${formatPriceAmount(ch, currency)}</div>
        <div>🖼️ Ảnh vòng (từ ảnh thứ 2): +${formatPriceAmount(fe, currency)}/ảnh</div>
        <div>🎵 Đổi nhạc nền (file): +${formatPriceAmount(mu, currency)}</div>
        <div>☄️ Mưa sao băng: +${formatPriceAmount(met, currency)}</div>
        <div>🔗 Link đẹp (custom slug): +${formatPriceAmount(sl, currency)}</div>
        <div style="font-weight:600;color:#555;margin:10px 0 4px;font-size:0.9em;">Thời hạn lưu:</div>
        ${expRows}
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 0.85em; color: #888; font-style: italic;">
            💡 <strong>Lưu ý:</strong> Ấn "Xem trước" (nút xám ở cuối bảng) để xem tất cả thay đổi đã chọn
        </div>`;
}

function refreshSlugPriceChip(currency) {
    const chip = document.getElementById('slugPriceChip');
    if (chip) chip.textContent = getSlugPriceDisplay(currency);
}

function refreshFeaturePriceChips(currency) {
    const heart = document.getElementById('centralHeartPriceChip');
    if (heart) heart.textContent = '+' + formatPriceAmount(getFeaturePriceCurrency('centralHeart', currency), currency);
    const met = document.getElementById('meteorsPriceChip');
    if (met) met.textContent = '+' + formatPriceAmount(getFeaturePriceCurrency('meteors', currency), currency);
    const mu = document.getElementById('customMusicPriceChip');
    if (mu) mu.textContent = 'upload: +' + formatPriceAmount(getFeaturePriceCurrency('customMusic', currency), currency);
}

function applyPricingToUI() {
    const currency = getSelectedCurrency();
    refreshExpirationSelect(currency);
    refreshPriceTable(currency);
    refreshSlugPriceChip(currency);
    refreshFeaturePriceChips(currency);
}

window.refreshExpirationSelect = refreshExpirationSelect;
window.refreshSlugPriceChip = refreshSlugPriceChip;
window.refreshPriceTable = refreshPriceTable;

function updateTipInputVisibility(currency) {
    const vndWrap = document.getElementById('tipAmountVndWrap');
    const usdWrap = document.getElementById('tipAmountUsdWrap');
    if (!vndWrap || !usdWrap) return;
    if (currency === 'USD') {
        vndWrap.style.display = 'none';
        usdWrap.style.display = '';
    } else {
        vndWrap.style.display = '';
        usdWrap.style.display = 'none';
    }
}

export class CentralSphere {
    constructor(scene) {
        this.scene = scene;
        this.config = {
            color1: '#ff6b6b',
            color2: '#4ecdc4',
            size: 9,
            rotationSpeed: 0.005,
            particleSpeed: 2.0,
            points: 15000,
            radius: { MIN: 55, MAX: 60 },
            isGradient: false
        };

        this.points = [];
        this.sizes = [];
        this.shifts = [];
        this.uniforms = {
            time: { value: 0 },
            particleSpeed: { value: this.config.particleSpeed }
        };
        this.object = null;
        this.clock = new THREE.Clock();
        this.particleSystem = null;
        this.flowerRing = null;
        this.nebulas = []; // Mảng chứa các tinh vân
        this.setupUI();
        this.createBody();

        // Bootstrap server-authoritative pricing (P1).
        // Fire-and-forget — UI vẫn render với FALLBACK_PRICES ngay; khi cache
        // load xong sẽ bắn event 'pricing:loaded' để recompute tổng tiền.
        fetchPricingConfig();
        window.addEventListener('pricing:loaded', () => {
            applyPricingToUI();
            if (typeof updateTotalPrice === 'function') {
                try { updateTotalPrice(() => this.calculateTotalPrice()); } catch (e) { /* noop */ }
            }
        });
    }

    setupUI() {
        // Tạo container cho bảng điều khiển
        const controlsContainer = document.createElement('div');
        controlsContainer.innerHTML = `
            <div class="settings-icon">
                <i class="fas fa-cog"></i>
            </div>
            <div id="controlsDashboard" class="controls dashboard" style="display: none; max-width: 420px; min-width: 420px; width: 420px;padding:5px">
                <div class="dashboard-header">
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                    <div class="controls-header">
                        <h2 class="dashboard-title" style="margin:0;font-size:1.6em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%;font-family:'Dancing Script Bold',cursive;">Sáng tạo Thiên Hà</h2>
                        <button id="showPriceTableBtn" class="price-table-btn" style="background:none;border:1px solid #ddd;color:#666;font-size:0.95em;padding:3px 8px;border-radius:4px;cursor:pointer;margin-left:10px;white-space:nowrap;">📋 Bảng giá</button>
                    </div>
                    <div id="priceTableDetails" style="font-size:0.92em;color:#666;margin:8px 0 0 0;line-height:1.4;display:none;text-align:left;background:#f9f9f9;padding:10px 8px 8px 8px;border-radius:8px;border:1px solid #eee;width:100%;box-sizing:border-box;max-width:320px;">
                        <!-- Bảng giá render động từ BE (applyPricingToUI) -->
                    </div>
                </div>
                <div class="dashboard-content">
                    <div class="tab-bar">
                        <button class="tab-btn active" id="tab-preset">Mẫu tinh cầu đẹp</button>
                        <button class="tab-btn" id="tab-custom">Tùy chỉnh</button>
                    </div>
                    <div class="tab-content preset-content">
                        <div style="margin-bottom: 12px; padding: 8px 12px; background: rgba(255, 193, 7, 0.1); border-left: 4px solid #ffc107; color: rgba(255, 255, 255, 0.85); font-size: 0.8em; font-style: italic; border-radius: 4px; text-align: center;">
                            💡 <strong>Lưu ý:</strong> Ấn "Xem trước" (nút xám ở cuối bảng) để xem tất cả thay đổi đã chọn
                        </div>
                        <div class="control-section" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 4px;margin-bottom:4px">
                            <div class="section-divider" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em; flex: 1; min-width: 0;">🎨 Mẫu màu có sẵn</h4>
                                <button class="toggle-section" style="background: none; border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.85); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; white-space: nowrap; flex-shrink: 0;">
                                    <span class="toggle-icon">Chỉnh sửa</span>
                                </button>
                            </div>
                            <div class="section-content" style="display: none; margin-top: 10px;">
                                <div class="preset-list">
                                    <div class="preset-group-title" style="color: rgba(255, 255, 255, 0.85); font-size: 0.9em;margin-bottom: 4px;">🎨 Màu đơn</div>
                                    <div class="preset-row">
                                        <div class="preset-item" data-preset="1" style="background: #ff6b6b;"><span>Đỏ Tươi</span></div>
                                        <div class="preset-item" data-preset="2" style="background: #ffd200;"><span>Vàng Tươi</span></div>
                                        <div class="preset-item" data-preset="3" style="background: #43cea2;"><span>Xanh Ngọc</span></div>
                                        <div class="preset-item" data-preset="4" style="background: #4c1d95;"><span>Tím Đậm</span></div>
                                        <div class="preset-item" data-preset="5" style="background: #11998e;"><span>Lục Bảo</span></div>

                                        <div class="preset-item" data-preset="6" style="background: #00c3ff;"><span>Xanh Biển</span></div>
                                        <div class="preset-item" data-preset="7" style="background: #f953c6;"><span>Hồng Tươi</span></div>
                                    </div>
                                    <div class="preset-group-title" style="color: rgba(255, 255, 255, 0.85); font-size: 0.9em; margin-bottom: 4px;">🌈 Màu gradient</div>
                                    <div class="preset-row">
                                        <div class="preset-item" data-preset="9" style="background: linear-gradient(135deg,#f9a8d4,#0891b2);"><span>Hồng Ngọc</span></div>
                                        <div class="preset-item" data-preset="10" style="background: linear-gradient(135deg,#43cea2,#185a9d);"><span>Lam Ngọc</span></div>

                                        <div class="preset-item" data-preset="11" style="background: linear-gradient(135deg,#4c1d95,#d1d5db);"><span>Tím Sương</span></div>
                                        <div class="preset-item" data-preset="12" style="background: linear-gradient(135deg,#f953c6,#8B5CF6);"><span>Hồng Tím</span></div>
                                        <div class="preset-item" data-preset="13" style="background: linear-gradient(135deg,#11998e,#8B5CF6);"><span>Thạch Lam</span></div>
                                        <div class="preset-item" data-preset="14" style="background: linear-gradient(135deg,#8B5CF6,#3B82F6);"><span>Tím lam</span></div>
                                        <div class="preset-item" data-preset="15" style="background: linear-gradient(135deg,#3B82F6,#8B5CF6);"><span>Lam Tím</span></div>
                                        <div class="preset-item" data-preset="16" style="background: linear-gradient(135deg,#ec4899,#f59e0b);"><span>Kim Hồng</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="tab-content custom-content" style="display:none;">
                        <div class="control-section custom-only" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                            <div class="section-divider" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em; flex: 1; min-width: 0;">🎨 Màu sắc tinh cầu</h4>
                                <button class="toggle-section" style="background: none; border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.85); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; white-space: nowrap; flex-shrink: 0;">
                                    <span class="toggle-icon">Chỉnh sửa</span>
                                </button>
                            </div>
                            <div class="section-content" style="display: none; margin-top: 10px;">
                                <div class="color-mode">
                                    <button id="singleColor">Màu đơn</button>
                                    <button id="gradientColor" class="active">Màu gradient</button>
                                </div>
                                <div class="color-picker single-color" style="display: none;">
                                    <label for="bodyColor1">Màu:</label>
                                    <input type="color" id="bodyColor1" value="#ff6b6b">
                                </div>
                                <div class="color-picker gradient-color">
                                    <label for="gradientColor1">Màu 1:</label>
                                    <input type="color" id="gradientColor1" value="#ff6b6b">
                                    <label for="gradientColor2">Màu 2:</label>
                                    <input type="color" id="gradientColor2" value="#4ecdc4">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="control-section preset-only" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                        <div class="section-divider" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em; flex: 1; min-width: 0;">✨ Hiệu ứng tinh vân</h4>
                            <button class="toggle-section" style="background: none; border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.85); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; white-space: nowrap; flex-shrink: 0;">
                                <span class="toggle-icon">Chỉnh sửa</span>
                            </button>
                        </div>
                        <div class="section-content" style="display: none; margin-top: 10px;">
                            <div style="margin-bottom: 8px;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <input type="checkbox" id="enableNebula" style="width:16px; height:16px;">
                                    <label for="enableNebula" style="color: rgba(255, 255, 255, 0.85); font-size:0.9em; margin:0; cursor:pointer;">Bật hiệu ứng tinh vân</label>
                                </div>
                                <div style="color:rgba(255, 255, 255, 0.6); font-size:0.8em; margin-left:24px; margin-top:4px;">(Tạo tinh vân ngẫu nhiên đẹp mắt)</div>
                            </div>
                        </div>
                    </div>
                    <div class="control-section preset-only" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 4px 6px; margin-bottom: 8px;">
                        <div class="section-divider" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em; flex: 1; min-width: 0;">🔤 Chữ 3D 
                                <span style="vertical-align:middle;margin-left:8px;">
                                    <img src="assets/images/new1.gif" alt="NEW" style="height:22px;vertical-align:middle;">
                                </span>
                            </h4>
                            <button class="toggle-section" style="background: none; border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.85); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; white-space: nowrap; flex-shrink: 0;">
                                <span class="toggle-icon">Chỉnh sửa</span>
                            </button>
                        </div>
                        <div class="section-content" style="display: none; margin-top: 10px;">
                            <div class="control-group" style="margin-bottom: 6px; display: flex; flex-direction: column;">
                                <label for="heartTextInput" style="margin-bottom: 4px; color: rgba(255,255,255,0.85); font-size: 0.9em; font-style: italic;">Nếu bạn không điền gì thì chữ 3D sẽ không được hiện ở sản phẩm,"Love Planet" chỉ là mẫu thôi nhé </label>
                                <textarea id="heartTextInput" rows="3" style="width:100%;min-height:60px;resize:vertical;padding:6px 8px;font-size:1em;border-radius:6px;border:1px solid #2e3c4d;background:#181c24;color:#fff;box-sizing:border-box;margin-bottom:6px;line-height:1.5;" maxlength="180" placeholder="Tối đa 3 dòng,ví dụ:\nChúc mừng sinh nhật\nLuôn vui vẻ nhé\nMãi bên nhau!"></textarea>
                            </div>
                            <div style="margin-bottom: 12px;">
                              <label style="display: block; margin-bottom: 6px; color: rgba(255,255,255,0.85); font-size: 0.9em;">Font chữ:</label>
                              <select id="textFont" style="width: 100%; padding: 6px; border-radius: 4px; background: transparent; color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.2);">
                                <option value="bevietnampro">Be Vietnam Pro</option>
                                <option value="intertight">Inter Tight</option>
                                <option value="googlesanscode">Google Sans Code</option>
                                <option value="meow_script">Meow Script</option>
                                <option value="pacifico">Pacifico</option>
                                <option value="updock">Updock</option>
                                <option value="alumni_sans_pinstripe">Alumni Sans Pinstripe</option>
                                <option value="dancing_script">Dancing Script</option>
                                <option value="cormorantunicase">Cormorant Unicase</option>
                             
                              </select>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <label for="textSize" style="display: block; margin-bottom: 6px; color: rgba(255,255,255,0.85); font-size: 0.9em;">Kích thước chữ: <span id="textSizeValue" style="color: #4ecdc4; font-weight: bold;">20</span></label>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="color: rgba(255,255,255,0.6); font-size: 0.8em;">10</span>
                                    <input type="range" id="textSize" min="10" max="30" step="1" value="20" style="flex: 1;">
                                    <span style="color: rgba(255,255,255,0.6); font-size: 0.8em;">30</span>
                                </div>
                            </div>

                            <div style="margin-bottom: 12px;">
                                <label style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Màu text:</label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="color" id="textColor" value="#ffffff" style="width: 100px;">
                                </div>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <label style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Hiệu ứng:</label>
                                <select id="textEffect" 
                                    style="width: 100%; padding: 6px; border-radius: 4px; background: transparent; color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.2);">
                                    <option value="none">None - Không hiệu ứng</option>
                                    <option value="float">Float - Nổi lên xuống</option>
                                    <option value="fade">Fade - Mờ dần hiện dần</option>
                                    <option value="rainbow">Rainbow - Cầu vồng</option>
                                    <option value="pulse">Pulse - Phóng to thu nhỏ</option>
                                    <option value="glow">Glow - Sáng dần tối dần</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 12px;">
                              <label style="display: block; margin-bottom: 6px; color: rgba(255,255,255,0.85); font-size: 0.9em;">Hiệu ứng xuất hiện:</label>
                              <select id="textAppearEffect" style="width:100%; padding: 6px; border-radius: 4px; background: transparent; color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.2);">
                                  <option value="none">Không hiệu ứng</option>
                                <option value="fadein">Tỏ dần từ mờ</option>
                                </select>
                              </div>

                        </div>
                    </div>

                    <div class="control-section custom-only" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                        <div class="section-divider" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em; flex: 1; min-width: 0;">✨ Tùy chỉnh tinh cầu chính giữa</h4>
                            <button class="toggle-section" style="background: none; border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.85); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; white-space: nowrap; flex-shrink: 0;">
                                <span class="toggle-icon">Chỉnh sửa</span>
                            </button>
                        </div>
                        <div class="section-content" style="display: none; margin-top: 10px;">
                            <div class="control-group" style="margin-bottom: 12px;">
                                <label for="bodySize" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Mật độ hạt tinh cầu:</label>
                                <input type="range" id="bodySize" min="4" max="16" step="0.4" value="6" style="width: 100%; margin: 0;">
                            </div>
                            <div class="control-group" style="margin-bottom: 12px;">
                                <label for="rotationSpeed" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Tốc độ xoay tinh cầu:</label>
                                <input type="range" id="rotationSpeed" min="0.0005" max="3" step="0.01" value="0.005" style="width: 100%; margin: 0;">
                            </div>
                            <div class="control-group" style="margin-bottom: 0;">
                                <label for="particleSpeed" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Tốc độ hạt tinh cầu:</label>
                                <input type="range" id="particleSpeed" min="0.5" max="15.0" step="0.1" value="1.0" style="width: 100%; margin: 0;">
                            </div>
                        </div>
                    </div>
                    <div class="control-section custom-only" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                        <div class="section-divider" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em; flex: 1; min-width: 0;">✨ Tốc độ quay các đĩa</h4>
                            <button class="toggle-section" style="background: none; border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.85); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; white-space: nowrap; flex-shrink: 0;">
                                <span class="toggle-icon">Chỉnh sửa</span>
                            </button>
                        </div>
                        <div class="section-content" style="display: none; margin-top: 10px;">
                            <div class="control-group" style="margin-bottom: 12px;">
                                <label for="diskRotationSpeed" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Tốc độ quay đĩa:</label>
                                <input type="range" id="diskRotationSpeed" min="0.00005" max="0.1" step="0.00001" value="0.001" style="width: 100%; margin: 0;">
                            </div>
                            <div class="control-group" style="margin-bottom: 0;">
                                <label for="textureRotationSpeed" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Tốc độ quay vòng ảnh:</label>
                                <input type="range" id="textureRotationSpeed" min="0.0005" max="0.02" step="0.0005" value="0.002" style="width: 100%; margin: 0;">
                            </div>
                        </div>
                    </div>
                    <div class="control-section custom-only" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                        <div class="section-divider" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em; flex: 1; min-width: 0;">🎨 Màu sắc các đĩa hạt</h4>
                            <button class="toggle-section" style="background: none; border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.85); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; white-space: nowrap; flex-shrink: 0;">
                                <span class="toggle-icon">Chỉnh sửa</span>
                            </button>
                        </div>
                        <div class="section-content" style="display: none; margin-top: 10px;">
                            <div class="control-group">
                                <div class="particle-colors">
                                    <div class="color-picker" style="margin-bottom: 12px;">
                                        <label for="backgroundColor" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Màu nền không gian:</label>
                                        <input type="color" id="backgroundColor" value="#ffffff" style="width: 50px; height: 30px; border: none; padding: 0;">
                                    </div>
                                    <div class="color-picker" style="margin-bottom: 12px;">
                                        <label for="innerDiskColor" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Màu đĩa trong:</label>
                                        <input type="color" id="innerDiskColor" value="#ffccf2" style="width: 50px; height: 30px; border: none; padding: 0;">
                                    </div>
                                    <div class="color-picker" style="margin-bottom: 12px;">
                                        <label for="diskColor" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Màu đĩa giữa:</label>
                                        <input type="color" id="diskColor" value="#ffccf2" style="width: 50px; height: 30px; border: none; padding: 0;">
                                    </div>
                                 
                                    <div class="color-picker" style="margin-bottom: 0;">
                                        <label for="outermostColor" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Màu đĩa ngoài:</label>
                                        <input type="color" id="outermostColor" value="#ffccf2" style="width: 50px; height: 30px; border: none; padding: 0;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="control-section preset-only" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                        <div class="section-divider" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em; flex: 1; min-width: 0;">💖☄️ Trái tim 3D & Mưa sao băng</h4>
                            <button class="toggle-section" style="background: none; border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.85); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; white-space: nowrap; flex-shrink: 0;">
                                <span class="toggle-icon">Chỉnh sửa</span>
                            </button>
                        </div>
                        
                        <div class="section-content" style="display: none; margin-top: 10px;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                                <input type="checkbox" id="enableCentralHeart" style="width:18px;height:18px;">
                                <label style="margin:0;display:flex;align-items:center;gap:8px;color: rgba(255, 255, 255, 0.85);font-size:0.9em;">Trái tim to ở giữa
                                    <span style="vertical-align:middle;margin-left:8px;">
                                        <span id="centralHeartPriceChip" style="color:#e53935;font-size:0.98em;font-weight:600;margin-left:2px;">10.000đ</span>
                                    </span>
                                </label>
                            </div>

                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                                <input type="checkbox" id="enableMeteorFeature" style="width:18px;height:18px;">
                                <label style="margin:0;display:flex;align-items:center;gap:8px;color: rgba(255, 255, 255, 0.85);font-size:0.9em;">Mưa sao băng
                                    <span style="vertical-align:middle;margin-left:8px;">
                                        <img src="assets/images/vip.gif" alt="VIP" style="height:22px;vertical-align:middle;">
                                        <span id="meteorsPriceChip" style="color:#e53935;font-size:0.98em;font-weight:600;margin-left:2px;">5.000đ</span>
                                    </span>
                                </label>
                            </div>

                            <div class="control-group" style="margin-bottom: 12px;">
                                <label style="display:block;margin-bottom:8px;color: rgba(255, 255, 255, 0.85);font-size:0.9em;">Kiểu màu sao băng:</label>
                                <div style="display:flex;gap:8px;margin-bottom:8px;">
                                    <button id="meteorTabSingle" class="active" type="button" style="padding: 4px 12px;border-radius:4px;">Màu đơn</button>
                                    <button id="meteorTabGradient" type="button" style="padding: 4px 12px;border-radius:4px;">Màu gradient</button>
                                </div>
                                <div id="meteorSingleColorBox">
                                    <input type="color" id="meteorColorPicker" value="#00f0ff" style="width:38px;height:38px;">
                                </div>
                                <div id="meteorGradientColorBox" style="display:none;">
                                    <input type="color" id="meteorGradientColor1" value="#00f0ff" style="width:38px;height:38px;">
                                    <input type="color" id="meteorGradientColor2" value="#ffffff" style="width:38px;height:38px;margin-left:8px;">
                                </div>
                            </div>

                            <div class="control-group" style="margin-bottom: 12px;">
                                <label for="meteorSpeedRange" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Tốc độ bay:</label>
                                <input type="range" id="meteorSpeedRange" min="5" max="50" step="5" value="10" style="width: 100%; margin: 0;">
                            </div>

                            <div class="control-group" style="margin-bottom: 0;">
                                <label for="meteorDensityRange" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Mật độ sao băng:</label>
                                <input type="range" id="meteorDensityRange" min="10" max="250" step="20" value="30" style="width: 100%; margin: 0;">
                            </div>
                        </div>
                    </div>
                    <div class="control-section preset-only" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 4px; margin-bottom: 8px;">
                        <div class="section-divider" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em; flex: 1; min-width: 0;">🖼️ Vòng ảnh & 🎵 Nhạc nền</h4>
                            <button class="toggle-section" style="background: none; border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.85); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; white-space: nowrap; flex-shrink: 0;">
                                <span class="toggle-icon">Chỉnh sửa</span>
                            </button>
                        </div>
                        <div class="section-content" style="display: none; margin-top: 10px;"> 
                            <!-- Vùng tùy chỉnh ảnh -->
                            <div class="control-group" style="background: linear-gradient(135deg, #f8f9ff, #fff5f8); border-radius: 8px; padding: 8px; margin-bottom: 12px; border: 1px solid #e8eaff;">
                                <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
                                    <span style="font-size: 1em;">🖼️</span>
                                    <label for="flowerImageInput" style="font-weight: 500; color: #333; margin: 0; font-size: 0.9em;">Đổi ảnh</label>
                                    <span id="imagePriceText" style="color:#ff6b6b;font-weight:500;font-size:0.9em;margin-left:auto;"></span>
                                </div>
                                
                                <label for="flowerImageInput" style="background: #fff; border: 2px dashed #ddd; border-radius: 4px; padding: 8px; text-align: center; transition: all 0.3s ease; cursor: pointer; display:block;">
                                    <div style="font-size: 1.2em; margin-bottom: 4px;">📁</div>
                                    <div style="color: #666; font-size: 0.8em; margin-bottom: 2px;">Nhấn để chọn ảnh</div>
                                    <div style="color: #999; font-size: 0.7em;">JPG, PNG • Tối đa ${MAX_FLOWER_IMAGES} ảnh • Miễn phí ảnh đầu</div>
                                </label>
                                
                                <input type="file" id="flowerImageInput" accept="image/jpeg,image/png" multiple style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" aria-hidden="true">
                                
                                <!-- Preview ảnh -->
                                <div id="flowerImagePreview" style="margin-top: 8px; display: none;">
                                    <div style="font-weight: 500; color: #333; margin-bottom: 8px; font-size: 0.9em;">📸 Ảnh đã chọn:</div>
                                    <div id="imagePreviewContainer" style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
                                </div>
                                
                                <div id="flowerImageStatus" style="font-size:0.9em;color:#666;margin-top:8px;padding:8px;background:#f8f9fa;border-radius:6px;border-left:3px solid #6c757d;"></div>
                            </div>
                            
                            <!-- Vùng tùy chỉnh audio -->
                            <div style="margin-bottom: 12px;">
                                <label for="presetAudioSelect" style="font-weight:600; color: rgba(255, 255, 255, 0.85); font-size: 0.9em; margin-bottom: 6px; display: block;">Đổi nhạc nền: 
                                    <span id="customMusicPriceChip" style="color:#e53935;font-size:0.9em;font-weight:600;margin-left:4px;">upload: +5.000đ</span>
                                </label>
                                <select id="presetAudioSelect" style="width:100%;margin-bottom:8px; padding: 6px; border-radius: 4px; background: #4a4a4a; color: #ffffff; border: 1px solid rgba(255,255,255,0.3); font-size: 0.9em;">
                                    <option value="">-- Chọn nhạc có sẵn --</option>
                                    <option value="assets/musics/hukhong.mp3">Hư Không</option>
                                    <option value="assets/musics/cochacyeuladay.mp3">Có Chắc Yêu Là Đây</option>
                                    <option value="assets/musics/1000anhmat.mp3">1000 ánh mắt</option>
                                    <option value="assets/musics/anhnangcuaanh.mp3">Ánh nắng của anh</option>
                                    <option value="assets/musics/denbenanh.mp3">Đến bên anh</option>
                                    <option value="assets/musics/dunglamtraitimanhdau.mp3">Đừng làm trái tim anh đau</option>
                                    <option value="assets/musics/lambantraianhe.mp3">Làm bạn trai anh nhé</option>
                                    <option value="assets/musics/phepmau.mp3">Phép màu</option>
                                    <option value="assets/musics/suynghitronganh.mp3">Suy nghĩ trong anh</option>
                                    <option value="assets/musics/yeuemhonmoingay.mp3">Yêu em hơn mỗi ngày</option>
                                    <option value="assets/musics/codoidieu.mp3">Có đôi điều</option>
                                    <option value="assets/musics/motdoi.mp3">Một đời</option>
                                    <option value="assets/musics/tungngayyeuem.mp3">Từng ngày yêu em</option>
                                    <option value="assets/musics/yeuemratnhieu.mp3">Yêu em rất nhiều</option>
                                    <option value="assets/musics/perfect.mp3">Perfect</option>
                                    <option value="assets/musics/eyenoselip.mp3">Eye Nose Lips</option>
                                    <option value="assets/musics/givemeyourforever.mp3">Give Me Your Forever</option>
                                    <option value="assets/musics/happy-birthday.mp3">Happy Birthday</option>
                                </select>
                                <label for="audioInput" style="font-weight:600; color: rgba(255, 255, 255, 0.85); font-size: 0.9em; margin-bottom: 6px; display: block;">Hoặc nhập nhạc MP3 của bạn (tối đa 10MB):</label>
                                <input type="file" id="audioInput" accept="audio/mp3,audio/mpeg" style="margin-bottom:8px; width: 100%; padding: 6px; border-radius: 4px; background: transparent; color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.2);">
                                <div id="audioPriceText" style="display:inline-block;font-size:0.9em;color:#ff6b6b;font-weight:600;margin-left:8px;"></div>
                                <audio id="audioPreview" controls style="display:none;width:100%;margin-bottom:8px;"></audio>
                            </div>
                        </div>
                    </div>
                    <div class="control-section preset-only" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 4px; margin-bottom: 8px;">
                        <div class="section-divider" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em; flex: 1; min-width: 0;">🎫 Lựa chọn thêm</h4>
                            <button class="toggle-section" style="background: none; border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.85); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; white-space: nowrap; flex-shrink: 0;">
                                <span class="toggle-icon">Đóng</span>
                            </button>
                        </div>
                        <div class="section-content" style="display: block; margin-top: 10px;">

                        <div id="voucherListBox" style="margin-bottom: 12px;">
                            <div style="color: rgba(255, 255, 255, 0.85); font-size: 0.9em; margin-bottom: 8px;">Chọn voucher giảm giá:</div>
                            <div id="voucherList" style="margin-bottom: 8px;"></div>
                            <div id="voucherResult" style="font-size: 0.9em; color: rgba(255, 255, 255, 0.7);"></div>
                        </div>

                        <div style="margin-bottom: 8px;">
                            <label for="expirationSelect" style="display:block; color: rgba(255, 255, 255, 0.85); font-size:0.9em; margin-bottom:6px;">Thời hạn lưu thiên hà:</label>
                            <select id="expirationSelect" style="width:100%; padding:6px 8px; border-radius:4px; border:1px solid rgba(255, 255, 255, 0.2); background: rgba(0,0,0,0.4); color: rgba(255, 255, 255, 0.9); font-size:0.9em; cursor:pointer;">
                                <option value="15d" selected>15 ngày (miễn phí)</option>
                            </select>
                            <div style="color:#e53935; font-size:0.8em; margin-top:4px;">15 ngày: thiên hà tự xoá sau 15 ngày. 1 năm/Vĩnh viễn: lưu lâu hơn.</div>
                        </div>

                        <!-- Custom slug (link đẹp) — claim ngay khi tạo, optional.
                             State lưu trên window._slugFormState (initSlugFormInput
                             cập nhật khi check API). Pricing cộng 10k khi available
                             + value non-empty. Submit gửi customSlug=true trong
                             features, sau atomic create gọi POST /websites/:id/slug. -->
                        <div style="margin-bottom: 8px; padding: 8px; border:1px solid rgba(255,255,255,0.15); border-radius:6px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                                <label for="slugInputForm" style="color: rgba(255,255,255,0.9); font-size:0.9em; margin:0;">🔗 Link đẹp (tuỳ chọn)</label>
                                <span id="slugPriceChip" style="color:#e53935; font-size:0.85em;">+10.000đ</span>
                            </div>
                            <div style="color: rgba(255,255,255,0.6); font-size:0.78em; margin-bottom:6px;">vd: p.deargift.online/<b>yeu-em</b>. Bỏ trống nếu chưa muốn đặt.</div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span style="color: rgba(255,255,255,0.6); font-size:0.78em; font-family:monospace; white-space:nowrap;">p.deargift.online/</span>
                                <input id="slugInputForm" type="text" placeholder="ten-ban-muon" maxlength="30" autocomplete="off" spellcheck="false" style="flex:1; min-width:0; padding:6px 8px; border-radius:4px; border:1.5px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.4); color: rgba(255,255,255,0.9); font-family:monospace; font-size:0.82em; outline:none;">
                            </div>
                            <div id="slugFeedbackForm" style="font-size:0.78em; margin-top:6px; min-height:14px;"></div>
                            <div id="slugSuggestionsForm" style="display:none; flex-wrap:wrap; gap:4px; margin-top:6px;"></div>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <span id="tipAmountVndWrap">
                                <label for="tipAmount" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Nhập tiền tip (tuỳ chọn, ₫):</label>
                                <div style="display: flex; align-items: center;">
                                    <input type="number" id="tipAmount" min="0" max="1000000" step="1000" value="0" style="width:120px; padding:4px 8px; border-radius:4px; border:1px solid rgba(255, 255, 255, 0.2); background: transparent; color: rgba(255, 255, 255, 0.85);">
                                    <span id="tipError" style="color:#e53935; font-size:0.9em; margin-left:8px; display:none;">Tip không hợp lệ!</span>
                                </div>
                            </span>
                            <span id="tipAmountUsdWrap" style="display:none;">
                                <label for="tipAmountUsd" style="display: block; margin-bottom: 6px; color: rgba(255, 255, 255, 0.85); font-size: 0.9em;">Nhập tiền tip (tuỳ chọn, $):</label>
                                <div style="display: flex; align-items: center;">
                                    <input type="number" id="tipAmountUsd" min="0" max="100" step="0.5" value="0" style="width:120px; padding:4px 8px; border-radius:4px; border:1px solid rgba(255, 255, 255, 0.2); background: transparent; color: rgba(255, 255, 255, 0.85);">
                                </div>
                            </span>
                        </div>
                        </div>

                    </div>
                    
                
                    
                    <div id="paymentMethodSection" class="control-section preset-only" style="border: 1px solid #e8eaff; border-radius: 4px; padding: 4px; margin-bottom: 8px; display: none;">
                        <div class="section-divider" style="margin-bottom: 12px;">
                            <h4 style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.85em;">💳 Phương thức thanh toán</h4>
                        </div>
                        <div class="payment-methods" style="display: flex; flex-direction: column; gap: 8px;">
                            <label class="payment-method-card" style="display: block; position: relative; cursor: pointer;">
                                <input type="radio" id="payOsMethod" name="paymentMethod" value="PAYOS" checked style="position: absolute; opacity: 0; pointer-events: none;">
                                <div class="payment-method-content" style="display: flex; align-items: center; padding: 8px 12px; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 8px; background: rgba(255, 255, 255, 0.05); transition: all 0.3s ease;">
                                    <div class="payment-logo" style="font-size: 24px; margin-right: 12px;">💳</div>
                                    <div class="payment-info" style="flex: 1;">
                                        <div class="payment-name" style="color: rgba(255, 255, 255, 0.9); font-weight: 600; font-size: 0.95em; margin-bottom: 2px;">Ngân hàng/Ví điện tử(MB,VCB,Momo...)</div>
                                        <div class="payment-description" style="color: #28a745; font-size: 0.8em;">Chỉ cho người dùng Việt Nam</div>
                                    </div>
                                    <div class="radio-indicator" style="width: 20px; height: 20px; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 50%; position: relative; transition: all 0.3s ease;">
                                        <div class="radio-dot" style="width: 10px; height: 10px; background: #28a745; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 1; transition: all 0.3s ease;"></div>
                                    </div>
                                </div>
                            </label>
                            <label class="payment-method-card" style="display: block; position: relative; cursor: pointer;">
                                <input type="radio" id="polarMethod" name="paymentMethod" value="POLAR" style="position: absolute; opacity: 0; pointer-events: none;">
                                <div class="payment-method-content" style="display: flex; align-items: center; padding: 8px 12px; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 8px; background: rgba(255, 255, 255, 0.05); transition: all 0.3s ease;">
                                    <div class="payment-logo" style="width: 24px; height: 24px; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
                                        <img src="assets/images/polar.png" alt="Polar" onerror="this.onerror=null;this.src='assets/images/paypal.png';" style="width: 100%; height: 100%; object-fit: contain;">
                                    </div>
                                    <div class="payment-info" style="flex: 1;">
                                        <div class="payment-name" style="color: rgba(255, 255, 255, 0.9); font-weight: 600; font-size: 0.95em; margin-bottom: 2px;">POLAR (Thẻ quốc tế)</div>
                                        <div class="payment-description" style="color: #007bff; font-size: 0.8em;">Visa / Mastercard — thanh toán USD</div>
                                    </div>
                                    <div class="radio-indicator" style="width: 20px; height: 20px; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 50%; position: relative; transition: all 0.3s ease;">
                                        <div class="radio-dot" style="width: 10px; height: 10px; background: #007bff; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0; transition: all 0.3s ease;"></div>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <div id="totalPriceBox" class="preset-only" style="text-align:center;margin:18px 0 0 0;">
                        <span style="display:inline-block;color:rgba(255, 255, 255, 0.85);font-size:1.18em;font-weight:700;padding:6px 32px;border-radius:10px;box-shadow:0 2px 8px rgba(247, 240, 240, 0.08);min-width:200px;">Tổng tiền: <span id="totalPrice" style="color:#e53935;">0đ</span></span>
                        <div id="costBreakdown" style="font-size:0.85em;color:#666;margin-top:8px;line-height:1.4;background:#f8f9fa;padding:10px;border-radius:8px;border:1px solid #e9ecef;">
                            <div style="font-weight:600;color:#333;margin-bottom:8px;font-size:0.9em;">📊 Thống kê chi phí:</div>
                            <div id="costDetails" style="text-align:left;">
                                <div style="color:#999;font-style:italic;">Chưa có tính năng mất phí nào được chọn, nếu bạn ấn tạo bây giờ thì bạn sẽ có 1 thiên hà cơ bản free</div>
                            </div>
                        </div>
                        <div style="margin-top:12px;margin-bottom:12px; padding:8px 12px; background:rgba(255, 193, 7, 0.1); border-left:4px solid #ffc107; color:rgba(255, 255, 255, 0.85); font-size:0.8em; font-style:italic; border-radius:4px;">
                            💳 <strong>Thanh toán:</strong>Nếu bạn không phải người Việt Nam,hãy chọn phương thức thanh toán POLAR (thẻ quốc tế Visa/Mastercard, tính bằng USD). Nếu gặp vấn đề, hãy liên hệ Tiktok @iamtritoan để được hỗ trợ!
                        </div>
                    </div>
                    <div class="dashboard-actions preset-only" style="text-align:center; margin-top: 24px;">
                        <button id="viewDemoBtn" style="background:#6c757d;color:#fff;font-size:1.15em;padding:12px 36px;border:none;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.12);font-weight:600;cursor:pointer;margin-right:12px;" title="Xem trước thiên hà">Xem trước</button>
                        <button id="finishCreateBtn" style="background:#ff6b6b;color:#fff;font-size:1.15em;padding:12px 36px;border:none;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.12);font-weight:600;cursor:pointer;" title="Tạo thiên hà theo các tính năng đã chọn">Hoàn tất tạo</button>
                        <div style="margin-top: 8px; font-size: 0.8em; color: rgba(255, 255, 255, 0.6); font-style: italic;">
                            💡 <strong>Lưu ý:</strong> Ấn "Xem trước" để xem tất cả thay đổi đã chọn
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(controlsContainer);

        // Xử lý sự kiện cho các nút toggle-section
        document.querySelectorAll('.toggle-section').forEach(button => {
            button.addEventListener('click', (e) => {
                const sectionContent = e.currentTarget.closest('.control-section').querySelector('.section-content');
                if (sectionContent) {
                    const isVisible = sectionContent.style.display !== 'none';
                    sectionContent.style.display = isVisible ? 'none' : 'block';
                    e.currentTarget.querySelector('.toggle-icon').textContent = isVisible ? 'Chỉnh sửa' : 'Đóng';
                }
            });
        });

        // Thiết lập event listeners
        const settingsIcon = controlsContainer.querySelector('.settings-icon');
        const controls = controlsContainer.querySelector('.controls');
        const closeBtn = controlsContainer.querySelector('.close-btn');
        // Tab logic
        const tabPreset = controlsContainer.querySelector('#tab-preset');
        const tabCustom = controlsContainer.querySelector('#tab-custom');
        const presetContent = controlsContainer.querySelector('.preset-content');
        const customContent = controlsContainer.querySelector('.custom-content');
        // Preset items
        const presetItems = controlsContainer.querySelectorAll('.preset-item');
        // ... giữ nguyên các biến custom màu ...
        const singleColorBtn = controlsContainer.querySelector('#singleColor');
        const gradientColorBtn = controlsContainer.querySelector('#gradientColor');
        const singleColorPicker = controlsContainer.querySelector('.single-color');
        const gradientColorPicker = controlsContainer.querySelector('.gradient-color');
        const bodySize = controlsContainer.querySelector('#bodySize');
        const color1Input = controlsContainer.querySelector('#gradientColor1');
        const color2Input = controlsContainer.querySelector('#gradientColor2');
        const singleColorInput = controlsContainer.querySelector('#bodyColor1');
        const rotationSpeed = controlsContainer.querySelector('#rotationSpeed');
        const particleSpeedInput = controlsContainer.querySelector('#particleSpeed');
        const diskRotationSpeedInput = controlsContainer.querySelector('#diskRotationSpeed');
        const textureRotationSpeedInput = controlsContainer.querySelector('#textureRotationSpeed');
        const backgroundColorInput = controlsContainer.querySelector('#backgroundColor');
        const diskColorInput = controlsContainer.querySelector('#diskColor');
        const innerDiskColorInput = controlsContainer.querySelector('#innerDiskColor');
        const outermostColorInput = controlsContainer.querySelector('#outermostColor');
        const flowerImageInput = controlsContainer.querySelector('#flowerImageInput');
        const flowerImageStatus = controlsContainer.querySelector('#flowerImageStatus');
        const audioInput = controlsContainer.querySelector('#audioInput');

        const presetAudioSelect = controlsContainer.querySelector('#presetAudioSelect');
        const audioPriceText = controlsContainer.querySelector('#audioPriceText');

        // Tab switching logic
        tabPreset.addEventListener('click', () => {
            tabPreset.classList.add('active');
            tabCustom.classList.remove('active');
            presetContent.style.display = '';
            customContent.style.display = 'none';

            // Hiển thị tất cả section preset-only, ẩn custom-only
            document.querySelectorAll('.preset-only').forEach(el => el.style.display = '');
            document.querySelectorAll('.custom-only').forEach(el => el.style.display = 'none');
            
            // Cập nhật hiển thị section thanh toán sau khi chuyển tab
            this.updatePaymentSectionVisibility();
        });
        tabCustom.addEventListener('click', () => {
            tabCustom.classList.add('active');
            tabPreset.classList.remove('active');
            presetContent.style.display = 'none';
            customContent.style.display = '';

            // Ẩn tất cả section preset-only, hiển thị custom-only
            document.querySelectorAll('.preset-only').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.custom-only').forEach(el => el.style.display = '');
            
            // Cập nhật hiển thị section thanh toán sau khi chuyển tab
            this.updatePaymentSectionVisibility();
        });

        // Preset chọn màu đẹp
        const presetConfigs = [
            // 8 màu đơn
            { isGradient: false, color1: '#ff6b6b', diskColor: '#e53e3e', innerDiskColor: '#f56565', outermostColor: '#fc8181', backgroundColor: '#ff6b6b' }, // Hồng Tươi
            { isGradient: false, color1: '#ffd200', diskColor: '#ffe066', innerDiskColor: '#fff6b3', outermostColor: '#ffe066', backgroundColor: '#ffe066' }, // Vàng Tươi
            { isGradient: false, color1: '#43cea2', diskColor: '#b3ffe2', innerDiskColor: '#d6fff2', outermostColor: '#b3ffe2', backgroundColor: '#b3ffe2' }, // Xanh Ngọc
            { isGradient: false, color1: '#4c1d95', diskColor: '#8B5CF6', innerDiskColor: '#A78BFA', outermostColor: '#C4B5FD', backgroundColor: '#4c1d95' }, // Tím Đậm
            { isGradient: false, color1: '#11998e', diskColor: '#b3fff6', innerDiskColor: '#b3ffe2', outermostColor: '#b3fff6', backgroundColor: '#b3ffe2' }, // Lục Bảo

            { isGradient: false, color1: '#00c3ff', diskColor: '#0284c7', innerDiskColor: '#0ea5e9', outermostColor: '#38bdf8', backgroundColor: '#b3e6ff' }, // Xanh Biển
            { isGradient: false, color1: '#f953c6', diskColor: '#ec4899', innerDiskColor: '#f472b6', outermostColor: '#f9a8d4', backgroundColor: '#ffb3e6' }, // Hồng Tươi
            // 7 gradient
            { isGradient: true, color1: '#f9a8d4', color2: '#0891b2', diskColor: '#0891b2', innerDiskColor: '#0e7490', outermostColor: '#155e75', backgroundColor: '#fce7f3' }, // Hồng Ngọc
            { isGradient: true, color1: '#43cea2', color2: '#185a9d', diskColor: '#3B82F6', innerDiskColor: '#60A5FA', outermostColor: '#93C5FD', backgroundColor: '#43cea2' }, // Lam Ngọc

            { isGradient: true, color1: '#4c1d95', color2: '#d1d5db', diskColor: '#8B5CF6', innerDiskColor: '#A78BFA', outermostColor: '#C4B5FD', backgroundColor: '#e6b3ff' }, // Tím Sương
            { isGradient: true, color1: '#f953c6', color2: '#8B5CF6', diskColor: '#8B5CF6', innerDiskColor: '#A78BFA', outermostColor: '#C4B5FD', backgroundColor: '#f953c6' }, // Hồng Tím

            { isGradient: true, color1: '#11998e', color2: '#8B5CF6', diskColor: '#11998e', innerDiskColor: '#0d9488', outermostColor: '#5eead4', backgroundColor: '#3B82F6' }, // Thạch Lam
            { isGradient: true, color1: '#8B5CF6', color2: '#3B82F6', diskColor: '#3B82F6', innerDiskColor: '#3B82F6', outermostColor: '#93C5FD', backgroundColor: '#8B5CF6' }, // Tím Xanh Than
            { isGradient: true, color1: '#3B82F6', color2: '#8B5CF6', diskColor: '#6366F1', innerDiskColor: '#7C3AED', outermostColor: '#A78BFA', backgroundColor: '#3B82F6' }, // Xanh Tím
            { isGradient: true, color1: '#ec4899', color2: '#f59e0b', diskColor: '#fbbf24', innerDiskColor: '#fcd34d', outermostColor: '#fde68a', backgroundColor: '#ec4899' }, // Kim Hồng
        ];
        presetItems.forEach((item, idx) => {
            item.addEventListener('click', () => {
                this.updateConfig(presetConfigs[idx]);
                // Cập nhật input màu theo mẫu
                if (presetConfigs[idx].backgroundColor) backgroundColorInput.value = presetConfigs[idx].backgroundColor;
                if (presetConfigs[idx].diskColor) diskColorInput.value = presetConfigs[idx].diskColor;
                if (presetConfigs[idx].innerDiskColor) innerDiskColorInput.value = presetConfigs[idx].innerDiskColor;
                if (presetConfigs[idx].outermostColor) outermostColorInput.value = presetConfigs[idx].outermostColor;
            });
        });

        closeBtn.addEventListener('click', () => {
            controls.style.display = 'none';
        });

        // Thêm event listener cho click bên ngoài
        document.addEventListener('click', (event) => {
            const isClickInsideControls = controls.contains(event.target);
            const isClickOnSettingsIcon = settingsIcon.contains(event.target);

            if (!isClickInsideControls && !isClickOnSettingsIcon && controls.style.display === 'block') {
                controls.style.display = 'none';
            }
        });

        // Ngăn chặn sự kiện click trong bảng điều khiển lan ra ngoài
        controls.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        singleColorBtn.addEventListener('click', () => {
            singleColorBtn.classList.add('active');
            gradientColorBtn.classList.remove('active');
            singleColorPicker.style.display = 'block';
            gradientColorPicker.style.display = 'none';
            this.updateConfig({ isGradient: false, color1: singleColorInput.value });
        });

        gradientColorBtn.addEventListener('click', () => {
            gradientColorBtn.classList.add('active');
            singleColorBtn.classList.remove('active');
            gradientColorPicker.style.display = 'block';
            singleColorPicker.style.display = 'none';
            this.updateConfig({ isGradient: true, color1: color1Input.value, color2: color2Input.value });
        });

        bodySize.addEventListener('input', (e) => {
            this.updateConfig({ size: parseFloat(e.target.value) });
        });

        color1Input.addEventListener('input', (e) => {
            this.updateConfig({ color1: e.target.value });
        });

        color2Input.addEventListener('input', (e) => {
            this.updateConfig({ color2: e.target.value });
        });

        singleColorInput.addEventListener('input', (e) => {
            this.updateConfig({ color1: e.target.value });
        });

        rotationSpeed.addEventListener('input', (e) => {
            this.updateConfig({ rotationSpeed: parseFloat(e.target.value) });
        });

        particleSpeedInput.addEventListener('input', (e) => {
            this.updateConfig({ particleSpeed: parseFloat(e.target.value) });
        });

        diskRotationSpeedInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                const speed = parseFloat(e.target.value);
                this.particleSystem.updateDiskRotationSpeed(speed);
                this.particleSystem.updateInnerDiskRotationSpeed(speed);
            }
        });

        textureRotationSpeedInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                this.particleSystem.updateTextureRotationSpeed(parseFloat(e.target.value));
            }
            if (this.flowerRing) {
                this.flowerRing.updateRotationSpeed(parseFloat(e.target.value));
            }
        });

        // Thêm event listeners cho màu particles
        backgroundColorInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                this.particleSystem.updateColors(e.target.value, null, null, null);
            }
        });

        diskColorInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                this.particleSystem.updateColors(null, e.target.value, null, null);
            }
        });

        innerDiskColorInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                this.particleSystem.updateColors(null, null, e.target.value, null);
            }
        });

        outermostColorInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                this.particleSystem.updateColors(null, null, null, e.target.value);
            }
        });

        settingsIcon.addEventListener('click', () => {
            controls.style.display = 'block';
        });

        // Text 3D controls
        const heartTextInput = controlsContainer.querySelector('#heartTextInput');
        const textColor = controlsContainer.querySelector('#textColor');
        const textEmissiveColor = controlsContainer.querySelector('#textEmissiveColor');
        const textEffect = controlsContainer.querySelector('#textEffect');
        const textFont = controlsContainer.querySelector('#textFont');
        const textSize = controlsContainer.querySelector('#textSize');
        const textAppearEffect = controlsContainer.querySelector('#textAppearEffect');

        textFont?.addEventListener('change', () => {
            // Chỉ cập nhật config, không áp dụng ngay (tránh lag)
            const currentConfig = this.getCurrentConfig();
            this.config = { ...this.config, ...currentConfig };
        });



        // Thay đổi màu text - chỉ cập nhật config, không áp dụng ngay (tránh lag)
        textColor?.addEventListener('input', (e) => {
            // Chỉ cập nhật config mà không áp dụng ngay để tránh lag
            const currentConfig = this.getCurrentConfig();
            this.config = { ...this.config, ...currentConfig };
        });



        // Thay đổi hiệu ứng - chỉ cập nhật config, không áp dụng ngay
        // Thay đổi hiệu ứng - chỉ cập nhật config, không áp dụng ngay (tránh lag)
        textEffect?.addEventListener('change', () => {
            // Chỉ cập nhật config mà không áp dụng ngay để tránh lag
            const currentConfig = this.getCurrentConfig();
            this.config = { ...this.config, ...currentConfig };
        });



        // Thay đổi kích thước - chỉ cập nhật config, không áp dụng ngay (tránh lag)
        textSize?.addEventListener('input', (e) => {
            // Cập nhật giá trị hiển thị
            const textSizeValue = document.getElementById('textSizeValue');
            if (textSizeValue) {
                textSizeValue.textContent = e.target.value;
            }
            // Chỉ cập nhật config mà không áp dụng ngay để tránh lag
            const currentConfig = this.getCurrentConfig();
            this.config = { ...this.config, ...currentConfig };
        });

        // Sau khi gán innerHTML, thêm JS để chặn nhập quá 3 dòng
        setTimeout(() => {
            const heartTextInput = controlsContainer.querySelector('#heartTextInput');
            if (heartTextInput) {
                heartTextInput.addEventListener('input', function () {
                    const lines = this.value.split('\n');
                    if (lines.length > 3) {
                        this.value = lines.slice(0, 3).join('\n');
                    }
                });
            }
        }, 0);

        // Payment method radio button styling
        const paymentMethodCards = controlsContainer.querySelectorAll('.payment-method-card');
        paymentMethodCards.forEach(card => {
            const radio = card.querySelector('input[type="radio"]');
            const content = card.querySelector('.payment-method-content');
            const radioIndicator = card.querySelector('.radio-indicator');
            const radioDot = card.querySelector('.radio-dot');

            // Xử lý khi radio được chọn
            radio.addEventListener('change', () => {
                // Reset tất cả cards
                paymentMethodCards.forEach(otherCard => {
                    const otherContent = otherCard.querySelector('.payment-method-content');
                    const otherIndicator = otherCard.querySelector('.radio-indicator');
                    const otherDot = otherCard.querySelector('.radio-dot');

                    otherContent.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    otherContent.style.background = 'rgba(255, 255, 255, 0.05)';
                    otherDot.style.opacity = '0';
                });

                // Highlight card được chọn
                if (radio.checked) {
                    content.style.borderColor = radio.value === 'PAYOS' ? '#28a745' : '#007bff';
                    content.style.background = radio.value === 'PAYOS' ? 'rgba(40, 167, 69, 0.1)' : 'rgba(0, 123, 255, 0.1)';
                    radioDot.style.opacity = '1';
                }

                // Cập nhật hiển thị giá theo phương thức thanh toán
                updateTipInputVisibility(getSelectedCurrency());
                refreshExpirationSelect(getSelectedCurrency());
                refreshSlugPriceChip(getSelectedCurrency());
                refreshFeaturePriceChips(getSelectedCurrency());
                if (typeof updateTotalPrice === 'function') {
                    updateTotalPrice(() => this.calculateTotalPrice());
                }
            });

            // Hover effect
            card.addEventListener('mouseenter', () => {
                if (!radio.checked) {
                    content.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                    content.style.background = 'rgba(255, 255, 255, 0.08)';
                }
            });

            card.addEventListener('mouseleave', () => {
                if (!radio.checked) {
                    content.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    content.style.background = 'rgba(255, 255, 255, 0.05)';
                }
            });
        });

        // Sự kiện đổi ảnh vòng hoa
        flowerImageInput.addEventListener('change', (e) => {
            // Chấp nhận định dạng ảnh phổ biến
            const allowedImageTypes = [
                'image/jpeg',    // .jpg, .jpeg
                'image/png',      // .png
            ];
            const files = Array.from(e.target.files).filter(f => allowedImageTypes.includes(f.type));

            // Validate kích thước file (5MB = 5 * 1024 * 1024 bytes)
            const maxSize = 5 * 1024 * 1024; // 5MB
            const oversizedFiles = files.filter(file => file.size > maxSize);
            const imagePriceText = document.getElementById('imagePriceText');

            if (oversizedFiles.length > 0) {
                flowerImageStatus.textContent = `File ${oversizedFiles[0].name} quá lớn! Chỉ chấp nhận file dưới 5MB.`;
                flowerImageInput.value = '';
                // Reset text giá tiền ảnh
                if (imagePriceText) {
                    imagePriceText.textContent = '';
                }
                return;
            }

            // Hiển thị preview ảnh đã chọn
            const previewDiv = document.getElementById('flowerImagePreview');
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');

            if (files.length > MAX_FLOWER_IMAGES) {
                flowerImageStatus.textContent = `Chỉ được chọn tối đa ${MAX_FLOWER_IMAGES} ảnh! Vui lòng chọn lại`;
                flowerImageStatus.style.color = '#e53935';
                try { showToast(`Chỉ được chọn tối đa ${MAX_FLOWER_IMAGES} ảnh! Vui lòng chọn lại`, 'error', 5000); } catch (e) { }
                flowerImageInput.value = '';
                if (previewDiv) previewDiv.style.display = 'none';
                return;
            }
            if (files.length === 0) {
                flowerImageStatus.textContent = 'Bạn phải chọn ít nhất 1 ảnh (JPG, PNG)!';
                // Reset text giá tiền ảnh
                if (imagePriceText) {
                    imagePriceText.textContent = '';
                }
                if (previewDiv) previewDiv.style.display = 'none';
                return;
            }

            // Hiển thị preview
            if (previewDiv && imagePreviewContainer) {
                previewDiv.style.display = 'block';
                imagePreviewContainer.innerHTML = '';

                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const imgContainer = document.createElement('div');
                        imgContainer.style.cssText = 'position: relative; display: inline-block; margin: 4px;';

                        const img = document.createElement('img');
                        img.src = ev.target.result;
                        img.style.cssText = 'width: 60px; height: 60px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 2px solid #fff;';

                        const removeBtn = document.createElement('button');
                        removeBtn.innerHTML = '✕';
                        removeBtn.style.cssText = 'position: absolute; top: -8px; right: -8px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
                        removeBtn.onclick = () => {
                            imgContainer.remove();
                            // Cập nhật lại files array
                            const remainingFiles = Array.from(flowerImageInput.files).filter(f => f !== file);
                            // Tạo new FileList (không thể trực tiếp modify)
                            const dt = new DataTransfer();
                            remainingFiles.forEach(f => dt.items.add(f));
                            flowerImageInput.files = dt.files;
                            // Trigger change event
                            flowerImageInput.dispatchEvent(new Event('change'));
                        };

                        imgContainer.appendChild(img);
                        imgContainer.appendChild(removeBtn);
                        imagePreviewContainer.appendChild(imgContainer);
                    };
                    reader.readAsDataURL(file);
                });
            }

            // Cập nhật text giá tiền ảnh
            if (imagePriceText) {
                if (files.length === 1) {
                    imagePriceText.textContent = '(Miễn phí)';
                    imagePriceText.style.color = '#4caf50';
                } else {
                    const additionalImages = files.length - 1;
                    const totalImagePrice = additionalImages * 3000;
                    imagePriceText.textContent = `(${additionalImages} ảnh = ${totalImagePrice.toLocaleString()}đ, free ảnh đầu)`;
                    imagePriceText.style.color = '#ff6b6b';
                }
            }

            // Cập nhật status
            flowerImageStatus.textContent = `Đã chọn ${files.length} ảnh`;
            flowerImageStatus.style.borderLeftColor = '#28a745';
            flowerImageStatus.style.background = '#d4edda';
            flowerImageStatus.style.color = '#155724';

            // if (files.length === 1 && this.flowerRing && this.flowerRing.updateTextureByDataURL) {
            //     const reader = new FileReader();
            //     reader.onload = (ev) => {
            //         this.flowerRing.updateTextureByDataURL(ev.target.result);
            //     };
            //     reader.readAsDataURL(files[0]);
            // }
            // if (files.length > 1 && this.flowerRing && this.flowerRing.updateTexturesByDataURLs) {
            //     let loaded = 0;
            //     const dataURLs = new Array(files.length);
            //     files.forEach((file, idx) => {
            //         const reader = new FileReader();
            //         reader.onload = (ev) => {
            //             dataURLs[idx] = ev.target.result;
            //             loaded++;
            //             if (loaded === files.length) {
            //                 this.flowerRing.updateTexturesByDataURLs(dataURLs, false);
            //             }
            //         };
            //         reader.readAsDataURL(file);
            //     });
            // }
            // Việc áp dụng texture sẽ thực hiện ở bước tạo/áp dụng cấu hình sau

            // Cập nhật giá tiền khi thay đổi ảnh
            this.updatePriceDisplay();
        });

        // Xử lý upload audio
        audioInput.addEventListener('change', (e) => {
            // Nếu chọn file thì clear select nhạc có sẵn
            if (audioInput.files.length > 0) {
                presetAudioSelect.value = '';
            }
            const audioPriceText = document.getElementById('audioPriceText');
            const audioPreview = controlsContainer.querySelector('#audioPreview');
            const removeAudioBtn = document.getElementById('removeAudioBtn');
            const audioStatus = document.getElementById('audioStatus');

            // Chấp nhận định dạng audio phổ biến
            const allowedAudioTypes = [
                'audio/mpeg',    // .mp3
                'audio/mp3',
            ];
            const files = Array.from(e.target.files).filter(f => allowedAudioTypes.includes(f.type));

            // Validate kích thước file (10MB = 10 * 1024 * 1024 bytes)
            const maxSize = 10 * 1024 * 1024; // 10MB
            const oversizedFiles = files.filter(file => file.size > maxSize);

            if (oversizedFiles.length > 0) {
                audioStatus.textContent = `File ${oversizedFiles[0].name} quá lớn! Chỉ chấp nhận file dưới 10MB.`;
                audioStatus.style.borderLeftColor = '#dc3545';
                audioStatus.style.background = '#f8d7da';
                audioStatus.style.color = '#721c24';
                // Toast lỗi hiển thị lâu hơn
                try { showToast(`File ${oversizedFiles[0].name} quá lớn! (tối đa 10MB)`, 'error', 5000); } catch (e) { }
                audioInput.value = '';
                // Reset text giá tiền audio
                if (audioPriceText) {
                    audioPriceText.textContent = '';
                }
                if (audioPreview) audioPreview.style.display = 'none';
                updateTotalPrice(getDynamicPrice);
                return;
            }

            if (files.length === 0) {
                audioStatus.textContent = 'Bạn phải chọn file MP3 hợp lệ!';
                audioStatus.style.borderLeftColor = '#dc3545';
                audioStatus.style.background = '#f8d7da';
                audioStatus.style.color = '#721c24';
                // Toast lỗi file không hợp lệ
                try { showToast('Bạn phải chọn file MP3 hợp lệ!', 'error', 4500); } catch (e) { }
                audioInput.value = '';
                if (audioPriceText) {
                    audioPriceText.textContent = '';
                }
                if (audioPreview) audioPreview.style.display = 'none';
                updateTotalPrice(getDynamicPrice);
                return;
            }

            if (files.length > 0) {
                const file = files[0];

                // Hiển thị preview dùng chung audioPreview
                if (audioPreview) {
                    const fileURL = URL.createObjectURL(file);
                    audioPreview.src = fileURL;
                    audioPreview.style.display = 'block';
                    audioPreview.currentTime = 0;
                    audioPreview.pause();
                }

                // Cập nhật giá tiền
                if (audioPriceText) {
                    audioPriceText.textContent = ' +5,000đ';
                    audioPriceText.style.display = 'inline-block';
                }

                // Cập nhật status
                if (audioStatus) {
                    audioStatus.textContent = `Đã chọn: ${file.name}`;
                    audioStatus.style.borderLeftColor = '#28a745';
                    audioStatus.style.background = '#d4edda';
                    audioStatus.style.color = '#155724';
                }

                // Xử lý nút xóa audio
                if (removeAudioBtn) {
                    removeAudioBtn.onclick = () => {
                        audioInput.value = '';
                        if (audioPreview) audioPreview.style.display = 'none';
                        if (audioPriceText) {
                            audioPriceText.textContent = '';
                        }
                        if (audioStatus) {
                            audioStatus.textContent = '';
                            audioStatus.style.borderLeftColor = '#6c757d';
                            audioStatus.style.background = '#f8f9fa';
                            audioStatus.style.color = '#666';
                        }
                        updateTotalPrice(getDynamicPrice);
                    };
                }
            } else {
                // Không có file
                if (audioPreview) audioPreview.style.display = 'none';
                if (audioPriceText) {
                    audioPriceText.textContent = '';
                    audioPriceText.style.display = 'none';
                }
                if (audioStatus) {
                    audioStatus.textContent = '';
                    audioStatus.style.borderLeftColor = '#6c757d';
                    audioStatus.style.background = '#f8f9fa';
                    audioStatus.style.color = '#666';
                }
            }

            updateTotalPrice(getDynamicPrice);
        });

        // Xử lý nút Hoàn tất tạo
        const finishBtn = controlsContainer.querySelector('#finishCreateBtn');
        finishBtn.addEventListener('click', async () => {
            // Spinner loading trên nút
            const originalText = finishBtn.innerHTML;
            finishBtn.innerHTML = '<span class="spinner"></span> Đang xử lý...';
            finishBtn.disabled = true;

            try {
                await this.handleFinishCreation();
            } catch (error) {
                console.error('Lỗi trong quá trình xử lý:', error);
                showToast('Có lỗi xảy ra trong quá trình xử lý!', 'error');
            } finally {
                // Trả lại nút như cũ
                finishBtn.innerHTML = originalText;
                finishBtn.disabled = false;
            }
        });

        // Xử lý nút Xem demo
        const viewDemoBtn = controlsContainer.querySelector('#viewDemoBtn');
        viewDemoBtn.addEventListener('click', () => {
            // Áp dụng tất cả thay đổi trước khi ẩn dashboard
            this.applyAllChanges();
            controls.style.display = 'none';
        });

        // Khi load trang, nếu có config trong URL thì tự động render lại
        window.addEventListener('DOMContentLoaded', () => {
            const hash = window.location.hash;
            const overlay = document.getElementById('flower-loading-overlay');
            // Nếu là web con thì bật overlay ngay khi bắt đầu load
            if ((hash.startsWith('#id=') || hash.startsWith('#config=')) && overlay) {
                overlay.style.display = 'block';
            }

            // Helper: cơ chế chờ đủ điều kiện trước khi ẩn overlay trên web con
            const isChildWeb = hash.startsWith('#id=') || hash.startsWith('#config=');
            const readiness = { text3d: false, images: false, heart3d: false };
            function tryHideOverlay() {
                if (!isChildWeb || !overlay) return;
                if (readiness.text3d && readiness.images && readiness.heart3d) {
                    overlay.style.display = 'none';
                }
            }
            // Lắng nghe sự kiện text3D render xong
            document.addEventListener('hearttext_ready', () => {
                readiness.text3d = true;
                tryHideOverlay();
            }, { once: true });
            // Lắng nghe sự kiện heart3D load xong
            document.addEventListener('heart3d_ready', () => {
                readiness.heart3d = true;
                tryHideOverlay();
            }, { once: true });
            // Nếu heart3D đã sẵn sàng trước đó
            if (window.heart3D) {
                readiness.heart3d = true;
            }
            // Nếu text3D đã khởi tạo trước đó
            if (window.heartText && window.heartText.textGroup && window.heartText.textMeshes && window.heartText.textMeshes.length > 0) {
                readiness.text3d = true;
            }
            if (hash.startsWith('#id=')) {
                // V2: GET /api/v2/access/loveplannet/:websiteId
                //     → { success, data: { allowed, config?, reason? } }
                // Config đã flatten + sanitize bởi access.service._sanitizeConfigForViewer.
                const websiteId = hash.replace('#id=', '');
                fetch(`${API_BASE}/access/${TEMPLATE_TYPE}/${encodeURIComponent(websiteId)}`, {
                    method:  'GET',
                    headers: { 'Accept': 'application/json' },
                    mode:    'cors',
                }).then(res => res.json())
                    .then(json => {
                        console.log('📦 V2 access response:', json);
                        // V2 wrapper: { success, data: { allowed, config, reason } }
                        const payload = json.data || json;
                        
                        // Kiểm tra allowed - nếu không có field allowed nhưng có websiteId thì coi như allowed
                        const isAllowed = payload.allowed !== false && (payload.allowed === true || payload.websiteId || payload.flowerImages);
                        
                        if (!isAllowed) {
                            // Render overlay tuỳ reason (expired / payment_required / …).
                            const r = payload.reason || 'unknown';
                            const msg = (r === 'expired') ? 'Tinh cầu này đã hết hạn.'
                                      : (r === 'payment_required') ? 'Đơn hàng chưa thanh toán.'
                                      : (r === 'not_found') ? 'Không tìm thấy tinh cầu.'
                                      : 'Tinh cầu không khả dụng (' + r + ').';
                            if (overlay) {
                                overlay.innerHTML = '<div style="color:#fff;font-size:18px;text-align:center;padding:24px;">'
                                                  + msg + '</div>';
                                overlay.style.display = 'flex';
                            }
                            return;
                        }
                        // Adapter V2 → legacy field names cho code render bên dưới
                        // không phải rewrite hàng trăm dòng. Map các field rename
                        // chính (flowerImages → imageUrls, enableX → xEnabled,
                        // bgMusic → audioUrl, text3d.color hex → int).
                        // Nếu payload có config thì dùng, không thì dùng chính payload
                        const cfg = payload.config || payload;
                        const adapted = Object.assign({}, cfg, {
                            // Array names
                            imageUrls: Array.isArray(cfg.flowerImages) ? cfg.flowerImages : (cfg.imageUrls || []),
                            // Audio
                            audioUrl:  cfg.bgMusic || cfg.audioUrl || '',
                            // Booleans rename
                            centralHeartEnabled: cfg.enableCentralHeart  ?? cfg.centralHeartEnabled ?? false,
                            meteorEnabled:       cfg.enableMeteorFeature ?? cfg.meteorEnabled       ?? false,
                            // Nested sphereParams + colors flatten back to top-level
                            // legacy properties (legacy renderer reads them flat).
                            backgroundColor: cfg.colors?.backgroundColor ?? cfg.backgroundColor,
                            innerDiskColor:  cfg.colors?.innerDiskColor  ?? cfg.innerDiskColor,
                            diskColor:       cfg.colors?.diskColor       ?? cfg.diskColor,
                            outermostColor:  cfg.colors?.outermostColor  ?? cfg.outermostColor,
                            diskRotationSpeed:    cfg.sphereParams?.diskRotationSpeed    ?? cfg.diskRotationSpeed,
                            textureRotationSpeed: cfg.sphereParams?.textureRotationSpeed ?? cfg.textureRotationSpeed,
                            rotationSpeed:        cfg.sphereParams?.rotationSpeed        ?? cfg.rotationSpeed,
                            particleSpeed:        cfg.sphereParams?.particleSpeed        ?? cfg.particleSpeed,
                            size:                 cfg.sphereParams?.bodySize             ?? cfg.size,
                        });
                        // text3d.color trong V2 là hex string '#rrggbb' — legacy
                        // heartText.setColor expects int (0xff66aa). Convert.
                        if (adapted.text3d && typeof adapted.text3d.color === 'string'
                            && adapted.text3d.color.startsWith('#')) {
                            adapted.text3d = Object.assign({}, adapted.text3d, {
                                color:         parseInt(adapted.text3d.color.replace('#', ''), 16),
                                emissiveColor: typeof adapted.text3d.emissiveColor === 'string'
                                    && adapted.text3d.emissiveColor.startsWith('#')
                                    ? parseInt(adapted.text3d.emissiveColor.replace('#', ''), 16)
                                    : adapted.text3d.emissiveColor,
                            });
                        }
                        // Synthesize legacy outer shape { success, config }.
                        const data = { success: true, config: adapted };
                        if (data.success && data.config) {
                            // Log link ảnh sau khi fetch galaxy
                            if (data.config.imageUrls) {
                                console.log('🖼️ Link ảnh nhận được từ galaxy:', data.config.imageUrls);
                                console.log('📊 Số lượng ảnh:', data.config.imageUrls.length);
                                data.config.imageUrls.forEach((url, index) => {
                                    console.log(`  [${index + 1}] ${url}`);
                                });
                            } else {
                                console.log('⚠️ Không có imageUrls trong config');
                            }
                            this.updateConfig(data.config);
                            // Ẩn dashboard và settings-icon luôn ở web con
                            if (controls) controls.style.display = 'none';
                            if (settingsIcon) settingsIcon.style.display = 'none';
                            // Áp dụng các thuộc tính đặc biệt cho particleSystem và flowerRing
                            if (this.particleSystem) {
                                if (data.config.diskRotationSpeed !== undefined) {
                                    this.particleSystem.updateDiskRotationSpeed(data.config.diskRotationSpeed);
                                    this.particleSystem.updateInnerDiskRotationSpeed(data.config.diskRotationSpeed);
                                }
                                if (data.config.textureRotationSpeed !== undefined) {
                                    this.particleSystem.updateTextureRotationSpeed(data.config.textureRotationSpeed);
                                }
                            }

                            // Đảm bảo overlay chỉ tắt sau khi ảnh (nếu có) đã load xong
                            if (this.flowerRing) {
                                if (data.config.textureRotationSpeed !== undefined) {
                                    this.flowerRing.updateRotationSpeed(data.config.textureRotationSpeed);
                                }
                                if (data.config.flowerFloatSpeed !== undefined) {
                                    this.flowerRing.flyingConfig.floatSpeed = data.config.flowerFloatSpeed;
                                }
                                if (data.config.imageUrls && data.config.imageUrls.length > 0 && this.flowerRing.preloadTextures) {
                                    // Chỉ preload 1 lần, sau đó random lại texture không load lại từ URL
                                    this.flowerRing.preloadTextures(data.config.imageUrls).then(() => {
                                        this.flowerRing.randomizeFlowerTextures();
                                        // Tắt overlay sau khi ảnh đã load xong
                                        if (overlay) overlay.style.display = 'none';
                                    });
                                } else {
                                    if (overlay) overlay.style.display = 'none';
                                }
                            } else {
                                if (overlay) overlay.style.display = 'none';
                            }
                            // Nếu có audioUrl thì set cho audio.js
                            if (data.config.audioUrl && window.audioManager && window.audioManager.setAudioUrl) {
                                window.audioManager.setAudioUrl(data.config.audioUrl);
                            }
                            // Bổ sung:
                            else if ((!data.config.audioUrl || data.config.audioUrl === '') && data.config.selectedAudioFile && window.audioManager && window.audioManager.setAudioUrl) {
                                window.audioManager.setAudioUrl('assets/musics/' + data.config.selectedAudioFile);
                            }
                            // Kiểm tra và áp dụng trạng thái trái tim to đùng
                            if (data.config.centralHeartEnabled !== undefined) {
                                // Đợi một chút để đảm bảo trái tim 3D đã load
                                setTimeout(() => {
                                    this.applyCentralHeartState(data.config.centralHeartEnabled);
                                }, 1000);
                            }
                            // Kiểm tra và áp dụng mưa sao băng
                            if (data.config.meteorEnabled !== undefined) {
                                // Đợi một chút để đảm bảo meteors.js đã load
                                setTimeout(() => {
                                    if (window.setMeteorSpeed && data.config.meteorSpeed) {
                                        window.setMeteorSpeed(data.config.meteorSpeed);
                                    }
                                    if (window.setMeteorDensity && data.config.meteorDensity) {
                                        window.setMeteorDensity(data.config.meteorDensity);
                                    }
                                    if (data.config.meteorColorMode === 'single' && data.config.meteorColor1 && window.setMeteorColor) {
                                        window.setMeteorColor(data.config.meteorColor1);
                                    } else if (data.config.meteorColorMode === 'gradient' && data.config.meteorColor1 && data.config.meteorColor2 && window.setMeteorGradient) {
                                        window.setMeteorGradient(data.config.meteorColor1, data.config.meteorColor2);
                                    }
                                    // Bật/tắt mưa sao băng
                                    if (window.toggleMeteorShower && data.config.meteorEnabled && !window.isMeteorShowerActive) {
                                        window.toggleMeteorShower();
                                    } else if (window.toggleMeteorShower && !data.config.meteorEnabled && window.isMeteorShowerActive) {
                                        window.toggleMeteorShower();
                                    }
                                }, 1500);
                            }

                            // Áp dụng cấu hình text3d nếu có
                            if (data.config.text3d) {
                                setTimeout(() => {
                                    // Đảm bảo window.heartText đã được khởi tạo
                                    if (window.heartText) {
                                        if (data.config.text3d.text !== undefined) {
                                            // Chỉ set text vào config, không hiển thị ngay
                                            window.heartText.config.text = data.config.text3d.text;
                                        }
                                        if (data.config.text3d.fontName) {
                                            window.heartText.config.fontName = data.config.text3d.fontName;
                                            window.heartText.setFont(data.config.text3d.fontName);
                                        }
                                        if (data.config.text3d.size !== undefined) {
                                            window.heartText.config.size = data.config.text3d.size;
                                            window.heartText.setSize(data.config.text3d.size);
                                            // Cập nhật UI
                                            const textSizeInput = document.getElementById('textSize');
                                            const textSizeValue = document.getElementById('textSizeValue');
                                            if (textSizeInput) textSizeInput.value = data.config.text3d.size;
                                            if (textSizeValue) textSizeValue.textContent = data.config.text3d.size;
                                        }
                                        if (data.config.text3d.color !== undefined) {
                                            window.heartText.config.color = data.config.text3d.color;
                                            window.heartText.setColor(data.config.text3d.color);
                                            window.heartText.setEmissiveColor(data.config.text3d.color);
                                        }
                                        if (data.config.text3d.emissiveColor !== undefined) {
                                            window.heartText.config.emissiveColor = data.config.text3d.emissiveColor;
                                            window.heartText.setEmissiveColor(data.config.text3d.emissiveColor);
                                        }
                                        if (data.config.text3d.effectType) {
                                            window.heartText.config.effectType = data.config.text3d.effectType;
                                            window.heartText.setEffect(data.config.text3d.effectType);
                                        }
                                        // Nếu có hiệu ứng xuất hiện (appearEffect)
                                        if (data.config.text3d.appearEffect !== undefined) {
                                            // Chuyển typewriter thành none vì đã xóa typewriter effect
                                            const appearEffect = data.config.text3d.appearEffect === 'typewriter' ? 'none' : data.config.text3d.appearEffect;
                                            window.heartText.config.appearEffect = appearEffect;
                                            // Không gọi showFadeInEffect ngay, để letter-btn xử lý
                                        }
                                    }
                                }, 1000);
                            }

                            // Ẩn letter-btn nếu text trống (chỉ ở web con) - chạy sau khi heartText đã sẵn sàng
                            setTimeout(() => {
                                if (window.location.hash.includes('#id=') || window.location.hash.includes('#config=')) {
                                    const letterBtn = document.getElementById('letter-btn');
                                    // Kiểm tra từ config hoặc từ window.heartText
                                    const textContent = data.config.text3d?.text || (window.heartText?.config?.text || '');
                                    if (letterBtn && (!textContent || textContent.trim() === '')) {
                                        letterBtn.classList.add('hidden-when-empty');
                                    }
                                }
                            }, 1200); // Đợi lâu hơn để đảm bảo heartText đã khởi tạo

                            // Ẩn overlay khi load xong
                            if (overlay) overlay.style.display = 'none';
                            // Hiện dialog hướng dẫn nhanh sau khi load xong config
                            setTimeout(() => {
                                const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
                                const mobileHelp = document.getElementById('mobileQuickHelp');
                                const desktopHelp = document.getElementById('desktopQuickHelp');

                                if (isMobile && mobileHelp) {
                                    mobileHelp.classList.add('active');
                                } else if (!isMobile && desktopHelp) {
                                    desktopHelp.classList.add('active');
                                }
                            }, 200); // Đợi 0.2 giây sau khi overlay tắt
                        }
                    });
            } else if (hash.startsWith('#config=')) {
                try {
                    const base64Config = hash.replace('#config=', '');
                    const configStr = decodeURIComponent(escape(atob(base64Config)));
                    const config = JSON.parse(configStr);

                    // Log link ảnh từ config base64
                    if (config.imageUrls) {
                        console.log('🖼️ Link ảnh nhận được từ config base64:', config.imageUrls);
                        console.log('📊 Số lượng ảnh:', config.imageUrls.length);
                        config.imageUrls.forEach((url, index) => {
                            console.log(`  [${index + 1}] ${url}`);
                        });
                    } else {
                        console.log('⚠️ Không có imageUrls trong config base64');
                    }

                    this.updateConfig(config);
                    // Ẩn dashboard và settings-icon luôn ở web con
                    if (controls) controls.style.display = 'none';
                    if (settingsIcon) settingsIcon.style.display = 'none';
                    if (this.particleSystem) {
                        if (config.diskRotationSpeed !== undefined) {
                            this.particleSystem.updateDiskRotationSpeed(config.diskRotationSpeed);
                            this.particleSystem.updateInnerDiskRotationSpeed(config.diskRotationSpeed);
                        }
                        if (config.textureRotationSpeed !== undefined) {
                            this.particleSystem.updateTextureRotationSpeed(config.textureRotationSpeed);
                        }
                    }
                    if (this.flowerRing) {
                        if (config.textureRotationSpeed !== undefined) {
                            this.flowerRing.updateRotationSpeed(config.textureRotationSpeed);
                        }
                        if (config.flowerFloatSpeed !== undefined) {
                            this.flowerRing.flyingConfig.floatSpeed = config.flowerFloatSpeed;
                        }
                        if (config.imageUrls && config.imageUrls.length > 0 && this.flowerRing.preloadTextures) {
                            this.flowerRing.preloadTextures(config.imageUrls).then(() => {
                                this.flowerRing.randomizeFlowerTextures();
                                if (overlay) overlay.style.display = 'none';
                            });
                        } else {
                            if (overlay) overlay.style.display = 'none';
                        }
                    } else {
                        if (overlay) overlay.style.display = 'none';
                    }
                    // Bổ sung: nếu có audioUrl thì set cho audio.js
                    if (config.audioUrl && window.audioManager && window.audioManager.setAudioUrl) {
                        window.audioManager.setAudioUrl(config.audioUrl);
                    }
                    // Bổ sung:
                    else if ((!config.audioUrl || config.audioUrl === '') && config.selectedAudioFile && window.audioManager && window.audioManager.setAudioUrl) {
                        window.audioManager.setAudioUrl('assets/musics/' + config.selectedAudioFile);
                    }

                    // Áp dụng cấu hình text3d nếu có
                    if (config.text3d) {
                        setTimeout(() => {
                            // Đảm bảo window.heartText đã được khởi tạo
                            if (window.heartText) {
                                if (config.text3d.text !== undefined) {
                                    // Chỉ set text vào config, không hiển thị ngay
                                    window.heartText.config.text = config.text3d.text;
                                }
                                if (config.text3d.fontName) {
                                    window.heartText.config.fontName = config.text3d.fontName;
                                    window.heartText.setFont(config.text3d.fontName);
                                }
                                if (config.text3d.size !== undefined) {
                                    window.heartText.config.size = config.text3d.size;
                                    window.heartText.setSize(config.text3d.size);
                                    // Cập nhật UI
                                    const textSizeInput = document.getElementById('textSize');
                                    const textSizeValue = document.getElementById('textSizeValue');
                                    if (textSizeInput) textSizeInput.value = config.text3d.size;
                                    if (textSizeValue) textSizeValue.textContent = config.text3d.size;
                                }
                                if (config.text3d.color !== undefined) {
                                    window.heartText.config.color = config.text3d.color;
                                    window.heartText.setColor(config.text3d.color);
                                    window.heartText.setEmissiveColor(config.text3d.color);
                                }
                                if (config.text3d.emissiveColor !== undefined) {
                                    window.heartText.config.emissiveColor = config.text3d.emissiveColor;
                                    window.heartText.setEmissiveColor(config.text3d.emissiveColor);
                                }
                                if (config.text3d.effectType) {
                                    window.heartText.config.effectType = config.text3d.effectType;
                                    window.heartText.setEffect(config.text3d.effectType);
                                }
                                // Nếu có hiệu ứng xuất hiện (appearEffect)
                                if (config.text3d.appearEffect !== undefined) {
                                    // Chuyển typewriter thành none vì đã xóa typewriter effect
                                    const appearEffect = config.text3d.appearEffect === 'typewriter' ? 'none' : config.text3d.appearEffect;
                                    window.heartText.config.appearEffect = appearEffect;
                                    // Không gọi showFadeInEffect ngay, để letter-btn xử lý
                                }
                            }
                        }, 1000);
                    }

                    // Ẩn letter-btn nếu text trống (chỉ ở web con) - chạy sau khi heartText đã sẵn sàng
                    setTimeout(() => {
                        if (window.location.hash.includes('#id=') || window.location.hash.includes('#config=')) {
                            const letterBtn = document.getElementById('letter-btn');
                            // Kiểm tra từ config hoặc từ window.heartText
                            const textContent = config.text3d?.text || (window.heartText?.config?.text || '');
                            if (letterBtn && (!textContent || textContent.trim() === '')) {
                                letterBtn.classList.add('hidden-when-empty');
                            }
                        }
                    }, 1200); // Đợi lâu hơn để đảm bảo heartText đã khởi tạo

                    // Kiểm tra và áp dụng trạng thái trái tim to đùng
                    if (config.centralHeartEnabled !== undefined) {
                        // Đợi một chút để đảm bảo trái tim 3D đã load
                        setTimeout(() => {
                            this.applyCentralHeartState(config.centralHeartEnabled);
                        }, 1000);
                    }
                    // Kiểm tra và áp dụng mưa sao băng
                    if (config.meteorEnabled !== undefined) {
                        // Đợi một chút để đảm bảo meteors.js đã load
                        setTimeout(() => {
                            if (window.setMeteorSpeed && config.meteorSpeed) {
                                window.setMeteorSpeed(config.meteorSpeed);
                            }
                            if (window.setMeteorDensity && config.meteorDensity) {
                                window.setMeteorDensity(config.meteorDensity);
                            }
                            if (config.meteorColorMode === 'single' && config.meteorColor1 && window.setMeteorColor) {
                                window.setMeteorColor(config.meteorColor1);
                            } else if (config.meteorColorMode === 'gradient' && config.meteorColor1 && config.meteorColor2 && window.setMeteorGradient) {
                                window.setMeteorGradient(config.meteorColor1, config.meteorColor2);
                            }
                            // Bật/tắt mưa sao băng
                            if (window.toggleMeteorShower && config.meteorEnabled && !window.isMeteorShowerActive) {
                                window.toggleMeteorShower();
                            } else if (window.toggleMeteorShower && !config.meteorEnabled && window.isMeteorShowerActive) {
                                window.toggleMeteorShower();
                            }
                            // Ẩn overlay khi load xong
                            if (overlay) overlay.style.display = 'none';
                        }, 1500);
                    }

                    // Hiện dialog hướng dẫn nhanh ngay sau khi overlay tắt
                    setTimeout(() => {
                        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
                        const mobileHelp = document.getElementById('mobileQuickHelp');
                        const desktopHelp = document.getElementById('desktopQuickHelp');

                        if (isMobile && mobileHelp) {
                            mobileHelp.classList.add('active');
                        } else if (!isMobile && desktopHelp) {
                            desktopHelp.classList.add('active');
                        }
                    }, 100); // Chỉ đợi 0.1 giây
                } catch (e) {
                    // Nếu lỗi thì bỏ qua
                }
            }
        });

        // Khởi tạo voucher
        const getDynamicPrice = () => this.calculateTotalPrice();
        // Expose ra window để auth.js có thể truy cập
        window.getDynamicPrice = getDynamicPrice;
        setupVoucherListeners(getDynamicPrice);
        loadUserVouchers(getDynamicPrice);
        
        // Báo hiệu rằng sphere.js đã sẵn sàng
        document.dispatchEvent(new Event('sphere_ready'));

        // Cập nhật giá ban đầu ngay lập tức
        applyPricingToUI();
        updateTotalPrice(getDynamicPrice);

        // Event listener cho nút "Xem bảng giá"
        const showPriceTableBtn = controlsContainer.querySelector('#showPriceTableBtn');
        const priceTableDetails = controlsContainer.querySelector('#priceTableDetails');
        if (showPriceTableBtn && priceTableDetails) {
            showPriceTableBtn.addEventListener('click', () => {
                if (priceTableDetails.style.display === 'none') {
                    priceTableDetails.style.display = 'block';
                    showPriceTableBtn.textContent = '📋 Ẩn bảng giá';
                    showPriceTableBtn.style.background = '#f0f0f0';
                } else {
                    priceTableDetails.style.display = 'none';
                    showPriceTableBtn.textContent = '📋 Xem bảng giá';
                    showPriceTableBtn.style.background = 'none';
                }
            });
        }

        // Validate tip input - đã được xử lý trong vouchers.js
        const tipInput = controlsContainer.querySelector('#tipAmount');
        const tipError = controlsContainer.querySelector('#tipError');
        if (tipInput) {
            tipInput.addEventListener('input', () => {
                let val = parseInt(tipInput.value, 10);
                if (isNaN(val) || val < 0) {
                    tipInput.value = 0;
                    tipError.style.display = 'inline';
                } else {
                    tipError.style.display = 'none';
                }
                // Cập nhật giá ngay lập tức khi thay đổi tip
                if (typeof updateTotalPrice === 'function') {
                    updateTotalPrice(getDynamicPrice);
                }
            });
        }

        // Khởi tạo hiển thị section theo tab mặc định (preset)
        document.querySelectorAll('.preset-only').forEach(el => el.style.display = '');
        document.querySelectorAll('.custom-only').forEach(el => el.style.display = 'none');

        // Khởi tạo giá tiền ban đầu
        this.updatePriceDisplay = () => {
            updateTotalPrice(getDynamicPrice);
        };

        // Lắng nghe event payment_success từ payment.js (khi reconnect)
        // Đảm bảo chỉ có 1 listener
        if (this.paymentSuccessHandler) {
            window.removeEventListener('payment_success', this.paymentSuccessHandler);
        }

        this.paymentSuccessHandler = (event) => {
            // Prevent duplicate calls
            if (this.paymentSuccessProcessed) {
                return;
            }

            this.paymentSuccessProcessed = true;
            const orderCode = event.detail.orderCode;

            // Sử dụng shareUrl đã tạo thay vì tạo mới
            const shareUrl = this.currentShareUrl || window.location.origin + window.location.pathname + '#id=' + this.currentConfigId;
            const message = '<div style="color:green;margin-bottom:8px;">Thanh toán thành công! Thiên hà đã được tạo.</div>';
            this.showSharePopup(shareUrl, message);

            // Reset flag after a delay
            setTimeout(() => {
                this.paymentSuccessProcessed = false;
            }, 2000);
        };

        window.addEventListener('payment_success', this.paymentSuccessHandler);

        // Liên kết control mưa sao băng với meteors.js
        setTimeout(() => {
            const tabSingle = document.getElementById('meteorTabSingle');
            const tabGradient = document.getElementById('meteorTabGradient');
            const singleBox = document.getElementById('meteorSingleColorBox');
            const gradBox = document.getElementById('meteorGradientColorBox');
            const colorPicker = document.getElementById('meteorColorPicker');
            const color1 = document.getElementById('meteorGradientColor1');
            const color2 = document.getElementById('meteorGradientColor2');
            if (tabSingle && tabGradient && singleBox && gradBox && colorPicker && color1 && color2) {
                tabSingle.addEventListener('click', () => {
                    tabSingle.classList.add('active');
                    tabGradient.classList.remove('active');
                    singleBox.style.display = '';
                    gradBox.style.display = 'none';
                    if (typeof window.setMeteorColor === 'function') window.setMeteorColor(colorPicker.value);
                });
                tabGradient.addEventListener('click', () => {
                    tabGradient.classList.add('active');
                    tabSingle.classList.remove('active');
                    singleBox.style.display = 'none';
                    gradBox.style.display = '';
                    if (typeof window.setMeteorGradient === 'function') window.setMeteorGradient(color1.value, color2.value);
                });
                colorPicker.addEventListener('input', function () {
                    if (tabSingle.classList.contains('active') && typeof window.setMeteorColor === 'function') window.setMeteorColor(this.value);
                });
                color1.addEventListener('input', function () {
                    if (tabGradient.classList.contains('active') && typeof window.setMeteorGradient === 'function') window.setMeteorGradient(color1.value, color2.value);
                });
                color2.addEventListener('input', function () {
                    if (tabGradient.classList.contains('active') && typeof window.setMeteorGradient === 'function') window.setMeteorGradient(color1.value, color2.value);
                });
            }

            // Checkbox enable/disable meteor feature
            const enableMeteor = document.getElementById('enableMeteorFeature');
            const meteorControls = [
                document.getElementById('meteorTabSingle'),
                document.getElementById('meteorTabGradient'),
                document.getElementById('meteorSingleColorBox'),
                document.getElementById('meteorGradientColorBox'),
                document.getElementById('meteorSpeedRange'),
                document.getElementById('meteorDensityRange'),
            ];
            function setMeteorControlsEnabled(enabled) {
                meteorControls.forEach(ctrl => {
                    if (!ctrl) return;
                    if (ctrl.tagName === 'INPUT' || ctrl.tagName === 'SELECT' || ctrl.tagName === 'BUTTON') {
                        ctrl.disabled = !enabled;
                    } else {
                        ctrl.style.pointerEvents = enabled ? '' : 'none';
                        ctrl.style.opacity = enabled ? '1' : '0.5';
                    }
                });
            }
            if (enableMeteor) {
                enableMeteor.addEventListener('change', function () {
                    setMeteorControlsEnabled(this.checked);
                    updateTotalPrice(getDynamicPrice);

                    // Áp dụng ngay khi tích/bỏ tích
                    if (this.checked && !window.isMeteorShowerActive) {
                        // Bật mưa sao băng nếu đang tắt
                        if (window.toggleMeteorShower) {
                            window.toggleMeteorShower();
                        }

                        // Áp dụng các giá trị từ slider
                        setTimeout(() => {
                            const speedRange = document.getElementById('meteorSpeedRange');
                            const densityRange = document.getElementById('meteorDensityRange');

                            if (speedRange && typeof window.setMeteorSpeed === 'function') {
                                window.setMeteorSpeed(Number(speedRange.value));
                            }

                            if (densityRange && typeof window.setMeteorSpeed === 'function') {
                                window.setMeteorDensity(Number(densityRange.value));
                            }
                        }, 100);
                    } else if (!this.checked && window.isMeteorShowerActive) {
                        // Tắt mưa sao băng nếu đang bật
                        if (window.toggleMeteorShower) {
                            window.toggleMeteorShower();
                        }
                    }
                });
                setMeteorControlsEnabled(enableMeteor.checked);
            }

            // Checkbox enable/disable central heart feature
            const enableCentralHeart = document.getElementById('enableCentralHeart');
            if (enableCentralHeart) {
                enableCentralHeart.addEventListener('change', function () {
                    updateTotalPrice(getDynamicPrice);
                    // Áp dụng ngay khi tích/bỏ tích
                    if (window.centralSphere && window.centralSphere.applyCentralHeartState) {
                        window.centralSphere.applyCentralHeartState(this.checked);
                    }
                });
            }

            // Checkbox enable/disable nebula feature
            const enableNebula = document.getElementById('enableNebula');
            if (enableNebula) {
                enableNebula.addEventListener('change', function () {
                    // Áp dụng ngay khi tích/bỏ tích
                    if (window.centralSphere) {
                        if (this.checked) {
                            // Bật tinh vân với delay nhỏ để tránh lag
                            setTimeout(() => {
                                window.centralSphere.createNebulas();
                            }, 100); // Delay 100ms
                        } else {
                            // Tắt tinh vân ngay lập tức
                            window.centralSphere.clearNebulas();
                        }
                    }
                });
            }

            // Dropdown thời hạn lưu (3 tier: 15d free / 1year 30k / forever 60k).
            // BE pricing: src/templates/loveplannet/pricing.js.
            const expirationSelect = document.getElementById('expirationSelect');
            if (expirationSelect) {
                expirationSelect.addEventListener('change', function () {
                    updateTotalPrice(getDynamicPrice);
                });
            }

            // Custom slug input — init debounce + check available realtime.
            // Pattern ported từ ValentineDeargift/config-editor.html.
            initSlugFormInput(() => updateTotalPrice(getDynamicPrice));

            // Khởi tạo tổng tiền ban đầu đúng (mặc định 10.000đ)
            updateTotalPrice(getDynamicPrice);

            const speedRange = document.getElementById('meteorSpeedRange');
            if (speedRange) {
                speedRange.addEventListener('input', function () {
                    // Chỉ áp dụng thay đổi khi mưa sao băng đang bật
                    if (window.isMeteorShowerActive && typeof window.setMeteorSpeed === 'function') {
                        window.setMeteorSpeed(Number(this.value));
                    } else {
                    }
                });
            }

            const densityRange = document.getElementById('meteorDensityRange');
            if (densityRange) {
                densityRange.addEventListener('input', function () {
                    // Chỉ áp dụng thay đổi khi mưa sao băng đang bật
                    if (window.isMeteorShowerActive && typeof window.setMeteorDensity === 'function') {
                        window.setMeteorDensity(Number(this.value));
                    } else {
                    }
                });
            }
        }, 500);

        // Thêm điều kiện kiểm tra hash trước khi ẩn settings-icon và chỉnh vị trí ngôn ngữ
        var hash = window.location.hash;
        var isWebCon = hash.startsWith('#id=') || hash.startsWith('#config=');
        if (isWebCon) {
            if (controls) controls.style.display = 'none';
            if (settingsIcon) settingsIcon.style.display = 'none';
            var langDiv = document.getElementById('google_translate_element');
            if (langDiv) {
                langDiv.style.display = 'none';
            }
        }

        // Xử lý chọn nhạc có sẵn
        presetAudioSelect.addEventListener('change', (e) => {
            const url = e.target.value;
            const audioPreview = controlsContainer.querySelector('#audioPreview');
            if (url) {
                // Set audioUrl vào config
                this.config.audioUrl = url;
                // Clear file input
                audioInput.value = '';
                // Hiển thị preview
                if (audioPreview) {
                    audioPreview.src = url;
                    audioPreview.style.display = 'block';
                    audioPreview.currentTime = 0;
                    audioPreview.pause();
                }
                // Tắt nhạc nền mặc định nếu đang phát
                if (window.audioManager && window.audioManager.audio && !window.audioManager.audio.paused) {
                    window.audioManager.audio.pause();
                }
                // Cập nhật giá tiền (không tính phí đổi nhạc nếu là nhạc có sẵn)
                updateTotalPrice(getDynamicPrice);
                // Hiển thị chú thích giá
                if (audioPriceText) {
                    audioPriceText.textContent = ' +5,000đ';
                    audioPriceText.style.display = 'inline-block';
                }
            } else {
                // Nếu bỏ chọn thì ẩn preview
                if (audioPreview) {
                    audioPreview.src = '';
                    audioPreview.style.display = 'none';
                }
                // Xóa audioUrl khỏi config nếu không chọn gì
                delete this.config.audioUrl;
                updateTotalPrice(getDynamicPrice);
                if (audioPriceText) {
                    audioPriceText.textContent = '';
                    audioPriceText.style.display = 'none';
                }
            }
        });
        // Khi ấn play trên audioPreview thì dừng nhạc nền mặc định
        const audioPreview = controlsContainer.querySelector('#audioPreview');
        if (audioPreview) {
            audioPreview.addEventListener('play', () => {
                if (window.audioManager && window.audioManager.audio && !window.audioManager.audio.paused) {
                    window.audioManager.audio.pause();
                }
            });
        }

        // Sau khi gán innerHTML, thêm JS để chặn nhập quá 3 dòng
        setTimeout(() => {
            const heartTextInput = controlsContainer.querySelector('#heartTextInput');
            if (heartTextInput) {
                heartTextInput.addEventListener('input', function () {
                    const lines = this.value.split('\n');
                    if (lines.length > 3) {
                        this.value = lines.slice(0, 3).join('\n');
                    }
                });
            }
        }, 0);

        // Thay đổi hiệu ứng xuất hiện - chỉ cập nhật config, không áp dụng ngay (tránh lag)
        textAppearEffect?.addEventListener('change', () => {
            // Chỉ cập nhật config mà không áp dụng ngay để tránh lag
            const currentConfig = this.getCurrentConfig();
            this.config = { ...this.config, ...currentConfig };
        });




    }

    generatePoints() {
        this.points = [];
        this.sizes = [];
        this.shifts = [];

        for (let i = 0; i < this.config.points; i++) {
            this.sizes.push(Math.random() * 1.5 + 0.5);
            this.pushShift();
            this.points.push(this.createPoint());
        }
    }

    createPoint() {
        return new THREE.Vector3()
            .randomDirection()
            .multiplyScalar(
                Math.random() * (this.config.radius.MAX - this.config.radius.MIN)
                + this.config.radius.MIN
            );
    }

    pushShift() {
        this.shifts.push(
            Math.random() * Math.PI,
            Math.random() * Math.PI * 2,
            (Math.random() * 0.9 + 0.1) * Math.PI * 1.0,
            Math.random() * 0.9 + 0.1
        );
    }

    createBody() {
        this.generatePoints();

        const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
        geometry.setAttribute("sizes", new THREE.Float32BufferAttribute(this.sizes, 1));
        geometry.setAttribute("shift", new THREE.Float32BufferAttribute(this.shifts, 4));

        const material = this.createMaterial();
        const body = new THREE.Points(geometry, material);

        body.rotation.order = "ZYX";
        body.rotation.z = 0.2;

        if (this.object) {
            this.scene.remove(this.object);
        }

        this.object = body;
        this.scene.add(body);
    }

    createMaterial() {
        const material = new THREE.PointsMaterial({
            size: 0.15 * this.config.size,
            transparent: true,
            depthTest: false,
            blending: THREE.AdditiveBlending
        });

        const vertexShader = `
            uniform float time;
            uniform float particleSpeed;
            uniform float size;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform bool isGradient;
            attribute float sizes;
            attribute vec4 shift;
            varying vec3 vColor;
            const float PI2 = 6.28318530718;

            void main() {
                if (isGradient) {
                    float colorMix = mod(shift.x + shift.y, 1.0);
                    vColor = mix(color1, color2, colorMix);
                } else {
                    vColor = color1;
                }
                
                vec3 pos = position;
                float t = time * particleSpeed;
                float moveT = mod(shift.x + shift.z * t, PI2);
                float moveS = mod(shift.y + shift.z * t, PI2);
                pos += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * sizes * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            varying vec3 vColor;

            void main() {
                float d = length(gl_PointCoord.xy - 0.5);
                if (d > 0.5) discard;
                gl_FragColor = vec4(vColor, smoothstep(0.5, 0.1, d) * 0.8);
            }
        `;

        material.onBeforeCompile = (shader) => {
            const color1 = new THREE.Color(this.config.color1);
            const color2 = new THREE.Color(this.config.color2);

            shader.uniforms.time = { value: 0 };
            shader.uniforms.particleSpeed = { value: this.config.particleSpeed };
            shader.uniforms.color1 = { value: new THREE.Vector3(color1.r, color1.g, color1.b) };
            shader.uniforms.color2 = { value: new THREE.Vector3(color2.r, color2.g, color2.b) };
            shader.uniforms.isGradient = { value: this.config.isGradient };

            shader.vertexShader = vertexShader;
            shader.fragmentShader = fragmentShader;
            this.uniforms = shader.uniforms;
        };

        return material;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (this.object) {
            const newMaterial = this.createMaterial();
            this.object.material = newMaterial;
            newMaterial.needsUpdate = true;
        }
        // Áp dụng màu đĩa, màu nền nếu có
        let ps = this.particleSystem;
        if (!ps && window.particleSystem) {
            ps = window.particleSystem;
            this.particleSystem = ps;
        }
        if (ps && (
            newConfig.diskColor || newConfig.innerDiskColor || newConfig.outermostColor || newConfig.backgroundColor)) {
            ps.updateColors(
                newConfig.backgroundColor || null,
                newConfig.diskColor || null,
                newConfig.innerDiskColor || null,
                newConfig.outermostColor || null
            );
        }
        // Áp dụng trạng thái tinh vân nếu có
        if (newConfig.nebulaEnabled !== undefined) {
            if (newConfig.nebulaEnabled) {
                // Nếu có cấu hình tinh vân cụ thể, load lại chính xác
                if (newConfig.nebulaConfig && newConfig.nebulaConfig.positions) {
                    this.loadNebulaConfig(newConfig.nebulaConfig);
                } else {
                    // Nếu không có cấu hình cụ thể, tạo mới
                    this.createNebulas();
                }
            } else {
                this.clearNebulas();
            }
        }
        // Áp dụng cấu hình text3d nếu có (chỉ khi không phải web con)
        const t3d = newConfig.text3d;
        if (window.heartText && t3d && !window.location.hash.includes('#id=') && !window.location.hash.includes('#config=')) {
            if (typeof window.heartText.setText === 'function' && t3d.text !== undefined) {
                window.heartText.setText(t3d.text);
            }
            if (typeof window.heartText.setFont === 'function' && t3d.fontName) {
                window.heartText.setFont(t3d.fontName);
            }
            if (typeof window.heartText.setSize === 'function' && t3d.size !== undefined) {
                window.heartText.setSize(t3d.size);
            }

            if (typeof window.heartText.setColor === 'function' && t3d.color !== undefined) {
                window.heartText.setColor(t3d.color);
            }
            if (typeof window.heartText.setEmissiveColor === 'function' && t3d.emissiveColor !== undefined) {
                window.heartText.setEmissiveColor(t3d.emissiveColor);
            }
            if (typeof window.heartText.setEffect === 'function' && t3d.effectType) {
                window.heartText.setEffect(t3d.effectType, 1.0, 1.0);
            }
            // Nếu có hiệu ứng xuất hiện (appearEffect)
            if (t3d.appearEffect === 'fadein' && typeof window.heartText.showFadeInEffect === 'function') {
                window.heartText.showFadeInEffect(t3d.text || '', 3500);
            } else if (t3d.appearEffect === 'typewriter') {
                // Chuyển typewriter thành none vì đã xóa typewriter effect
                window.heartText.setAppearEffect('none');
            }
        }
    }

    animate() {
        if (this.object) {
            const elapsedTime = this.clock.getElapsedTime();
            this.uniforms.time.value = elapsedTime;
            this.uniforms.particleSpeed.value = this.config.particleSpeed;
            this.object.rotation.y = elapsedTime * this.config.rotationSpeed;
        }
    }

    setParticleSystem(particleSystem) {
        this.particleSystem = particleSystem;
    }

    setFlowerRing(flowerRing) {
        this.flowerRing = flowerRing;
    }

    createNebulas() {
        // Xóa tinh vân cũ nếu có
        this.nebulas.forEach(nebula => {
            this.scene.remove(nebula);
        });
        this.nebulas = [];

        // Tối ưu hóa tinh vân cho iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

        // Cấu hình tinh vân tối ưu cho từng device
        let nebulaOptions;

        if (isIOS) {
            // iOS: Rất nhẹ để tránh lag
            nebulaOptions = {
                count: 8,                     // Giảm từ 18 xuống 6
                minSize: 600,                 // Giảm kích thước
                maxSize: 1400,                // Giảm kích thước
                minOpacity: 0.15,            // Giảm opacity
                maxOpacity: 0.4,             // Giảm opacity
                spreadRadius: 450,            // Giảm bán kính
                colorPalette: getDefaultNebulaColors(),
                centralGlow: false,
                minScale: 200,               // Giảm scale
                maxScale: 350                // Giảm scale
            };
        } else {
            // Android và Desktop: Giữ nguyên cấu hình ban đầu (khỏe lắm!)
            nebulaOptions = {
                count: 18,                    // Giữ nguyên
                minSize: 1000,                // Giữ nguyên
                maxSize: 3000,                // Giữ nguyên
                minOpacity: 0.2,             // Giữ nguyên
                maxOpacity: 0.6,             // Giữ nguyên
                spreadRadius: 700,            // Giữ nguyên
                colorPalette: getDefaultNebulaColors(),
                centralGlow: false,
                minScale: 350,                // Giữ nguyên
                maxScale: 450                // Giữ nguyên
            };
        }

        // Tạo tinh vân và lưu vào mảng
        this.nebulas = createNebulaSystem(this.scene, nebulaOptions);

    }

    clearNebulas() {
        // Xóa tất cả tinh vân khỏi scene
        this.nebulas.forEach(nebula => {
            this.scene.remove(nebula);
        });
        this.nebulas = [];
    }

    loadNebulaConfig(nebulaConfig) {
        // Xóa tinh vân cũ
        this.clearNebulas();

        // Load lại cấu hình tinh vân cụ thể
        if (nebulaConfig.positions && nebulaConfig.positions.length > 0) {
            nebulaConfig.positions.forEach(pos => {
                // Tạo tinh vân với vị trí và scale cụ thể
                const color = getDefaultNebulaColors()[Math.floor(Math.random() * getDefaultNebulaColors().length)];
                const nebula = createGlowMaterial(color, 100, 0.3);

                // Áp dụng vị trí và scale đã lưu
                nebula.position.set(pos.x, pos.y, pos.z);
                nebula.scale.set(pos.scale, pos.scale, 1);

                this.scene.add(nebula);
                this.nebulas.push(nebula);
            });

        }
    }

    // Lấy toàn bộ config dashboard (gồm cả các giá trị đặc biệt)
    getCurrentConfig() {
        // Lấy các giá trị từ input dashboard
        const configObj = { ...this.config };
        // Màu các đĩa và không gian
        const backgroundColorInput = document.getElementById('backgroundColor');
        const diskColorInput = document.getElementById('diskColor');
        const innerDiskColorInput = document.getElementById('innerDiskColor');
        const outermostColorInput = document.getElementById('outermostColor');
        if (backgroundColorInput) configObj.backgroundColor = backgroundColorInput.value;
        if (diskColorInput) configObj.diskColor = diskColorInput.value;
        if (innerDiskColorInput) configObj.innerDiskColor = innerDiskColorInput.value;
        if (outermostColorInput) configObj.outermostColor = outermostColorInput.value;
        // Tốc độ quay đĩa
        const diskRotationSpeedInput = document.getElementById('diskRotationSpeed');
        if (diskRotationSpeedInput) configObj.diskRotationSpeed = parseFloat(diskRotationSpeedInput.value);
        // Tốc độ quay vòng ảnh
        const textureRotationSpeedInput = document.getElementById('textureRotationSpeed');
        if (textureRotationSpeedInput) configObj.textureRotationSpeed = parseFloat(textureRotationSpeedInput.value);
        // Lưu thông tin mưa sao băng
        const enableMeteor = document.getElementById('enableMeteorFeature');
        configObj.meteorEnabled = enableMeteor ? enableMeteor.checked : false;
        const speedRange = document.getElementById('meteorSpeedRange');
        configObj.meteorSpeed = speedRange ? Number(speedRange.value) : 6;
        const densityRange = document.getElementById('meteorDensityRange');
        configObj.meteorDensity = densityRange ? Number(densityRange.value) : 70;
        // Lưu trạng thái trái tim to đùng
        const enableCentralHeart = document.getElementById('enableCentralHeart');
        configObj.centralHeartEnabled = enableCentralHeart ? enableCentralHeart.checked : false;
        // Lưu trạng thái tinh vân
        const enableNebula = document.getElementById('enableNebula');
        configObj.nebulaEnabled = enableNebula ? enableNebula.checked : false; // Mặc định tắt

        // Lưu cấu hình tinh vân cụ thể nếu đang bật
        if (configObj.nebulaEnabled && this.nebulas && this.nebulas.length > 0) {
            configObj.nebulaConfig = {
                count: this.nebulas.length,
                positions: this.nebulas.map(nebula => ({
                    x: nebula.position.x,
                    y: nebula.position.y,
                    z: nebula.position.z,
                    scale: nebula.scale.x,
                    color: nebula.material.map ? 'custom' : 'default' // Lưu thông tin màu
                }))
            };
        }
        // Lưu mode và màu
        const tabSingle = document.getElementById('meteorTabSingle');
        const tabGradient = document.getElementById('meteorTabGradient');
        if (tabSingle && tabSingle.classList.contains('active')) {
            configObj.meteorColorMode = 'single';
            const colorPicker = document.getElementById('meteorColorPicker');
            configObj.meteorColor1 = colorPicker ? colorPicker.value : '#00f0ff';
            configObj.meteorColor2 = colorPicker ? colorPicker.value : '#00f0ff';
        } else if (tabGradient && tabGradient.classList.contains('active')) {
            configObj.meteorColorMode = 'gradient';
            const color1 = document.getElementById('meteorGradientColor1');
            const color2 = document.getElementById('meteorGradientColor2');
            configObj.meteorColor1 = color1 ? color1.value : '#00f0ff';
            configObj.meteorColor2 = color2 ? color2.value : '#ffffff';
        }

        // Lấy config Text 3D
        const heartTextInputConfig = document.getElementById('heartTextInput');
        const textFontConfig = document.getElementById('textFont');
        const textSizeConfig = document.getElementById('textSize');

        const textColorConfig = document.getElementById('textColor');
        const textEffectConfig = document.getElementById('textEffect');
        const textAppearEffectSelect = document.getElementById('textAppearEffect');


        configObj.text3d = {
            text: heartTextInputConfig ? heartTextInputConfig.value : '',
            fontName: textFontConfig ? textFontConfig.value : 'bevietnampro',
            size: textSizeConfig ? parseFloat(textSizeConfig.value) : 30,
            color: textColorConfig ? parseInt(textColorConfig.value.replace('#', ''), 16) : 0xffffff,
            emissiveColor: window.heartText && window.heartText.config && window.heartText.config.emissiveColor ? window.heartText.config.emissiveColor : 0xffffff,
            effectType: textEffectConfig ? textEffectConfig.value : 'none',
            appearEffect: textAppearEffectSelect ? textAppearEffectSelect.value : (window.heartText.config.appearEffect || 'none')
            // Thêm các giá trị khác nếu cần

        };
        return configObj;
    }

    // ===== CÁC HÀM TIỆN ÍCH =====

    /**
     * Upload ảnh lên R2
     * @param {FileList} files - Danh sách file ảnh
     * @returns {Promise<string[]>} - Mảng URL ảnh
     */
    async uploadImages(files) {
        const imageUrls = [];
        if (files && files.length > 0) {
            // VIP prefix khi user chọn tier có phí (1year/forever) → giúp R2
            // cleanup job giữ lại file lâu hơn. Tier free (15d) dùng prefix rỗng.
            const expirationEl = document.getElementById('expirationSelect');
            const expVal = expirationEl ? expirationEl.value : '15d';
            const prefix = (expVal === '1year' || expVal === 'forever') ? 'vip' : '';

            for (let i = 0; i < files.length; i++) {
                const imgBase64 = await fileToBase64(files[i]);
                const url = await uploadImageToR2(imgBase64, prefix);
                imageUrls.push(url);
            }
        }
        return imageUrls;
    }

    /**
     * Upload audio lên R2
     * @param {File} file - File audio
     * @returns {Promise<string>} - URL audio
     */
    async uploadAudio(file) {
        if (file) {
            // VIP prefix cho tier có phí — cùng logic với uploadImages.
            const expirationEl = document.getElementById('expirationSelect');
            const expVal = expirationEl ? expirationEl.value : '15d';
            const prefix = (expVal === '1year' || expVal === 'forever') ? 'vip' : '';

            const audioBase64 = await fileToBase64(file);
            const url = await uploadAudioToR2(audioBase64, prefix);
            return url;
        }
        return null;
    }

    /**
     * @deprecated V2 — handleFinishCreation() gọi processPayment({paymentUrl, ...})
     *              trực tiếp với paymentUrl từ atomic create response. Method này
     *              không còn dùng. Giữ stub để code cũ không throw.
     */
    async handlePayment(_orderCode = null, _paymentMethod = 'PAYOS') {
        console.warn('[sphere] handlePayment() deprecated — handleFinishCreation đã gọi processPayment trực tiếp.');
        return true;
    }

    /**
     * @deprecated V2 atomic — KHÔNG còn /api/galaxy-configs riêng. createWebsiteV2
     *             trong handleFinishCreation() đã merge config + product + order
     *             vào 1 call. Giữ stub để code cũ không throw nếu lỡ gọi.
     */
    async saveGalaxyConfig(_config) {
        console.warn('[sphere] saveGalaxyConfig() deprecated — handleFinishCreation đã dùng createWebsiteV2.');
        return { success: false, shortLink: '', galaxyId: null, message: '' };
    }

    /**
     * @deprecated V2 atomic — KHÔNG còn /api/products riêng. Xem saveGalaxyConfig note.
     */
    async createProduct(_shareUrl, _imageUrl, _totalPrice, _orderCode, _configId) {
        console.warn('[sphere] createProduct() deprecated — handleFinishCreation đã dùng createWebsiteV2.');
        return '';
    }

    /**
     * Tạo fallback URL nếu không lưu được config
     * @param {Object} config - Cấu hình thiên hà
     * @returns {string} - URL fallback
     */
    createFallbackUrl(config) {
        const configStr = JSON.stringify(config);
        const base64Config = btoa(unescape(encodeURIComponent(configStr)));
        return window.location.origin + window.location.pathname + '#config=' + base64Config;
    }

    /**
     * Hiển thị popup chia sẻ
     * @param {string} shareUrl - Link chia sẻ
     * @param {string} apiMessage - Message từ API
     */
    showSharePopup(shareUrl, apiMessage) {

        // Tạo ID duy nhất cho popup này
        const popupId = 'share-popup-' + Date.now();
        const inputId = 'share-input-' + Date.now();
        const copyBtnId = 'copy-btn-' + Date.now();
        const viewBtnId = 'view-btn-' + Date.now();
        const closeBtnId = 'close-btn-' + Date.now();

        // Xóa popup cũ nếu có
        const oldPopups = document.querySelectorAll('.share-popup');
        oldPopups.forEach((oldPopup, index) => {
            try {
                document.body.removeChild(oldPopup);
            } catch (e) {
                console.log('❌ Error removing old popup:', e);
            }
        });

        // Đợi một chút để đảm bảo DOM được cleanup
        setTimeout(() => {
            this._createPopup(popupId, inputId, copyBtnId, viewBtnId, closeBtnId, shareUrl, apiMessage);
        }, 100);
    }

    /**
     * Tạo popup element
     */
    _createPopup(popupId, inputId, copyBtnId, viewBtnId, closeBtnId, shareUrl, apiMessage) {

        const popup = document.createElement('div');
        popup.id = popupId;
        popup.className = 'share-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            color: #222;
            padding: 2.5vh 2vw;
            border-radius: 14px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.18);
            z-index: 99999;
            max-width: 90vw;
            width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
        `;

        popup.innerHTML = `
            <div style="position:relative;">
                <button id='${closeBtnId}' class="share-btn close-btn" style='position:absolute;top:0;right:0;background:#eee;color:#222;padding:6px 12px;border:none;border-radius:8px;font-size:0.9em;font-weight:600;cursor:pointer;'>Đóng</button>
            ${apiMessage}
                <div style='font-size:clamp(1em, 4vw, 1.15em);font-weight:600;margin-bottom:12px;margin-top:10px;'>Link chia sẻ thiên hà của bạn:</div>
                <input id='${inputId}' style='width:100%;padding:8px 6px;font-size:clamp(0.9em, 3.5vw, 1em);border-radius:6px;border:1px solid #ccc;margin-bottom:12px;' value='${shareUrl}' readonly>
            <div style='font-size:clamp(0.8em, 3vw, 0.9em);color:#666;margin-bottom:12px;font-style:italic;'>💡 Nhấn "Sao chép link & Tạo QR" để copy link và mở trang tạo QR trái tim, sau đó dán link vào ô là được nhaaa!</div>
                <div style='display:flex;gap:10px;'>
                    <button id='${copyBtnId}' class="share-btn copy-btn" style='flex:1;background:#ff6b6b;color:#fff;padding:clamp(6px, 2vh, 8px) clamp(12px, 4vw, 18px);border:none;border-radius:8px;font-size:clamp(0.9em, 3.5vw, 1em);font-weight:600;cursor:pointer;margin-right:12px;'>Sao chép link & Tạo QR</button>
                    <button id='${viewBtnId}' class="share-btn view-btn" style='flex:1;background:#4ecdc4;color:#fff;padding:clamp(6px, 2vh, 8px) clamp(12px, 4vw, 18px);border:none;border-radius:8px;font-size:clamp(0.9em, 3.5vw, 1em);font-weight:600;cursor:pointer;'>Xem ngay</button>
                </div>
            </div>
        `;

        // Thêm popup vào DOM
        document.body.appendChild(popup);

        // Sử dụng event delegation cho toàn bộ popup
        popup.addEventListener('click', (event) => {
            // Copy button
            if (event.target.id === copyBtnId || event.target.classList.contains('copy-btn')) {
                const input = document.getElementById(inputId);
                if (!input) {
                    return;
                }

                // Cách mới: Clipboard API
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(input.value)
                        .then(() => {
                            event.target.innerText = 'Đã sao chép!';
                        })
                        .catch((err) => {
                            input.select();
                            document.execCommand('copy');
                            event.target.innerText = 'Đã sao chép!';
                        });
                } else {
                    input.select();
                    document.execCommand('copy');
                    event.target.innerText = 'Đã sao chép!';
                }

                // Redirect đến trang QR với link thiên hà
                setTimeout(() => {
                    const qrUrl = `https://deargift.online/heartqr.html?url=${encodeURIComponent(input.value)}`;
                    window.open(qrUrl, '_blank');
                }, 200);
            }

            // View button
            else if (event.target.id === viewBtnId || event.target.classList.contains('view-btn')) {
                window.open(shareUrl, '_blank');
            }

            // Close button
            else if (event.target.id === closeBtnId || event.target.classList.contains('close-btn')) {
                popup.classList.add('fade-out');
                // Tạo hiệu ứng hạt tan biến
                this.createParticleEffect(popup);
                // Xóa popup sau khi animation hoàn thành
                setTimeout(() => {
                    try {
                        if (document.body.contains(popup)) {
                            document.body.removeChild(popup);
                        }
                    } catch (e) {
                        console.log('❌ Error removing popup:', e);
                    }
                }, 2500);
            }
        });
    }

    /**
     * Xử lý logic chính khi click nút hoàn tất
     */
    async handleFinishCreation() {
        try {
            // 1. Auth check — V2 dùng dg_jwt thay cho user_uid. Vẫn giữ user_uid
            //    cho UI legacy (avatar, vouchers) nhưng nguồn truth là jwt.
            const jwt = localStorage.getItem('dg_jwt');
            const uid = localStorage.getItem('user_uid');
            if (!jwt || !uid) {
                showToast('Vui lòng đăng nhập trước khi tạo thiên hà!', 'error');
                const googleBtn = document.getElementById('googleLoginBtn');
                if (googleBtn) {
                    googleBtn.style.boxShadow = '0 0 0 4px #ff6b6b, 0 2px 8px #0002';
                    googleBtn.style.animation = 'shake 0.4s';
                    setTimeout(() => {
                        googleBtn.style.boxShadow = '';
                        googleBtn.style.animation = '';
                    }, 1000);
                }
                return;
            }
            const controls = document.getElementById('controlsDashboard');

            // 2. Upload ảnh + audio LÊN R2 (presigned URL).
            //    Giữ this.uploadImages/uploadAudio — đã chuyển sang presign trong
            //    createProduct.js (cùng tên helper, signature compatible).
            const imageInput = document.getElementById('flowerImageInput');
            const audioInput = document.getElementById('audioInput');
            const presetAudioSelect = document.getElementById('presetAudioSelect');

            const imageUrls = await this.uploadImages(imageInput?.files);
            const audioUrl  = await this.uploadAudio(audioInput?.files?.[0]);

            // 3. Build V2 config từ legacy state.
            //    buildV2Config tự convert tên field (centralHeartEnabled →
            //    enableCentralHeart, color int → hex string, …).
            const legacyConfig = this.getCurrentConfig();
            legacyConfig.imageUrls = imageUrls;
            if (audioUrl) legacyConfig.audioUrl = audioUrl;

            const presetAudioValue = presetAudioSelect ? presetAudioSelect.value : '';
            const v2Config = buildV2Config(legacyConfig, {
                websiteTitle: 'Thiên hà tình yêu',
                presetAudio:  presetAudioValue,
            });

            // 4. Build features object — server-authoritative pricing (BE
            //    config.service tự extract từ persisted config, FE chỉ gửi
            //    expiration + tip + voucher + slug).
            // Đọc tier expiration từ dropdown (15d / 1year / forever).
            // BE whitelist check ở pricing.service — tier sai sẽ throw 400.
            const expirationSelectEl = document.getElementById('expirationSelect');
            const expiration = expirationSelectEl ? expirationSelectEl.value : '15d';

            const payOsMethod = document.getElementById('payOsMethod');
            const polarMethod = document.getElementById('polarMethod');
            let paymentMethod = 'PAYOS';
            if (polarMethod && polarMethod.checked)        paymentMethod = 'POLAR';
            else if (payOsMethod && payOsMethod.checked)   paymentMethod = 'PAYOS';
            const currency = paymentMethod === 'POLAR' ? 'USD' : 'VND';

            const tipInputVnd = document.getElementById('tipAmount');
            const tipInputUsd = document.getElementById('tipAmountUsd');
            const tipValue = currency === 'USD'
                ? Math.round(Math.max(0, Number(tipInputUsd?.value) || 0) * 100) / 100
                : Math.max(0, parseInt(tipInputVnd?.value, 10) || 0);

            if (paymentMethod === 'POLAR') {
                if (!isUsdPricingReady()) {
                    showToast('⏳ Đang tải bảng giá USD, vui lòng đợi vài giây.', 'error');
                    return;
                }
                const basePrice = this.calculateTotalPrice('USD');
                const finalUsd = basePrice + tipValue;
                if (finalUsd > 0 && finalUsd < POLAR_MIN_USD) {
                    showToast(`❌ Polar yêu cầu tối thiểu $${POLAR_MIN_USD} USD.`, 'error');
                    return;
                }
            }

            const features = { expiration, tip: tipValue };

            // Custom slug — chỉ gửi true khi user đã nhập + BE check available.
            // BE pricing.service cộng 10k; slug.service.claimSlug verify cờ
            // order.features.customSlug === true trước khi cho claim.
            const slugState = window._slugFormState;
            const hasCustomSlug = !!(slugState && slugState.available && slugState.value);
            if (hasCustomSlug) features.customSlug = true;

            // 5. Chọn payment method + currency (đã xác định ở trên).
            // 6. Voucher (FE chỉ gửi code — BE atomic flow tự validate +
            //    cộng/trừ discount). Không apply trước nữa.
            const voucherCode = (typeof getSelectedVoucherCode === 'function')
                ? (getSelectedVoucherCode() || null)
                : null;

            // 7. Atomic create — 1 round-trip.
            const customerEmail = localStorage.getItem('customerEmail') || '';
            const atomicBody = {
                config:         v2Config,
                features,
                currency,
                paymentMethod,
                customerEmail,
                voucherCode,
            };

            showToast('Đang tạo thiên hà...', 'info');
            let createResult;
            try {
                createResult = await createWebsiteV2(atomicBody);
            } catch (err) {
                console.error('[handleFinishCreation] createWebsiteV2 fail:', err);
                showToast(err.message || 'Tạo thiên hà thất bại', 'error');
                return;
            }

            const { websiteId, orderCode, paymentUrl, total } = createResult;
            let linkproduct = createResult.linkproduct;

            // Claim slug best-effort — fail KHÔNG block payment. Chỉ chạy nếu
            // user đã nhập slug + BE đã confirm available + features.customSlug=true.
            if (hasCustomSlug) {
                const slugResult = await tryClaimSlugAfterCreate(websiteId);
                if (slugResult.ok && slugResult.customSlug) {
                    linkproduct = `${VIEWER_ORIGIN}/${slugResult.customSlug}`;
                    showToast(`✅ Đã đặt link đẹp: ${slugResult.customSlug}`, 'info');
                } else if (!slugResult.skipped) {
                    showToast(`⚠️ ${slugResult.errorMessage || 'Không đặt được link đẹp.'} Bạn vẫn có link mặc định.`, 'info');
                }
            }

            const shareUrl = linkproduct || `${VIEWER_ORIGIN}/index.html#id=${websiteId}`;

            // Lưu instance state (payment_success handler dùng).
            this.currentShareUrl   = shareUrl;
            this.currentApiMessage = '<div style="color:green;margin-bottom:8px;">Đã tạo thiên hà!</div>';
            this.currentConfigId   = websiteId;

            // 8. Thanh toán (chỉ khi có phí). Free version → show popup ngay.
            if (total > 0 && paymentUrl) {
                const paymentSuccess = await processPayment({
                    paymentUrl,
                    orderCode,
                    paymentMethod,
                    showToast,
                });
                if (!paymentSuccess) {
                    console.log('Thanh toán thất bại hoặc bị hủy');
                    return;
                }
                // payment_success event sẽ trigger popup.
            } else {
                if (controls) controls.style.display = 'none';
                this.showSharePopup(shareUrl, this.currentApiMessage);
            }

        } catch (error) {
            console.error('Lỗi trong quá trình tạo thiên hà:', error);
            showToast('Có lỗi xảy ra trong quá trình tạo thiên hà!', 'error');
        }
    }

    /**
     * Tính tổng tiền dựa trên các tùy chọn (currency-aware: PAYOS=VND, POLAR=USD).
     * @param {string} [currency] - 'VND' | 'USD'; mặc định theo payment method đang chọn.
     * @returns {number}
     */
    calculateTotalPrice(currency) {
        currency = currency || getSelectedCurrency();
        let totalPrice = 0;
        let costBreakdown = [];

        const enableCentralHeart = document.getElementById('enableCentralHeart');
        if (enableCentralHeart && enableCentralHeart.checked) {
            const price = getFeaturePriceCurrency('centralHeart', currency);
            totalPrice += price;
            costBreakdown.push(`💖 Trái tim to đùng: +${formatPriceAmount(price, currency)}`);
        }

        const imageInput = document.getElementById('flowerImageInput');
        if (imageInput && imageInput.files.length > 0) {
            const freeCount = getFeatureFreeCount('flowerImages');
            const perExtra  = getFeaturePerExtraCurrency('flowerImages', currency);
            const extraImages = Math.max(0, imageInput.files.length - freeCount);
            if (extraImages > 0 && perExtra > 0) {
                const imageCost = extraImages * perExtra;
                totalPrice += imageCost;
                costBreakdown.push(`🖼️ ${extraImages} ảnh thêm: +${formatPriceAmount(imageCost, currency)}`);
            }
        }

        // Chỉ cộng customMusic khi user upload file — preset nhạc = free ở BE.
        const audioInput = document.getElementById('audioInput');
        if (audioInput && audioInput.files.length > 0) {
            const price = getFeaturePriceCurrency('customMusic', currency);
            totalPrice += price;
            costBreakdown.push(`🎵 Đổi nhạc: +${formatPriceAmount(price, currency)}`);
        }

        const enableMeteor = document.getElementById('enableMeteorFeature');
        if (enableMeteor && enableMeteor.checked) {
            const price = getFeaturePriceCurrency('meteors', currency);
            totalPrice += price;
            costBreakdown.push(`☄️ Mưa sao băng: +${formatPriceAmount(price, currency)}`);
        }

        const expirationSel = document.getElementById('expirationSelect');
        const expVal = expirationSel ? expirationSel.value : '15d';
        const expPrice = getExpirationPriceCurrency(expVal, currency);
        if (expPrice > 0) {
            const beLabel = getExpirationLabel(expVal);
            totalPrice += expPrice;
            costBreakdown.push(`💾 Lưu ${beLabel}: +${formatPriceAmount(expPrice, currency)}`);
        }

        const slugState = window._slugFormState;
        if (slugState && slugState.available && slugState.value) {
            const price = getFeaturePriceCurrency('customSlug', currency);
            totalPrice += price;
            costBreakdown.push(`🔗 Link đẹp: +${formatPriceAmount(price, currency)}`);
        }

        if (currency === 'USD') {
            totalPrice = Math.round(Math.max(0, totalPrice) * 100) / 100;
        } else {
            totalPrice = Math.max(0, Math.floor(totalPrice));
        }

        this.updateCostBreakdown(costBreakdown);
        return totalPrice;
    }

    /**
     * Cập nhật bảng thống kê chi phí
     * @param {Array} costBreakdown - Danh sách các khoản chi phí
     */
    updateCostBreakdown(costBreakdown) {
        const costDetails = document.getElementById('costDetails');
        if (costDetails) {
            if (costBreakdown.length === 0) {
                costDetails.innerHTML = '<div style="color:#999;font-style:italic;">Chưa có tính năng mất phí nào được chọn, nếu bạn ấn tạo bây giờ thì bạn sẽ có 1 thiên hà cơ bản free</div>';
            } else {
                costDetails.innerHTML = costBreakdown.map(item => `<div>${item}</div>`).join('');
            }
        }
    }

    showFreeVersionInfo() {
        const popup = document.createElement('div');
        popup.className = 'free-version-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            color: #222;
            padding: 3vh 2.5vw;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 9999;
            max-width: 90vw;
            width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
        `;

        popup.innerHTML = `
            <div style='text-align:center;margin-bottom:24px;'>
                <h2 style='margin:0 0 8px 0;color:#4ecdc4;font-size:clamp(1.2em, 5vw, 1.4em);'>🌌 Phiên Bản Free</h2>
                <p style='margin:0;color:#666;font-size:clamp(1em, 4vw, 1.1em);'>Với phiên bản free, các bạn sẽ có 1 thiên hà mặc định:</p>
            </div>
            <div style='background:#f8f9fa;padding:clamp(15px, 4vw, 20px);border-radius:12px;margin-bottom:24px;'>
                <ul style='margin:0;padding-left:20px;line-height:1.6;color:#333;'>
                    <li style='font-size:clamp(0.9em, 3.5vw, 1em);'>• <strong>Không có trái tim to ở giữa</strong></li>
                    <li style='font-size:clamp(0.9em, 3.5vw, 1em);'>• <strong>Có thể đổi 1 ảnh</strong></li>
                    <li style='font-size:clamp(0.9em, 3.5vw, 1em);'>• <strong>Dùng nhạc mặc định</strong></li>
                    <li style='font-size:clamp(0.9em, 3.5vw, 1em);'>• <strong>Có thể tùy chỉnh màu sắc tùy ý</strong></li>
                </ul>
            </div>
            <div style='text-align:center;'>
                <button id='createFreeConfirmBtn' style='background:#4ecdc4;color:#fff;padding:clamp(10px, 2.5vh, 12px) clamp(20px, 6vw, 32px);border:none;border-radius:10px;font-size:clamp(1em, 4vw, 1.1em);font-weight:600;cursor:pointer;margin-right:12px;'>Tạo Free Ngay</button>
                <button id='closeFreePopupBtn' style='background:#eee;color:#222;padding:clamp(10px, 2.5vh, 12px) clamp(20px, 6vw, 32px);border:none;border-radius:10px;font-size:clamp(1em, 4vw, 1.1em);font-weight:600;cursor:pointer;'>Đóng</button>
            </div>
        `;

        document.body.appendChild(popup);

        // Xử lý sự kiện tạo free
        document.getElementById('createFreeConfirmBtn').onclick = () => {
            this.handleFreeCreation();
            document.body.removeChild(popup);
        };

        // Xử lý sự kiện đóng
        document.getElementById('closeFreePopupBtn').onclick = () => {
            document.body.removeChild(popup);
        };
    }

    /**
     * Xử lý tạo phiên bản free
     */
    async handleFreeCreation() {
        try {
            // Tạo config cho phiên bản free
            const freeConfig = {
                // Màu sắc cơ bản (giữ nguyên từ config hiện tại)
                color1: this.config.color1,
                color2: this.config.color2,
                isGradient: this.config.isGradient,
                size: this.config.size,
                rotationSpeed: this.config.rotationSpeed,
                particleSpeed: this.config.particleSpeed,
                points: this.config.points,
                radius: this.config.radius,

                // Tắt trái tim to đùng ở giữa cho phiên bản free
                hideCentralHeart: true,

                // Giới hạn chỉ 1 ảnh
                maxImages: 1,

                // Không có mưa sao băng
                meteorEnabled: false,

                // Không có audio tùy chỉnh
                useDefaultAudio: true
            };

            // Upload ảnh (chỉ 1 ảnh đầu tiên nếu có)
            const imageInput = document.getElementById('flowerImageInput');
            let imageUrls = [];
            if (imageInput && imageInput.files.length > 0) {
                const firstImage = imageInput.files[0];
                const imgBase64 = await fileToBase64(firstImage);
                const url = await uploadImageToR2(imgBase64);
                imageUrls.push(url);
                freeConfig.imageUrls = imageUrls;
            }

            // Tạo fallback URL cho phiên bản free
            const shareUrl = this.createFallbackUrl(freeConfig);

            // Hiển thị popup chia sẻ cho phiên bản free
            this.showFreeSharePopup(shareUrl);

        } catch (error) {
            console.error('Lỗi trong quá trình tạo phiên bản free:', error);
            showToast('Có lỗi xảy ra trong quá trình tạo phiên bản free!', 'error');
        }
    }

    /**
     * Hiển thị popup chia sẻ cho phiên bản free
     * @param {string} shareUrl - Link chia sẻ
     */
    showFreeSharePopup(shareUrl) {
        const popup = document.createElement('div');
        popup.className = 'share-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            color: #222;
            padding: 2.5vh 2vw;
            border-radius: 14px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.18);
            z-index: 9999;
            max-width: 90vw;
            width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
        `;

        popup.innerHTML = `
            <div style='text-align:center;margin-bottom:20px;'>
                <h3 style='margin:0 0 8px 0;color:#4ecdc4;font-size:clamp(1.1em, 4.5vw, 1.3em);'>🎉 Tạo Free Thành Công!</h3>
                <p style='margin:0;color:#666;font-size:clamp(0.9em, 3.5vw, 1em);'>Thiên hà free của bạn đã sẵn sàng để chia sẻ</p>
            </div>
            <div style='font-size:clamp(1em, 4vw, 1.15em);font-weight:600;margin-bottom:12px;'>Link chia sẻ thiên hà free:</div>
            <input id='freeShareLinkInput' style='width:100%;padding:8px 6px;font-size:clamp(0.9em, 3.5vw, 1em);border-radius:6px;border:1px solid #ccc;margin-bottom:12px;' value='${shareUrl}' readonly>
            <div style='text-align:center;'>
                <button id='copyFreeShareLinkBtn' style='background:#4ecdc4;color:#fff;padding:clamp(6px, 2vh, 8px) clamp(12px, 4vw, 18px);border:none;border-radius:8px;font-size:clamp(0.9em, 3.5vw, 1em);font-weight:600;cursor:pointer;margin-right:12px;'>Sao chép link</button>
                <button id='closeFreeSharePopupBtn' style='background:#eee;color:#222;padding:clamp(6px, 2vh, 8px) clamp(12px, 4vw, 18px);border:none;border-radius:8px;font-size:clamp(0.9em, 3.5vw, 1em);font-weight:600;cursor:pointer;'>Đóng</button>
            </div>
        `;

        document.body.appendChild(popup);

        // Xử lý sự kiện copy
        document.getElementById('copyFreeShareLinkBtn').onclick = () => {
            const input = document.getElementById('freeShareLinkInput');
            input.select();
            document.execCommand('copy');
            document.getElementById('copyFreeShareLinkBtn').innerText = 'Đã sao chép!';
        };

        // Xử lý sự kiện đóng
        document.getElementById('closeFreeSharePopupBtn').onclick = () => {
            // Thêm hiệu ứng fade-out cho popup
            popup.classList.add('fade-out');

            // Tạo hiệu ứng hạt tan biến
            this.createParticleEffect(popup);

            // Xóa popup sau khi animation hoàn thành
            setTimeout(() => {
                try {
                    if (document.body.contains(popup)) {
                        document.body.removeChild(popup);
                    }
                } catch (e) {
                    console.log('❌ Error removing free popup:', e);
                }
            }, 2500);
        };

    }

    /**
     * Áp dụng trạng thái trái tim to đùng
     * @param {boolean} enabled - Trạng thái bật/tắt trái tim to đùng
     */
    applyCentralHeartState(enabled) {
        // Sử dụng reference trực tiếp từ window.heart3D
        if (window.heart3D) {
            if (enabled) {
                // Hiện trái tim to đùng
                window.heart3D.visible = true;
            } else {
                // Ẩn trái tim to đùng
                window.heart3D.visible = false;
            }
        } else {
            console.log('❌ Trái tim 3D chưa được load');
        }

        // Điều chỉnh vị trí text3D dựa trên trạng thái trái tim và số dòng
        this.adjustText3DPosition(enabled);
    }

    /**
     * Điều chỉnh vị trí Text3D dựa trên số dòng và trạng thái trái tim
     * @param {boolean} heartEnabled - Trạng thái bật/tắt trái tim
     */
    adjustText3DPosition(heartEnabled) {
        if (!window.heartText) return;

        if (!heartEnabled) {
            // Nếu không có trái tim, đặt text ở vị trí trung tâm
            window.heartText.setPosition(0, 200, 0);
            return;
        }

        // Tính toán vị trí dựa trên số dòng text
        const textContent = window.heartText.config.text || '';
        // Xử lý các loại xuống dòng khác nhau (\n, \r\n, \r)
        const normalizedText = textContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalizedText.split('\n').filter(line => line.trim() !== '');


        let yPosition = 200; // Vị trí mặc định

        // Điều chỉnh vị trí dựa trên số dòng
        if (lines.length === 1) {
            yPosition = 330; // 1 dòng - vị trí thấp
        } else if (lines.length === 2) {
            yPosition = 360; // 2 dòng - vị trí cao hơn
        } else if (lines.length >= 3) {
            yPosition = 390; // 3 dòng trở lên - vị trí cao nhất
        }

        // Đưa text về vị trí tính toán
        window.heartText.setPosition(0, yPosition, 0);
    }

    /**
     * Tạo hiệu ứng phân rã popup thành hạt tròn nhỏ
     * @param {HTMLElement} element - Element cần tạo hiệu ứng phân rã
     */
    createParticleEffect(element) {
        const rect = element.getBoundingClientRect();

        // Tạo hạt ngẫu nhiên phủ toàn bộ popup
        const particleCount = 50; // Số lượng hạt

        // Ẩn popup gốc ngay lập tức
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Vị trí bắt đầu ngẫu nhiên trong popup
            const startX = rect.left + Math.random() * rect.width;
            const startY = rect.top + Math.random() * rect.height;

            // Hướng bay hoàn toàn ngẫu nhiên
            const dx = (Math.random() - 0.5) * 200; // -100 đến +100px
            const dy = (Math.random() - 0.5) * 200; // -100 đến +100px

            // Màu sắc chỉ xám trắng
            const colors = ['#f5f5f5', '#e8e8e8', '#d0d0d0', '#b8b8b8', '#a0a0a0'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            // Kích thước hạt nhỏ
            const size = 2 + Math.random() * 2; // 2-4px

            // Thiết lập style cho hạt
            particle.style.cssText = `
                position: fixed;
                left: ${startX}px;
                top: ${startY}px;
                width: ${size}px;
                height: ${size}px;
                background-color: ${randomColor};
                border-radius: 50%;
                pointer-events: none;
                z-index: 100000;
                opacity: 1;
                transform: scale(1);
                box-shadow: 0 0 2px ${randomColor};
                transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);
            `;

            // Thêm vào DOM
            document.body.appendChild(particle);

            // Trigger animation với delay ngẫu nhiên
            setTimeout(() => {
                particle.style.opacity = '0';
                particle.style.transform = `scale(0) translate(${dx}px, ${dy}px)`;
            }, Math.random() * 800); // Delay ngẫu nhiên 0-800ms

            // Xóa hạt sau khi animation hoàn thành
            setTimeout(() => {
                if (document.body.contains(particle)) {
                    document.body.removeChild(particle);
                }
            }, 2500);
        }
    }

    /**
     * Cập nhật hiển thị section thanh toán dựa trên tổng tiền
     */
    updatePaymentSectionVisibility() {
        const paymentSection = document.getElementById('paymentMethodSection');
        if (paymentSection) {
            const totalPrice = this.calculateTotalPrice();
            if (totalPrice > 0) {
                paymentSection.style.display = 'block';
            } else {
                paymentSection.style.display = 'none';
            }
        }
    }

    /**
     * Áp dụng tất cả thay đổi: text 3D, audio, image, checkbox features
     */
    applyAllChanges() {
        // 1. Áp dụng text 3D nếu có thay đổi
        this.applyText3DChanges();

        // 2. Áp dụng audio nếu có chọn
        this.applyAudioChanges();

        // 3. Áp dụng image nếu có chọn
        this.applyImageChanges();

        // 4. Áp dụng checkbox features (trái tim, mưa sao băng, tinh vân)
        // this.applyCheckboxFeatures(); // Tạm thời comment lại, chỉ áp dụng ảnh và nhạc
    }

    /**
     * Áp dụng thay đổi text 3D
     */
    applyText3DChanges() {
        if (!window.heartText) return;

        // Lấy text từ textarea
        const heartTextInput = document.getElementById('heartTextInput');
        const textSize = document.getElementById('textSize');
        const textColor = document.getElementById('textColor');
        const textEffect = document.getElementById('textEffect');
        const textAppearEffect = document.getElementById('textAppearEffect');

        // Tạo hash để so sánh text hiện tại với text cũ
        const currentText = heartTextInput ? heartTextInput.value.trim() : '';
        const currentSize = textSize ? parseFloat(textSize.value) : 1;
        const currentColor = textColor ? textColor.value : '#ffffff';
        const currentFont = textFont ? textFont.value : 'default';
        const currentEffect = textEffect ? textEffect.value : 'none';
        const currentAppearEffect = textAppearEffect ? textAppearEffect.value : 'none';

        const textHash = `${currentText}|${currentSize}|${currentColor}|${currentFont}|${currentEffect}|${currentAppearEffect}`;
        const lastTextHash = this.lastTextHash || '';

        // Chỉ áp dụng nếu text thực sự thay đổi
        if (textHash !== lastTextHash) {
            // Khai báo biến text ở scope ngoài để sử dụng trong toàn bộ hàm
            let text = '';
            if (heartTextInput) {
                text = currentText;
                if (text) {
                    window.heartText.setText(text);
                }
            }

            // Áp dụng kích thước
            if (textSize && window.heartText.setSize) {
                window.heartText.setSize(currentSize);
            }

            // Áp dụng màu text (emissive sẽ tự động đi theo)
            if (textColor && window.heartText.setColor) {
                const hex = parseInt(currentColor.replace('#', ''), 16);
                window.heartText.setColor(hex);
                // Tự động set emissive color cùng với màu text
                window.heartText.setEmissiveColor(hex);
            }

            // Áp dụng font
            const textFont = document.getElementById('textFont');
            if (textFont && window.heartText.setFont) {
                window.heartText.setFont(currentFont);
            }

            // Áp dụng hiệu ứng
            if (textEffect && window.heartText.setEffect) {
                window.heartText.setEffect(currentEffect, 1.0, 1.0);
            }

            // Áp dụng hiệu ứng xuất hiện
            if (textAppearEffect && currentAppearEffect === 'fadein' && window.heartText.showFadeInEffect) {
                const textToShow = text || (window.heartText.config.text || 'Love Planet');
                window.heartText.showFadeInEffect(textToShow, 3500);
            } else if (textAppearEffect && currentAppearEffect === 'none' && window.heartText.setText) {
                const textToShow = text || (window.heartText.config.text || 'Love Planet');
                window.heartText.setText(textToShow);
            }

            // Điều chỉnh vị trí text dựa trên số dòng và trạng thái trái tim
            const heartEnabled = document.getElementById('enableCentralHeart')?.checked || false;
            this.adjustText3DPosition(heartEnabled);

            // Cập nhật config
            this.updateConfig({ text3d: this.getCurrentConfig().text3d });

            // Lưu hash để so sánh lần sau
            this.lastTextHash = textHash;
        }
    }

    /**
     * Áp dụng thay đổi audio
     */
    applyAudioChanges() {
        const audioInput = document.getElementById('audioInput');
        const presetAudioSelect = document.getElementById('presetAudioSelect');

        // Kiểm tra audio input file
        if (audioInput && audioInput.files.length > 0) {
            const file = audioInput.files[0];
            if (file && window.audioManager && window.audioManager.setAudioUrl) {
                // Tạo URL từ file
                const audioUrl = URL.createObjectURL(file);
                window.audioManager.setAudioUrl(audioUrl);
            }
        }
        // Kiểm tra preset audio
        else if (presetAudioSelect && presetAudioSelect.value) {
            if (window.audioManager && window.audioManager.setAudioUrl) {
                window.audioManager.setAudioUrl(presetAudioSelect.value);
            }
        }
        // Nếu user chưa chọn gì, set về nhạc mặc định (hukhong.mp3)
        else {
            if (window.audioManager && window.audioManager.defaultAudioUrl) {
                // Set về nhạc mặc định
                window.audioManager.setAudioUrl(window.audioManager.defaultAudioUrl);
            }
        }
    }

    /**
     * Áp dụng thay đổi image
     */
    applyImageChanges() {
        const flowerImageInput = document.getElementById('flowerImageInput');

        if (flowerImageInput && flowerImageInput.files.length > 0) {
            const files = Array.from(flowerImageInput.files);
            if (files.length > 0 && this.flowerRing && this.flowerRing.preloadTextures) {
                // Kiểm tra xem có phải ảnh mới không
                const currentImageCount = this.flowerRing.flowerTextures ? this.flowerRing.flowerTextures.length : 0;
                const newImageCount = files.length;

                // Tạo hash đơn giản để so sánh files
                const filesHash = files.map(f => `${f.name}-${f.size}-${f.lastModified}`).join('|');
                const currentHash = this.flowerRing.lastFilesHash || '';

                // Chỉ load nếu số lượng ảnh thay đổi, chưa có ảnh nào, hoặc files thực sự khác
                if (currentImageCount === 0 || currentImageCount !== newImageCount || filesHash !== currentHash) {
                    // Tạo URLs từ files
                    const imageUrls = files.map(file => URL.createObjectURL(file));

                    // Preload và áp dụng textures
                    this.flowerRing.preloadTextures(imageUrls).then(() => {
                        this.flowerRing.randomizeFlowerTexturesWithCache();
                        // Lưu hash của files hiện tại để so sánh lần sau
                        this.flowerRing.lastFilesHash = filesHash;
                    }).catch(error => {
                        console.error('Lỗi khi áp dụng ảnh:', error);
                    });
                } else {                    // Chỉ random lại texture với ảnh đã có
                    this.flowerRing.randomizeFlowerTexturesWithCache();
                }
            }
        }
    }

    /**
     * Áp dụng checkbox features (trái tim, mưa sao băng, tinh vân)
     */
    applyCheckboxFeatures() {
        // Áp dụng trái tim to ở giữa
        const enableCentralHeart = document.getElementById('enableCentralHeart');
        if (enableCentralHeart && window.centralSphere && window.centralSphere.applyCentralHeartState) {
            window.centralSphere.applyCentralHeartState(enableCentralHeart.checked);
        }

        // Áp dụng mưa sao băng
        const enableMeteor = document.getElementById('enableMeteorFeature');
        if (enableMeteor) {
            if (enableMeteor.checked && !window.isMeteorShowerActive) {
                // Bật mưa sao băng nếu đang tắt
                if (window.toggleMeteorShower) {
                    window.toggleMeteorShower();
                }

                // Áp dụng các giá trị từ slider
                setTimeout(() => {
                    const speedRange = document.getElementById('meteorSpeedRange');
                    const densityRange = document.getElementById('meteorDensityRange');

                    if (speedRange && typeof window.setMeteorSpeed === 'function') {
                        window.setMeteorSpeed(Number(speedRange.value));
                    }

                    if (densityRange && typeof window.setMeteorDensity === 'function') {
                        window.setMeteorDensity(Number(densityRange.value));
                    }
                }, 100);
            } else if (!enableMeteor.checked && window.isMeteorShowerActive) {
                // Tắt mưa sao băng nếu đang bật
                if (window.toggleMeteorShower) {
                    window.toggleMeteorShower();
                }
            }
        }

        // Áp dụng tinh vân
        const enableNebula = document.getElementById('enableNebula');
        if (enableNebula && window.centralSphere) {
            if (enableNebula.checked) {
                // Bật tinh vân
                window.centralSphere.createNebulas();
            } else {
                // Tắt tinh vân
                window.centralSphere.clearNebulas();
            }
        }
    }

}

// ════════════════════════════════════════════════════════════════════════════
// CUSTOM SLUG HELPERS — ported từ ValentineDeargift/config-editor.html
// ════════════════════════════════════════════════════════════════════════════
//
// State global window._slugFormState:
//   { available: boolean, value: string }
//
// - available=true + value!='' → pricing cộng 10k, submit gửi customSlug:true
// - User sửa giữa chừng → reset available=false (tránh tính phí oan)
//
// SLUG_ORIGIN: domain hiển thị link cho user. LovePlanet ở p.deargift.online,
// nhưng BE slug.service hiện hard-code w.deargift.online (chip task riêng để
// fix multi-domain). Tạm thời FE tự build URL với p.deargift.online.
const SLUG_TEMPLATE_TYPE = 'loveplannet';
const SLUG_ORIGIN = 'https://p.deargift.online';
window._slugFormState = { available: false, value: '' };

/**
 * Init input slug + debounce check availability.
 * @param {Function} onStateChange - callback gọi mỗi khi state thay đổi (để
 *                                   update pricing breakdown). Optional.
 */
function initSlugFormInput(onStateChange) {
    const input       = document.getElementById('slugInputForm');
    const feedback    = document.getElementById('slugFeedbackForm');
    const suggestions = document.getElementById('slugSuggestionsForm');
    if (!input || !feedback) return;

    let debounceTimer = null;
    let inFlightSeq   = 0;
    const notify = () => { if (typeof onStateChange === 'function') onStateChange(); };

    function setFeedback(state, msg) {
        feedback.textContent = msg || '';
        if (state === 'ok')           feedback.style.color = '#2dba74';
        else if (state === 'err')     feedback.style.color = '#ff6b6b';
        else if (state === 'checking') feedback.style.color = 'rgba(255,255,255,0.7)';
        else                          feedback.style.color = '';
    }
    function setInputClass(cls) {
        if (cls === 'valid')        input.style.borderColor = '#2dba74';
        else if (cls === 'invalid') input.style.borderColor = '#ff6b6b';
        else                        input.style.borderColor = 'rgba(255,255,255,0.2)';
    }
    function clearSuggestions() {
        if (!suggestions) return;
        suggestions.style.display = 'none';
        suggestions.innerHTML = '';
    }
    function renderSuggestions(list) {
        if (!suggestions || !Array.isArray(list) || list.length === 0) {
            clearSuggestions();
            return;
        }
        const label = '<div style="width:100%; color:rgba(255,255,255,0.7); font-size:0.78em; margin-bottom:4px;">Gợi ý còn trống — click để chọn:</div>';
        const chips = list.map(s =>
            `<button type="button" data-slug="${s}" style="padding:3px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); font-size:0.78em; cursor:pointer; font-family:monospace;">${s}</button>`
        ).join('');
        suggestions.innerHTML = label + chips;
        suggestions.style.display = 'flex';
        suggestions.querySelectorAll('button[data-slug]').forEach(btn => {
            btn.addEventListener('click', () => {
                const s = btn.getAttribute('data-slug');
                if (!s) return;
                input.value = s;
                setFeedback('ok', `✓ ${SLUG_ORIGIN}/${s} sẵn sàng`);
                setInputClass('valid');
                clearSuggestions();
                window._slugFormState = { available: true, value: s };
                notify();
            });
        });
    }
    function reset() {
        setFeedback('', '');
        setInputClass('');
        clearSuggestions();
        window._slugFormState = { available: false, value: '' };
        notify();
    }

    input.addEventListener('input', () => {
        const raw = input.value.trim().toLowerCase();
        if (input.value !== raw) input.value = raw;
        if (!raw) { reset(); return; }

        setFeedback('checking', 'Đang kiểm tra...');
        setInputClass('');
        clearSuggestions();
        // Sửa giữa chừng → available=false để pricing về 0, không tính 10k oan.
        window._slugFormState = { available: false, value: raw };
        notify();

        clearTimeout(debounceTimer);
        const seq = ++inFlightSeq;
        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/slugs/check/${SLUG_TEMPLATE_TYPE}/${encodeURIComponent(raw)}`);
                if (seq !== inFlightSeq) return; // race: user gõ tiếp
                if (res.status === 429) {
                    setFeedback('err', '⏳ Bạn kiểm tra hơi nhanh, chờ 1 phút.');
                    setInputClass('');
                    clearSuggestions();
                    window._slugFormState = { available: false, value: raw };
                    notify();
                    return;
                }
                const json = await res.json().catch(() => null);
                if (json && json.success && json.data) {
                    if (json.data.available) {
                        const slugPrice = getSlugPriceDisplay(getSelectedCurrency());
                        setFeedback('ok', `✓ ${SLUG_ORIGIN}/${raw} sẵn sàng (${slugPrice})`);
                        setInputClass('valid');
                        clearSuggestions();
                        window._slugFormState = { available: true, value: raw };
                        notify();
                    } else {
                        const reasonMap = {
                            taken:          'Tên này đã có người khác đặt.',
                            reserved:       'Tên này không được phép dùng.',
                            invalid_format: json.data.message || 'Tên không đúng định dạng.',
                        };
                        setFeedback('err', '✗ ' + (reasonMap[json.data.reason] || json.data.message || 'Không khả dụng.'));
                        setInputClass('invalid');
                        window._slugFormState = { available: false, value: raw };
                        notify();
                        if (json.data.reason === 'taken' && Array.isArray(json.data.suggestions)) {
                            renderSuggestions(json.data.suggestions);
                        } else {
                            clearSuggestions();
                        }
                    }
                } else {
                    setFeedback('err', 'Không kiểm tra được. Thử lại sau.');
                    window._slugFormState = { available: false, value: raw };
                    notify();
                }
            } catch (e) {
                if (seq !== inFlightSeq) return;
                setFeedback('err', 'Lỗi mạng. Thử lại.');
                window._slugFormState = { available: false, value: raw };
                notify();
            }
        }, 300);
    });
}

/**
 * Claim slug sau khi createWebsiteV2 trả về websiteId. Best-effort:
 * fail KHÔNG throw — user vẫn có website + link mặc định.
 * @returns {Promise<{ok:boolean, customSlug?:string, errorMessage?:string, skipped?:boolean}>}
 */
async function tryClaimSlugAfterCreate(websiteId) {
    const stateSlug = window._slugFormState;
    if (!stateSlug || !stateSlug.available || !stateSlug.value) {
        return { ok: false, skipped: true };
    }
    try {
        const jwt = (() => { try { return localStorage.getItem('dg_jwt'); } catch (e) { return null; } })();
        const headers = { 'Content-Type': 'application/json' };
        if (jwt) headers['Authorization'] = 'Bearer ' + jwt;
        const res = await fetch(`${API_BASE}/websites/${encodeURIComponent(websiteId)}/slug`, {
            method:  'POST',
            headers,
            body:    JSON.stringify({ slug: stateSlug.value }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json && json.success && json.data && json.data.customSlug) {
            return { ok: true, customSlug: json.data.customSlug };
        }
        return { ok: false, errorMessage: (json && json.error && json.error.message) || 'Không đặt được link đẹp.' };
    } catch (e) {
        return { ok: false, errorMessage: 'Lỗi mạng khi đặt link đẹp.' };
    }
}
