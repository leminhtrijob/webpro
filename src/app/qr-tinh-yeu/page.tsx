'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Heart,
  QrCode as QrIcon,
  Download,
  Sparkles,
  Printer,
  Palette,
  Layers,
  CheckCircle2,
  Send
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';

type CardTheme = 'sweet-pink' | 'starry-galaxy' | 'vintage-gold';

export default function QrLovePage() {
  const [content, setContent] = useState('https://trikun.vn/v/myheart-7');
  const [colorDark, setColorDark] = useState('#E8638A');
  const [qrUrl, setQrUrl] = useState('');
  const [isExportingQR, setIsExportingQR] = useState(false);
  const [isExportingCard, setIsExportingCard] = useState(false);

  // Tab mode: QR đơn giản vs Thiệp in 10x15cm
  const [activeTab, setActiveTab] = useState<'qr' | 'card'>('qr');

  // Trạng thái tùy chỉnh thiệp in 10x15cm
  const [recipient, setRecipient] = useState('Bé Yêu ♡');
  const [sender, setSender] = useState('Trí Kun ♡');
  const [cardTitle, setCardTitle] = useState('Món Quà Tình Yêu Trao Em');
  const [cardWish, setCardWish] = useState(
    'Cảm ơn em vì đã luôn ở bên và sưởi ấm trái tim anh. Quét mã QR bên dưới để mở điều kỳ diệu anh dành riêng cho em nhé!'
  );
  const [cardTheme, setCardTheme] = useState<CardTheme>('sweet-pink');

  useEffect(() => {
    if (!content) return;
    QRCode.toDataURL(content, {
      width: 600,
      margin: 2,
      color: {
        dark: colorDark,
        light: '#FFFFFF'
      }
    })
      .then((url) => setQrUrl(url))
      .catch(console.error);
  }, [content, colorDark]);

  // Helper vẽ trái tim canvas
  const drawHeart = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: string
  ) => {
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    const topCurveHeight = height * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    // Left curve
    ctx.bezierCurveTo(
      x,
      y,
      x - width / 2,
      y,
      x - width / 2,
      y + topCurveHeight
    );
    ctx.bezierCurveTo(
      x - width / 2,
      y + (height + topCurveHeight) / 2,
      x,
      y + (height + topCurveHeight) / 2 + 10,
      x,
      y + height
    );
    // Right curve
    ctx.bezierCurveTo(
      x,
      y + (height + topCurveHeight) / 2 + 10,
      x + width / 2,
      y + (height + topCurveHeight) / 2,
      x + width / 2,
      y + topCurveHeight
    );
    ctx.bezierCurveTo(
      x + width / 2,
      y,
      x,
      y,
      x,
      y + topCurveHeight
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Tải ảnh QR có lồng logo trái tim chính giữa (Canvas HD 1000x1000px)
  const handleDownloadQR = async () => {
    if (!qrUrl) return;
    setIsExportingQR(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = qrUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // 1. Vẽ nền trắng & mã QR
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1000, 1000);
      ctx.drawImage(img, 40, 40, 920, 920);

      // 2. Vẽ hình tròn trắng viền mềm ở tâm (tránh làm mất tracking cells quan trọng)
      const centerX = 500;
      const centerY = 500;
      const circleRadius = 115;

      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = colorDark;
      ctx.stroke();

      // 3. Vẽ trái tim màu hồng ở trung tâm
      drawHeart(ctx, centerX, centerY - 65, 120, 115, colorDark);

      // 4. Xuất file
      const downloadUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `QR_Trai_Tim_${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.error('Lỗi khi xuất ảnh QR:', err);
    } finally {
      setIsExportingQR(false);
    }
  };

  // Tải thiệp in nghệ thuật 10x15cm (1200x1800px - 300 DPI)
  const handleDownloadPrintCard = async () => {
    if (!qrUrl) return;
    setIsExportingCard(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = qrUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // --- CẤU HÌNH THEME CHO THIỆP ---
      if (cardTheme === 'sweet-pink') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 1800);
        bgGrad.addColorStop(0, '#FFF5F8');
        bgGrad.addColorStop(1, '#FFE4EC');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 1800);

        // Khung viền đôi sang trọng
        ctx.strokeStyle = '#FF8DAF';
        ctx.lineWidth = 6;
        ctx.strokeRect(60, 60, 1080, 1680);
        ctx.strokeStyle = '#FF4F86';
        ctx.lineWidth = 2;
        ctx.strokeRect(75, 75, 1050, 1650);

        // Header Pill
        ctx.fillStyle = '#FFE0EA';
        ctx.beginPath();
        ctx.roundRect(400, 120, 400, 56, [28]);
        ctx.fill();
        ctx.fillStyle = '#FF4F86';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨ MÓN QUÀ TÌNH YÊU • TRIKUN', 600, 156);

        // Recipient
        ctx.fillStyle = '#2D1F24';
        ctx.font = 'bold 54px sans-serif';
        ctx.fillText(recipient.normalize('NFC'), 600, 280);

        // Title
        ctx.fillStyle = '#FF1E6A';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText(cardTitle.normalize('NFC'), 600, 360);

        // Lời nhắn (Multiline)
        ctx.fillStyle = '#5A404A';
        ctx.font = 'normal 28px sans-serif';
        const words = cardWish.normalize('NFC').split(' ');
        let line = '';
        let y = 440;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 900 && n > 0) {
            ctx.fillText(line.trim(), 600, y);
            line = words[n] + ' ';
            y += 42;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), 600, y);

        // QR Box
        const qrBoxY = 700;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(310, qrBoxY, 580, 580, [40]);
        ctx.fill();
        ctx.strokeStyle = '#FFD1DF';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.drawImage(img, 360, qrBoxY + 50, 480, 480);

        // Trái tim ở tâm QR
        const qCenter = qrBoxY + 290;
        ctx.beginPath();
        ctx.arc(600, qCenter, 65, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#FF1E6A';
        ctx.lineWidth = 5;
        ctx.stroke();
        drawHeart(ctx, 600, qCenter - 38, 70, 68, '#FF1E6A');

        // Hướng dẫn quét
        ctx.fillStyle = '#FF4F86';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('📱 Dùng Camera hoặc Zalo quét để mở quà', 600, qrBoxY + 660);

        // Người gửi
        ctx.fillStyle = '#7A5B67';
        ctx.font = 'italic 28px sans-serif';
        ctx.fillText(`Người gửi tặng: ${sender.normalize('NFC')}`, 600, 1600);

      } else if (cardTheme === 'starry-galaxy') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 1800);
        bgGrad.addColorStop(0, '#0F081D');
        bgGrad.addColorStop(0.5, '#1E0E38');
        bgGrad.addColorStop(1, '#0C0517');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 1800);

        // Vẽ các vì sao
        for (let i = 0; i < 70; i++) {
          const sx = Math.random() * 1200;
          const sy = Math.random() * 1800;
          const sr = Math.random() * 2.5 + 1;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fillStyle = i % 3 === 0 ? '#FFD700' : '#FFFFFF';
          ctx.fill();
        }

        // Viền ánh kim tím & vàng
        ctx.strokeStyle = 'rgba(216, 180, 254, 0.4)';
        ctx.lineWidth = 6;
        ctx.strokeRect(60, 60, 1080, 1680);
        ctx.strokeStyle = '#E9D5FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(75, 75, 1050, 1650);

        // Header
        ctx.fillStyle = '#E9D5FF';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌌 VŨ TRỤ YÊU THƯƠNG • TRIKUN GALAXY', 600, 156);

        // Recipient
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 54px sans-serif';
        ctx.fillText(recipient.normalize('NFC'), 600, 280);

        // Title
        ctx.fillStyle = '#C084FC';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText(cardTitle.normalize('NFC'), 600, 360);

        // Lời chúc
        ctx.fillStyle = '#E2E8F0';
        ctx.font = 'normal 28px sans-serif';
        const words = cardWish.normalize('NFC').split(' ');
        let line = '';
        let y = 440;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 900 && n > 0) {
            ctx.fillText(line.trim(), 600, y);
            line = words[n] + ' ';
            y += 42;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), 600, y);

        // QR Box
        const qrBoxY = 700;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(310, qrBoxY, 580, 580, [40]);
        ctx.fill();

        ctx.drawImage(img, 360, qrBoxY + 50, 480, 480);

        // Trái tim ở tâm
        const qCenter = qrBoxY + 290;
        ctx.beginPath();
        ctx.arc(600, qCenter, 65, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#9333EA';
        ctx.lineWidth = 5;
        ctx.stroke();
        drawHeart(ctx, 600, qCenter - 38, 70, 68, '#9333EA');

        // Quét mã
        ctx.fillStyle = '#C084FC';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('✨ Mở Camera quét mã để bước vào vũ trụ', 600, qrBoxY + 660);

        // Sender
        ctx.fillStyle = '#A855F7';
        ctx.font = 'italic 28px sans-serif';
        ctx.fillText(`Từ: ${sender.normalize('NFC')}`, 600, 1600);

      } else {
        // vintage-gold
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 1800);
        bgGrad.addColorStop(0, '#FCF8F2');
        bgGrad.addColorStop(1, '#F3E8D8');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 1800);

        ctx.strokeStyle = '#C5A059';
        ctx.lineWidth = 6;
        ctx.strokeRect(60, 60, 1080, 1680);
        ctx.strokeStyle = '#E0C895';
        ctx.lineWidth = 2;
        ctx.strokeRect(75, 75, 1050, 1650);

        ctx.fillStyle = '#8B6A2B';
        ctx.font = 'bold 22px serif';
        ctx.textAlign = 'center';
        ctx.fillText('📜 THƯ TÌNH CỔ ĐIỂN • TRIKUN ATELIER', 600, 156);

        ctx.fillStyle = '#3E2F1C';
        ctx.font = 'bold 54px serif';
        ctx.fillText(recipient.normalize('NFC'), 600, 280);

        ctx.fillStyle = '#8B6A2B';
        ctx.font = 'bold 38px serif';
        ctx.fillText(cardTitle.normalize('NFC'), 600, 360);

        ctx.fillStyle = '#5A462F';
        ctx.font = 'normal 28px serif';
        const words = cardWish.normalize('NFC').split(' ');
        let line = '';
        let y = 440;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 900 && n > 0) {
            ctx.fillText(line.trim(), 600, y);
            line = words[n] + ' ';
            y += 44;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), 600, y);

        // QR Box
        const qrBoxY = 700;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(310, qrBoxY, 580, 580, [40]);
        ctx.fill();
        ctx.strokeStyle = '#C5A059';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.drawImage(img, 360, qrBoxY + 50, 480, 480);

        const qCenter = qrBoxY + 290;
        ctx.beginPath();
        ctx.arc(600, qCenter, 65, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#8B6A2B';
        ctx.lineWidth = 5;
        ctx.stroke();
        drawHeart(ctx, 600, qCenter - 38, 70, 68, '#8B6A2B');

        ctx.fillStyle = '#8B6A2B';
        ctx.font = 'bold 30px serif';
        ctx.fillText('✧ Quét mã để mở bức thư ngàn lời thương ✧', 600, qrBoxY + 660);

        ctx.fillStyle = '#6E5227';
        ctx.font = 'italic 28px serif';
        ctx.fillText(`Kính thư: ${sender.normalize('NFC')}`, 600, 1600);
      }

      // Xuất file ảnh chất lượng cao
      const downloadUrl = canvas.toDataURL('image/png', 1.0);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Thiep_In_10x15_${cardTheme}_${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.error('Lỗi khi xuất thiệp in 10x15:', err);
    } finally {
      setIsExportingCard(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBFC] text-[#2D1F24] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex p-2.5 rounded-2xl bg-[#FFF0F4] text-[#FF4F86] mb-1">
            <QrIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#2D1F24]">
            Tạo Mã QR & Thiệp In Nghệ Thuật
          </h1>
          <p className="text-xs sm:text-sm text-[#7D646D]">
            Biến món quà trực tuyến thành mã QR lồng trái tim hoặc thiệp in 10x15cm tinh xảo, sẵn sàng in ra giấy cứng tặng người thương!
          </p>

          {/* Mode Switch Tabs */}
          <div className="pt-3 flex items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('qr')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'qr'
                  ? 'bg-[#FF4F86] text-white shadow-md shadow-[#FF4F86]/20'
                  : 'bg-white text-[#7D646D] border border-[#F0DDE3] hover:border-[#FF4F86]'
              }`}
            >
              <QrIcon className="w-4 h-4" />
              <span>1. Mã QR Trái Tim Rời</span>
            </button>
            <button
              onClick={() => setActiveTab('card')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'card'
                  ? 'bg-[#FF4F86] text-white shadow-md shadow-[#FF4F86]/20'
                  : 'bg-white text-[#7D646D] border border-[#F0DDE3] hover:border-[#FF4F86]'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>2. Thiệp In 10x15cm Tinh Xảo</span>
            </button>
          </div>
        </div>

        {/* TAB 1: MÃ QR TRÁI TIM ĐƠN GIẢN */}
        {activeTab === 'qr' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Controls */}
            <div className="bg-white rounded-3xl border border-[#F0DDE3] p-6 shadow-sm space-y-5">
              <div>
                <label className="text-xs font-bold text-[#5C454D] block mb-1">
                  Nội dung hoặc Đường link quà tặng:
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
                  onClick={handleDownloadQR}
                  disabled={isExportingQR}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF4F86] to-[#E8638A] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#FF4F86]/25 hover:opacity-95 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingQR ? 'Đang xuất ảnh...' : 'Tải Ảnh QR Nét Cao (Có Trái Tim)'}</span>
                </button>
              </div>
            </div>

            {/* Right Preview */}
            <div className="bg-white rounded-3xl border border-[#F0DDE3] p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-xs font-bold text-[#9A8490] uppercase tracking-wider">
                Xem trước Mã QR
              </span>

              <div className="relative p-6 rounded-3xl bg-[#FFF9FA] border-2 border-dashed border-[#F0DDE3]">
                {qrUrl ? (
                  <div className="relative">
                    <img src={qrUrl} alt="QR Tình Yêu" className="w-56 h-56 object-contain" />
                    {/* Center Heart Emblem */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center border-2" style={{ borderColor: colorDark }}>
                        <Heart className="w-6 h-6 animate-pulse" style={{ color: colorDark, fill: colorDark }} />
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
        )}

        {/* TAB 2: THIỆP IN 10X15CM CHUẨN TIỆM IN */}
        {activeTab === 'card' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form chỉnh sửa thiệp in */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-[#F0DDE3] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#2D1F24] flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#FF4F86]" />
                <span>Tùy chỉnh nội dung thiệp in 10x15cm</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#5C454D] block mb-1">Gửi ai:</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5C454D] block mb-1">Người gửi:</label>
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5C454D] block mb-1">Tiêu đề thiệp:</label>
                <input
                  type="text"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5C454D] block mb-1">Lời nhắn trên thiệp:</label>
                <textarea
                  rows={3}
                  value={cardWish}
                  onChange={(e) => setCardWish(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86] leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5C454D] block mb-2">Chủ đề khung viền thiệp:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sweet-pink', label: 'Hồng Ngọt Ngào', bg: 'bg-[#FFF0F4] text-[#FF4F86] border-[#FF4F86]' },
                    { id: 'starry-galaxy', label: 'Ngân Hà Tím', bg: 'bg-[#1E0E38] text-[#E9D5FF] border-[#C084FC]' },
                    { id: 'vintage-gold', label: 'Thư Vintage', bg: 'bg-[#FCF8F2] text-[#8B6A2B] border-[#C5A059]' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setCardTheme(theme.id as CardTheme)}
                      className={`p-2.5 rounded-xl text-xs font-bold border-2 transition-all text-center ${
                        cardTheme === theme.id ? theme.bg + ' shadow-sm scale-[1.02]' : 'bg-[#FFF9FA] text-[#7D646D] border-[#F0DDE3]'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleDownloadPrintCard}
                  disabled={isExportingCard}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF1E6A] via-[#FF4F86] to-[#A838FF] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#FF1E6A]/25 hover:opacity-95 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isExportingCard ? 'Đang kết xuất bản in...' : 'Tải Thiệp In 10x15cm (300 DPI Siêu Nét)'}</span>
                </button>
              </div>
            </div>

            {/* Visual Live Preview của Thiệp In 10x15cm */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-[#F0DDE3] p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-xs font-bold text-[#9A8490] uppercase tracking-wider">
                Bản xem trước Thiệp Khổ 10x15cm
              </span>

              {/* Tỉ lệ 2:3 giống khổ 10x15cm */}
              <div
                className={`w-[280px] sm:w-[320px] aspect-[2/3] rounded-3xl p-5 shadow-xl border-4 transition-all relative flex flex-col justify-between overflow-hidden ${
                  cardTheme === 'sweet-pink'
                    ? 'bg-gradient-to-b from-[#FFF5F8] to-[#FFE4EC] border-[#FF8DAF] text-[#2D1F24]'
                    : cardTheme === 'starry-galaxy'
                    ? 'bg-gradient-to-b from-[#0F081D] via-[#1E0E38] to-[#0C0517] border-[#C084FC] text-white'
                    : 'bg-gradient-to-b from-[#FCF8F2] to-[#F3E8D8] border-[#C5A059] text-[#3E2F1C]'
                }`}
              >
                {/* Header Badge */}
                <div className="text-center pt-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                      cardTheme === 'sweet-pink'
                        ? 'bg-[#FFE0EA] text-[#FF4F86]'
                        : cardTheme === 'starry-galaxy'
                        ? 'bg-purple-950 text-purple-200 border border-purple-500/40'
                        : 'bg-[#EFE3CF] text-[#8B6A2B]'
                    }`}
                  >
                    ✨ MÓN QUÀ TÌNH YÊU
                  </span>
                  <h4 className="text-lg font-black mt-2 leading-tight">{recipient}</h4>
                  <p className="text-xs font-bold opacity-90 mt-0.5">{cardTitle}</p>
                </div>

                {/* Wish Note */}
                <p className="text-[11px] leading-relaxed text-center px-2 line-clamp-3 opacity-80 my-auto">
                  &ldquo;{cardWish}&rdquo;
                </p>

                {/* QR Box in Card */}
                <div className="bg-white rounded-2xl p-2.5 shadow-md mx-auto w-36 h-36 flex flex-col items-center justify-center relative border border-black/5">
                  {qrUrl && (
                    <div className="relative w-full h-full">
                      <img src={qrUrl} alt="QR" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center border border-pink-300">
                          <Heart className="w-4 h-4 text-[#FF1E6A] fill-[#FF1E6A]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer in Card */}
                <div className="text-center pb-1">
                  <p className="text-[10px] font-bold tracking-tight opacity-90">
                    📱 Quét mã để mở thế giới quà tặng
                  </p>
                  <p className="text-[9px] italic opacity-75 mt-0.5">
                    Gửi tặng từ: {sender}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#7D646D] max-w-xs">
                Kích thước file xuất ra là 1200 x 1800 px, bạn có thể gửi trực tiếp ra tiệm in ảnh để in thiệp giấy cứng cực đẹp!
              </p>
            </div>
          </div>
        )}

        {/* PRINTING & GIFT GUIDE */}
        <div className="bg-[#FFF5F8] rounded-3xl border border-[#F0DDE3] p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[#FF4F86] uppercase tracking-wider flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              <span>1. In Ra Thiệp Giấy 10x15cm</span>
            </h4>
            <p className="text-xs text-[#5C454D] leading-relaxed">
              Tải ảnh thiệp chuẩn 300 DPI và gửi tiệm rửa ảnh ép lụa hoặc dán vào hộp quà bất ngờ.
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
              Gửi ảnh QR qua tin nhắn bảo người ấy quét để nhận món quà kỳ diệu ngay lập tức!
            </p>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
