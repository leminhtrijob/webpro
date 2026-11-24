'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeHeartGalaxy: Vũ trụ 3D WebGL bao phủ toàn màn hình Hero
 * Canvas tự động full width & height của section cha, không bao giờ bị cắt viền (Edge Clipping).
 * Trái tim 3D tọa lạc ở phía bên phải (Desktop) / trung tâm (Mobile) cùng bụi sao tỏa rộng khắp màn hình.
 */
export default function ThreeHeartGalaxy() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 52;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // 2. Texture hạt phát sáng mềm mịn (Radial Glow Dot)
    const createGlowTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.25, 'rgba(255, 60, 140, 0.95)');
        gradient.addColorStop(0.6, 'rgba(255, 30, 106, 0.35)');
        gradient.addColorStop(1, 'rgba(255, 30, 106, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const particleTexture = createGlowTexture();

    // 3. BỤI SAO TINH TẾ & MỎNG NHẸ (Loại bỏ các cụm hạt bụi dày đặc che ảnh theo yêu cầu người dùng)
    const dustCount = 80;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);

    const colorPink = new THREE.Color('#FF8FBC');
    const colorLavender = new THREE.Color('#D8B4FE');
    const colorGold = new THREE.Color('#FFE4A0');
    const colorWhite = new THREE.Color('#FFFFFF');

    for (let i = 0; i < dustCount; i++) {
      // Phân bổ rộng khắp nền không gian, độ sâu nhẹ nhàng
      dustPositions[i * 3] = (Math.random() - 0.5) * 70;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 45;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 30;

      const r = Math.random();
      const col = r < 0.4 ? colorPink : r < 0.7 ? colorLavender : r < 0.9 ? colorGold : colorWhite;
      dustColors[i * 3] = col.r;
      dustColors[i * 3 + 1] = col.g;
      dustColors[i * 3 + 2] = col.b;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));

    const dustMat = new THREE.PointsMaterial({
      size: 0.8,
      map: particleTexture,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false
    });

    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // 4. Tương tác chuột mượt mà 60fps
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      targetX = x * 0.8;
      targetY = -y * 0.8;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Render only while the hero is visible, capped at roughly 30 FPS.
    let animationFrameId = 0;
    let lastFrame = 0;
    const startTime = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let inViewport = true;
    const animate = (now: number) => {
      if (now - lastFrame < 32) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      lastFrame = now;
      const elapsedTime = (now - startTime) / 1000;

      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      dustPoints.rotation.y = elapsedTime * 0.02 + mouseX * 0.2;
      dustPoints.rotation.x = Math.sin(elapsedTime * 0.03) * 0.08 + mouseY * 0.2;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    const updatePlayback = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
      if (!reducedMotion && inViewport && !document.hidden) animationFrameId = requestAnimationFrame(animate);
      else renderer.render(scene, camera);
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      updatePlayback();
    }, { threshold: 0 });
    visibilityObserver.observe(container);
    document.addEventListener('visibilitychange', updatePlayback);
    updatePlayback();

    // 6. Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', updatePlayback);
      visibilityObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      dustGeo.dispose();
      dustMat.dispose();
      particleTexture.dispose();
      renderer.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible select-none"
      style={{ filter: 'drop-shadow(0 0 30px rgba(255, 46, 116, 0.45))' }}
    />
  );
}
