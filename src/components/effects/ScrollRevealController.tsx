'use client';

import { useEffect } from 'react';

/**
 * Bộ điều khiển hiệu ứng cuộn trang mượt mà (ScrollRevealController)
 * - Tối ưu hóa: chỉ kiểm tra các phần tử chưa hiển thị, tiết chế bằng requestAnimationFrame
 *   và tự động gỡ listener ngay khi mọi phần tử đã hiển thị để tránh forced reflow khi cuộn.
 */
export default function ScrollRevealController() {
  useEffect(() => {
    const selector = '.reveal-on-scroll, .reveal-from-left, .reveal-from-right, .reveal-scale';
    const allElements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (allElements.length === 0) return;

    const isMobileViewport = window.innerWidth <= 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      allElements.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const pending = new Set<HTMLElement>(allElements);
    let rafId = 0;

    const cleanupIfDone = () => {
      if (pending.size === 0) {
        observer.disconnect();
        window.removeEventListener('scroll', onScrollPassive);
      }
    };

    const revealVisibleNow = () => {
      rafId = 0;
      if (pending.size === 0) return;
      const vh = window.innerHeight || 800;
      pending.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= vh + 120) {
          el.classList.add('is-revealed');
          pending.delete(el);
          observer.unobserve(el);
        }
      });
      cleanupIfDone();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && entry.intersectionRatio <= 0) continue;
          const target = entry.target as HTMLElement;
          target.classList.add('is-revealed');
          pending.delete(target);
          observer.unobserve(target);
        }
        cleanupIfDone();
      },
      {
        threshold: 0.01,
        rootMargin: isMobileViewport ? '140px 0px 80px 0px' : '80px 0px -10px 0px'
      }
    );

    revealVisibleNow();

    pending.forEach((el) => {
      observer.observe(el);
    });

    const onScrollPassive = () => {
      if (!rafId && pending.size > 0) {
        rafId = window.requestAnimationFrame(revealVisibleNow);
      }
    };
    window.addEventListener('scroll', onScrollPassive, { passive: true });

    // Safety fallback trên điện thoại: nếu người dùng cuộn nhanh, không bao giờ để phần tử bị ẩn
    const fallbackTimer = window.setTimeout(() => {
      if (window.innerWidth <= 768) {
        pending.forEach((el) => el.classList.add('is-revealed'));
        pending.clear();
        cleanupIfDone();
      } else {
        revealVisibleNow();
      }
    }, 900);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('scroll', onScrollPassive);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  return null;
}
