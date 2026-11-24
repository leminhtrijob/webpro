/**
 * V2 polling shim — thay thế SocketManager / socket.io cũ.
 *
 * Trước (V1):
 *   - `io('https://apiv2.deargift.online')` + room-based 'payment_status_update'.
 * Sau (V2):
 *   - GET /api/v2/payments/status/:orderCode polling với backoff
 *     (đã implement trong jscp/payment.js → window.paymentManager).
 *
 * Giữ API surface `socketManager.{init, joinOrder, leaveOrder, on, off, cleanup,
 * isSocketConnected}` để code legacy (showPaymentModal, DOMContentLoaded init,
 * showPayPalPayment) không cần biết đã đổi backend. Các handler được lưu trong
 * Map → khi polling phát hiện PAID/CANCELLED/FAILED, sẽ dispatch event giả lập.
 */
const SOCKET_CONFIG = {
  PAYMENT_TIMEOUT: 300000, // 5 phút — giữ để fallback timeout cũ trong showPaymentModal.
};

class SocketManager {
  constructor() {
    this.currentOrder = null;
    this.eventHandlers = new Map(); // event → handler[]
    this.isConnected = false;
  }

  init() {
    // No-op: V2 không có WebSocket. Trả về object dummy để legacy code không null-deref.
    this.isConnected = true;
    return { dummy: true };
  }

  joinOrder(orderCode) {
    if (!orderCode) return false;
    if (this.currentOrder && this.currentOrder !== orderCode) {
      this.leaveOrder(this.currentOrder);
    }
    this.currentOrder = orderCode;

    // Start polling — khi BE trả PAID/CANCELLED/FAILED, dispatch event
    // 'payment_status_update' cho handlers đã đăng ký (parity socket.io API).
    if (window.paymentManager) {
      window.paymentManager.startPaymentPolling(orderCode, {
        onPaid: (data) => {
          this._emit('payment_status_update', { status: 'PAID', orderCode, ...data });
        },
        onFailed: (status) => {
          this._emit('payment_status_update', { status, orderCode });
        },
        onTimeout: () => {
          this._emit('payment_status_update', { status: 'TIMEOUT', orderCode });
        },
        onError: (err) => {
          console.warn('[socketManager] poll error (retry):', err?.message || err);
        },
      });
    }
    return true;
  }

  leaveOrder(orderCode) {
    if (window.paymentManager) {
      window.paymentManager.stopPaymentPolling(orderCode);
    }
    if (this.currentOrder === orderCode) {
      this.currentOrder = null;
    }
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;
    const handlers = this.eventHandlers.get(event);
    const idx = handlers.indexOf(handler);
    if (idx > -1) handlers.splice(idx, 1);
  }

  _emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;
    handlers.slice().forEach((h) => {
      try { h(data); } catch (e) { console.error('[socketManager] handler error:', e); }
    });
  }

  cleanup() {
    if (this.currentOrder) this.leaveOrder(this.currentOrder);
    this.eventHandlers.clear();
    this.currentOrder = null;
    this.isConnected = false;
  }

  isSocketConnected() {
    // Polling không cần "kết nối" — luôn coi như sẵn sàng.
    return true;
  }
}

const socketManager = new SocketManager();

function initWebSocket() {
  socketManager.init();
  window.socket = null; // legacy compat — không còn socket thật.
  return null;
}

function cleanupPaymentState(orderCode, showError = false) {
  if (window.paymentManager) {
    window.paymentManager.cleanupPaymentState(orderCode, false);
  } else {
    localStorage.removeItem('payment_in_progress');
    localStorage.removeItem('current_order_code');
  }
  if (socketManager.currentOrder === orderCode) {
    socketManager.leaveOrder(orderCode);
  }
}

if (typeof window !== 'undefined') {
  window.socketManager = socketManager;
  window.initWebSocket = initWebSocket;
  window.cleanupPaymentState = cleanupPaymentState;
}

// ─── Pricing constants (mirror BE teachersday) ─────────────────────────────
const POLAR_MIN_USD = 3;
const DEFAULT_MUSIC   = './music/nhacnenfree.mp3';

// Fallback VND khi /pricing/teachersday chưa load. Khớp pricing.js code default.
// BE KHÔNG có baseWebsite / musicDropdown — chỉ customMusic (upload URL),
// photos (all-or-nothing), expiration forever.
const FALLBACK_VND_FEATURES = {
    baseWebsite: 20000,
    customMusic: 20000,
    photos:      15000,
};
const FALLBACK_VND_EXPIRATION = { '15d': 0, forever: 30000 };

class PricingCalculator {
    constructor() {
        this.defaultSettings = {
            music: DEFAULT_MUSIC,
            isSave: false,
            photos: [],
        };
        this.selectedVoucher = null;
        this.vouchers = [];

        this.serverPricing = null;
        this.serverPricingLoaded = false;
        this.currentCurrency = 'VND';

        this.createPricingUI();
        this.initializeVoucherSystem();
        this.loadPricingFromApi();
        this.updatePricing();
    }

    // ── Server pricing helpers ───────────────────────────────────────────────
    _featurePrice(beKey, currency) {
        const isUsd = currency === 'USD';
        if (this.serverPricing) {
            const f = this.serverPricing.features?.[beKey];
            if (f) return isUsd ? (f.priceUsd ?? 0) : (f.price ?? 0);
            return 0;
        }
        if (isUsd) return null;
        return FALLBACK_VND_FEATURES[beKey] ?? 0;
    }

    _expirationPrice(tierKey, currency) {
        const isUsd = currency === 'USD';
        if (this.serverPricing) {
            const e = this.serverPricing.expiration?.[tierKey];
            if (e) return isUsd ? (e.priceUsd ?? 0) : (e.price ?? 0);
            return 0;
        }
        if (isUsd) return null;
        return FALLBACK_VND_EXPIRATION[tierKey] ?? 0;
    }

    _isUsdReady() { return !!this.serverPricing?.features; }

    _getSelectedCurrency() {
        return this.getSelectedPaymentMethod() === 'POLAR' ? 'USD' : 'VND';
    }

    _formatPrice(amount, currency) {
        if (!amount) return (typeof t === 'function' ? t('free') : 'Miễn phí');
        if (currency === 'USD') {
            const n = Number(amount) || 0;
            return '$' + n.toFixed(2).replace(/\.00$/, '');
        }
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    }

    async loadPricingFromApi() {
        try {
            const base = window.API_BASE
                || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                      ? 'https://apiv2.deargift.online/api/v2'
                      : 'https://apiv2.deargift.online/api/v2');
            const res = await fetch(base + '/pricing/teachersday', {
                headers: { 'ngrok-skip-browser-warning': 'true' },
            });
            const json = await res.json().catch(() => null);
            if (res.ok && json?.success && json?.data) {
                this.serverPricing = json.data;
                window.__tdServerPricing = json.data;
                try {
                    window.dispatchEvent(new CustomEvent('td:pricing-loaded', {
                        detail: { pricing: json.data },
                    }));
                } catch (_) { /* ignore */ }
            }
        } catch (err) {
            console.warn('[pricingCalculator] fetch /pricing/teachersday fail:', err?.message);
        } finally {
            this.serverPricingLoaded = true;
            this.updatePricing();
        }
    }

    // Catalog URLs are system music; only customer uploads count as custom music.
    _isCustomMusic(music) {
        if (!music || typeof music !== 'string') return false;
        if (window.TeacherMusic?.isLibraryMusic(music)) return false;
        if (music.startsWith('data:')) return true; // chưa upload, sẽ charge khi submit
        return /^https?:\/\//i.test(music);
    }

    createPricingUI() {
        // Tạo container cho pricing
        const pricingContainer = document.createElement('div');
        pricingContainer.id = 'pricingContainer';
        pricingContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: linear-gradient(135deg,rgb(8, 26, 28),rgb(26, 73, 74));
            color: white;
            padding: 15px 20px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(61, 193, 213, 0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
        `;

        pricingContainer.innerHTML = `
    <div class = "pricing-header" style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 18px; margin-right: 8px;">💰</span>
        <strong style="font-size: 16px;">${t('pricingTitle')}</strong>
    </div>
    <div id="pricingDetails"></div>
    <!-- Voucher Section -->
    <div id="voucherSection" style="
        border-top: 1px solid rgba(255,255,255,0.3);
        margin-top: 10px;
        padding-top: 10px;
        display: none;
    ">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 14px; margin-right: 8px;">🎫</span>
            <strong style="font-size: 14px;">${t('voucher')}</strong>
        </div>
        <div id="voucherList" style="
            max-height: 120px;
            overflow-y: auto;
            margin-bottom: 8px;
            font-size: 12px;
        "></div>
        <div id="voucherResult" style="
            padding: 6px 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            font-size: 12px;
            color: #4caf50;
            display: none;
        "></div>
    </div>
    <div style="margin: 10px 0;" class="pricing-tip">
        <span id="tipAmountVndWrap">
            <label for="tipAmount" style="font-size: 14px; color: #fff;">${t('tip')} (₫)</label>
            <input id="tipAmount" type="number" min="0" step="1000" value="0" style="
                width: 90px;
                margin-left: 10px;
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #ccc;
                font-size: 14px;
            ">
        </span>
        <span id="tipAmountUsdWrap" style="display:none;">
            <label for="tipAmountUsd" style="font-size: 14px; color: #fff;">${t('tip')} ($)</label>
            <input id="tipAmountUsd" type="number" min="0" step="0.5" value="0" style="
                width: 90px;
                margin-left: 10px;
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #ccc;
                font-size: 14px;
            ">
        </span>
    </div>
    <!-- Payment Method Section -->
    <div id="paymentMethodSection" style="
        border-top: 1px solid rgba(255,255,255,0.3);
        margin-top: 10px;
        padding-top: 10px;
        display: none;
    ">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 14px; margin-right: 8px;">💳</span>
            <strong style="font-size: 14px;">${t('paymentMethod')}</strong>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- PayOS Option -->
            <div class="payment-method-container" data-method="PAYOS" style="
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 8px;
                padding: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: rgba(255,255,255,0.05);
            ">
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 13px; margin: 0;">
                    <input type="radio" name="paymentMethod" value="PAYOS" checked style="
                        margin-right: 10px;
                        transform: scale(1.2);
                    ">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; margin-bottom: 2px;">
                            <span style="margin-right: 8px; font-size: 16px;">🏦</span>
                            <strong style="font-size: 13px;">${t('bankPayment')}</strong>
                        </div>
                        <div style="
                            font-size: 11px;
                            color: rgba(255,255,255,0.7);
                            font-style: italic;
                        ">${t('bankPaymentDesc')}</div>
                    </div>
                </label>
            </div>
            
            <!-- Polar Option (thay PayPal — USD via Polar checkout) -->
            <div class="payment-method-container" data-method="POLAR" style="
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 8px;
                padding: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: rgba(255,255,255,0.05);
            ">
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 13px; margin: 0;">
                    <input type="radio" name="paymentMethod" value="POLAR" style="
                        margin-right: 10px;
                        transform: scale(1.2);
                    ">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; margin-bottom: 2px;">
                            <span style="margin-right: 8px; font-size: 16px;">💳</span>
                            <strong style="font-size: 13px;">POLAR (Thẻ quốc tế)</strong>
                        </div>
                        <div style="
                            font-size: 11px;
                            color: rgba(255,255,255,0.7);
                            font-style: italic;
                        ">Visa / MasterCard — thanh toán bằng USD</div>
                    </div>
                </label>
            </div>
        </div>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.3); margin-top: 10px; padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <strong style="font-size: 16px;">${t('total')}</strong>
            <strong id="totalPrice" style="font-size: 18px; color: #ffeb3b;">0đ</strong>
        </div>
        <button id="actionButton" style="
            width: 100%;
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        ">${t('createWebsite')}</button>
    </div>
    <button id="togglePricing" style="
        position: absolute;
        top: 5px;
        right: 5px;
        background: none;
        border: none;
        color: red;
        font-size: 18px;
        cursor: pointer;
        padding: 5px;
        border-radius: 3px;
        opacity: 0.7;
    ">−</button>
`;

        document.body.appendChild(pricingContainer);

        // Toggle functionality
        const toggleBtn = document.getElementById('togglePricing');
        const pricingDetails = document.getElementById('pricingDetails');
        const voucherSection = document.getElementById('voucherSection');
        const paymentMethodSection = document.getElementById('paymentMethodSection');
        let isCollapsed = false;

        const tipInputVnd = document.getElementById('tipAmount');
        const tipInputUsd = document.getElementById('tipAmountUsd');
        const onTipChange = () => {
            if (!window.settings) window.settings = {};
            if (tipInputVnd) window.settings.tip    = parseInt(tipInputVnd.value, 10) || 0;
            if (tipInputUsd) window.settings.tipUsd = Number(tipInputUsd.value) || 0;
            this.updatePricing();
        };
        if (tipInputVnd) tipInputVnd.addEventListener('input', onTipChange);
        if (tipInputUsd) tipInputUsd.addEventListener('input', onTipChange);

        toggleBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            if (isCollapsed) {
                pricingDetails.style.display = 'none';
                voucherSection.style.display = 'none';
                paymentMethodSection.style.display = 'none';
                pricingContainer.style.padding = '10px 20px';
                toggleBtn.textContent = '+';
            } else {
                pricingDetails.style.display = 'block';
                // Chỉ hiển thị voucher section nếu người dùng đã đăng nhập
                if (localStorage.getItem('user_uid')) {
                    voucherSection.style.display = 'block';
                }
                // Hiển thị payment method section nếu có giá tiền
                if (this.currentTotal > 0) {
                    paymentMethodSection.style.display = 'block';
                }
                pricingContainer.style.padding = '15px 20px';
                toggleBtn.textContent = '−';
            }
        });

        // Action button functionality
        const actionButton = document.getElementById('actionButton');
        actionButton.addEventListener('click', () => {
            this.handleActionButton();
        });

        // Payment method selection functionality
        setTimeout(() => {
            this.setupPaymentMethodSelection();
        }, 100);

        // Responsive design
        const mediaQuery = window.matchMedia("(max-height: 500px) and (orientation: landscape)");
        const adjustForLandscape = (e) => {
            if (e.matches) {
                pricingContainer.style.cssText += `
                    bottom: 10px;
                    left: 10px;
                    padding: 8px 12px;
                    font-size: 12px;
                    max-width: 200px;
                `;
            } else {
                pricingContainer.style.cssText = pricingContainer.style.cssText.replace(
                    /bottom: 10px;|left: 10px;|padding: 8px 12px;|font-size: 12px;|max-width: 200px;/g,
                    ''
                );
            }
        };

        mediaQuery.addListener(adjustForLandscape);
        adjustForLandscape(mediaQuery);
    }

    // ✅ Initialize voucher system
    initializeVoucherSystem() {

        // Kiểm tra đăng nhập khi khởi tạo
        const savedUID = localStorage.getItem('user_uid');
        if (savedUID) {
            const voucherSection = document.getElementById('voucherSection');
            if (voucherSection) {
                voucherSection.style.display = 'block';
            }
            this.loadUserVouchers();
        } else {
        }

        // Listen for voucher changes
        const voucherList = document.getElementById('voucherList');
        if (voucherList) {
            voucherList.addEventListener('change', (e) => {
                if (e.target.name === 'voucher') {
                    this.handleVoucherChange(e);
                }
            });
        }
    }

    // Setup payment method selection with hover effects
    setupPaymentMethodSelection() {
        const paymentMethodContainers = document.querySelectorAll('.payment-method-container');
        const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
        let updateTimeout = null;

        // Function to update visual state of all containers
        const updateVisualState = () => {
            paymentMethodContainers.forEach((container, index) => {
                const radio = paymentMethodRadios[index];
                if (radio.checked) {
                    container.style.border = '2px solid #4caf50';
                    container.style.background = 'rgba(76, 175, 80, 0.1)';
                    container.style.transform = 'translateY(0)';
                } else {
                    container.style.border = '2px solid rgba(255,255,255,0.3)';
                    container.style.background = 'rgba(255,255,255,0.05)';
                    container.style.transform = 'translateY(0)';
                }
            });
        };

        // Function to update pricing with debouncing
        const updatePricingWithDebounce = () => {
            // Clear existing timeout
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            
            // Set new timeout to update pricing after 100ms delay
            updateTimeout = setTimeout(() => {
                this.updatePricing();
            }, 100);
        };

        // Add click event listeners to containers
        paymentMethodContainers.forEach((container, index) => {
            const radio = paymentMethodRadios[index];
            
            // Click handler for container
            container.addEventListener('click', (e) => {
                // Prevent double-triggering if clicking on radio or label
                if (e.target.type === 'radio' || e.target.tagName === 'LABEL') {
                    return;
                }
                
                // Set the radio as checked
                radio.checked = true;
                
                // Update visual state and pricing
                updateVisualState();
                updatePricingWithDebounce();
            });

            // Hover effects
            container.addEventListener('mouseenter', () => {
                if (!radio.checked) {
                    container.style.border = '2px solid rgba(255,255,255,0.5)';
                    container.style.background = 'rgba(255,255,255,0.1)';
                    container.style.transform = 'translateY(-1px)';
                }
            });

            container.addEventListener('mouseleave', () => {
                if (!radio.checked) {
                    container.style.border = '2px solid rgba(255,255,255,0.3)';
                    container.style.background = 'rgba(255,255,255,0.05)';
                    container.style.transform = 'translateY(0)';
                }
            });

            // Radio change event
            radio.addEventListener('change', () => {
                updateVisualState();
                updatePricingWithDebounce();
            });
        });

        // Set initial state
        updateVisualState();
    }

    // Load user vouchers
    async loadUserVouchers() {

        const voucherList = document.getElementById('voucherList');
        const voucherResult = document.getElementById('voucherResult');

        if (!voucherList) {
            console.error('🎫 [VOUCHER LOAD] voucherList element not found');
            return;
        }

        voucherList.innerHTML = 'Đang tải voucher...';
        if (voucherResult) voucherResult.style.display = 'none';
        this.selectedVoucher = null;
        this.vouchers = [];

        const jwt = window.getJwt?.();
        if (!jwt) {
            voucherList.innerHTML = `<span style="color:#e53935;">${t('needLoginVoucher')}</span>`;
            return;
        }

        try {
            const res = await fetch(`${window.API_BASE}/vouchers/saved?limit=50`, {
                headers: { Authorization: 'Bearer ' + jwt },
            });
            const data = await res.json();
            if (window.getJwt?.() !== jwt) return;

            if (!res.ok || !data.success) {
                console.error('🎫 [VOUCHER LOAD] API returned error:', data.message);
                voucherList.innerHTML = `<span style="color:#e53935;">${data.message}</span>`;
                return;
            }

            const savedVouchers = (data.data?.items || []).filter(v => v.usable);
            if (!savedVouchers.length) {
                voucherList.innerHTML = `<span style="color:#888;">${t('noVoucher')}</span>`;
                return;
            }

            this.vouchers = savedVouchers;

            voucherList.innerHTML = this.vouchers.map((v, idx) => `
    <div class="voucher-item" data-idx="${idx}" style="
        padding: 6px 8px;
        margin: 4px 0;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
    " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
        <input class="checkbox" type="checkbox" name="voucher" id="voucher_${idx}" style="margin-right: 8px;">
        <label for="voucher_${idx}" style="cursor: pointer; font-size: 11px;">
            <strong>${v.code}</strong> - ${v.discountType === 'percent' ? v.discountValue + '%' : this._formatPrice(v.discountValue, this._getSelectedCurrency())}<br>
            <span style="color: #ccc;">HSD: ${v.expiredAt ? new Date(v.expiredAt).toLocaleDateString() : 'Không giới hạn'}</span>
        </label>
    </div>
`).join('');

            this.updatePricing();
        } catch (err) {
            console.error('🎫 [VOUCHER LOAD] Error loading vouchers:', err);
            voucherList.innerHTML = '<span style="color:#e53935;">Không thể tải voucher!</span>';
        }
    }

    // Handle voucher selection
    handleVoucherChange(e) {

        const voucherList = document.getElementById('voucherList');
        const voucherResult = document.getElementById('voucherResult');

        if (!voucherList || !this.vouchers) return;

        const checkboxes = voucherList.querySelectorAll('input[name="voucher"]');
        const idx = Array.from(checkboxes).findIndex(cb => cb === e.target);

        if (e.target.checked) {
            // Bỏ chọn tất cả, chỉ chọn cái vừa click
            checkboxes.forEach((cb, i) => cb.checked = i === idx);
            this.selectedVoucher = this.vouchers[idx];


            // Hiển thị thông tin voucher đã chọn
            if (voucherResult) {
                voucherResult.textContent = `Đã chọn voucher ${this.selectedVoucher.code}`;
                voucherResult.style.display = 'block';
            }
        } else {
            // Nếu click vào cái đang chọn thì hủy chọn hết
            this.selectedVoucher = null;
            if (voucherResult) {
                voucherResult.style.display = 'none';
            }
        }

        this.updatePricing();
    }



    // Clear vouchers
    clearVouchers() {
        this.selectedVoucher = null;
        this.vouchers = [];

        const voucherSection = document.getElementById('voucherSection');
        const voucherResult = document.getElementById('voucherResult');
        const voucherList = document.getElementById('voucherList');

        if (voucherSection) voucherSection.style.display = 'none';
        if (voucherResult) voucherResult.style.display = 'none';
        if (voucherList) voucherList.innerHTML = '';

        this.updatePricing();
    }

    calculatePrice(currentSettings, opts = {}) {
        const currency = opts.currency || this._getSelectedCurrency();
        const isUsd    = currency === 'USD';
        const items    = [];
        let total = 0;

        const push = (name, beKey, icon) => {
            const price = this._featurePrice(beKey, currency);
            if (!price) return;
            items.push({ name, price, icon });
            total += price;
        };

        push('Matrix DLove', 'baseWebsite', '💌');

        // 1. Nhạc upload (http URL hoặc data: pending). Preset dropdown = free.
        if (this._isCustomMusic(currentSettings.music)) {
            push(
                (typeof t === 'function' ? t('Chọn file âm thanh') : 'Nhạc nền tùy chọn'),
                'customMusic',
                '🎵',
            );
        }

        const photoCount = Array.isArray(currentSettings.photos) ? currentSettings.photos.length : 0;
        if (photoCount > 0) {
            const cfg = this.serverPricing?.features?.photos;
            let price = this._featurePrice('photos', currency);
            const threshold = cfg?.freeCount ?? 10;
            const extra = cfg ? (isUsd ? (cfg.perExtraUsd ?? 0) : (cfg.perExtra ?? 0)) : (isUsd ? 0 : 5000);
            if (photoCount > threshold) price += cfg?.flatPerExtra === false ? (photoCount - threshold) * extra : extra;
            if (price) { items.push({ name: `Ảnh bay (${photoCount} ảnh)`, price, icon: '🖼️' }); total += price; }
        }

        // 3. Lưu vĩnh viễn → expiration tier 'forever'
        if (currentSettings.isSave) {
            const expPrice = this._expirationPrice('forever', currency);
            if (expPrice) {
                items.push({
                    name:  (typeof t === 'function' ? t('Lưu QR vĩnh viễn') : 'Lưu QR vĩnh viễn'),
                    price: expPrice,
                    icon:  '🔒',
                });
                total += expPrice;
            }
        }

        // Backend cộng tip vào tổng trước khi tính voucher.
        const rawTip = isUsd
            ? Number(currentSettings.tipUsd) || 0
            : parseInt(currentSettings.tip, 10) || 0;
        const tipMax = isUsd
            ? (this.serverPricing?.tipMaxUsd ?? 500)
            : (this.serverPricing?.tipMaxVnd ?? 10000000);
        const tip = Math.min(tipMax, isUsd
            ? Math.round(Math.max(0, rawTip) * 100) / 100
            : Math.max(0, Math.floor(rawTip)));
        if (tip > 0) {
            items.push({ name: (typeof t === 'function' ? t('Tip cho tác giả') : 'Tip cho tác giả'), price: tip, icon: '💸' });
            total += tip;
        }

        let discount = 0;
        let finalPrice = total;
        const voucher = this.selectedVoucher;
        if (voucher && total > 0) {
            const minOrder = Number(voucher.minOrderValue) || 0;
            if (minOrder > total) {
                items.push({ name: `Voucher ${voucher.code}: đơn tối thiểu ${this._formatPrice(minOrder, currency)}`, price: 0, icon: '🎫' });
            } else {
                const value = Number(voucher.discountValue) || 0;
                discount = voucher.discountType === 'percent'
                    ? Math.floor(total * value / 100)
                    : value;
                if (voucher.discountType === 'percent' && voucher.maxDiscount != null) {
                    discount = Math.min(discount, Number(voucher.maxDiscount));
                }
                discount = Math.max(0, Math.min(discount, total));
                if (isUsd) discount = Math.round(discount * 100) / 100;
                finalPrice = Math.max(0, total - discount);
                items.push({
                    name: `Voucher ${voucher.code}`,
                    price: -discount,
                    icon: '🎫',
                });
            }
        }

        if (isUsd) {
            total      = Math.round(Math.max(0, total) * 100) / 100;
            finalPrice = Math.round(Math.max(0, finalPrice) * 100) / 100;
        } else {
            total      = Math.max(0, Math.floor(total));
            finalPrice = Math.max(0, Math.floor(finalPrice));
        }

        return { items, total, discount, finalPrice, currency };
    }

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(price);
    }

    formatPriceUSD(price) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(price);
    }

    updatePricing(currentSettings = null) {
        if (this._isSubmitting) return;
        const settingsToUse = currentSettings || window.settings || this.defaultSettings;
        const currency      = this._getSelectedCurrency();
        const isUsd         = currency === 'USD';

        const pricingDetails = document.getElementById('pricingDetails');
        const totalPrice = document.getElementById('totalPrice');
        const actionButton = document.getElementById('actionButton');
        const paymentMethodSection = document.getElementById('paymentMethodSection');

        if (!pricingDetails || !totalPrice || !actionButton) return;

        const tipInputVnd = document.getElementById('tipAmount');
        const tipInputUsd = document.getElementById('tipAmountUsd');
        const enriched = {
            ...settingsToUse,
            tip:    tipInputVnd ? (parseInt(tipInputVnd.value, 10) || 0) : (parseInt(settingsToUse.tip, 10) || 0),
            tipUsd: tipInputUsd ? (Number(tipInputUsd.value) || 0)        : (Number(settingsToUse.tipUsd)    || 0),
        };
        if (!window.settings) window.settings = {};
        window.settings.tip    = enriched.tip;
        window.settings.tipUsd = enriched.tipUsd;

        this.updateTipInputVisibility(currency);

        const pricing = this.calculatePrice(enriched, { currency });

        if (pricing.items.length === 0) {
            pricingDetails.innerHTML = `
        <div style="text-align: center; opacity: 0.8; font-style: italic;">
            ${t('defaultConfig')}
        </div>
    `;
        } else {
            pricingDetails.innerHTML = pricing.items.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 5px 0;">
            <span style="display: flex; align-items: center;">
                <span style="margin-right: 5px;">${item.icon}</span>
                <span>${t(item.name) || item.name}</span>
            </span>
            <span style="font-weight: bold; color: ${item.price < 0 ? '#4caf50' : '#ffeb3b'};">
                ${item.price < 0 ? '-' : '+'}${this._formatPrice(Math.abs(item.price), currency)}
            </span>
        </div>
    `).join('');
        }

        const finalPrice = pricing.finalPrice !== undefined ? pricing.finalPrice : pricing.total;
        totalPrice.textContent = this._formatPrice(finalPrice, currency);

        const polarTooLow  = isUsd && finalPrice > 0 && finalPrice < POLAR_MIN_USD;
        const polarBlocked = isUsd && (!this._isUsdReady() || polarTooLow);
        this._renderPolarHint(polarTooLow, isUsd && !this._isUsdReady());

        if (finalPrice > 0) {
            totalPrice.style.color = '#ff9800';
            actionButton.textContent = t('payAndCreate');
            actionButton.style.cssText += `
        background: linear-gradient(135deg, #ff9800, #ffc107);
        color: white;
    `;
            if (paymentMethodSection) {
                paymentMethodSection.style.display = 'block';
                if (!this.paymentMethodSetup) {
                    setTimeout(() => {
                        this.setupPaymentMethodSelection();
                        this.paymentMethodSetup = true;
                    }, 50);
                }
            }
        } else {
            totalPrice.style.color = '#4caf50';
            actionButton.textContent = t('createWebsite');
            actionButton.style.cssText += `
        background: linear-gradient(135deg, #4caf50, #66bb6a);
        color: white;
    `;
            if (paymentMethodSection) {
                paymentMethodSection.style.display = 'none';
                this.paymentMethodSetup = false;
            }
        }

        actionButton.disabled = !!polarBlocked;
        actionButton.style.opacity = polarBlocked ? '0.6' : '1';
        actionButton.style.cursor  = polarBlocked ? 'not-allowed' : 'pointer';
        actionButton.title = polarTooLow
            ? `Polar tối thiểu $${POLAR_MIN_USD}`
            : (isUsd && !this._isUsdReady() ? 'Đang tải bảng giá USD…' : '');

        this.currentTotal     = finalPrice;
        this.currentCurrency  = currency;
        this.originalTotal    = pricing.total;
    }

    updateTipInputVisibility(currency) {
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

    _renderPolarHint(tooLow, loading) {
        let hint = document.getElementById('polarMinHint');
        const host = document.getElementById('paymentMethodSection');
        if (!host) return;
        const shouldShow = tooLow || loading;
        if (!shouldShow) {
            if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
            return;
        }
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'polarMinHint';
            hint.style.cssText = 'margin-top:8px; padding:6px 10px; border-radius:6px; font-size:12px;';
            host.appendChild(hint);
        }
        if (loading) {
            hint.style.background = 'rgba(255,255,255,0.12)';
            hint.style.color      = '#fff';
            hint.textContent = '⏳ Đang tải bảng giá USD…';
        } else {
            hint.style.background = '#fff7e6';
            hint.style.color      = '#b45309';
            hint.textContent = `⚠️ Tổng dưới mức tối thiểu $${POLAR_MIN_USD} USD của Polar. Chọn thêm tính năng hoặc đổi sang PayOS.`;
        }
    }

    // Lấy phương thức thanh toán được chọn
    getSelectedPaymentMethod() {
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
        return selectedMethod ? selectedMethod.value : 'PAYOS'; // Mặc định là PAYOS
    }

    // Xử lý khi click nút action - Luôn tạo PAID
    async handleActionButton() {
        if (this._isSubmitting) return;
        this._isSubmitting = true;
        const actionButton = document.getElementById('actionButton');
        const originalText = actionButton.textContent;
        actionButton.disabled = true;
        actionButton.setAttribute('aria-busy', 'true');
        try {
            const userConfirmed = await this.ensureLetterContentConfirmed();
            if (!userConfirmed) return;

            if (!localStorage.getItem('user_uid')) {
                this.showNotification(t('needLogin'), 'error');
                return;
            }
            const selectedPaymentMethod = this.getSelectedPaymentMethod();
            if (selectedPaymentMethod === 'POLAR') {
                if (!this._isUsdReady()) {
                    this.showNotification('Đang tải bảng giá USD, vui lòng đợi vài giây.', 'error');
                    return;
                }
                if (this.currentTotal > 0 && this.currentTotal < POLAR_MIN_USD) {
                    this.showNotification(`Polar yêu cầu tối thiểu $${POLAR_MIN_USD} USD.`, 'error');
                    return;
                }
            } else if (this.currentTotal > 0 && this.currentTotal < 10000) {
                this.showNotification('Số tiền thanh toán tối thiểu là 10.000 VNĐ!', 'error');
                return;
            }
            this.setCreationProgress('Đang chuẩn bị thiệp…');
            await this.handlePaidCreation();
        } catch (error) {
            console.error('Error in handleActionButton:', error);
            this.showNotification('Có lỗi xảy ra: ' + error.message, 'error');
        } finally {
            this._isSubmitting = false;
            this.setCreationProgress(null);
            actionButton.removeAttribute('aria-busy');
            actionButton.disabled = false;
            actionButton.textContent = originalText;
            actionButton.style.opacity = '1';
            this.updatePricing();
        }
    }

    setCreationProgress(message) {
        let overlay = document.getElementById('tdCreationProgress');
        if (!overlay && message) {
            overlay = document.createElement('div');
            overlay.id = 'tdCreationProgress';
            overlay.innerHTML = '<div class="td-progress-card" role="status" aria-live="polite" aria-atomic="true"><span class="td-progress-spinner" aria-hidden="true"></span><h2></h2><p>Vui lòng giữ trang này mở trong giây lát.</p></div>';
            document.body.appendChild(overlay);
        }
        if (overlay) {
            overlay.hidden = !message;
            if (message) overlay.querySelector('h2').textContent = message;
        }
        const checkout = document.getElementById('tdCheckout');
        if (checkout) checkout.inert = !!message;
        if (message) {
            const button = document.getElementById('actionButton');
            if (button) button.textContent = message;
        }
    }

    needsLetterContentConfirmation(settings) {
        return !['letterTitle', 'letterContent', 'letterSignature'].some(field =>
            typeof settings?.[field] === 'string' && settings[field].trim()
        );
    }

    ensureLetterContentConfirmed() {
        const currentSettings = this.getCurrentSettingsFromModal() || window.settings || this.defaultSettings;
        if (!this.needsLetterContentConfirmation(currentSettings)) {
            return Promise.resolve(true);
        }
        return this.showContentWarningModal();
    }

    showContentWarningModal() {
        return new Promise((resolve) => {
            const modal = document.getElementById('contentWarningModal');
            const cancelBtn = document.getElementById('contentWarningCancel');
            const continueBtn = document.getElementById('contentWarningContinue');

            if (!modal || !cancelBtn || !continueBtn) {
                resolve(true);
                return;
            }

            const cleanup = () => {
                modal.style.display = 'none';
                cancelBtn.removeEventListener('click', handleCancel);
                continueBtn.removeEventListener('click', handleContinue);
                modal.removeEventListener('click', handleOverlay);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const handleContinue = () => {
                cleanup();
                resolve(true);
            };

            const handleOverlay = (event) => {
                if (event.target === modal) {
                    cleanup();
                    resolve(false);
                }
            };

            cancelBtn.addEventListener('click', handleCancel);
            continueBtn.addEventListener('click', handleContinue);
            modal.addEventListener('click', handleOverlay);
            modal.style.display = 'flex';
        });
    }




    // ✅ V2 atomic — 1 call duy nhất tạo website + product + voucher + payment URL.
    //
    // Khác V1:
    //   - BỎ generateOrderCode (BE tự sinh trong atomic).
    //   - BỎ createProduct / applyVoucher gọi riêng (BE atomic xử lý hết).
    //   - createBirthdayWebsite trả luôn { paymentUrl, orderCode, finalAmount, currency }.
    async handlePaidCreation() {
        try {
            // Lấy settings
            let settingsToUse = this.getCurrentSettingsFromModal() || window.settings || this.defaultSettings;
            if (window.lastIsSaveState !== undefined) {
                settingsToUse.isSave = window.lastIsSaveState;
            }

            // Upload audio/photos (R2 presign) và build settings hoàn chỉnh.
            const completeSettings = await this.prepareCompleteSettings(settingsToUse, message => this.setCreationProgress(message));
            this.setCreationProgress('Đang tạo thiệp và đơn hàng…');

            const paymentMethod = this.getSelectedPaymentMethod();
            const currency      = paymentMethod === 'POLAR' ? 'USD' : 'VND';
            const tipInputVnd   = document.getElementById('tipAmount');
            const tipInputUsd   = document.getElementById('tipAmountUsd');
            const tip           = currency === 'USD'
                ? (tipInputUsd ? (Number(tipInputUsd.value) || 0) : 0)
                : (tipInputVnd ? (parseInt(tipInputVnd.value, 10) || 0) : 0);
            const customerEmail = localStorage.getItem('user_email')
                               || localStorage.getItem('customerEmail')
                               || '';
            const voucherCode   = this.selectedVoucher?.code || null;

            const websiteResult = await window.birthdayAPI.createBirthdayWebsite(
                completeSettings,
                'PAID',
                { paymentMethod, currency, voucherCode, tip, tipUsd: currency === 'USD' ? tip : 0, customerEmail },
            );

            if (!websiteResult.success) {
                throw new Error(websiteResult.error || 'Không thể tạo website');
            }

            const { websiteId, paymentUrl, orderCode, finalAmount, needsPayment } = websiteResult;

            if (!needsPayment) {
                this.setCreationProgress('Đang mở trang tạo QR…');
                await this.showSuccessResult(websiteId, finalAmount || 0, websiteResult.data?.linkproduct);
                this.finishCreation();
                return;
            }

            if (!paymentUrl || !orderCode) {
                throw new Error('BE không trả paymentUrl/orderCode — atomic flow lỗi');
            }

            await this.processPayment(orderCode, finalAmount, websiteId, paymentMethod, paymentUrl);

        } catch (error) {
            console.error('❌ [PAID CATCH] Error in paid creation:', error);
            this.showNotification('❌ Lỗi thanh toán: ' + error.message, 'error');
        }
    }

    // Tạo orderCode unique
    generateOrderCode() {
        const firstDigit = Math.floor(1 + Math.random() * 9);
        const orderCode = firstDigit.toString() + Date.now().toString().slice(-8) + Math.floor(100 + Math.random() * 900);
        return orderCode;
    }

    // Chuẩn bị settings hoàn chỉnh
    async prepareCompleteSettings(settingsToUse, onProgress = () => {}) {
        // Upload audio base64 lên R2 nếu có
        let musicUrl = settingsToUse.music || './music/nhacnenfree.mp3';
        if (musicUrl && musicUrl.startsWith('data:')) {
            onProgress('Đang tải nhạc lên…');
            try {
                musicUrl = await window.birthdayAPI.uploadAudioToR2(musicUrl, 'audio');
                // Cập nhật lại settings với URL mới
                if (window.settings) {
                    window.settings.music = musicUrl;
                }
            } catch (error) {
                console.error('❌ Error uploading audio:', error);
                // Nếu upload thất bại, giữ nguyên base64 hoặc dùng default
                throw new Error(`Không thể tải nhạc lên: ${error.message || 'Vui lòng thử lại.'}`);
            }
        }
        
        // Upload ảnh base64 lên R2 nếu có
        let photosArray = null; // null = chưa xử lý, [] = đã xử lý và rỗng
        if (settingsToUse.photos !== undefined && Array.isArray(settingsToUse.photos)) {
            if (settingsToUse.photos.length > 0) {
                const uploadCount = settingsToUse.photos.filter(photo => photo?.startsWith('data:image')).length;
                if (uploadCount) onProgress(`Đang tải ${uploadCount} ảnh lên…`);
                const uploadPromises = settingsToUse.photos.map(async (photo, index) => {
                    // Nếu là base64, upload lên R2
                    if (photo && photo.startsWith('data:image')) {
                        try {
                            const imageUrl = await window.birthdayAPI.uploadImageToR2(photo, 'deargiftpro');
                            return imageUrl;
                        } catch (error) {
                            console.error(`❌ Error uploading photo ${index + 1}:`, error);
                            // Nếu upload thất bại, giữ nguyên base64 hoặc bỏ qua
                            throw new Error(`Không thể tải ảnh ${index + 1} lên: ${error.message || 'Vui lòng thử lại.'}`);
                        }
                    } else {
                        // Nếu đã là URL, giữ nguyên
                        return photo;
                    }
                });
                photosArray = await Promise.all(uploadPromises);
            } else {
                // Mảng rỗng - không cần upload
                photosArray = [];
            }
        }
    
        const completeSettings = {
            music: musicUrl || './music/nhacnenfree.mp3',
            fontStyle: settingsToUse.fontStyle === 'mau2' ? 'mau2' : 'default',
            countdown: settingsToUse.countdown || 3,
            matrixText: settingsToUse.matrixText || 'HAPPY',
            matrixColor1: settingsToUse.matrixColor1 || '#ff69b4',
            matrixColor2: settingsToUse.matrixColor2 || '#ff1493',
            sequence: settingsToUse.sequence || 'HAPPY|TEACHER\'S|DAY|20/11',
            sequenceColor: settingsToUse.sequenceColor || '#ff69b4',
            isSave: settingsToUse.isSave !== undefined ? settingsToUse.isSave : false,
            letterTitle: settingsToUse.letterTitle ?? 'Thầy cô thân mến!',
            letterContent: settingsToUse.letterContent ?? 'Cảm ơn thầy cô vì đã luôn là ngọn hải đăng soi sáng, dẫn đường và truyền cảm hứng cho em luôn nỗ lực trong học tập cũng như cuộc sống hàng ngày.\n\nNhân dịp 20/11 chúng em cũng không biết nói gì hơn ngoài lời cảm ơn sâu sắc đến thầy cô',
            letterSignature: settingsToUse.letterSignature ?? 'cảm ơn thầy cô ❤️',
            envelopeText: settingsToUse.envelopeText || 'Happy\n Teacher\'s\n Day!',
            photos: (() => {
                // Nếu đã upload và có photosArray (có thể rỗng), dùng nó
                if (photosArray !== null) {
                    return photosArray;
                }
                // Nếu không có photos nhưng có photo1, photo2, photo3 (backward compatibility)
                if (settingsToUse.photo1 || settingsToUse.photo2 || settingsToUse.photo3) {
                    const fallbackPhotos = [
                        settingsToUse.photo1 || './image/z6742427403891_49b13d2c6cf180587fee8dc730dfbae1.jpg',
                        settingsToUse.photo2 || './image/z6742427412545_e15564300676cfbf93577dbb6e1af325.jpg',
                        settingsToUse.photo3 || './image/z6742427413500_c6b43c78164186055dd04aaf9c46442d.jpg'
                    ].filter(p => p);
                    return fallbackPhotos;
                }
                // Nếu không có gì, dùng ảnh mặc định
                const defaultPhotos = [
                    './image/z6742427403891_49b13d2c6cf180587fee8dc730dfbae1.jpg',
                    './image/z6742427412545_e15564300676cfbf93577dbb6e1af325.jpg',
                    './image/z6742427413500_c6b43c78164186055dd04aaf9c46442d.jpg'
                ];
                return defaultPhotos;
            })(),
        };
        
        return completeSettings;
    }


    // Tạo dữ liệu sản phẩm
    createProductData(websiteId, orderCode, status, price) {
        const userUid = localStorage.getItem('user_uid');
        const productLink = window.location.origin + window.location.pathname + '?websiteId=' + websiteId;

        return {
            uid: userUid,
            orderCode: orderCode.toString(),
            name: "Deargiftpro Website",
            type: "Deargiftpro",
            price: price,
            images: "/demo/photos/1.jpg",
            linkproduct: productLink,
            configId: websiteId,
            status: status,
            createdAt: new Date()
        };
    }

    // Tạo sản phẩm
    async createProduct(productData) {
        try {
            const res = await fetch('https://apiv2.deargift.online/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            const data = await res.json();
            if (data.success) {
                return data.data;
            } else {
                throw new Error(data.message || 'Lỗi khi tạo sản phẩm');
            }
        } catch (error) {
            throw new Error('Lỗi khi tạo sản phẩm: ' + error.message);
        }
    }

    // Áp dụng voucher
    async applyVoucher(orderCode) {
        try {
            const userUid = localStorage.getItem('user_uid');
            const voucherRes = await fetch('https://apiv2.deargift.online/api/vouchers/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: userUid,
                    code: this.selectedVoucher.code,
                    orderCode: orderCode.toString()
                })
            });

            const voucherData = await voucherRes.json();
            if (!voucherData.success) {
                throw new Error(voucherData.message || 'Áp dụng voucher thất bại!');
            }

            this.showNotification('✅ Áp dụng voucher thành công!', 'success');
            return voucherData;
        } catch (error) {
            console.error('❌ [VOUCHER] Error applying voucher:', error);
            throw error;
        }
    }

    // V2: paymentUrl đến từ atomic create response — KHÔNG gọi /api/payment/create.
    // POLAR  → redirect trang Polar checkout (USD).
    // PAYOS  → iframe modal + polling status.
    async processPayment(orderCode, amount, websiteId, paymentMethod = 'PAYOS', paymentUrl) {
        try {
            if (!paymentUrl) {
                throw new Error('Thiếu paymentUrl từ atomic create response');
            }

            this.setCreationProgress(null);
            const checkout = document.getElementById('tdCheckout');
            if (checkout) checkout.hidden = true;
            document.body.classList.remove('td-checkout-phase');
            document.body.classList.add('td-payment-flow');

            localStorage.setItem('current_order_code', String(orderCode));
            localStorage.setItem('payment_in_progress', 'true');

            if (paymentMethod === 'POLAR') {
                this.showNotification('🔄 Đang chuyển đến trang thanh toán POLAR...', 'info');
                // Start polling trong background trước khi redirect — nếu user back lại
                // sớm thì handler payment_status_update đã kích hoạt.
                if (window.socketManager) {
                    window.socketManager.joinOrder(orderCode);
                }
                window.location.href = paymentUrl;
                return;
            }

            // PAYOS — iframe + polling.
            this.showNotification('🔄 Đang mở trang thanh toán PAYOS...', 'info');
            await this.showPaymentModal(paymentUrl, websiteId, amount);
        } catch (error) {
            throw new Error('Lỗi xử lý thanh toán: ' + error.message);
        }
    }

    showPaymentModal(checkoutUrl, websiteId, amount) {
        let paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) {
            paymentModal = document.createElement('div');
            paymentModal.id = 'paymentModal';
            paymentModal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
        `;

            paymentModal.innerHTML = `
            <div style="position:relative; margin: 5% auto; width: 90%; max-width: 800px; background:white; padding:20px; border-radius:10px;">
                <button id="paymentModalClose" style="position:absolute;top:10px;right:10px;">✖</button>
                <iframe id="paymentIframe" style="width:100%; height:600px; border:none;"></iframe>
            </div>
        `;

            document.body.appendChild(paymentModal);
        }

        // Đảm bảo nút đóng và iframe luôn tồn tại
        const closeBtn = paymentModal.querySelector('#paymentModalClose');
        const iframe = paymentModal.querySelector('#paymentIframe');
        if (iframe) iframe.src = checkoutUrl;
        paymentModal.style.display = 'block';

        if (closeBtn) {
            closeBtn.onclick = () => {
                paymentModal.style.display = 'none';
            };
        }

        // V2: orderCode lấy từ localStorage (đã set trong processPayment).
        const orderCode = localStorage.getItem('current_order_code');
        if (!orderCode) {
            this.showNotification('❌ Không tìm thấy orderCode', 'error');
            return Promise.reject(new Error('Missing orderCode in localStorage'));
        }

        // Đảm bảo socketManager shim sẵn sàng (no-op nếu đã init).
        if (!window.socketManager) window.initWebSocket();

        return new Promise((resolve, reject) => {
            let paymentResolved = false;

            const handlePaymentSuccess = (data) => {
                if (paymentResolved) return;
                paymentResolved = true;
                window.cleanupPaymentState(orderCode, true);
                if (paymentModal) paymentModal.style.display = 'none';
                this.showSuccessResult(data?.websiteId || websiteId, amount, data?.linkproduct);
                this.finishCreation();
                resolve();
            };

            const handlePaymentFailure = (message) => {
                if (paymentResolved) return;
                paymentResolved = true;
                window.cleanupPaymentState(orderCode, true);
                if (paymentModal) paymentModal.style.display = 'none';
                this.showNotification('❌ ' + (message || 'Thanh toán thất bại. Vui lòng thử lại.'), 'error');
                reject(new Error(message || 'Thanh toán thất bại!'));
            };

            // Chỉ xác nhận thành công sau khi backend trả trạng thái PAID.
            // 2. Polling shim — joinOrder spawn paymentManager.startPaymentPolling
            //    và emit 'payment_status_update' khi BE trả PAID/CANCELLED/FAILED.
            if (!window.socketManager.joinOrder(orderCode)) {
                console.error('❌ joinOrder failed for', orderCode);
            }

            const paymentStatusHandler = (data) => {
                if (paymentResolved) {
                    window.socketManager.off('payment_status_update', paymentStatusHandler);
                    return;
                }
                if (String(data.orderCode) !== String(orderCode)) return;

                if (data.status === 'PAID') {
                    handlePaymentSuccess(data);
                    window.socketManager.off('payment_status_update', paymentStatusHandler);
                } else if (data.status === 'CANCELLED') {
                    handlePaymentFailure('Thanh toán đã bị hủy');
                    window.socketManager.off('payment_status_update', paymentStatusHandler);
                } else if (data.status === 'FAILED') {
                    handlePaymentFailure(data.message || 'Thanh toán thất bại');
                    window.socketManager.off('payment_status_update', paymentStatusHandler);
                } else if (data.status === 'TIMEOUT') {
                    handlePaymentFailure('Hết thời gian chờ — kiểm tra lại sau ở mục Đơn hàng');
                    window.socketManager.off('payment_status_update', paymentStatusHandler);
                }
            };
            window.socketManager.on('payment_status_update', paymentStatusHandler);

            // Safety fallback: 5 phút timeout (polling đã có timeout riêng nhưng
            // để an toàn nếu polling chưa start vì lý do nào đó).
            setTimeout(() => {
                if (!paymentResolved) {
                    handlePaymentFailure('Timeout - Không thể xác định trạng thái thanh toán!');
                }
            }, SOCKET_CONFIG.PAYMENT_TIMEOUT);
        });
    }

    // Legacy — không còn được gọi sau khi refactor processPayment (POLAR redirect
    // trực tiếp trong processPayment). Giữ stub để tránh ReferenceError nếu có
    // chỗ khác vẫn reference.
    showPayPalPayment(checkoutUrl, websiteId, amount) {
        const orderCode = localStorage.getItem('current_order_code') || this.generateOrderCode();
        localStorage.setItem('payment_in_progress', 'true');
        localStorage.setItem('current_order_code', orderCode);
        this.showNotification('🔄 Đang chuyển đến trang thanh toán POLAR...', 'info');
        window.location.href = checkoutUrl;
    }

    showSuccessResult(websiteId, price, linkproduct) {
        if (this._qrRedirectStarted) return;
        const id = websiteId || window.birthdayAPI.getCurrentWebsiteId();
        if (!linkproduct && (!id || id === 'unknown')) {
            this.showNotification('Chưa lấy được link thiệp. Bạn hãy mở lại trong mục Đơn hàng.', 'error');
            return;
        }
        const link = linkproduct || window.birthdayAPI.createShareableURL(id);
        this._qrRedirectStarted = true;
        this.showNotification('Thanh toán thành công! Đang chuyển sang trang tạo QR…', 'success');
        return window.paymentManager.goToGiftQr(link).catch(error => {
            this._qrRedirectStarted = false;
            this.showNotification(error.message || 'Không thể mở trang tạo QR.', 'error');
        });
    }

    // Hoàn thành quá trình tạo
    finishCreation() {
        // Đóng modal settings
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.style.display = 'none';
        }

        // Bắt đầu website
        if (typeof startWebsite === 'function') {
            startWebsite();
        }
    }


    getCurrentSettingsFromModal() {
        // Kiểm tra xem modal có đang mở không
        const settingsModal = document.getElementById('settingsModal');
        if (!settingsModal || settingsModal.style.display === 'none') {
            // Ngay cả khi modal đã đóng, vẫn lấy giá trị từ form nếu có thể
        }


        try {
            // Lấy settings từ modal form (ngay cả khi modal đã đóng)
            const isSaveElement = document.getElementById('isSave');
            const isSaveValue = isSaveElement?.checked || window.lastIsSaveState || false;
            
            const musicValue = getSelectedMusic();
            
            // Lấy photos từ hidden inputs
            const photoGallerySettings = document.getElementById('photoGallerySettings');
            const photosArray = [];
            if (photoGallerySettings) {
                const photoDataInputs = photoGallerySettings.querySelectorAll('.photo-data-input');
                photoDataInputs.forEach(input => {
                    if (input.value) {
                        photosArray.push(input.value);
                    }
                });
            }
            
            const modalSettings = {
                fontStyle: settings.fontStyle === 'mau2' ? 'mau2' : 'default',
                music: musicValue,
                countdown: parseInt(document.getElementById('countdownTime')?.value) || 3,
                matrixText: document.getElementById('matrixText')?.value || 'HAPPY',
                matrixColor1: document.getElementById('matrixColor1')?.value || '#ffb6c1',
                matrixColor2: document.getElementById('matrixColor2')?.value || '#ffc0cb',
                sequence: document.getElementById('sequenceText')?.value || 'HAPPY|TEACHER\'S|DAY|20/11',
                sequenceColor: document.getElementById('sequenceColor')?.value || '#d39b9b',
                isSave: isSaveValue,
                // ✅ Thêm các trường lá thư và envelope
                letterTitle: document.getElementById('letterTitle')?.value || '',
                letterContent: document.getElementById('letterContent')?.value || '',
                letterSignature: document.getElementById('letterSignature')?.value || '',
                envelopeText: document.getElementById('envelopeText')?.value || '',
                photos: photosArray // Luôn trả về mảng (có thể rỗng), không dùng undefined
            };

           

            return modalSettings;
        } catch (error) {
            console.error('❌ [DEBUG] Error in getCurrentSettingsFromModal:', error);
            return null;
        }
    }

    // Hiển thị section chia sẻ
    showShareSection(websiteId) {
        const shareSection = document.getElementById('shareSection');
        const shareURL = document.getElementById('shareURL');

        if (shareSection && shareURL) {
            const shareableURL = window.birthdayAPI.createShareableURL(websiteId);
            shareURL.value = shareableURL;
            shareSection.style.display = 'block';

            // Hiển thị animation
            shareSection.style.animation = 'slideIn 0.3s ease';
        }
    }

    // Sao chép URL chia sẻ
    copyShareURL() {
        const shareURL = document.getElementById('shareURL');
        const copyButton = document.getElementById('copyButton');

        if (shareURL) {
            shareURL.select();
            shareURL.setSelectionRange(0, 99999); // For mobile devices

            try {
                navigator.clipboard.writeText(shareURL.value).then(() => {
                    copyButton.textContent = '✅ Đã sao chép!';
                    this.showNotification('📋 Đã sao chép link vào clipboard!', 'success');
                    setTimeout(() => {
                        copyButton.textContent = '📋 Sao chép link';
                    }, 2000);
                }).catch(() => {
                    // Fallback for older browsers
                    document.execCommand('copy');
                    copyButton.textContent = '✅ Đã sao chép!';
                    this.showNotification('📋 Đã sao chép link vào clipboard!', 'success');
                    setTimeout(() => {
                        copyButton.textContent = '📋 Sao chép link';
                    }, 2000);
                });
            } catch (err) {
                console.error('Copy failed:', err);
                this.showNotification('❌ Không thể sao chép link!', 'error');
            }
        }
    }

    // Hiển thị thông báo
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 9999990004;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        `;

        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #4caf50, #66bb6a)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #f44336, #e57373)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #2196f3, #64b5f6)';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Tự động xóa sau 3 giây
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Phương thức để cập nhật giá từ bên ngoài
    updateFromSettings(newSettings) {
        this.updatePricing(newSettings);
    }

    // Hiển thị progress notification
    showProgressNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10005;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            background: linear-gradient(135deg, #2196f3, #64b5f6);
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        notification.innerHTML = `
            <div style="
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);
        return notification;
    }

    // Cập nhật progress notification
    updateProgressNotification(notification, message) {
        if (notification) {
            const span = notification.querySelector('span');
            if (span) {
                span.textContent = message;
            }
        }
    }

    // Xóa progress notification
    removeProgressNotification(notification) {
        if (notification && notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }
}

// Khởi tạo calculator sau khi DOM ready
let pricingCalculator;
// Khởi tạo nếu chưa có
// if (!window.pricingCalculator) window.initializePricingCalculator();
// window.birthdayAPI = window.birthdayAPI || {};
// window.birthdayAPI.createShareableURL = (id) => 'https://deargift.online/?websiteId=' + id;

// window.pricingCalculator.showSuccessResult('test123', 0);
// Hàm khởi tạo pricing calculator
function initializePricingCalculator() {
    if (!pricingCalculator) {
        pricingCalculator = new PricingCalculator();
        window.pricingCalculator = pricingCalculator;
    }
}

// Export cho việc sử dụng global
window.initializePricingCalculator = initializePricingCalculator;

// Ẩn settings hint sau 3 giây
document.addEventListener('DOMContentLoaded', function() {
    const settingsHint = document.getElementById('settingsHint');
    if (settingsHint) {
        setTimeout(() => {
            settingsHint.style.display = 'none';
        }, 3000);
    }
    
    // V2: khởi tạo polling shim + resume polling nếu có pending payment.
    if (window.initWebSocket) {
        window.initWebSocket();

        const currentOrderCode = localStorage.getItem('current_order_code');
        const isPaymentInProgress = localStorage.getItem('payment_in_progress') === 'true';

        if (currentOrderCode && isPaymentInProgress && window.socketManager) {
            // Resume polling cho order đang pending (user reload tab hoặc back từ Polar).
            window.socketManager.joinOrder(currentOrderCode);
            window.socketManager.on('payment_status_update', (data) => {
                if (data.status === 'PAID' && String(data.orderCode) === String(currentOrderCode)) {
                    window.cleanupPaymentState(currentOrderCode);
                    if (window.pricingCalculator) {
                        window.pricingCalculator.showSuccessResult(
                            data.websiteId,
                            data.amount || 0,
                            data.linkproduct,
                        );
                    }
                }
            });
        }
    }
});
