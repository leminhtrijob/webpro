'use client';

import Link from 'next/link';
import { ArrowRight, Gift, Heart, QrCode } from 'lucide-react';

export default function HomeClosingCta() {
  return (
    <section aria-labelledby="home-closing-title" className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.75rem] border border-white/90 bg-[linear-gradient(125deg,rgba(255,249,253,.98),rgba(251,231,249,.96)_48%,rgba(232,217,255,.94))] px-6 py-10 sm:px-12 sm:py-14 shadow-[0_18px_44px_rgba(124,55,143,.16),inset_0_2px_2px_#fff]">
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-fuchsia-300/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-purple-300/20 blur-3xl" aria-hidden="true" />
      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="max-w-2xl">
          <span className="tk-home-kicker inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold">
            <Heart className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
            Món quà của riêng bạn
          </span>
          <h2 id="home-closing-title" className="tk-home-heading mt-5 text-3xl sm:text-5xl">
            Một lời chúc, một kỷ niệm đáng nhớ
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#5B4567] sm:text-base">
            Thêm tên người nhận, lời nhắn, ảnh và nhạc vào mẫu trái tim TriKun. Xem trước món quà, rồi tạo đường link để gửi đi.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/studio/trikun-heart" className="tk-home-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F92583] to-[#9352E8] px-6 py-3 text-sm font-extrabold text-white shadow-[0_9px_22px_rgba(211,54,151,.24)] transition-transform duration-200 hover:-translate-y-0.5">
              <Gift className="h-4 w-4" /> Tạo quà trái tim <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/qr-tinh-yeu" className="tk-home-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#DDB8EF] bg-white/80 px-6 py-3 text-sm font-extrabold text-[#592A7D] transition-colors duration-200 hover:bg-white">
              <QrCode className="h-4 w-4" /> Tạo mã QR nghệ thuật
            </Link>
          </div>
        </div>
        <div className="relative hidden lg:flex aspect-square items-center justify-center rounded-[2.5rem] border border-white/80 bg-white/45 shadow-[inset_0_2px_2px_#fff,0_16px_32px_rgba(135,69,168,.12)]" aria-hidden="true">
          <div className="absolute h-48 w-48 rounded-full border border-pink-300/80" />
          <div className="absolute h-56 w-56 rounded-full border border-purple-300/60" />
          <Heart className="h-32 w-32 fill-[#FF5EA7] text-[#FF2F8A] drop-shadow-[0_12px_18px_rgba(243,67,151,.25)]" strokeWidth={1.2} />
          <span className="absolute bottom-10 rounded-full border border-white bg-white/85 px-4 py-1.5 text-xs font-bold text-[#773D91] shadow-sm">Gửi đi bằng một đường link ♡</span>
        </div>
      </div>
    </section>
  );
}
