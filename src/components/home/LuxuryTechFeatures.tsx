'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Zap,
  QrCode,
  Music,
  Lock,
  Palette,
  ShieldCheck,
  ArrowRight,
  type LucideIcon
} from 'lucide-react';

interface FeatureItem {
  id: string;
  title: string;
  desc: string;
  badgeText: string;
  badgeSymbol: string;
  Icon: LucideIcon;
  accent: {
    main: string;
    bright: string;
    lightTop: string;
    soft: string;
    deep: string;
    extrude1: string;
    extrude2: string;
    extrude3: string;
    glow: string;
    glowStrong: string;
    cardLeftAura: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    badgeIconBg: string;
    crystalTint: string;
    crystalEdge: string;
    floatDuration: string;
    floatDelay: string;
    ledDuration: string;
    ledDelay: string;
    sweepDelay: string;
  };
}

const FEATURES: FeatureItem[] = [
  {
    id: 'fast-30s',
    title: 'Tạo siêu tốc 30s',
    desc: 'Không cần tài khoản. Nhập lời chúc, chọn nhạc là có link ngay.',
    badgeText: 'Siêu nhanh',
    badgeSymbol: '⚡',
    Icon: Zap,
    accent: {
      main: '#FF1680',
      bright: '#FF6EC7',
      lightTop: '#FFD6EE',
      soft: '#FFB5E0',
      deep: '#9E004B',
      extrude1: '#D6006B',
      extrude2: '#A80052',
      extrude3: '#750038',
      glow: 'rgba(255, 22, 128, 0.36)',
      glowStrong: 'rgba(255, 22, 128, 0.72)',
      cardLeftAura: 'rgba(255, 45, 145, 0.16)',
      badgeBg: 'linear-gradient(90deg, rgba(255, 218, 238, 0.94) 0%, rgba(255, 238, 248, 0.96) 100%)',
      badgeBorder: 'rgba(255, 22, 128, 0.5)',
      badgeText: '#3B0A2A',
      badgeIconBg: 'linear-gradient(135deg, #FF1680 0%, #FF55A8 100%)',
      crystalTint: 'rgba(255, 22, 128, 0.22)',
      crystalEdge: 'rgba(255, 110, 185, 0.85)',
      floatDuration: '3.4s',
      floatDelay: '0s',
      ledDuration: '5.8s',
      ledDelay: '0s',
      sweepDelay: '0.4s'
    }
  },
  {
    id: 'art-qr',
    title: 'Mã QR nghệ thuật',
    desc: 'QR trái tim lồng ảnh đôi để in lên thiệp, cốc, móc khóa.',
    badgeText: 'Độc đáo',
    badgeSymbol: '🎨',
    Icon: QrCode,
    accent: {
      main: '#853BFF',
      bright: '#B57BFF',
      lightTop: '#EDE0FF',
      soft: '#DEC4FF',
      deep: '#4A12A8',
      extrude1: '#6D28D9',
      extrude2: '#5B21B6',
      extrude3: '#3B0764',
      glow: 'rgba(133, 59, 255, 0.36)',
      glowStrong: 'rgba(133, 59, 255, 0.72)',
      cardLeftAura: 'rgba(145, 70, 255, 0.16)',
      badgeBg: 'linear-gradient(90deg, rgba(238, 224, 255, 0.94) 0%, rgba(248, 240, 255, 0.96) 100%)',
      badgeBorder: 'rgba(133, 59, 255, 0.5)',
      badgeText: '#29104E',
      badgeIconBg: 'linear-gradient(135deg, #853BFF 0%, #B56BFF 100%)',
      crystalTint: 'rgba(133, 59, 255, 0.22)',
      crystalEdge: 'rgba(175, 125, 255, 0.85)',
      floatDuration: '3.9s',
      floatDelay: '0.45s',
      ledDuration: '6.4s',
      ledDelay: '-1.2s',
      sweepDelay: '1.5s'
    }
  },
  {
    id: 'romantic-music',
    title: 'Nhạc nền lãng mạn',
    desc: 'Kho nhạc tình yêu tự phát khi người nhận mở quà.',
    badgeText: 'Cảm xúc',
    badgeSymbol: '♫',
    Icon: Music,
    accent: {
      main: '#15B8FF',
      bright: '#6FE0FF',
      lightTop: '#E0F7FF',
      soft: '#BAE6FD',
      deep: '#0369A1',
      extrude1: '#0284C7',
      extrude2: '#0369A1',
      extrude3: '#0C4A6E',
      glow: 'rgba(21, 184, 255, 0.38)',
      glowStrong: 'rgba(21, 184, 255, 0.72)',
      cardLeftAura: 'rgba(21, 184, 255, 0.16)',
      badgeBg: 'linear-gradient(90deg, rgba(212, 243, 255, 0.94) 0%, rgba(238, 250, 255, 0.96) 100%)',
      badgeBorder: 'rgba(21, 184, 255, 0.55)',
      badgeText: '#0B3B59',
      badgeIconBg: 'linear-gradient(135deg, #0284C7 0%, #15B8FF 100%)',
      crystalTint: 'rgba(21, 184, 255, 0.22)',
      crystalEdge: 'rgba(100, 210, 255, 0.85)',
      floatDuration: '3.6s',
      floatDelay: '0.9s',
      ledDuration: '6.1s',
      ledDelay: '-2.5s',
      sweepDelay: '2.6s'
    }
  },
  {
    id: 'gift-password',
    title: 'Mật khẩu mở quà',
    desc: 'Khóa món quà bằng ngày kỷ niệm hoặc câu hỏi bí mật.',
    badgeText: 'Riêng tư',
    badgeSymbol: '🔒',
    Icon: Lock,
    accent: {
      main: '#F59E0B',
      bright: '#FCD34D',
      lightTop: '#FEF3C7',
      soft: '#FDE68A',
      deep: '#92400E',
      extrude1: '#D97706',
      extrude2: '#B45309',
      extrude3: '#78350F',
      glow: 'rgba(245, 158, 11, 0.38)',
      glowStrong: 'rgba(245, 158, 11, 0.72)',
      cardLeftAura: 'rgba(245, 168, 15, 0.17)',
      badgeBg: 'linear-gradient(90deg, rgba(255, 238, 202, 0.94) 0%, rgba(255, 248, 232, 0.96) 100%)',
      badgeBorder: 'rgba(245, 158, 11, 0.58)',
      badgeText: '#4A2506',
      badgeIconBg: 'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)',
      crystalTint: 'rgba(245, 158, 11, 0.23)',
      crystalEdge: 'rgba(251, 191, 36, 0.85)',
      floatDuration: '4.1s',
      floatDelay: '0.25s',
      ledDuration: '6.8s',
      ledDelay: '-3.4s',
      sweepDelay: '1.1s'
    }
  },
  {
    id: 'webgl-3d',
    title: 'Hiệu ứng 3D WebGL',
    desc: 'Đổi màu chủ đạo, hạt trái tim, thiên hà, pháo hoa.',
    badgeText: '3D sống động',
    badgeSymbol: '★',
    Icon: Palette,
    accent: {
      main: '#FF1E8E',
      bright: '#FF75C3',
      lightTop: '#FFE0F2',
      soft: '#FBCFE8',
      deep: '#831843',
      extrude1: '#DB2777',
      extrude2: '#9D174D',
      extrude3: '#500724',
      glow: 'rgba(236, 72, 153, 0.4)',
      glowStrong: 'rgba(255, 30, 142, 0.74)',
      cardLeftAura: 'rgba(255, 35, 145, 0.16)',
      badgeBg: 'linear-gradient(90deg, rgba(255, 220, 241, 0.94) 0%, rgba(255, 238, 249, 0.96) 100%)',
      badgeBorder: 'rgba(236, 72, 153, 0.55)',
      badgeText: '#3D0B28',
      badgeIconBg: 'linear-gradient(135deg, #EC4899 0%, #FF4FA3 100%)',
      crystalTint: 'rgba(236, 72, 153, 0.22)',
      crystalEdge: 'rgba(244, 114, 182, 0.85)',
      floatDuration: '3.5s',
      floatDelay: '0.7s',
      ledDuration: '5.6s',
      ledDelay: '-4.1s',
      sweepDelay: '2.1s'
    }
  },
  {
    id: 'customize-gift',
    title: 'Tùy chỉnh quà tặng',
    desc: 'Chỉnh lời chúc, hình ảnh và cách hiển thị trong TriKun Studio.',
    badgeText: 'Linh hoạt',
    badgeSymbol: '⚙',
    Icon: ShieldCheck,
    accent: {
      main: '#00C896',
      bright: '#5EEAD4',
      lightTop: '#D1FAE5',
      soft: '#A7F3D0',
      deep: '#065F46',
      extrude1: '#059669',
      extrude2: '#047857',
      extrude3: '#064E3B',
      glow: 'rgba(0, 200, 150, 0.38)',
      glowStrong: 'rgba(0, 200, 150, 0.72)',
      cardLeftAura: 'rgba(0, 200, 150, 0.16)',
      badgeBg: 'linear-gradient(90deg, rgba(206, 251, 235, 0.94) 0%, rgba(235, 254, 246, 0.96) 100%)',
      badgeBorder: 'rgba(0, 200, 150, 0.55)',
      badgeText: '#064E3B',
      badgeIconBg: 'linear-gradient(135deg, #059669 0%, #00C896 100%)',
      crystalTint: 'rgba(0, 200, 150, 0.22)',
      crystalEdge: 'rgba(52, 211, 153, 0.85)',
      floatDuration: '3.8s',
      floatDelay: '1.1s',
      ledDuration: '6.3s',
      ledDelay: '-1.9s',
      sweepDelay: '3.2s'
    }
  }
];

const LINE1_WORDS = ['Mọi', 'thứ', 'để', 'món', 'quà'];
const LINE2_WORDS = ['thật', 'đặc', 'biệt'];

const SPARKLE_PARTICLES = [
  { top: '4%', left: '16%', size: 14, delay: '0s', dur: '4.2s' },
  { top: '9%', left: '81%', size: 16, delay: '1.1s', dur: '4.8s' },
  { top: '18%', left: '9%', size: 11, delay: '0.6s', dur: '3.9s' },
  { top: '21%', left: '89%', size: 13, delay: '1.8s', dur: '4.5s' },
  { top: '34%', left: '4%', size: 12, delay: '2.2s', dur: '5.1s' },
  { top: '36%', left: '95%', size: 14, delay: '0.9s', dur: '4.4s' },
  { top: '58%', left: '2%', size: 10, delay: '1.5s', dur: '4.7s' },
  { top: '64%', left: '97%', size: 12, delay: '2.7s', dur: '4.1s' },
  { top: '88%', left: '12%', size: 13, delay: '0.4s', dur: '4.9s' },
  { top: '91%', left: '87%', size: 15, delay: '1.9s', dur: '4.3s' }
];

export default function LuxuryTechFeatures() {
  const sectionRef = useRef<HTMLElement>(null);
  const capsuleRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const iconWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const parallaxWingLeftRef = useRef<HTMLDivElement>(null);
  const parallaxWingRightRef = useRef<HTMLDivElement>(null);
  const parallaxOrbitRef = useRef<HTMLDivElement>(null);

  const [ripples, setRipples] = useState<Record<string, { id: number; x: number; y: number }>>({});
  const prefersReducedMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotionRef.current = mediaQuery.matches;
    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    if (mediaQuery.matches) {
      return () => mediaQuery.removeEventListener('change', handleMotionChange);
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const validWords = wordRefs.current.filter(Boolean) as HTMLSpanElement[];
      const validCards = cardRefs.current.filter(Boolean) as HTMLDivElement[];

      // Animation A: Stagger Reveal for Capsule, Title words, and 6 Crystal Cards
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 86%',
          toggleActions: 'play none none none',
          once: true
        }
      });

      if (capsuleRef.current) {
        tl.fromTo(
          capsuleRef.current,
          { opacity: 0, y: 18, scale: 0.92, filter: 'blur(6px)' },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.65,
            ease: 'power3.out',
            clearProps: 'filter'
          },
          0
        );
      }

      if (validWords.length > 0) {
        tl.fromTo(
          validWords,
          { opacity: 0, y: 26, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.78,
            stagger: 0.065,
            ease: 'power3.out',
            clearProps: 'filter'
          },
          0.12
        );
      }

      if (validCards.length > 0) {
        tl.fromTo(
          validCards,
          { opacity: 0, y: 36, scale: 0.94, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.82,
            stagger: 0.1,
            ease: 'power3.out',
            clearProps: 'filter,transform'
          },
          0.38
        );
      }

      // Animation H: Subtle Scroll Parallax on decorative wings & heart orbit layer
      if (parallaxWingLeftRef.current && parallaxWingRightRef.current) {
        gsap.fromTo(
          [parallaxWingLeftRef.current, parallaxWingRightRef.current],
          { y: 14 },
          {
            y: -16,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2
            }
          }
        );
      }

      if (parallaxOrbitRef.current) {
        gsap.fromTo(
          parallaxOrbitRef.current,
          { y: 10 },
          {
            y: -12,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.5
            }
          }
        );
      }
    }, sectionRef);

    const refreshTimer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 350);

    return () => {
      window.clearTimeout(refreshTimer);
      ctx.revert();
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // A single hover transition avoids creating a new tween for every mouse event.
  const handleCardMouseEnter = useCallback((idx: number) => {
    if (prefersReducedMotionRef.current) return;
    const card = cardRefs.current[idx];
    const iconWrap = iconWrapRefs.current[idx];
    if (!card) return;
    card.style.setProperty('--spot-opacity', '1');
    gsap.to(card, {
      y: -4,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto'
    });
    if (iconWrap) {
      gsap.to(iconWrap, {
        scale: 1.04,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }, []);

  const handleCardMouseLeave = useCallback((idx: number) => {
    const card = cardRefs.current[idx];
    const iconWrap = iconWrapRefs.current[idx];
    if (!card) return;

    card.style.setProperty('--spot-opacity', '0');

    if (prefersReducedMotionRef.current) return;

    gsap.to(card, {
      y: 0,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    if (iconWrap) {
      gsap.to(iconWrap, {
        scale: 1,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }, []);

  const handleArrowClick = useCallback((e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipples((prev) => ({ ...prev, [id]: { id: Date.now(), x, y } }));
    document.getElementById('san-pham')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  let wordCounter = 0;

  return (
    <section
      ref={sectionRef}
      aria-label="Công nghệ hiện đại - Mọi thứ để món quà thật đặc biệt"
      className="tk-luxury-tech-section relative py-6 sm:py-10 select-none"
    >
      {/* Shared SVG Gradient Definitions for 3D Glossy Lucide Icons */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          {FEATURES.map((f) => (
            <linearGradient key={`iconFill-${f.id}`} id={`tkIconFill-${f.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={f.accent.lightTop} />
              <stop offset="42%" stopColor={f.accent.bright} />
              <stop offset="100%" stopColor={f.accent.main} />
            </linearGradient>
          ))}
        </defs>
      </svg>

      <style>{`
        .tk-luxury-tech-section {
          font-family: 'Be Vietnam Pro', 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .tk-serif-3d {
          font-family: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;
        }

        /* Capsule 5s light sweep */
        @keyframes tkCapsuleSweep {
          0%, 15% { transform: translateX(-160%) skewX(-25deg); opacity: 0; }
          30% { opacity: 0.95; }
          55%, 100% { transform: translateX(260%) skewX(-25deg); opacity: 0; }
        }

        /* Alternate star twinkle inside capsule */
        @keyframes tkStarPulse {
          0%, 100% { transform: scale(0.82) rotate(0deg); opacity: 0.65; }
          50% { transform: scale(1.22) rotate(20deg); opacity: 1; filter: drop-shadow(0 0 8px rgba(255, 255, 255, 1)) drop-shadow(0 0 12px #FF4FA3); }
        }

        /* Title 6s shimmer & gentle glow pulse */
        @keyframes tkTitleShimmer {
          0%, 18% { background-position: -150% 0, 0 0; }
          55%, 100% { background-position: 250% 0, 0 0; }
        }

        @keyframes tkTitleGlowPulse {
          0%, 100% { filter: drop-shadow(0 4px 12px rgba(181, 107, 255, 0.25)); }
          50% { filter: drop-shadow(0 6px 20px rgba(255, 22, 128, 0.42)); }
        }

        /* Neon ellipse magic slow motion */
        @keyframes tkEllipseDash {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -420; }
        }

        @keyframes tkEllipseBreathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(-1.2deg); opacity: 0.92; }
          50% { transform: translate(-50%, -50%) scale(1.02, 1.04) rotate(0.8deg); opacity: 1; }
        }

        /* Heart Orbit around heading */
        @keyframes tkHeartFloatOrbitA {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-10deg) scale(0.95); }
          50% { transform: translate3d(10px, -11px, 0) rotate(8deg) scale(1.08); }
        }
        @keyframes tkHeartFloatOrbitB {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(12deg) scale(1); }
          50% { transform: translate3d(-12px, -9px, 0) rotate(-8deg) scale(1.1); }
        }

        /* Animation B: Floating Crystal Icon (3-5px) */
        @keyframes tkCrystalFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4.5px); }
        }

        /* Animation C: Continuous Neon Border Spin */
        @keyframes tkNeonBorderSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        /* Animation D: Periodic Card Light Sweep */
        @keyframes tkCardLightSweep {
          0%, 25% { transform: translateX(-160%) skewX(-26deg); opacity: 0; }
          40% { opacity: 0.7; }
          65%, 100% { transform: translateX(280%) skewX(-26deg); opacity: 0; }
        }

        /* Animation F: Sparkle Particle Drift */
        @keyframes tkSparkleFloat {
          0%, 100% { transform: translateY(0) scale(0.75) rotate(0deg); opacity: 0.35; }
          50% { transform: translateY(-9px) scale(1.18) rotate(45deg); opacity: 0.95; }
        }

        /* Animation J: Continuous Ambient Glow */
        @keyframes tkAmbientGlow {
          0%, 100% { opacity: 0.55; transform: scale(0.98); }
          50% { opacity: 0.92; transform: scale(1.05); }
        }

        /* Button Click Ripple */
        @keyframes tkButtonRipple {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.75; }
          100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
        }

        /* Masked Rounded Perimeter Ring for True Curved LED Border */
        .tk-led-ring-mask {
          padding: 2.3px;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
        .tk-led-glow-mask {
          padding: 3.8px;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          filter: blur(5px);
        }

        /* 3D Extruded Typography Line 1 (Lavender -> Deep Purple) */
        .tk-word-line1-face {
          background-image:
            linear-gradient(110deg, transparent 36%, rgba(255, 255, 255, 0.92) 50%, transparent 64%),
            linear-gradient(180deg, #FFFFFF 0%, #F3DBFF 22%, #C47AFF 52%, #853BFF 78%, #5815B8 100%);
          background-size: 240% 100%, 100% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: tkTitleShimmer 6s ease-in-out infinite;
          filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.85));
        }
        .tk-word-line1-extrude {
          color: #6B21A8;
          text-shadow:
            0 1px 0 #9333EA,
            0 2px 0 #7E22CE,
            0 3px 0 #6B21A8,
            0 4px 0 #581C87,
            0 5px 0 #3B0764,
            0 8px 18px rgba(88, 28, 135, 0.48),
            0 0 26px rgba(181, 107, 255, 0.52);
        }

        /* 3D Extruded Typography Line 2 (Hot Pink -> Rose Pink) */
        .tk-word-line2-face {
          background-image:
            linear-gradient(110deg, transparent 36%, rgba(255, 255, 255, 0.95) 50%, transparent 64%),
            linear-gradient(180deg, #FFFFFF 0%, #FFD6EE 20%, #FF62B5 48%, #FF1680 78%, #C4005A 100%);
          background-size: 240% 100%, 100% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: tkTitleShimmer 6s ease-in-out infinite 0.5s;
          filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.85));
        }
        .tk-word-line2-extrude {
          color: #BE185D;
          text-shadow:
            0 1px 0 #F43F5E,
            0 2px 0 #E11D48,
            0 3px 0 #BE123C,
            0 4px 0 #9F1239,
            0 5px 0 #6B0628,
            0 8px 18px rgba(219, 39, 119, 0.5),
            0 0 28px rgba(255, 22, 128, 0.55);
        }

        @media (prefers-reduced-motion: reduce) {
          .tk-luxury-tech-section *,
          .tk-luxury-tech-section *::before,
          .tk-luxury-tech-section *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* ===================================================================== */}
      {/* DECORATIVE SPARKLE PARTICLES (BOUND strictly inside section, z-0)     */}
      {/* ===================================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {SPARKLE_PARTICLES.map((sp, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: sp.top,
              left: sp.left,
              width: sp.size,
              height: sp.size,
              animation: `tkSparkleFloat ${sp.dur} ease-in-out infinite`,
              animationDelay: sp.delay
            }}
          >
            <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible">
              <path
                d="M12 1 L14.4 9.6 L23 12 L14.4 14.4 L12 23 L9.6 14.4 L1 12 L9.6 9.6 Z"
                fill="#FFFFFF"
                style={{ filter: 'drop-shadow(0 0 5px #FF4FA3) drop-shadow(0 0 10px #B56BFF)' }}
              />
            </svg>
          </div>
        ))}
      </div>

      {/* ===================================================================== */}
      {/* 1. LUXURY 3D TYPOGRAPHY HEADING BLOCK                                 */}
      {/* ===================================================================== */}
      <div className="relative z-10 flex flex-col items-center text-center mb-10 sm:mb-13">
        {/* TOP CAPSULE: CÔNG NGHỆ HIỆN ĐẠI */}
        <div ref={capsuleRef} className="relative inline-flex items-center justify-center mb-4 sm:mb-5">
          {/* Horizontal flare lines on left & right of capsule */}
          <div
            className="hidden sm:block absolute -left-16 top-1/2 -translate-y-1/2 w-16 h-[2px] pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 110, 199, 0.85) 70%, #FFFFFF 100%)',
              filter: 'drop-shadow(0 0 6px #FF4FA3)'
            }}
          />
          <div
            className="hidden sm:block absolute -right-16 top-1/2 -translate-y-1/2 w-16 h-[2px] pointer-events-none"
            style={{
              background: 'linear-gradient(270deg, transparent 0%, rgba(181, 107, 255, 0.85) 70%, #FFFFFF 100%)',
              filter: 'drop-shadow(0 0 6px #B56BFF)'
            }}
          />

          {/* Outer soft ambient glow behind capsule */}
          <div
            className="absolute -inset-1.5 rounded-full pointer-events-none blur-md"
            style={{
              background: 'linear-gradient(90deg, rgba(181, 107, 255, 0.55), rgba(255, 79, 163, 0.55))',
              animation: 'tkAmbientGlow 4.2s ease-in-out infinite'
            }}
          />

          {/* Crystal Capsule Body */}
          <div
            className="relative inline-flex items-center gap-3 sm:gap-3.5 px-5 sm:px-7 py-2 sm:py-2.5 rounded-full overflow-hidden"
            style={{
              background:
                'linear-gradient(90deg, rgba(212, 132, 255, 0.55) 0%, rgba(255, 240, 252, 0.88) 50%, rgba(255, 130, 206, 0.58) 100%)',
              backdropFilter: 'blur(14px) saturate(150%)',
              border: '1.5px solid rgba(255, 255, 255, 0.92)',
              boxShadow:
                '0 0 0 1.5px rgba(232, 121, 249, 0.55), 0 8px 24px -4px rgba(181, 107, 255, 0.38), inset 0 2px 3px rgba(255, 255, 255, 0.95), inset 0 -1.5px 3px rgba(255, 79, 163, 0.25)'
            }}
          >
            {/* 5-second light sweep across capsule */}
            <span
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/75 to-transparent pointer-events-none"
              style={{ animation: 'tkCapsuleSweep 5s ease-in-out infinite' }}
              aria-hidden="true"
            />

            {/* Left Sparkling Star */}
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0"
              style={{ animation: 'tkStarPulse 2.4s ease-in-out infinite' }}
              aria-hidden="true"
            >
              <path
                d="M12 0 L14.8 9.2 L24 12 L14.8 14.8 L12 24 L9.2 14.8 L0 12 L9.2 9.2 Z"
                fill="#FFF7ED"
              />
              <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
            </svg>

            <span className="relative z-10 text-xs sm:text-[13.5px] font-extrabold uppercase tracking-[0.22em] text-[#29104E] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
              CÔNG NGHỆ HIỆN ĐẠI
            </span>

            {/* Right Sparkling Star (Alternating phase) */}
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0"
              style={{ animation: 'tkStarPulse 2.4s ease-in-out infinite 1.2s' }}
              aria-hidden="true"
            >
              <path
                d="M12 0 L14.8 9.2 L24 12 L14.8 14.8 L12 24 L9.2 14.8 L0 12 L9.2 9.2 Z"
                fill="#FFF7ED"
              />
              <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
            </svg>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN HEADING CONTAINER WITH NEON ELLIPSE, FAIRY WINGS & ORBIT     */}
        {/* ================================================================= */}
        <div className="relative w-full max-w-[940px] mx-auto px-2 sm:px-8 py-3 sm:py-5 flex flex-col items-center justify-center">
          {/* LAYER 1 (z-0): Soft Ambient Backlight behind Title (doesn't cover sakura bg) */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] max-w-[660px] h-[130px] rounded-full pointer-events-none z-0"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.55) 0%, rgba(255, 181, 224, 0.28) 50%, transparent 78%)',
              filter: 'blur(18px)'
            }}
            aria-hidden="true"
          />

          {/* LAYER 2 (z-0): Translucent Crystal Angel/Fairy Wings on Left & Right */}
          <div
            ref={parallaxWingLeftRef}
            className="hidden sm:block absolute left-[1%] md:left-[3%] lg:left-[5%] top-1/2 -translate-y-1/2 w-28 md:w-36 lg:w-44 pointer-events-none z-0 opacity-85"
            aria-hidden="true"
          >
            <svg viewBox="0 0 200 140" className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="tkWingLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <stop offset="55%" stopColor="#FFD1EE" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#E2A8FF" stopOpacity="0.15" />
                </linearGradient>
              </defs>
              <path
                d="M180 75 C135 55, 65 20, 12 18 C32 45, 78 66, 165 82 Z"
                fill="url(#tkWingLeftGrad)"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="1.2"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255, 181, 224, 0.7))' }}
              />
              <path
                d="M182 84 C132 72, 62 52, 6 54 C30 76, 82 88, 168 92 Z"
                fill="url(#tkWingLeftGrad)"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="1"
              />
              <path
                d="M178 94 C132 90, 74 82, 24 88 C48 104, 96 106, 166 100 Z"
                fill="url(#tkWingLeftGrad)"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="1"
              />
              <path
                d="M170 102 C136 104, 92 104, 52 114 C78 122, 118 118, 162 108 Z"
                fill="url(#tkWingLeftGrad)"
                opacity="0.75"
              />
            </svg>
          </div>

          <div
            ref={parallaxWingRightRef}
            className="hidden sm:block absolute right-[1%] md:right-[3%] lg:right-[5%] top-1/2 -translate-y-1/2 w-28 md:w-36 lg:w-44 pointer-events-none z-0 opacity-85"
            aria-hidden="true"
          >
            <svg viewBox="0 0 200 140" className="w-full h-auto overflow-visible transform -scale-x-100">
              <path
                d="M180 75 C135 55, 65 20, 12 18 C32 45, 78 66, 165 82 Z"
                fill="url(#tkWingLeftGrad)"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="1.2"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255, 181, 224, 0.7))' }}
              />
              <path
                d="M182 84 C132 72, 62 52, 6 54 C30 76, 82 88, 168 92 Z"
                fill="url(#tkWingLeftGrad)"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="1"
              />
              <path
                d="M178 94 C132 90, 74 82, 24 88 C48 104, 96 106, 166 100 Z"
                fill="url(#tkWingLeftGrad)"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="1"
              />
              <path
                d="M170 102 C136 104, 92 104, 52 114 C78 122, 118 118, 162 108 Z"
                fill="url(#tkWingLeftGrad)"
                opacity="0.75"
              />
            </svg>
          </div>

          {/* LAYER 3 (z-10): NEON ELLIPSE RING BEHIND TITLE (z-index lower than text z-20) */}
          <div
            className="absolute left-1/2 top-[56%] w-[96%] sm:w-[92%] max-w-[830px] h-[115px] sm:h-[155px] pointer-events-none z-10"
            style={{ animation: 'tkEllipseBreathe 6.5s ease-in-out infinite' }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 840 170" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="tkNeonEllipseGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <stop offset="20%" stopColor="#FF6EC7" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="80%" stopColor="#B56BFF" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="tkBottomHeartGem" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFE4F5" />
                  <stop offset="35%" stopColor="#FF4FA3" />
                  <stop offset="75%" stopColor="#FF1680" />
                  <stop offset="100%" stopColor="#851264" />
                </linearGradient>
              </defs>

              <ellipse
                cx="420"
                cy="82"
                rx="390"
                ry="66"
                fill="none"
                stroke="url(#tkNeonEllipseGrad)"
                strokeWidth="5"
                strokeOpacity="0.55"
                style={{ filter: 'blur(6px)' }}
              />

              <path
                d="M 110 42 A 390 66 0 1 0 730 42"
                fill="none"
                stroke="url(#tkNeonEllipseGrad)"
                strokeWidth="3.2"
                strokeLinecap="round"
                style={{
                  filter: 'drop-shadow(0 0 8px #FF1680) drop-shadow(0 0 18px #B56BFF)'
                }}
              />

              <ellipse
                cx="420"
                cy="82"
                rx="390"
                ry="66"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeDasharray="90 330"
                style={{
                  animation: 'tkEllipseDash 7.5s linear infinite',
                  filter: 'drop-shadow(0 0 8px #FFFFFF) drop-shadow(0 0 14px #FF4FA3)'
                }}
              />

              <path
                d="M 185 126 Q 420 164 655 126"
                fill="none"
                stroke="url(#tkNeonEllipseGrad)"
                strokeWidth="1.6"
                strokeOpacity="0.85"
              />

              <path
                d="M 215 116 L 245 122 M 222 112 L 235 120 L 220 123"
                fill="none"
                stroke="#FF4FA3"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M 625 116 L 595 122 M 618 112 L 605 120 L 620 123"
                fill="none"
                stroke="#FF4FA3"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <g
                transform="translate(420, 148)"
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(255, 22, 128, 0.9)) drop-shadow(0 4px 10px rgba(133, 59, 255, 0.6))'
                }}
              >
                <path
                  d="M0 11 C-2 9, -15 1, -15 -7 C-15 -13, -10 -17, -5 -17 C-2 -17, 0 -15, 0 -12 C0 -15, 2 -17, 5 -17 C10 -17, 15 -13, 15 -7 C15 1, 2 9, 0 11 Z"
                  fill="url(#tkBottomHeartGem)"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <ellipse cx="-5" cy="-10" rx="3.2" ry="1.8" fill="#FFFFFF" opacity="0.85" transform="rotate(-25 -5 -10)" />
              </g>
            </svg>
          </div>

          {/* LAYER 3.5 (z-15): Animation G — Heart Orbit & Glowing Pastel Butterflies */}
          <div
            ref={parallaxOrbitRef}
            className="absolute inset-0 pointer-events-none z-15"
            aria-hidden="true"
          >
            <div
              className="hidden sm:block absolute left-[11%] top-[4%] w-9 h-9"
              style={{ animation: 'tkHeartFloatOrbitA 5.2s ease-in-out infinite' }}
            >
              <svg viewBox="0 0 40 40" className="w-full h-full overflow-visible">
                <path
                  d="M20 20 C12 6, 2 8, 6 19 C9 25, 16 23, 20 20 Z M20 20 C28 6, 38 8, 34 19 C31 25, 24 23, 20 20 Z M20 21 C13 24, 7 33, 13 35 C17 36, 19 28, 20 21 Z M20 21 C27 24, 33 33, 27 35 C23 36, 21 28, 20 21 Z"
                  fill="rgba(255, 225, 245, 0.9)"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  style={{ filter: 'drop-shadow(0 0 8px #FF4FA3)' }}
                />
              </svg>
            </div>

            <div
              className="hidden sm:block absolute left-[6%] bottom-[8%] w-6 h-6"
              style={{ animation: 'tkHeartFloatOrbitB 4.6s ease-in-out infinite 0.8s' }}
            >
              <svg viewBox="0 0 40 40" className="w-full h-full overflow-visible">
                <path
                  d="M20 20 C12 6, 2 8, 6 19 C9 25, 16 23, 20 20 Z M20 20 C28 6, 38 8, 34 19 C31 25, 24 23, 20 20 Z M20 21 C13 24, 7 33, 13 35 C17 36, 19 28, 20 21 Z M20 21 C27 24, 33 33, 27 35 C23 36, 21 28, 20 21 Z"
                  fill="rgba(255, 240, 250, 0.92)"
                  style={{ filter: 'drop-shadow(0 0 6px #FF70B8)' }}
                />
              </svg>
            </div>

            <div
              className="hidden sm:block absolute right-[13%] -top-[6%] w-6 h-6"
              style={{ animation: 'tkHeartFloatOrbitB 5.5s ease-in-out infinite 0.3s' }}
            >
              <svg viewBox="0 0 40 40" className="w-full h-full overflow-visible">
                <path
                  d="M20 20 C12 6, 2 8, 6 19 C9 25, 16 23, 20 20 Z M20 20 C28 6, 38 8, 34 19 C31 25, 24 23, 20 20 Z M20 21 C13 24, 7 33, 13 35 C17 36, 19 28, 20 21 Z M20 21 C27 24, 33 33, 27 35 C23 36, 21 28, 20 21 Z"
                  fill="rgba(255, 240, 250, 0.92)"
                  style={{ filter: 'drop-shadow(0 0 6px #B56BFF)' }}
                />
              </svg>
            </div>

            <div
              className="absolute left-[18%] bottom-[4%] w-4 h-4"
              style={{ animation: 'tkHeartFloatOrbitA 4.2s ease-in-out infinite 1.2s' }}
            >
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="#FF70B8"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  style={{ filter: 'drop-shadow(0 0 6px #FF1680)' }}
                />
              </svg>
            </div>
            <div
              className="absolute right-[10%] bottom-[12%] w-5 h-5"
              style={{ animation: 'tkHeartFloatOrbitB 4.8s ease-in-out infinite 0.5s' }}
            >
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="#D8B4FE"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  style={{ filter: 'drop-shadow(0 0 6px #853BFF)' }}
                />
              </svg>
            </div>
          </div>

          {/* LAYER 4 (z-20): MAIN 2-LINE 3D HEADING */}
          <h2
            className="tk-serif-3d relative z-20 flex flex-col items-center justify-center font-extrabold italic tracking-[-0.015em]"
            style={{
              fontSize: 'clamp(2.25rem, 5.2vw, 4.45rem)',
              lineHeight: 1.18,
              animation: 'tkTitleGlowPulse 4.8s ease-in-out infinite'
            }}
          >
            {/* DÒNG 1: Mọi thứ để món quà */}
            <span className="flex flex-wrap items-center justify-center gap-x-[0.26em] px-2">
              {LINE1_WORDS.map((word) => {
                const idx = wordCounter++;
                return (
                  <span
                    key={`l1-${word}-${idx}`}
                    ref={(el) => {
                      wordRefs.current[idx] = el;
                    }}
                    className="relative inline-block px-2 py-1.5 -mx-2 -my-1.5"
                  >
                    <span
                      className="tk-word-line1-extrude absolute inset-0 px-2 py-1.5 pointer-events-none select-none"
                      aria-hidden="true"
                    >
                      {word}
                    </span>
                    <span className="tk-word-line1-face relative z-10 inline-block">
                      {word}
                    </span>
                  </span>
                );
              })}
            </span>

            {/* DÒNG 2: thật đặc biệt ♡ */}
            <span className="flex flex-wrap items-center justify-center gap-x-[0.26em] px-2 -mt-1 sm:-mt-1.5">
              {LINE2_WORDS.map((word) => {
                const idx = wordCounter++;
                return (
                  <span
                    key={`l2-${word}-${idx}`}
                    ref={(el) => {
                      wordRefs.current[idx] = el;
                    }}
                    className="relative inline-block px-2 py-1.5 -mx-2 -my-1.5"
                  >
                    <span
                      className="tk-word-line2-extrude absolute inset-0 px-2 py-1.5 pointer-events-none select-none"
                      aria-hidden="true"
                    >
                      {word}
                    </span>
                    <span className="tk-word-line2-face relative z-10 inline-block">
                      {word}
                    </span>
                  </span>
                );
              })}

              {/* 3D Crystal Heart ♡ at end of Line 2 */}
              {(() => {
                const idx = wordCounter++;
                return (
                  <span
                    ref={(el) => {
                      wordRefs.current[idx] = el;
                    }}
                    className="relative inline-flex items-center justify-center ml-1 sm:ml-2 align-middle"
                  >
                    <span className="sr-only">♡</span>
                    <svg
                      viewBox="0 0 64 58"
                      className="w-10 h-10 sm:w-13 sm:h-13 lg:w-15 lg:h-15 overflow-visible transform rotate-[8deg]"
                      aria-hidden="true"
                      style={{
                        filter:
                          'drop-shadow(0 6px 14px rgba(255, 22, 128, 0.48)) drop-shadow(0 0 12px rgba(255, 181, 224, 0.85))'
                      }}
                    >
                      <defs>
                        <linearGradient id="tkCrystalHeartFill" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
                          <stop offset="40%" stopColor="#FF8AD4" stopOpacity="0.48" />
                          <stop offset="100%" stopColor="#FF1680" stopOpacity="0.75" />
                        </linearGradient>
                        <linearGradient id="tkCrystalHeartRim" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFFFFF" />
                          <stop offset="45%" stopColor="#FF55B8" />
                          <stop offset="100%" stopColor="#C80064" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M32 53 C28 49, 5 33, 5 18 C5 9, 12 3, 20 3 C25 3, 29 6, 32 10 C35 6, 39 3, 44 3 C52 3, 59 9, 59 18 C59 33, 36 49, 32 53 Z"
                        transform="translate(1.5, 3)"
                        fill="none"
                        stroke="#9E004B"
                        strokeWidth="5.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M32 53 C28 49, 5 33, 5 18 C5 9, 12 3, 20 3 C25 3, 29 6, 32 10 C35 6, 39 3, 44 3 C52 3, 59 9, 59 18 C59 33, 36 49, 32 53 Z"
                        fill="url(#tkCrystalHeartFill)"
                        stroke="url(#tkCrystalHeartRim)"
                        strokeWidth="4.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 16 C12 11, 16 8, 21 8"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                );
              })()}
            </span>
          </h2>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SIX FEATURE CARDS — PREMIUM CRYSTAL GLASS & ANIMATED NEON BORDER   */}
      {/* ===================================================================== */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {FEATURES.map((f, idx) => {
          const { Icon, accent } = f;
          const activeRipple = ripples[f.id];
          const shouldFillIcon = f.id === 'fast-30s' || f.id === 'gift-password' || f.id === 'customize-gift';

          return (
            <div
              key={f.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              onMouseEnter={() => handleCardMouseEnter(idx)}
              onMouseLeave={() => handleCardMouseLeave(idx)}
              className="group relative rounded-[30px] p-5 sm:p-6 flex items-center gap-4 sm:gap-4.5 min-h-[164px] sm:min-h-[174px] transition-shadow duration-300 will-change-transform"
              style={
                {
                  '--spot-x': '50%',
                  '--spot-y': '50%',
                  '--spot-opacity': '0',
                  background: `radial-gradient(circle at 18% 50%, ${accent.cardLeftAura} 0%, transparent 58%), linear-gradient(145deg, rgba(255, 253, 255, 0.9) 0%, rgba(255, 241, 251, 0.8) 52%, rgba(251, 233, 255, 0.87) 100%)`,
                  backdropFilter: 'blur(16px) saturate(145%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(145%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: `0 14px 34px -8px rgba(105, 40, 165, 0.14), 0 6px 18px -4px ${accent.glow}, inset 0 2px 3px rgba(255, 255, 255, 0.98), inset 0 -2px 8px ${accent.crystalTint}`
                } as React.CSSProperties
              }
            >
              {/* ============================================================= */}
              {/* LAYER A: INNER CRYSTAL BEVEL FRAME & TOP SPECULAR HIGHLIGHT   */}
              {/* ============================================================= */}
              <div
                className="absolute inset-[5px] rounded-[25px] pointer-events-none z-0"
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.76)',
                  background:
                    'linear-gradient(165deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 45%, transparent 100%)'
                }}
                aria-hidden="true"
              />

              {/* Top Edge Specular Highlight Bar */}
              <div
                className="absolute top-0 inset-x-7 h-[2px] rounded-full pointer-events-none z-10"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #FFFFFF 50%, transparent 100%)',
                  opacity: 0.95
                }}
                aria-hidden="true"
              />

              {/* Bottom Edge Accent Gradient Glow */}
              <div
                className="absolute -bottom-2 inset-x-8 h-7 rounded-full pointer-events-none z-0 blur-md transition-opacity duration-300 opacity-75 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(ellipse at center, ${accent.main} 0%, transparent 75%)`
                }}
                aria-hidden="true"
              />

              {/* Corner Star Glints on the Crystal Perimeter (matching reference image) */}
              <svg
                viewBox="0 0 20 20"
                className="absolute -bottom-1.5 left-9 w-3.5 h-3.5 pointer-events-none z-20 opacity-85"
                style={{ animation: `tkStarPulse 3s ease-in-out infinite ${accent.floatDelay}` }}
                aria-hidden="true"
              >
                <path
                  d="M10 0 L12.2 7.8 L20 10 L12.2 12.2 L10 20 L7.8 12.2 L0 10 L7.8 7.8 Z"
                  fill="#FFFFFF"
                  style={{ filter: `drop-shadow(0 0 5px ${accent.main})` }}
                />
              </svg>
              <svg
                viewBox="0 0 20 20"
                className="absolute -top-1.5 right-12 w-3 h-3 pointer-events-none z-20 opacity-80"
                style={{ animation: `tkStarPulse 3.4s ease-in-out infinite ${accent.sweepDelay}` }}
                aria-hidden="true"
              >
                <path
                  d="M10 0 L12.2 7.8 L20 10 L12.2 12.2 L10 20 L7.8 12.2 L0 10 L7.8 7.8 Z"
                  fill="#FFFFFF"
                  style={{ filter: `drop-shadow(0 0 5px ${accent.main})` }}
                />
              </svg>

              {/* ============================================================= */}
              {/* LAYER B: ANIMATED NEON LED BORDER (CONTINUOUS 360° LOOP)      */}
              {/* ============================================================= */}
              {/* Soft outer neon bloom ring */}
              <div
                className="tk-led-glow-mask absolute inset-0 rounded-[30px] overflow-hidden pointer-events-none z-10 opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                aria-hidden="true"
              >
                <div
                  className="absolute left-1/2 top-1/2 w-[230%] aspect-square"
                  style={{
                    background: `conic-gradient(from 0deg, transparent 0deg, transparent 50deg, ${accent.soft} 110deg, ${accent.main} 162deg, #FFFFFF 178deg, transparent 185deg, transparent 230deg, ${accent.soft} 290deg, ${accent.main} 342deg, #FFFFFF 358deg, transparent 360deg)`,
                    animation: `tkNeonBorderSpin ${accent.ledDuration} linear infinite`,
                    animationDelay: accent.ledDelay
                  }}
                />
              </div>

              {/* Crisp curved LED comet perimeter ring */}
              <div
                className="tk-led-ring-mask absolute inset-0 rounded-[30px] overflow-hidden pointer-events-none z-10 opacity-95 group-hover:opacity-100 transition-opacity duration-300"
                aria-hidden="true"
              >
                <div
                  className="absolute left-1/2 top-1/2 w-[230%] aspect-square"
                  style={{
                    background: `conic-gradient(from 0deg, rgba(255, 190, 228, 0.38) 0deg, rgba(255, 190, 228, 0.38) 50deg, ${accent.bright} 115deg, ${accent.main} 160deg, #FFFFFF 177deg, rgba(255, 190, 228, 0.38) 185deg, rgba(255, 190, 228, 0.38) 230deg, ${accent.bright} 295deg, ${accent.main} 340deg, #FFFFFF 357deg, rgba(255, 190, 228, 0.38) 360deg)`,
                    animation: `tkNeonBorderSpin ${accent.ledDuration} linear infinite`,
                    animationDelay: accent.ledDelay
                  }}
                />
              </div>

              {/* ============================================================= */}
              {/* LAYER C: ANIMATION D (LIGHT SWEEP) & ANIMATION I (HOVER SHINE)*/}
              {/* ============================================================= */}
              <div className="absolute inset-0 rounded-[30px] overflow-hidden pointer-events-none z-10" aria-hidden="true">
                {/* Periodic Light Sweep */}
                <div
                  className="absolute inset-y-0 w-[42%] bg-gradient-to-r from-transparent via-white/55 to-transparent"
                  style={{
                    animation: 'tkCardLightSweep 7s ease-in-out infinite',
                    animationDelay: accent.sweepDelay
                  }}
                />

                {/* Hover Diagonal Sweep */}
                <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent -translate-x-[180%] skew-x-[-25deg] group-hover:translate-x-[320%] transition-transform duration-1000 ease-out" />

                {/* Cursor-following Specular Spotlight */}
                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{
                    opacity: 'var(--spot-opacity, 0)',
                    background: `radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255, 255, 255, 0.55), ${accent.crystalTint} 45%, transparent 80%)`
                  }}
                />
              </div>

              {/* ============================================================= */}
              {/* LEFT COLUMN: 3D CRYSTAL HEXAGON ICON PEDESTAL                 */}
              {/* ============================================================= */}
              <div
                ref={(el) => {
                  iconWrapRefs.current[idx] = el;
                }}
                className="relative shrink-0 w-[80px] h-[86px] sm:w-[88px] sm:h-[94px] flex items-center justify-center z-20"
              >
                <div
                  className="relative w-full h-full flex items-center justify-center"
                  style={{
                    animation: `tkCrystalFloat ${accent.floatDuration} ease-in-out infinite`,
                    animationDelay: accent.floatDelay
                  }}
                >
                  {/* Back Ambient Neon Glow behind Crystal */}
                  <div
                    className="absolute inset-0 rounded-full blur-xl pointer-events-none transition-transform duration-300 group-hover:scale-115"
                    style={{
                      background: `radial-gradient(circle, ${accent.glowStrong} 0%, transparent 72%)`
                    }}
                    aria-hidden="true"
                  />

                  {/* 3D Faceted Hexagon Crystal Frame SVG */}
                  <svg
                    viewBox="0 0 100 108"
                    className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id={`crystalBody-${f.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                        <stop offset="45%" stopColor="#FFF5FC" stopOpacity="0.72" />
                        <stop offset="100%" stopColor={accent.soft} stopOpacity="0.82" />
                      </linearGradient>
                      <linearGradient id={`crystalEdge-${f.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="55%" stopColor={accent.bright} />
                        <stop offset="100%" stopColor={accent.main} />
                      </linearGradient>
                    </defs>

                    {/* 3D Lower Base Shadow / Thickness of Hexagon */}
                    <path
                      d="M50 8 L88 29 C92 31, 94 35, 94 40 L94 72 C94 77, 92 81, 88 83 L50 104 C46 106, 44 106, 40 104 L12 83 C8 81, 6 77, 6 72 L6 40 C6 35, 8 31, 12 29 L40 8 C44 6, 46 6, 50 8 Z"
                      transform="translate(0, 4.5)"
                      fill={accent.crystalTint}
                      stroke={accent.crystalEdge}
                      strokeWidth="1.6"
                      style={{ filter: `drop-shadow(0 8px 14px ${accent.glow})` }}
                    />

                    {/* Main Outer Crystal Hexagon */}
                    <path
                      d="M45 5 C48 3, 52 3, 55 5 L87 24 C91 26, 93 30, 93 35 L93 73 C93 78, 91 82, 87 84 L55 103 C52 105, 48 105, 45 103 L13 84 C9 82, 7 78, 7 73 L7 35 C7 30, 9 26, 13 24 Z"
                      fill={`url(#crystalBody-${f.id})`}
                      stroke={`url(#crystalEdge-${f.id})`}
                      strokeWidth="2.3"
                    />

                    {/* Inner Facet Bevel Hexagon */}
                    <path
                      d="M46 13 C48.5 11.5, 51.5 11.5, 54 13 L80 28 C83 30, 85 33, 85 37 L85 71 C85 75, 83 78, 80 80 L54 95 C51.5 96.5, 48.5 96.5, 46 95 L20 80 C17 78, 15 75, 15 71 L15 37 C15 33, 17 30, 20 28 Z"
                      fill="rgba(255, 255, 255, 0.5)"
                      stroke="rgba(255, 255, 255, 0.95)"
                      strokeWidth="1.4"
                    />

                    {/* Top-Left Diagonal Glass Specular Sheen */}
                    <path
                      d="M20 29 L48 13 L74 26 L22 65 Z"
                      fill="rgba(255, 255, 255, 0.58)"
                    />

                    {/* Sparkling Diamond Glint at Bottom Tip of Hexagon */}
                    <g transform="translate(50, 102)">
                      <path
                        d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z"
                        fill="#FFFFFF"
                        style={{ filter: `drop-shadow(0 0 6px ${accent.main})` }}
                      />
                    </g>
                  </svg>

                  {/* 3D Extruded Glossy Lucide Icon inside Crystal Hexagon */}
                  <div
                    className="relative z-10 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center"
                    style={{
                      transform: 'perspective(300px) rotateY(-12deg) rotateX(8deg)'
                    }}
                  >
                    {/* Depth Layer 3 (Deepest 3D shadow extrusion) */}
                    <Icon
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      strokeWidth={2.8}
                      fill={shouldFillIcon ? accent.extrude3 : 'none'}
                      style={{
                        color: accent.extrude3,
                        transform: 'translate(3.4px, 4.4px)',
                        filter: `drop-shadow(0 5px 8px ${accent.glowStrong})`
                      }}
                      aria-hidden="true"
                    />
                    {/* Depth Layer 2 */}
                    <Icon
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      strokeWidth={2.8}
                      fill={shouldFillIcon ? accent.extrude2 : 'none'}
                      style={{
                        color: accent.extrude2,
                        transform: 'translate(2.2px, 2.9px)'
                      }}
                      aria-hidden="true"
                    />
                    {/* Depth Layer 1 */}
                    <Icon
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      strokeWidth={2.8}
                      fill={shouldFillIcon ? accent.extrude1 : 'none'}
                      style={{
                        color: accent.extrude1,
                        transform: 'translate(1.1px, 1.5px)'
                      }}
                      aria-hidden="true"
                    />
                    {/* Main Vibrant Glossy 3D Icon Body */}
                    <Icon
                      className="relative w-full h-full"
                      strokeWidth={2.5}
                      fill={shouldFillIcon ? `url(#tkIconFill-${f.id})` : accent.crystalTint}
                      stroke={`url(#tkIconFill-${f.id})`}
                      style={{
                        color: accent.main,
                        filter: 'drop-shadow(0 -1px 1px rgba(255,255,255,0.95))'
                      }}
                    />
                    {/* Keyhole detail on 3D Golden Padlock */}
                    {f.id === 'gift-password' && (
                      <span
                        className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-2.5 rounded-full bg-[#78350F] pointer-events-none shadow-[0_1px_0_rgba(255,255,255,0.7)]"
                        aria-hidden="true"
                      />
                    )}
                    {/* Top Specular Highlight Rim */}
                    <Icon
                      className="absolute inset-0 w-full h-full pointer-events-none opacity-70"
                      strokeWidth={1.5}
                      style={{
                        color: '#FFFFFF',
                        transform: 'translate(-0.7px, -0.8px)'
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* CENTER/RIGHT CONTENT: TITLE, DESCRIPTION & ACCENT BADGE       */}
              {/* ============================================================= */}
              <div className="relative z-20 flex-1 min-w-0 pr-10 sm:pr-11">
                <h3 className="text-[19px] sm:text-[21px] font-extrabold text-[#29104E] tracking-tight leading-snug">
                  {f.title}
                </h3>
                <p className="mt-1 text-[13.5px] sm:text-[14.5px] font-medium text-[#46315B] leading-[1.58]">
                  {f.desc}
                </p>

                {/* Accent Pill Badge */}
                <div className="mt-3 inline-flex items-center">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] sm:text-[12.5px] font-semibold tracking-tight transition-transform duration-300 group-hover:scale-103"
                    style={{
                      background: accent.badgeBg,
                      border: `1.4px solid ${accent.badgeBorder}`,
                      color: accent.badgeText,
                      boxShadow: `0 4px 12px -2px ${accent.glow}, inset 0 1px 1.5px rgba(255, 255, 255, 0.95)`
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] text-white shadow-2xs shrink-0"
                      style={{ background: accent.badgeIconBg }}
                      aria-hidden="true"
                    >
                      {f.badgeSymbol}
                    </span>
                    <span className="font-bold">{f.badgeText}</span>
                  </span>
                </div>
              </div>

              {/* ============================================================= */}
              {/* BOTTOM-RIGHT: CIRCULAR CRYSTAL ARROW BUTTON WITH RIPPLE       */}
              {/* ============================================================= */}
              <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 z-20 flex items-center justify-center">
                {/* Outer Delicate Concentric Halo Ring */}
                <div
                  className="absolute -inset-1.5 rounded-full pointer-events-none transition-transform duration-300 group-hover:scale-110"
                  style={{
                    border: `1px solid ${accent.crystalEdge}`,
                    opacity: 0.45
                  }}
                  aria-hidden="true"
                />

                <button
                  type="button"
                  onClick={(e) => handleArrowClick(e, f.id)}
                  aria-label={`Khám phá ${f.title}`}
                  className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-300 group-hover:translate-x-1 group-hover:-rotate-12 active:scale-92"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 240, 250, 0.88) 100%)',
                    border: `1.5px solid ${accent.badgeBorder}`,
                    boxShadow: `0 6px 14px -3px ${accent.glow}, inset 0 1.5px 2px #FFFFFF`
                  }}
                >
                  {activeRipple && (
                    <span
                      key={activeRipple.id}
                      className="absolute w-5 h-5 rounded-full pointer-events-none"
                      style={{
                        left: activeRipple.x,
                        top: activeRipple.y,
                        background: accent.main,
                        animation: 'tkButtonRipple 0.55s ease-out forwards'
                      }}
                    />
                  )}
                  <ArrowRight className="w-4 h-4 text-[#29104E] stroke-[2.5] relative z-10" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
