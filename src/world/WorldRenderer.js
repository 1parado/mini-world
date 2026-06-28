// WorldRenderer — 手绘风格2D世界，丰富交互感
// 灵感：film.yanis.io 的手绘纸质世界 + 可爱角色 + 细腻交互

import { sketchLine, sketchCircle, sketchRect, sketchText, hexToCSS } from '../utils/SketchRenderer.js';

// 世界尺寸 — 扩展以容纳25个区域
export const WORLD_W = 4000;
export const WORLD_H = 3000;

// 配色
const PAPER    = '#FAF5E8';
const GRAPHITE = '#2C2C3A';
const KRAFT    = '#8B7355';
const REDLINE  = '#EA5455';
const BIRCH    = '#D4C4A8';
const TEAL     = '#077B8A';
const CREAM    = '#F5EFE0';

// 角色默认外观配置
export const DEFAULT_APPEARANCE = {
  skin:     '#FFDBB4',
  skinDark: '#F5C99A',
  hair:     '#3E2723',
  shirt:    '#26A69A',
  shirtDark:'#1B8A80',
  pants:    '#3D5A80',
  hat:      '#EA5455',
  hatDark:  '#C0392B',
  scarf:    '#FFD54F',
  shoe:     '#4E342E',
  cheek:    '#FFB5A0',
  hairStyle:'short',   // short | long | spiky | bald
  hatStyle: 'beanie',  // beanie | cap | beret | none
  scarfOn:  true,
};

/** 合并用户外观配置（补全缺失字段） */
export function mergeAppearance(user) {
  return { ...DEFAULT_APPEARANCE, ...(user || {}) };
}

// ==================== 粒子效果 ====================

const dustParticles = [];

export function spawnDust(x, y) {
  for (let i = 0; i < 2; i++) {
    dustParticles.push({
      x, y,
      vx: (Math.random() - 0.5) * 25,
      vy: -Math.random() * 15 - 5,
      life: 0.3 + Math.random() * 0.3,
      maxLife: 0.3 + Math.random() * 0.3,
      size: 1.5 + Math.random() * 2.5,
    });
  }
}

const clickRipples = [];
export function spawnClickRipple(x, y) {
  clickRipples.push({ x, y, radius: 5, maxRadius: 50, alpha: 0.5 });
}

export function updateEffects(delta) {
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i];
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.vy += 40 * delta;
    p.life -= delta;
    if (p.life <= 0) dustParticles.splice(i, 1);
  }
  for (let i = clickRipples.length - 1; i >= 0; i--) {
    const r = clickRipples[i];
    r.radius += 70 * delta;
    r.alpha -= 1.5 * delta;
    if (r.alpha <= 0 || r.radius > r.maxRadius) clickRipples.splice(i, 1);
  }
}

export function drawEffects(ctx) {
  for (const p of dustParticles) {
    const a = Math.max(0, p.life / p.maxLife) * 0.25;
    ctx.fillStyle = `rgba(139,115,85,${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
  }
  for (const r of clickRipples) {
    ctx.strokeStyle = `rgba(7,123,138,${Math.max(0, r.alpha)})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ==================== 天气粒子（雨/雪） ====================

const weatherParticles = [];
let activeWeatherType = null; // 'rain' | 'snow' | null

const WEATHER_RAIN_COUNT = 100;
const WEATHER_SNOW_COUNT = 60;
const WEATHER_RAIN_SPEED = 420;
const WEATHER_SNOW_SPEED = 45;

/** 根据天气类型初始化/切换天气粒子（使用 viewport 坐标重生） */
export function spawnWeather(type) {
  if (activeWeatherType === type) return;
  activeWeatherType = type;
  weatherParticles.length = 0;
  if (!type) return;
  const count = type === 'rain' ? WEATHER_RAIN_COUNT : WEATHER_SNOW_COUNT;
  for (let i = 0; i < count; i++) {
    weatherParticles.push({
      x: Math.random() * WORLD_W,
      y: Math.random() * WORLD_H,
      speed: type === 'rain'
        ? WEATHER_RAIN_SPEED * (0.8 + Math.random() * 0.4)
        : WEATHER_SNOW_SPEED * (0.7 + Math.random() * 0.6),
      size: type === 'rain' ? 1 + Math.random() * 0.5 : 2 + Math.random() * 2,
      drift: Math.random() * Math.PI * 2, // 雪花漂移相位
    });
  }
}

/** 每帧更新天气粒子位置 */
export function updateWeather(delta, windLevel = 2) {
  if (!activeWeatherType) return;
  const wind = (windLevel - 2) * 30; // 基准风2级 → 0偏移
  for (const p of weatherParticles) {
    p.y += p.speed * delta;
    if (activeWeatherType === 'snow') {
      p.x += Math.sin(p.drift + p.y * 0.01) * 15 * delta + wind * delta;
    } else {
      p.x += wind * delta * 0.5;
    }
    // 重生：超出世界边界则从顶部重新进入
    if (p.y > WORLD_H) {
      p.y = -10;
      p.x = Math.random() * WORLD_W;
    }
    if (p.x < 0) p.x += WORLD_W;
    if (p.x > WORLD_W) p.x -= WORLD_W;
  }
}

/** 绘制天气粒子（viewport 裁剪） */
export function drawWeather(ctx, cameraX, cameraY, vw, vh) {
  if (!activeWeatherType || weatherParticles.length === 0) return;
  for (const p of weatherParticles) {
    // viewport 裁剪
    if (p.x < cameraX - 10 || p.x > cameraX + vw + 10 ||
        p.y < cameraY - 10 || p.y > cameraY + vh + 10) continue;

    if (activeWeatherType === 'rain') {
      ctx.strokeStyle = 'rgba(100,181,246,0.45)';
      ctx.lineWidth = p.size * 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 1, p.y + p.size * 10);
      ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(p.drift) * 0.2})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function getActiveWeatherType() { return activeWeatherType; }

// ==================== 纸张背景 ====================

// 缓存两个版本：完全不透明(叠加模式) 和 半透明(探索模式+3D穿透)
let bgCanvasFull = null;
let bgCanvasTrans = null;
const BG_ALPHA = 0.82;

export function resetBackground() {
  bgCanvasFull = null;
  bgCanvasTrans = null;
}

export function ensureBackground(alpha = 1.0) {
  if (alpha >= 1.0) {
    if (bgCanvasFull) return bgCanvasFull;
    bgCanvasFull = _renderBackground(1.0);
    return bgCanvasFull;
  } else {
    if (bgCanvasTrans) return bgCanvasTrans;
    bgCanvasTrans = _renderBackground(alpha);
    return bgCanvasTrans;
  }
}

function _renderBackground(alpha) {
  const cvs = document.createElement('canvas');
  cvs.width = WORLD_W;
  cvs.height = WORLD_H;
  const ctx = cvs.getContext('2d');

  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const rng = seededRandom(42);
  // 纸张纤维
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = `rgba(44,44,58,${(0.004 + rng() * 0.008) * alpha})`;
    ctx.fillRect(rng() * WORLD_W, rng() * WORLD_H, 1 + rng() * 5, 1 + rng() * 3);
  }

  // 淡横线（笔记本纸感）
  ctx.strokeStyle = `rgba(44,44,58,${0.03 * alpha})`;
  ctx.lineWidth = 0.8;
  for (let ly = 45; ly < WORLD_H; ly += 38) {
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(WORLD_W, ly);
    ctx.stroke();
  }

  // 红色页边线
  ctx.strokeStyle = `rgba(234,84,85,${0.04 * alpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(65, 0); ctx.lineTo(65, WORLD_H);
  ctx.moveTo(WORLD_W - 65, 0); ctx.lineTo(WORLD_W - 65, WORLD_H);
  ctx.stroke();

  // 虚线边框
  ctx.strokeStyle = `rgba(44,44,58,${0.08 * alpha})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(20, 20, WORLD_W - 40, WORLD_H - 40);
  ctx.setLineDash([]);

  // 角落手写标题
  ctx.font = 'bold 24px Caveat, cursive';
  ctx.fillStyle = `rgba(44,44,58,${0.1 * alpha})`;
  ctx.fillText('✏ 我的手绘世界', 45, 52);

  ctx.globalAlpha = 1;
  return cvs;
}

// ==================== 交互区域建筑 ====================

// --- 笔记本（中央书写台） ---
export function drawNotebook(ctx, x, y, time) {
  const w = 300, h = 220;

  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.beginPath(); ctx.roundRect(x + 5, y + 5, w, h, 5); ctx.fill();

  const coverGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  coverGrad.addColorStop(0, '#c4b896');
  coverGrad.addColorStop(1, '#b0a47e');
  ctx.fillStyle = coverGrad;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill();
  sketchRect(ctx, x, y, w, h, { color: GRAPHITE, width: 2, jitter: 1.5 });

  // 书脊
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(x, y, 20, h);

  // 书签飘动
  const bw = Math.sin(time * 1.5) * 1.5;
  ctx.fillStyle = REDLINE;
  ctx.beginPath();
  ctx.moveTo(x + w - 10 + bw, y - 5);
  ctx.lineTo(x + w - 10 + bw, y + h + 5);
  ctx.lineTo(x + w - 2 + bw, y + h + 5);
  ctx.lineTo(x + w - 2 + bw, y - 5);
  ctx.closePath();
  ctx.fill();
  // 书签三角
  ctx.beginPath();
  ctx.moveTo(x + w - 10 + bw, y + h);
  ctx.lineTo(x + w - 6 + bw, y + h + 10);
  ctx.lineTo(x + w - 2 + bw, y + h);
  ctx.fill();

  // 内页
  ctx.fillStyle = '#FFFDF5';
  ctx.fillRect(x + 24, y + 16, w - 48, h - 32);
  sketchRect(ctx, x + 24, y + 16, w - 48, h - 32, { color: GRAPHITE, width: 1, jitter: 0.7 });

  // 横线
  ctx.strokeStyle = 'rgba(44,44,58,0.06)';
  ctx.lineWidth = 0.5;
  for (let ly = y + 36; ly < y + h - 24; ly += 14) {
    ctx.beginPath(); ctx.moveTo(x + 32, ly); ctx.lineTo(x + w - 36, ly); ctx.stroke();
  }

  // 红色页边线
  ctx.strokeStyle = 'rgba(234,84,85,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 40, y + 20); ctx.lineTo(x + 40, y + h - 20); ctx.stroke();

  // 标题
  sketchText(ctx, '我的笔记本', x + w / 2 - 60, y + h / 2 - 12, {
    color: GRAPHITE, fontSize: 22, jitter: 1.5, passes: 2,
  });

  // 小铅笔装饰
  drawPencil(ctx, x + 28, y + h / 2 + 16, -0.4);
}

// --- 公告板 ---
export function drawBulletinBoard(ctx, x, y, time, messages) {
  const w = 230, h = 180;

  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.fillRect(x + 4, y + 4, w, h);

  const corkGrad = ctx.createLinearGradient(x, y, x, y + h);
  corkGrad.addColorStop(0, '#c9a96e');
  corkGrad.addColorStop(1, '#b89058');
  ctx.fillStyle = corkGrad;
  ctx.fillRect(x, y, w, h);

  // 软木板纹理
  const rng = seededRandom(777);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(139,115,85,${0.1 + rng() * 0.15})`;
    ctx.beginPath();
    ctx.arc(x + 8 + rng() * (w - 16), y + 8 + rng() * (h - 16), 1.5 + rng() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 木框
  ctx.strokeStyle = KRAFT; ctx.lineWidth = 7;
  ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  sketchRect(ctx, x, y, w, h, { color: GRAPHITE, width: 1.5, jitter: 1.5 });

  // 图钉
  const pinC = [REDLINE, TEAL, '#5b2c6f', '#8b6914'];
  for (let i = 0; i < 4; i++) {
    const px = x + 24 + i * (w - 48) / 3;
    ctx.fillStyle = pinC[i]; ctx.beginPath(); ctx.arc(px, y + 8, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(px - 1.5, y + 6, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // 便签
  const notes = messages && messages.length > 0 ? messages.slice(0, 4) : ['欢迎！', '手绘笔记本', '按F互动', '探索世界！'];
  const nC = ['#fff9e6', '#f0f8ff', '#fef0f0', '#f0fef0'];
  notes.forEach((text, i) => {
    const nx = x + 14 + (i % 2) * (w / 2 - 8);
    const ny = y + 26 + Math.floor(i / 2) * 58;
    const nw = w / 2 - 20, nh = 46;
    ctx.save();
    ctx.translate(nx + nw / 2, ny + nh / 2);
    ctx.rotate((rng() - 0.5) * 0.06);
    ctx.translate(-(nx + nw / 2), -(ny + nh / 2));
    ctx.fillStyle = nC[i % 4]; ctx.fillRect(nx, ny, nw, nh);
    sketchRect(ctx, nx, ny, nw, nh, { color: 'rgba(44,44,58,0.1)', width: 0.6, jitter: 0.5 });
    ctx.font = '11px Caveat, cursive'; ctx.fillStyle = GRAPHITE; ctx.globalAlpha = 0.65;
    ctx.fillText(text.substring(0, 8), nx + 5, ny + 20);
    ctx.globalAlpha = 1;
    ctx.restore();
  });
}

// --- 书架 ---
export function drawBookshelf(ctx, x, y, time, pageCount) {
  const w = 200, h = 260;

  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.fillRect(x + 4, y + 4, w, h);

  const sGrad = ctx.createLinearGradient(x, y, x + w, y);
  sGrad.addColorStop(0, '#b89f7a'); sGrad.addColorStop(1, '#a8906a');
  ctx.fillStyle = sGrad; ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: GRAPHITE, width: 2, jitter: 1.3 });

  for (let s = 0; s <= 4; s++) {
    const sy = y + s * 52;
    ctx.fillStyle = '#9a8560'; ctx.fillRect(x + 3, sy, w - 6, 7);
    sketchLine(ctx, x + 3, sy + 3, x + w - 3, sy + 3, { color: GRAPHITE, width: 0.8, jitter: 0.5 });
  }

  const rng = seededRandom(123);
  const bC = ['#2d4059', '#ea5455', '#077b8a', '#5b2c6f', '#8b6914', '#1a1a2e', '#e07b39'];
  const count = Math.min(pageCount || 22, 40);
  for (let shelf = 0; shelf < 4; shelf++) {
    let bx = x + 10;
    const sTop = y + 10 + shelf * 52, sH = 42;
    let nb = Math.floor(count / 4) + (shelf < count % 4 ? 1 : 0);
    for (let b = 0; b < nb && bx < x + w - 14; b++) {
      const bw = 10 + rng() * 14, bh = sH - 4 - rng() * 8;
      const by = sTop + (sH - bh);
      ctx.fillStyle = bC[Math.floor(rng() * bC.length)];
      ctx.fillRect(bx, by, bw, bh);
      sketchRect(ctx, bx, by, bw, bh, { color: 'rgba(0,0,0,0.2)', width: 0.5, jitter: 0.3 });
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(bx + bw / 2, by + 4); ctx.lineTo(bx + bw / 2, by + bh - 4); ctx.stroke();
      bx += bw + 2 + rng() * 2;
    }
  }
}

// --- 咖啡角（新增区域） ---
export function drawCoffeeCorner(ctx, x, y, time) {
  const w = 180, h = 150;

  // 桌面
  ctx.fillStyle = '#c9a96e';
  ctx.fillRect(x, y + h - 20, w, 20);
  sketchRect(ctx, x, y + h - 20, w, 20, { color: GRAPHITE, width: 1.2, jitter: 1 });

  // 桌腿
  ctx.fillStyle = '#b0845a';
  ctx.fillRect(x + 10, y + h, 6, 28);
  ctx.fillRect(x + w - 16, y + h, 6, 28);

  // 咖啡杯
  drawCoffeeCup(ctx, x + 60, y + h - 40, time);

  // 甜点盘
  ctx.fillStyle = '#FFFDF5';
  ctx.beginPath(); ctx.ellipse(x + 130, y + h - 38, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
  sketchCircle(ctx, x + 130, y + h - 38, 18, { color: GRAPHITE, width: 0.8, jitter: 0.5 });
  // 小蛋糕
  ctx.fillStyle = '#F4A460';
  ctx.beginPath();
  ctx.arc(x + 130, y + h - 48, 8, Math.PI, 0);
  ctx.lineTo(x + 122, y + h - 42);
  ctx.lineTo(x + 138, y + h - 42);
  ctx.closePath();
  ctx.fill();
  // 奶油
  ctx.fillStyle = '#FFF8DC';
  ctx.beginPath(); ctx.arc(x + 130, y + h - 50, 4, 0, Math.PI * 2); ctx.fill();

  // 小花瓶
  ctx.fillStyle = TEAL;
  ctx.beginPath();
  ctx.moveTo(x + 30, y + h - 30);
  ctx.lineTo(x + 28, y + h - 55);
  ctx.lineTo(x + 36, y + h - 55);
  ctx.lineTo(x + 34, y + h - 30);
  ctx.closePath();
  ctx.fill();
  // 花朵
  ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 32, y + h - 55); ctx.lineTo(x + 32, y + h - 68); ctx.stroke();
  ctx.fillStyle = '#FF6B6B';
  ctx.beginPath(); ctx.arc(x + 32, y + h - 70, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FF8A80';
  ctx.beginPath(); ctx.arc(x + 32, y + h - 70, 2.5, 0, Math.PI * 2); ctx.fill();
}

// --- 画架区（新增区域） ---
export function drawAlbum(ctx, x, y, time) {
  const w = 160, h = 180;
  const cx = x + w / 2, cy = y + h / 2;

  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // 相册书脊
  ctx.fillStyle = KRAFT;
  ctx.fillRect(x + 8, y + 20, 14, h - 30);
  sketchRect(ctx, x + 8, y + 20, 14, h - 30, { stroke: '#6B5B4F', width: 1.2, jitter: 0.5 });

  // 相册封面
  ctx.fillStyle = '#D4A574';
  ctx.fillRect(x + 22, y + 10, w - 30, h - 20);
  sketchRect(ctx, x + 22, y + 10, w - 30, h - 20, { stroke: KRAFT, width: 2, jitter: 0.8 });

  // 封面装饰框
  ctx.fillStyle = PAPER;
  ctx.fillRect(x + 35, y + 25, w - 56, h - 55);
  sketchRect(ctx, x + 35, y + 25, w - 56, h - 55, { stroke: BIRCH, width: 1, jitter: 0.6 });

  // 📷 相机图标
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.fillText('📷', cx + 5, cy + 2);

  // 封面标题
  ctx.font = 'bold 12px Caveat, cursive';
  ctx.fillStyle = KRAFT;
  ctx.fillText('我的相册', cx + 5, cy + 28);

  // 飘出的照片缩略图动画
  const drift = Math.sin(time * 1.2) * 5;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = BIRCH;
  ctx.lineWidth = 0.8;
  // 照片1
  ctx.save(); ctx.translate(cx + 35, cy - 20 + drift); ctx.rotate(0.15);
  ctx.fillRect(0, 0, 22, 18);
  ctx.strokeRect(0, 0, 22, 18);
  ctx.restore();
  // 照片2
  ctx.save(); ctx.translate(cx - 45, cy + 15 - drift * 0.7); ctx.rotate(-0.1);
  ctx.fillRect(0, 0, 20, 16);
  ctx.strokeRect(0, 0, 20, 16);
  ctx.restore();
  ctx.restore();

  ctx.textAlign = 'start';
}

// --- 信箱区（新增区域）---
export function drawMailbox(ctx, x, y, time) {
  const w = 50, h = 80;

  // 邮筒杆
  ctx.fillStyle = '#5C4033';
  ctx.fillRect(x + 20, y + h, 10, 30);

  // 邮筒身体
  ctx.fillStyle = TEAL;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  sketchRect(ctx, x, y, w, h, { color: GRAPHITE, width: 1.5, jitter: 1 });

  // 信箱口
  ctx.fillStyle = '#066A75';
  ctx.fillRect(x + 8, y + 20, w - 16, 8);

  // 信封露出来（动画）
  const envelopeBob = Math.sin(time * 2) * 2;
  ctx.fillStyle = '#FFFDF5';
  ctx.save();
  ctx.translate(x + w / 2, y + 14 + envelopeBob);
  ctx.fillRect(-12, -8, 24, 16);
  sketchRect(ctx, -12, -8, 24, 16, { color: GRAPHITE, width: 0.8, jitter: 0.5 });
  // 信封三角
  ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(0, 0); ctx.lineTo(12, -8); ctx.stroke();
  ctx.restore();

  // 小旗（有信时升起）
  ctx.fillStyle = REDLINE;
  ctx.fillRect(x + w - 4, y + 10, 3, 18);
  ctx.fillRect(x + w - 4, y + 10, 10, 6);
}

// --- 涂鸦墙（新增区域）---
export function drawGraffitiWall(ctx, x, y, time) {
  const w = 280, h = 160;

  // 墙砖背景
  ctx.fillStyle = '#E0D5C1';
  ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: GRAPHITE, width: 1.5, jitter: 2 });

  // 砖缝
  ctx.strokeStyle = 'rgba(44,44,58,0.06)'; ctx.lineWidth = 0.5;
  for (let row = 0; row < 6; row++) {
    const ry = y + row * 28;
    ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + w, ry); ctx.stroke();
    const offset = row % 2 === 0 ? 0 : 30;
    for (let col = offset; col < w; col += 60) {
      ctx.beginPath(); ctx.moveTo(x + col, ry); ctx.lineTo(x + col, ry + 28); ctx.stroke();
    }
  }

  // 涂鸦内容
  sketchText(ctx, '你好 ✨', x + 20, y + 30, { color: TEAL, fontSize: 24, jitter: 2, passes: 2 });
  sketchText(ctx, '创作吧！', x + 120, y + 60, { color: REDLINE, fontSize: 20, jitter: 2.5, passes: 2 });
  sketchText(ctx, '画画 ♡', x + 40, y + 95, { color: '#8b6914', fontSize: 18, jitter: 1.5, passes: 2 });
  sketchText(ctx, '梦想 Dream', x + 160, y + 110, { color: '#5b2c6f', fontSize: 20, jitter: 2, passes: 2 });

  // 小涂鸦图案
  // 星星
  ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5;
  const cx = x + 220, cy = y + 35;
  for (let i = 0; i < 5; i++) {
    const a1 = (i * 4 * Math.PI / 5) - Math.PI / 2;
    const a2 = ((i + 2) * 4 * Math.PI / 5) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a1) * 10, cy + Math.sin(a1) * 10);
    ctx.lineTo(cx + Math.cos(a2) * 10, cy + Math.sin(a2) * 10);
    ctx.stroke();
  }
  // 爱心
  ctx.strokeStyle = REDLINE; ctx.lineWidth = 1.5;
  const hx = x + 100, hy = y + 130;
  ctx.beginPath();
  ctx.moveTo(hx, hy - 3);
  ctx.bezierCurveTo(hx - 8, hy - 14, hx - 18, hy, hx, hy + 10);
  ctx.moveTo(hx, hy - 3);
  ctx.bezierCurveTo(hx + 8, hy - 14, hx + 18, hy, hx, hy + 10);
  ctx.stroke();
}

// ==================== 装饰物体 ====================

export function drawCoffeeCup(ctx, x, y, time) {
  ctx.fillStyle = 'rgba(212,196,168,0.5)';
  ctx.beginPath(); ctx.ellipse(x, y + 24, 22, 8, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#FFFDF5';
  ctx.beginPath();
  ctx.moveTo(x - 14, y); ctx.lineTo(x - 16, y + 22); ctx.lineTo(x + 16, y + 22); ctx.lineTo(x + 14, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 1.5; ctx.stroke();

  ctx.beginPath(); ctx.arc(x + 16, y + 12, 7, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();

  ctx.fillStyle = '#8b6914'; ctx.globalAlpha = 0.45;
  ctx.beginPath(); ctx.ellipse(x, y + 5, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  const phase = time * 2;
  ctx.strokeStyle = 'rgba(44,44,58,0.13)'; ctx.lineWidth = 1.2;
  for (let w = 0; w < 2; w++) {
    ctx.beginPath();
    const sx = x - 5 + w * 10;
    ctx.moveTo(sx, y - 3);
    ctx.quadraticCurveTo(sx - 4 + Math.sin(phase + w) * 3, y - 14, sx + 2, y - 24 + Math.sin(phase + w + 1) * 3);
    ctx.stroke();
  }
}

export function drawPlant(ctx, x, y, time) {
  const sway = Math.sin(time * 1.0) * 3;

  ctx.fillStyle = '#c4956a';
  ctx.beginPath();
  ctx.moveTo(x - 14, y); ctx.lineTo(x - 16, y + 22); ctx.lineTo(x + 16, y + 22); ctx.lineTo(x + 14, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#b0845a'; ctx.fillRect(x - 15, y - 2, 30, 5); ctx.strokeRect(x - 15, y - 2, 30, 5);

  ctx.strokeStyle = '#2d5a3f'; ctx.lineWidth = 2.5;
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI * 0.35 + i * 0.3 + Math.sin(time * 0.7 + i) * 0.04;
    const len = 22 + i * 5;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(angle) * len * 0.5 + sway * 0.4, y + Math.sin(angle) * len * 0.5 - 8, x + Math.cos(angle) * len + sway * (i * 0.25), y + Math.sin(angle) * len);
    ctx.stroke();
  }
}

export function drawCat(ctx, x, y, time) {
  const tailSway = Math.sin(time * 1.5) * 5;

  ctx.fillStyle = '#b89f7a';
  ctx.beginPath(); ctx.ellipse(x, y, 24, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 1.2; ctx.stroke();

  ctx.fillStyle = '#b89f7a';
  ctx.beginPath(); ctx.arc(x - 17, y - 5, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 26, y - 14); ctx.lineTo(x - 20, y - 5);
  ctx.moveTo(x - 12, y - 14); ctx.lineTo(x - 15, y - 5);
  ctx.stroke();

  ctx.strokeStyle = '#b89f7a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 22, y); ctx.quadraticCurveTo(x + 30, y - 12 + tailSway, x + 34, y - 18 + tailSway);
  ctx.stroke();

  const zPhase = time * 2;
  ctx.font = '10px Caveat, cursive';
  ctx.fillStyle = `rgba(44,44,58,${0.2 + Math.sin(zPhase) * 0.15})`;
  ctx.fillText('z', x - 28 + Math.sin(zPhase) * 3, y - 20 + Math.sin(zPhase * 0.7) * 2);
  ctx.font = '8px Caveat, cursive';
  ctx.fillText('z', x - 34 + Math.sin(zPhase + 1) * 2, y - 28 + Math.sin(zPhase * 0.7 + 1) * 2);
}

export function drawPencil(ctx, x, y, angle) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle || -0.3);
  ctx.fillStyle = '#f4d03f'; ctx.fillRect(-24, -4, 36, 8);
  ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 1; ctx.strokeRect(-24, -4, 36, 8);
  ctx.fillStyle = '#e8c22a'; ctx.fillRect(-24, -1, 36, 2);
  ctx.fillStyle = '#444'; ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(20, 0); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#EA5455'; ctx.fillRect(-28, -4, 4, 8);
  ctx.fillStyle = '#ccc'; ctx.fillRect(-24, -4, 3, 8);
  ctx.restore();
}

export function drawPictureFrame(ctx, x, y, time) {
  const w = 60, h = 48;
  ctx.fillStyle = '#b89f7a'; ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: GRAPHITE, width: 1.5, jitter: 0.8 });
  ctx.fillStyle = '#FFFDF5'; ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
  ctx.fillStyle = 'rgba(135,206,235,0.35)'; ctx.fillRect(x + 6, y + 6, w - 12, (h - 12) / 2);
  ctx.fillStyle = 'rgba(45,90,63,0.3)';
  ctx.beginPath();
  ctx.moveTo(x + 6, y + h / 2 + 2); ctx.quadraticCurveTo(x + w / 4, y + 10, x + w / 2, y + h / 2 + 4);
  ctx.quadraticCurveTo(x + w * 3 / 4, y + 14, x + w - 6, y + h / 2 + 2);
  ctx.lineTo(x + w - 6, y + h - 6); ctx.lineTo(x + 6, y + h - 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(234,84,85,0.3)'; ctx.beginPath(); ctx.arc(x + w - 14, y + 14, 5, 0, Math.PI * 2); ctx.fill();
}

/* ── 新增装饰类型 ────────────────────── */

/** 🍄 蘑菇 */
export function drawMushroom(ctx, x, y, time) {
  const sway = Math.sin(time * 0.8) * 1.5;
  ctx.fillStyle = 'rgba(212,196,168,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 18, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#EFEBE9';
  ctx.fillRect(x - 3 + sway * 0.3, y - 4, 6, 22);
  ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 1; ctx.strokeRect(x - 3 + sway * 0.3, y - 4, 6, 22);
  ctx.fillStyle = '#E64A19';
  ctx.beginPath(); ctx.ellipse(x + sway * 0.5, y - 4, 14, 10, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#FFF';
  ctx.beginPath(); ctx.arc(x - 5 + sway * 0.5, y - 8, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 4 + sway * 0.5, y - 6, 1.8, 0, Math.PI * 2); ctx.fill();
}

/** 🌸 花丛 */
export function drawFlowers(ctx, x, y, time) {
  const sway = Math.sin(time * 1.2) * 2;
  ctx.fillStyle = '#4CAF50'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const sx = x + i * 10 - 10;
    ctx.strokeStyle = '#2E7D32'; ctx.beginPath();
    ctx.moveTo(sx, y + 8); ctx.quadraticCurveTo(sx + sway * (i + 1) * 0.3, y - 2, sx + sway, y - 8 - i * 2);
    ctx.stroke();
    const colors = ['#EA5455', '#FF9800', '#E91E63'];
    ctx.fillStyle = colors[i];
    for (let p = 0; p < 5; p++) {
      const a = p * Math.PI * 2 / 5 + time * 0.1 + i;
      ctx.beginPath(); ctx.arc(sx + sway + Math.cos(a) * 5, y - 8 - i * 2 + Math.sin(a) * 5, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#FFC107'; ctx.beginPath(); ctx.arc(sx + sway, y - 8 - i * 2, 2, 0, Math.PI * 2); ctx.fill();
  }
}

/** 🏮 路灯（夜间感知） */
export function drawLamp(ctx, x, y, time, nightMode = false) {
  ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y - 24); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 2, y - 24); ctx.quadraticCurveTo(x - 12, y - 30, x - 16, y - 28); ctx.stroke();
  ctx.fillStyle = nightMode ? '#FFF8E1' : '#FFF9C4';
  ctx.beginPath(); ctx.ellipse(x - 16, y - 24, 9, 12, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 1.2; ctx.stroke();
  // 灯光光晕 — 白天微弱/夜间增强
  const glow = nightMode
    ? 0.18 + Math.sin(time * 3) * 0.06
    : 0.12 + Math.sin(time * 3) * 0.03;
  const glowR = nightMode ? 55 : 22;
  ctx.fillStyle = `rgba(255,249,196,${glow})`;
  ctx.beginPath(); ctx.arc(x - 16, y - 24, glowR, 0, Math.PI * 2); ctx.fill();
}

/** ✈️ 纸飞机 */
export function drawPaperPlane(ctx, x, y, time) {
  const hover = Math.sin(time * 1.5) * 4;
  const tilt = Math.sin(time * 0.8) * 0.08;
  ctx.save(); ctx.translate(x, y + hover); ctx.rotate(tilt - 0.15);
  ctx.fillStyle = '#FFFDF5';
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, -10); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-4, 0); ctx.strokeStyle = 'rgba(44,44,58,0.15)'; ctx.stroke();
  ctx.restore();
}

/** 🦋 蝴蝶 */
export function drawButterfly(ctx, x, y, time) {
  const wingFlap = Math.sin(time * 8) * 0.3;
  const drift = Math.sin(time * 0.6) * 20;
  const bob = Math.sin(time * 1.2) * 6;
  ctx.save(); ctx.translate(x + drift, y + bob);
  ctx.fillStyle = '#9C27B0'; ctx.globalAlpha = 0.6;
  // 左翅
  ctx.save(); ctx.scale(1, Math.cos(wingFlap));
  ctx.beginPath(); ctx.ellipse(-5, 0, 7, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-7, 5, 4, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 右翅
  ctx.save(); ctx.scale(1, Math.cos(wingFlap));
  ctx.beginPath(); ctx.ellipse(5, 0, 7, 5, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, 5, 4, 3, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#4E342E'; ctx.beginPath(); ctx.ellipse(0, 0, 1.5, 6, 0, 0, Math.PI * 2); ctx.fill();
  // 翅膀白色点缀
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.save(); ctx.scale(1, Math.cos(wingFlap));
  ctx.beginPath(); ctx.arc(-5, -1, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -1, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** 🐾 脚印路径 */
export function drawFootprints(ctx, x, y) {
  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  for (let i = 0; i < 4; i++) {
    const fx = x + i * 14;
    const fy = y + (i % 2 === 0 ? 0 : 4);
    ctx.beginPath(); ctx.ellipse(fx - 3, fy, 3, 4, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx + 3, fy + 2, 2.5, 3.5, 0.2, 0, Math.PI * 2); ctx.fill();
  }
}

/** 🪨 石头 */
export function drawRock(ctx, x, y) {
  ctx.fillStyle = '#9E9E9E';
  ctx.beginPath(); ctx.ellipse(x, y, 10, 7, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(44,44,58,0.15)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.ellipse(x - 3, y - 2, 5, 2.5, -0.2, 0, Math.PI * 2); ctx.fill();
}

/** 🌿 草丛 */
export function drawGrassTuft(ctx, x, y, time) {
  const sway = Math.sin(time * 1.5) * 2;
  ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI * 0.4 + i * 0.2;
    const len = 12 + i * 3;
    const sw = sway * (0.5 + i * 0.15);
    ctx.beginPath(); ctx.moveTo(x + i * 3 - 6, y);
    ctx.quadraticCurveTo(x + i * 3 - 6 + Math.cos(angle) * len * 0.5 + sw, y + Math.sin(angle) * len * 0.5, x + i * 3 - 6 + Math.cos(angle) * len + sw * 1.5, y + Math.sin(angle) * len);
    ctx.stroke();
  }
}

// ==================== 玩家角色 — 精致手绘小人 ====================

export function drawPlayer(ctx, x, y, direction, walkFrame, interactHint, appearance) {
  const a = mergeAppearance(appearance);
  const S = 3.2;  // 整体缩放
  const headR = 7 * S;
  const bodyH = 17 * S;
  const legH = 12 * S;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 脚下阴影
  ctx.fillStyle = 'rgba(44,44,58,0.07)';
  ctx.beginPath(); ctx.ellipse(x, y + 4, 20, 7, 0, 0, Math.PI * 2); ctx.fill();

  // === 腿 ===
  const legSwing = walkFrame === 1 ? 13 : -13;
  const bodyBot = y - legH;

  // 裤子
  ctx.fillStyle = a.pants;
  ctx.beginPath();
  ctx.moveTo(x - 7, bodyBot);
  ctx.lineTo(x - 7 + legSwing * 0.7, y - 3);
  ctx.lineTo(x + legSwing * 0.7 - 4, y);
  ctx.lineTo(x - 9 + legSwing * 0.7, y);
  ctx.closePath(); ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + 7, bodyBot);
  ctx.lineTo(x + 7 - legSwing * 0.7, y - 3);
  ctx.lineTo(x - legSwing * 0.7 + 4, y);
  ctx.lineTo(x + 9 - legSwing * 0.7, y);
  ctx.closePath(); ctx.fill();

  // 鞋子（圆润）
  ctx.fillStyle = a.shoe;
  const lShoeX = x - 7 + legSwing * 0.7, rShoeX = x + 7 - legSwing * 0.7;
  ctx.beginPath(); ctx.ellipse(lShoeX, y + 1, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = a.shoe;
  ctx.beginPath(); ctx.ellipse(rShoeX, y + 1, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.stroke();
  // 鞋带
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(lShoeX - 2, y - 1); ctx.lineTo(lShoeX + 2, y - 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rShoeX - 2, y - 1); ctx.lineTo(rShoeX + 2, y - 1); ctx.stroke();

  // === 身体/衬衫 ===
  const bodyTop = y - bodyH - legH + headR;

  // 衣服主体（圆角矩形 + 渐变）
  const shirtGrad = ctx.createLinearGradient(x - 15, bodyTop + 10, x + 15, bodyTop + bodyH);
  shirtGrad.addColorStop(0, a.shirt);
  shirtGrad.addColorStop(1, a.shirtDark);
  ctx.fillStyle = shirtGrad;
  ctx.beginPath(); ctx.roundRect(x - 15, bodyTop + 6, 30, bodyH - 6, 7); ctx.fill();
  sketchRect(ctx, x - 15, bodyTop + 6, 30, bodyH - 6, { color: GRAPHITE, width: 1.2, jitter: 0.8 });

  // 衣领V字
  ctx.strokeStyle = a.shirtDark; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x - 5, bodyTop + 6); ctx.lineTo(x, bodyTop + 14); ctx.lineTo(x + 5, bodyTop + 6); ctx.stroke();

  // 口袋
  ctx.strokeStyle = a.shirtDark; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.roundRect(x + 3, bodyTop + 24, 8, 8, 2); ctx.stroke();

  // === 围巾（可选） ===
  if (a.scarfOn) {
    ctx.fillStyle = a.scarf;
    ctx.beginPath();
    ctx.ellipse(x, bodyTop + 8, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    sketchCircle(ctx, x, bodyTop + 8, 14.5, { color: darkenHex(a.scarf, 40), width: 0.8, jitter: 0.4 });
    // 围巾尾巴
    ctx.fillStyle = a.scarf;
    ctx.beginPath();
    ctx.moveTo(x + 8, bodyTop + 10);
    ctx.quadraticCurveTo(x + 14, bodyTop + 22, x + 10, bodyTop + 30);
    ctx.lineTo(x + 6, bodyTop + 28);
    ctx.quadraticCurveTo(x + 10, bodyTop + 20, x + 4, bodyTop + 10);
    ctx.closePath(); ctx.fill();
    sketchLine(ctx, x + 8, bodyTop + 10, x + 10, bodyTop + 30, { color: darkenHex(a.scarf, 40), width: 0.6, jitter: 0.5 });
  }

  // === 手臂 ===
  const armSwing = walkFrame === 1 ? 11 : -7;
  ctx.fillStyle = a.shirt; ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 1;
  // 左臂
  ctx.save(); ctx.translate(x - 15, bodyTop + 14); ctx.rotate((armSwing) * 0.04);
  ctx.beginPath(); ctx.roundRect(-4, 0, 8, 24, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = a.skin;
  ctx.beginPath(); ctx.arc(0, 27, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  // 右臂
  ctx.save(); ctx.translate(x + 15, bodyTop + 14); ctx.rotate((-armSwing) * 0.04);
  ctx.fillStyle = a.shirt;
  ctx.beginPath(); ctx.roundRect(-4, 0, 8, 24, 3); ctx.fill();
  ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = a.skin;
  ctx.beginPath(); ctx.arc(0, 27, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();

  // === 头部 ===
  const headCY = y - bodyH - legH - headR;

  // 长发（在头部圈之后、头部fill之前绘制后方头发）
  if (a.hairStyle === 'long') {
    ctx.fillStyle = a.hair;
    ctx.beginPath();
    ctx.moveTo(x - headR - 2, headCY + headR * 0.3);
    ctx.quadraticCurveTo(x - headR - 5, headCY + headR + bodyH * 0.6, x - 8, headCY + headR + bodyH * 0.7);
    ctx.lineTo(x + 8, headCY + headR + bodyH * 0.7);
    ctx.quadraticCurveTo(x + headR + 5, headCY + headR + bodyH * 0.6, x + headR + 2, headCY + headR * 0.3);
    ctx.closePath(); ctx.fill();
  }

  // 头（肤色 + 描边）
  ctx.fillStyle = a.skin;
  ctx.beginPath(); ctx.arc(x, headCY, headR, 0, Math.PI * 2); ctx.fill();
  sketchCircle(ctx, x, headCY, headR, { color: GRAPHITE, width: 1.5, jitter: 0.8 });

  // === 头发 ===
  if (a.hairStyle !== 'bald') {
    ctx.fillStyle = a.hair;
    if (a.hairStyle === 'short') {
      // 默认短发 + 刘海
      ctx.beginPath(); ctx.arc(x, headCY - 2, headR + 1, Math.PI * 0.92, Math.PI * 0.08, true); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - headR + 2, headCY - 4);
      ctx.quadraticCurveTo(x - 5, headCY - headR - 4, x + 3, headCY - headR + 4);
      ctx.lineTo(x + headR - 2, headCY - 4);
      ctx.arc(x, headCY, headR - 1, -0.2, Math.PI + 0.2, true);
      ctx.closePath(); ctx.fill();
    } else if (a.hairStyle === 'spiky') {
      // 刺猬头
      const spikes = 7;
      for (let i = 0; i < spikes; i++) {
        const angle = Math.PI * 0.85 + (Math.PI * 0.3 / (spikes - 1)) * i;
        const bx = x + Math.cos(angle) * (headR - 2);
        const by = headCY + Math.sin(angle) * (headR - 2);
        const tx = x + Math.cos(angle) * (headR + 10 + (i % 2) * 4);
        const ty = headCY + Math.sin(angle) * (headR + 10 + (i % 2) * 4);
        ctx.beginPath();
        ctx.moveTo(bx - 4, by);
        ctx.lineTo(tx, ty);
        ctx.lineTo(bx + 4, by);
        ctx.closePath(); ctx.fill();
      }
      // 顶部基底
      ctx.beginPath(); ctx.arc(x, headCY - 2, headR + 1, Math.PI * 0.85, Math.PI * 0.15, true); ctx.closePath(); ctx.fill();
    } else if (a.hairStyle === 'long') {
      // 长发顶部（与短发类似但更蓬松）
      ctx.beginPath(); ctx.arc(x, headCY - 3, headR + 2, Math.PI * 0.92, Math.PI * 0.08, true); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - headR + 2, headCY - 4);
      ctx.quadraticCurveTo(x - 5, headCY - headR - 5, x + 3, headCY - headR + 3);
      ctx.lineTo(x + headR - 2, headCY - 3);
      ctx.arc(x, headCY, headR, -0.2, Math.PI + 0.2, true);
      ctx.closePath(); ctx.fill();
    }
  }

  // === 帽子（可选，多种样式） ===
  if (a.hatStyle !== 'none') {
    if (a.hatStyle === 'beanie') {
      // 红色毛线帽
      ctx.fillStyle = a.hat;
      ctx.beginPath(); ctx.ellipse(x, headCY - headR + 3, headR + 5, headR * 0.65, 0, Math.PI, 0, true); ctx.fill();
      ctx.fillStyle = a.hatDark;
      ctx.beginPath(); ctx.ellipse(x, headCY - headR + 5, headR + 5, 5, 0, Math.PI, 0, true); ctx.fill();
      ctx.fillStyle = a.hatDark;
      ctx.beginPath(); ctx.ellipse(x, headCY - headR + 6, headR + 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      sketchCircle(ctx, x, headCY - headR + 6, headR + 5, { color: darkenHex(a.hat, 50), width: 0.8, jitter: 0.5 });
      // 绒球
      ctx.fillStyle = '#FFF';
      ctx.beginPath(); ctx.arc(x, headCY - headR - headR * 0.55 + 3, 5, 0, Math.PI * 2); ctx.fill();
      sketchCircle(ctx, x, headCY - headR - headR * 0.55 + 3, 5, { color: 'rgba(0,0,0,0.08)', width: 0.5, jitter: 0.3 });
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(x - 1.5, headCY - headR - headR * 0.55 + 1, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (a.hatStyle === 'cap') {
      // 棒球帽
      ctx.fillStyle = a.hat;
      ctx.beginPath(); ctx.ellipse(x, headCY - headR + 4, headR + 4, headR * 0.45, 0, Math.PI, 0, true); ctx.fill();
      // 帽沿（朝前伸出）
      ctx.fillStyle = a.hatDark;
      ctx.beginPath(); ctx.ellipse(x, headCY - headR + 6, headR + 10, 4, 0, 0, Math.PI);
      ctx.fill();
      sketchLine(ctx, x - headR - 10, headCY - headR + 6, x + headR + 10, headCY - headR + 6, { color: darkenHex(a.hat, 50), width: 1, jitter: 0.4 });
    } else if (a.hatStyle === 'beret') {
      // 贝雷帽
      ctx.fillStyle = a.hat;
      ctx.beginPath(); ctx.ellipse(x + 2, headCY - headR + 2, headR + 8, headR * 0.5, -0.15, 0, Math.PI * 2); ctx.fill();
      sketchCircle(ctx, x + 2, headCY - headR + 2, headR + 6, { color: darkenHex(a.hat, 50), width: 0.8, jitter: 0.5 });
      // 小柄
      ctx.fillStyle = a.hatDark;
      ctx.beginPath(); ctx.arc(x + 2, headCY - headR - 3, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // === 面部 ===
  const edx = direction === 'left' ? -2.5 : direction === 'right' ? 2.5 : 0;
  const edy = direction === 'up' ? -1.5 : direction === 'down' ? 1.5 : 0;

  // 白眼
  ctx.fillStyle = '#FFF';
  ctx.beginPath(); ctx.ellipse(x - 5 + edx, headCY - 1 + edy, 4.5, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 5 + edx, headCY - 1 + edy, 4.5, 5, 0, 0, Math.PI * 2); ctx.fill();
  // 眼眶
  ctx.strokeStyle = 'rgba(44,44,58,0.15)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.ellipse(x - 5 + edx, headCY - 1 + edy, 4.8, 5.3, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + 5 + edx, headCY - 1 + edy, 4.8, 5.3, 0, 0, Math.PI * 2); ctx.stroke();

  // 瞳孔
  ctx.fillStyle = GRAPHITE;
  ctx.beginPath(); ctx.arc(x - 5 + edx * 1.3, headCY - 0.5 + edy, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 + edx * 1.3, headCY - 0.5 + edy, 2.5, 0, Math.PI * 2); ctx.fill();

  // 眼睛高光
  ctx.fillStyle = '#FFF';
  ctx.beginPath(); ctx.arc(x - 4 + edx * 1.3, headCY - 2 + edy, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 6 + edx * 1.3, headCY - 2 + edy, 1, 0, Math.PI * 2); ctx.fill();

  // 腮红
  ctx.fillStyle = a.cheek; ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.ellipse(x - 14, headCY + 4, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 14, headCY + 4, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // 嘴巴
  if (direction !== 'up') {
    ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, headCY + 7, 3.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }

  // === 交互光环 ===
  if (interactHint) {
    const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.5;
    ctx.strokeStyle = `rgba(234,84,85,${pulse * 0.35})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(x, y - bodyH / 2, 45 + Math.sin(Date.now() * 0.005) * 6, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    for (let s = 0; s < 4; s++) {
      const angle = Date.now() * 0.002 + s * Math.PI / 2;
      const sr = 48 + Math.sin(Date.now() * 0.004) * 6;
      ctx.fillStyle = `rgba(7,123,138,${pulse * 0.55})`;
      ctx.font = '11px sans-serif';
      ctx.fillText('✦', x + Math.cos(angle) * sr - 5, y - bodyH / 2 + Math.sin(angle) * sr + 4);
    }
  }
}

/** 将 hex 颜色变暗指定量 */
function darkenHex(hex, amount) {
  if (!hex || !hex.startsWith('#')) return hex;
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ==================== 交互提示气泡 ====================

export function drawPromptBubble(ctx, x, y, text, viewportW, viewportH) {
  const padding = 10;
  ctx.font = 'bold 14px Caveat, cursive';
  const tw = ctx.measureText(text).width;
  // 限制最大宽度，避免气泡溢出屏幕
  const maxBw = Math.min((viewportW || 800) - 20, 260);
  const bw = Math.min(tw + padding * 2 + 28, maxBw);
  const bh = 30;

  let bx = x - bw / 2, by = y - bh - 8;

  // 限制在视口范围内 (x, y 已经是经过相机变换的屏幕坐标)
  if (viewportW) {
    if (bx < 8) bx = 8;
    if (bx + bw > viewportW - 8) bx = viewportW - 8 - bw;
  }
  if (viewportH) {
    if (by < 8) by = 8;
  }

  ctx.fillStyle = 'rgba(250,245,232,0.95)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 7); ctx.fill();
  ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5; ctx.stroke();

  // 指示三角 — 如果气泡偏离了原始位置就省略三角
  const offset = Math.abs(bx - (x - bw / 2));
  if (offset < bw * 0.6) {
    ctx.fillStyle = 'rgba(250,245,232,0.95)';
    ctx.beginPath(); ctx.moveTo(x - 6, by + bh); ctx.lineTo(x, by + bh + 8); ctx.lineTo(x + 6, by + bh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = TEAL; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 6, by + bh + 0.5); ctx.lineTo(x, by + bh + 8); ctx.lineTo(x + 6, by + bh + 0.5); ctx.stroke();
  }

  // F 键徽章
  ctx.fillStyle = TEAL;
  ctx.beginPath(); ctx.roundRect(bx + 7, by + 6, 20, 18, 4); ctx.fill();
  ctx.fillStyle = '#FFF'; ctx.font = 'bold 13px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('F', bx + 17, by + 20);

  // 文字 — 裁剪到气泡宽度内
  ctx.save();
  ctx.beginPath(); ctx.rect(bx + 30, by, bw - 38, bh); ctx.clip();
  ctx.fillStyle = GRAPHITE; ctx.font = 'bold 14px Caveat, cursive'; ctx.textAlign = 'left';
  ctx.fillText(text, bx + 32, by + 21);
  ctx.restore();
}

// ==================== 飞镖靶 ====================

export function drawDartBoard(ctx, x, y, time) {
  const w = 140, h = 160;
  const cx = x + w / 2, cy = y + h / 2;
  const maxR = 55;

  // 靶子支架
  ctx.fillStyle = KRAFT;
  ctx.fillRect(cx - 3, y + h - 25, 6, 25);
  ctx.fillRect(cx - 20, y + h - 3, 40, 5);

  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.beginPath(); ctx.arc(cx + 3, cy + 3, maxR + 5, 0, Math.PI * 2); ctx.fill();

  // 外环（白/黑交替）
  const rings = [
    { r: maxR, fill: '#E8E0D0', stroke: GRAPHITE },     // 外环
    { r: maxR * 0.78, fill: '#2C2C3A', stroke: '#1a1a2e' }, // 黑环
    { r: maxR * 0.56, fill: '#E8E0D0', stroke: GRAPHITE },  // 中环
    { r: maxR * 0.34, fill: REDLINE, stroke: '#C0392B' },   // 红环
    { r: maxR * 0.15, fill: '#2C2C3A', stroke: '#1a1a2e' }, // 靶心
  ];
  rings.forEach(ring => {
    ctx.fillStyle = ring.fill;
    ctx.beginPath(); ctx.arc(cx, cy, ring.r, 0, Math.PI * 2); ctx.fill();
    sketchCircle(ctx, cx, cy, ring.r, { color: ring.stroke, width: 1.2, jitter: 0.8 });
  });

  // 环线细分（十字线）
  ctx.strokeStyle = 'rgba(44,44,58,0.2)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke();

  // 飞镖1（上方偏右）
  const d1x = cx + 18 + Math.sin(time * 0.8) * 0.8, d1y = cy - 14;
  ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(d1x, d1y + 12); ctx.lineTo(d1x, d1y - 18); ctx.stroke();
  // 飞镖尾翼
  ctx.fillStyle = '#EA5455';
  ctx.beginPath(); ctx.moveTo(d1x, d1y - 14); ctx.lineTo(d1x - 5, d1y - 20); ctx.lineTo(d1x, d1y - 18); ctx.lineTo(d1x + 5, d1y - 20); ctx.closePath(); ctx.fill();

  // 飞镖2（左下）
  const d2x = cx - 25, d2y = cy + 10;
  ctx.strokeStyle = '#077B8A'; ctx.lineWidth = 2;
  ctx.save(); ctx.translate(d2x, d2y); ctx.rotate(0.3);
  ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, -18); ctx.stroke();
  ctx.fillStyle = TEAL;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-5, -20); ctx.lineTo(0, -18); ctx.lineTo(5, -20); ctx.closePath(); ctx.fill();
  ctx.restore();

  // 飞镖3（右下偏内）
  const d3x = cx + 8, d3y = cy + 22;
  ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 2;
  ctx.save(); ctx.translate(d3x, d3y); ctx.rotate(-0.15);
  ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -16); ctx.stroke();
  ctx.fillStyle = '#F4D03F';
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-4, -17); ctx.lineTo(0, -16); ctx.lineTo(4, -17); ctx.closePath(); ctx.fill();
  ctx.restore();

  ctx.lineCap = 'round';
}

// ==================== 骰子桌 ====================

export function drawDiceTable(ctx, x, y, time) {
  const w = 160, h = 130;

  // 圆桌
  ctx.fillStyle = '#c9a96e';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 15, w / 2 - 5, 18, 0, 0, Math.PI * 2); ctx.fill();
  sketchCircle(ctx, x + w / 2, y + h - 15, w / 2 - 5, { color: GRAPHITE, width: 1.2, jitter: 0.8 });
  // 桌腿
  ctx.fillStyle = '#b0845a';
  ctx.fillRect(x + 25, y + h - 5, 6, 24);
  ctx.fillRect(x + w - 31, y + h - 5, 6, 24);

  // 骰子1
  const diceR = Math.sin(time * 1.2) * 0.04;
  drawSingleDie(ctx, x + 40, y + h - 55, 32, 3, diceR);
  // 骰子2
  drawSingleDie(ctx, x + 95, y + h - 50, 32, 5, -diceR * 0.6);

  // 小筹码堆
  ctx.fillStyle = REDLINE; ctx.globalAlpha = 0.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.ellipse(x + 130, y + h - 30 - i * 3, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSingleDie(ctx, x, y, size, value, rotation) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(rotation);

  // 骰子面
  const s = size / 2;
  ctx.fillStyle = '#FFFDF5';
  ctx.beginPath(); ctx.roundRect(-s, -s, size, size, 5); ctx.fill();
  sketchRect(ctx, -s, -s, size, size, { color: GRAPHITE, width: 1.2, jitter: 0.6 });

  // 点数
  ctx.fillStyle = GRAPHITE;
  const dr = size * 0.08; // 点半径
  const positions = getDiePositions(value, s * 0.55);
  positions.forEach(([px, py]) => {
    ctx.beginPath(); ctx.arc(px, py, dr, 0, Math.PI * 2); ctx.fill();
  });

  ctx.restore();
}

function getDiePositions(value, offset) {
  const o = offset;
  switch (value) {
    case 1: return [[0, 0]];
    case 2: return [[-o, -o], [o, o]];
    case 3: return [[-o, -o], [0, 0], [o, o]];
    case 4: return [[-o, -o], [o, -o], [-o, o], [o, o]];
    case 5: return [[-o, -o], [o, -o], [0, 0], [-o, o], [o, o]];
    case 6: return [[-o, -o], [o, -o], [-o, 0], [o, 0], [-o, o], [o, o]];
    default: return [[0, 0]];
  }
}

// ==================== 卡牌桌 ====================

export function drawCardTable(ctx, x, y, time) {
  const w = 200, h = 150;

  // 桌布
  ctx.fillStyle = '#2d5a3f';
  ctx.fillRect(x, y + h - 20, w, 20);
  sketchRect(ctx, x, y + h - 20, w, 20, { color: GRAPHITE, width: 1, jitter: 0.8 });

  // 桌腿
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(x + 12, y + h, 5, 22);
  ctx.fillRect(x + w - 17, y + h, 5, 22);

  // 散落的卡牌背面
  const cards = [
    { cx: x + 40, cy: y + h - 40, rot: -0.15 },
    { cx: x + 80, cy: y + h - 50, rot: 0.08 },
    { cx: x + 120, cy: y + h - 42, rot: 0.22 },
    { cx: x + 160, cy: y + h - 48, rot: -0.1 },
    { cx: x + 100, cy: y + h - 55, rot: 0.05 + Math.sin(time * 1.5) * 0.04 }, // 微微翘起
  ];

  cards.forEach(c => {
    ctx.save();
    ctx.translate(c.cx, c.cy);
    ctx.rotate(c.rot);
    // 卡牌背面
    ctx.fillStyle = '#5B2C6F';
    ctx.beginPath(); ctx.roundRect(-18, -26, 36, 52, 4); ctx.fill();
    sketchRect(ctx, -18, -26, 36, 52, { color: GRAPHITE, width: 1, jitter: 0.5 });
    // 背面花纹
    ctx.fillStyle = '#7E57C2'; ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.roundRect(-12, -20, 24, 40, 2); ctx.fill();
    ctx.globalAlpha = 1;
    // 小钻石图案
    ctx.strokeStyle = '#CE93D8'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(6, 0); ctx.lineTo(0, 10); ctx.lineTo(-6, 0); ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });

  // 小筹码
  ctx.fillStyle = '#F4D03F'; ctx.globalAlpha = 0.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.ellipse(x + 170, y + h - 28 - i * 3, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ==================== 幸运转盘 ====================

export function drawSpinWheel(ctx, x, y, time) {
  const w = 160, h = 170;
  const cx = x + w / 2, cy = y + h / 2 - 10;
  const R = 55;

  // 支架
  ctx.fillStyle = KRAFT;
  ctx.fillRect(cx - 3, cy + R, 6, 30);
  ctx.fillRect(cx - 18, y + h - 5, 36, 5);

  // 轻微空闲旋转
  const idleRot = time * 0.3;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(idleRot);

  // 8格彩色扇形
  const colors = ['#FFD54F', '#EA5455', '#26A69A', '#7E57C2', '#F4A460', '#077B8A', '#FF8A80', '#3D5A80'];
  for (let i = 0; i < 8; i++) {
    const startAngle = i * Math.PI / 4;
    const endAngle = (i + 1) * Math.PI / 4;
    ctx.fillStyle = colors[i]; ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, startAngle, endAngle);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 外圈描边
  sketchCircle(ctx, 0, 0, R, { color: GRAPHITE, width: 2, jitter: 1 });

  // 中心圆
  ctx.fillStyle = '#FFFDF5';
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  sketchCircle(ctx, 0, 0, 8, { color: GRAPHITE, width: 1, jitter: 0.4 });

  ctx.restore();

  // 指针（固定不转）
  ctx.fillStyle = REDLINE;
  ctx.beginPath();
  ctx.moveTo(cx, cy - R - 8);
  ctx.lineTo(cx - 7, cy - R + 6);
  ctx.lineTo(cx + 7, cy - R + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = GRAPHITE; ctx.lineWidth = 1; ctx.stroke();
}

// ==================== 音乐盒 ====================

export function drawMusicBox(ctx, x, y, time) {
  const w = 120, h = 100;

  // 小圆桌
  ctx.fillStyle = '#c9a96e';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 8, w / 2 - 8, 14, 0, 0, Math.PI * 2); ctx.fill();
  sketchCircle(ctx, x + w / 2, y + h - 8, w / 2 - 8, { color: GRAPHITE, width: 0.8, jitter: 0.5 });

  // 音乐盒主体（精致的方形盒）
  const bx = x + 25, by = y + h - 48;
  const bw = 70, bh = 38;
  ctx.fillStyle = '#8B6E52';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
  sketchRect(ctx, bx, by, bw, bh, { color: GRAPHITE, width: 1.3, jitter: 0.7 });
  // 盒体装饰线
  ctx.strokeStyle = '#C9A96E'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(bx + 6, by + 6); ctx.lineTo(bx + bw - 6, by + 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx + 6, by + bh - 6); ctx.lineTo(bx + bw - 6, by + bh - 6); ctx.stroke();
  // 盒上旋钮
  ctx.fillStyle = '#F4D03F';
  ctx.beginPath(); ctx.arc(bx + bw - 15, by + bh / 2, 5, 0, Math.PI * 2); ctx.fill();
  sketchCircle(ctx, bx + bw - 15, by + bh / 2, 5, { color: '#8B6914', width: 0.6, jitter: 0.3 });

  // 打开的盖子
  const lidAngle = 0.5 + Math.sin(time * 0.6) * 0.15;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-lidAngle);
  ctx.fillStyle = '#8B6E52';
  ctx.fillRect(0, -6, bw, 6);
  sketchRect(ctx, 0, -6, bw, 6, { color: GRAPHITE, width: 0.8, jitter: 0.5 });
  // 盖子内部颜色
  ctx.fillStyle = '#D4A76A'; ctx.fillRect(2, -5, bw - 4, 4);
  ctx.restore();

  // 芭蕾舞者剪影（从盒子中升起）
  const dancerY = by - 15 + Math.sin(time * 2) * 3;
  const dancerX = bx + bw / 2;
  ctx.fillStyle = 'rgba(44,44,58,0.55)';
  // 头
  ctx.beginPath(); ctx.arc(dancerX, dancerY - 14, 3.5, 0, Math.PI * 2); ctx.fill();
  // 身体
  ctx.beginPath(); ctx.moveTo(dancerX, dancerY - 10); ctx.lineTo(dancerX, dancerY + 2); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(44,44,58,0.55)'; ctx.stroke();
  // 手臂（芭蕾姿势）
  ctx.beginPath(); ctx.moveTo(dancerX - 8, dancerY - 6); ctx.quadraticCurveTo(dancerX, dancerY - 10, dancerX + 8, dancerY - 6); ctx.stroke();
  // 腿
  ctx.beginPath(); ctx.moveTo(dancerX, dancerY + 2); ctx.lineTo(dancerX - 6, dancerY + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(dancerX, dancerY + 2); ctx.lineTo(dancerX + 5, dancerY + 10); ctx.stroke();
  // 芭蕾裙
  ctx.fillStyle = 'rgba(234,84,85,0.35)';
  ctx.beginPath();
  ctx.moveTo(dancerX - 8, dancerY + 2);
  ctx.quadraticCurveTo(dancerX, dancerY - 2, dancerX + 8, dancerY + 2);
  ctx.quadraticCurveTo(dancerX, dancerY + 5, dancerX - 8, dancerY + 2);
  ctx.fill();

  // 飘动的音符
  ctx.fillStyle = 'rgba(44,44,58,0.18)'; ctx.font = '14px Caveat, cursive';
  for (let i = 0; i < 4; i++) {
    const nx = dancerX + 15 + i * 12 + Math.sin(time * 1.5 + i) * 6;
    const ny = dancerY - 20 - i * 10 + Math.sin(time * 2 + i * 1.2) * 5;
    ctx.fillText(['♪', '♫', '♩', '♬'][i], nx, ny);
  }
}

// ==================== 新增交互区域绘制 ====================

// 🌿 迷宫花园
export function drawMazeGarden(ctx, x, y, time) {
  const w = 180, h = 160;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 地面
  ctx.fillStyle = '#C8E6C9';
  ctx.fillRect(x, y, w, h);
  // 迷宫墙 (简笔风格)
  ctx.strokeStyle = 'rgba(46,125,50,0.35)';
  ctx.lineWidth = 2;
  // 外框
  sketchRect(ctx, x + 10, y + 10, w - 20, h - 20, { color: 'rgba(46,125,50,0.5)', width: 2, jitter: 0.8 });
  // 简笔迷宫通道
  const mx = x + 20, my = y + 20;
  ctx.strokeStyle = 'rgba(46,125,50,0.4)'; ctx.lineWidth = 1.5;
  // 几道弯弯曲的墙
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(mx + i * 28 + 5, my);
    ctx.lineTo(mx + i * 28 + 5, my + 30 + Math.sin(time + i) * 3);
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(mx + i * 28 + 15, my + 50);
    ctx.lineTo(mx + i * 28 + 15, my + 80 + Math.sin(time * 0.8 + i) * 3);
    ctx.stroke();
  }
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(mx + i * 32 + 10, my + 95);
    ctx.lineTo(mx + i * 32 + 10, my + 120 + Math.sin(time * 1.2 + i) * 3);
    ctx.stroke();
  }
  // 入口标记
  ctx.fillStyle = 'rgba(46,125,50,0.6)';
  ctx.beginPath(); ctx.arc(mx - 2, my + 5, 4, 0, Math.PI * 2); ctx.fill();
  // 出口标记
  ctx.fillStyle = REDLINE;
  ctx.beginPath(); ctx.arc(x + w - 20, y + h - 18, 4, 0, Math.PI * 2); ctx.fill();
  // 小花装饰
  const sway = Math.sin(time * 1.2) * 3;
  ctx.fillStyle = '#FF9800';
  ctx.beginPath(); ctx.arc(x + w - 15, y + 18 + sway, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#E91E63';
  ctx.beginPath(); ctx.arc(x + 12, y + h - 15 - sway, 3.5, 0, Math.PI * 2); ctx.fill();
}

// 🧩 拼图桌
export function drawPuzzleTable(ctx, x, y, time) {
  const w = 170, h = 150;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 桌面
  ctx.fillStyle = '#FFE0B2';
  ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: KRAFT, width: 1.5, jitter: 0.6 });
  // 3×3 拼图方块
  const ox = x + 25, oy = y + 20, cs = 36, gap = 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const bx = ox + c * (cs + gap), by = oy + r * (cs + gap);
      const num = r * 3 + c + 1;
      if (num === 9) continue; // 空格
      const wobble = Math.sin(time * 1.5 + r * 2 + c) * 1;
      ctx.fillStyle = num % 2 === 0 ? '#FFF9C4' : '#E3F2FD';
      ctx.fillRect(bx + wobble, by, cs, cs);
      sketchRect(ctx, bx + wobble, by, cs, cs, { color: 'rgba(44,44,58,0.25)', width: 1, jitter: 0.4 });
      ctx.fillStyle = GRAPHITE;
      ctx.font = 'bold 16px Caveat, cursive';
      ctx.textAlign = 'center';
      ctx.fillText(String(num), bx + cs / 2 + wobble, by + cs / 2 + 6);
      ctx.textAlign = 'start';
    }
  }
  ctx.textAlign = 'start';
}

// 🏯 华容道
export function drawKlotskiBoard(ctx, x, y, time) {
  const w = 180, h = 200;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 木质棋盘框
  ctx.fillStyle = '#D7CCC8';
  ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: KRAFT, width: 2, jitter: 0.6 });
  // 5×4 格线
  const ox = x + 15, oy = y + 15, cs = 36;
  ctx.strokeStyle = 'rgba(139,115,85,0.3)'; ctx.lineWidth = 1;
  for (let r = 0; r <= 5; r++) {
    sketchLine(ctx, ox, oy + r * cs, ox + 4 * cs, oy + r * cs, { color: 'rgba(139,115,85,0.3)', width: 1, jitter: 0.3 });
  }
  for (let c = 0; c <= 4; c++) {
    sketchLine(ctx, ox + c * cs, oy, ox + c * cs, oy + 5 * cs, { color: 'rgba(139,115,85,0.3)', width: 1, jitter: 0.3 });
  }
  // 曹操 (红色大块 2×2) — 代表游戏核心
  const caocaoX = ox + cs + 3, caocaoY = oy + 3;
  ctx.fillStyle = 'rgba(234,84,85,0.35)';
  ctx.fillRect(caocaoX, caocaoY, cs * 2 - 6, cs * 2 - 6);
  sketchRect(ctx, caocaoX, caocaoY, cs * 2 - 6, cs * 2 - 6, { color: REDLINE, width: 1.5, jitter: 0.4 });
  ctx.fillStyle = REDLINE;
  ctx.font = 'bold 14px Caveat, cursive';
  ctx.textAlign = 'center';
  ctx.fillText('曹操', caocaoX + cs - 3, caocaoY + cs + 2);
  // 出口标记 (底部中间)
  ctx.fillStyle = TEAL;
  ctx.font = '12px Caveat, cursive';
  ctx.fillText('出', ox + cs * 1.5, oy + 5 * cs + 12);
  ctx.textAlign = 'start';
  // 其他方块 (简化显示)
  ctx.fillStyle = 'rgba(7,123,138,0.25)';
  ctx.fillRect(ox + 3, oy + cs * 2 + 3, cs * 2 - 6, cs - 6); // 关羽横
  ctx.fillStyle = 'rgba(139,115,85,0.25)';
  ctx.fillRect(ox + 3, oy + 3, cs - 6, cs * 2 - 6); // 张飞竖
}

// 🔢 数独角
export function drawSudokuCorner(ctx, x, y, time) {
  const w = 160, h = 160;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 小书桌
  ctx.fillStyle = '#E8EAF6';
  ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: 'rgba(63,81,181,0.3)', width: 1.5, jitter: 0.5 });
  // 4×4 网格
  const ox = x + 25, oy = y + 20, cs = 26;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const bx = ox + c * cs, by = oy + r * cs;
      ctx.fillStyle = (r < 2 && c < 2) || (r >= 2 && c >= 2) ? '#EDE7F6' : '#F3E5F5';
      ctx.fillRect(bx, by, cs, cs);
      sketchRect(ctx, bx, by, cs, cs, { color: 'rgba(63,81,181,0.2)', width: 0.8, jitter: 0.3 });
      // 随机填些数字
      if ((r + c) % 3 !== 1) {
        ctx.fillStyle = GRAPHITE;
        ctx.font = '13px Caveat, cursive';
        ctx.textAlign = 'center';
        ctx.fillText(String((r * 4 + c + 3) % 4 + 1), bx + cs / 2, by + cs / 2 + 5);
        ctx.textAlign = 'start';
      }
    }
  }
  // 2×2 宫格粗线
  ctx.strokeStyle = 'rgba(63,81,181,0.4)'; ctx.lineWidth = 2;
  sketchRect(ctx, ox, oy, cs * 4, cs * 4, { color: 'rgba(63,81,181,0.4)', width: 2, jitter: 0.3 });
  // 铅笔
  const px = x + w - 30, py = y + h - 35;
  ctx.fillStyle = '#FFC107';
  ctx.fillRect(px, py + Math.sin(time * 2) * 2, 5, 25);
  ctx.fillStyle = GRAPHITE;
  ctx.beginPath(); ctx.moveTo(px, py + 25); ctx.lineTo(px + 2.5, py + 30); ctx.lineTo(px + 5, py + 25); ctx.fill();
}

// 🪙 许愿池
export function drawWishPond(ctx, x, y, time) {
  const w = 160, h = 140;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 石池
  const cx = x + w / 2, cy = y + h / 2 + 10;
  const rx = 55, ry = 35;
  // 水面
  ctx.fillStyle = 'rgba(100,181,246,0.3)';
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  // 水波纹
  ctx.strokeStyle = 'rgba(100,181,246,0.4)'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const r = 15 + i * 14 + Math.sin(time * 2 + i) * 4;
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // 石边
  sketchCircle(ctx, cx, cy, rx + 2, { color: KRAFT, width: 2, jitter: 1.2 });
  // 硬币（闪光）
  const coinSway = Math.sin(time * 1.8) * 3;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.ellipse(cx - 10 + coinSway, cy - 5, 6, 4, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFC107';
  ctx.beginPath(); ctx.ellipse(cx + 15, cy + 8 - coinSway, 5, 3.5, -0.1, 0, Math.PI * 2); ctx.fill();
  // 星星闪烁
  ctx.fillStyle = 'rgba(255,215,0,0.5)'; ctx.font = '10px Caveat, cursive';
  ctx.fillText('✨', cx + rx - 10 + Math.sin(time * 3) * 3, cy - ry - 5);
}

// 🔮 魔法阵
export function drawMagicCircle(ctx, x, y, time) {
  const w = 170, h = 170;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 地面
  ctx.fillStyle = '#F3E5F5';
  ctx.fillRect(x, y, w, h);
  // 外圈
  const cx = x + w / 2, cy = y + h / 2, r = 60;
  sketchCircle(ctx, cx, cy, r, { color: 'rgba(156,39,176,0.4)', width: 1.5, jitter: 0.8 });
  sketchCircle(ctx, cx, cy, r - 15, { color: 'rgba(156,39,176,0.25)', width: 1, jitter: 0.6 });
  // 内圈六芒星旋转
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.3);
  ctx.strokeStyle = 'rgba(156,39,176,0.3)'; ctx.lineWidth = 1;
  // 六角形
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
    ctx.stroke();
  }
  ctx.restore();
  // 6符文小圆
  const runeColors = ['#EA5455', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#607D8B'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + time * 0.2;
    const rx = cx + Math.cos(a) * (r - 7);
    const ry = cy + Math.sin(a) * (r - 7);
    const glow = 0.3 + Math.sin(time * 3 + i) * 0.15;
    ctx.fillStyle = runeColors[i].replace(')', `,${glow})`).replace('rgb', 'rgba').replace('#', '');
    // 简单填充
    ctx.globalAlpha = glow + 0.3;
    ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI * 2);
    ctx.fillStyle = runeColors[i]; ctx.fill();
    ctx.globalAlpha = 1;
    sketchCircle(ctx, rx, ry, 7, { color: 'rgba(44,44,58,0.3)', width: 0.8, jitter: 0.3 });
  }
}

// ⭐ 星座仪
export function drawConstellation(ctx, x, y, time) {
  const w = 180, h = 160;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 夜空底
  ctx.fillStyle = '#1A237E';
  ctx.fillRect(x, y, w, h);
  // 微星
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  for (let i = 0; i < 12; i++) {
    const sx = x + 10 + ((i * 37 + 13) % (w - 20));
    const sy = y + 10 + ((i * 23 + 7) % (h - 20));
    ctx.beginPath(); ctx.arc(sx, sy, 0.8 + Math.sin(time * 2 + i) * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // 主要星星（较亮）
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const stars = [[40,50],[80,35],[130,55],[170,45],[50,100],[100,80],[140,110],[160,90]];
  for (let i = 0; i < stars.length; i++) {
    const twinkle = 1.5 + Math.sin(time * 3 + i * 1.5) * 0.5;
    ctx.beginPath(); ctx.arc(x + stars[i][0], y + stars[i][1], twinkle, 0, Math.PI * 2); ctx.fill();
  }
  // 连线示例（虚线）
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let i = 0; i < stars.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + stars[i][0], y + stars[i][1]);
    ctx.lineTo(x + stars[i + 1][0], y + stars[i + 1][1]);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  sketchRect(ctx, x, y, w, h, { color: 'rgba(63,81,181,0.4)', width: 1.5, jitter: 0.5 });
}

// ⏳ 时光沙漏
export function drawHourglass(ctx, x, y, time) {
  const w = 120, h = 180;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 地面
  ctx.fillStyle = CREAM;
  ctx.fillRect(x, y, w, h);
  // 沙漏支架
  const cx = x + w / 2, topY = y + 20, botY = y + h - 20;
  // 木架
  ctx.fillStyle = KRAFT;
  ctx.fillRect(cx - 30, topY - 5, 60, 6);
  ctx.fillRect(cx - 30, botY - 1, 60, 6);
  // 沙漏玻璃轮廓
  ctx.strokeStyle = 'rgba(44,44,58,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 22, topY); ctx.quadraticCurveTo(cx, topY + 50, cx - 4, topY + 60);
  ctx.quadraticCurveTo(cx, topY + 65, cx + 4, topY + 60);
  ctx.quadraticCurveTo(cx, topY + 50, cx + 22, topY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 22, botY); ctx.quadraticCurveTo(cx, botY - 50, cx - 4, botY - 60);
  ctx.quadraticCurveTo(cx, botY - 65, cx + 4, botY - 60);
  ctx.quadraticCurveTo(cx, botY - 50, cx + 22, botY);
  ctx.stroke();
  // 上半沙子
  const sandTop = 0.3 + Math.sin(time * 0.5) * 0.05;
  ctx.fillStyle = '#FFCC80';
  ctx.beginPath();
  ctx.moveTo(cx - 18, topY + 3);
  ctx.lineTo(cx + 18, topY + 3);
  ctx.lineTo(cx + 4 * sandTop + 4, topY + 55 * sandTop);
  ctx.lineTo(cx - 4 * sandTop - 4, topY + 55 * sandTop);
  ctx.fill();
  // 下半沙子
  const sandBot = 0.7 - Math.sin(time * 0.5) * 0.05;
  ctx.fillStyle = '#FFB74D';
  ctx.beginPath();
  ctx.moveTo(cx - 18 * sandBot, botY - 3);
  ctx.lineTo(cx + 18 * sandBot, botY - 3);
  ctx.lineTo(cx + 3, botY - 55 * sandBot);
  ctx.lineTo(cx - 3, botY - 55 * sandBot);
  ctx.fill();
  // 沙流
  ctx.fillStyle = '#FFCC80';
  ctx.fillRect(cx - 1, topY + 55, 2, 30);
  sketchRect(ctx, x, y, w, h, { color: KRAFT, width: 1.2, jitter: 0.6 });
}

// 🔆 万花筒
export function drawKaleidoscope(ctx, x, y, time) {
  const w = 150, h = 150;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 底
  ctx.fillStyle = '#FFFDE7';
  ctx.fillRect(x, y, w, h);
  // 万花筒中心圆
  const cx = x + w / 2, cy = y + h / 2, r = 50;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.5);
  const segments = 8;
  const hue = (time * 30) % 360;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const nextA = ((i + 1) / segments) * Math.PI * 2;
    ctx.fillStyle = `hsla(${(hue + i * (360 / segments)) % 360}, 70%, 70%, 0.3)`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(nextA) * r, Math.sin(nextA) * r);
    ctx.fill();
  }
  ctx.restore();
  sketchCircle(ctx, cx, cy, r, { color: 'rgba(44,44,58,0.2)', width: 1.5, jitter: 0.6 });
  sketchRect(ctx, x, y, w, h, { color: KRAFT, width: 1.2, jitter: 0.5 });
}

// 📔 日记本
export function drawDiary(ctx, x, y, time) {
  const w = 150, h = 130;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 本子
  ctx.fillStyle = '#FFF8E1';
  ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
  sketchRect(ctx, x + 10, y + 10, w - 20, h - 20, { color: KRAFT, width: 1.5, jitter: 0.6 });
  // 封面条纹
  ctx.fillStyle = '#EFEBE9';
  ctx.fillRect(x + 10, y + 10, 25, h - 20);
  sketchLine(ctx, x + 35, y + 10, x + 35, y + h - 10, { color: KRAFT, width: 1, jitter: 0.3 });
  // 横线
  ctx.strokeStyle = 'rgba(44,44,58,0.08)'; ctx.lineWidth = 0.5;
  for (let i = 0; i < 6; i++) {
    const ly = y + 35 + i * 15;
    ctx.beginPath(); ctx.moveTo(x + 40, ly); ctx.lineTo(x + w - 20, ly); ctx.stroke();
  }
  // 手写文字
  ctx.fillStyle = 'rgba(44,44,58,0.25)'; ctx.font = '11px Caveat, cursive';
  ctx.fillText('今天…', x + 42, y + 42);
  ctx.fillText('很快乐 ✨', x + 42, y + 57);
  // 心情标签
  const mood = Math.sin(time) > 0 ? '😊' : '😌';
  ctx.font = '16px sans-serif';
  ctx.fillText(mood, x + w - 30, y + 28 + Math.sin(time * 1.5) * 2);
}

// 🌤️ 气候站
export function drawWeatherStation(ctx, x, y, time) {
  const w = 170, h = 150;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 底
  ctx.fillStyle = '#E3F2FD';
  ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: 'rgba(33,150,243,0.3)', width: 1.2, jitter: 0.5 });
  // 太阳
  const sunX = x + 35, sunY = y + 40;
  ctx.fillStyle = '#FFC107';
  ctx.beginPath(); ctx.arc(sunX, sunY, 12, 0, Math.PI * 2); ctx.fill();
  // 光线
  ctx.strokeStyle = '#FFB300'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + time * 0.5;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(a) * 15, sunY + Math.sin(a) * 15);
    ctx.lineTo(sunX + Math.cos(a) * 22, sunY + Math.sin(a) * 22);
    ctx.stroke();
  }
  // 云
  const cloudX = x + 80 + Math.sin(time * 0.8) * 8;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(cloudX, sunY - 5, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cloudX + 14, sunY - 5, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cloudX + 7, sunY - 12, 10, 0, Math.PI * 2); ctx.fill();
  // 温度计
  const thx = x + w - 30, thy = y + 25, thh = 60;
  ctx.strokeStyle = REDLINE; ctx.lineWidth = 1;
  sketchRect(ctx, thx - 4, thy, 8, thh, { color: REDLINE, width: 1, jitter: 0.3 });
  ctx.fillStyle = REDLINE;
  const mercury = thh * 0.6 + Math.sin(time * 0.7) * 5;
  ctx.fillRect(thx - 2, thy + thh - mercury, 4, mercury);
  ctx.beginPath(); ctx.arc(thx, thy + thh + 5, 6, 0, Math.PI * 2); ctx.fill();
}

// 🍳 烹饪桌
export function drawCookingTable(ctx, x, y, time) {
  const w = 190, h = 150;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 桌面
  ctx.fillStyle = '#FBE9E7';
  ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: 'rgba(230,74,25,0.3)', width: 1.5, jitter: 0.6 });
  // 锅
  const potX = x + w / 2, potY = y + h / 2 + 10;
  ctx.fillStyle = '#546E7A';
  ctx.beginPath();
  ctx.ellipse(potX, potY, 35, 18, 0, 0, Math.PI); ctx.fill();
  ctx.fillRect(potX - 35, potY - 20, 70, 20);
  sketchRect(ctx, potX - 35, potY - 20, 70, 20, { color: 'rgba(44,44,58,0.25)', width: 1, jitter: 0.5 });
  // 蒸汽
  ctx.strokeStyle = 'rgba(44,44,58,0.15)'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const sx = potX - 15 + i * 15;
    const sy = potY - 25;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + 5, sy - 12 + Math.sin(time * 2 + i) * 5, sx + 2, sy - 25);
    ctx.stroke();
  }
  // 把手
  ctx.strokeStyle = '#37474F'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(potX - 35, potY - 12); ctx.lineTo(potX - 48, potY - 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(potX + 35, potY - 12); ctx.lineTo(potX + 48, potY - 12); ctx.stroke();
  // 食材小图
  ctx.font = '14px sans-serif';
  ctx.fillText('🍅', x + 15, y + 25 + Math.sin(time * 1.5) * 2);
  ctx.fillText('🥚', x + 35, y + 28 - Math.sin(time * 1.8) * 2);
  ctx.fillText('🐟', x + w - 45, y + 25 + Math.sin(time * 1.3) * 2);
}

// 🗺️ 地图墙
export function drawMapWall(ctx, x, y, time) {
  const w = 200, h = 160;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 3, y + 3, w, h);
  // 底板 (软木板)
  ctx.fillStyle = '#D7CCC8';
  ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: KRAFT, width: 2, jitter: 0.8 });
  // 迷你地图底
  const mx = x + 20, my = y + 15, mw = w - 40, mh = h - 30;
  ctx.fillStyle = 'rgba(250,245,232,0.8)';
  ctx.fillRect(mx, my, mw, mh);
  sketchRect(ctx, mx, my, mw, mh, { color: 'rgba(44,44,58,0.15)', width: 1, jitter: 0.4 });
  // 区域标记点
  const zones = [
    [0.5, 0.55, '#077B8A'],  // notebook center
    [0.37, 0.48, '#8B7355'], // board
    [0.6, 0.4, '#5B8C5A'],   // shelf
    [0.2, 0.55, '#D4A574'],   // maze
    [0.6, 0.22, TEAL],       // puzzle
    [0.8, 0.3, REDLINE],     // klotski
    [0.88, 0.47, '#9C27B0'], // sudoku
    [0.13, 0.5, '#FFB300'],  // wish
    [0.45, 0.53, '#9C27B0'], // magic
    [0.8, 0.7, '#2196F3'],   // constellation
    [0.2, 0.8, '#FF9800'],   // hourglass
    [0.45, 0.87, '#4CAF50'], // kaleidoscope
  ];
  for (const [px, py, color] of zones) {
    const blink = 0.4 + Math.sin(time * 2 + px * 10) * 0.2;
    ctx.fillStyle = color;
    ctx.globalAlpha = blink;
    ctx.beginPath(); ctx.arc(mx + px * mw, my + py * mh, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // You are here 标记
  const playerMarkerX = mx + 0.5 * mw, playerMarkerY = my + 0.85 * mh;
  ctx.fillStyle = REDLINE;
  ctx.beginPath();
  ctx.moveTo(playerMarkerX, playerMarkerY - 8);
  ctx.lineTo(playerMarkerX - 4, playerMarkerY);
  ctx.lineTo(playerMarkerX + 4, playerMarkerY);
  ctx.fill();
  ctx.beginPath(); ctx.arc(playerMarkerX, playerMarkerY - 9, 3.5, 0, Math.PI * 2); ctx.fill();
}

// ==================== AI助手台 ====================

export function drawAIDesk(ctx, x, y, time) {
  const w = 200, h = 160;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 4, y + 4, w, h);
  // 小木桌
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: KRAFT, width: 2, jitter: 0.6 });
  // 屏幕框 — 显示器
  const sx = x + 35, sy = y + 20, sw = 130, sh = 85;
  ctx.fillStyle = '#263238';
  ctx.fillRect(sx, sy, sw, sh);
  sketchRect(ctx, sx, sy, sw, sh, { color: GRAPHITE, width: 1.5, jitter: 0.4 });
  // 屏幕发光
  const glow = 0.3 + Math.sin(time * 1.5) * 0.1;
  ctx.fillStyle = `rgba(7,123,138,${glow})`;
  ctx.fillRect(sx + 3, sy + 3, sw - 6, sh - 6);
  // AI 眼睛动画
  const eyeY = sy + sh / 2;
  const blink = Math.sin(time * 3) > 0.95 ? 1 : 6;
  ctx.fillStyle = '#4DD0E1';
  ctx.beginPath(); ctx.ellipse(sx + sw * 0.35, eyeY, 5, blink, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sx + sw * 0.65, eyeY, 5, blink, 0, 0, Math.PI * 2); ctx.fill();
  // 屏幕底座
  ctx.fillStyle = '#455A64';
  ctx.fillRect(sx + sw / 2 - 15, sy + sh, 30, 8);
  ctx.fillRect(sx + sw / 2 - 25, sy + sh + 8, 50, 4);
  // 键盘
  ctx.fillStyle = '#37474F';
  ctx.fillRect(x + 45, y + 120, 110, 18);
  sketchRect(ctx, x + 45, y + 120, 110, 18, { color: 'rgba(44,44,58,0.12)', width: 1, jitter: 0.3 });
  // 键盘按键行
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = `rgba(96,125,139,${0.4 + Math.sin(time * 2 + r * c) * 0.1})`;
      ctx.fillRect(x + 50 + c * 13, y + 123 + r * 7, 10, 5);
    }
  }
  // 小机器人标签
  ctx.font = 'bold 14px Caveat, cursive';
  ctx.fillStyle = 'rgba(7,123,138,0.6)';
  ctx.textAlign = 'center';
  ctx.fillText('🤖 AI助手', x + w / 2, y + h - 4);
  ctx.textAlign = 'start';
}

// ==================== 搜索台 ====================

export function drawSearchDesk(ctx, x, y, time) {
  const w = 200, h = 160;
  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.05)';
  ctx.fillRect(x + 4, y + 4, w, h);
  // 小木桌
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(x, y, w, h);
  sketchRect(ctx, x, y, w, h, { color: KRAFT, width: 2, jitter: 0.6 });

  // 放大镜 — 圆 + 手柄
  const cx = x + w / 2, cy = y + 60;
  const lensR = 28;
  // 镜片（发光）
  const glow = 0.15 + Math.sin(time * 2) * 0.08;
  ctx.fillStyle = `rgba(7,123,138,${glow})`;
  ctx.beginPath(); ctx.arc(cx, cy, lensR, 0, Math.PI * 2); ctx.fill();
  // 镜框
  sketchCircle(ctx, cx, cy, lensR, { color: KRAFT, width: 2.5, jitter: 0.8 });
  // 镜片高光
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.arc(cx - 8, cy - 8, 8, 0, Math.PI * 2); ctx.fill();
  // 手柄
  const hx = cx + lensR * 0.7, hy = cy + lensR * 0.7;
  ctx.strokeStyle = KRAFT;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + 20, hy + 20);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // 搜索光圈脉冲
  const pulseR = lensR + 6 + Math.sin(time * 3) * 4;
  ctx.strokeStyle = `rgba(7,123,138,${0.12 + Math.sin(time * 3) * 0.06})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.arc(cx, cy, pulseR, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // 几个浮动小点 — 搜索结果
  const dots = [
    { ox: -50, oy: -15, phase: 0 },
    { ox: 55, oy: -10, phase: 1.5 },
    { ox: -45, oy: 30, phase: 3 },
  ];
  for (const d of dots) {
    const dy = Math.sin(time * 1.5 + d.phase) * 3;
    ctx.fillStyle = `rgba(7,123,138,${0.3 + Math.sin(time * 2 + d.phase) * 0.15})`;
    ctx.beginPath();
    ctx.arc(cx + d.ox, cy + d.oy + dy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 标签
  ctx.font = 'bold 14px Caveat, cursive';
  ctx.fillStyle = 'rgba(7,123,138,0.6)';
  ctx.textAlign = 'center';
  ctx.fillText('🔍 搜索台', x + w / 2, y + h - 4);
  ctx.textAlign = 'start';
}

// ==================== 铅笔刀（节奏游戏） ====================

export function drawSharpener(ctx, x, y, time) {
  const w = 140, h = 130;
  const cx = x + w / 2, cy = y + h / 2;

  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  sketchRect(ctx, x + 4, y + 4, w, h, { fill: 'rgba(44,44,58,0.06)', sketch: 0.6 });

  // 底座
  ctx.fillStyle = '#7B6B5A';
  ctx.fillRect(x + 15, y + h - 30, w - 30, 28);
  sketchRect(ctx, x + 15, y + h - 30, w - 30, 28, { stroke: KRAFT, width: 1.2, sketch: 0.5 });

  // 刀身主体
  ctx.fillStyle = '#A0928A';
  ctx.fillRect(x + 25, y + 30, w - 50, h - 55);
  sketchRect(ctx, x + 25, y + 30, w - 50, h - 55, { stroke: KRAFT, width: 1.5, sketch: 0.6 });

  // 插笔孔
  ctx.fillStyle = '#3E2723';
  ctx.beginPath(); ctx.arc(cx, y + 42, 10, 0, Math.PI * 2); ctx.fill();
  sketchCircle(ctx, cx, y + 42, 10, { color: KRAFT, width: 1, jitter: 0.6 });

  // 手摇把手（旋转动画）
  const angle = time * 2;
  const hx = cx + 22, hy = y + h - 48;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.strokeStyle = '#6B5B4F';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, 0); ctx.stroke();
  ctx.beginPath(); ctx.arc(16, 0, 4, 0, Math.PI * 2); ctx.fillStyle = '#5B4A3E'; ctx.fill();
  ctx.restore();
  // 把手轴心
  ctx.fillStyle = '#6B5B4F';
  ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();

  // 木屑
  ctx.fillStyle = 'rgba(212,196,168,0.6)';
  const sx1 = cx - 8 + Math.sin(time * 1.5) * 2;
  const sy1 = y + 55 + Math.sin(time * 2) * 1;
  ctx.beginPath(); ctx.ellipse(sx1, sy1, 3, 1.5, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sx1 + 12, sy1 + 5, 2.5, 1.2, -0.2, 0, Math.PI * 2); ctx.fill();
}

// ==================== 墨水台（配色游戏） ====================

export function drawInkwell(ctx, x, y, time) {
  const w = 160, h = 140;
  const cx = x + w / 2, cy = y + h / 2;

  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // 桌面
  ctx.fillStyle = BIRCH;
  ctx.fillRect(x + 10, y + h - 25, w - 20, 20);
  sketchRect(ctx, x + 10, y + h - 25, w - 20, 20, { stroke: KRAFT, width: 1, sketch: 0.4 });

  // 墨水瓶
  const bottleX = cx - 25, bottleY = y + 30, bottleW = 50, bottleH = 60;
  ctx.fillStyle = '#4A3728';
  ctx.fillRect(bottleX, bottleY, bottleW, bottleH);
  sketchRect(ctx, bottleX, bottleY, bottleW, bottleH, { stroke: '#3E2723', width: 1.5, sketch: 0.6 });
  // 瓶口
  ctx.fillStyle = '#5C4033';
  ctx.fillRect(cx - 12, bottleY - 10, 24, 12);
  sketchRect(ctx, cx - 12, bottleY - 10, 24, 12, { stroke: '#3E2723', width: 1, sketch: 0.4 });

  // 墨水液面
  ctx.fillStyle = '#1A237E';
  ctx.beginPath();
  ctx.moveTo(bottleX + 5, bottleY + 20);
  for (let i = 0; i <= bottleW - 10; i++) {
    ctx.lineTo(bottleX + 5 + i, bottleY + 20 + Math.sin(time * 3 + i * 0.15) * 1.5);
  }
  ctx.lineTo(bottleX + bottleW - 5, bottleY + bottleH - 5);
  ctx.lineTo(bottleX + 5, bottleY + bottleH - 5);
  ctx.closePath();
  ctx.fill();

  // 三个混色圆（红、蓝、黄）
  const colors = ['#EA5455', '#1565C0', '#F9A825'];
  const offsets = [-30, 0, 30];
  offsets.forEach((off, i) => {
    const bx = cx + off, by = y + h - 40;
    ctx.fillStyle = colors[i];
    ctx.globalAlpha = 0.7 + 0.15 * Math.sin(time * 2 + i);
    ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    sketchCircle(ctx, bx, by, 10, { color: KRAFT, width: 1, jitter: 0.5 });
  });

  // 混色泡沫
  const fx = cx - 50, fy = y + h - 50;
  for (let i = 0; i < 5; i++) {
    const bx = fx + i * 22 + Math.sin(time * 1.5 + i) * 3;
    const by = fy + Math.cos(time * 2 + i * 0.8) * 4;
    ctx.fillStyle = `rgba(${100 + i * 30}, ${80 + i * 20}, ${180 - i * 20}, 0.4)`;
    ctx.beginPath(); ctx.arc(bx, by, 4 + Math.sin(time + i) * 1, 0, Math.PI * 2); ctx.fill();
  }
}

// ==================== 折纸桌（Simon Says） ====================

export function drawOrigamiTable(ctx, x, y, time) {
  const w = 180, h = 150;
  const cx = x + w / 2, cy = y + h / 2;

  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // 桌面
  ctx.fillStyle = CREAM;
  ctx.fillRect(x + 10, y + h - 30, w - 20, 25);
  sketchRect(ctx, x + 10, y + h - 30, w - 20, 25, { stroke: KRAFT, width: 1.2, sketch: 0.5 });

  // 纸鹤（中央动画）
  const craneX = cx, craneY = cy + 5;
  const bob = Math.sin(time * 1.5) * 4;
  const tilt = Math.sin(time * 0.8) * 0.08;

  ctx.save();
  ctx.translate(craneX, craneY + bob);
  ctx.rotate(tilt);

  // 纸鹤身体
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = KRAFT;
  ctx.lineWidth = 1.2;
  // 左翅
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-35, -20);
  ctx.lineTo(-15, 5);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 右翅
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(35, -20);
  ctx.lineTo(15, 5);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 身体
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-8, 15);
  ctx.lineTo(0, 25);
  ctx.lineTo(8, 15);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 头
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(3, -22);
  ctx.lineTo(0, -18);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.restore();

  // 几张散落的折纸
  ctx.fillStyle = 'rgba(7,123,138,0.15)';
  ctx.save(); ctx.translate(cx - 55, cy + 20); ctx.rotate(-0.3);
  ctx.fillRect(0, 0, 20, 20);
  ctx.restore();
  ctx.fillStyle = 'rgba(234,84,85,0.12)';
  ctx.save(); ctx.translate(cx + 45, cy + 15); ctx.rotate(0.4);
  ctx.fillRect(0, 0, 18, 18);
  ctx.restore();
}

// ==================== 贴纸收集册 ====================

export function drawStickerAlbum(ctx, x, y, time) {
  const w = 180, h = 160;
  const cx = x + w / 2, cy = y + h / 2;

  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // 册子封面
  ctx.fillStyle = '#D4A574';
  ctx.fillRect(x + 15, y + 15, w - 30, h - 25);
  sketchRect(ctx, x + 15, y + 15, w - 30, h - 25, { stroke: KRAFT, width: 1.5, sketch: 0.7 });

  // 书脊
  ctx.fillStyle = '#C4956A';
  ctx.fillRect(x + 15, y + 15, 12, h - 25);

  // 几张贴纸图标
  const stickers = ['⭐', '🌸', '🐱', '🌈'];
  const sPos = [[cx + 20, cy - 15], [cx - 20, cy - 10], [cx - 5, cy + 18], [cx + 30, cy + 20]];
  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  stickers.forEach((s, i) => {
    const [sx, sy] = sPos[i];
    ctx.globalAlpha = 0.7 + 0.15 * Math.sin(time * 2 + i);
    ctx.fillText(s, sx, sy);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';

  // 闪光星星
  const sparkleX = cx + 40 + Math.sin(time * 3) * 8;
  const sparkleY = cy - 30 + Math.cos(time * 2.5) * 4;
  ctx.fillStyle = `rgba(241,196,15,${0.3 + 0.2 * Math.sin(time * 4)})`;
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨', sparkleX, sparkleY);
  ctx.textAlign = 'start';
}

// ==================== 算盘 ====================

export function drawAbacus(ctx, x, y, time) {
  const w = 200, h = 150;
  const cx = x + w / 2, cy = y + h / 2;

  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // 算盘外框
  ctx.fillStyle = '#A08060';
  ctx.fillRect(x + 10, y + 20, w - 20, h - 30);
  sketchRect(ctx, x + 10, y + 20, w - 20, h - 30, { stroke: KRAFT, width: 2, sketch: 0.6 });

  // 横梁
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(x + 14, y + 55, w - 28, 4);

  // 竖杆（5根）
  const rods = 5;
  const rodGap = (w - 40) / rods;
  for (let r = 0; r < rods; r++) {
    const rx = x + 25 + r * rodGap;
    ctx.strokeStyle = '#6B5B4F';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(rx, y + 24); ctx.lineTo(rx, y + h - 14); ctx.stroke();

    // 上珠（每杆2颗）
    const upperBeadOffset = Math.sin(time * 1.8 + r * 0.5) * 1.5;
    for (let b = 0; b < 2; b++) {
      const by = y + 30 + b * 14 + upperBeadOffset;
      ctx.fillStyle = '#EA5455';
      ctx.beginPath();
      ctx.ellipse(rx, by, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      sketchCircle(ctx, rx, by, 6, { color: '#C0392B', width: 0.8, jitter: 0.3 });
    }

    // 下珠（每杆5颗）
    const lowerBeadOffset = Math.sin(time * 1.2 + r * 0.3) * 1;
    for (let b = 0; b < 5; b++) {
      const by = y + 68 + b * 14 + lowerBeadOffset;
      ctx.fillStyle = '#077B8A';
      ctx.beginPath();
      ctx.ellipse(rx, by, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      sketchCircle(ctx, rx, by, 6, { color: '#066A78', width: 0.8, jitter: 0.3 });
    }
  }
}

// ==================== 时光胶囊 ====================

export function drawTimeCapsule(ctx, x, y, time) {
  const w = 160, h = 160;
  const cx = x + w / 2, cy = y + h / 2;

  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // 玻璃瓶身
  ctx.fillStyle = 'rgba(200, 220, 240, 0.25)';
  ctx.strokeStyle = KRAFT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 22, y + 35);
  ctx.lineTo(cx - 22, y + h - 25);
  ctx.quadraticCurveTo(cx - 22, y + h - 10, cx, y + h - 10);
  ctx.quadraticCurveTo(cx + 22, y + h - 10, cx + 22, y + h - 25);
  ctx.lineTo(cx + 22, y + 35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 瓶口
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(cx - 10, y + 20, 20, 18);
  sketchRect(ctx, cx - 10, y + 20, 20, 18, { stroke: '#6B5B4F', width: 1, sketch: 0.4 });

  // 软木塞
  ctx.fillStyle = '#C4956A';
  ctx.fillRect(cx - 9, y + 14, 18, 10);
  sketchRect(ctx, cx - 9, y + 14, 18, 10, { stroke: '#A07A50', width: 0.8, sketch: 0.3 });

  // 瓶内信纸卷
  ctx.fillStyle = PAPER;
  ctx.fillRect(cx - 12, y + 40, 20, 25);
  sketchRect(ctx, cx - 12, y + 40, 20, 25, { stroke: BIRCH, width: 0.8, sketch: 0.3 });
  // 字迹线条
  ctx.strokeStyle = 'rgba(44,44,58,0.15)';
  ctx.lineWidth = 0.6;
  for (let l = 0; l < 4; l++) {
    ctx.beginPath();
    ctx.moveTo(cx - 8, y + 46 + l * 5);
    ctx.lineTo(cx + 4, y + 46 + l * 5);
    ctx.stroke();
  }

  // 闪光星星
  const stars = [[cx - 35, cy - 15], [cx + 30, cy - 20], [cx + 5, cy + 30]];
  stars.forEach(([sx, sy], i) => {
    const alpha = 0.2 + 0.25 * Math.sin(time * 3 + i * 1.2);
    ctx.fillStyle = `rgba(241,196,15,${alpha})`;
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', sx + Math.sin(time + i) * 3, sy + Math.cos(time * 1.5 + i) * 2);
  });
  ctx.textAlign = 'start';
}

// ==================== 手工坊 ====================

export function drawDIYWorkshop(ctx, x, y, time) {
  const w = 200, h = 170;
  const cx = x + w / 2, cy = y + h / 2;

  // 阴影
  ctx.fillStyle = 'rgba(44,44,58,0.06)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // 工作台
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(x + 20, y + h - 45, w - 40, 30);
  sketchRect(ctx, x + 20, y + h - 45, w - 40, 30, { stroke: KRAFT, width: 1.5, sketch: 0.5 });

  // 台面工具架
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(x + 30, y + h - 70, 10, 25);
  ctx.fillRect(x + w - 40, y + h - 70, 10, 25);

  // 颜料瓶
  const bottleColors = ['#EA5455', '#FF9800', '#4CAF50', '#2196F3'];
  for (let i = 0; i < 4; i++) {
    const bx = x + 45 + i * 28;
    const by = y + h - 72 - Math.sin(time * 2 + i) * 1.5;
    ctx.fillStyle = bottleColors[i];
    ctx.beginPath(); ctx.roundRect(bx, by, 14, 22, 3); ctx.fill();
    ctx.fillStyle = '#FFF8E1';
    ctx.beginPath(); ctx.roundRect(bx + 2, by + 2, 10, 4, 1); ctx.fill();
    sketchRect(ctx, bx, by, 14, 22, { stroke: GRAPHITE, width: 0.8, jitter: 0.3 });
  }

  // 画笔筒
  ctx.fillStyle = '#6D4C41';
  ctx.beginPath(); ctx.roundRect(cx - 15, y + h - 75, 30, 28, 4); ctx.fill();
  sketchRect(ctx, cx - 15, y + h - 75, 30, 28, { stroke: '#4E342E', width: 1, sketch: 0.4 });
  // 画笔
  for (let i = 0; i < 3; i++) {
    const bx = cx - 8 + i * 8;
    const tilt = (i - 1) * 0.15;
    ctx.save(); ctx.translate(bx, y + h - 75); ctx.rotate(tilt);
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20 - i * 3); ctx.stroke();
    ctx.fillStyle = '#EFEBE9'; ctx.beginPath(); ctx.arc(0, -20 - i * 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // 顶部横幅
  ctx.fillStyle = '#FFECB3';
  ctx.fillRect(x + 25, y + 8, w - 50, 20);
  sketchRect(ctx, x + 25, y + 8, w - 50, 20, { stroke: KRAFT, width: 1, sketch: 0.4 });
  ctx.font = 'bold 13px Caveat, cursive';
  ctx.fillStyle = '#5D4037';
  ctx.textAlign = 'center';
  ctx.fillText('🎨 手工坊', cx, y + 23);
  ctx.textAlign = 'start';

  // 小闪光
  const sparkleAlpha = 0.2 + 0.15 * Math.sin(time * 3);
  ctx.fillStyle = `rgba(241,196,15,${sparkleAlpha})`;
  ctx.font = '10px serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦', cx - 50, y + 18 + Math.sin(time * 1.5) * 3);
  ctx.fillText('✦', cx + 50, y + 18 + Math.cos(time * 1.2) * 3);
  ctx.textAlign = 'start';
}

// ==================== 夜间灯光叠加层 ====================

/** 夜间路灯 additive glow（需在环境色膜之后调用） */
export function drawNightLampGlow(ctx, lampPositions, time) {
  const prevOp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (const { x, y } of lampPositions) {
    const pulse = 0.12 + Math.sin(time * 2.5) * 0.04;
    const grad = ctx.createRadialGradient(x - 16, y - 24, 5, x - 16, y - 24, 70);
    grad.addColorStop(0, `rgba(255,245,180,${pulse})`);
    grad.addColorStop(0.5, `rgba(255,230,140,${pulse * 0.4})`);
    grad.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x - 16, y - 24, 70, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = prevOp;
}

// ==================== 区域标签 ====================

export function drawZoneLabel(ctx, x, y, label) {
  ctx.font = 'bold 13px Caveat, cursive';
  ctx.fillStyle = 'rgba(44,44,58,0.28)';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'start';
}

// ==================== 工具函数 ====================

function seededRandom(seed) {
  let s = typeof seed === 'number' ? seed : hashStr(seed);
  return function() { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}
function hashStr(str) { let h = 0; for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0; return Math.abs(h) || 1; }
