'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  QrCode,
  BookOpen,
  ShoppingBag,
  ShieldCheck,
  MessageCircle,
  Menu,
  X,
  User,
  LogIn,
  LogOut,
  Sparkles,
  ChevronDown,
  KeyRound,
  Crown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, loading, openAuthModal, logout } = useAuth();

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 32);
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleBadge = (role?: string) => {
    if (role === 'admin') {
      return { text: 'ADMIN', cls: 'bg-gradient-to-r from-[#FF1680] to-[#853BFF] text-white' };
    }
    if (role === 'vip') {
      return { text: 'VIP', cls: 'bg-gradient-to-r from-amber-500 to-pink-500 text-white' };
    }
    return { text: 'MEMBER', cls: 'bg-[#FFF0F7] text-[#FF1680] border border-[#FFB5E0]' };
  };

  return (
    <header className={`sticky z-50 w-full px-3 sm:px-5 transition-[top] duration-300 ease-out ${scrolled ? 'top-2' : 'top-3'}`}>
      <div className={`mx-auto flex h-14 items-center justify-between gap-2 rounded-full border border-white/90 bg-white/90 px-3 shadow-[0_8px_28px_rgba(111,34,91,0.12)] backdrop-blur-xl transition-[max-width,box-shadow,background-color] duration-500 ease-[cubic-bezier(.22,1,.36,1)] sm:h-[60px] sm:px-4 xl:px-5 ${scrolled ? 'max-w-[1800px] bg-white/95 shadow-[0_10px_30px_rgba(111,34,91,0.17)]' : 'max-w-[1520px]'}`}>
        {/* Logo TriKun Love Studio */}
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5 group select-none">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#FF176B] via-[#FF2D75] to-[#A56BFF] text-white shadow-md shadow-[#FF176B]/25 transition-transform group-hover:scale-105">
            <Heart className="h-4.5 w-4.5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-[#FF176B] via-[#FF2D75] to-[#8955FF] bg-clip-text text-transparent">
                TriKun Love
              </span>
              <span className="hidden 2xl:inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-white text-[#FF176B] font-black border border-[#F8C9E8]">
                PRO 2026
              </span>
            </div>
            <p className="hidden sm:block text-[8px] text-[#7D5A6E] font-extrabold tracking-wide uppercase">Vũ Trụ Quà Tặng Số</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Điều hướng chính" className="hidden min-w-0 items-center gap-0.5 rounded-full border border-[#F8C9E8]/70 bg-white/70 p-1 xl:flex">
          <Link
            href="/"
            className="whitespace-nowrap px-2.5 py-2 rounded-full text-xs 2xl:text-[13px] font-extrabold text-[#3B252E] hover:text-[#FF176B] hover:bg-white/95 transition-colors"
          >
            Sản phẩm
          </Link>
          <Link
            href="/qr-tinh-yeu"
            className="whitespace-nowrap px-2.5 py-2 rounded-full text-xs 2xl:text-[13px] font-extrabold text-[#3B252E] hover:text-[#FF176B] hover:bg-white/95 transition-colors flex items-center gap-1.5"
          >
            <QrCode className="w-4 h-4 text-[#FF176B]" />
            <span>Tạo QR Tình Yêu</span>
          </Link>
          <Link
            href="/huong-dan"
            className="whitespace-nowrap px-2.5 py-2 rounded-full text-xs 2xl:text-[13px] font-extrabold text-[#3B252E] hover:text-[#8955FF] hover:bg-white/95 transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-[#8955FF]" />
            <span>Hướng dẫn</span>
          </Link>
          <Link
            href="/tra-cuu-don"
            className="whitespace-nowrap px-2.5 py-2 rounded-full text-xs 2xl:text-[13px] font-extrabold text-[#3B252E] hover:text-[#FF176B] hover:bg-white/95 transition-colors flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4 text-[#FF176B]" />
            <span>Đơn của tôi</span>
          </Link>
          <Link
            href="/admin"
            className="whitespace-nowrap px-2.5 py-2 rounded-full text-xs 2xl:text-[13px] font-extrabold text-[#7D646D] hover:text-[#FF176B] hover:bg-white/95 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Admin</span>
          </Link>
        </nav>

        {/* Header Actions: User Login / Profile Dropdown + Chat TriKun */}
        <div className="flex shrink-0 items-center gap-1.5">
          {!loading && !user && (
            <div className="hidden items-center gap-1.5 xl:flex">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="whitespace-nowrap px-3 py-2 rounded-full bg-white/95 hover:bg-[#FFF5FA] border border-[#FFB5E0] hover:border-[#FF1680] text-[#29104E] hover:text-[#FF1680] text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#FF1680]" />
                <span>Đăng nhập</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register_form')}
                className="hidden 2xl:inline-flex whitespace-nowrap px-3 py-2 rounded-full bg-[#FFF0F7] hover:bg-[#FFE2F0] border border-[#FFB5E0] text-[#FF1680] text-xs font-extrabold transition-colors items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Đăng ký</span>
              </button>
            </div>
          )}

          {!loading && user && (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen((v) => !v)}
                className="group pl-1.5 pr-3 py-1 rounded-full bg-white/95 hover:bg-[#FFF5FA] border border-[#FFB5E0] hover:border-[#FF1680] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <img
                  src={user.avatar || '/images/hero/chibi_1.jpg'}
                  alt={user.fullName}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-[#FF4FA3] shadow-2xs"
                />
                <div className="hidden sm:block text-left max-w-[115px]">
                  <p className="text-xs font-extrabold text-[#29104E] truncate leading-tight">
                    {user.fullName}
                  </p>
                  <span
                    className={`inline-block text-[9px] px-1.5 py-0.2 rounded-full font-black leading-tight ${
                      roleBadge(user.role).cls
                    }`}
                  >
                    {roleBadge(user.role).text}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#7D5A6E] transition-transform duration-200 ${
                    userDropdownOpen ? 'rotate-180 text-[#FF1680]' : ''
                  }`}
                />
              </button>

              {/* Crystal User Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2.5 w-64 rounded-3xl p-3 text-[#29104E] shadow-2xl border-[1.5px] border-white z-50 space-y-2"
                  style={{
                    background:
                      'linear-gradient(155deg, rgba(255, 253, 255, 0.97) 0%, rgba(255, 240, 250, 0.95) 100%)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 45px -10px rgba(133, 59, 255, 0.28), 0 8px 20px -6px rgba(255, 22, 128, 0.22)'
                  }}
                >
                  <div className="p-2.5 rounded-2xl bg-[#FFF5FA] border border-[#F8D0E5] flex items-center gap-2.5">
                    <img
                      src={user.avatar || '/images/hero/chibi_1.jpg'}
                      alt={user.fullName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#FF1680] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-[#29104E] truncate">{user.fullName}</p>
                      <p className="text-[11px] text-[#6E5566] truncate">{user.email}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00C896]">
                        ● Đã xác thực OTP
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-bold">
                    <Link
                      href="/ho-so"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#FFF0F7] text-[#29104E] hover:text-[#FF1680] transition-colors"
                    >
                      <User className="w-4 h-4 text-[#FF1680]" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    <Link
                      href="/ho-so?tab=gifts"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#FFF0F7] text-[#29104E] hover:text-[#853BFF] transition-colors"
                    >
                      <Crown className="w-4 h-4 text-[#853BFF]" />
                      <span>Quà tặng & Đơn hàng của tôi</span>
                    </Link>

                    <Link
                      href="/ho-so?tab=security"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#FFF0F7] text-[#29104E] hover:text-[#00C896] transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-[#00C896]" />
                      <span>Đổi mật khẩu & Bảo mật</span>
                    </Link>

                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#FF1680]/10 to-[#853BFF]/10 text-[#FF1680] font-extrabold transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#FF1680]" />
                        <span>Bảng Quản Trị Admin</span>
                      </Link>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-[#F8D0E5]">
                    <button
                      type="button"
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 text-xs font-extrabold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất tài khoản</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <a
            href="https://zalo.me/0345151438"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex group relative whitespace-nowrap px-3 py-2 rounded-full bg-gradient-to-r from-[#FF176B] via-[#FF2D75] to-[#8955FF] text-white text-xs font-black shadow-md shadow-[#FF176B]/20 hover:shadow-lg transition-shadow items-center gap-1.5 select-none"
          >
            <MessageCircle className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            <span>Chat TriKun</span>
          </a>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden flex h-10 w-10 items-center justify-center rounded-full text-[#3B252E] bg-[#FFF0F4] border border-[#FFD6E3] hover:bg-white cursor-pointer"
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="xl:hidden mx-auto mt-2 max-h-[calc(100dvh-88px)] max-w-[1800px] overflow-y-auto rounded-3xl bg-white/98 backdrop-blur-2xl border border-[#FFD6E3] px-4 py-4 space-y-1 shadow-2xl">
          {user ? (
            <div className="p-3 rounded-2xl bg-[#FFF5FA] border border-[#F8D0E5] flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={user.avatar || '/images/hero/chibi_1.jpg'}
                  alt={user.fullName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#FF1680]"
                />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#29104E] truncate">{user.fullName}</p>
                  <p className="text-[11px] text-[#6E5566] truncate">{user.email}</p>
                </div>
              </div>
              <Link
                href="/ho-so"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-[#FF1680] text-white text-xs font-extrabold shrink-0"
              >
                Hồ sơ
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#F8D0E5]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('login');
                }}
                className="py-2.5 rounded-xl bg-gradient-to-r from-[#FF1680] to-[#853BFF] text-white text-xs font-extrabold cursor-pointer"
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('register_form');
                }}
                className="py-2.5 rounded-xl bg-[#FFF0F7] border border-[#FFB5E0] text-[#FF1680] text-xs font-extrabold cursor-pointer"
              >
                Đăng ký OTP
              </button>
            </div>
          )}

          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-4 py-2.5 rounded-xl text-sm font-extrabold text-[#3B252E] hover:bg-[#FFF0F4]"
          >
            🛍️ Kho Mẫu Quà Tặng
          </Link>
          <Link
            href="/qr-tinh-yeu"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-4 py-2.5 rounded-xl text-sm font-extrabold text-[#FF4F86] hover:bg-[#FFF0F4]"
          >
            🎁 Tạo Mã QR Trái Tim In Thiệp
          </Link>
          <Link
            href="/ho-so"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-4 py-2.5 rounded-xl text-sm font-extrabold text-[#853BFF] hover:bg-[#F5F0FF]"
          >
            👤 Hồ Sơ Cá Nhân Của Tôi
          </Link>
          <Link
            href="/huong-dan"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-4 py-2.5 rounded-xl text-sm font-extrabold text-[#3B252E] hover:bg-[#FFF0F4]"
          >
            📖 Hướng dẫn sử dụng
          </Link>
          <Link
            href="/tra-cuu-don"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-4 py-2.5 rounded-xl text-sm font-extrabold text-[#3B252E] hover:bg-[#FFF0F4]"
          >
            📦 Tra cứu đơn của tôi
          </Link>
          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-4 py-2.5 rounded-xl text-sm font-extrabold text-[#8B5CF6] hover:bg-[#F5F0FF]"
          >
            🔒 Bảng Quản trị Admin
          </Link>

          {user && (
            <button
              type="button"
              onClick={async () => {
                setMobileMenuOpen(false);
                await logout();
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-extrabold text-red-600 hover:bg-red-50 cursor-pointer"
            >
              🚪 Đăng xuất
            </button>
          )}
        </div>
      )}
    </header>
  );
}
