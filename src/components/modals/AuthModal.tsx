'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Heart,
  Copy
} from 'lucide-react';
import type { SafeUserDTO } from '@/lib/userAuth';

export type AuthModalView =
  | 'login'
  | 'register_form'
  | 'register_otp'
  | 'forgot_email'
  | 'forgot_reset';

interface AuthModalProps {
  isOpen: boolean;
  initialView?: AuthModalView;
  onClose: () => void;
  onSuccess: (user: SafeUserDTO) => void;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type GoogleIdentity = {
  accounts: { id: {
    initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
    renderButton: (element: HTMLElement, options: { theme: string; size: string; width: number }) => void;
  } };
};

function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) return;
    let cancelled = false;
    const renderButton = () => {
      if (cancelled || !buttonRef.current) return;
      const google = (window as Window & { google?: GoogleIdentity }).google;
      if (!google) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => callbackRef.current(response.credential)
      });
      buttonRef.current.replaceChildren();
      google.accounts.id.renderButton(buttonRef.current, { theme: 'outline', size: 'large', width: Math.min(buttonRef.current.clientWidth, 400) });
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-trikun-google]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.dataset.trikunGoogle = 'true';
      document.head.appendChild(script);
    }
    script.addEventListener('load', renderButton);
    renderButton();
    return () => { cancelled = true; script?.removeEventListener('load', renderButton); };
  }, []);

  return <div ref={buttonRef} className="flex min-h-10 w-full justify-center" aria-label="Đăng nhập bằng Google" />;
}

export default function AuthModal({
  isOpen,
  initialView = 'login',
  onClose,
  onSuccess
}: AuthModalProps) {
  const [view, setView] = useState<AuthModalView>(initialView);

  // Form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);

  // 6-digit OTP input state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialView]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  // Password strength meter
  const passwordStrength = useMemo(() => {
    const pw = view === 'register_form' ? regPassword : newPassword;
    if (!pw) return { score: 0, label: 'Chưa nhập', color: '#CBD5E1' };
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 8) score += 1;
    if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    const map = [
      { label: 'Quá ngắn', color: '#F43F5E' },
      { label: 'Trung bình', color: '#F59E0B' },
      { label: 'An toàn', color: '#10B981' },
      { label: 'Rất mạnh', color: '#853BFF' },
      { label: 'Tuyệt đối', color: '#FF1680' }
    ];
    return { score, ...map[score] };
  }, [view, regPassword, newPassword]);

  if (!isOpen) return null;

  const switchView = (nextView: AuthModalView) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setView(nextView);
  };

  // OTP Box handlers
  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setOtpDigits(next);
    const focusIdx = Math.min(5, pasted.length);
    otpRefs.current[focusIdx]?.focus();
  };

  const fillDevOtp = (code: string) => {
    const clean = code.replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      next[i] = clean[i] || '';
    }
    setOtpDigits(next);
  };

  // =========================================================================
  // 1. SUBMIT LOGIN
  // =========================================================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Đăng nhập không thành công');
      } else {
        setSuccessMsg(data.message);
        setTimeout(() => onSuccess(data.user), 400);
      }
    } catch {
      setErrorMsg('Không thể kết nối máy chủ. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // 2. GOOGLE SIGN IN
  // =========================================================================
  const handleGoogleCredential = async (credential: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Đăng nhập Google thất bại');
      } else {
        setSuccessMsg(data.message);
        setTimeout(() => onSuccess(data.user), 400);
      }
    } catch {
      setErrorMsg('Lỗi kết nối dịch vụ xác thực Google');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // 3. REGISTER STEP 1: SEND OTP
  // =========================================================================
  const handleSendRegisterOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName,
          email: regEmail,
          phone: regPhone,
          password: regPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Không thể gửi mã xác nhận');
      } else {
        setOtpDigits(['', '', '', '', '', '']);
        setDevOtpPreview(data.devOtpPreview || null);
        setResendCooldown(30);
        setView('register_otp');
        setSuccessMsg(data.message);
      }
    } catch {
      setErrorMsg('Không thể gửi mã lúc này. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // 4. REGISTER STEP 2: VERIFY OTP & CREATE ACCOUNT
  // =========================================================================
  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số của mã xác nhận');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          otp: otpCode
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Mã xác nhận không chính xác');
      } else {
        setSuccessMsg(data.message);
        setTimeout(() => onSuccess(data.user), 500);
      }
    } catch {
      setErrorMsg('Không thể kiểm tra mã lúc này. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // 5. FORGOT PASSWORD STEP 1: SEND OTP
  // =========================================================================
  const handleSendForgotOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Không thể gửi mã khôi phục');
      } else {
        setOtpDigits(['', '', '', '', '', '']);
        setDevOtpPreview(data.devOtpPreview || null);
        setResendCooldown(30);
        setView('forgot_reset');
        setSuccessMsg(data.message);
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // 6. FORGOT PASSWORD STEP 2: VERIFY OTP & SET NEW PASSWORD
  // =========================================================================
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số của mã xác nhận');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          otp: otpCode,
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Không thể đặt lại mật khẩu');
      } else {
        setSuccessMsg(data.message);
        setTimeout(() => onSuccess(data.user), 500);
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex h-dvh items-center justify-center overflow-hidden p-3 sm:p-4"
      style={{
        background: 'rgba(28, 10, 42, 0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', system-ui, sans-serif"
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes tkAuthLedSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes tkAuthPopIn {
          0% { opacity: 0; transform: scale(0.93) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .tk-auth-modal-enter {
          animation: tkAuthPopIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .tk-auth-led-mask {
          padding: 2.2px;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
        .tk-auth-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(181, 107, 255, .45) transparent;
        }
        .tk-auth-scroll::-webkit-scrollbar { width: 6px; height: 0; }
        .tk-auth-scroll::-webkit-scrollbar-thumb { background: rgba(181, 107, 255, .45); border-radius: 999px; }
        .tk-auth-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* KHUNG MODAL PHA LÊ 3D VIỀN LED CHẠY TỰ ĐỘNG */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tk-auth-title"
        className="tk-auth-modal-enter tk-auth-scroll relative w-full max-w-[460px] max-h-[calc(100dvh-24px)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[28px] p-5 text-[#29104E] sm:max-h-[calc(100dvh-32px)] sm:rounded-[32px] sm:p-7"
        style={{
          background:
            'linear-gradient(155deg, rgba(255, 253, 255, 0.96) 0%, rgba(255, 241, 251, 0.93) 50%, rgba(248, 235, 255, 0.96) 100%)',
          backdropFilter: 'blur(24px) saturate(160%)',
          border: '1.5px solid rgba(255, 255, 255, 0.92)',
          boxShadow:
            '0 28px 65px -12px rgba(133, 59, 255, 0.38), 0 12px 32px -8px rgba(255, 22, 128, 0.32), inset 0 2px 4px rgba(255, 255, 255, 0.98)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lớp trang trí nằm trong khung để không tạo thanh cuộn thừa. */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[28px] sm:rounded-[32px]" aria-hidden="true">
        {/* Viền LED Neon chạy tự động quanh chu vi Popup */}
        <div
          className="tk-auth-led-mask absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none z-0"
        >
          <div
            className="absolute left-1/2 top-1/2 w-[230%] aspect-square"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(255, 181, 224, 0.35) 0deg, #FF4FA3 110deg, #FF1680 165deg, #FFFFFF 178deg, rgba(181, 107, 255, 0.35) 185deg, #B56BFF 295deg, #853BFF 345deg, #FFFFFF 358deg)',
              animation: 'tkAuthLedSpin 6.5s linear infinite'
            }}
          />
        </div>

        {/* Ánh sáng trang trí góc trên & dưới */}
        <div
          className="absolute -top-20 -left-20 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-45"
          style={{ background: 'radial-gradient(circle, #FF1680, transparent 70%)' }}
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full pointer-events-none blur-3xl opacity-45"
          style={{ background: 'radial-gradient(circle, #853BFF, transparent 70%)' }}
        />
        </div>

        {/* Nút đóng Popup */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ"
          className="sticky top-0 z-20 -mb-9 ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#FFB5E0] bg-white/95 text-[#5C3B5E] shadow-xs transition-colors hover:border-[#FF1680] hover:text-[#FF1680] cursor-pointer"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* HEADER LOGO & TIÊU ĐỀ 3D */}
        <div className="relative z-10 text-center space-y-2 mb-5">
          {/* Icon Trái Tim Pha Lê 3D */}
          <div className="inline-flex items-center justify-center">
            <div
              className="relative w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #FF1680 0%, #FF4FA3 50%, #853BFF 100%)',
                boxShadow: '0 10px 24px -4px rgba(255, 22, 128, 0.45), inset 0 2px 3px rgba(255, 255, 255, 0.85)'
              }}
            >
              <Heart className="w-6 h-6 fill-white text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FFD166] ring-2 ring-white flex items-center justify-center text-[8px]">
                ✦
              </span>
            </div>
          </div>

          {/* Nhãn nhỏ */}
          <div>
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-[0.18em] bg-white/85 border border-[#FFB5E0] text-[#FF1680] shadow-2xs">
              <Sparkles className="w-3 h-3" />
              <span>TRIKUN LOVE STUDIO</span>
            </span>
          </div>

          {/* Tiêu đề theo từng View */}
          <h2
            id="tk-auth-title"
            className="text-2xl sm:text-[28px] font-extrabold italic tracking-tight leading-tight pt-0.5"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif"
            }}
          >
            {view === 'login' && (
              <span className="bg-gradient-to-r from-[#29104E] via-[#853BFF] to-[#FF1680] bg-clip-text text-transparent">
                Chào mừng bạn trở lại ♡
              </span>
            )}
            {view === 'register_form' && (
              <span className="bg-gradient-to-r from-[#FF1680] via-[#D91B8F] to-[#853BFF] bg-clip-text text-transparent">
                Tạo tài khoản tình yêu ✦
              </span>
            )}
            {view === 'register_otp' && (
              <span className="bg-gradient-to-r from-[#853BFF] to-[#FF1680] bg-clip-text text-transparent">
                Nhập mã xác nhận
              </span>
            )}
            {view === 'forgot_email' && (
              <span className="bg-gradient-to-r from-[#29104E] to-[#FF1680] bg-clip-text text-transparent">
                Khôi phục mật khẩu
              </span>
            )}
            {view === 'forgot_reset' && (
              <span className="bg-gradient-to-r from-[#FF1680] to-[#853BFF] bg-clip-text text-transparent">
                Đặt lại mật khẩu mới
              </span>
            )}
          </h2>

          <p className="text-xs text-[#61476B] font-medium">
            {view === 'login' && 'Đăng nhập để lưu trữ quà tặng 3D, mã QR trái tim và quản lý đơn hàng.'}
            {view === 'register_form' && 'Chúng tôi sẽ gửi mã xác nhận đến email của bạn.'}
            {view === 'register_otp' && `Nhập mã 6 chữ số vừa gửi tới hộp thư ${regEmail}`}
            {view === 'forgot_email' && 'Nhập email đã đăng ký để nhận mã xác nhận gồm 6 chữ số.'}
            {view === 'forgot_reset' && `Nhập mã gửi tới ${forgotEmail} và tạo mật khẩu mới.`}
          </p>
        </div>

        {/* THÔNG BÁO LỖI / THÀNH CÔNG */}
        {errorMsg && (
          <div className="relative z-10 mb-4 p-3 rounded-2xl bg-[#FFF0F4] border border-[#FF1680]/35 text-[#C8005A] text-xs font-bold flex items-start gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF1680]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="relative z-10 mb-4 p-3 rounded-2xl bg-[#ECFDF5] border border-[#00C896]/40 text-[#065F46] text-xs font-bold flex items-start gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#00C896]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 1: ĐĂNG NHẬP (LOGIN)                                           */}
        {/* =================================================================== */}
        {view === 'login' && (
          <div className="relative z-10 space-y-4">
            {GOOGLE_CLIENT_ID && (
              <>
                <GoogleSignInButton onCredential={handleGoogleCredential} />
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#E8C5F0]" />
                  <span className="text-[11px] font-bold text-[#7D6386]">hoặc đăng nhập bằng tài khoản TriKun</span>
                  <div className="h-px flex-1 bg-[#E8C5F0]" />
                </div>
              </>
            )}
            {/* FORM ĐĂNG NHẬP EMAIL/SĐT + MẬT KHẨU */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-extrabold text-[#29104E] mb-1.5">
                  Email hoặc Số điện thoại
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Nhập email hoặc số điện thoại..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/95 border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] focus:ring-4 focus:ring-[#FF1680]/10 outline-none text-xs sm:text-sm font-semibold text-[#29104E] placeholder:text-[#A68BB2] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-[#29104E]">Mật khẩu</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (loginIdentifier.includes('@')) setForgotEmail(loginIdentifier);
                      switchView('forgot_email');
                    }}
                    className="text-xs font-extrabold text-[#FF1680] hover:text-[#853BFF] transition-colors cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu của bạn..."
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/95 border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] focus:ring-4 focus:ring-[#FF1680]/10 outline-none text-xs sm:text-sm font-semibold text-[#29104E] placeholder:text-[#A68BB2] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw((v) => !v)}
                    aria-label="Ẩn/Hiện mật khẩu"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9B7AA8] hover:text-[#29104E] cursor-pointer"
                  >
                    {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group relative w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-xl transition-all hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2 overflow-hidden cursor-pointer disabled:opacity-60"
                style={{
                  background: 'linear-gradient(90deg, #FF1680 0%, #FF4FA3 50%, #853BFF 100%)',
                  boxShadow: '0 12px 26px -6px rgba(255, 22, 128, 0.45)'
                }}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập ngay</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Chuyển qua Đăng ký */}
            <div className="pt-2 text-center text-xs font-semibold text-[#61476B]">
              Bạn chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => switchView('register_form')}
                className="font-extrabold text-[#FF1680] hover:text-[#853BFF] underline underline-offset-4 cursor-pointer"
              >
                Tạo tài khoản mới
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 2: ĐĂNG KÝ TÀI KHOẢN — BƯỚC 1 NHẬP THÔNG TIN                   */}
        {/* =================================================================== */}
        {view === 'register_form' && (
          <form onSubmit={handleSendRegisterOtp} className="relative z-10 space-y-3.5">
            <div>
              <label className="block text-xs font-extrabold text-[#29104E] mb-1">Họ và tên hiển thị</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Minh Thư"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/95 border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-xs sm:text-sm font-semibold text-[#29104E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#29104E] mb-1">
                Địa chỉ email <span className="text-[#FF1680]">(để nhận mã xác nhận)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="tenban@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/95 border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-xs sm:text-sm font-semibold text-[#29104E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#29104E] mb-1">
                Số điện thoại / Zalo <span className="text-[#8E7398] font-medium">(Tùy chọn)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/95 border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-xs sm:text-sm font-semibold text-[#29104E]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-extrabold text-[#29104E]">Mật khẩu bảo mật</label>
                <span className="text-[11px] font-extrabold" style={{ color: passwordStrength.color }}>
                  Độ mạnh: {passwordStrength.label}
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showRegPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/95 border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-xs sm:text-sm font-semibold text-[#29104E]"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9B7AA8] hover:text-[#29104E] cursor-pointer"
                >
                  {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Thanh đo độ mạnh mật khẩu 4 vạch */}
              <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor:
                        passwordStrength.score >= level ? passwordStrength.color : 'rgba(220, 195, 232, 0.5)'
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              style={{
                background: 'linear-gradient(90deg, #FF1680 0%, #FF4FA3 50%, #853BFF 100%)',
                boxShadow: '0 12px 26px -6px rgba(255, 22, 128, 0.45)'
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang gửi mã đến email...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Gửi mã xác nhận</span>
                </>
              )}
            </button>

            <div className="pt-1 text-center text-xs font-semibold text-[#61476B]">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="font-extrabold text-[#FF1680] hover:text-[#853BFF] underline underline-offset-4 cursor-pointer"
              >
                Quay lại Đăng nhập
              </button>
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* VIEW 3: ĐĂNG KÝ TÀI KHOẢN — BƯỚC 2 NHẬP 6 SỐ OTP                    */}
        {/* =================================================================== */}
        {view === 'register_otp' && (
          <form onSubmit={handleVerifyRegisterOtp} className="relative z-10 space-y-4">
            {/* Hộp thư OTP Demo/Localhost nếu chưa cấu hình SMTP ngoài */}
            {devOtpPreview && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FFF0F8] via-[#F6EEFF] to-[#FFF0F8] border-[1.5px] border-dashed border-[#FF1680] flex items-center justify-between gap-3">
                <div className="text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#853BFF] block">
                    📩 Mã xác nhận của bạn
                  </span>
                  <span className="text-xs font-bold text-[#29104E]">
                    Mã xác thực của bạn:{' '}
                    <strong className="text-base font-black tracking-widest text-[#FF1680]">{devOtpPreview}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fillDevOtp(devOtpPreview)}
                  className="px-3 py-1.5 rounded-xl bg-[#FF1680] hover:bg-[#D9006C] text-white text-[11px] font-extrabold flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Điền nhanh</span>
                </button>
              </div>
            )}

            {/* 6 Ô Nhập OTP Pha Lê */}
            <div>
              <label className="block text-xs font-extrabold text-center text-[#29104E] mb-2.5">
                Nhập mã xác nhận gồm 6 chữ số
              </label>
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5 max-w-[330px] mx-auto">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="w-full aspect-square rounded-2xl bg-white border-2 border-[#E8C5F0] focus:border-[#FF1680] focus:ring-4 focus:ring-[#FF1680]/15 text-center text-lg sm:text-xl font-black text-[#29104E] outline-none shadow-2xs transition-all"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || otpDigits.join('').length !== 6}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{
                background: 'linear-gradient(90deg, #FF1680 0%, #FF4FA3 50%, #853BFF 100%)',
                boxShadow: '0 12px 26px -6px rgba(255, 22, 128, 0.45)'
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang kích hoạt tài khoản...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Xác nhận và tạo tài khoản</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs font-bold pt-1">
              <button
                type="button"
                onClick={() => switchView('register_form')}
                className="text-[#61476B] hover:text-[#29104E] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sửa thông tin</span>
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || submitting}
                onClick={() => handleSendRegisterOtp()}
                className="text-[#FF1680] hover:text-[#853BFF] disabled:text-[#A68BB2] cursor-pointer"
              >
                {resendCooldown > 0 ? `Gửi lại mã sau (${resendCooldown}s)` : 'Gửi lại mã xác nhận'}
              </button>
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* VIEW 4: QUÊN MẬT KHẨU — BƯỚC 1 NHẬP EMAIL NHẬN OTP                  */}
        {/* =================================================================== */}
        {view === 'forgot_email' && (
          <form onSubmit={handleSendForgotOtp} className="relative z-10 space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-[#29104E] mb-1.5">
                Địa chỉ Email tài khoản của bạn
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Nhập email đã đăng ký..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/95 border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-xs sm:text-sm font-semibold text-[#29104E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              style={{
                background: 'linear-gradient(90deg, #FF1680 0%, #FF4FA3 50%, #853BFF 100%)',
                boxShadow: '0 12px 26px -6px rgba(255, 22, 128, 0.45)'
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang gửi mã khôi phục...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Gửi mã khôi phục mật khẩu</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => switchView('login')}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#61476B] hover:text-[#FF1680] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại màn hình Đăng nhập</span>
              </button>
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* VIEW 5: QUÊN MẬT KHẨU — BƯỚC 2 NHẬP OTP & ĐẶT MẬT KHẨU MỚI         */}
        {/* =================================================================== */}
        {view === 'forgot_reset' && (
          <form onSubmit={handleResetPasswordSubmit} className="relative z-10 space-y-3.5">
            {devOtpPreview && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#FFF0F8] via-[#F6EEFF] to-[#FFF0F8] border-[1.5px] border-dashed border-[#FF1680] flex items-center justify-between gap-2">
                <div className="text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#853BFF] block">
                    📩 Mã khôi phục của bạn
                  </span>
                  <span className="text-xs font-bold text-[#29104E]">
                    Mã xác nhận: <strong className="text-base font-black tracking-widest text-[#FF1680]">{devOtpPreview}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fillDevOtp(devOtpPreview)}
                  className="px-3 py-1.5 rounded-xl bg-[#FF1680] text-white text-[11px] font-extrabold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Điền nhanh</span>
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-extrabold text-center text-[#29104E] mb-2">
                Mã xác nhận gồm 6 chữ số
              </label>
              <div className="grid grid-cols-6 gap-2 max-w-[320px] mx-auto">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="w-full aspect-square rounded-2xl bg-white border-2 border-[#E8C5F0] focus:border-[#FF1680] text-center text-lg font-black text-[#29104E] outline-none"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#29104E] mb-1">Mật khẩu mới</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/95 border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-xs sm:text-sm font-semibold text-[#29104E]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9B7AA8] cursor-pointer"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#29104E] mb-1">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9B7AA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/95 border-[1.5px] border-[#E8C5F0] focus:border-[#FF1680] outline-none text-xs sm:text-sm font-semibold text-[#29104E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || otpDigits.join('').length !== 6}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{
                background: 'linear-gradient(90deg, #FF1680 0%, #FF4FA3 50%, #853BFF 100%)',
                boxShadow: '0 12px 26px -6px rgba(255, 22, 128, 0.45)'
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang cập nhật mật khẩu...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Xác nhận và lưu mật khẩu mới</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs font-bold pt-1">
              <button
                type="button"
                onClick={() => switchView('forgot_email')}
                className="text-[#61476B] hover:text-[#29104E] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Đổi Email</span>
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || submitting}
                onClick={() => handleSendForgotOtp()}
                className="text-[#FF1680] hover:text-[#853BFF] disabled:text-[#A68BB2] cursor-pointer"
              >
                {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại mã xác nhận'}
              </button>
            </div>
          </form>
        )}

        <div className="relative z-10 mt-5 border-t border-[#F2D5EB] pt-3.5 text-center text-[11px] font-semibold text-[#7A5E85]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00C896]" />
            Thông tin tài khoản của bạn được bảo vệ
          </span>
        </div>
      </div>
    </div>
  );
}
