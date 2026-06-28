// mazeOverlay.js — 🌿 迷宫花园
import { getCtx } from '../overlays/OverlayContext.js';
import { haptic } from '../utils/haptic.js';

let mazeAnimFrame = null;

export function show() {
  const { bindOverlayClose, gameWorld, showNotification, progress } = getCtx();
  bindOverlayClose('maze-overlay', 'maze-close');
  document.getElementById('maze-overlay').classList.add('visible');
  const maze = gameWorld.getZoneByType('maze');
  if (!maze.solved && maze.grid.length === 0) maze.generate();
  renderMazeUI();

  const onKey = (e) => {
    if (!isCurrentMode()) return;
    const mz = gameWorld.getZoneByType('maze');
    if (!mz || mz.solved) return;
    let dr = 0, dc = 0;
    if (e.key === 'ArrowUp' || e.key === 'w') { dr = -1; }
    else if (e.key === 'ArrowDown' || e.key === 's') { dr = 1; }
    else if (e.key === 'ArrowLeft' || e.key === 'a') { dc = -1; }
    else if (e.key === 'ArrowRight' || e.key === 'd') { dc = 1; }
    else return;
    e.preventDefault();
    const result = mz.move(dr, dc);
    if (result === 'win') { showNotification('🌿 迷宫通关！太厉害了！'); progress.markZoneComplete('maze'); progress.earnCoins(10, 'maze'); }
    renderMazeUI();
  };
  document.addEventListener('keydown', onKey);
  window._mazeCleanup = () => {
    document.removeEventListener('keydown', onKey);
    cleanupDpad();
  };

  // 虚拟方向键（触屏设备）
  bindDpad(gameWorld, showNotification, progress);
}

export function hide() {
  document.getElementById('maze-overlay')?.classList.remove('visible');
}

function isCurrentMode() {
  const overlay = document.getElementById('maze-overlay');
  return overlay && overlay.classList.contains('visible');
}

/* ── 虚拟方向键绑定 ────────────── */
let _dpadBound = false;

function bindDpad(gameWorld, showNotification, progress) {
  const dpad = document.getElementById('maze-dpad');
  if (!dpad) return;
  // 仅触屏设备需要绑定
  if (!('ontouchstart' in window)) return;
  if (_dpadBound) return;
  _dpadBound = true;

  const dirMap = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  const btns = dpad.querySelectorAll('.dpad-btn');
  btns.forEach(btn => {
    const dir = btn.dataset.dir;
    const handler = (e) => {
      e.preventDefault();
      if (!isCurrentMode()) return;
      const mz = gameWorld.getZoneByType('maze');
      if (!mz || mz.solved) return;
      haptic('light');
      const [dr, dc] = dirMap[dir] || [0, 0];
      if (dr === 0 && dc === 0) return;
      const result = mz.move(dr, dc);
      if (result === 'win') { showNotification('🌿 迷宫通关！太厉害了！'); progress.markZoneComplete('maze'); progress.earnCoins(10, 'maze'); }
      renderMazeUI();
    };
    btn.addEventListener('touchstart', handler, { passive: false });
    // fallback: click for non-touch coarse pointers
    btn.addEventListener('click', handler);
  });
}

function cleanupDpad() {
  // 事件绑定在按钮上，overlay 隐藏后按钮不在 DOM 流中，无需移除
  _dpadBound = false;
}

function renderMazeUI() {
  const { gameWorld } = getCtx();
  const maze = gameWorld.getZoneByType('maze');
  if (!maze) return;
  const canvasEl = document.getElementById('maze-canvas');
  const stepsEl = document.getElementById('maze-steps');
  const timeEl = document.getElementById('maze-time');
  const statusEl = document.getElementById('maze-status');

  if (stepsEl) stepsEl.textContent = maze.steps;
  if (timeEl) {
    const sec = maze.startTime ? Math.floor((Date.now() - maze.startTime) / 1000) : 0;
    timeEl.textContent = sec + '秒';
  }
  const isMobile = 'ontouchstart' in window;
  if (statusEl) statusEl.textContent = maze.solved ? '🎉 通关！' : (isMobile ? '点击下方方向走迷宫' : '用方向键/WASD走迷宫');

  if (!canvasEl) return;
  const mctx = canvasEl.getContext('2d');
  const R = maze.size * 2 + 1;
  const cs = Math.floor(Math.min(canvasEl.width, canvasEl.height) / R);
  const ox = (canvasEl.width - cs * R) / 2;
  const oy = (canvasEl.height - cs * R) / 2;

  mctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < R; c++) {
      const x = ox + c * cs, y = oy + r * cs;
      if (maze.grid[r] && maze.grid[r][c] === 1) {
        mctx.fillStyle = '#2E7D32'; mctx.fillRect(x, y, cs, cs);
      } else if (maze.grid[r] && maze.grid[r][c] === 2) {
        mctx.fillStyle = '#EA5455'; mctx.fillRect(x, y, cs, cs);
      } else {
        mctx.fillStyle = '#E8F5E9'; mctx.fillRect(x, y, cs, cs);
      }
    }
  }
  const px = ox + maze.playerPos.c * cs + cs / 2;
  const py = oy + maze.playerPos.r * cs + cs / 2;
  mctx.fillStyle = '#077B8A';
  mctx.beginPath(); mctx.arc(px, py, cs / 2 - 2, 0, Math.PI * 2); mctx.fill();

  const resetBtn = document.getElementById('maze-reset');
  if (resetBtn) resetBtn.onclick = () => { maze.reset(); renderMazeUI(); };
}
