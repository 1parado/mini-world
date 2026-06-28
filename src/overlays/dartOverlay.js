// dartOverlay.js — 🎯 飞镖靶
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('dart-overlay', 'dart-close');
  document.getElementById('dart-overlay').classList.add('visible');
  renderUI();
}

export function hide() {
  document.getElementById('dart-overlay')?.classList.remove('visible');
}

function renderUI() {
  const { gameWorld, showNotification, progress } = getCtx();
  const dart = gameWorld.getZoneByType('dart');
  if (!dart) return;

  const scoreEl = document.getElementById('dart-score');
  const throwsEl = document.getElementById('dart-throws');
  const resultEl = document.getElementById('dart-result');
  const logEl = document.getElementById('dart-log');

  if (scoreEl) scoreEl.textContent = dart.score;
  if (throwsEl) throwsEl.textContent = dart.dartsThrown;
  if (resultEl) resultEl.textContent = dart.lastHit || '—';

  if (logEl) {
    logEl.innerHTML = '';
    dart.results.forEach(r => {
      const span = document.createElement('span');
      span.className = 'dart-log-item';
      const colors = { '红心': '#EA5455', '内环': '#5B2C6F', '中环': '#077B8A', '外环': '#8B6914', '脱靶': '#AAA' };
      span.style.color = colors[r.name] || '#2C2C3A';
      span.textContent = r.name + ' +' + r.points;
      logEl.appendChild(span);
    });
  }

  const throwBtn = document.getElementById('dart-throw');
  if (throwBtn) {
    throwBtn.onclick = () => {
      const hit = dart.throwDart();
      showNotification('🎯 ' + hit.name + '！+' + hit.points + '分');
      progress.reportHighScore('dart', dart.score);
      renderUI();
    };
  }

  const resetBtn = document.getElementById('dart-reset');
  if (resetBtn) {
    resetBtn.onclick = () => {
      dart.reset();
      renderUI();
    };
  }
}
