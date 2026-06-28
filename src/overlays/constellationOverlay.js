// constellationOverlay.js — ⭐ 星座仪
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('constellation-overlay', 'constellation-close');
  document.getElementById('constellation-overlay').classList.add('visible');
  renderConstellationUI();
}

export function hide() {
  document.getElementById('constellation-overlay')?.classList.remove('visible');
}

function renderConstellationUI() {
  const { gameWorld, showNotification, progress } = getCtx();
  const cons = gameWorld.getZoneByType('constellation');
  if (!cons) return;

  const nameEl = document.getElementById('constellation-name');
  const storyEl = document.getElementById('constellation-story');
  const progressEl = document.getElementById('constellation-progress');

  if (nameEl) nameEl.textContent = '⭐ ' + cons.current.name;
  if (progressEl) progressEl.textContent = cons.userConnections.length + '/' + cons.current.connections.length;
  if (storyEl) {
    if (cons.completed.includes(cons.currentIdx)) {
      storyEl.textContent = cons.current.story;
      storyEl.style.display = 'block';
    } else {
      storyEl.style.display = 'none';
    }
  }

  const canvasEl = document.getElementById('constellation-canvas');
  if (!canvasEl) return;
  const cctx = canvasEl.getContext('2d');
  cctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  cctx.fillStyle = '#1A237E';
  cctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  for (let i = 0; i < 30; i++) {
    cctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.3})`;
    cctx.beginPath(); cctx.arc(Math.random() * canvasEl.width, Math.random() * canvasEl.height, 0.5 + Math.random(), 0, Math.PI * 2); cctx.fill();
  }

  cctx.strokeStyle = 'rgba(255,215,0,0.7)'; cctx.lineWidth = 2;
  for (const [a, b] of cons.userConnections) {
    cctx.beginPath();
    cctx.moveTo(cons.current.stars[a].x, cons.current.stars[a].y);
    cctx.lineTo(cons.current.stars[b].x, cons.current.stars[b].y);
    cctx.stroke();
  }

  cons.current.stars.forEach((star, idx) => {
    const isActive = cons.lastStar === idx;
    cctx.fillStyle = isActive ? '#FFD700' : '#FFFFFF';
    cctx.beginPath(); cctx.arc(star.x, star.y, isActive ? 6 : 4, 0, Math.PI * 2); cctx.fill();
  });

  const clickLayer = document.getElementById('constellation-click-layer');
  if (clickLayer) {
    clickLayer.innerHTML = '';
    cons.current.stars.forEach((star, idx) => {
      const btn = document.createElement('div');
      btn.className = 'star-click-target';
      btn.style.left = (star.x - 12) + 'px';
      btn.style.top = (star.y - 12) + 'px';
      btn.onclick = () => {
        const result = cons.clickStar(idx);
        if (result === 'wrong') showNotification('❌ 连线错误！重新开始');
        if (result === 'complete') { showNotification('⭐ 星座完成！' + cons.current.story); progress.markZoneComplete('constellation'); progress.earnCoins(10, 'constellation'); }
        renderConstellationUI();
      };
      clickLayer.appendChild(btn);
    });
  }

  const prevBtn = document.getElementById('constellation-prev');
  const nextBtn = document.getElementById('constellation-next');
  const resetBtn = document.getElementById('constellation-reset');
  if (prevBtn) prevBtn.onclick = () => { cons.prevConstellation(); renderConstellationUI(); };
  if (nextBtn) nextBtn.onclick = () => { cons.nextConstellation(); renderConstellationUI(); };
  if (resetBtn) resetBtn.onclick = () => { cons.resetCurrent(); renderConstellationUI(); };
}
