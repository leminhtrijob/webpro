import { Gift, Heart, QrCode, Sparkles } from 'lucide-react';

const highlights = [
  { Icon: Gift, label: 'Tạo quà trái tim cá nhân hóa' },
  { Icon: Sparkles, label: 'Xem trước khi gửi' },
  { Icon: QrCode, label: 'Mã QR nghệ thuật' },
  { Icon: Heart, label: 'Gửi đi bằng một đường link' },
];

export default function LedMarquee() {
  return (
    <div className="border-y border-[#EFCBEA] bg-white/55 py-4 backdrop-blur-sm" aria-label="Điểm nổi bật của TriKun">
      <div className="mx-auto grid max-w-[1360px] grid-cols-2 gap-2 px-4 sm:gap-3 sm:px-6 lg:grid-cols-4 lg:px-8">
        {highlights.map(({ Icon, label }) => (
          <div key={label} className="flex min-h-12 items-center gap-2 rounded-2xl border border-white/90 bg-white/75 px-3 py-2 text-[11px] font-bold leading-snug text-[#5D356B] shadow-[0_3px_12px_rgba(166,87,169,.07)] sm:text-xs">
            <Icon className="h-4 w-4 shrink-0 text-[#E93C96]" aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
