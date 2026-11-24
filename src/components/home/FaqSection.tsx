'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, Sparkles, ArrowRight, MessageCircle } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  actionLabel?: string;
  actionHref?: string;
  isExternal?: boolean;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'available-template',
    question: 'Mình có thể tự tạo mẫu quà nào ngay bây giờ?',
    answer:
      'Mẫu Trái tim TriKun đang có trình chỉnh sửa và trang quà chạy trên hệ thống. Bạn có thể thêm tên người nhận, lời chúc, ảnh, nhạc và xem trước trước khi tạo link.',
    actionLabel: 'Mở trình tạo quà',
    actionHref: '/studio/trikun-heart'
  },
  {
    id: 'reference-templates',
    question: 'Các mẫu có nhãn “Nguồn tham khảo” dùng được chưa?',
    answer:
      'Các card đó cho xem ảnh, demo hoặc thông tin nguồn khi có. Chúng chưa có trình chỉnh sửa độc lập trên TriKun. Hãy chọn card “Trái tim TriKun” nếu bạn muốn tự tạo và lưu quà ngay.'
  },
  {
    id: 'what-is-heart-qr',
    question: 'Có thể làm gì với mã QR trái tim?',
    answer:
      'Bạn có thể tạo mã QR từ một đường link, tùy chỉnh hình trái tim và tải ảnh để gửi qua tin nhắn hoặc in lên thiệp. Nên quét thử mã sau khi tải, đặc biệt nếu bạn dùng ảnh ở giữa.',
    actionLabel: 'Tạo mã QR',
    actionHref: '/qr-tinh-yeu'
  },
  {
    id: 'share-gift',
    question: 'Tạo xong thì gửi quà như thế nào?',
    answer:
      'Sau khi tạo, bạn nhận được đường link tới trang quà. Sao chép link để gửi qua Zalo, Messenger hoặc tạo mã QR từ link đó. Hãy mở lại link một lần để kiểm tra trước khi gửi.'
  },
  {
    id: 'music-playback',
    question: 'Vì sao nhạc có thể chưa phát ngay khi mở quà?',
    answer:
      'Một số trình duyệt chặn nhạc tự phát. Người nhận chỉ cần chạm vào trang hoặc nút phát nhạc để bắt đầu nghe.'
  },
  {
    id: 'how-long-stored',
    question: 'Mất link quà thì tìm lại ở đâu?',
    answer:
      'Hãy mở mục Tra cứu đơn để tìm lại thông tin đã lưu. Nếu không thấy, gửi thông tin tạo quà cho Trí Kun để được hỗ trợ.',
    actionLabel: 'Mở trang tra cứu',
    actionHref: '/tra-cuu-don'
  }
];

export default function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      id="cau-hoi-thuong-gap"
      aria-label="Câu hỏi thường gặp tại TriKun Love Studio"
      className="relative py-6 sm:py-10 reveal-on-scroll"
      style={{ fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Header khu vực FAQ chuẩn theo ảnh tham chiếu & cá nhân hóa cho TriKun Love Studio */}
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-8 sm:mb-10">
        {/* Badge nhỏ phía trên: (?) Câu hỏi thường gặp */}
        <div className="inline-flex items-center justify-center">
          <span
            className="tk-home-kicker inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-bold tracking-wide"
            style={{
              background: 'linear-gradient(90deg, rgba(255, 228, 240, 0.92) 0%, rgba(255, 238, 246, 0.95) 100%)',
              border: '1.5px solid rgba(255, 175, 215, 0.85)',
              boxShadow: '0 4px 14px rgba(255, 22, 128, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.95)'
            }}
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF1680] stroke-[2.3]" />
            <span>Câu hỏi thường gặp</span>
          </span>
        </div>

        {/* Tiêu đề chính: Bạn đang thắc mắc điều gì? */}
        <h2 className="tk-home-heading text-3xl sm:text-4xl lg:text-[42px] tracking-tight leading-tight">
          Bạn đang{' '}
          <span className="bg-gradient-to-r from-[#FF1680] via-[#FF3D9A] to-[#FF4FA3] bg-clip-text text-transparent">
            thắc mắc
          </span>{' '}
          điều gì?
        </h2>

        {/* Mô tả phụ cá nhân hóa cho TriKun Love Studio */}
        <p className="text-sm sm:text-[15.5px] text-[#6E5566] font-medium">
          Những câu hỏi người dùng hay gửi cho đội ngũ <strong className="font-bold text-[#29104E]">TriKun Love Studio</strong> nhất.
        </p>
      </div>

      {/* Danh sách Accordion FAQ */}
      <div className="max-w-3xl mx-auto space-y-3 sm:space-y-3.5">
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;

          return (
            <div
              key={item.id}
              className={`tk-home-card group rounded-2xl sm:rounded-[20px] transition-all duration-300 overflow-hidden ${
                isOpen
                  ? 'bg-white/95 border-[1.5px] border-[#FF2D75]/65 shadow-[0_12px_30px_-6px_rgba(255,22,128,0.16),inset_0_2px_3px_rgba(255,255,255,0.98)]'
                  : 'bg-white/90 hover:bg-white/96 border-[1.5px] border-[#F8D0E5]/90 hover:border-[#FF85B8] shadow-[0_6px_18px_-4px_rgba(255,45,117,0.08),inset_0_1.5px_2px_rgba(255,255,255,0.95)]'
              }`}
              style={{
                backdropFilter: 'blur(14px) saturate(140%)',
                WebkitBackdropFilter: 'blur(14px) saturate(140%)'
              }}
            >
              <button
                type="button"
                onClick={() => toggleFaq(item.id)}
                aria-expanded={isOpen}
                className="w-full px-5 sm:px-7 py-4.5 sm:py-5 flex items-center justify-between gap-4 text-left cursor-pointer select-none"
              >
                <span
                  className={`text-[15px] sm:text-[16.5px] font-bold tracking-tight transition-colors duration-200 ${
                    isOpen ? 'text-[#FF1680]' : 'text-[#1E1224] group-hover:text-[#29104E]'
                  }`}
                >
                  {item.question}
                </span>

                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isOpen
                      ? 'bg-[#FFF0F7] text-[#FF1680] rotate-180 shadow-2xs'
                      : 'text-[#FF2D75] group-hover:bg-[#FFF5FA]'
                  }`}
                >
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </span>
              </button>

              {/* Nội dung câu trả lời đóng/mở mượt bằng CSS Grid */}
              <div
                className={`grid transition-all duration-300 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-5 sm:px-7 pb-5 pt-0.5 text-[14px] sm:text-[15px] text-[#4E3856] leading-[1.68] font-medium border-t border-[#FCE4F0]/80">
                    <p className="pt-3">{item.answer}</p>

                    {item.actionLabel && item.actionHref && (
                      <div className="mt-3 pt-1">
                        {item.actionHref.startsWith('#') ? (
                          <a
                            href={item.actionHref}
                            className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-[#FF1680] hover:text-[#853BFF] transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{item.actionLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <Link
                            href={item.actionHref}
                            className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-[#FF1680] hover:text-[#853BFF] transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{item.actionLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gợi ý liên hệ trực tiếp nếu còn câu hỏi khác */}
      <div className="mt-6 text-center">
        <p className="inline-flex flex-wrap items-center justify-center gap-1.5 text-xs sm:text-[13.5px] font-semibold text-[#6E5566] bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#F8D0E5]">
          <span>Còn câu hỏi khác cần giải đáp riêng?</span>
          <a
            href="https://zalo.me/0345151438"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-extrabold text-[#FF1680] hover:underline"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Nhắn Zalo Trí Kun 24/7</span>
          </a>
        </p>
      </div>
    </section>
  );
}
