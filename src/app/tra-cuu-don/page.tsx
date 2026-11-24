'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import { ShoppingBag, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function OrderTrackingPage() {
  const [keyword, setKeyword] = useState('');
  const [orders, setOrders] = useState<Array<{id:string;templateName:string;recipientName:string;createdAt:string;link:string}>>([]);
  const [lookupError, setLookupError] = useState('');
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('trikun-gifts') || '[]');
      if (Array.isArray(saved)) setOrders(saved);
    } catch { setOrders([]); }
  }, []);
  const filteredOrders = orders.filter((o) =>
    o.id.toLowerCase().includes(keyword.toLowerCase()) ||
    o.recipientName.toLowerCase().includes(keyword.toLowerCase())
  );
  const lookup = async () => {
    setLookupError('');
    const id = keyword.trim();
    if (!/^TK[A-Z0-9]+$/i.test(id)) {
      setLookupError('Nhập đúng mã quà TK để tra cứu trên máy chủ.');
      return;
    }
    try {
      const res = await fetch(`/api/gifts?id=${encodeURIComponent(id)}`);
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error();
      const gift = result.data;
      const found = {
        id: gift.giftId,
        templateName: gift.templateName,
        recipientName: gift.recipientName,
        createdAt: gift.createdAt,
        link: `/v/${gift.templateSlug}?id=${gift.giftId}`
      };
      setOrders((prev) => [found, ...prev.filter((o) => o.id !== found.id)]);
    } catch { setLookupError('Không tìm thấy mã này trên máy chủ. Nếu quà được tạo ở chế độ link, hãy mở lại link đã lưu.'); }
  };

  return (
    <div className="min-h-screen bg-[#FFFBFC] text-[#2D1F24] flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex p-2.5 rounded-2xl bg-[#FFF0F4] text-[#FF4F86]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#2D1F24]">
            Tra Cứu Đơn Quà Của Tôi
          </h1>
          <p className="text-xs sm:text-sm text-[#7D646D]">
            Xem lại các link quà đã tạo trên trình duyệt này, hoặc nhập mã TK để tra cứu quà đã lưu trên máy chủ.
          </p>
        </div>

        {/* Search input */}
        <div className="bg-white rounded-3xl border border-[#F0DDE3] p-4 shadow-sm flex items-center gap-3 max-w-xl mx-auto">
          <Search className="w-5 h-5 text-[#9A8490]" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
            }}
            placeholder="Nhập mã quà (TK...) hoặc tên người nhận..."
            className="flex-1 text-xs sm:text-sm bg-transparent outline-none text-[#2D1F24]"
          />
          {keyword && (
            <button onClick={() => setKeyword('')} className="text-xs text-[#9A8490]">
              ✕
            </button>
          )}
          <button onClick={lookup} className="px-3 py-2 rounded-xl bg-[#FF4F86] text-white text-xs font-bold">Tra mã</button>
        </div>
        {lookupError && <p className="text-center text-xs text-red-600">{lookupError}</p>}

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-[#F0DDE3] text-xs text-[#7D646D]">
              Chưa có quà tặng nào phù hợp. Hãy tạo quà hoặc nhập mã TK để tra cứu.
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#F0DDE3] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#FF4F86] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#FF4F86]">{order.id}</span>
                    <span className="text-[10px] text-[#9A8490]">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#2D1F24]">{order.templateName}</h4>
                  <p className="text-xs text-[#7D646D]">
                    Gửi tặng: <strong className="text-[#FF4F86]">{order.recipientName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={order.link}
                    className="px-3.5 py-2 rounded-xl bg-[#FFF0F4] text-[#FF4F86] text-xs font-bold hover:bg-[#FDE8EF] flex items-center gap-1 transition-colors"
                  >
                    <span>Mở link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
