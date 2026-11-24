'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useParams } from 'next/navigation';
import { ArrowLeft, Sparkles, X } from 'lucide-react';
import { getLocalTemplateEnginePath } from '@/lib/templateEngineMap';
import { AVAILABLE_TEMPLATES } from '@/data/availableTemplates';

function GiftRecipientContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.id as string) || 'trikun-heart';
  const dataParam = searchParams.get('data') || '';
  const idParam = searchParams.get('id') || '';
  const previewParam = searchParams.get('preview') || '';
  const [showHelperBar, setShowHelperBar] = useState(true);

  const isCreatedGift = Boolean(idParam || dataParam);
  const matchedTemplate = AVAILABLE_TEMPLATES.find((t) => t.slug === slug);
  const studioSlug = matchedTemplate?.slug || slug;

  // Xác định engine mẫu HTML/CSS/JS local tương ứng với slug hoặc id
  const templateSrc = getLocalTemplateEnginePath(slug);

  const queryParts: string[] = [];
  if (idParam) queryParts.push(`id=${encodeURIComponent(idParam)}`);
  if (dataParam) queryParts.push(`data=${encodeURIComponent(dataParam)}`);
  if (previewParam) queryParts.push(`preview=${encodeURIComponent(previewParam)}`);
  const finalSrc = queryParts.length > 0 ? `${templateSrc}?${queryParts.join('&')}` : templateSrc;

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black select-none z-50">
      {/* Thanh điều hướng thông minh nổi gọn ở góc trên bên trái (có thể ẩn đi bất cứ lúc nào) */}
      {showHelperBar && (
        <div className="fixed top-3.5 left-3.5 z-[60] flex flex-wrap items-center gap-2">
          <Link
            href="/#san-pham"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/25 text-white text-xs font-extrabold shadow-lg transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-pink-400" />
            <span>Kho mẫu</span>
          </Link>

          <Link
            href={`/studio/${studioSlug}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] text-white text-xs font-black shadow-lg shadow-[#FF1E6A]/35 hover:scale-105 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isCreatedGift ? 'Tạo quà giống mẫu này' : 'Tùy chỉnh & Tạo quà ngay'}</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowHelperBar(false)}
            title="Ẩn thanh điều hướng để xem toàn màn hình"
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white/80 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <iframe
        src={finalSrc}
        className="w-full h-full border-0 block"
        allow="autoplay; encrypted-media; fullscreen"
        title="TriKun Universe - Web Quà Tặng Tình Yêu"
      />
    </div>
  );
}

export default function GiftRecipientPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-[#0D0B12] flex items-center justify-center text-pink-400 font-bold z-50">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500 mr-3"></div>
          Đang khởi tạo vũ trụ lãng mạn TriKun...
        </div>
      }
    >
      <GiftRecipientContent />
    </Suspense>
  );
}
