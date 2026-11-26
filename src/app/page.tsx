'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Heart,
  Sparkles,
  Search,
  Gift,
  QrCode,
  X,
  ArrowRight,
  Send,
  ChevronLeft,
  ChevronRight,
  LayoutGrid
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import ProductCard from '@/components/cards/ProductCard';
import LedMarquee from '@/components/effects/LedMarquee';
import { AVAILABLE_TEMPLATES } from '@/data/availableTemplates';
import { CATALOG_TEMPLATES } from '@/data/catalogTemplates';
import { TemplateItem } from '@/models/gift';
import { getLocalTemplateEnginePath } from '@/lib/templateEngineMap';
import {
  DANH_MUC_TAT_CA,
  locDanhSachMau,
  tinhSoLuongDanhMucRealtime,
  tinhSoLuongTheoGiaRealtime
} from '@/controllers/TemplateController';

// Dynamic load các khối bên dưới màn hình đầu & hiệu ứng nặng để giảm JS bundle khởi tạo
const ThreeStepsProcess = dynamic(() => import('@/components/home/ThreeStepsProcess'));
const LuxuryTechFeatures = dynamic(() => import('@/components/home/LuxuryTechFeatures'));
const FaqSection = dynamic(() => import('@/components/home/FaqSection'));
const HomeClosingCta = dynamic(() => import('@/components/home/HomeClosingCta'));
const Footer = dynamic(() => import('@/components/layout/Footer'));

// Dynamic load Three.js WebGL & Cursor Sparkles (Client-side only)
const ThreeHeartGalaxy = dynamic(() => import('@/components/effects/ThreeHeartGalaxy'), {
  ssr: false,
  loading: () => null
});

const CursorSparkles = dynamic(() => import('@/components/effects/CursorSparkles'), {
  ssr: false,
  loading: () => null
});

const ScrollRevealController = dynamic(() => import('@/components/effects/ScrollRevealController'), {
  ssr: false,
  loading: () => null
});

const ALL = 'Tất cả';

const CATEGORY_DEFS: { key: string; icon: string }[] = [
  { key: ALL, icon: '✨' },
  { key: 'Tình yêu', icon: '💞' },
  { key: 'Valentine', icon: '🌹' },
  { key: 'Sinh nhật', icon: '🎂' },
  { key: 'Trái tim 3D', icon: '💖' },
  { key: 'Ngày Nhà Giáo 20/11', icon: '🎓' },
  { key: 'Thiệp', icon: '💌' },
  { key: 'Tiện ích & Game', icon: '🎮' },
  { key: 'Khác', icon: '🎁' }
];

const matchCategory = (item: TemplateItem, cat: string) => cat === ALL || item.category.includes(cat);

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

/** 6 bức tranh Anime Chibi cặp đôi AI độc quyền siêu ngọt ngào & dễ thương chuẩn xác theo ảnh tham chiếu */
const HERO_COUPLE_PHOTOS = [
  { src: '/images/hero/chibi_1.jpg', cls: 'top-[-2%] left-[44%] w-[25%] rotate-[3deg]', delay: '0s' },
  { src: '/images/hero/chibi_2.jpg', cls: 'top-[12%] left-[4%] w-[21%] -rotate-[10deg]', delay: '1.2s' },
  { src: '/images/hero/chibi_3.jpg', cls: 'top-[10%] right-[3%] w-[20%] rotate-[8deg]', delay: '2.1s' },
  { src: '/images/hero/chibi_6.jpg', cls: 'top-[44%] right-[-1%] w-[20%] -rotate-[3deg]', delay: '0.6s' },
  { src: '/images/hero/chibi_4.jpg', cls: 'bottom-[2%] right-[8%] w-[27%] rotate-[4deg]', delay: '1.6s' },
  { src: '/images/hero/chibi_5.jpg', cls: 'bottom-[4%] left-[22%] w-[21%] -rotate-[4deg]', delay: '2.6s' }
];

const LOVE_NOTES = [
  { text: 'I love you ♥', cls: 'top-[29%] right-[5%] rotate-[4deg]', delay: '0.4s' },
  { text: 'You make\nme happy ♥', cls: 'top-[52%] left-[2%] -rotate-[6deg]', delay: '1.4s' },
  { text: 'Forever\nwith you ♥', cls: 'bottom-[8%] right-[32%] rotate-[2deg]', delay: '2.2s' }
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageRipple, setPageRipple] = useState<{ key: string; id: number } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);

  const itemsPerPage = 12;

  const stats = useMemo(() => {
    const free = AVAILABLE_TEMPLATES.filter((t) => t.priceType === 'free').length;
    return { total: AVAILABLE_TEMPLATES.length, free };
  }, []);

  // Tính số lượng mẫu theo từng danh mục REALTIME khi người dùng chọn Tất cả / Miễn phí / Trả phí hoặc gõ tìm kiếm
  const categories = useMemo(
    () =>
      tinhSoLuongDanhMucRealtime(CATALOG_TEMPLATES, CATEGORY_DEFS, {
        boLocGia: priceFilter,
        tuKhoa: searchQuery
      }),
    [priceFilter, searchQuery]
  );

  // Tính số lượng mẫu theo từng nút giá (Tất cả / Miễn phí / Trả phí) REALTIME theo danh mục & từ khóa đang chọn
  const priceCounts = useMemo(
    () =>
      tinhSoLuongTheoGiaRealtime(CATALOG_TEMPLATES, {
        danhMuc: selectedCategory,
        tuKhoa: searchQuery
      }),
    [selectedCategory, searchQuery]
  );

  const filteredTemplates = useMemo(
    () =>
      locDanhSachMau(CATALOG_TEMPLATES, {
        danhMuc: selectedCategory,
        boLocGia: priceFilter,
        tuKhoa: searchQuery
      }),
    [selectedCategory, priceFilter, searchQuery]
  );

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const displayedTemplates = filteredTemplates.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const hotTemplates = useMemo(
    () => [...AVAILABLE_TEMPLATES].filter((t) => t.isHot).sort((a, b) => b.views - a.views).slice(0, 4),
    []
  );

  const goToPage = (page: number) => {
    setCurrentPage(page);
    document.getElementById('san-pham')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToProducts = () => document.getElementById('san-pham')?.scrollIntoView({ behavior: 'smooth' });

  const pageItems = useMemo(() => {
    const items: (number | '…')[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - safePage) <= 1) items.push(p);
      else if (items[items.length - 1] !== '…') items.push('…');
    }
    return items;
  }, [totalPages, safePage]);


  return (
    <div className="min-h-screen text-[#2D1424] flex flex-col overflow-x-clip selection:bg-[#FF2D75]/20 selection:text-[#FF2D75] relative">
      <style>{`
        @keyframes tkFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes tkHeart { 0%,100% { transform: scale(1) } 50% { transform: scale(1.035) } }
        @keyframes tkFadeUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: none } }
        @keyframes shimmerSweep { 0% { transform: translateX(-150%) skewX(-25deg); } 40%, 100% { transform: translateX(300%) skewX(-25deg); } }
        @keyframes ecgPulse { 0%, 100% { stroke-dashoffset: 0; opacity: 0.95; } 50% { stroke-dashoffset: 6; opacity: 1; } }
        .tk-float { animation: tkFloat 5.5s ease-in-out infinite; }
        .tk-heart { animation: tkHeart 2.8s ease-in-out infinite; }
        .tk-fade-up { animation: tkFadeUp .75s cubic-bezier(.16,1,.3,1) both; }
        .tk-hand { font-family: 'Playpen Sans', cursive; }
      `}</style>

      {/* Lớp overlay trắng hồng mỏng nhẹ để nền pastel hoa anh đào hiển thị lung linh & chữ sắc nét */}
      <div className="fixed inset-0 bg-gradient-to-b from-white/30 via-[#FFF5FA]/25 to-[#FDF2FF]/35 pointer-events-none -z-10" />

      {/* Những ngôi sao nhỏ nhấp nháy chậm & cánh hoa bay lãng mạn nhẹ nhàng */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[10%] left-[6%] text-white/80 animate-twinkle text-lg select-none">✦</div>
        <div className="absolute top-[25%] right-[10%] text-white/90 animate-twinkle text-xl select-none" style={{ animationDelay: '1.6s' }}>✦</div>
        <div className="absolute top-[60%] left-[4%] text-pink-200/80 animate-twinkle text-base select-none" style={{ animationDelay: '2.5s' }}>✨</div>
        <div className="absolute top-[78%] right-[8%] text-purple-200/90 animate-twinkle text-lg select-none" style={{ animationDelay: '0.9s' }}>✦</div>
        <div className="absolute -top-4 left-[18%] text-pink-300/50 animate-sakura text-sm select-none" style={{ animationDelay: '0s', animationDuration: '18s' }}>🌸</div>
        <div className="absolute -top-4 left-[52%] text-pink-400/40 animate-sakura text-xs select-none" style={{ animationDelay: '5s', animationDuration: '22s' }}>🌸</div>
        <div className="absolute -top-4 left-[82%] text-rose-300/50 animate-sakura text-sm select-none" style={{ animationDelay: '9s', animationDuration: '20s' }}>🌸</div>
      </div>

      {/* Vệt sao lấp lánh theo chuột & bộ điều khiển cuộn trang mượt mà */}
      <CursorSparkles />
      <ScrollRevealController />

      <Header />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION FULL MÀN HÌNH HÒA QUYỆN VỚI BACKGROUND PASTEL HỒNG TÍM    */}
      {/* ========================================================================= */}
      <section className="relative min-h-[calc(100vh-72px)] lg:h-[calc(100vh-72px)] flex flex-col justify-center overflow-hidden border-b border-[#F8C9E8]/70">
        {/* Nền mềm mại tôn ảnh nền hoa anh đào & mây bồng bềnh */}
        <div className="absolute inset-0 -z-20 bg-white/10" />
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(255,143,188,0.22)_0%,transparent_70%)] -z-20 pointer-events-none" />
        <div className="absolute top-10 right-0 w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(165,107,255,0.22)_0%,transparent_70%)] -z-20 pointer-events-none" />

        {/* Vũ trụ hạt Three.js WebGL bao phủ toàn màn hình Hero */}
        <ThreeHeartGalaxy />

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-4 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center flex-1 relative z-10">
          {/* CỘT TRÁI: TIÊU ĐỀ 4 TẦNG ROMANTIC LUXURY THEO MOCKUP 2026 */}
          <div className="space-y-6 tk-fade-up text-center lg:text-left z-20 relative">
            {/* Vùng sáng trắng sữa rất nhẹ phía sau chữ để tăng độ tương phản tuyệt đối */}
            <div className="absolute -inset-4 sm:-inset-6 bg-white/45 rounded-3xl blur-2xl -z-10 pointer-events-none" />

            {/* Tiêu đề 4 tầng chuẩn xác theo thiết kế Senior UI/UX */}
            <h1 className="flex flex-col space-y-1.5 sm:space-y-2 tracking-tight">
              {/* Dòng 1: TriKun Love — ✨ (Gradient #FF176B → #E52BA7 → #934BFF, Italic, font-extrabold 800-900) */}
              <div className="flex items-center justify-center lg:justify-start gap-2 select-none">
                <span className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[4.2rem] font-black italic tracking-[-0.045em] bg-gradient-to-r from-[#FF176B] via-[#E52BA7] to-[#934BFF] bg-clip-text text-transparent leading-[1.08]">
                  TriKun Love —
                </span>
                <span className="text-[#FFC837] text-2xl sm:text-3xl animate-pulse drop-shadow-[0_0_8px_rgba(255,200,55,0.8)]">✦</span>
              </div>

              {/* Dòng 2: Món Quà Số (#2B1236, font-weight 800-900, không gradient, chữ sắc nét) */}
              <div className="text-3xl sm:text-4xl lg:text-[3rem] xl:text-[3.6rem] font-black text-[#2B1236] leading-[1.1]">
                Món Quà Số
              </div>

              {/* Dòng 3: Dành Riêng Cho (#2B1236, font-weight 800-900) */}
              <div className="text-3xl sm:text-4xl lg:text-[3rem] xl:text-[3.6rem] font-black text-[#2B1236] leading-[1.1]">
                Dành Riêng Cho
              </div>

              {/* Dòng 4: Người Bạn Thương ♡ (Dải capsule gradient hồng tím #FF176B → #FF3D9A → #A345F4, viền halo kính phát sáng) */}
              <div className="pt-2 flex items-center justify-center lg:justify-start">
                <div className="relative group inline-flex items-center">
                  {/* Halo viền ngoài phát sáng */}
                  <div className="absolute -inset-1.5 rounded-[32px] bg-gradient-to-r from-[#FF176B]/60 via-[#FF3D9A]/50 to-[#A345F4]/60 blur-md group-hover:blur-lg transition-all opacity-85 -z-10" />
                  {/* Đường viền kính mỏng ngoài cùng */}
                  <div className="absolute -inset-1 rounded-[30px] border border-white/60 pointer-events-none" />

                  <span className="relative inline-flex items-center gap-3 px-6 sm:px-8 py-2.5 sm:py-3 rounded-[26px] bg-gradient-to-r from-[#FF176B] via-[#FF3D9A] to-[#A345F4] text-white font-extrabold text-2xl sm:text-3xl lg:text-[2.35rem] shadow-[0_10px_30px_rgba(255,23,107,0.45)] overflow-hidden">
                    {/* Shimmer sweep nhẹ nhàng chạy qua */}
                    <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg] animate-[shimmerSweep_6s_infinite] pointer-events-none" />
                    {/* Đường sáng mảnh phản chiếu ở cạnh dưới */}
                    <span className="absolute bottom-0 inset-x-4 h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />

                    <span>Người Bạn Thương</span>
                    {/* Icon trái tim outline màu trắng bên phải */}
                    <svg
                      viewBox="0 0 24 24"
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-none stroke-white stroke-[2.4] tk-heart drop-shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </span>
                </div>
              </div>
            </h1>

            {/* Mô tả Hero có thanh gradient dọc nhỏ bên trái */}
            <div className="flex items-stretch gap-3.5 max-w-[590px] mx-auto lg:mx-0 text-left">
              <div className="w-1.5 rounded-full bg-gradient-to-b from-[#FF176B] via-[#FF3D9A] to-[#A345F4] shrink-0" />
              <p className="text-[17px] sm:text-[18px] leading-[1.7] text-[#392642] font-medium">
                Tạo website tỏ tình, <strong className="text-[#FF176B] font-bold">mã QR trái tim</strong> và{' '}
                <strong className="text-[#A345F4] font-bold">thiệp 3D lấp lánh</strong> tặng người thương chỉ trong 30 giây.
                Tự do ghép ảnh đôi, lời chúc, nhạc nền và mật khẩu riêng.
              </p>
            </div>

            {/* Nâng cấp nút CTA tương tác chuyên nghiệp */}
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-1">
              <button
                onClick={scrollToProducts}
                className="group relative w-full sm:w-auto h-[60px] sm:h-[62px] px-8 sm:px-9 rounded-full bg-gradient-to-r from-[#FF176B] via-[#FF2D75] to-[#8955FF] text-white font-extrabold text-base shadow-xl shadow-[#FF176B]/35 hover:shadow-2xl hover:shadow-[#FF176B]/50 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-2.5 border border-white/30 cursor-pointer overflow-hidden"
              >
                {/* Ánh sáng quét nhẹ khi hover (shimmer sheen) */}
                <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />
                <span className="relative flex items-center gap-2">
                  <span className="text-xl group-hover:rotate-8 transition-transform duration-300">🚀</span>
                  <span>Bắt đầu sáng tạo</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
              </button>

              <Link
                href="/qr-tinh-yeu"
                className="group w-full sm:w-auto h-[54px] sm:h-[56px] px-7 sm:px-8 rounded-full bg-white/85 backdrop-blur-md border border-[#FFCCD9] text-[#2B1236] font-extrabold text-base hover:border-[#FF176B] hover:text-[#FF176B] hover:bg-white hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-2.5 shadow-md shadow-pink-500/5 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-[#8955FF] group-hover:rotate-3 transition-transform" />
                <span>Tạo QR tình yêu</span>
              </Link>
            </div>

            {/* 3 Thẻ thống kê Glassmorphism cao cấp chuẩn mockup */}
            <div className="grid grid-cols-2 gap-3.5 max-w-[540px] mx-auto lg:mx-0 pt-2">
              {[
                { value: String(stats.total), label: 'Mẫu đang hoạt động', color: 'text-[#FF176B]', icon: Gift },
                { value: String(stats.free), label: 'Mẫu miễn phí', color: 'text-[#8955FF]', icon: Heart }
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="rounded-[22px] bg-white/80 backdrop-blur-md border border-white/90 hover:border-[#FF176B]/50 p-3 sm:p-4 text-center shadow-[0_8px_24px_rgba(255,100,160,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center"
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.color} ${s.icon === Heart ? 'fill-[#FF2D75]' : ''}`} />
                      <div className={`text-2xl sm:text-[28px] font-black tracking-tight ${s.color}`}>
                        {s.value}
                      </div>
                    </div>
                    <div className="text-[11px] sm:text-xs text-[#59465D] font-bold">
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI: TRÁI TIM 3D GLOSSY CÓ NHỊP TIM + ẢNH ANIME CHIBI AI CHUẨN XÁC */}
          <div className="relative w-full max-w-[580px] mx-auto aspect-square select-none flex items-center justify-center overflow-visible">
            {/* Vòng hào quang quỹ đạo neon quay nghiêng 3D quanh trái tim - Layer sau */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] h-[78%] rounded-full border-2 border-white/70 pointer-events-none z-15 rotate-[-24deg] shadow-[0_0_30px_rgba(255,255,255,0.7)] scale-y-[0.45]" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] h-[92%] rounded-full border border-purple-400/35 pointer-events-none z-15 rotate-[16deg] shadow-[0_0_25px_rgba(168,85,247,0.25)] scale-y-[0.4]" />

            {/* Trái tim hồng thủy tinh nhỏ bay bồng bềnh xung quanh */}
            <div className="absolute top-[14%] left-[24%] text-pink-400 animate-bounce text-2xl pointer-events-none z-25 drop-shadow-[0_4px_10px_rgba(255,45,117,0.4)]" style={{ animationDuration: '4s' }}>💖</div>
            <div className="absolute top-[22%] right-[24%] text-pink-300 animate-pulse text-xl pointer-events-none z-25 drop-shadow-[0_4px_8px_rgba(255,45,117,0.3)]">💗</div>
            <div className="absolute bottom-[28%] left-[16%] text-purple-300 animate-pulse text-xl pointer-events-none z-25">💜</div>
            <div className="absolute bottom-[18%] right-[22%] text-pink-400 animate-bounce text-xl pointer-events-none z-25" style={{ animationDuration: '3.2s' }}>💕</div>

            {/* Trái tim Glossy trung tâm với vệt nhịp tim đập ECG */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[44%] sm:w-[46%] tk-heart drop-shadow-[0_25px_50px_rgba(255,23,107,0.5)] z-20 pointer-events-none">
              <svg viewBox="0 0 24 24" className="w-full h-auto">
                <defs>
                  <radialGradient id="heroHeartFill" cx="35%" cy="30%" r="80%">
                    <stop offset="0%" stopColor="#FFE4ED" />
                    <stop offset="25%" stopColor="#FF7CA3" />
                    <stop offset="65%" stopColor="#FF176B" />
                    <stop offset="100%" stopColor="#A81D58" />
                  </radialGradient>
                  <linearGradient id="heroHeartGloss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="url(#heroHeartFill)"
                />
                <ellipse cx="8" cy="7.2" rx="3.3" ry="2" fill="url(#heroHeartGloss)" transform="rotate(-25 8 7.2)" />
                {/* Vệt nhịp tim ECG màu trắng phát sáng */}
                <path
                  d="M4.5 12 h3.5 l1.5 -3.2 l2 6.5 l1.8 -4.5 l1.2 1.2 h4"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity="0.95"
                  filter="drop-shadow(0 0 4px rgba(255,255,255,0.95))"
                />
              </svg>
            </div>

            {/* 6 Thẻ ảnh Anime Chibi cặp đôi AI bay bồng bềnh */}
            {HERO_COUPLE_PHOTOS.map((p, idx) => (
              <div key={p.src} className={`absolute ${p.cls} z-30 pointer-events-none`}>
                <div className="tk-float" style={{ animationDelay: p.delay }}>
                  <div className="aspect-square rounded-[22px] bg-white p-1.5 sm:p-2 shadow-[0_12px_28px_rgba(255,45,117,0.22)] border-2 border-white ring-1 ring-[#FFD6E3] hover:scale-105 transition-transform">
                    <img
                      src={p.src}
                      alt="Cặp đôi ngọt ngào"
                      loading={idx < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="w-full h-full rounded-[16px] object-cover shadow-xs"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Thư tình viết tay lãng mạn */}
            {LOVE_NOTES.map((n) => (
              <div key={n.text} className={`absolute ${n.cls} z-30 pointer-events-none`}>
                <div className="tk-float" style={{ animationDelay: n.delay }}>
                  <div className="tk-hand whitespace-pre-line text-center text-xs sm:text-sm font-black text-[#FF176B] bg-white/95 backdrop-blur-md border border-[#FFCCD9] rounded-2xl px-3.5 py-1.5 sm:px-4 sm:py-2 shadow-[0_8px_20px_rgba(255,45,117,0.18)] leading-tight select-none">
                    {n.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CÁC ĐIỂM NỔI BẬT TĨNH, DỄ ĐỌC VÀ NHẸ KHI CUỘN                     */}
      {/* ========================================================================= */}
      <LedMarquee />

      {/* ========================================================================= */}
      {/* 3. NỘI DUNG CHÍNH (CÁC KHỐI GLASSMORPHISM ĐỒNG BỘ NỀN PASTEL HỒNG TÍM)    */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12 space-y-12 sm:space-y-14 pt-4">
        {/* ============================== 3 BƯỚC TẠO QUÀ: AUTO INFINITE LED SEQUENCE + 3D HOLOGRAM ============================== */}
        <div className="reveal-on-scroll">
          <ThreeStepsProcess totalTemplates={stats.total} />
        </div>

        {/* ============================== MẪU XEM NHIỀU NHẤT HOT ============================== */}
        {hotTemplates.length > 0 && (
          <section className="space-y-6 reveal-on-scroll">
            <div className="tk-home-panel rounded-[28px] px-5 py-5 sm:px-7 sm:py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="tk-home-kicker text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                    HOT NHẤT TUẦN
                  </span>
                  <h2 className="tk-home-heading text-2xl sm:text-3xl">
                    Mẫu Được Xem Nhiều Nhất 🔥
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-handwriting text-lg text-[#A56BFF] font-bold hidden md:inline-block">
                  Mẫu quà đang hoạt động trên TriKun 💕
                </span>
                <button
                  onClick={scrollToProducts}
                  className="tk-home-focus inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-md border-2 border-[#F8C9E8] text-xs font-black text-[#FF2D75] hover:border-[#FF2D75] hover:bg-white transition-all cursor-pointer shadow-xs"
                >
                  <span>Xem mẫu đang hoạt động</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {hotTemplates.map((template, idx) => (
                <div key={template.id} className={`reveal-scale reveal-delay-${(idx % 4) + 1}`}>
                  <ProductCard template={template} onPreview={(item) => setPreviewTemplate(item)} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================== KHO MẪU QUÀ TẶNG SỐ ============================== */}
        <section id="san-pham" className="space-y-6 scroll-mt-24">
          <div className="text-center space-y-2">
            <div className="font-calligraphy text-2xl sm:text-3xl text-[#A56BFF] font-bold select-none">
              ~ Khám phá kho báu tình yêu ~
            </div>
            <div className="tk-home-kicker inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#A56BFF]" />
              <span>MẪU ĐANG HOẠT ĐỘNG</span>
            </div>
            <h2 className="tk-home-heading text-3xl sm:text-5xl tracking-tight">
              Tạo Quà Tặng Số
            </h2>
            <p className="text-xs sm:text-sm text-[#6E5560] font-medium max-w-lg mx-auto">
              Tùy chỉnh lời chúc, ảnh, nhạc và mật khẩu trong TriKun Studio.
            </p>
          </div>

          {/* Thanh công cụ lọc đẳng cấp có glassmorphism */}
          <div className="tk-home-panel rounded-3xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#A88090] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm mẫu đang hoạt động…"
                  className="w-full pl-11 pr-10 py-3.5 text-sm bg-white/90 border-2 border-[#F8C9E8] rounded-2xl focus:bg-white focus:border-[#FF2D75] focus:ring-4 focus:ring-[#FF2D75]/10 outline-none transition-all placeholder:text-[#A88090] font-bold"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#A88090] hover:text-[#2D1424] hover:bg-[#FFF0F4]"
                    aria-label="Xóa tìm kiếm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-white/80 rounded-2xl border-2 border-[#F8C9E8] self-start md:self-auto">
                {(
                  [
                    ['all', 'Tất cả', priceCounts.all],
                    ['free', 'Miễn phí', priceCounts.free],
                    ['paid', 'Trả phí', priceCounts.paid]
                  ] as const
                ).map(([key, label, countVal]) => {
                  const isPriceActive = priceFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setPriceFilter(key);
                        setCurrentPage(1);
                      }}
                      className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isPriceActive
                          ? 'bg-gradient-to-r from-[#FF2D75] to-[#FF8FBC] text-white shadow-md'
                          : 'text-[#7A5A6A] hover:text-[#2D1424]'
                      }`}
                    >
                      <span>{label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                          isPriceActive ? 'bg-white/25 text-white' : 'bg-[#FFF0F4] text-[#FF2D75]'
                        }`}
                      >
                        {countVal}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hiển thị toàn bộ danh mục; tự xuống hàng khi màn hình hẹp. */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo danh mục">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedCategory(cat.key);
                      setCurrentPage(1);
                    }}
                    className={`max-w-full px-3 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#FF2D75] via-[#FF5C98] to-[#A56BFF] text-white shadow-md shadow-[#FF2D75]/20 border-2 border-transparent'
                        : 'bg-white/92 border-2 border-[#F8C9E8] text-[#5C3B4E] hover:bg-white hover:text-[#FF2D75] hover:border-[#FF2D75]'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.key}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-[#FFF0F4] text-[#FF2D75]'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[11px] sm:text-xs text-[#6E5560] px-1 font-black">
            <span className="flex items-start sm:items-center gap-1.5 leading-relaxed">
              <LayoutGrid className="w-4 h-4 text-[#FF1E6A]" />
              Tìm thấy <strong className="text-[#FF1E6A]">{filteredTemplates.length}</strong> mẫu quà tặng số 3D đang hoạt động trực tiếp trên TriKun Studio
            </span>
            {totalPages > 1 && (
              <span className="shrink-0">
                Trang {safePage} / {totalPages}
              </span>
            )}
          </div>

          {/* Grid sản phẩm */}
          {displayedTemplates.length === 0 ? (
            <div className="tk-home-panel text-center py-20 rounded-3xl space-y-3">
              <Heart className="w-12 h-12 text-[#FF2E74]/40 mx-auto" />
              <p className="text-base font-black text-[#1E1218]">Không tìm thấy mẫu quà phù hợp</p>
              <p className="text-xs text-[#8C707C]">Hãy thử từ khóa hoặc danh mục khác nhé!</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(ALL);
                  setPriceFilter('all');
                }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[#FFF0F4] text-[#FF1E6A] text-xs font-black hover:bg-[#FFE0EA] cursor-pointer"
              >
                Xóa toàn bộ bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedTemplates.map((template) => (
                <ProductCard key={template.id} template={template} onPreview={(item) => setPreviewTemplate(item)} />
              ))}
            </div>
          )}

          {/* Phân trang — Crystal Glass & Hot Pink Gradient */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 pt-6 pb-2">
              <button
                onClick={() => {
                  setPageRipple({ key: 'prev', id: Date.now() });
                  goToPage(safePage - 1);
                }}
                disabled={safePage === 1}
                className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FFF9FE]/90 backdrop-blur-md border-[1.5px] border-[#FFB5E0]/90 flex items-center justify-center text-[#29104E] shadow-[0_6px_16px_rgba(255,79,163,0.16),inset_0_2px_2px_rgba(255,255,255,0.95)] hover:scale-108 hover:border-[#FF1680] hover:text-[#FF1680] active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer overflow-hidden"
                aria-label="Trang trước"
              >
                {pageRipple?.key === 'prev' && (
                  <span
                    key={pageRipple.id}
                    className="absolute inset-0 rounded-full bg-[#FF1680]/30 animate-ping pointer-events-none"
                  />
                )}
                <ChevronLeft className="w-4 h-4 stroke-[2.5] relative z-10" />
              </button>
              {pageItems.map((p, i) =>
                p === '…' ? (
                  <span key={`dots-${i}`} className="w-7 text-center font-extrabold text-[#29104E]/75 select-none">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => {
                      setPageRipple({ key: `page-${p}`, id: Date.now() });
                      goToPage(p);
                    }}
                    className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full font-extrabold text-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer overflow-hidden ${
                      safePage === p
                        ? 'text-white scale-110 border-[1.5px] border-white/90 shadow-[0_0_0_3px_rgba(255,181,224,0.55),0_8px_22px_rgba(255,22,128,0.48),inset_0_2px_3px_rgba(255,255,255,0.85)]'
                        : 'bg-[#FFF9FE]/92 backdrop-blur-md border-[1.5px] border-[#FFB5E0]/85 text-[#29104E] shadow-[0_6px_15px_rgba(210,100,170,0.14),inset_0_2px_2px_rgba(255,255,255,0.95)] hover:scale-108 hover:border-[#FF4FA3] hover:text-[#FF1680] active:scale-95'
                    }`}
                    style={
                      safePage === p
                        ? {
                            background: 'radial-gradient(circle at 35% 25%, #FF7AC6 0%, #FF1680 55%, #D9006C 100%)'
                          }
                        : undefined
                    }
                  >
                    {pageRipple?.key === `page-${p}` && (
                      <span
                        key={pageRipple.id}
                        className="absolute inset-0 rounded-full bg-white/45 animate-ping pointer-events-none"
                      />
                    )}
                    <span className="relative z-10">{p}</span>
                  </button>
                )
              )}
              <button
                onClick={() => {
                  setPageRipple({ key: 'next', id: Date.now() });
                  goToPage(safePage + 1);
                }}
                disabled={safePage === totalPages}
                className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FFF9FE]/90 backdrop-blur-md border-[1.5px] border-[#FFB5E0]/90 flex items-center justify-center text-[#29104E] shadow-[0_6px_16px_rgba(255,79,163,0.16),inset_0_2px_2px_rgba(255,255,255,0.95)] hover:scale-108 hover:border-[#FF1680] hover:text-[#FF1680] active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer overflow-hidden"
                aria-label="Trang sau"
              >
                {pageRipple?.key === 'next' && (
                  <span
                    key={pageRipple.id}
                    className="absolute inset-0 rounded-full bg-[#FF1680]/30 animate-ping pointer-events-none"
                  />
                )}
                <ChevronRight className="w-4 h-4 stroke-[2.5] relative z-10" />
              </button>
            </div>
          )}
        </section>

        {/* ============================== TÍNH NĂNG CÔNG NGHỆ — ULTRA LUXURY 3D CRYSTAL ============================== */}
        <LuxuryTechFeatures />

        {/* Lời mời tạo quà trước phần hỗ trợ cuối trang. */}
        <HomeClosingCta />

        {/* Câu hỏi thường gặp ở cuối nội dung chính. */}
        <FaqSection />
      </main>

      {/* ============================== PREVIEW MODAL (INTERACTIVE LOCAL HTML/CSS/JS) ============================== */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border-2 border-[#FFD0DF] relative text-[#24161C] tk-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewTemplate(null)}
              className="absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-white/95 text-[#8C707C] hover:text-[#1E1218] hover:bg-[#FFF0F4] shadow-md cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[#0D0B12] border-2 border-[#FFD6E3] mb-4 relative shadow-inner">
              <iframe
                src={`${getLocalTemplateEnginePath(previewTemplate.slug)}?preview=1`}
                className="w-full h-full border-0 block"
                allow="autoplay; encrypted-media; fullscreen"
                title={`Xem thử mẫu ${previewTemplate.name}`}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black px-3 py-1 rounded-full bg-[#FFF0F4] text-[#FF1E6A]">
                  {previewTemplate.category}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/v/${previewTemplate.slug}?preview=1`}
                    target="_blank"
                    className="text-[11px] font-extrabold text-[#A838FF] hover:underline"
                  >
                    Mở xem toàn màn hình ↗
                  </Link>
                  <span className="text-xs font-black text-[#FF1E6A]">{previewTemplate.priceText}</span>
                </div>
              </div>
              <h3 className="text-lg font-black text-[#1E1218]">{previewTemplate.name}</h3>
              <p className="text-xs text-[#6E5560] leading-relaxed font-medium">{previewTemplate.descriptions}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 pt-4 border-t-2 border-[#FFD6E3]">
              <Link
                href={`/studio/${previewTemplate.slug}`}
                className="py-3 rounded-xl bg-gradient-to-r from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md shadow-[#FF2E74]/25 hover:opacity-95"
              >
                <span>Tùy chỉnh & Tạo quà ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={`https://zalo.me/0345151438?text=${encodeURIComponent(`Chào Trí Kun, mình muốn nhờ bạn làm mẫu ${previewTemplate.name}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 rounded-xl border-2 border-[#0068FF]/30 text-[#0068FF] bg-[#0068FF]/5 hover:bg-[#0068FF]/10 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Nhờ Trí Kun làm</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <BottomNav />
    </div>
  );
}
