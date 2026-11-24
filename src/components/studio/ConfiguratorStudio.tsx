'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Camera,
  Mail,
  Music,
  Lock,
  Settings,
  CheckCircle2,
  Upload,
  Play,
  Pause,
  Lightbulb,
  ArrowRight,
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';
import { GiftConfig, TemplateItem } from '@/models/gift';
import { ROMANTIC_PLAYLIST } from '@/data/music';
import { WISH_TEMPLATES } from '@/data/wishes';
import LivePreviewCanvas from '@/components/preview/LivePreviewCanvas';
import VietQrModal from '@/components/modals/VietQrModal';
import ShareLinkModal from '@/components/modals/ShareLinkModal';

interface ConfiguratorStudioProps {
  template: TemplateItem;
}

export default function ConfiguratorStudio({ template }: ConfiguratorStudioProps) {
  const vipSupported = !/thu-tinh|hop-thu|letter|simple|2d/.test(template.slug);
  // Main Gift State
  const [config, setConfig] = useState<GiftConfig>({
    templateSlug: template.slug,
    templateName: template.name,
    recipientName: 'Bé Yêu',
    senderName: 'Trí Kun',

    // 1. Hạt
    particlesEnabled: true,
    particleColor: '#FF4F86',
    particleCount: 180,
    particleType: 'heart',

    // 2. Ảnh (Mặc định có sẵn 6 ảnh Chibi TriKun Love cực cute để render ngay mà không dính bản quyền)
    images: [
      '/demo/photos/1.jpg?v=chibi',
      '/demo/photos/2.jpg?v=chibi',
      '/demo/photos/3.jpg?v=chibi',
      '/demo/photos/4.jpg?v=chibi',
      '/demo/photos/5.jpg?v=chibi',
      '/demo/photos/6.jpg?v=chibi'
    ],
    showSphere3D: true,

    // 3. Thư
    letterEnabled: true,
    letterTitle: 'Gửi người anh thương ❤️',
    letterContent:
      'Gặp được em là điều may mắn nhất đời anh. Cảm ơn em đã luôn ở bên, dịu dàng và yêu thương anh. Chúc cho tình yêu của chúng mình mãi luôn bền chặt và ngập tràn hạnh phúc nhé! ✨',
    showLetterPhoto: true,

    // 4. Nhạc
    musicId: 'm1',
    musicTitle: 'Lễ Đường (Romantic Piano)',
    musicUrl: '/audio/leduong.mp3',
    autoPlay: true,

    // 5. Mật khẩu
    passcodeEnabled: false,
    passcode: '1402',
    passcodeHint: 'Ngày lễ tình nhân đặc biệt của chúng mình 💖',

    // 6. Nâng cao
    themeColor: '#FF4F86',
    tabTitle: `Món quà gửi tặng ${template.name}`,
    isVip: false
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<'particles' | 'photos' | 'letter' | 'music' | 'passcode' | 'advanced'>('letter');

  // Modals state
  const [showWishModal, setShowWishModal] = useState(false);
  const [showVietQrModal, setShowVietQrModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [orderType, setOrderType] = useState<'vip_link' | 'buy_source'>('vip_link');
  const [paymentOrderId, setPaymentOrderId] = useState('');
  const [paymentGiftId, setPaymentGiftId] = useState('');
  const [generatedGiftUrl, setGeneratedGiftUrl] = useState('');
  const [createError, setCreateError] = useState('');
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  // Toggle Audio Sample
  const handlePlayAudio = (url: string, id: string) => {
    if (audioObj) {
      audioObj.pause();
    }
    if (currentPlayingTrack === id) {
      setCurrentPlayingTrack(null);
      return;
    }
    const newAudio = new Audio(url);
    newAudio.play().catch(() => {});
    setAudioObj(newAudio);
    setCurrentPlayingTrack(id);
  };

  // Image Upload Simulation
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setConfig((prev) => ({
            ...prev,
            images: [event.target?.result as string, ...prev.images]
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate Real Link (Saved to Cloud MongoDB Atlas)
  const persistGift = async () => {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      if (!res.ok || !data.success || !data.giftUrl) throw new Error(data.message || 'Không thể tạo quà');
      const giftId = data.giftId as string;
      const giftUrl = new URL(data.giftUrl, origin).href;
    try {
      const previous = JSON.parse(localStorage.getItem('trikun-gifts') || '[]');
      const orders = Array.isArray(previous) ? previous : [];
      localStorage.setItem('trikun-gifts', JSON.stringify([{
        id: giftId,
        templateName: config.templateName,
        recipientName: config.recipientName,
        createdAt: new Date().toISOString(),
        link: giftUrl
      }, ...orders].slice(0, 100)));
    } catch { /* The shared link still works if browser storage is unavailable. */ }
    return { giftId, giftUrl, savedToMongo: Boolean(data.savedToMongo) };
  };

  const handleCreateRealLink = async () => {
    setCreateError('');
    try {
      const gift = await persistGift();
      setGeneratedGiftUrl(gift.giftUrl);
      setShowShareModal(true);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Không thể tạo quà');
    }
  };

  // Trigger VIP VietQR Modal
  const handleOpenVipOrder = async () => {
    setCreateError('');
    if (!vipSupported) {
      setCreateError('Mẫu này chưa hỗ trợ nâng cấp VIP.');
      return;
    }
    try {
      const gift = await persistGift();
      if (!gift.savedToMongo) throw new Error('Cần kết nối database để tạo đơn VIP');
      setPaymentGiftId(gift.giftId);
      setGeneratedGiftUrl(gift.giftUrl);
      setPaymentOrderId(crypto.randomUUID());
      setOrderType('vip_link');
      setShowVietQrModal(true);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Không thể tạo đơn VIP');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBFC] text-[#2D1F24] flex flex-col">
      {/* Studio Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-[#F0DDE3] sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-bold text-[#5C454D] hover:text-[#FF4F86] px-3 py-1.5 rounded-xl bg-[#FFF5F8] border border-[#F0DDE3] transition-colors"
            >
              ← Quay về Trang chủ
            </Link>
            <div className="hidden sm:block">
              <span className="text-xs text-[#9A8490]">Đang tùy biến: </span>
              <span className="text-xs font-bold text-[#2D1F24]">{template.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/v/${template.slug}?preview=1`}
              target="_blank"
              className="px-3.5 py-2 rounded-xl border border-[#FFB8D2] text-[#7A1C4B] bg-[#FFF5FA] hover:bg-[#FFE4F0] text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-[#FF1E6A]" />
              <span className="hidden sm:inline">Xem mẫu toàn màn hình</span>
            </Link>

            <a
              href={`https://zalo.me/0345151438?text=${encodeURIComponent(
                `Chào Trí Kun, mình muốn nhờ bạn làm giúp mẫu ${template.name} cho người yêu tên là ${config.recipientName}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl border border-[#0068FF]/30 text-[#0068FF] bg-[#0068FF]/5 hover:bg-[#0068FF]/10 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Nhờ Trí Kun làm hộ</span>
            </a>

            <button
              onClick={handleCreateRealLink}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] text-white text-xs sm:text-sm font-black shadow-md shadow-[#FF4F86]/25 hover:opacity-95 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>Tạo link & QR ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {createError && <span role="alert" className="text-xs text-red-600">{createError}</span>}
          </div>
        </div>
      </div>

      {/* Main Studio Body: 2 Columns Split Layout */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form cấu hình */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[#2D1F24]">Nội dung quà tặng</h2>
            <button
              onClick={() => {
                setConfig((prev) => ({
                  ...prev,
                  recipientName: 'Người thương',
                  senderName: 'Trí Kun'
                }));
              }}
              className="text-xs text-[#9A8490] hover:text-[#FF4F86] flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset dữ liệu</span>
            </button>
          </div>

          {/* 6 Tabs Horizontal Navigation with Badges */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { id: 'particles', label: 'Hiệu ứng hạt', icon: Sparkles, activeText: config.particlesEnabled ? 'Đã bật' : 'Đã tắt', isDone: config.particlesEnabled },
              { id: 'photos', label: 'Ảnh đôi', icon: Camera, activeText: `${config.images.length} ảnh`, isDone: config.images.length > 0 },
              { id: 'letter', label: 'Thư tình', icon: Mail, activeText: config.letterEnabled ? 'Đã viết' : 'Chưa viết', isDone: config.letterEnabled && config.letterContent.length > 10 },
              { id: 'music', label: 'Nhạc nền', icon: Music, activeText: 'Đã chọn', isDone: !!config.musicUrl },
              { id: 'passcode', label: 'Mật khẩu', icon: Lock, activeText: config.passcodeEnabled ? 'Đang bật' : 'Đã tắt', isDone: config.passcodeEnabled },
              { id: 'advanced', label: 'Nâng cao', icon: Settings, activeText: 'Tùy chọn', isDone: false }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between relative ${
                    isSelected
                      ? 'bg-white border-[#FF4F86] shadow-md shadow-[#FF4F86]/10 scale-[1.02]'
                      : 'bg-white/60 border-[#F0DDE3] hover:bg-white'
                  }`}
                >
                  {/* Status Indicator */}
                  {tab.isDone && (
                    <div className="absolute top-1.5 right-1.5 text-emerald-500">
                      <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-100" />
                    </div>
                  )}

                  <div className={`p-2 rounded-xl mb-1.5 ${isSelected ? 'bg-[#FFF0F4] text-[#FF4F86]' : 'text-[#7D646D]'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#2D1F24] truncate w-full">{tab.label}</span>
                  <span className="text-[9px] text-[#9A8490]">{tab.activeText}</span>
                </button>
              );
            })}
          </div>

          {/* ACTIVE TAB CONTENT BOX */}
          <div className="bg-white rounded-3xl border border-[#F0DDE3] p-5 shadow-sm space-y-4">
            {/* TAB 1: HIỆU ỨNG HẠT */}
            {activeTab === 'particles' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0DDE3]">
                  <div>
                    <h3 className="text-sm font-bold text-[#2D1F24]">Hiệu ứng hạt vũ trụ</h3>
                    <p className="text-xs text-[#7D646D]">Tạo các hạt phát sáng lấp lánh bay lượn xung quanh trái tim</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.particlesEnabled}
                    onChange={(e) => setConfig({ ...config, particlesEnabled: e.target.checked })}
                    className="w-5 h-5 accent-[#FF4F86] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#5C454D] block mb-2">Màu sắc hạt phát sáng:</label>
                  <div className="flex items-center gap-3">
                    {['#FF4F86', '#E8638A', '#8B5CF6', '#38BDF8', '#F59E0B'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setConfig({ ...config, particleColor: color })}
                        style={{ backgroundColor: color }}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          config.particleColor === color ? 'border-black scale-110 shadow-md' : 'border-white'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      value={config.particleColor}
                      onChange={(e) => setConfig({ ...config, particleColor: e.target.value })}
                      className="w-9 h-9 rounded-xl border border-[#F0DDE3] cursor-pointer p-0.5 bg-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#5C454D] block mb-1">
                    Mật độ hạt: {config.particleCount} hạt
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="350"
                    step="10"
                    value={config.particleCount}
                    onChange={(e) => setConfig({ ...config, particleCount: parseInt(e.target.value) })}
                    className="w-full accent-[#FF4F86]"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: ẢNH KỶ NIỆM */}
            {activeTab === 'photos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0DDE3]">
                  <div>
                    <h3 className="text-sm font-bold text-[#2D1F24]">Ảnh kỷ niệm của hai bạn</h3>
                    <p className="text-xs text-[#7D646D]">Tải ảnh đẹp để lồng vào lá thư hoặc quả cầu ảnh 3D</p>
                  </div>
                  <label className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF4F86] to-[#E8638A] text-white text-xs font-bold cursor-pointer hover:opacity-90 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Thêm ảnh</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {/* Photos List */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {config.images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-[#F0DDE3] group">
                      <img src={img} alt={`Kỷ niệm ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() =>
                          setConfig({
                            ...config,
                            images: config.images.filter((_, idx) => idx !== i)
                          })
                        }
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-[#5C454D]">Hiệu ứng xoay quả cầu 3D (Sphere Gallery):</span>
                  <input
                    type="checkbox"
                    checked={config.showSphere3D}
                    onChange={(e) => setConfig({ ...config, showSphere3D: e.target.checked })}
                    className="w-5 h-5 accent-[#FF4F86] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: LÁ THƯ TÌNH CẢM */}
            {activeTab === 'letter' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0DDE3]">
                  <div>
                    <h3 className="text-sm font-bold text-[#2D1F24]">Lá thư yêu thương</h3>
                    <p className="text-xs text-[#7D646D]">Những dòng tâm sự chân thành gửi gắm đến người ấy</p>
                  </div>
                  <button
                    onClick={() => setShowWishModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#FFF0F4] text-[#FF4F86] text-xs font-bold hover:bg-[#FDE8EF] border border-[#F0DDE3] flex items-center gap-1.5 transition-colors"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Gợi ý thư</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#5C454D] block mb-1">Tên người nhận:</label>
                    <input
                      type="text"
                      value={config.recipientName}
                      onChange={(e) => setConfig({ ...config, recipientName: e.target.value })}
                      placeholder="Ví dụ: Em bé, Bé Uyên..."
                      className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5C454D] block mb-1">Tên người gửi:</label>
                    <input
                      type="text"
                      value={config.senderName}
                      onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                      placeholder="Ví dụ: Trí Kun, Anh iu..."
                      className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#5C454D] block mb-1">Tiêu đề bức thư:</label>
                  <input
                    type="text"
                    value={config.letterTitle}
                    onChange={(e) => setConfig({ ...config, letterTitle: e.target.value })}
                    placeholder="Gửi người anh thương..."
                    className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#5C454D] block mb-1">Nội dung thư:</label>
                  <textarea
                    rows={4}
                    value={config.letterContent}
                    onChange={(e) => setConfig({ ...config, letterContent: e.target.value })}
                    placeholder="Nhập những lời yêu thương bạn muốn nhắn gửi..."
                    className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86] leading-relaxed font-serif"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-[#5C454D]">Kèm ảnh kỷ niệm dưới lá thư:</span>
                  <input
                    type="checkbox"
                    checked={config.showLetterPhoto}
                    onChange={(e) => setConfig({ ...config, showLetterPhoto: e.target.checked })}
                    className="w-5 h-5 accent-[#FF4F86] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: NHẠC NỀN */}
            {activeTab === 'music' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#F0DDE3]">
                  <h3 className="text-sm font-bold text-[#2D1F24]">Chọn bài hát nền</h3>
                  <p className="text-xs text-[#7D646D]">Nhạc được phát sau khi người nhận tương tác với trang quà.</p>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {ROMANTIC_PLAYLIST.map((track) => (
                    <div
                      key={track.id}
                      onClick={() =>
                        setConfig({
                          ...config,
                          musicId: track.id,
                          musicTitle: `${track.title} - ${track.artist}`,
                          musicUrl: track.url
                        })
                      }
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        config.musicId === track.id
                          ? 'bg-[#FFF0F4] border-[#FF4F86] shadow-xs'
                          : 'bg-[#FFF9FA] border-[#F0DDE3] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAudio(track.url, track.id);
                          }}
                          className="w-8 h-8 rounded-full bg-[#FF4F86] text-white flex items-center justify-center hover:scale-105 transition-transform"
                        >
                          {currentPlayingTrack === track.id ? (
                            <Pause className="w-4 h-4 fill-white" />
                          ) : (
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          )}
                        </button>
                        <div>
                          <p className="text-xs font-bold text-[#2D1F24]">{track.title}</p>
                          <p className="text-[10px] text-[#9A8490]">{track.artist}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-[#7D646D]">{track.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: MÀN HÌNH MẬT KHẨU */}
            {activeTab === 'passcode' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0DDE3]">
                  <div>
                    <h3 className="text-sm font-bold text-[#2D1F24]">Khóa bằng mật khẩu bí mật</h3>
                    <p className="text-xs text-[#7D646D]">Người nhận phải nhập đúng mã để mở món quà đặc biệt</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.passcodeEnabled}
                    onChange={(e) => setConfig({ ...config, passcodeEnabled: e.target.checked })}
                    className="w-5 h-5 accent-[#FF4F86] cursor-pointer"
                  />
                </div>

                {config.passcodeEnabled && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs font-bold text-[#5C454D] block mb-1">Mật khẩu bí mật (PIN):</label>
                      <input
                        type="text"
                        value={config.passcode}
                        onChange={(e) => setConfig({ ...config, passcode: e.target.value })}
                        placeholder="Ví dụ: 1402 hoặc ngày sinh..."
                        className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86] font-mono tracking-widest text-center text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#5C454D] block mb-1">Gợi ý mật khẩu:</label>
                      <input
                        type="text"
                        value={config.passcodeHint}
                        onChange={(e) => setConfig({ ...config, passcodeHint: e.target.value })}
                        placeholder="Gợi ý: Ngày chúng mình chính thức yêu nhau..."
                        className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: TÙY CHỈNH NÂNG CAO */}
            {activeTab === 'advanced' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#F0DDE3]">
                  <h3 className="text-sm font-bold text-[#2D1F24]">Tùy chỉnh thương hiệu & Gói</h3>
                  <p className="text-xs text-[#7D646D]">Cấu hình tiêu đề hiển thị trên trình duyệt</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#5C454D] block mb-1">Tiêu đề tab trình duyệt:</label>
                  <input
                    type="text"
                    value={config.tabTitle}
                    onChange={(e) => setConfig({ ...config, tabTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#FFF9FA] border border-[#F0DDE3] rounded-xl outline-none focus:border-[#FF4F86]"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FFF0F4] to-[#FDE8EF] border border-[#F0DDE3] flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#FF4F86]">Gói Nâng Cấp VIP Vĩnh Viễn</h4>
                    <p className="text-[11px] text-[#7D646D]">Bỏ logo trên mẫu 3D WebGL sau khi đối soát thanh toán.</p>
                  </div>
                  <button
                    onClick={handleOpenVipOrder}
                    disabled={!vipSupported}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF4F86] to-[#E8638A] text-white text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {vipSupported ? '49.000đ' : 'Chưa hỗ trợ'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nút Hoàn tất & Tạo Link nổi bật ngay dưới khung nhập liệu để dễ thao tác */}
          <div className="bg-gradient-to-r from-[#FFF0F6] via-[#F9EEFF] to-[#FFF0F6] rounded-3xl border-2 border-[#FFC4DC] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div>
              <p className="text-xs sm:text-sm font-black text-[#29104E]">
                ✨ Đã sẵn sàng tạo món quà cho <span className="text-[#FF1E6A]">{config.recipientName || 'Người thương'}</span>!
              </p>
              <p className="text-[11px] text-[#6E5560] mt-0.5">
                Nhận ngay đường link quà tặng vĩnh viễn và mã QR trái tim miễn phí chỉ với 1 cú nhấp.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateRealLink}
              className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] text-white text-xs sm:text-sm font-black shadow-lg shadow-[#FF1E6A]/25 hover:opacity-95 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>🚀 Hoàn tất & Tạo Link + Mã QR</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Xem trước */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#2D1F24] flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#FF4F86]" />
              <span>Xem trước thời gian thực</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
              Live Preview
            </span>
          </div>

          {/* Interactive Canvas Frame */}
          <div className="w-full h-[520px] rounded-3xl border-2 border-[#F0DDE3] overflow-hidden shadow-lg shadow-[#FF4F86]/5">
            <LivePreviewCanvas config={config} />
          </div>
        </div>
      </div>

      {/* WISHES SUGGESTION MODAL */}
      {showWishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#F0DDE3] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F0DDE3]">
              <h3 className="text-base font-bold text-[#2D1F24] flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-[#FF4F86]" />
                <span>Gợi ý lời chúc ngọt ngào</span>
              </h3>
              <button onClick={() => setShowWishModal(false)} className="text-[#9A8490] hover:text-black">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {WISH_TEMPLATES.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="text-xs font-bold text-[#FF4F86] uppercase tracking-wider">{item.category}</h4>
                  {item.wishes.map((wish, wIdx) => (
                    <div
                      key={wIdx}
                      onClick={() => {
                        setConfig({ ...config, letterContent: wish });
                        setShowWishModal(false);
                      }}
                      className="p-3 rounded-xl bg-[#FFF9FA] border border-[#F0DDE3] hover:border-[#FF4F86] hover:bg-[#FFF0F4] cursor-pointer text-xs text-[#5C454D] leading-relaxed transition-colors font-serif italic"
                    >
                      &ldquo;{wish}&rdquo;
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIETQR PAYMENT MODAL */}
      <VietQrModal
        isOpen={showVietQrModal}
        onClose={() => setShowVietQrModal(false)}
        orderType={orderType}
        templateName={template.name}
        orderId={paymentOrderId}
        giftId={paymentGiftId}
        giftUrl={generatedGiftUrl}
      />

      {/* SHARE LINK MODAL */}
      <ShareLinkModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        giftUrl={generatedGiftUrl}
        recipientName={config.recipientName}
      />
    </div>
  );
}
