/**
 * 20-11/jscp/payment.js — V2 polling-based payment helper (non-module).
 *
 * Khác V1:
 *   - BỎ socket.io. V2 dùng GET /api/v2/payments/status/:orderCode polling.
 *   - BỎ POST /api/payment/create — atomic create-website V2 trả paymentUrl
 *     ngay trong response. processPayment chỉ mở iframe + start polling.
 *
 * Export window.paymentManager: { startPaymentPolling, stopPaymentPolling,
 *   isPolling, createPaymentModal, cleanupPaymentState, showToast }.
 *
 * Backoff: [2s, 4s, 8s, 15s, 30s, 60s, 60s] ≈ 3 phút tổng (parity loveplannet).
 */
(function () {
    const API_BASE = window.API_BASE || 'https://apiv2.deargift.online/api/v2';

    const PAYMENT_POLL_BACKOFF_MS = [2000, 4000, 8000, 15000, 30000, 60000, 60000];
    const _activePollers = new Map(); // orderCode → { stopped: bool }

    function getJwt() {
        return localStorage.getItem('dg_jwt') || '';
    }

    function stopPaymentPolling(orderCode) {
        const slot = _activePollers.get(String(orderCode));
        if (slot) slot.stopped = true;
        _activePollers.delete(String(orderCode));
    }

    function isPolling(orderCode) {
        return _activePollers.has(String(orderCode));
    }

    /**
     * @param {string|number} orderCode
     * @param {Object} opts
     * @param {(data)=>void} [opts.onPaid]
     * @param {(reason)=>void} [opts.onFailed]
     * @param {()=>void} [opts.onTimeout]
     * @param {(err)=>void} [opts.onError]
     */
    function startPaymentPolling(orderCode, opts = {}) {
        const key = String(orderCode);
        if (_activePollers.has(key)) return;

        const slot = { stopped: false };
        _activePollers.set(key, slot);

        let step = 0;
        const poll = async () => {
            if (slot.stopped) return;
            try {
                const jwt = getJwt();
                const res = await fetch(
                    `${API_BASE}/payments/status/${encodeURIComponent(orderCode)}`,
                    { headers: jwt ? { 'Authorization': 'Bearer ' + jwt } : {} },
                );
                if (res.status === 401) {
                    slot.stopped = true;
                    _activePollers.delete(key);
                    opts.onError && opts.onError(new Error('401 — phiên hết hạn'));
                    return;
                }
                if (res.status === 404) {
                    // Order chưa kịp ghi DB — retry với backoff tiếp.
                } else if (!res.ok) {
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

    async function goToGiftQr(link) {
        const gift = new URL(link);
        if (!['https:', 'http:'].includes(gift.protocol)) throw new Error('Link thiệp không hợp lệ');
        const target = new URL('https://dlove.vn/createqr');
        target.searchParams.set('link', gift.href);
        const jwt = window.getJwt?.() || getJwt();
        if (jwt) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3500);
            try {
                const res = await fetch(`${API_BASE}/auth/sso-ticket`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                    body: '{}', signal: controller.signal,
                });
                const json = await res.json();
                if (res.ok && json.success && json.data?.ticket) target.searchParams.set('ticket', json.data.ticket);
            } catch (_) { /* QR remains available when SSO is unavailable. */ }
            finally { clearTimeout(timeout); }
        }
        window.location.replace(target.href);
    }

    function createPaymentModal() {
        if (document.getElementById('paymentModal')) return;
        const html = `
        <div id="paymentModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;">
          <div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:10px;width:95vw;max-width:800px;height:85vh;max-height:600px;position:relative;">
              <button id="paymentModalCloseBtn"
                      style="position:absolute;top:10px;right:10px;background:#ff6b6b;color:#fff;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;z-index:10001;">×</button>
              <iframe id="paymentIframe" style="width:100%;height:100%;border:none;border-radius:10px;" frameborder="0"></iframe>
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('paymentModalCloseBtn').onclick = () => {
            const m = document.getElementById('paymentModal');
            if (m) m.style.display = 'none';
            const f = document.getElementById('paymentIframe');
            if (f) f.src = 'about:blank';
            const code = localStorage.getItem('current_order_code');
            if (code) stopPaymentPolling(code);
        };
    }

    function cleanupPaymentState(orderCode, closeIframe = false) {
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

    function showToast(message, type = 'info', durationMs = 3000) {
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
          max-width: 80vw; word-wrap: break-word;
        `;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, durationMs);
    }

    window.paymentManager = {
        goToGiftQr,
        startPaymentPolling,
        stopPaymentPolling,
        isPolling,
        createPaymentModal,
        cleanupPaymentState,
        showToast,
    };
})();
