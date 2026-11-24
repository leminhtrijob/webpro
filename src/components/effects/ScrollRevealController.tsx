'use client';

import { useEffect } from 'react';

/** Reveal each section once so scrolling back never replays its animation. */
export default function ScrollRevealController() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal-on-scroll, .reveal-from-left, .reveal-from-right, .reveal-scale')
        .forEach(element => element.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });
    document.querySelectorAll('.reveal-on-scroll, .reveal-from-left, .reveal-from-right, .reveal-scale')
      .forEach(element => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
