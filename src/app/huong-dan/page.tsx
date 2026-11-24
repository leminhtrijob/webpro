import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import { BookOpen, CheckCircle2, Sparkles, Send } from 'lucide-react';
import Link from 'next/link';

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#FFFBFC] text-[#2D1F24] flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex p-2.5 rounded-2xl bg-[#FFF0F4] text-[#FF4F86]">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#2D1F24]">
            Hướng Dẫn Tạo Quà & Mua Source
          </h1>
          <p className="text-xs sm:text-sm text-[#7D646D]">
            Các bước đơn giản để tạo một trang web tình yêu tuyệt đẹp dành cho người thương.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#F0DDE3] p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF4F86] to-[#E8638A] text-white flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <h3 className="font-bold text-base text-[#2D1F24]">Chọn Mẫu Quà Yêu Thích</h3>
              <p className="text-xs text-[#7D646D] mt-1 leading-relaxed">
                Khám phá kho 122 mẫu web quà tặng 3D hoạt động trực tiếp tại Trang chủ. Bấm nút &ldquo;Xem mẫu&rdquo; để tương tác trực tiếp với hiệu ứng 3D/nhạc nền hoặc bấm &ldquo;Tạo quà →&rdquo; để bắt đầu cá nhân hóa.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF4F86] to-[#E8638A] text-white flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div>
              <h3 className="font-bold text-base text-[#2D1F24]">Tùy Chỉnh Nội Dung Quà Tại Studio</h3>
              <p className="text-xs text-[#7D646D] mt-1 leading-relaxed">
                Tại Studio 2 cột: nhập tên người ấy, tải ảnh kỷ niệm, viết lá thư ngọt ngào (hoặc dùng nút Gợi ý thư AI), chọn bài hát tình yêu và cài mật khẩu bí mật nếu muốn. Bên phải sẽ có màn hình Live Preview cập nhật tức thì!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF4F86] to-[#E8638A] text-white flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <div>
              <h3 className="font-bold text-base text-[#2D1F24]">Nhận Link Server Thật & Mã QR</h3>
              <p className="text-xs text-[#7D646D] mt-1 leading-relaxed">
                Bấm "Tạo link ngay", hệ thống sẽ sinh ra đường link máy chủ thật vĩnh viễn và mã QR nghệ thuật. Bạn chỉ cần copy gửi cho người yêu hoặc tải ảnh QR về in ra thiệp giấy.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#A78BFA] text-white flex items-center justify-center font-bold text-sm shrink-0">
              4
            </div>
            <div>
              <h3 className="font-bold text-base text-[#2D1F24]">Nhờ Trí Kun làm theo yêu cầu</h3>
              <p className="text-xs text-[#7D646D] mt-1 leading-relaxed">
                Nếu muốn thiết kế theo yêu cầu riêng, hãy bấm nút "Nhờ Trí Kun làm hộ" để gửi yêu cầu qua Zalo.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF4F86] to-[#E8638A] text-white font-bold text-sm shadow-md shadow-[#FF4F86]/25 hover:opacity-95 transition-all"
          >
            <span>Bắt Đầu Tạo Quà Ngay</span>
            <Sparkles className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
