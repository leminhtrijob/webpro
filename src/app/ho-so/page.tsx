'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Gift,
  ShoppingBag,
  KeyRound,
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Crown,
  Calendar,
  Heart
} from 'lucide-react';

const AVATAR_PRESETS = [
  '/images/hero/chibi_1.jpg',
  '/images/hero/chibi_2.jpg',
  '/images/hero/chibi_3.jpg',
  '/images/hero/chibi_4.jpg',
  '/images/hero/chibi_5.jpg',
  '/images/hero/chibi_6.jpg'
];

interface ProfileGift {
  giftId: string;
  templateSlug: string;
  templateName: string;
  recipientName: string;
  senderName: string;
  viewsCount: number;
  isVip: boolean;
  createdAt: string;
}

interface ProfileOrder {
  orderId: string;
  giftId?: string;
  templateName: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export default function PersonalProfilePage() {
  const { user, loading, openAuthModal, setUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'gifts' | 'security'>('info');

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_PRESETS[0]);
  const [bio, setBio] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // User's gifts & orders
  const [myGifts, setMyGifts] = useState<ProfileGift[]>([]);
  const [myOrders, setMyOrders] = useState<ProfileOrder[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'gifts' || tabParam === 'security' || tabParam === 'info') {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const loadFullProfile = useCallback(async () => {
    if (!user) return;
    setLoadingActivity(true);
    try {
      const res = await fetch('/api/user/profile', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        setFullName(data.user.fullName || '');
        setPhone(data.user.phone || '');
        setAvatar(data.user.avatar || AVATAR_PRESETS[0]);
        setBio(data.user.bio || '');
        setMyGifts(data.gifts || []);
        setMyOrders(data.orders || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingActivity(false);
    }
  }, [user?.userId, setUser]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || AVATAR_PRESETS[0]);
      setBio(user.bio || '');
      void loadFullProfile();
    }
  }, [user?.userId, loadFullProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSavingInfo(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, avatar, bio })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.message || 'Không thể lưu hồ sơ' });
      } else {
        setUser(data.user);
        setFeedback({ type: 'success', text: data.message });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Lỗi kết nối máy chủ' });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Mật khẩu xác nhận không trùng khớp' });
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.message || 'Không thể đổi mật khẩu' });
      } else {
        setUser(data.user);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFeedback({ type: 'success', text: data.message });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Lỗi kết nối máy chủ' });
    } finally {
      setSavingPw(false);
    }
  };

  const copyGiftLink = (slug: string, giftId: string) => {
    const url = `${window.location.origin}/v/${slug}?id=${giftId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(giftId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className="min-h-screen flex flex-col text-[#29104E]"
      style={{ fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {loading ? (
          <div className="rounded-[32px] bg-white/85 backdrop-blur-xl border border-white p-14 text-center shadow-xl">
            <RefreshCw className="w-8 h-8 text-[#FF1680] animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-[#61476B]">Đang tải hồ sơ cá nhân của bạn...</p>
          </div>
        ) : !user ? (
          /* MÀN HÌNH KHI CHƯA ĐĂNG NHẬP */
          <div
            className="rounded-[34px] p-8 sm:p-14 text-center max-w-xl mx-auto space-y-5"
            style={{
              background:
                'linear-gradient(155deg, rgba(255, 253, 255, 0.94) 0%, rgba(255, 238, 250, 0.9) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 22px 50px -12px rgba(255, 22, 128, 0.25)'
            }}
          >
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#FF1680] to-[#853BFF] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#FF1680]/30">
              <User className="w-8 h-8" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold italic text-[#29104E]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Hồ Sơ Cá Nhân TriKun Love ♡
            </h1>
            <p className="text-xs sm:text-sm text-[#61476B] font-medium leading-relaxed">
              Vui lòng đăng nhập hoặc tạo tài khoản mới để quản lý thông tin cá nhân, danh sách quà tặng 3D đã tạo và lịch sử đơn hàng của bạn.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF1680] via-[#FF4FA3] to-[#853BFF] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#FF1680]/30 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Đăng nhập ngay
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register_form')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white border-[1.5px] border-[#FFB5E0] text-[#FF1680] text-xs sm:text-sm font-extrabold hover:border-[#FF1680] transition-all cursor-pointer"
              >
                Đăng ký tài khoản OTP
              </button>
            </div>
          </div>
        ) : (
          /* MÀN HÌNH HỒ SƠ CÁ NHÂN ĐẦY ĐỦ CHỨC NĂNG */
          <>
            {/* 1. HEADER CARD PHA LÊ 3D */}
            <div
              className="relative rounded-[32px] p-6 sm:p-8 overflow-hidden"
              style={{
                background:
                  'linear-gradient(145deg, rgba(255, 253, 255, 0.92) 0%, rgba(255, 240, 251, 0.86) 55%, rgba(248, 234, 255, 0.9) 100%)',
                backdropFilter: 'blur(18px) saturate(145%)',
                border: '1.5px solid rgba(255, 255, 255, 0.95)',
                boxShadow:
                  '0 18px 42px -10px rgba(133, 59, 255, 0.18), 0 8px 20px -6px rgba(255, 22, 128, 0.14), inset 0 2px 3px rgba(255, 255, 255, 0.98)'
              }}
            >
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                  <div className="relative group shrink-0">
                    <img
                      src={avatar || user.avatar || AVATAR_PRESETS[0]}
                      alt={user.fullName}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] object-cover border-4 border-white shadow-[0_12px_28px_rgba(255,22,128,0.25)] ring-2 ring-[#FFB5E0]"
                    />
                    <span className="absolute -bottom-1.5 -right-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FF1680] to-[#853BFF] text-white text-[10px] font-black shadow">
                      {user.role.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã xác thực Email OTP</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-[#F5F0FF] text-[#853BFF] border border-[#DEC4FF]">
                        <Sparkles className="w-3 h-3" />
                        <span>{user.authProvider === 'google' ? 'Google OAuth' : 'Tài khoản TriKun'}</span>
                      </span>
                    </div>

                    <h1
                      className="text-2xl sm:text-3xl font-extrabold italic text-[#29104E]"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {user.fullName}
                    </h1>

                    <p className="text-xs sm:text-sm text-[#5A4266] font-medium max-w-xl">
                      {user.bio || 'Thành viên Vũ Trụ Quà Tặng Số TriKun Love 💖'}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#6E5566] font-semibold pt-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#FF1680]" />
                        <span>{user.email}</span>
                      </span>
                      {user.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#853BFF]" />
                          <span>{user.phone}</span>
                        </span>
                      )}
                      {user.createdAt && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#00C896]" />
                          <span>Tham gia: {new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nút thao tác nhanh */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#29104E] to-[#853BFF] text-white text-xs font-extrabold shadow-md flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Quản Trị Admin</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={logout}
                    className="px-4 py-2.5 rounded-2xl bg-white hover:bg-red-50 border border-[#F8D0E5] hover:border-red-300 text-red-600 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>

              {/* 3 Thẻ Thống Kê Cá Nhân */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-[#F6D5EA]">
                <div className="p-4 rounded-2xl bg-white/85 border border-[#F8D0E5] flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#FFF0F7] text-[#FF1680] flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-[#29104E]">{myGifts.length}</div>
                    <div className="text-xs font-bold text-[#6E5566]">Quà tặng số đã tạo</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/85 border border-[#E8D5FF] flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#F5F0FF] text-[#853BFF] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-[#29104E]">{myOrders.length}</div>
                    <div className="text-xs font-bold text-[#6E5566]">Đơn hàng VietQR</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/85 border border-[#C6F6E5] flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] text-[#00C896] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-[#059669]">Bảo mật 2 lớp OTP</div>
                    <div className="text-xs font-bold text-[#6E5566]">Mã tài khoản: {user.userId}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. THANH CHUYỂN TAB HỒ SƠ */}
            <div className="flex flex-wrap items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-[#F8D0E5] w-fit">
              {[
                { id: 'info', label: 'Thông tin cá nhân', icon: User },
                { id: 'gifts', label: `Quà tặng & Đơn hàng (${myGifts.length + myOrders.length})`, icon: Crown },
                { id: 'security', label: 'Bảo mật & Mật khẩu', icon: KeyRound }
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(t.id as typeof activeTab);
                      setFeedback(null);
                    }}
                    className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#FF1680] via-[#FF4FA3] to-[#853BFF] text-white shadow-md shadow-[#FF1680]/25'
                        : 'text-[#5A4266] hover:text-[#FF1680] hover:bg-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Thông báo Feedback */}
            {feedback && (
              <div
                className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 ${
                  feedback.type === 'success'
                    ? 'bg-[#ECFDF5] border-[#00C896]/45 text-[#065F46]'
                    : 'bg-[#FFF0F4] border-[#FF1680]/40 text-[#C8005A]'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#00C896] shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-[#FF1680] shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 1: CẬP NHẬT THÔNG TIN CÁ NHÂN & AVATAR                      */}
            {/* =============================================================== */}
            {activeTab === 'info' && (
              <div
                className="rounded-[30px] p-6 sm:p-8 bg-white/90 backdrop-blur-xl border border-white shadow-xl space-y-6"
              >
                <div className="border-b border-[#F8D0E5] pb-4">
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#29104E]">
                    Chỉnh sửa hồ sơ cá nhân
                  </h2>
                  <p className="text-xs text-[#6E5566] mt-0.5">
                    Cập nhật tên hiển thị, số điện thoại nhận hỗ trợ Zalo và ảnh đại diện Chibi yêu thích của bạn.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  {/* Chọn nhanh Avatar Chibi */}
                  <div>
                    <label className="block text-xs font-extrabold text-[#29104E] mb-2.5">
                      Chọn ảnh đại diện Chibi TriKun
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      {AVATAR_PRESETS.map((src) => {
                        const selected = avatar === src;
                        return (
                          <button
                            key={src}
                            type="button"
                            onClick={() => setAvatar(src)}
                            className={`relative w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                              selected
                                ? 'border-[#FF1680] scale-110 shadow-lg shadow-[#FF1680]/30 ring-2 ring-[#FFB5E0]'
                                : 'border-white opacity-75 hover:opacity-100'
                            }`}
                          >
                            <img src={src} alt="Avatar preset" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-[#29104E] mb-1.5">
                        Họ và tên hiển thị
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-white border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-sm font-semibold text-[#29104E]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-[#29104E] mb-1.5">
                        Email đăng nhập <span className="text-[#00C896]">(Đã xác thực OTP)</span>
                      </label>
                      <input
                        type="email"
                        disabled
                        value={user.email}
                        className="w-full px-4 py-3 rounded-2xl bg-[#FAF5FC] border-[1.5px] border-[#E8C5F0] text-sm font-semibold text-[#7D6386] cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-[#29104E] mb-1.5">
                        Số điện thoại / Zalo (Đồng bộ đơn quà)
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Nhập số điện thoại Zalo của bạn..."
                        className="w-full px-4 py-3 rounded-2xl bg-white border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-sm font-semibold text-[#29104E]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-[#29104E] mb-1.5">
                        Đường dẫn Avatar tùy chỉnh (URL ảnh)
                      </label>
                      <input
                        type="text"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-white border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-sm font-semibold text-[#29104E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#29104E] mb-1.5">
                      Lời giới thiệu / Châm ngôn tình yêu (Bio)
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-sm font-semibold text-[#29104E]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingInfo}
                      className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF1680] via-[#FF4FA3] to-[#853BFF] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#FF1680]/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {savingInfo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Lưu thông tin hồ sơ</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 2: QUÀ TẶNG & ĐƠN HÀNG CỦA TÔI                              */}
            {/* =============================================================== */}
            {activeTab === 'gifts' && (
              <div className="space-y-6">
                {/* Danh sách quà tặng 3D đã tạo */}
                <div className="rounded-[30px] p-6 sm:p-8 bg-white/90 backdrop-blur-xl border border-white shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F8D0E5] pb-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-[#29104E] flex items-center gap-2">
                        <Heart className="w-5 h-5 text-[#FF1680] fill-[#FF1680]" />
                        <span>Quà tặng số của tôi ({myGifts.length})</span>
                      </h2>
                      <p className="text-xs text-[#6E5566]">
                        Các đường link quà tặng khớp với tên người gửi &ldquo;{user.fullName}&rdquo;.
                      </p>
                    </div>
                    <Link
                      href="/#san-pham"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF1680] to-[#853BFF] text-white text-xs font-extrabold w-fit"
                    >
                      + Tạo món quà mới
                    </Link>
                  </div>

                  {loadingActivity ? (
                    <p className="text-xs text-[#6E5566] py-6 text-center">Đang tải danh sách quà tặng...</p>
                  ) : myGifts.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <Gift className="w-10 h-10 text-[#FF1680]/40 mx-auto" />
                      <p className="text-sm font-bold text-[#29104E]">Bạn chưa có món quà nào gắn với tên này</p>
                      <p className="text-xs text-[#6E5566]">
                        Khi tạo quà trong Studio, hãy điền tên người gửi là <strong>{user.fullName}</strong> để quà tự động đồng bộ vào đây nhé!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myGifts.map((g) => (
                        <div
                          key={g.giftId}
                          className="p-4 rounded-2xl bg-[#FFF8FC] border border-[#F8D0E5] flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono font-bold text-[#853BFF]">{g.giftId}</span>
                            <h3 className="text-sm font-extrabold text-[#29104E] truncate">
                              Gửi tới: {g.recipientName}
                            </h3>
                            <p className="text-xs text-[#6E5566] truncate">
                              Mẫu: {g.templateName} • {g.viewsCount || 0} lượt mở
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => copyGiftLink(g.templateSlug, g.giftId)}
                              className="p-2 rounded-xl bg-white border border-[#F8D0E5] text-[#29104E] hover:text-[#FF1680] cursor-pointer"
                              title="Copy link quà"
                            >
                              {copiedId === g.giftId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <Link
                              href={`/v/${g.templateSlug}?id=${g.giftId}`}
                              target="_blank"
                              className="px-3 py-2 rounded-xl bg-[#FF1680] text-white text-xs font-extrabold flex items-center gap-1"
                            >
                              <span>Mở quà</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Danh sách Đơn hàng VietQR */}
                <div className="rounded-[30px] p-6 sm:p-8 bg-white/90 backdrop-blur-xl border border-white shadow-xl space-y-4">
                  <div className="border-b border-[#F8D0E5] pb-4">
                    <h2 className="text-lg font-extrabold text-[#29104E]">
                      Lịch sử đơn hàng ({myOrders.length})
                    </h2>
                    <p className="text-xs text-[#6E5566]">
                      Đồng bộ theo Họ tên hoặc Số điện thoại ({user.phone || 'chưa cập nhật SĐT'}) của bạn.
                    </p>
                  </div>

                  {myOrders.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#6E5566]">
                      Chưa có đơn hàng VietQR nào khớp với tài khoản của bạn.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myOrders.map((o) => (
                        <div
                          key={o.orderId}
                          className="p-4 rounded-2xl bg-[#FAF8FC] border border-[#E8D5FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#FF1680]">{o.orderId}</span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                                  o.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {o.status === 'completed' ? 'Đã kích hoạt VIP' : 'Đang chờ duyệt'}
                              </span>
                            </div>
                            <p className="font-extrabold text-sm text-[#29104E] mt-1">{o.templateName}</p>
                            <p className="text-[#6E5566]">
                              Ngày tạo: {new Date(o.createdAt).toLocaleString('vi-VN')}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-[#FF1680]">
                              {o.amount.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 3: BẢO MẬT & ĐỔI MẬT KHẨU                                   */}
            {/* =============================================================== */}
            {activeTab === 'security' && (
              <div className="rounded-[30px] p-6 sm:p-8 bg-white/90 backdrop-blur-xl border border-white shadow-xl max-w-2xl space-y-6">
                <div className="border-b border-[#F8D0E5] pb-4">
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#29104E]">
                    Đổi mật khẩu & Bảo mật tài khoản
                  </h2>
                  <p className="text-xs text-[#6E5566] mt-0.5">
                    {user.hasPassword
                      ? 'Cập nhật mật khẩu định kỳ để bảo vệ tài khoản của bạn.'
                      : 'Tài khoản của bạn đăng nhập bằng Google. Bạn có thể thiết lập thêm mật khẩu riêng tại đây để đăng nhập bằng cả hai cách.'}
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {user.hasPassword && (
                    <div>
                      <label className="block text-xs font-extrabold text-[#29104E] mb-1.5">
                        Mật khẩu hiện tại
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPw ? 'text' : 'password'}
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Nhập mật khẩu hiện tại..."
                          className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-sm font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-extrabold text-[#29104E] mb-1.5">
                      Mật khẩu mới (Tối thiểu 6 ký tự)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới..."
                        className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-sm font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9B7AA8] cursor-pointer"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#29104E] mb-1.5">
                      Nhập lại mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Xác nhận mật khẩu mới..."
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPw}
                    className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF1680] via-[#FF4FA3] to-[#853BFF] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#FF1680]/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {savingPw ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Cập nhật mật khẩu bảo mật</span>
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
