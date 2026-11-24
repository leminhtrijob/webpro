'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Copy, Check, ExternalLink, Download, Share2, X, Heart, Sparkles } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftUrl: string;
  recipientName: string;
}

export default function ShareLinkModal({
  isOpen,
  onClose,
  giftUrl,
  recipientName
}: ShareLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && giftUrl) {
      // Trigger confetti celebration!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Generate high-resolution QR
      QRCode.toDataURL(giftUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#E8638A',
          light: '#FFFFFF'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch(console.error);
    }
  }, [isOpen, giftUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(giftUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Tinh_Yeu_${recipientName || 'TriKun'}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#F0DDE3] relative animate-scaleUp text-[#2D1F24]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-[#9A8490] hover:text-[#2D1F24] hover:bg-[#FFF0F4]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-[#FF4F86] to-[#FF80A6] text-white mb-2 shadow-md shadow-[#FF4F86]/20">
            <Heart className="w-6 h-6 fill-white" />
          </div>
          <h3 className="text-xl font-bold text-[#2D1F24]">Link Quà Tặng Đã Sẵn Sàng! 🎉</h3>
          <p className="text-xs text-[#7D646D] mt-1">
            Gửi tặng món quà bất ngờ này đến <span className="font-bold text-[#FF4F86]">{recipientName || 'người thương'}</span>
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-[#FFF5F8] p-4 rounded-2xl border border-[#F0DDE3] flex flex-col items-center">
          {qrDataUrl ? (
            <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-[#F0DDE3] relative group">
              <img src={qrDataUrl} alt="Mã QR Quà Tặng" className="w-44 h-44 object-contain" />
              {/* Cute heart watermark in center of display */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <Heart className="w-4 h-4 text-[#FF4F86] fill-[#FF4F86]" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-44 h-44 flex items-center justify-center text-xs text-[#9A8490]">
              Đang tạo mã QR...
            </div>
          )}

          <button
            onClick={handleDownloadQr}
            className="mt-3 text-xs font-semibold text-[#FF4F86] hover:underline flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải ảnh QR in thiệp / khắc quà</span>
          </button>
        </div>

        {/* Copy Link Input */}
        <div className="mt-4">
          <label className="text-xs font-bold text-[#5C454D] block mb-1">Đường dẫn máy chủ:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={giftUrl}
              className="flex-1 px-3 py-2.5 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl text-[#2D1F24] font-mono outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-3.5 py-2.5 rounded-xl bg-[#2D1F24] hover:bg-black text-white text-xs font-bold flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <a
            href={giftUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF4F86] to-[#E8638A] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#FF4F86]/20 hover:opacity-95 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Mở xem trang quà</span>
          </a>

          <a
            href={`https://zalo.me/share?url=${encodeURIComponent(giftUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-[#0068FF] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 hover:opacity-95 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Gửi qua Zalo</span>
          </a>
        </div>
      </div>
    </div>
  );
}
