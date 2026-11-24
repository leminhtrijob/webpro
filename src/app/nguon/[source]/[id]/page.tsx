import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, ArrowRight, ExternalLink, CheckCircle2 } from 'lucide-react';
import sourceIndex from '../../../../../reference-sources/source-index.json';
import { AVAILABLE_TEMPLATES } from '@/data/availableTemplates';
import { TEMPLATES_DATA } from '@/data/templates';
import { getLocalTemplateEnginePath } from '@/lib/templateEngineMap';

export default async function SourcePage({ params }: { params: Promise<{ source: string; id: string }> }) {
  const { source, id } = await params;

  // Tìm mẫu tương ứng trong kho TriKun đang hoạt động
  const matchedTemplate =
    source === 'lovez22'
      ? AVAILABLE_TEMPLATES.find((row) => row.id === Number(id)) ||
        TEMPLATES_DATA.find((row) => row.id === Number(id))
      : AVAILABLE_TEMPLATES.find((row) => row.slug === `${source}-${id}`);

  const rawItem = sourceIndex.products.find((row) => row.source === source && String(row.id) === id);
  if (!matchedTemplate && !rawItem) notFound();

  const templateSlug = matchedTemplate?.slug || `${source}-${id}`;
  const templateName = matchedTemplate?.name || rawItem?.name || 'Mẫu Quà Tặng Số 3D';
  const templateCategory = matchedTemplate?.category || 'Thiệp Tình Yêu 3D';
  const templateDesc =
    matchedTemplate?.descriptions ||
    'Mẫu quà tặng số 3D tương tác trực tiếp đã được tích hợp đầy đủ HTML/CSS/JS local trên TriKun Studio.';
  const localEngineUrl = `${getLocalTemplateEnginePath(templateSlug)}?preview=1`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff5fa] via-[#ffeef7] to-[#fff8fc] px-4 sm:px-6 py-8 sm:py-12 text-[#2d1424]">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white/95 backdrop-blur-xl p-5 sm:p-8 shadow-[0_20px_60px_rgba(255,46,116,0.15)] border-2 border-[#FFD0DF]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-pink-100">
          <Link
            href="/#san-pham"
            className="inline-flex items-center gap-1.5 text-sm text-[#FF1E6A] font-black hover:underline"
          >
            ← Quay lại kho mẫu TriKun
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã kích hoạt 100% HTML/CSS/JS Local
          </span>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0F6] text-[#FF1E6A] text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{templateCategory}</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#24112F]">{templateName}</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#6E5560] font-medium max-w-2xl">{templateDesc}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href={`/studio/${templateSlug}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] px-6 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-[#FF1E6A]/25 hover:opacity-95 transition-all"
            >
              <span>Tùy chỉnh & Tạo quà ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/v/${templateSlug}?preview=1`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-[#FFB8D2] bg-[#FFF5FA] hover:bg-[#FFE4F0] px-4 py-3.5 text-xs sm:text-sm font-black text-[#7A1C4B] transition-all"
            >
              <span>Mở toàn màn hình</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Khung chạy trực tiếp mẫu HTML/CSS/JS Local */}
        <div className="mt-6 overflow-hidden rounded-2xl border-2 border-[#FFC4DC] bg-[#0D0B12] shadow-inner">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#1B1026] text-white/90 text-xs border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F86] animate-pulse" />
              <span className="font-bold">Bản xem trước tương tác trực tiếp (Local Engine)</span>
            </div>
            <span className="text-[11px] text-pink-300 font-mono">{getLocalTemplateEnginePath(templateSlug)}</span>
          </div>
          <div className="relative w-full h-[520px] sm:h-[600px]">
            <iframe
              src={localEngineUrl}
              className="w-full h-full border-0 block"
              allow="autoplay; encrypted-media; fullscreen"
              title={`Xem mẫu tương tác ${templateName}`}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
