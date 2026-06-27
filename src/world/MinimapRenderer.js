// MinimapRenderer — 始终可见的右下角小地图
// 在独立的小 canvas 上渲染缩略版世界

import { WORLD_W, WORLD_H } from './WorldRenderer.js';

// 小地图尺寸
const MW = 180;
const MH = 135;
const SX = MW / WORLD_W;
const SY = MH / WORLD_H;

// 区域颜色映射
const ZONE_COLORS = {
  notebook:      '#077B8A',
  board:         '#8B7355',
  shelf:         '#5B8C5A',
  coffee:        '#D4A574',
  album:         '#C75B39',
  mailbox:       '#7B68AE',
  graffiti:      '#6A9BD1',
  dart:          '#EA5455',
  dice:          '#F0C040',
  card:          '#8FBC8F',
  spin:          '#FF8C69',
  music:         '#9B59B6',
  maze:          '#2E8B57',
  puzzle:        '#E67E22',
  klotski:       '#C0392B',
  sudoku:        '#2980B9',
  wish:          '#F1C40F',
  magic:         '#8E44AD',
  constellation: '#1ABC9C',
  hourglass:     '#D35400',
  kaleidoscope:  '#E74C3C',
  diary:         '#3498DB',
  weather:       '#5DADE2',
  cooking:       '#E59866',
  map:           '#45B39D',
  chat:          '#5B2C6F',
  search:        '#1F618D',
  sharpener:     '#A0928A',
  inkwell:       '#1565C0',
  origami:       '#F5EFE0',
  sticker:       '#D4A574',
  abacus:        '#EA5455',
  capsule:       '#F9A825',
};

let minimapVisible = true;

/** 初始化小地图（从 localStorage 恢复可见性） */
export function initMinimap() {
  try {
    const saved = localStorage.getItem('minimap-visible');
    minimapVisible = saved !== null ? saved === 'true' : true;
  } catch { /* ignore */ }
  const container = document.getElementById('minimap-container');
  if (container) {
    container.classList.toggle('hidden', !minimapVisible);
  }
}

/** 切换小地图可见性 */
export function toggleMinimap() {
  minimapVisible = !minimapVisible;
  const container = document.getElementById('minimap-container');
  if (container) container.classList.toggle('hidden', !minimapVisible);
  try { localStorage.setItem('minimap-visible', String(minimapVisible)); } catch { /* ignore */ }
  return minimapVisible;
}

/** 每帧渲染小地图 */
export function renderMinimap(gameWorld, time) {
  const container = document.getElementById('minimap-container');
  if (!minimapVisible || !container || container.classList.contains('hidden')) return;

  const canvas = document.getElementById('minimap-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // 清空
  ctx.clearRect(0, 0, MW, MH);

  // 背景：半透明纸色
  ctx.fillStyle = 'rgba(250, 245, 232, 0.85)';
  ctx.fillRect(0, 0, MW, MH);

  // 网格线
  ctx.strokeStyle = 'rgba(139, 115, 85, 0.12)';
  ctx.lineWidth = 0.5;
  for (let gx = 0; gx < MW; gx += MW / 8) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, MH);
    ctx.stroke();
  }
  for (let gy = 0; gy < MH; gy += MH / 6) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(MW, gy);
    ctx.stroke();
  }

  // 区域标记
  const zones = gameWorld.zones;
  for (const zone of zones) {
    const zx = zone.x * SX;
    const zy = zone.y * SY;
    const size = 4;
    ctx.fillStyle = ZONE_COLORS[zone.type] || '#8B7355';
    ctx.globalAlpha = zone.playerNear ? 1 : 0.7;
    ctx.fillRect(zx - size / 2, zy - size / 2, size, size);
  }
  ctx.globalAlpha = 1;

  // 视口矩形
  const vpX = gameWorld.cameraX * SX;
  const vpY = gameWorld.cameraY * SY;
  const vpW = gameWorld.viewportW * SX;
  const vpH = gameWorld.viewportH * SY;
  ctx.strokeStyle = 'rgba(44, 44, 58, 0.45)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);
  ctx.strokeRect(vpX, vpY, vpW, vpH);
  ctx.setLineDash([]);

  // 玩家位置 — 红色圆点 + 脉冲
  const px = gameWorld.player.x * SX;
  const py = gameWorld.player.y * SY;
  const pulse = 1 + 0.3 * Math.sin(time * 4);

  // 脉冲圈
  ctx.beginPath();
  ctx.arc(px, py, 4 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(234, 84, 85, 0.18)';
  ctx.fill();

  // 实心圆
  ctx.beginPath();
  ctx.arc(px, py, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#EA5455';
  ctx.fill();
}

/** 小地图点击 → 导航玩家到世界坐标 */
export function handleMinimapClick(e, gameWorld) {
  const canvas = document.getElementById('minimap-canvas');
  if (!canvas || !minimapVisible) return;

  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  // 小地图坐标 → 世界坐标
  const worldX = Math.max(20, Math.min(WORLD_W - 20, cx / SX));
  const worldY = Math.max(20, Math.min(WORLD_H - 20, cy / SY));

  gameWorld.player.navigateTo(worldX, worldY);
}
