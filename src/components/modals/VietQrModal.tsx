'use client';

import React, { useEffect, useState } from 'react';
import { QrCode, Copy, Check, X, Send } from 'lucide-react';

interface VietQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderType: 'vip_link' | 'buy_source';
  templateName: string;
  orderId: string;
  giftId: string;
  giftUrl: string;
}

export default function VietQrModal({
  isOpen,
  onClose,
  orderType,
  templateName,
  orderId,
  giftId,
  giftUrl,
}: VietQrModalProps) {
  const [copiedStk, setCopiedStk] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ key: string; data: { bankName: string; accountNumber: string; accountHolder: string; zaloPhone: string; amount: number; memo: string; qrUrl: string } } | null>(null);
  const [errorResult, setErrorResult] = useState<{ key: string; message: string } | null>(null);
  const payment = paymentResult?.key === orderId ? paymentResult.data : null;
  const paymentError = errorResult?.key === orderId ? errorResult.message : '';

  useEffect(() => {
    if (!isOpen || !orderId) return;
    let active = true;
    fetch('/api/payment/vietqr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestKey: orderId, templateName, orderType, giftId })
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tạo đơn');
      if (active) { setPaymentResult({ key: orderId, data: result.data }); setErrorResult(null); }
    }).catch((error) => { if (active) setErrorResult({ key: orderId, message: error instanceof Error ? error.message : 'Không thể tạo đơn' }); });
    return () => { active = false; };
  }, [isOpen, orderId, orderType, templateName, giftId]);

  if (!isOpen) return null;

  const bankName = payment?.bankName || '';
  const accountNumber = payment?.accountNumber || '';
  const accountHolder = payment?.accountHolder || '';
  const memo = payment?.memo || '';
  const vietQrUrl = payment?.qrUrl || '';

  const handleCopyStk = () => {
    if (!payment) return;
    navigator.clipboard.writeText(accountNumber);
    setCopiedStk(true);
    setTimeout(() => setCopiedStk(false), 2000);
  };

  const handleCopyMemo = () => {
    if (!payment) return;
    navigator.clipboard.writeText(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#F0DDE3] relative animate-scaleUp text-[#2D1F24]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-[#9A8490] hover:text-[#2D1F24] hover:bg-[#FFF0F4]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-[#FFF0F4] text-[#FF4F86] mb-2">
            <QrCode className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#2D1F24]">
            {orderType === 'buy_source' ? 'Mua Full Source Code' : 'Mở Khóa Link VIP Vĩnh Viễn'}
          </h3>
          <p className="text-xs text-[#7D646D] mt-0.5">
            Quét mã VietQR bằng bất kỳ App Ngân Hàng / MoMo nào
          </p>
        </div>

        {paymentError && <p role="alert" className="text-xs text-red-600 text-center mb-3">{paymentError}</p>}
        {!payment && !paymentError && <p className="text-xs text-center mb-3">Đang tạo đơn chờ thanh toán...</p>}
        {payment && <>
        {/* Dynamic VietQR Image */}
        <div className="bg-[#FFF5F8] p-4 rounded-2xl border border-[#F0DDE3] flex flex-col items-center">
          <div className="bg-white p-2.5 rounded-xl shadow-sm border border-[#F0DDE3]">
            <img
              src={vietQrUrl}
              alt="Mã VietQR Thanh Toán"
              className="w-52 h-auto object-contain"
            />
          </div>
          <p className="mt-2 text-xs font-bold text-[#FF4F86]">
            Số tiền: {payment.amount.toLocaleString('vi-VN')} VNĐ
          </p>
        </div>

        {/* Account Details Box */}
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-[#FFF0F4]/60 rounded-xl">
            <span className="text-[#7D646D]">Ngân hàng:</span>
            <span className="font-bold text-[#2D1F24]">{bankName}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-[#FFF0F4]/60 rounded-xl">
            <span className="text-[#7D646D]">Số tài khoản:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#FF4F86] text-sm">{accountNumber}</span>
              <button
                onClick={handleCopyStk}
                className="p-1 text-[#FF4F86] hover:bg-[#FDE8EF] rounded-md transition-colors"
                title="Sao chép STK"
              >
                {copiedStk ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-[#FFF0F4]/60 rounded-xl">
            <span className="text-[#7D646D]">Chủ tài khoản:</span>
            <span className="font-bold text-[#2D1F24]">{accountHolder}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-[#FFF0F4]/60 rounded-xl">
            <span className="text-[#7D646D]">Nội dung CK:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#8B5CF6]">{memo}</span>
              <button
                onClick={handleCopyMemo}
                className="p-1 text-[#8B5CF6] hover:bg-[#FDE8EF] rounded-md transition-colors"
                title="Sao chép nội dung"
              >
                {copiedMemo ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-5 space-y-2">
          <p className="text-xs text-center text-[#7D646D]">
            Sau khi chuyển khoản, gửi mã <strong>{memo}</strong> qua Zalo để Trí Kun đối soát và bàn giao. Thanh toán chỉ hoàn tất khi giao dịch được xác nhận.
          </p>
          <a href={giftUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-xs font-bold text-[#FF4F86] underline">Mở link quà đã tạo</a>

          <a
            href={`https://zalo.me/${payment.zaloPhone}?text=${encodeURIComponent(
              `Chào Trí Kun, mình vừa chuyển khoản đơn ${memo} cho mẫu ${templateName}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl border border-[#F0DDE3] text-[#5C454D] hover:bg-[#FFF0F4] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-[#0068FF]" />
            <span>Gửi mã giao dịch cho Trí Kun qua Zalo</span>
          </a>
        </div>
        </>}
      </div>
    </div>
  );
}
