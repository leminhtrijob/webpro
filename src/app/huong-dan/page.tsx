'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import {
  BookOpen,
  Sparkles,
  Heart,
  Palette,
  Music,
  Lock,
  QrCode,
  Crown,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  HelpCircle,
  Smartphone,
  Printer,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface FAQItem {
  q: string;
  a: string;
  tag: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    tag: 'Thời hạn & Máy chủ',
    q: 'Quà tặng tạo trên TriKun Love có bị hết hạn sau một thời gian không?',
    a: 'Hoàn toàn KHÔNG! Dù bạn tạo món quà ở chế độ Miễn phí hay Nâng cấp VIP, đường link và dữ liệu quà tặng của bạn đều được lưu trữ vĩnh viễn trên máy chủ đám mây MongoDB Atlas và hệ thống CDN toàn cầu. Bạn và người thương có thể mở lại bất kỳ lúc nào để ôn lại kỷ niệm.'
  },
  {
    tag: 'Thiết bị & Nền tảng',
    q: 'Người yêu tôi dùng iPhone Safari, Android Chrome hoặc máy tính bảng có mở được không?',
    a: 'Tương thích 100%! Toàn bộ 48 Engine 3D và giao diện TriKun Love Studio đều được lập trình chuẩn WebGL và responsive tối ưu hóa cho màn hình cảm ứng di động, đạt chuẩn 60 khung hình/giây (fps) mượt mà mà không cần người nhận phải tải bất kỳ app nào về máy.'
  },
  {
    tag: 'Âm thanh & Nhạc nền',
    q: 'Tại sao nhạc nền không tự phát ngay khi vừa mở link?',
    a: 'Đây là chính sách bảo mật trình duyệt toàn cầu (Autoplay Policy của Apple Safari và Google Chrome) nhằm tránh gây giật mình cho người dùng. Khi người yêu bạn chạm vào màn hình (ví dụ: bấm nút "Mở hộp quà", "Chạm vào màn hình" hoặc mở lá thư), âm thanh sẽ tự động vang lên du dương, ngọt ngào.'
  },
  {
    tag: 'Bảo mật & Mã PIN',
    q: 'Mã PIN số và Passcode bí mật hoạt động thế nào? Nếu quên thì sao?',
    a: 'Bạn có thể cài đặt mã PIN số 4-6 chữ số (ví dụ: ngày sinh của người ấy, ngày kỷ niệm 2 bạn yêu nhau như 2412). Khi người ấy mở quà, hệ thống sẽ hiện bàn phím số pha lê để nhập mã mới mở được hộp quà. Nếu lỡ quên mã, bạn có thể tra cứu lại trong phần Quản lý quà của Hồ sơ cá nhân hoặc nhắn tin qua Zalo Trí Kun (0348 889 059) để được reset trong 1 phút.'
  },
  {
    tag: 'In ấn & Thiệp 10x15',
    q: 'Làm thế nào để in thiệp mã QR kích thước chuẩn 10x15cm gửi tặng?',
    a: 'Sau khi tạo quà xong, ở màn hình hoàn tất có nút "Tải ảnh thiệp in 10x15cm". Hệ thống sẽ tự động ghép mã QR nghệ thuật vào khung thiệp thiết kế sẵn với độ phân giải cao 300 DPI. Bạn chỉ cần lưu ảnh về máy, mang ra tiệm in ảnh màu hoặc in giấy Couche 300gsm để tặng kèm bó hoa hoặc món quà hiện vật.'
  },
  {
    tag: 'Gói VIP 49k',
    q: 'Gói Nâng Cấp VIP 49.000đ mang lại những quyền lợi đặc biệt gì?',
    a: 'Khi nâng cấp VIP vĩnh viễn: bạn nhận huy hiệu VIP Vàng lấp lánh trên trang quà, tắt toàn bộ logo quảng cáo, mở khóa toàn bộ hiệu ứng 3D cao cấp (hạt pháo hoa rơi, tuyết rơi pha lê), tải nhạc không giới hạn dung lượng và được Trí Kun ưu tiên hỗ trợ kỹ thuật 24/7.'
  }
];

export default function GuidePage() {
  const [activeTab, setActiveTab] = useState<'steps' | 'print' | 'security' | 'vip' | 'faq'>('steps');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div
      className="min-h-screen bg-[#FFFDFC] text-zinc-900 flex flex-col font-sans"
      style={{ fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
    >
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* HERO TITLE */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-100 text-pink-700 text-xs font-black uppercase tracking-wider border border-pink-200">
            <BookOpen className="w-4 h-4 text-pink-600" />
            <span>Cẩm Nang Toàn Diện & Trợ Giúp TriKun Love</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
            Hướng Dẫn Tạo Quà 3D & In Thiệp Tình Yêu
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-semibold">
            Tất cả những gì bạn cần biết để tự tay tạo nên một món quà công nghệ số 3D bất ngờ, ngọt ngào và đáng nhớ
            dành tặng cho nửa kia của mình.
          </p>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap items-center justify-center gap-2 bg-zinc-100/80 p-1.5 rounded-2xl max-w-3xl mx-auto border border-zinc-200">
          {[
            { id: 'steps', label: '4 Bước tạo quà', icon: Sparkles },
            { id: 'security', label: 'Bảo mật & Mã PIN', icon: Lock },
            { id: 'print', label: 'In thiệp 10x15cm', icon: Printer },
            { id: 'vip', label: 'Gói VIP 49.000đ', icon: Crown },
            { id: 'faq', label: 'Câu hỏi thường gặp', icon: HelpCircle }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/25'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: 4 BƯỚC TẠO QUÀ NHANH                              */}
        {/* ========================================================= */}
        {activeTab === 'steps' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Bước 1 */}
              <div className="bg-white rounded-3xl border-2 border-pink-100 p-6 shadow-sm hover:border-pink-300 transition-all space-y-3 relative overflow-hidden group">
                <div className="w-10 h-10 rounded-2xl bg-pink-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-pink-500/30">
                  01
                </div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-500" />
                  <span>Chọn 1 Trong 122+ Mẫu Web 3D</span>
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed font-semibold">
                  Truy cập Trang chủ và lựa chọn giao diện bạn yêu thích: Vũ trụ sao 3D Galaxy, Trái tim pha lê quay
                  quanh ảnh kỷ niệm, Hộp quà tình yêu bung mở, Pháo hoa đếm ngược ngày yêu, hoặc Chibi đôi đáng yêu.
                </p>
                <div className="pt-2">
                  <Link
                    href="/#san-pham"
                    className="text-xs font-black text-pink-600 hover:text-pink-700 inline-flex items-center gap-1"
                  >
                    <span>Khám phá kho mẫu 3D</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Bước 2 */}
              <div className="bg-white rounded-3xl border-2 border-blue-100 p-6 shadow-sm hover:border-blue-300 transition-all space-y-3 relative overflow-hidden group">
                <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/30">
                  02
                </div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-blue-500" />
                  <span>Cá Nhân Hóa Thư & Ảnh Tại Studio</span>
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed font-semibold">
                  Tại Studio 2 cột tiện lợi: điền tên bạn và người ấy, tải ảnh kỷ niệm chung, viết lá thư tình ngọt ngào
                  (có trợ lý AI gợi ý lời chúc chân thành), và chọn bài hát lãng mạn trong kho nhạc tuyển chọn.
                </p>
                <div className="pt-2 text-[11px] font-bold text-blue-600 bg-blue-50 p-2 rounded-xl inline-block">
                  ⚡ Màn hình xem trước Live Preview cập nhật tức thì bên phải!
                </div>
              </div>

              {/* Bước 3 */}
              <div className="bg-white rounded-3xl border-2 border-purple-100 p-6 shadow-sm hover:border-purple-300 transition-all space-y-3 relative overflow-hidden group">
                <div className="w-10 h-10 rounded-2xl bg-purple-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-purple-500/30">
                  03
                </div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-500" />
                  <span>Cài Mã PIN Số Hoặc Passcode Mở Quà</span>
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed font-semibold">
                  Nếu muốn tạo bất ngờ và tăng phần hồi hộp, bạn có thể cài mật mã bảo vệ (như ngày sinh của người ấy,
                  ngày 2 bạn bắt đầu yêu nhau). Người nhận phải nhập đúng mã mới được mở lá thư bí mật!
                </p>
                <div className="pt-2 text-[11px] font-bold text-purple-600 bg-purple-50 p-2 rounded-xl inline-block">
                  🔒 Bàn phím số hiệu ứng âm thanh click chân thực!
                </div>
              </div>

              {/* Bước 4 */}
              <div className="bg-white rounded-3xl border-2 border-emerald-100 p-6 shadow-sm hover:border-emerald-300 transition-all space-y-3 relative overflow-hidden group">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-emerald-500/30">
                  04
                </div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-500" />
                  <span>Nhận Link Máy Chủ Vĩnh Viễn & Mã QR</span>
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed font-semibold">
                  Bấm &ldquo;Tạo link ngay&rdquo;, hệ thống sẽ cấp mã quà (TK...) và sinh ra mã QR nghệ thuật cực nét.
                  Bạn chỉ việc copy link gửi qua tin nhắn Messenger/Zalo hoặc tải ảnh QR về in thiệp giấy.
                </p>
                <div className="pt-2">
                  <Link
                    href="/tra-cuu-don"
                    className="text-xs font-black text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                  >
                    <span>Kiểm tra lại quà tại Tra cứu đơn</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* CTA Studio */}
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 rounded-3xl p-6 sm:p-8 text-white text-center space-y-3 shadow-xl">
              <Sparkles className="w-8 h-8 mx-auto text-amber-300 animate-spin" />
              <h3 className="text-xl sm:text-2xl font-black">Bạn Đã Sẵn Sàng Tạo Món Quà Đầu Tiên Chưa?</h3>
              <p className="text-xs sm:text-sm text-pink-100 max-w-xl mx-auto font-semibold">
                Chỉ mất chưa đầy 2 phút để hoàn thành một món quà công nghệ 3D đầy cảm xúc dành cho người bạn yêu thương!
              </p>
              <div className="pt-2">
                <Link
                  href="/#san-pham"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-white text-pink-600 hover:bg-pink-50 font-black text-xs sm:text-sm shadow-lg transition-transform hover:scale-105"
                >
                  <span>Bắt Đầu Tạo Quà Ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: BẢO MẬT & MÃ PIN                                   */}
        {/* ========================================================= */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-3xl border-2 border-purple-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-purple-100 pb-4">
              <div className="p-3 rounded-2xl bg-purple-100 text-purple-700">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-900">Cách Cài Đặt Khóa Bí Mật & Mã PIN Bàn Phím</h2>
                <p className="text-xs font-bold text-zinc-500">
                  Tăng tính riêng tư và tạo sự bất ngờ khi người yêu mở món quà.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold text-zinc-700 leading-relaxed">
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
                <h4 className="font-black text-sm text-purple-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>1. Mã PIN số (Keypad PIN)</span>
                </h4>
                <p>
                  Dành cho các mẫu có bàn phím số pha lê (như Mẫu Hộp quà bí mật, Mẫu Két sắt tình yêu). Bạn chỉ cần
                  nhập từ 4 đến 6 chữ số (ví dụ: ngày sinh của người ấy <strong className="text-purple-700">1803</strong> hoặc ngày kỷ niệm).
                  Khi người ấy mở trang, bàn phím số cảm ứng sẽ xuất hiện kèm âm thanh tít tít chân thực!
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
                <h4 className="font-black text-sm text-blue-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>2. Mật khẩu chữ & câu gợi ý (Passcode)</span>
                </h4>
                <p>
                  Bạn có thể đặt mật khẩu là một từ đặc biệt gắn liền với kỷ niệm của 2 bạn (ví dụ: &ldquo;emyeu&rdquo;,
                  &ldquo;traxanh&rdquo;) kèm câu hỏi gợi ý như: &ldquo;Biệt danh anh hay gọi em khi ăn vụng là gì?&rdquo;.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                <h4 className="font-black text-sm text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>3. Nếu quên mã PIN hoặc người ấy bấm sai nhiều lần?</span>
                </h4>
                <p>
                  Bạn luôn có thể xem lại mã PIN đã lưu trong mục <Link href="/ho-so" className="text-pink-600 underline font-black">Hồ sơ cá nhân</Link> hoặc
                  nhắn tin qua Zalo cho Trí Kun để được hỗ trợ mở khóa ngay trong 1 phút.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: IN THIỆP 10x15CM                                   */}
        {/* ========================================================= */}
        {activeTab === 'print' && (
          <div className="bg-white rounded-3xl border-2 border-emerald-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-900">Hướng Dẫn In Thiệp Mã QR Chuẩn 10x15cm (Postcard)</h2>
                <p className="text-xs font-bold text-zinc-500">
                  Biến món quà online thành tấm thiệp thật cầm tay xinh xắn gửi tặng người yêu.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-zinc-700">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="text-base font-black text-emerald-600">Bước 1</div>
                <h4 className="font-black text-zinc-900 text-sm">Tải Ảnh Thiệp 300 DPI</h4>
                <p>
                  Tại màn hình hoàn tất sau khi tạo link quà, bấm nút &ldquo;Tải ảnh thiệp 10x15cm&rdquo;. File ảnh sẽ được tải về ở độ phân giải siêu nét không bị mờ.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="text-base font-black text-emerald-600">Bước 2</div>
                <h4 className="font-black text-zinc-900 text-sm">Chọn Chất Liệu Giấy In</h4>
                <p>
                  Mang file ảnh ra tiệm photocopy hoặc tiệm rửa ảnh gần nhất. Yêu cầu: <strong>In ảnh bóng lụa kích thước 10x15cm (khổ A6)</strong> hoặc giấy Couche 300gsm cứng cáp. Chi phí chỉ khoảng 3.000đ - 5.000đ / tấm!
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="text-base font-black text-emerald-600">Bước 3</div>
                <h4 className="font-black text-zinc-900 text-sm">Tặng Kèm Bó Hoa</h4>
                <p>
                  Đặt tấm thiệp vào phong bì thơm hoặc đính kèm bó hoa tươi. Khi người ấy mở máy ảnh quét mã QR, vũ trụ 3D lấp lánh sẽ bung mở ngay lập tức!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: GÓI VIP 49.000Đ                                    */}
        {/* ========================================================= */}
        {activeTab === 'vip' && (
          <div className="bg-white rounded-3xl border-2 border-amber-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-md">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-900">Quyền Lợi Độc Quyền Gói VIP Vĩnh Viễn (49.000đ)</h2>
                <p className="text-xs font-bold text-zinc-500">
                  Thanh toán 1 lần duy nhất qua VietQR Napas 24/7 - Sở hữu mãi mãi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-zinc-700">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-zinc-900">Giao diện sạch sẽ 100% không quảng cáo</h4>
                  <p className="text-zinc-600 font-semibold mt-1">
                    Toàn bộ banner và nút tạo quà ngoài được ẩn đi, chỉ tập trung vào câu chuyện tình yêu của bạn.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-zinc-900">Huy hiệu VIP Pha Lê Vàng</h4>
                  <p className="text-zinc-600 font-semibold mt-1">
                    Đính kèm huy hiệu VIP Vàng sang trọng trên đầu trang quà tặng, khẳng định sự đầu tư chu đáo của bạn.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-zinc-900">Hiệu ứng 3D đặc biệt không giới hạn</h4>
                  <p className="text-zinc-600 font-semibold mt-1">
                    Mở khóa hiệu ứng hạt pháo hoa nổ bung, mưa sao băng tình yêu và hạt tuyết rơi pha lê 60fps.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-zinc-900">Hỗ trợ kỹ thuật 24/7 trực tiếp từ Trí Kun</h4>
                  <p className="text-zinc-600 font-semibold mt-1">
                    Được ưu tiên hỗ trợ thay nhạc, đổi chữ hoặc chỉnh sửa ảnh bất kỳ lúc nào qua Zalo cá nhân.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-center">
              <a
                href="https://zalo.me/0348889059"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs sm:text-sm shadow-md shadow-amber-500/25 hover:opacity-95"
              >
                <Crown className="w-4 h-4" />
                <span>Nâng Cấp VIP Qua Zalo Ngay (49k)</span>
              </a>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: FAQ ACCORDION                                      */}
        {/* ========================================================= */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-zinc-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-pink-500" />
                  <span>Các Câu Hỏi Thường Gặp (FAQ)</span>
                </h2>
                <p className="text-xs font-bold text-zinc-500">
                  Giải đáp chi tiết tất cả những thắc mắc thường gặp của bạn.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {FAQ_LIST.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.q}
                    className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs hover:border-pink-300 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                          {faq.tag}
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-zinc-900">{faq.q}</h4>
                      </div>
                      <div className="p-1.5 rounded-xl bg-zinc-100 text-zinc-600 shrink-0">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-zinc-100 text-xs font-semibold text-zinc-600 leading-relaxed bg-zinc-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUPPORT BANNER TRÍ KUN */}
        <div className="bg-white rounded-3xl border-2 border-zinc-200 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
            <img
              src="/images/hero/chibi_1.jpg"
              alt="Trí Kun"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-pink-300 shadow-md ring-2 ring-pink-100"
            />
            <div className="space-y-1">
              <h4 className="text-base font-black text-zinc-900">
                Cần Thiết Kế Riêng Theo Yêu Cầu Hoặc Nhạc Tự Chọn?
              </h4>
              <p className="text-xs text-zinc-600 font-semibold max-w-lg">
                Nếu bạn muốn dựng website tình yêu với kịch bản độc quyền, 3D Chibi vẽ theo ảnh thật của 2 bạn hoặc
                nhạc nền riêng, hãy liên hệ trực tiếp với Trí Kun qua Zalo nhé!
              </p>
            </div>
          </div>

          <a
            href="https://zalo.me/0348889059"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-blue-500/25 flex items-center gap-2 shrink-0 transition-transform hover:scale-105"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat Zalo Trí Kun (0348 889 059)</span>
          </a>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}