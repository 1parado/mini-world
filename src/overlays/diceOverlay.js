// diceOverlay.js — 🎲 骰子桌
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('dice-overlay', 'dice-close');
  document.getElementById('dice-overlay').classList.add('visible');
  renderUI();
}

export function hide() {
  document.getElementById('dice-overlay')?.classList.remove('visible');
}

function renderUI() {
  const { gameWorld, showNotification, progress } = getCtx();
  const dice = gameWorld.getZoneByType('dice');
  if (!dice) return;

  const die1El = document.getElementById('dice-spinner');
  const die2El = document.getElementById('dice-spinner2');
  const totalEl = document.getElementById('dice-total');
  const bestEl = document.getElementById('dice-best');
  const countEl = document.getElementById('dice-count');

  if (die1El) die1El.textContent = dice.die1;
  if (die2El) die2El.textContent = dice.die2;
  if (totalEl) totalEl.textContent = dice.die1 + dice.die2;
  if (bestEl) bestEl.textContent = dice.bestScore;
  if (countEl) countEl.textContent = dice.rollCount;

  const rollBtn = document.getElementById('dice-roll');
  if (rollBtn) {
    rollBtn.onclick = () => {
      if (dice.rolling) return;
      dice.rolling = true;
      const result = dice.roll();
      showNotification('🎲 ' + result.die1 + ' + ' + result.die2 + ' = ' + result.total);
      progress.reportHighScore('dice', dice.bestScore);
      const spinner1 = document.getElementById('dice-spinner');
      const spinner2 = document.getElementById('dice-spinner2');
      if (spinner1) spinner1.classList.add('spinning');
      if (spinner2) spinner2.classList.add('spinning');
      setTimeout(() => {
        if (spinner1) spinner1.classList.remove('spinning');
        if (spinner2) spinner2.classList.remove('spinning');
        dice.rolling = false;
        renderUI();
      }, 600);
    };
  }
}
