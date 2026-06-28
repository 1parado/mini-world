// hourglassOverlay.js — ⏳ 时光沙漏
import { getCtx } from '../overlays/OverlayContext.js';

let hourglassTimer = null;

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('hourglass-overlay', 'hourglass-close');
  document.getElementById('hourglass-overlay').classList.add('visible');
  renderHourglassUI();
}

export function hide() {
  document.getElementById('hourglass-overlay')?.classList.remove('visible');
  if (hourglassTimer) { clearInterval(hourglassTimer); hourglassTimer = null; }
}

/** 供 ESC 全局清理 */
export function clearTimer() {
  if (hourglassTimer) { clearInterval(hourglassTimer); hourglassTimer = null; }
}

function renderHourglassUI() {
  const { gameWorld } = getCtx();
  const hg = gameWorld.getZoneByType('hourglass');
  if (!hg) return;

  const sandEl = document.getElementById('hourglass-sand');
  const quoteEl = document.getElementById('hourglass-quote');
  const countEl = document.getElementById('hourglass-count');
  const flipBtn = document.getElementById('hourglass-flip');

  if (countEl) countEl.textContent = hg.flipCount;
  if (sandEl) {
    const pct = Math.round(hg.sandLevel * 100);
    sandEl.style.height = pct + '%';
  }
  if (quoteEl) quoteEl.textContent = hg.quote ? '📜 ' + hg.quote : '';

  if (flipBtn) {
    flipBtn.onclick = () => {
      hg.flip();
      renderHourglassUI();
      if (hourglassTimer) clearInterval(hourglassTimer);
      hourglassTimer = setInterval(() => {
        hg.updateSand();
        const sandEl2 = document.getElementById('hourglass-sand');
        const quoteEl2 = document.getElementById('hourglass-quote');
        if (sandEl2) sandEl2.style.height = Math.round(hg.sandLevel * 100) + '%';
        if (quoteEl2 && hg.quote && !quoteEl2.textContent) {
          quoteEl2.textContent = '📜 ' + hg.quote;
        }
        if (!hg.isFlipped) { clearInterval(hourglassTimer); hourglassTimer = null; }
      }, 200);
    };
  }
}
