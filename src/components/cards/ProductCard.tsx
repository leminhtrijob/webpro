'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, ArrowRight, Flame, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TemplateItem } from '@/models/gift';

interface ProductCardProps {
  template: TemplateItem;
  onPreview?: (template: TemplateItem) => void;
}

/**
 * ProductCard: Toàn bộ card đều hoạt động 100% tại local:
 * - Nút "Tạo quà": Mở trình tùy chỉnh trực tiếp `/studio/[slug]`
 * - Nút "Xem mẫu": Mở cửa sổ xem thử tương tác trực tiếp (Live Demo HTML/CSS/JS)
 */
export default function ProductCard({ template, onPreview }: ProductCardProps) {
  const [imgSrc, setImgSrc] = useState(template.image);

  useEffect(() => {
    setImgSrc(template.image);
  }, [template.image]);

  const fireConfetti = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 25,
      spread: 60,
      origin: { x, y },
      colors: ['#FF4F86', '#8B5CF6', '#FFD166', '#FF8DAF']
    });
  };

  return (
    <div className="tk-home-card relative bg-white/95 rounded-3xl border-2 border-[#F8C9E8] hover:border-[#FF2D75] shadow-[0_10px_28px_rgba(255,45,117,0.1)] hover:shadow-[0_16px_36px_rgba(255,45,117,0.22)] overflow-hidden transition-[border-color,box-shadow,transform] duration-200 flex flex-col group hover:-translate-y-1">
      {/* Glare Sheen */}
      <div className="absolute inset-0 pointer-events-none rounded-3xl z-20 opacity-0 group-hover:opacity-40 transition-opacity duration-200 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.7),transparent_60%)]" />

      {/* Thanh Browser Topbar Mac OS sang trọng */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-white/95 via-[#FFF5F8]/90 to-white/95 border-b-2 border-[#F8C9E8]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/40 shadow-xs" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/40 shadow-xs" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/40 shadow-xs" />
        </div>
        <span className="text-[10px] font-mono font-bold text-[#A88090] truncate max-w-[145px]">
          TriKun Studio / {template.slug}
        </span>
        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Thumbnail */}
      <div
        onClick={() => onPreview?.(template)}
        className="relative aspect-[16/10] bg-[#FFF0F4] overflow-hidden border-b-2 border-[#F8C9E8]/70 cursor-pointer"
      >
        <Image
          src={imgSrc}
          alt={template.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          unoptimized={imgSrc.toLowerCase().endsWith('.gif')}
          className="object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
          onError={() => {
            if (imgSrc !== '/images/templates/tpl_7.gif') {
              setImgSrc('/images/templates/tpl_7.gif');
            }
          }}
        />

        {/* Price tag badge (top right) */}
        <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-white/95 border-2 border-[#F8C9E8] text-xs font-black text-[#2D1424] shadow-md">
          {template.priceText}
        </div>

        {/* Hot badge (top left) */}
        {template.isHot && (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#FF2D75] via-[#FF5C98] to-[#A56BFF] text-white text-[10px] font-black flex items-center gap-1 shadow-md shadow-[#FF2D75]/30 animate-pulse">
            <Flame className="w-3.5 h-3.5 fill-white" />
            <span>HOT 2026</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold text-[#FF2D75] uppercase tracking-wider block">
              {template.category}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#853BFF]">
              <Sparkles className="w-3 h-3" />
              <span>3D Interactive</span>
            </span>
          </div>
          <h3 className="font-black text-base text-[#2D1424] line-clamp-1 group-hover:text-[#FF2D75] transition-colors">
            {template.name}
          </h3>
          <p className="text-xs text-[#6E5560] line-clamp-2 mt-1 leading-relaxed font-medium">
            {template.descriptions}
          </p>
        </div>

        {/* Actions: Tạo quà & Xem mẫu trực tiếp */}
        <div className="pt-3 border-t-2 border-[#F8C9E8]/70">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/studio/${template.slug}`}
              onClick={fireConfetti}
              className="tk-home-focus relative group/btn w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#FF2D75] via-[#FF5C98] to-[#A56BFF] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#FF2D75]/25 hover:shadow-lg hover:shadow-[#FF2D75]/40 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>Tạo quà</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
            </Link>

            <button
              type="button"
              onClick={(e) => {
                fireConfetti(e);
                if (onPreview) {
                  onPreview(template);
                } else {
                  window.location.href = `/v/${template.slug}?preview=1`;
                }
              }}
              className="tk-home-focus w-full py-2.5 px-3 rounded-2xl bg-white/95 border-2 border-[#F8C9E8] hover:bg-[#FFE6EE] hover:border-[#FF2D75] text-[#2D1424] hover:text-[#FF2D75] font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Eye className="w-3.5 h-3.5 text-[#FF2D75]" />
              <span>Xem mẫu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
