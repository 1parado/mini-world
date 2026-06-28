// magicOverlay.js — 🔮 魔法阵
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('magic-overlay', 'magic-close');
  document.getElementById('magic-overlay').classList.add('visible');
  renderMagicUI();
}

export function hide() {
  document.getElementById('magic-overlay')?.classList.remove('visible');
}

function renderMagicUI() {
  const { gameWorld, showNotification, progress } = getCtx();
  const magic = gameWorld.getZoneByType('magic');
  if (!magic) return;

  const stepEl = document.getElementById('magic-step');
  const prophecyEl = document.getElementById('magic-prophecy');
  if (stepEl) stepEl.textContent = magic.currentStep + '/6';
  if (prophecyEl) prophecyEl.textContent = magic.completed ? '🔮 ' + magic.prophecy : '';

  const runeContainer = document.getElementById('magic-runes');
  if (runeContainer) {
    runeContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const btn = document.createElement('button');
      btn.className = 'magic-rune';
      if (magic.activated.includes(i)) btn.classList.add('activated');
      btn.textContent = magic.runeSymbols[i] + '\n' + magic.runeNames[i];
      btn.onclick = () => {
        const result = magic.activate(i);
        if (result === 'wrong') showNotification('❌ 顺序错误！符文已重置');
        else if (result === 'complete') { showNotification('🔮 魔法阵激活！' + magic.prophecy); progress.markZoneComplete('magic'); progress.earnCoins(10, 'magic'); }
        renderMagicUI();
      };
      runeContainer.appendChild(btn);
    }
  }

  const resetBtn = document.getElementById('magic-reset');
  if (resetBtn) resetBtn.onclick = () => { magic.reset(); renderMagicUI(); };
}
