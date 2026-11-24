// loveplannetvn/js/payment.js — V2 payment flow.
//
// THAY ĐỔI từ V1:
//   - BỎ socket.io / SocketManager. V2 đã có endpoint poll-status để FE chủ động.
//   - BỎ POST /api/payment/create — atomic create-website V2 đã trả paymentUrl
//     ngay trong response (xem createProduct.js → createWebsiteV2).
//   - Thêm startPaymentPolling(orderCode, opts) — backoff [2,4,8,15,30,60,60]s,
//     gọi GET /api/v2/payments/status/:orderCode với Bearer dg_jwt.
//   - processPayment giờ chỉ làm: mở iframe/popup + start polling. Không tạo order.
//
// Export tương thích sphere.js cũ:
//   initWebSocket  → no-op (giữ tên cho backward import).
//   processPayment → ký mới: ({paymentUrl, orderCode, paymentMethod, showToast, loading})
//   showToast      → giữ nguyên hàm tiện ích.
//   cleanupPaymentState, createPaymentModal → giữ.

import { API_BASE } from './config.js';

// ── No-op WebSocket init (backward-compat) ─────────────────────────────────
// sphere.js / index.html cũ gọi initWebSocket() khi load. V2 không cần socket.
// Giữ export để tránh ReferenceError nếu code khác còn import.
export function initWebSocket() {
    // intentionally no-op
    window.socket = null;
    return null;
}

export function cleanupWebSocket() {
    // intentionally no-op
}

// ── Polling source of truth ────────────────────────────────────────────────
//
// Backoff: 2s → 4s → 8s → 15s → 30s → 60s → 60s ≈ 3 phút tổng.
// Sau lần cuối, dừng polling và gọi onTimeout (nếu có).
//
// Nếu BE trả PAID/CANCELLED/FAILED giữa chừng → resolve sớm.
const PAYMENT_POLL_BACKOFF_MS = [2000, 4000, 8000, 15000, 30000, 60000, 60000];
const _activePollers = new Map(); // orderCode → { stopped: bool }

export function stopPaymentPolling(orderCode) {
    const slot = _activePollers.get(String(orderCode));
    if (slot) slot.stopped = true;
    _activePollers.delete(String(orderCode));
}

export function isPolling(orderCode) {
    return _activePollers.has(String(orderCode));
}

function getJwt() {
    return localStorage.getItem('dg_jwt') || '';
}

/**
 * Start polling 1 orderCode. Stop khi PAID/CANCELLED/FAILED hoặc hết backoff.
 *
 * @param {string|number} orderCode
 * @param {Object} opts
 * @param {(data)=>void} [opts.onPaid]
 * @param {(reason)=>void} [opts.onFailed]   // CANCELLED hoặc FAILED
 * @param {()=>void}      [opts.onTimeout]
 * @param {(err)=>void}   [opts.onError]     // network/5xx — auto-retry, nhưng để FE log
 */
export function startPaymentPolling(orderCode, opts = {}) {
    const key = String(orderCode);
    if (_activePollers.has(key)) return; // tránh poll trùng

    const slot = { stopped: false };
    _activePollers.set(key, slot);

    let step = 0;
    const poll = async () => {
        if (slot.stopped) return;
        try {
            const jwt = getJwt();
            const res = await fetch(`${API_BASE}/payments/status/${encodeURIComponent(orderCode)}`, {
                headers: jwt ? { 'Authorization': 'Bearer ' + jwt } : {},
            });
            if (res.status === 401) {
                slot.stopped = true;
                _activePollers.delete(key);
                opts.onError && opts.onError(new Error('401 — phiên hết hạn'));
                return;
            }
            if (res.status === 404) {
                // Order chưa tồn tại — có thể BE chưa kịp ghi DB sau create.
                // Retry với backoff tiếp.
            } else if (!res.ok) {
                // 5xx — log nhưng vẫn retry.
                opts.onError && opts.onError(new Error('Poll status ' + res.status));
            } else {
                const json = await res.json();
                const status = json.data?.status || json.status;
                if (status === 'PAID') {
                    slot.stopped = true;
                    _activePollers.delete(key);
                    opts.onPaid && opts.onPaid(json.data || json);
                    return;
                }
                if (status === 'CANCELLED' || status === 'FAILED') {
                    slot.stopped = true;
                    _activePollers.delete(key);
                    opts.onFailed && opts.onFailed(status);
                    return;
                }
                // PENDING → tiếp tục.
            }
        } catch (err) {
            opts.onError && opts.onError(err);
        }

        // Advance backoff
        if (step >= PAYMENT_POLL_BACKOFF_MS.length) {
            slot.stopped = true;
            _activePollers.delete(key);
            opts.onTimeout && opts.onTimeout();
            return;
        }
        const wait = PAYMENT_POLL_BACKOFF_MS[step++];
        setTimeout(poll, wait);
    };

    // Lần đầu — chạy ngay (không chờ 2s) để feel responsive.
    setTimeout(poll, 0);
}

// ── Process payment (V2) ────────────────────────────────────────────────────
//
// V2 atomic create đã trả paymentUrl + orderCode. Hàm này chỉ:
//   1) Mở iframe modal (PAYOS) hoặc redirect (POLAR — Visa/MC USD).
//   2) Start polling cho orderCode.
//   3) Trigger 'payment_success' / 'payment_failed' event window.
//
// Backward-compat: sphere.js cũ gọi processPayment(price, showToast, loading,
// orderCode, paymentMethod). Hỗ trợ cả 2 cách:
//   - Mới: processPayment({ paymentUrl, orderCode, paymentMethod, ... })
//   - Cũ:  processPayment(price, showToast, loading, orderCode, paymentMethod) —
//          nhưng KHÔNG có paymentUrl → throw (nhắc dev migrate).
//
// @returns Promise<boolean>
export async function processPayment(first, ...rest) {
    let opts;
    if (typeof first === 'object' && first !== null) {
        opts = first;
    } else {
        // Legacy signature — chưa migrate xong, fail-fast với hint.
        throw new Error('processPayment() V2 yêu cầu object { paymentUrl, orderCode, paymentMethod, showToast }. ' +
                        'Sphere.js cần được cập nhật để gọi createWebsiteV2() và truyền paymentUrl vào.');
    }

    const {
        paymentUrl,
        orderCode,
        paymentMethod = 'PAYOS',
        showToast: toastFn = showToast,
        loading = null,
    } = opts;

    if (!paymentUrl) {
        toastFn('Thiếu paymentUrl', 'error');
        return false;
    }
    if (!orderCode) {
        toastFn('Thiếu orderCode', 'error');
        return false;
    }

    if (paymentMethod === 'POLAR') {
        // Polar checkout redirect — Polar host trang thanh toán, BE webhook sẽ
        // update DB. User sẽ quay lại từ Polar redirect URL → payment-success.html.
        // FE vẫn polling phòng trường hợp user tự quay lại tab cũ trước khi
        // webhook landing.
        toastFn('Đang chuyển đến trang thanh toán Polar...', 'info');
        localStorage.setItem('payment_in_progress', 'true');
        localStorage.setItem('current_order_code', String(orderCode));
        // Start polling trong background trước khi redirect — nếu user back lại
        // sớm, listener `payment_success` đã kích hoạt.
        startPaymentPolling(orderCode);
        window.location.href = paymentUrl;
        return true;
    }

    // PAYOS: iframe + polling.
    toastFn('Đang mở trang thanh toán...', 'info');

    // Đóng dashboard trước khi hiển thị iframe.
    const dashboard = document.querySelector('.dashboard');
    if (dashboard) dashboard.style.display = 'none';

    createPaymentModal(); // ensure exists
    const paymentModal  = document.getElementById('paymentModal');
    const paymentIframe = document.getElementById('paymentIframe');
    if (!paymentModal || !paymentIframe) {
        toastFn('Lỗi hiển thị modal thanh toán', 'error');
        return false;
    }
    paymentIframe.src = paymentUrl;
    paymentModal.style.display = 'block';

    localStorage.setItem('payment_in_progress', 'true');
    localStorage.setItem('current_order_code', String(orderCode));

    return new Promise((resolve) => {
        startPaymentPolling(orderCode, {
            onPaid: (data) => {
                cleanupPaymentState(orderCode, true);
                toastFn('Thanh toán thành công! Đang chuyển hướng...', 'success');
                if (loading) loading.style.display = 'block';
                // Cho iframe đóng xong rồi trigger
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('payment_success', {
                        detail: { orderCode, data },
                    }));
                }, 800);
                resolve(true);
            },
            onFailed: (status) => {
                cleanupPaymentState(orderCode, true);
                toastFn(status === 'CANCELLED' ? 'Thanh toán đã bị hủy' : 'Thanh toán thất bại', 'error');
                window.dispatchEvent(new CustomEvent('payment_failed', {
                    detail: { orderCode, status },
                }));
                resolve(false);
            },
            onTimeout: () => {
                cleanupPaymentState(orderCode, false);
                toastFn('Hết thời gian chờ — kiểm tra lại sau ở mục Đơn hàng', 'warning');
                resolve(false);
            },
            onError: (err) => {
                // Đừng resolve — vẫn chờ retry. Chỉ log.
                console.warn('[payment] poll error (sẽ retry):', err?.message || err);
            },
        });
    });
}

// ── Modal helpers ───────────────────────────────────────────────────────────
export function createPaymentModal() {
    if (document.getElementById('paymentModal')) return;

    const modalHTML = `
    <div id="paymentModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;">
      <div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:10px;width:95vw;max-width:800px;height:85vh;max-height:600px;position:relative;">
          <button id="paymentModalCloseBtn"
                  style="position:absolute;top:10px;right:10px;background:#ff6b6b;color:#fff;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;z-index:10001;">×</button>
          <iframe id="paymentIframe" style="width:100%;height:100%;border:none;border-radius:10px;" frameborder="0"></iframe>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('paymentModalCloseBtn').onclick = () => {
        const m = document.getElementById('paymentModal');
        if (m) m.style.display = 'none';
        // Hard-kill iframe — tránh POLAR/PAYOS giữ session.
        const f = document.getElementById('paymentIframe');
        if (f) f.src = 'about:blank';
        const code = localStorage.getItem('current_order_code');
        if (code) stopPaymentPolling(code);
    };
}

export function cleanupPaymentState(orderCode, closeIframe = false) {
    localStorage.removeItem('payment_in_progress');
    if (orderCode) localStorage.removeItem('current_order_code');
    if (orderCode) stopPaymentPolling(orderCode);

    if (closeIframe) {
        const modal = document.getElementById('paymentModal');
        if (modal) modal.style.display = 'none';
        const f = document.getElementById('paymentIframe');
        if (f) f.src = 'about:blank';
    }
}

// ── Toast (unchanged) ───────────────────────────────────────────────────────
export function showToast(message, type = 'info', durationMs = 3000) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 9999999999;
          display: flex; flex-direction: column; gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
      color: #fff; padding: 12px 20px; border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-family: Arial, sans-serif; font-size: clamp(12px, 3.5vw, 14px);
      max-width: 80vw; word-wrap: break-word; animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
          @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, durationMs);
}
