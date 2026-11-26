'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Heart, Sparkles, Volume2, VolumeX, ExternalLink, Layers, RefreshCw } from 'lucide-react';
import { GiftConfig } from '@/models/gift';
import { getLocalTemplateEnginePath } from '@/lib/templateEngineMap';

interface LivePreviewCanvasProps {
  config: GiftConfig;
  fullscreen?: boolean;
}

export default function LivePreviewCanvas({ config, fullscreen = false }: LivePreviewCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewMode, setPreviewMode] = useState<'engine' | 'card'>('engine');
  const [iframeKey, setIframeKey] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isLetterOpened, setIsLetterOpened] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const enginePath = getLocalTemplateEnginePath(config.templateSlug || 'trikun-heart');
  const iframeSrc = `${enginePath}?preview=1`;

  // Đồng bộ dữ liệu tùy chỉnh sang iframe template local qua postMessage
  const syncConfigToIframe = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        {
          type: 'TRIKUN_LIVE_CONFIG',
          config
        },
        '*'
      );
    } catch {
      // ignore cross-frame race conditions
    }
  };

  useEffect(() => {
    if (previewMode === 'engine') {
      syncConfigToIframe();
    }
  }, [
    previewMode,
    config.recipientName,
    config.senderName,
    config.letterTitle,
    config.letterContent,
    config.musicUrl,
    config.musicTitle,
    config.passcodeEnabled,
    config.passcode,
    config.keypadPinEnabled,
    config.keypadPin,
    config.keypadPinHint,
    config.particleColor,
    config.images
  ]);

  // Toggle Music Preview (cho chế độ Khung Thư Tình Nhanh)
  const toggleMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(config.musicUrl || '/audio/trikun-theme.wav');
    }
    if (isPlayingMusic) {
      audioRef.current.pause();
      setIsPlayingMusic(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlayingMusic(true);
    }
  };

  // Particles Canvas Animation (cho chế độ Khung Thư Tình Nhanh)
  useEffect(() => {
    if (previewMode !== 'card') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 360);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 480);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = config.particlesEnabled ? config.particleCount || 180 : 0;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      alpha: number;
      color: string;
      targetX?: number;
      targetY?: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      const t = Math.PI * 2 * Math.random();
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

      const scale = Math.min(width, height) / 45;
      const targetX = width / 2 + hx * scale + (Math.random() - 0.5) * 30;
      const targetY = height / 2 + hy * scale + (Math.random() - 0.5) * 30;

      particles.push({
        x: targetX + (Math.random() - 0.5) * 100,
        y: targetY + (Math.random() - 0.5) * 100,
        size: Math.random() * 2.5 + 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.8,
        alpha: Math.random() * 0.8 + 0.2,
        color: config.particleColor || '#ff4f86',
        targetX,
        targetY
      });
    }

    let pulse = 0;

    const render = () => {
      pulse += 0.03;
      const pulseScale = 1 + Math.sin(pulse) * 0.04;

      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#1a0614');
      bgGrad.addColorStop(0.6, '#09020b');
      bgGrad.addColorStop(1, '#020005');

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p) => {
        if (p.targetX && p.targetY) {
          const dx = (p.targetX - width / 2) * pulseScale + width / 2 - p.x;
          const dy = (p.targetY - height / 2) * pulseScale + height / 2 - p.y;
          p.x += dx * 0.02 + p.speedX;
          p.y += dy * 0.02 + p.speedY;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [previewMode, config.particlesEnabled, config.particleColor, config.particleCount]);

  return (
    <div
      className={`relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden bg-[#0D0B12] select-none flex flex-col ${
        fullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Top Toolbar: Chuyển đổi giữa Mẫu 3D/HTML Gốc và Khung Thư Tình */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#160B22]/95 border-b border-white/10 text-xs text-white z-20">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPreviewMode('engine')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              previewMode === 'engine'
                ? 'bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white shadow'
                : 'bg-white/10 text-white/70 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mẫu 3D / HTML gốc</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('card')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              previewMode === 'card'
                ? 'bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white shadow'
                : 'bg-white/10 text-white/70 hover:text-white'
            }`}
          >
            💌 Thư tình
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {previewMode === 'engine' && (
            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              title="Tải lại hiệu ứng mẫu"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <a
            href={`/v/${config.templateSlug || 'trikun-heart'}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            title="Mở xem mẫu toàn màn hình"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 w-full h-full min-h-[415px]">
        {previewMode === 'engine' ? (
          <iframe
            key={`${iframeSrc}-${iframeKey}`}
            ref={iframeRef}
            src={iframeSrc}
            onLoad={syncConfigToIframe}
            className="w-full h-full min-h-[415px] border-0 block bg-black"
            allow="camera; microphone; autoplay; encrypted-media; fullscreen"
            title="TriKun Studio Live Template Engine"
          />
        ) : (
          <>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

            <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
              <button
                onClick={toggleMusic}
                title={isPlayingMusic ? 'Tắt nhạc' : 'Nghe thử nhạc'}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 transition-all hover:scale-105 shadow-md"
              >
                {isPlayingMusic ? (
                  <Volume2 className="w-4 h-4 text-[#FF4F86]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-white/70" />
                )}
              </button>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10 pointer-events-auto">
              {!isLetterOpened ? (
                <div
                  onClick={() => setIsLetterOpened(true)}
                  className="cursor-pointer group flex flex-col items-center transition-transform hover:scale-105 active:scale-95"
                >
                  <div className="relative w-40 h-28 bg-[#FFF4E6] rounded-xl shadow-2xl border-2 border-[#FFE8D6] flex items-center justify-center overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-14 bg-[#FFE8D6] clip-path-polygon-[0_0,50%_100%,100%_0] border-b border-[#E8D0C0]/40" />

                    <div className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-tr from-[#FF4F86] to-[#FF7597] flex items-center justify-center text-white shadow-lg animate-bounce">
                      <Heart className="w-6 h-6 fill-white" />
                    </div>

                    <div className="absolute bottom-2 text-[10px] font-bold text-[#8C6D62] tracking-wider uppercase">
                      To: {config.recipientName || 'Người thương'}
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-semibold text-white/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 animate-pulse">
                    💌 Chạm để mở thư tình
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-white/30 text-[#2D1F24] animate-fadeIn transition-all max-h-[85%] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-[#F0DDE3] pb-2 mb-3">
                    <span className="text-xs font-bold text-[#FF4F86] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {config.letterTitle || 'Lá Thư Tình Yêu'}
                    </span>
                    <button
                      onClick={() => setIsLetterOpened(false)}
                      className="text-xs font-semibold text-[#9A8490] hover:text-[#FF4F86]"
                    >
                      Đóng lại
                    </button>
                  </div>

                  {config.images && config.images.length > 0 && config.showLetterPhoto && (
                    <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-[#FFF0F4] border border-[#F0DDE3]">
                      <img src={config.images[0]} alt="Ảnh kỷ niệm" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-[#4A373E] whitespace-pre-line leading-relaxed font-sans font-medium">
                    {(config.letterContent || 'Em iu, cảm ơn em vì đã đến bên anh...').normalize('NFC')}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#F0DDE3]/60 text-right">
                    <p className="text-[11px] text-[#9A8490]">Thương em rất nhiều,</p>
                    <p className="text-xs font-bold text-[#FF4F86]">{config.senderName || 'Trí Kun'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-white/70 z-10 pointer-events-none">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-[#FF4F86] animate-ping" />
                <span className="truncate">{config.musicTitle || 'Lễ Đường - Hương Ly'}</span>
              </div>
              <span className="text-[10px] text-white/50">TriKun Live 3D</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
