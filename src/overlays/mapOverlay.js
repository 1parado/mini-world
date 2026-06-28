// mapOverlay.js — 🗺️ 地图墙
import { getCtx } from '../overlays/OverlayContext.js';

const ZONE_POSITIONS = [
  { type: 'notebook', x: 2000, y: 1620, label: '📓', color: '#077B8A' },
  { type: 'board', x: 1620, y: 1450, label: '📋', color: '#8B7355' },
  { type: 'shelf', x: 2420, y: 1300, label: '📚', color: '#5B8C5A' },
  { type: 'coffee', x: 1550, y: 1850, label: '☕', color: '#D4A574' },
  { type: 'album', x: 2500, y: 1100, label: '📷', color: '#C75B39' },
  { type: 'mailbox', x: 2600, y: 1700, label: '📮', color: '#FF9800' },
  { type: 'graffiti', x: 1500, y: 1150, label: '✏️', color: '#9C27B0' },
  { type: 'dart', x: 900, y: 2500, label: '🎯', color: '#EA5455' },
  { type: 'dice', x: 3200, y: 1100, label: '🎲', color: '#546E7A' },
  { type: 'card', x: 2000, y: 550, label: '🃏', color: '#3F51B5' },
  { type: 'spin', x: 3400, y: 2300, label: '🎰', color: '#E91E63' },
  { type: 'music', x: 550, y: 800, label: '🎵', color: '#FF5722' },
  { type: 'maze', x: 800, y: 600, label: '🌿', color: '#2E7D32' },
  { type: 'puzzle', x: 2000, y: 500, label: '🧩', color: '#EF6C00' },
  { type: 'klotski', x: 3200, y: 600, label: '🏯', color: '#EA5455' },
  { type: 'sudoku', x: 3500, y: 1400, label: '🔢', color: '#9C27B0' },
  { type: 'wish', x: 500, y: 1500, label: '🪙', color: '#FFB300' },
  { type: 'magic', x: 1800, y: 1600, label: '🔮', color: '#7B1FA2' },
  { type: 'constellation', x: 3200, y: 2100, label: '⭐', color: '#2196F3' },
  { type: 'hourglass', x: 800, y: 2400, label: '⏳', color: '#FF9800' },
  { type: 'kaleidoscope', x: 1800, y: 2600, label: '🔆', color: '#4CAF50' },
  { type: 'diary', x: 600, y: 2000, label: '📔', color: '#795548' },
  { type: 'weather', x: 2800, y: 1600, label: '🌤️', color: '#03A9F4' },
  { type: 'cooking', x: 3000, y: 2500, label: '🍳', color: '#E64A19' },
  { type: 'chat', x: 2600, y: 400, label: '🤖', color: '#077B8A' },
  { type: 'search', x: 1400, y: 1000, label: '🔍', color: '#00897B' },
];

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('map-overlay', 'map-close');
  document.getElementById('map-overlay').classList.add('visible');
  renderMapUI();
}

export function hide() {
  document.getElementById('map-overlay')?.classList.remove('visible');
}

function renderMapUI() {
  const { gameWorld, WORLD_W, WORLD_H } = getCtx();
  const canvasEl = document.getElementById('map-canvas');
  if (!canvasEl) return;
  const mctx = canvasEl.getContext('2d');
  const w = canvasEl.width, h = canvasEl.height;
  const sx = w / WORLD_W, sy = h / WORLD_H;

  mctx.clearRect(0, 0, w, h);
  mctx.fillStyle = '#FAF5E8';
  mctx.fillRect(0, 0, w, h);
  mctx.strokeStyle = 'rgba(44,44,58,0.05)'; mctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += w / 10) { mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, h); mctx.stroke(); }
  for (let y = 0; y < h; y += h / 8)  { mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(w, y); mctx.stroke(); }

  for (const z of ZONE_POSITIONS) {
    const zx = z.x * sx, zy = z.y * sy;
    mctx.fillStyle = z.color;
    mctx.globalAlpha = 0.7;
    mctx.beginPath(); mctx.arc(zx, zy, 5, 0, Math.PI * 2); mctx.fill();
    mctx.globalAlpha = 1;
    mctx.font = '10px sans-serif';
    mctx.fillText(z.label, zx - 5, zy - 7);
  }

  const px = gameWorld.player.x * sx;
  const py = gameWorld.player.y * sy;
  mctx.fillStyle = '#EA5455';
  mctx.beginPath(); mctx.arc(px, py, 4, 0, Math.PI * 2); mctx.fill();
  mctx.fillText('🧑', px - 6, py - 6);
}
