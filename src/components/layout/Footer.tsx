import React from 'react';
import Link from 'next/link';
import { Heart, Sparkles, MessageCircle, Send } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="tk-home-panel text-[#5C454D] pt-12 pb-20 md:pb-12 mt-20 rounded-t-[2rem] sm:rounded-t-[3rem] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF4F86] to-[#FF80A6] flex items-center justify-center text-white">
                <Heart className="w-4 h-4 fill-white" />
              </div>
              <span className="text-lg font-extrabold bg-gradient-to-r from-[#FF4F86] to-[#8B5CF6] bg-clip-text text-transparent">
                TriKun Love Studio
              </span>
            </div>
            <p className="text-sm text-[#9A8490] leading-relaxed">
              Vũ trụ quà tặng số lãng mạn hàng đầu Việt Nam. Nơi gửi gắm yêu thương, tỏ tình và lưu giữ những kỷ niệm đẹp nhất bên người thương.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://zalo.me/0345151438"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white border border-[#F0DDE3] flex items-center justify-center text-[#FF4F86] hover:scale-105 transition-transform shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white border border-[#F0DDE3] flex items-center justify-center text-[#1877F2] hover:scale-105 transition-transform shadow-xs"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Dịp lễ nổi bật */}
          <div>
            <h4 className="text-sm font-bold text-[#2D1F24] mb-3 uppercase tracking-wider">Dịp Lễ Tình Yêu</h4>
            <ul className="space-y-2 text-sm text-[#7D646D]">
              <li><Link href="/?category=Valentine" className="hover:text-[#FF4F86]">Valentine 14/2</Link></li>
              <li><Link href="/?category=Sinh+nhật" className="hover:text-[#FF4F86]">Sinh nhật người yêu</Link></li>
              <li><Link href="/?category=Ngày+Phụ+Nữ" className="hover:text-[#FF4F86]">Quốc tế Phụ nữ 8/3</Link></li>
              <li><Link href="/?category=Ngày+Nhà+Giáo+20/11" className="hover:text-[#FF4F86]">Tri ân Thầy Cô 20/11</Link></li>
              <li><Link href="/?category=Trái+tim+3D" className="hover:text-[#FF4F86]">Trái tim hạt 3D lấp lánh</Link></li>
            </ul>
          </div>

          {/* Dịch vụ */}
          <div>
            <h4 className="text-sm font-bold text-[#2D1F24] mb-3 uppercase tracking-wider">Dịch Vụ TriKun</h4>
            <ul className="space-y-2 text-sm text-[#7D646D]">
              <li><Link href="/qr-tinh-yeu" className="hover:text-[#FF4F86]">Tạo mã QR Trái tim nghệ thuật</Link></li>
              <li><Link href="/" className="hover:text-[#FF4F86]">Tự chỉnh sửa quà (Free / VIP)</Link></li>
              <li><a href="https://zalo.me/0345151438" className="hover:text-[#FF4F86]">Nhờ Trí Kun làm hộ (Zalo)</a></li>
              <li><Link href="/huong-dan" className="hover:text-[#FF4F86]">Mua Full Source Code Web</Link></li>
              <li><Link href="/tra-cuu-don" className="hover:text-[#FF4F86]">Tra cứu link máy chủ</Link></li>
            </ul>
          </div>

          {/* Thông tin hỗ trợ */}
          <div>
            <h4 className="text-sm font-bold text-[#2D1F24] mb-3 uppercase tracking-wider">Hỗ Trợ & Thanh Toán</h4>
            <p className="text-xs text-[#9A8490] mb-3">
              Hệ thống tự động kích hoạt qua mã VietQR Ngân hàng ACB Bank hoặc ví điện tử.
            </p>
            <div className="p-3 bg-white rounded-xl border border-[#F0DDE3] text-xs space-y-1">
              <p className="font-semibold text-[#2D1F24]">Ngân hàng: ACB Bank</p>
              <p className="text-[#E8638A] font-bold">STK: 4251 5647</p>
              <p className="text-[#5C454D]">Chủ TK: LÊ MINH TRÍ (Trí Kun)</p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#F0DDE3]/60 flex flex-col sm:flex-row items-center justify-between text-xs text-[#9A8490] gap-4">
          <p>© 2026 TriKun Universe. All rights reserved. Made with ❤️ by Trí Kun.</p>
          <div className="flex items-center gap-4">
            <Link href="/huong-dan" className="hover:underline">Chính sách bảo mật</Link>
            <span>•</span>
            <Link href="/huong-dan" className="hover:underline">Điều khoản dịch vụ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
