// spinOverlay.js — 🎰 幸运转盘
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('spin-overlay', 'spin-close');
  document.getElementById('spin-overlay').classList.add('visible');
  renderUI();
}

export function hide() {
  document.getElementById('spin-overlay')?.classList.remove('visible');
}

function renderUI() {
  const { gameWorld, showNotification, progress } = getCtx();
  const spin = gameWorld.getZoneByType('spin');
  if (!spin) return;

  const resultEl = document.getElementById('spin-result');
  const countEl = document.getElementById('spin-count');

  if (resultEl) resultEl.textContent = spin.lastResult ? spin.lastResult.text : '—';
  if (resultEl && spin.lastResult) resultEl.style.color = spin.lastResult.color;
  if (countEl) countEl.textContent = spin.spinCount;

  const spinBtn = document.getElementById('spin-btn');
  const wheelEl = document.getElementById('spin-wheel-display');

  if (spinBtn) {
    spinBtn.onclick = () => {
      if (spinBtn.disabled) return;
      if (!progress.spendCoins(3)) { showNotification('🪙 墨水币不足！转盘需要 3 枚'); return; }
      spinBtn.disabled = true;
      const result = spin.spin();
      if (wheelEl) {
        const targetAngle = 360 * 5 + result.index * 45 + Math.random() * 30;
        wheelEl.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        wheelEl.style.transform = 'rotate(' + targetAngle + 'deg)';
      }
      setTimeout(() => {
        showNotification('🎰 ' + result.prize.text);
        renderUI();
        spinBtn.disabled = false;
      }, 3200);
    };
  }
}
