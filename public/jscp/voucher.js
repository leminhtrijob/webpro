(function () {
/**
 * 20-11/jscp/voucher.js — V2 voucher fetch (Bearer JWT).
 *
 * Khác V1:
 *   - GET /api/v2/vouchers/my (Bearer dg_jwt) thay vì /vouchers/saved/:uid.
 *   - Wrapper response `{ success, data: [...] }` hoặc `{ vouchers: [...] }` —
 *     normalize tại FE.
 */

const voucherList     = document.getElementById('voucherList');
const voucherResult   = document.getElementById('voucherResult');
const totalPriceDivEl = document.getElementById('totalPrice');
let selectedVoucher = null;
let vouchers = [];

const API_BASE = window.API_BASE || 'https://apiv2.deargift.online/api/v2';

function updateTotalPrice() {
  // Nếu có pricing calculator (main.js), delegate hoàn toàn.
  if (window.pricingCalculator) {
    window.pricingCalculator.updatePricing();
    return;
  }

  const totalPriceDiv = document.getElementById('totalPrice');
  if (!totalPriceDiv) return;

  let finalPrice = window.ORIGINAL_PRICE || 0;
  if (selectedVoucher) {
    finalPrice = finalPrice - Math.round(finalPrice * selectedVoucher.discountValue / 100);
    totalPriceDiv.innerHTML = `Tổng tiền thanh toán: <span style="color:#6c63ff;">${finalPrice.toLocaleString()} VNĐ</span> <span style="font-size:14px;color:#6c63ff;">(đã áp dụng voucher)</span>`;
  } else {
    totalPriceDiv.innerHTML = `Tổng tiền thanh toán: <span style="color:#6c63ff;">${finalPrice.toLocaleString()} VNĐ</span>`;
  }
}

async function loadUserVouchers() {
  if (!voucherList) return;
  voucherList.innerHTML = 'Đang tải voucher...';
  if (voucherResult) voucherResult.style.display = 'none';
  selectedVoucher = null;
  vouchers = [];
  updateTotalPrice();

  const jwt = localStorage.getItem('dg_jwt');
  if (!jwt) {
    voucherList.innerHTML = '<span style="color:#e53935;">Bạn cần đăng nhập để xem voucher!</span>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/vouchers/saved`, {
      headers: { 'Authorization': 'Bearer ' + jwt },
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      voucherList.innerHTML = `<span style="color:#e53935;">${data.error?.message || data.message || 'Lỗi tải voucher'}</span>`;
      return;
    }
    // Normalize: V2 wrapper trả data.data hoặc data.vouchers tuỳ controller.
    const list = (data.data?.items || []).filter(v => v.usable);
    if (!list.length) {
      voucherList.innerHTML = '<span style="color:#888;">Bạn không có voucher nào cả!</span>';
      return;
    }

    vouchers = list;
    voucherList.innerHTML = vouchers.map((v, idx) => `
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
          <strong>${v.code}</strong> - Giảm: ${v.discountValue}%<br>
          <span style="color: #ccc;">HSD: ${new Date(v.expiredAt).toLocaleDateString()}</span>
        </label>
      </div>
    `).join('');

    selectedVoucher = null;
    updateTotalPrice();
  } catch (err) {
    console.error('Error loading vouchers:', err);
    voucherList.innerHTML = '<span style="color:#e53935;">Không thể tải voucher!</span>';
  }
}

if (voucherList) {
  voucherList.addEventListener('change', (e) => {
    if (e.target.name === 'voucher') {
      const checkboxes = voucherList.querySelectorAll('input[name="voucher"]');
      const idx = Array.from(checkboxes).findIndex(cb => cb === e.target);

      if (e.target.checked) {
        checkboxes.forEach((cb, i) => cb.checked = i === idx);
        selectedVoucher = vouchers[idx];
        if (voucherResult) {
          voucherResult.innerHTML = `✅ Đã áp dụng voucher: ${selectedVoucher.code} (-${selectedVoucher.discountValue}%)`;
          voucherResult.style.display = 'block';
        }
      } else {
        selectedVoucher = null;
        if (voucherResult) voucherResult.style.display = 'none';
      }
      updateTotalPrice();
    }
  });
}

document.addEventListener('DOMContentLoaded', loadUserVouchers);

window.voucherManager = {
  loadUserVouchers,
  selectedVoucher: () => selectedVoucher,
  vouchers:        () => vouchers,
};

})();
