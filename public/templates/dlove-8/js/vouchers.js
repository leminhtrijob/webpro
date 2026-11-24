// Quản lý voucher, tip và cập nhật giá cho thanh toán
import { SERVER_URL_PROD } from './config.js';

const POLAR_MIN_USD = 3;

let selectedVoucher = null;
let vouchers = [];
let finalPrice = 0;

function getSelectedCurrency() {
  const polarRadio = document.querySelector('input[name="paymentMethod"][value="POLAR"]');
  return (polarRadio && polarRadio.checked) ? 'USD' : 'VND';
}

function isUsdPricingReady() {
  return !!window.__lpUsdPricingReady;
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

function readTip(currency) {
  const tipInputVnd = document.getElementById('tipAmount');
  const tipInputUsd = document.getElementById('tipAmountUsd');
  if (currency === 'USD') {
    return Math.round(Math.max(0, Number(tipInputUsd?.value) || 0) * 100) / 100;
  }
  return Math.max(0, parseInt(tipInputVnd?.value, 10) || 0);
}

function renderPolarHint(tooLow, loading) {
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
    hint.style.color = '#fff';
    hint.textContent = '⏳ Đang tải bảng giá USD…';
  } else {
    hint.style.background = 'rgba(255, 193, 7, 0.15)';
    hint.style.color = '#ffc107';
    hint.textContent = `⚠️ Tổng dưới mức tối thiểu $${POLAR_MIN_USD} USD của Polar. Chọn thêm tính năng hoặc đổi sang PayOS.`;
  }
}

function updateFinishButtonState(polarBlocked) {
  const finishBtn = document.getElementById('finishCreateBtn');
  if (!finishBtn) return;
  if (polarBlocked) {
    finishBtn.disabled = true;
    finishBtn.style.opacity = '0.6';
    finishBtn.style.cursor = 'not-allowed';
    finishBtn.title = `Polar tối thiểu $${POLAR_MIN_USD} USD`;
  } else {
    finishBtn.disabled = false;
    finishBtn.style.opacity = '1';
    finishBtn.style.cursor = 'pointer';
    finishBtn.title = 'Tạo thiên hà theo các tính năng đã chọn';
  }
}

export function updateTotalPrice(getDynamicPrice) {
  const totalPriceDiv = document.getElementById('totalPrice');
  const currency = getSelectedCurrency();
  const isUsd = currency === 'USD';

  updateTipInputVisibility(currency);

  const tip = readTip(currency);
  let price = typeof getDynamicPrice === 'function' ? getDynamicPrice() : 0;

  let discountAmount = 0;
  if (selectedVoucher && price > 0) {
    discountAmount = isUsd
      ? Math.round((price * selectedVoucher.discountValue / 100) * 100) / 100
      : Math.round(price * selectedVoucher.discountValue / 100);
  }

  const priceAfterDiscount = Math.max(0, price - discountAmount);
  finalPrice = priceAfterDiscount + tip;

  if (isUsd) {
    finalPrice = Math.round(Math.max(0, finalPrice) * 100) / 100;
  } else {
    finalPrice = Math.max(0, Math.floor(finalPrice));
  }

  const polarTooLow = isUsd && finalPrice > 0 && finalPrice < POLAR_MIN_USD;
  const polarBlocked = isUsd && finalPrice > 0 && (!isUsdPricingReady() || polarTooLow);
  renderPolarHint(polarTooLow, isUsd && finalPrice > 0 && !isUsdPricingReady());
  updateFinishButtonState(polarBlocked);

  if (totalPriceDiv) {
    if (finalPrice === 0) {
      totalPriceDiv.innerHTML = `
        <div style="margin-bottom: 8px;">
          <span style="color:#e53935;">Miễn phí</span>
        </div>
      `;
    } else if (isUsd) {
      const parts = [];
      if (discountAmount > 0) {
        parts.push(`giảm ${selectedVoucher.discountValue}% = -${formatPriceAmount(discountAmount, 'USD')}`);
      }
      if (tip > 0) parts.push(`tip ${formatPriceAmount(tip, 'USD')}`);
      totalPriceDiv.innerHTML = `
        <div style="margin-bottom: 8px;">
          <span style="color:#4ecdc4;font-size:16px;font-weight:bold;">${formatPriceAmount(finalPrice, 'USD')} USD</span>
          ${parts.length ? ` <span style="font-size:14px;color:#888;">(${parts.join(', ')})</span>` : ''}
        </div>
      `;
    } else {
      const parts = [];
      if (selectedVoucher && discountAmount > 0) {
        parts.push(`giảm ${selectedVoucher.discountValue}% = -${formatPriceAmount(discountAmount, 'VND')}`);
      }
      if (tip > 0) parts.push(`tip ${formatPriceAmount(tip, 'VND')}`);
      totalPriceDiv.innerHTML = `
        <div style="margin-bottom: 8px;">
          <span style="color:#e53935;">${formatPriceAmount(finalPrice, 'VND')}</span>
          ${parts.length ? ` <span style="font-size:14px;color:#888;">(${parts.join(', ')})</span>` : ''}
        </div>
      `;
    }
  }

  const paymentMethodSection = document.getElementById('paymentMethodSection');
  if (paymentMethodSection) {
    paymentMethodSection.style.display = finalPrice > 0 ? 'block' : 'none';
  }
}

export async function loadUserVouchers(getDynamicPrice) {
  const voucherList = document.getElementById('voucherList');
  const voucherResult = document.getElementById('voucherResult');
  if (!voucherList) return;
  voucherList.innerHTML = 'Đang tải voucher...';
  if (voucherResult) voucherResult.style.display = 'none';
  selectedVoucher = null;
  vouchers = [];
  updateTotalPrice(getDynamicPrice);

  const jwt = localStorage.getItem('dg_jwt');

  if (!jwt) {
    voucherList.innerHTML = '<span style="color:#e53935;">Bạn cần đăng nhập để xem voucher!</span>';
    return;
  }
  try {
    const res = await fetch(`${SERVER_URL_PROD}/vouchers/my`, {
      headers: { 'Authorization': 'Bearer ' + jwt },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      voucherList.innerHTML = `<span style="color:#e53935;">${data.error?.message || data.message || 'Lỗi tải voucher'}</span>`;
      return;
    }
    const list = Array.isArray(data.data) ? data.data : (data.vouchers || []);
    if (!list.length) {
      voucherList.innerHTML = '<span style="color:#888;">Bạn không có voucher nào cả!</span>';
      return;
    }
    vouchers = list;
    voucherList.innerHTML = vouchers.map((v, idx) => `
      <div class="voucher-item" data-idx="${idx}">
        <input class="checkbox" type="checkbox" name="voucher" id="voucher_${idx}">
        <label for="voucher_${idx}">
          <b>${v.code}</b> - Giảm: ${v.discountValue}% | HSD: ${new Date(v.expiredAt).toLocaleDateString()}
        </label>
      </div>
    `).join('');
    selectedVoucher = null;
    updateTotalPrice(getDynamicPrice);
  } catch (err) {
    voucherList.innerHTML = '<span style="color:#e53935;">Không thể tải voucher!</span>';
  }
}

function bindTipInput(input, getDynamicPrice, currency) {
  if (!input) return;
  input.addEventListener('input', () => {
    if (currency === 'USD') {
      let tipValue = Number(input.value) || 0;
      if (tipValue < 0) { tipValue = 0; input.value = 0; }
      if (tipValue > 100) { tipValue = 100; input.value = 100; }
    } else {
      let tipValue = parseInt(input.value, 10) || 0;
      if (tipValue < 0) { tipValue = 0; input.value = 0; }
      if (tipValue > 1000000) { tipValue = 1000000; input.value = 1000000; }
    }
    updateTotalPrice(getDynamicPrice);
  });
}

export function setupVoucherListeners(getDynamicPrice) {
  const voucherList = document.getElementById('voucherList');
  if (voucherList) {
    voucherList.addEventListener('change', (e) => {
      if (e.target.name === 'voucher') {
        const checkboxes = voucherList.querySelectorAll('input[name="voucher"]');
        const idx = Array.from(checkboxes).findIndex(cb => cb === e.target);
        if (e.target.checked) {
          checkboxes.forEach((cb, i) => cb.checked = i === idx);
          selectedVoucher = vouchers[idx];
        } else {
          selectedVoucher = null;
        }
        updateTotalPrice(getDynamicPrice);
      }
    });
  }

  bindTipInput(document.getElementById('tipAmount'), getDynamicPrice, 'VND');
  bindTipInput(document.getElementById('tipAmountUsd'), getDynamicPrice, 'USD');
}

export function getSelectedVoucherCode() {
  return selectedVoucher ? selectedVoucher.code : null;
}

export function getSelectedVoucherInfo() {
  return selectedVoucher ? {
    code: selectedVoucher.code,
    discountValue: selectedVoucher.discountValue,
    expiredAt: selectedVoucher.expiredAt
  } : null;
}

export function getFinalPrice() {
  return finalPrice;
}
