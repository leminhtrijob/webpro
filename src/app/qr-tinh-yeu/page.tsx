'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Heart, QrCode as QrIcon, Download, Sparkles, Copy, Check, Printer } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';

export default function QrLovePage() {
  const [content, setContent] = useState('https://trikun.vn/v/myheart-7');
  const [colorDark, setColorDark] = useState('#E8638A');
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!content) return;
    QRCode.toDataURL(content, {
      width: 400,
      margin: 2,
      color: {
        dark: colorDark,
        light: '#FFFFFF'
      }
    })
      .then((url) => setQrUrl(url))
      .catch(console.error);
  }, [content, colorDark]);

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = 'QR_Trai_Tim_TriKun.png';
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#FFFBFC] text-[#2D1F24] flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex p-2.5 rounded-2xl bg-[#FFF0F4] text-[#FF4F86] mb-1">
            <QrIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#2D1F24]">
            Tạo Mã QR Trái Tim Nghệ Thuật
          </h1>
          <p className="text-xs sm:text-sm text-[#7D646D]">
            Biến lời tỏ tình hoặc đường link quà tặng thành mã QR lồng trái tim lãng mạn. Dễ dàng in ra thiệp giấy, quà tặng hoặc gửi cho người thương!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left Controls */}
          <div className="bg-white rounded-3xl border border-[#F0DDE3] p-6 shadow-sm space-y-5">
            <div>
              <label className="text-xs font-bold text-[#5C454D] block mb-1">
                Nội dung hoặc Link quà tặng:
              </label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Dán link quà tặng hoặc gõ lời nhắn bí mật..."
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86] leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#5C454D] block mb-2">
                Tông màu mã QR:
              </label>
              <div className="flex items-center gap-3">
                {[
                  { label: 'Hồng Tình Yêu', color: '#E8638A' },
                  { label: 'Đỏ Thắm', color: '#E11D48' },
                  { label: 'Tím Neon', color: '#8B5CF6' },
                  { label: 'Đen Cổ Điển', color: '#1E1E1E' }
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => setColorDark(item.color)}
                    style={{ backgroundColor: item.color }}
                    className={`w-9 h-9 rounded-full border-2 transition-transform ${
                      colorDark === item.color ? 'border-black scale-110 shadow-md' : 'border-white'
                    }`}
                    title={item.label}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleDownload}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF4F86] to-[#E8638A] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#FF4F86]/25 hover:opacity-95 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              >
                <Download className="w-4 h-4" />
                <span>Tải Ảnh QR Nét Cao (In Ấn)</span>
              </button>
            </div>
          </div>

          {/* Right Preview */}
          <div className="bg-white rounded-3xl border border-[#F0DDE3] p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <span className="text-xs font-bold text-[#9A8490] uppercase tracking-wider">
              Xem trước Mã QR
            </span>

            <div className="relative p-4 rounded-3xl bg-[#FFF9FA] border-2 border-dashed border-[#F0DDE3]">
              {qrUrl ? (
                <div className="relative">
                  <img src={qrUrl} alt="QR Tình Yêu" className="w-56 h-56 object-contain" />
                  {/* Center Heart Emblem */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center border border-[#F0DDE3]">
                      <Heart className="w-5 h-5 text-[#FF4F86] fill-[#FF4F86] animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-[#9A8490]">
                  Đang khởi tạo...
                </div>
              )}
            </div>

            <p className="text-xs text-[#7D646D] max-w-xs">
              Mở camera điện thoại hoặc Zalo quét thử mã này để kiểm tra ngay!
            </p>
          </div>
        </div>

        {/* PRINTING & GIFT GUIDE */}
        <div className="bg-[#FFF5F8] rounded-3xl border border-[#F0DDE3] p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[#FF4F86] uppercase tracking-wider flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              <span>1. In Ra Thiệp Giấy</span>
            </h4>
            <p className="text-xs text-[#5C454D] leading-relaxed">
              Tải ảnh QR về và dán vào thiệp handmade hoặc quà lưu niệm tặng người yêu.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[#FF4F86] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>2. Khắc Móc Khóa & Áo</span>
            </h4>
            <p className="text-xs text-[#5C454D] leading-relaxed">
              Dùng file QR chất lượng cao gửi cho các xưởng in khắc áo đôi, móc khóa thông minh.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[#FF4F86] uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              <span>3. Gửi Bất Ngờ Qua Zalo</span>
            </h4>
            <p className="text-xs text-[#5C454D] leading-relaxed">
              Gửi ảnh QR qua tin nhắn bảo người ấy quét để nhận món quà kỳ diệu.
            </p>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
