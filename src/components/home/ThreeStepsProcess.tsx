'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ThreeStepsProcessProps {
  totalTemplates?: number;
}

interface StepData {
  id: number;
  stepNum: string;
  title: string;
  desc: string;
  badge: string;
  iconSrc: string;
  theme: {
    name: 'pink' | 'purple' | 'mint';
    primary: string;
    light: string;
    softBg: string;
    glow: string;
    glowSoft: string;
    border: string;
    borderActive: string;
    hudColor: string;
    capsuleGrad: string;
    badgeBorder: string;
    badgeText: string;
  };
}

const STEPS: StepData[] = [
  {
    id: 1,
    stepNum: '01',
    title: 'Chọn mẫu yêu thích',
    desc: 'Chọn mẫu đang có trình tạo và trang quà chạy trực tiếp trên TriKun.',
    badge: '💖 Mẫu TriKun đang hoạt động ✨',
    iconSrc: '/images/3d-icons/icon_1_glossy.png',
    theme: {
      name: 'pink',
      primary: '#FF176B',
      light: '#FF8FBC',
      softBg: '#FFF0F6',
      glow: 'rgba(255, 23, 107, 0.45)',
      glowSoft: 'rgba(255, 75, 140, 0.18)',
      border: 'rgba(255, 120, 170, 0.55)',
      borderActive: '#FF2D75',
      hudColor: '#FF2D75',
      capsuleGrad: 'from-[#FF176B] to-[#FF4F8E]',
      badgeBorder: '#FFB3D1',
      badgeText: '#FF176B'
    }
  },
  {
    id: 2,
    stepNum: '02',
    title: 'Cá nhân hóa',
    desc: 'Thêm tên người thương, ảnh kỷ niệm, thư tình viết tay, nhạc nền và mật khẩu riêng tư.',
    badge: '💖 Tự do tải ảnh đôi & viết lời chúc 💌',
    iconSrc: '/images/3d-icons/icon_2_glossy.png',
    theme: {
      name: 'purple',
      primary: '#9654F4',
      light: '#DDD6FE',
      softBg: '#F7F0FF',
      glow: 'rgba(150, 84, 244, 0.45)',
      glowSoft: 'rgba(168, 85, 247, 0.18)',
      border: 'rgba(175, 115, 255, 0.55)',
      borderActive: '#A855F7',
      hudColor: '#A855F7',
      capsuleGrad: 'from-[#8B5CF6] to-[#A855F7]',
      badgeBorder: '#DDD6FE',
      badgeText: '#8B5CF6'
    }
  },
  {
    id: 3,
    stepNum: '03',
    title: 'Gửi link & mã QR',
    desc: 'Nhận link riêng siêu tốc và mã QR trái tim để gửi qua Zalo, Messenger hoặc in lên thiệp tặng.',
    badge: '💖 Quét mã mở bất ngờ trong 30s 🎁',
    iconSrc: '/images/3d-icons/icon_3_glossy.png',
    theme: {
      name: 'mint',
      primary: '#16BFA1',
      light: '#A7F3D0',
      softBg: '#EFFCF9',
      glow: 'rgba(22, 191, 161, 0.45)',
      glowSoft: 'rgba(32, 201, 151, 0.18)',
      border: 'rgba(50, 210, 165, 0.55)',
      borderActive: '#20C997',
      hudColor: '#20C997',
      capsuleGrad: 'from-[#059669] to-[#20C997]',
      badgeBorder: '#A7F3D0',
      badgeText: '#0D9488'
    }
  }
];

export default function ThreeStepsProcess({ totalTemplates = 91 }: ThreeStepsProcessProps) {
  // activeStep: 1 | 2 | 3 | 0 (0 = All gentle active during 7.5s - 9.0s reset window)
  const [activeStep, setActiveStep] = useState<number>(1);
  const [pulseEnergy1To2, setPulseEnergy1To2] = useState<boolean>(false);
  const [pulseEnergy2To3, setPulseEnergy2To3] = useState<boolean>(false);
  const [shockwaveCard, setShockwaveCard] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef<boolean>(true);

  // Auto Infinite Loop 9 Giây:
  // 0.0 - 2.5s: Card 01 active, LED chạy, bệ 01 bừng sáng, icon nổi lên.
  //             1.8s - 2.5s: Năng lượng bắn 01 -> 02.
  // 2.5 - 5.0s: Năng lượng tới Card 02 (shockwave). Card 02 sáng tím, icon sổ bút nổi lên, bệ 02 bừng sáng.
  //             4.3s - 5.0s: Năng lượng bắn 02 -> 03.
  // 5.0 - 7.5s: Năng lượng tới Card 03 (shockwave). Card 03 sáng mint, icon QR nổi lên, bệ 03 bừng sáng.
  // 7.5 - 9.0s: Cả 3 card cùng sáng nhẹ hài hòa, quay về bước 01.
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => observer.disconnect();
    }

    const CYCLE_MS = 9000;
    const startTime = performance.now();

    const tick = (now: number) => {
      if (isVisibleRef.current) {
        const elapsed = (now - startTime) % CYCLE_MS;

        if (elapsed < 2500) {
          setActiveStep(1);
          setPulseEnergy1To2(elapsed > 1700);
          setPulseEnergy2To3(false);
          setShockwaveCard(0);
        } else if (elapsed < 5000) {
          setActiveStep(2);
          setPulseEnergy1To2(false);
          setPulseEnergy2To3(elapsed > 4200);
          if (elapsed < 2900) {
            setShockwaveCard(2);
          } else {
            setShockwaveCard(0);
          }
        } else if (elapsed < 7500) {
          setActiveStep(3);
          setPulseEnergy1To2(false);
          setPulseEnergy2To3(false);
          if (elapsed < 5400) {
            setShockwaveCard(3);
          } else {
            setShockwaveCard(0);
          }
        } else {
          setActiveStep(0);
          setPulseEnergy1To2(false);
          setPulseEnergy2To3(false);
          setShockwaveCard(0);
        }
      }

    };

    const timerId = window.setInterval(() => tick(performance.now()), 120);
    tick(performance.now());

    return () => {
      window.clearInterval(timerId);
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full max-w-[1240px] mx-auto rounded-[32px] sm:rounded-[38px] px-4 py-4 sm:px-7 sm:py-5 border-2 border-[#FF4F8E]/80 shadow-[0_12px_40px_-10px_rgba(255,75,150,0.28),inset_0_0_20px_rgba(255,255,255,0.85)] overflow-hidden transition-all duration-500"
      style={{
        background: 'rgba(255, 246, 253, 0.85)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <style>{`
        @keyframes holoSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes holoSpinRev {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes ledBorderRun {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
        @keyframes beamEnergyFly {
          0% { stroke-dashoffset: 120; opacity: 0.2; }
          40% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes floatIconSmooth {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-5px) scale(1.03); }
        }
        @keyframes shockwaveExpand {
          0% { transform: scale(0.96); opacity: 0.85; }
          100% { transform: scale(1.04); opacity: 0; }
        }
        @keyframes holoPillarPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.85; }
        }
        @keyframes holoDashFwd {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 160; }
        }
        @keyframes holoDashRev {
          0% { stroke-dashoffset: 160; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes waveGlowGlider {
          0% { stroke-dashoffset: 600; }
          100% { stroke-dashoffset: 0; }
        }
        .holo-spin { animation: holoSpin 10s linear infinite; }
        .holo-spin-rev { animation: holoSpinRev 12s linear infinite; }
        .float-icon { animation: floatIconSmooth 3.2s ease-in-out infinite; }
        .led-active-border {
          stroke-dasharray: 22 78;
          animation: ledBorderRun 2.2s linear infinite;
        }
        .beam-energy-active {
          stroke-dasharray: 35 120;
          animation: beamEnergyFly 0.75s ease-out infinite;
        }
        .holo-pillar-glow {
          animation: holoPillarPulse 2.2s ease-in-out infinite;
        }
        .holo-dash-fwd {
          animation: holoDashFwd 8s linear infinite;
        }
        .holo-dash-rev {
          animation: holoDashRev 10s linear infinite;
        }
      `}</style>

      {/* SVG GRADIENT DEFINITIONS */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="ledPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#FF176B" />
            <stop offset="100%" stopColor="#FF6B9D" />
          </linearGradient>
          <linearGradient id="ledPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#C4B5FD" />
          </linearGradient>
          <linearGradient id="ledMintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#20C997" />
            <stop offset="100%" stopColor="#6EE7B7" />
          </linearGradient>

          <linearGradient id="beam1to2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF176B" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <linearGradient id="beam2to3Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#20C997" />
          </linearGradient>

          <linearGradient id="bowSatinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#FFB8D5" />
            <stop offset="65%" stopColor="#FF4F8E" />
            <stop offset="100%" stopColor="#FF176B" />
          </linearGradient>
        </defs>
      </svg>

      {/* CHIẾC NƠ HỒNG SATIN 3D Ở GÓC TRÊN BÊN PHẢI (GỌN GÀNG, ĐẸP MẮT) */}
      <div className="absolute top-1.5 right-2 sm:top-2 sm:right-5 z-30 pointer-events-none select-none">
        <svg viewBox="0 0 100 80" className="w-14 h-11 sm:w-17 sm:h-14 drop-shadow-[0_4px_10px_rgba(255,23,107,0.35)]">
          <path d="M50 35 C35 12, 6 16, 16 42 C26 59, 44 44, 50 35 Z" fill="url(#bowSatinGrad)" />
          <path d="M50 35 C65 12, 94 16, 84 42 C74 59, 56 44, 50 35 Z" fill="url(#bowSatinGrad)" />
          <path d="M46 38 C33 58, 16 74, 11 82 C23 76, 33 72, 48 42 Z" fill="url(#bowSatinGrad)" opacity="0.94" />
          <path d="M54 38 C67 58, 84 74, 89 82 C77 76, 67 72, 52 42 Z" fill="url(#bowSatinGrad)" opacity="0.94" />
          <circle cx="50" cy="35" r="7.5" fill="#FFFFFF" filter="drop-shadow(0 2px 3px rgba(255,23,107,0.4))" />
          <circle cx="50" cy="35" r="6" fill="url(#bowSatinGrad)" />
        </svg>
      </div>

      {/* HEADER SECTION GỌN GÀNG, VỪA KHUNG MÀN HÌNH */}
      <div className="text-center space-y-1 mb-3.5 sm:mb-4.5 relative z-20">
        {/* Tầng 1: Dòng chữ thư pháp Dancing Script */}
        <div className="font-calligraphy text-xl sm:text-2xl text-[#F21879] font-bold select-none flex items-center justify-center gap-1.5 leading-none">
          <span className="text-sm sm:text-base animate-pulse">💕</span>
          <span>3 bước gửi trọn yêu thương</span>
          <span className="text-sm sm:text-base animate-pulse">💕</span>
        </div>

        {/* Tầng 2: Capsule QUY TRÌNH SIÊU ĐƠN GIẢN */}
        <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white/95 border border-[#FF8FBC]/80 text-[10px] sm:text-[10.5px] font-extrabold text-[#FF176B] shadow-2xs backdrop-blur-md">
          <span className="text-amber-500 text-[11px]">⚡</span>
          <span className="tracking-wider uppercase">QUY TRÌNH SIÊU ĐƠN GIẢN</span>
        </div>

        {/* Tầng 3: Main Heading */}
        <div className="space-y-0.5">
          <h2 className="text-xl sm:text-2xl lg:text-[27px] font-extrabold text-[#30142F] tracking-tight leading-tight">
            Tạo Quà Tặng Chưa Bao Giờ{' '}
            <span className="italic bg-gradient-to-r from-[#FF176B] via-[#E91E78] to-[#9654F4] bg-clip-text text-transparent">
              Dễ Đến Thế
            </span>
          </h2>
          {/* Đường cong hồng kết thúc bằng trái tim nhỏ */}
          <div className="flex justify-center -mt-0.5 select-none">
            <svg viewBox="0 0 160 20" className="w-24 sm:w-28 h-3 text-[#FF2D75]">
              <path d="M10 10 Q 75 18 135 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M142 8 C140 5, 137 6, 137 9 C137 12, 142 15, 142 15 C142 15, 147 12, 147 9 C147 6, 144 5, 142 8 Z" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHỐI 3 CARD HOLOGRAM 3D CÙNG HỆ THỐNG ĐƯỜNG LED NỐI VÀ BỆ ĐỠ PHÁT SÁNG       */}
      {/* ========================================================================= */}
      <div className="relative z-20">
        {/* LƯỚI 3 CARD TỈ LỆ GỌN GÀNG, VỪA KHUNG MỘT MÀN HÌNH */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {STEPS.map((step, idx) => {
            const isActive = activeStep === step.id || activeStep === 0;
            const isShockwave = shockwaveCard === step.id;

            return (
              <div key={step.id} className={`relative flex flex-col items-center reveal-scale reveal-delay-${step.id}`}>
                {/* CARD CHÍNH GLASSMORPHISM 3D (TỐI ƯU CHIỀU CAO & PADDING GỌN) */}
                <div
                  className={`relative w-full rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 flex flex-col justify-between min-h-[265px] sm:min-h-[280px] transition-all duration-500 ease-out overflow-hidden ${
                    isActive
                      ? '-translate-y-2 shadow-[0_16px_36px_-8px_rgba(255,100,160,0.28)]'
                      : 'shadow-[0_8px_20px_-6px_rgba(255,100,160,0.1)] hover:-translate-y-0.5'
                  }`}
                  style={{
                    background:
                      step.id === 1
                        ? 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,246,251,0.94) 50%, rgba(255,238,248,0.88) 100%)'
                        : step.id === 2
                        ? 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,246,255,0.94) 50%, rgba(246,238,255,0.88) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,253,250,0.94) 50%, rgba(228,252,246,0.88) 100%)',
                    backdropFilter: 'blur(18px)',
                    border: `1.8px solid ${isActive ? step.theme.borderActive : step.theme.border}`,
                    boxShadow: isActive
                      ? `0 0 24px ${step.theme.glow}, 0 12px 30px -8px ${step.theme.glow}, inset 0 1.5px 2px rgba(255,255,255,0.95)`
                      : `0 4px 15px rgba(0,0,0,0.03), 0 0 10px ${step.theme.glowSoft}, inset 0 1px 1.5px rgba(255,255,255,0.9)`
                  }}
                >
                  {/* VIỀN LED CHẠY QUANH BỐN CẠNH (DỊU MẮT, MƯỢT MÀ) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[inherit] overflow-visible">
                    {isActive && (
                      <rect
                        x="1.5"
                        y="1.5"
                        width="calc(100% - 3px)"
                        height="calc(100% - 3px)"
                        rx="24"
                        fill="none"
                        stroke={
                          step.id === 1
                            ? 'url(#ledPinkGrad)'
                            : step.id === 2
                            ? 'url(#ledPurpleGrad)'
                            : 'url(#ledMintGrad)'
                        }
                        strokeWidth="2.8"
                        pathLength="100"
                        className="led-active-border"
                        style={{
                          filter: `drop-shadow(0 0 6px ${step.theme.primary}) drop-shadow(0 0 10px ${step.theme.primary})`
                        }}
                      />
                    )}
                  </svg>

                  {/* SHOCKWAVE PULSE MỀM MẠI KHI NĂNG LƯỢNG TỚI CARD */}
                  {isShockwave && (
                    <div
                      className="absolute inset-0 rounded-[26px] pointer-events-none"
                      style={{
                        boxShadow: `0 0 35px 12px ${step.theme.primary}`,
                        animation: 'shockwaveExpand 0.5s ease-out forwards'
                      }}
                    />
                  )}

                  {/* NỘI DUNG CARD */}
                  <div className="relative z-10">
                    {/* HÀNG TRÊN: ICON 3D GLOSSY GỌN 75-85px + CAPSULE SỐ THỨ TỰ */}
                    <div className="flex items-start justify-between gap-2.5 mb-3">
                      {/* KHỐI ICON 3D TỰ DO VỚI VÒNG HUD NHẸ NHÀNG */}
                      <div className="relative w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center">
                        {/* Vòng Hologram HUD xoay */}
                        <div
                          className={`absolute inset-0 rounded-full border border-dashed transition-opacity duration-500 ${
                            isActive ? 'opacity-90 holo-spin' : 'opacity-35'
                          }`}
                          style={{
                            borderColor: step.theme.hudColor,
                            boxShadow: isActive ? `0 0 10px ${step.theme.glow}` : undefined
                          }}
                        />
                        <div
                          className={`absolute inset-2 rounded-full border border-dotted transition-opacity duration-500 ${
                            isActive ? 'opacity-85 holo-spin-rev' : 'opacity-25'
                          }`}
                          style={{ borderColor: step.theme.light }}
                        />

                        {/* Ánh hào quang tỏa nhẹ */}
                        {isActive && (
                          <div
                            className="absolute inset-2 rounded-full blur-lg pointer-events-none transition-all duration-500"
                            style={{ background: step.theme.glow }}
                          />
                        )}

                        {/* ICON GLOSSY 3D */}
                        <img
                          src={step.iconSrc}
                          alt={step.title}
                          className={`relative z-10 w-18 h-18 sm:w-20 sm:h-20 object-contain pointer-events-none select-none drop-shadow-[0_6px_14px_rgba(0,0,0,0.16)] transition-all duration-500 ${
                            isActive ? 'float-icon -translate-y-1 scale-106' : 'scale-100 opacity-95'
                          }`}
                        />
                      </div>

                      {/* CAPSULE SỐ THỨ TỰ 01, 02, 03 */}
                      <div
                        className={`px-3 py-0.5 rounded-full text-white font-black text-[11px] sm:text-xs tracking-wider transition-all duration-300 shadow-xs ${
                          isActive ? 'scale-105' : 'opacity-90'
                        } bg-gradient-to-r ${step.theme.capsuleGrad}`}
                        style={{
                          boxShadow: isActive ? `0 0 12px ${step.theme.glow}` : undefined
                        }}
                      >
                        {step.stepNum}
                      </div>
                    </div>

                    {/* TIÊU ĐỀ & MÔ TẢ */}
                    <div className="space-y-1 mb-3">
                      <h3 className="font-extrabold text-[17px] sm:text-[18px] text-[#2D1230] tracking-tight leading-snug">
                        {step.title}
                      </h3>
                      <p className="text-[12px] sm:text-[12.5px] text-[#55405A] leading-[1.55] font-medium">
                        {step.id === 1 ? (
                          <>
                            <span className="font-bold text-[#FF176B]">{totalTemplates}</span> mẫu trái tim 3D, thiệp, vũ trụ sao rơi, hoa tình yêu… chia theo từng dịp đặc biệt.
                          </>
                        ) : (
                          step.desc
                        )}
                      </p>
                    </div>
                  </div>

                  {/* BADGE CUỐI CARD (PILL VIỀN GỌN GÀNG) */}
                  <div className="pt-2.5 border-t border-black/5 relative z-10">
                    <div
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[10.5px] font-bold transition-all duration-300 ${
                        isActive ? 'scale-102 shadow-2xs' : ''
                      }`}
                      style={{
                        background: step.theme.softBg,
                        borderColor: step.theme.badgeBorder,
                        color: step.theme.badgeText,
                        boxShadow: isActive ? `0 0 8px ${step.theme.glowSoft}` : undefined
                      }}
                    >
                      <span>{step.badge}</span>
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* NÚT TRÒN KÍNH >> VÀ ĐƯỜNG NĂNG LƯỢNG NỐI TRỰC TIẾP GIỮA CÁC CARD          */}
                {/* ========================================================================= */}
                {idx < 2 && (
                  <div className="hidden lg:block absolute -right-6 top-[42%] -translate-y-1/2 z-30 pointer-events-none">
                    <svg className="w-12 h-8 overflow-visible">
                      <line
                        x1="-8"
                        y1="16"
                        x2="56"
                        y2="16"
                        stroke={step.theme.primary}
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        strokeOpacity="0.4"
                      />
                      {(idx === 0 && pulseEnergy1To2) && (
                        <line
                          x1="-8"
                          y1="16"
                          x2="56"
                          y2="16"
                          stroke="url(#beam1to2Grad)"
                          strokeWidth="3.5"
                          className="beam-energy-active"
                          style={{ filter: 'drop-shadow(0 0 6px #FF176B) drop-shadow(0 0 10px #FFFFFF)' }}
                        />
                      )}
                      {(idx === 1 && pulseEnergy2To3) && (
                        <line
                          x1="-8"
                          y1="16"
                          x2="56"
                          y2="16"
                          stroke="url(#beam2to3Grad)"
                          strokeWidth="3.5"
                          className="beam-energy-active"
                          style={{ filter: 'drop-shadow(0 0 6px #A855F7) drop-shadow(0 0 10px #FFFFFF)' }}
                        />
                      )}
                    </svg>

                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/95 backdrop-blur-md border border-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex items-center justify-center pointer-events-none"
                      style={{
                        boxShadow: isActive ? `0 0 10px ${step.theme.glow}` : undefined
                      }}
                    >
                      <span
                        className="font-black text-[10px] leading-none select-none"
                        style={{ color: step.theme.primary }}
                      >
                        »
                      </span>
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* BỆ HOLOGRAM PHÁT SÁNG NGAY DƯỚI CARD (TỈ LỆ THẤP GỌN, CHUẨN 1 MÀN HÌNH) */}
                {/* ========================================================================= */}
                <div className="relative w-full flex flex-col items-center justify-center pt-1.5 pb-0.5">
                  <svg viewBox="0 0 200 48" className="w-44 sm:w-50 h-10 sm:h-11 overflow-visible pointer-events-none">
                    <defs>
                      <linearGradient id={`holoBeam-${step.id}`} x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor={step.theme.primary} stopOpacity={isActive ? 0.5 : 0.12} />
                        <stop offset="50%" stopColor={step.theme.light} stopOpacity={isActive ? 0.2 : 0.04} />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Cột sáng mờ hắt từ bệ lên card */}
                    <polygon
                      points="35,0 165,0 185,28 15,28"
                      fill={`url(#holoBeam-${step.id})`}
                      className={isActive ? 'holo-pillar-glow' : undefined}
                      opacity={isActive ? 0.9 : 0.25}
                    />

                    {/* Vòng 1: Ngoài (nét đứt xoay ngược chiều) */}
                    <ellipse
                      cx="100"
                      cy="28"
                      rx="75"
                      ry="16"
                      fill="none"
                      stroke={step.theme.primary}
                      strokeWidth="1.5"
                      strokeDasharray="5 6"
                      className="holo-dash-rev"
                      strokeOpacity={isActive ? 0.9 : 0.3}
                      style={{
                        filter: isActive ? `drop-shadow(0 0 8px ${step.theme.primary})` : undefined
                      }}
                    />

                    {/* Vòng 2: Giữa (nét viền neon phát sáng) */}
                    <ellipse
                      cx="100"
                      cy="28"
                      rx="55"
                      ry="12"
                      fill={isActive ? step.theme.glowSoft : 'none'}
                      stroke={step.theme.primary}
                      strokeWidth="2"
                      strokeOpacity={isActive ? 1 : 0.4}
                      style={{
                        filter: isActive ? `drop-shadow(0 0 10px ${step.theme.primary})` : undefined
                      }}
                    />

                    {/* Vòng 3: Trong (nét chấm xoay thuận chiều) */}
                    <ellipse
                      cx="100"
                      cy="28"
                      rx="36"
                      ry="8"
                      fill="none"
                      stroke={step.theme.light}
                      strokeWidth="1.3"
                      strokeDasharray="3 4"
                      className="holo-dash-fwd"
                      strokeOpacity={isActive ? 0.95 : 0.35}
                    />
                  </svg>

                  {/* NÚT TRÒN SỐ 1, 2, 3 NỔI Ở TÂM BỆ HOLOGRAM */}
                  <div
                    className={`absolute top-[26px] sm:top-[27px] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full text-white font-black text-xs flex items-center justify-center select-none transition-all duration-300 shadow-xs ${
                      isActive ? 'scale-110' : 'opacity-85 scale-100'
                    } bg-gradient-to-tr ${step.theme.capsuleGrad}`}
                    style={{
                      boxShadow: isActive
                        ? `0 0 16px ${step.theme.primary}, 0 2px 8px rgba(0,0,0,0.2)`
                        : `0 2px 6px ${step.theme.glowSoft}`
                    }}
                  >
                    {step.id}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ĐƯỜNG SÓNG NĂNG LƯỢNG NỐI CÁC BỆ HOLOGRAM DƯỚI ĐÁY */}
        <div className="hidden lg:block relative -mt-4 pointer-events-none select-none z-10">
          <svg viewBox="0 0 1000 24" className="w-full h-6 overflow-visible">
            <path
              d="M 170 12 Q 335 3 500 12 T 830 12"
              fill="none"
              stroke="url(#ledPinkGrad)"
              strokeWidth="2"
              strokeOpacity="0.4"
            />
            <path
              d="M 170 12 Q 335 3 500 12 T 830 12"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.4"
              strokeDasharray="50 250"
              style={{
                animation: 'waveGlowGlider 3s linear infinite',
                filter: 'drop-shadow(0 0 6px #FF176B) drop-shadow(0 0 10px #A855F7)'
              }}
            />
          </svg>
        </div>
      </div>

      {/* DÒNG CHỮ NGHỆ THUẬT CHÂN TRANG KHUNG KÍNH */}
      <div className="mt-3.5 pt-2.5 border-t border-[#FFCCD9]/30 flex flex-col sm:flex-row items-center justify-between gap-1.5 select-none relative z-20">
        <span className="font-calligraphy text-base sm:text-lg text-[#FF2D75] font-bold drop-shadow-2xs">
          ~ Xu hướng quà tặng số 2026 ~
        </span>
        <div className="inline-flex items-center gap-1 text-[10px] sm:text-[10.5px] font-bold text-[#9654F4] bg-white/85 px-3 py-1 rounded-full border border-[#DDD6FE]/80 shadow-2xs backdrop-blur-sm">
          <span className="text-amber-500 text-xs">✨</span>
          <span>Tạo và chia sẻ món quà của riêng bạn</span>
          <span className="text-pink-500">💕</span>
        </div>
      </div>
    </section>
  );
}
