// CelebrationFX.js — 🎉 成就/通关庆祝特效（金纸片 + 星星爆发）
// 在成就解锁和首次通关时触发视觉庆祝

import { haptic } from '../utils/haptic.js';

/* ── 粒子池 ────────────────────────────── */
const particles = [];
let rafId = null;
const MAX_PARTICLES = 120;

/* ── 特效类型 ────────────────────────────── */

/**
 * 金纸片雨 — 用于成就解锁
 * @param {number} centerX  屏幕中心 X
 * @param {number} centerY  屏幕中心 Y
 * @param {string} tier     'bronze'|'silver'|'gold'
 */
export function spawnConfetti(centerX, centerY, tier = 'gold') {
  haptic('success');
  const colors = {
    bronze: ['#CD7F32', '#B87333', '#D4A76A', '#8B6914', '#FFF8E1'],
    silver: ['#C0C0C0', '#E8E8E8', '#A8A8A8', '#D4D4D4', '#FFF'],
    gold:   ['#FFD700', '#FFA000', '#FFE082', '#FF6F00', '#FFF8E1'],
  }[tier] || ['#FFD700', '#FFA000', '#FFE082', '#FF6F00', '#FFF8E1'];

  const count = tier === 'gold' ? 50 : tier === 'silver' ? 35 : 20;

  for (let i = 0; i < count; i++) {
    particles.push({
      type: 'confetti',
      x: centerX + (Math.random() - 0.5) * 60,
      y: centerY - 20,
      vx: (Math.random() - 0.5) * 8,
      vy: -(Math.random() * 6 + 2),
      gravity: 0.12 + Math.random() * 0.05,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 5,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      life: 1.0,
      decay: 0.008 + Math.random() * 0.006,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.05,
    });
  }

  startLoop();
}

/**
 * 星星爆发 — 用于区域首次通关
 * @param {number} centerX  屏幕中心 X
 * @param {number} centerY  屏幕中心 Y
 */
export function spawnStarBurst(centerX, centerY) {
  haptic('success');
  const count = 24;
  const colors = ['#FFD700', '#FF9800', '#FFEB3B', '#FFF176', '#FFF8E1'];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = 3 + Math.random() * 4;
    particles.push({
      type: 'star',
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 0.03,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      life: 1.0,
      decay: 0.012 + Math.random() * 0.008,
      points: Math.random() > 0.5 ? 5 : 4, // 五角星或四角星
    });
  }

  // 额外加一圈大星星
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    particles.push({
      type: 'star',
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 1.5,
      gravity: 0,
      color: '#FFD700',
      size: 12 + Math.random() * 6,
      rotation: 0,
      rotSpeed: 2,
      life: 1.0,
      decay: 0.01,
      points: 5,
    });
  }

  startLoop();
}

/* ── 渲染循环 ────────────────────────────── */
const canvas = document.createElement('canvas');
canvas.id = 'celebration-canvas';
canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
let ctx = null;
let appended = false;

function ensureCanvas() {
  if (!appended) {
    document.body.appendChild(canvas);
    appended = true;
  }
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  ctx = canvas.getContext('2d');
}

function startLoop() {
  if (rafId) return; // 已在运行
  ensureCanvas();
  loop();
}

function loop() {
  if (!particles.length) {
    rafId = null;
    // 清空画布
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  rafId = requestAnimationFrame(loop);
  update();
  draw();
}

function update() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }

    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;
    p.vx *= 0.99;

    // 纸片左右摆动
    if (p.type === 'confetti') {
      p.wobble += p.wobbleSpeed;
      p.x += Math.sin(p.wobble) * 0.8;
    }
  }

  // 限制粒子数
  while (particles.length > MAX_PARTICLES) particles.shift();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation * Math.PI / 180);

    if (p.type === 'confetti') {
      drawConfettiPiece(ctx, p);
    } else if (p.type === 'star') {
      drawStarPiece(ctx, p);
    }

    ctx.restore();
  }
}

function drawConfettiPiece(ctx, p) {
  ctx.fillStyle = p.color;
  // 纸片是扁矩形，有透视效果
  const w = p.size;
  const h = p.size * 0.5;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-w / 2, -h / 2, w * 0.6, h * 0.3);
}

function drawStarPiece(ctx, p) {
  ctx.fillStyle = p.color;
  const s = p.size / 2;
  const n = p.points;
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? s : s * 0.4;
    const a = (i * Math.PI) / n - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  // 发光
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

/* ── 清理 ────────────────────────────── */
export function clearCelebration() {
  particles.length = 0;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}
