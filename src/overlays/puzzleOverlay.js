// puzzleOverlay.js — 🧩 拼图桌
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose, gameWorld } = getCtx();
  bindOverlayClose('puzzle-overlay', 'puzzle-close');
  document.getElementById('puzzle-overlay').classList.add('visible');
  const puzzle = gameWorld.getZoneByType('puzzle');
  if (!puzzle.solved && puzzle.tiles.length === 0) puzzle.init();
  renderPuzzleUI();
}

export function hide() {
  document.getElementById('puzzle-overlay')?.classList.remove('visible');
}

function renderPuzzleUI() {
  const { gameWorld, showNotification, progress } = getCtx();
  const puzzle = gameWorld.getZoneByType('puzzle');
  if (!puzzle) return;
  const container = document.getElementById('puzzle-grid');
  const movesEl = document.getElementById('puzzle-moves');
  const statusEl = document.getElementById('puzzle-status');
  if (!container) return;

  if (movesEl) movesEl.textContent = puzzle.moves;
  if (statusEl) statusEl.textContent = puzzle.solved ? '🎉 还原成功！' : '点击方块移动';

  container.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'puzzle-cell';
    if (puzzle.tiles[i] === 0) {
      cell.classList.add('empty');
    } else {
      cell.textContent = puzzle.tiles[i];
      if (puzzle.tiles[i] === i + 1) cell.classList.add('correct');
      cell.addEventListener('click', () => {
        if (puzzle.tryMove(i)) {
          if (puzzle.solved) { showNotification('🧩 拼图还原成功！'); progress.markZoneComplete('puzzle'); progress.earnCoins(10, 'puzzle'); }
          renderPuzzleUI();
        }
      });
    }
    container.appendChild(cell);
  }

  const resetBtn = document.getElementById('puzzle-reset');
  if (resetBtn) resetBtn.onclick = () => { puzzle.reset(); renderPuzzleUI(); };
}
