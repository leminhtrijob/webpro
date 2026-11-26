'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import {
  ShoppingBag,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Gift,
  Phone,
  Copy,
  Check,
  Sparkles,
  CreditCard,
  MessageCircle,
  QrCode,
  RefreshCw,
  Crown,
  ChevronRight,
  Info
} from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  orderId: string;
  giftId?: string;
  templateName: string;
  customerName: string;
  customerPhone?: string;
  orderType: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: string;
  note?: string;
  createdAt: string;
}

interface GiftItem {
  giftId: string;
  templateSlug: string;
  templateName: string;
  recipientName: string;
  senderName?: string;
  viewsCount?: number;
  isVip?: boolean;
  createdAt: string;
  link: string;
}

interface LocalGift {
  id: string;
  templateName: string;
  recipientName: string;
  createdAt: string;
  link: string;
}

export default function OrderTrackingPage() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupSuccess, setLookupSuccess] = useState('');

  // Results
  const [foundOrders, setFoundOrders] = useState<OrderItem[]>([]);
  const [foundGifts, setFoundGifts] = useState<GiftItem[]>([]);
  const [localGifts, setLocalGifts] = useState<LocalGift[]>([]);

  // State modals
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPayOrder, setSelectedPayOrder] = useState<OrderItem | null>(null);

  // Load localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('trikun-gifts') || '[]');
      if (Array.isArray(saved)) setLocalGifts(saved);
    } catch {
      setLocalGifts([]);
    }
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? keyword).trim();
    if (!q) {
      setLookupError('Vui lòng nhập mã đơn hàng (OD...), mã quà (TK...) hoặc số điện thoại.');
      return;
    }

    setLookupError('');
    setLookupSuccess('');
    setLoading(true);

    try {
      // 1. Phán đoán: Mã quà tặng (TK...)
      if (/^TK[A-Z0-9]+$/i.test(q)) {
        const res = await fetch(`/api/gifts?id=${encodeURIComponent(q.toUpperCase())}`);
        const result = await res.json();
        if (res.ok && result.success && result.data) {
          const g = result.data;
          const giftItem: GiftItem = {
            giftId: g.giftId,
            templateSlug: g.templateSlug || '3d-galaxy',
            templateName: g.templateName || 'Vũ trụ tình yêu',
            recipientName: g.recipientName || 'Người thương',
            senderName: g.senderName || 'Người gửi ẩn danh',
            viewsCount: g.viewsCount || 0,
            isVip: Boolean(g.isVip),
            createdAt: g.createdAt || new Date().toISOString(),
            link: `/v/${g.templateSlug || '3d-galaxy'}?id=${g.giftId}`
          };
          setFoundGifts([giftItem]);
          setFoundOrders([]);
          setLookupSuccess(`Đã tìm thấy món quà máy chủ: ${giftItem.giftId}`);
        } else {
          setLookupError('Không tìm thấy mã quà tặng này trên máy chủ MongoDB.');
        }
      }
      // 2. Phán đoán: Mã đơn hàng (OD...)
      else if (/^OD[A-Z0-9]+$/i.test(q)) {
        const res = await fetch(`/api/orders?id=${encodeURIComponent(q.toUpperCase())}`);
        const result = await res.json();
        if (res.ok && result.success && result.data) {
          setFoundOrders([result.data]);
          setFoundGifts([]);
          setLookupSuccess(`Đã tìm thấy đơn hàng: ${result.data.orderId}`);
        } else {
          setLookupError(result.message || 'Không tìm thấy đơn hàng này trên máy chủ.');
        }
      }
      // 3. Phán đoán: Số điện thoại (9-11 số)
      else if (/^[0-9+ ]{9,15}$/.test(q)) {
        const res = await fetch(`/api/orders?phone=${encodeURIComponent(q)}`);
        const result = await res.json();
        if (res.ok && result.success && Array.isArray(result.data) && result.data.length > 0) {
          setFoundOrders(result.data);
          setFoundGifts([]);
          setLookupSuccess(`Tìm thấy ${result.data.length} đơn hàng theo số điện thoại.`);
        } else {
          setLookupError('Không tìm thấy đơn hàng nào liên kết với số điện thoại này.');
        }
      }
      // 4. Tìm kiếm từ khóa trong localGifts
      else {
        const matched = localGifts.filter(
          (g) =>
            g.id.toLowerCase().includes(q.toLowerCase()) ||
            g.recipientName.toLowerCase().includes(q.toLowerCase()) ||
            g.templateName.toLowerCase().includes(q.toLowerCase())
        );
        if (matched.length > 0) {
          setLookupSuccess(`Tìm thấy ${matched.length} món quà đã lưu trên máy của bạn.`);
        } else {
          setLookupError('Không tìm thấy mã quà hoặc đơn hàng phù hợp. Hãy nhập chính xác mã TK... hoặc OD...');
        }
      }
    } catch {
      setLookupError('Lỗi kết nối máy chủ khi tra cứu. Vui lòng kiểm tra lại mạng.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLocalGifts = useMemo(() => {
    if (!keyword) return localGifts;
    const k = keyword.toLowerCase();
    return localGifts.filter(
      (g) =>
        g.id.toLowerCase().includes(k) ||
        g.recipientName.toLowerCase().includes(k) ||
        g.templateName.toLowerCase().includes(k)
    );
  }, [localGifts, keyword]);

  return (
    <div
      className="min-h-screen bg-[#FFFDFC] text-zinc-900 flex flex-col font-sans"
      style={{ fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
    >
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* HERO TITLE */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-100 text-pink-700 text-xs font-black uppercase tracking-wider border border-pink-200">
            <ShoppingBag className="w-4 h-4 text-pink-600" />
            <span>Trung Tâm Tra Cứu Đơn Hàng & Quà Tặng 3D</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
            Kiểm Tra Tình Trạng Quà & Đơn VietQR
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-semibold">
            Nhập <strong className="text-pink-600 font-black">Mã quà tặng (TK...)</strong>,{' '}
            <strong className="text-blue-600 font-black">Mã đơn hàng (OD...)</strong> hoặc{' '}
            <strong className="text-purple-600 font-black">Số điện thoại</strong> để kiểm tra trạng thái kích hoạt VIP,
            lấy lại đường link 3D và thông tin thanh toán.
          </p>
        </div>

        {/* SEARCH BOX PRO */}
        <div className="bg-white rounded-3xl border-2 border-pink-200 p-4 sm:p-5 shadow-xl shadow-pink-100/50 max-w-2xl mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Nhập mã OD..., mã TK... hoặc số điện thoại của bạn..."
              className="flex-1 text-xs sm:text-sm bg-transparent outline-none text-zinc-900 font-bold placeholder:text-zinc-400"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => {
                  setKeyword('');
                  setLookupError('');
                  setLookupSuccess('');
                  setFoundOrders([]);
                  setFoundGifts([]);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-700 p-1 font-black"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-black shadow-md shadow-pink-500/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Tra cứu ngay</span>
            </button>
          </div>

          {/* Quick Suggestions Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-bold text-zinc-500">
            <span className="text-zinc-400 font-semibold">Gợi ý cú pháp:</span>
            <button
              type="button"
              onClick={() => {
                setKeyword('OD');
                setLookupError('Vui lòng dán đầy đủ mã đơn hàng bạn đã nhận khi tạo đơn VietQR (VD: OD1234...)');
              }}
              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              Mã đơn hàng (OD...)
            </button>
            <button
              type="button"
              onClick={() => {
                setKeyword('TK');
                setLookupError('Vui lòng dán đầy đủ mã quà tặng máy chủ (VD: TK98F81...)');
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
            >
              Mã quà (TK...)
            </button>
            <button
              type="button"
              onClick={() => {
                setKeyword('0348889059');
                handleSearch('0348889059');
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              Tra theo SĐT Zalo
            </button>
          </div>
        </div>

        {/* FEEDBACK STATUS */}
        {lookupError && (
          <div className="max-w-2xl mx-auto p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{lookupError}</span>
          </div>
        )}
        {lookupSuccess && (
          <div className="max-w-2xl mx-auto p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{lookupSuccess}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* KẾT QUẢ TRA CỨU ĐƠN HÀNG (foundOrders)                    */}
        {/* ========================================================= */}
        {foundOrders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-black text-zinc-900">
                Đơn Hàng VietQR Tìm Thấy ({foundOrders.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {foundOrders.map((order) => {
                const isPaid = order.status === 'completed';
                const isPending = order.status === 'pending';
                const isCancelled = order.status === 'cancelled';

                return (
                  <div
                    key={order.orderId}
                    className="bg-white rounded-3xl border-2 border-zinc-200 p-5 sm:p-6 shadow-sm hover:border-blue-400 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono font-black text-xs sm:text-sm text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                            {order.orderId}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isPending
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {isPaid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {isPending && <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />}
                            {isCancelled && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            <span>
                              {isPaid
                                ? 'ĐÃ KÍCH HOẠT VIP THÀNH CÔNG'
                                : isPending
                                ? 'ĐANG CHỜ DUYỆT THANH TOÁN'
                                : 'ĐÃ HỦY ĐƠN'}
                            </span>
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-zinc-900">
                          {order.templateName}
                        </h3>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs text-zinc-500 font-bold block">Tổng thanh toán:</span>
                        <span className="text-xl sm:text-2xl font-black text-pink-600">
                          {order.amount.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>

                    {/* Details row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-zinc-700 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
                      <div>
                        <span className="text-zinc-400 block text-[11px] font-semibold">Khách hàng:</span>
                        <span className="text-zinc-900 font-black">{order.customerName}</span>
                        {order.customerPhone && (
                          <span className="block text-zinc-500 text-[11px] font-mono">{order.customerPhone}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[11px] font-semibold">Hình thức & Ngày tạo:</span>
                        <span className="text-zinc-900 font-black">{order.paymentMethod || 'VietQR ACB'}</span>
                        <span className="block text-zinc-500 text-[11px]">
                          {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[11px] font-semibold">Mã quà tặng liên kết:</span>
                        {order.giftId ? (
                          <span className="font-mono text-purple-700 font-black">{order.giftId}</span>
                        ) : (
                          <span className="text-zinc-400 italic">Không có</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => setSelectedPayOrder(order)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Xem mã QR thanh toán lại</span>
                          </button>
                        )}
                        <a
                          href={`https://zalo.me/0348889059?text=${encodeURIComponent(
                            `Chào Trí Kun, tôi muốn kiểm tra đơn hàng ${order.orderId} (${order.customerName} - ${order.amount.toLocaleString('vi-VN')}đ)`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-black flex items-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4 text-blue-600" />
                          <span>Hỗ trợ Zalo 24/7</span>
                        </a>
                      </div>

                      {order.giftId && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                `${window.location.origin}/v/3d-galaxy?id=${order.giftId}`,
                                order.orderId
                              )
                            }
                            className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-black transition-colors"
                            title="Copy link quà 3D"
                          >
                            {copiedId === order.orderId ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <Link
                            href={`/v/3d-galaxy?id=${order.giftId}`}
                            target="_blank"
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-pink-500/20"
                          >
                            <span>Mở quà tặng 3D</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* KẾT QUẢ TRA CỨU QUÀ TẶNG MÁY CHỦ (foundGifts)             */}
        {/* ========================================================= */}
        {foundGifts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <h2 className="text-base sm:text-lg font-black text-zinc-900">
                Quà Tặng Máy Chủ Tìm Thấy ({foundGifts.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {foundGifts.map((gift) => (
                <div
                  key={gift.giftId}
                  className="bg-white rounded-3xl border-2 border-purple-200 p-5 sm:p-6 shadow-sm hover:border-purple-400 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-black text-xs sm:text-sm text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                          {gift.giftId}
                        </span>
                        {gift.isVip ? (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-xs">
                            <Crown className="w-3.5 h-3.5" />
                            <span>VIP VĨNH VIỄN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600">
                            Bản Miễn Phí
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-zinc-900">
                        {gift.templateName}
                      </h3>
                      <p className="text-xs font-bold text-zinc-600 mt-0.5">
                        Người nhận: <strong className="text-pink-600 font-black">{gift.recipientName}</strong>{' '}
                        {gift.senderName && (
                          <span className="text-zinc-500">
                            • Gửi bởi: <strong className="text-zinc-800">{gift.senderName}</strong>
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(`${window.location.origin}${gift.link}`, gift.giftId)}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedId === gift.giftId ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700">Đã copy link</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-zinc-600" />
                            <span>Copy link 3D</span>
                          </>
                        )}
                      </button>
                      <Link
                        href={gift.link}
                        target="_blank"
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-500/25"
                      >
                        <span>Mở trực tiếp</span>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-500">
                    <span>Ngày tạo: {new Date(gift.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span>• Lượt xem: {gift.viewsCount || 0} lần</span>
                    <span>• Trạng thái dữ liệu: Đã lưu an toàn trên MongoDB Atlas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DANH SÁCH QUÀ LƯU TRÊN TRÌNH DUYỆT (localStorage)          */}
        {/* ========================================================= */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                <span>Quà Đã Tạo Trên Trình Duyệt Này ({filteredLocalGifts.length})</span>
              </h2>
              <p className="text-xs font-bold text-zinc-500">
                Các đường link bạn đã tạo gần đây trên máy tính hoặc điện thoại này.
              </p>
            </div>
            <Link
              href="/#san-pham"
              className="text-xs font-black text-pink-600 hover:text-pink-700 inline-flex items-center gap-1"
            >
              <span>+ Tạo thêm quà mới</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {filteredLocalGifts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-zinc-200 p-6 space-y-3">
              <Gift className="w-12 h-12 text-zinc-300 mx-auto" />
              <h4 className="text-sm font-black text-zinc-700">Chưa tìm thấy món quà nào trên trình duyệt này</h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto font-semibold">
                Nếu bạn đã tạo quà ở một thiết bị khác, hãy nhập mã quà (TK...) hoặc mã đơn (OD...) vào ô tìm kiếm ở trên để tra cứu từ máy chủ nhé!
              </p>
              <Link
                href="/#san-pham"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-black shadow-md shadow-pink-500/25"
              >
                <span>Khám phá 122+ mẫu 3D</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredLocalGifts.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-zinc-200 hover:border-pink-300 p-4 flex flex-col justify-between gap-3 shadow-xs transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono font-black text-pink-600">{order.id}</span>
                      <span className="text-[11px] font-bold text-zinc-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo'}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-zinc-900">{order.templateName}</h4>
                    <p className="text-xs font-bold text-zinc-600">
                      Gửi tặng: <strong className="text-pink-600 font-black">{order.recipientName}</strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => handleCopy(`${window.location.origin}${order.link}`, order.id)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedId === order.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Đã copy</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>
                    <Link
                      href={order.link}
                      className="px-3.5 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 text-xs font-black flex items-center gap-1 transition-colors"
                    >
                      <span>Mở link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================= */}
      {/* MODAL THANH TOÁN LẠI VIETQR KHI ĐƠN ĐANG CHỜ DUYỆT        */}
      {/* ========================================================= */}
      {selectedPayOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-amber-300 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-zinc-900">Thông Tin Chuyển Khoản VietQR</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayOrder(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 font-black"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs font-bold text-zinc-600">
                Quét mã QR qua app ngân hàng của bạn để hệ thống tự động điền đúng STK và nội dung:
              </p>
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 inline-block shadow-inner">
                <img
                  src={`https://img.vietqr.io/image/ACB-5426181-compact2.png?amount=${selectedPayOrder.amount}&addInfo=${encodeURIComponent(
                    selectedPayOrder.orderId
                  )}&accountName=${encodeURIComponent('VO TAN TRI')}`}
                  alt="Mã VietQR"
                  className="w-56 h-56 mx-auto object-contain rounded-xl"
                />
              </div>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs font-bold text-zinc-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Ngân hàng:</span>
                <span className="font-black text-zinc-900">ACB (Á Châu)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Số tài khoản:</span>
                <span className="font-mono font-black text-blue-700">5426181</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Chủ tài khoản:</span>
                <span className="font-black text-zinc-900">VO TAN TRI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Số tiền:</span>
                <span className="font-black text-pink-600">
                  {selectedPayOrder.amount.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Nội dung CK:</span>
                <span className="font-mono font-black text-purple-700">{selectedPayOrder.orderId}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href={`https://zalo.me/0348889059?text=${encodeURIComponent(
                  `Chào Trí Kun, tôi đã chuyển khoản cho đơn hàng ${selectedPayOrder.orderId} (${selectedPayOrder.amount}đ), nhờ Trí Kun duyệt giúp tôi nhé!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black text-center shadow-md flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Gửi bill qua Zalo duyệt liền</span>
              </a>
              <button
                type="button"
                onClick={() => setSelectedPayOrder(null)}
                className="px-4 py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-black"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <BottomNav />
    </div>
  );
}