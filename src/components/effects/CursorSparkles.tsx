'use client';

import { useEffect, useRef } from 'react';

type Point = { x: number; y: number; life: number };
type Particle = Point & { vx: number; vy: number; color: string };

/** A small canvas accent that sleeps when the pointer stops moving. */
export default function CursorSparkles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const trail: Point[] = [];
    const particles: Particle[] = [];
    let frame = 0;
    let lastFrame = 0;
    let lastParticle = 0;
    let lastMove = 0;
    let pointer = { x: -1, y: -1 };
    let visible = !document.hidden;

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * scale);
      canvas.height = Math.round(window.innerHeight * scale);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const draw = (now: number) => {
      if (!visible) { frame = 0; return; }
      if (now - lastFrame < 32) { frame = requestAnimationFrame(draw); return; }
      lastFrame = now;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].life -= 1;
        if (trail[i].life <= 0) trail.splice(i, 1);
      }
      if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (const point of trail.slice(1)) ctx.lineTo(point.x, point.y);
        ctx.strokeStyle = 'rgba(246, 87, 173, .42)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 1;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.min(1, p.life / 12);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (pointer.x >= 0 && now - lastMove < 180) {
        ctx.fillStyle = 'rgba(255, 58, 151, .75)';
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (now - lastMove < 220 || trail.length || particles.length) frame = requestAnimationFrame(draw);
      else frame = 0;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !visible) return;
      pointer = { x: event.clientX, y: event.clientY };
      lastMove = performance.now();
      trail.unshift({ ...pointer, life: 8 });
      if (trail.length > 10) trail.length = 10;
      if (lastMove - lastParticle > 70) {
        lastParticle = lastMove;
        particles.push({ ...pointer, life: 12, vx: (Math.random() - .5) * 1.5, vy: -.8, color: Math.random() > .5 ? '#FF4F9A' : '#A855F7' });
        if (particles.length > 16) particles.shift();
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onVisibility = () => {
      visible = !document.hidden;
      if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999]" />;
}
