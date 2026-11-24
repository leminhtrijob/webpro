'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, QrCode, ShoppingBag, MessageCircle } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  // Ẩn bottom nav khi đang ở trong trang quà tặng của người nhận `/v/`
  if (pathname.startsWith('/v/')) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFBFC]/95 backdrop-blur-lg border-t border-[#F0DDE3] px-2 py-1.5 flex items-center justify-around shadow-lg">
      <Link
        href="/"
        className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
          pathname === '/' ? 'text-[#FF4F86]' : 'text-[#7D646D]'
        }`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span>Trang chủ</span>
      </Link>

      <Link
        href="/qr-tinh-yeu"
        className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
          pathname === '/qr-tinh-yeu' ? 'text-[#FF4F86]' : 'text-[#7D646D]'
        }`}
      >
        <QrCode className="w-5 h-5 mb-0.5" />
        <span>Tạo QR</span>
      </Link>

      {/* Floating Center Action Button */}
      <Link
        href="/studio/trikun-heart"
        className="flex flex-col items-center -mt-5 bg-gradient-to-tr from-[#FF4F86] to-[#E8638A] text-white p-2.5 rounded-full shadow-lg shadow-[#FF4F86]/35 active:scale-95 transition-transform"
      >
        <Sparkles className="w-5 h-5" />
      </Link>

      <Link
        href="/tra-cuu-don"
        className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
          pathname === '/tra-cuu-don' ? 'text-[#FF4F86]' : 'text-[#7D646D]'
        }`}
      >
        <ShoppingBag className="w-5 h-5 mb-0.5" />
        <span>Đơn hàng</span>
      </Link>

      <a
        href="https://zalo.me/0345151438"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold text-[#0068FF]"
      >
        <MessageCircle className="w-5 h-5 mb-0.5" />
        <span>Trí Kun</span>
      </a>
    </nav>
  );
}
