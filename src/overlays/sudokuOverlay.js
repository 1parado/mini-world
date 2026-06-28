// sudokuOverlay.js — 🔢 数独角
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('sudoku-overlay', 'sudoku-close');
  document.getElementById('sudoku-overlay').classList.add('visible');
  renderSudokuUI();
}

export function hide() {
  document.getElementById('sudoku-overlay')?.classList.remove('visible');
}

function renderSudokuUI() {
  const { gameWorld, showNotification, progress } = getCtx();
  const sudoku = gameWorld.getZoneByType('sudoku');
  if (!sudoku) return;
  const grid = document.getElementById('sudoku-grid');
  const errorsEl = document.getElementById('sudoku-errors');
  const statusEl = document.getElementById('sudoku-status');
  if (!grid) return;

  if (errorsEl) errorsEl.textContent = sudoku.errors;
  if (statusEl) statusEl.textContent = sudoku.solved ? '🎉 数独完成！' : '填入1-4';

  grid.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = document.createElement('div');
      cell.className = 'sudoku-cell';
      const isGiven = sudoku.puzzle[r][c] !== 0;
      const boxBg = (r < 2 && c < 2) || (r >= 2 && c >= 2) ? 'sudoku-box-a' : 'sudoku-box-b';
      cell.classList.add(boxBg);
      if (isGiven) {
        cell.classList.add('given');
        cell.textContent = sudoku.puzzle[r][c];
      } else {
        const val = sudoku.userInput[r][c];
        if (val) {
          cell.textContent = val;
          cell.classList.add(val !== sudoku.solution[r][c] ? 'wrong' : 'correct');
        }
        cell.addEventListener('click', () => {
          const next = (val % 4) + 1;
          const result = sudoku.fill(r, c, next);
          if (result === 'win') { showNotification('🔢 数独完成！'); progress.markZoneComplete('sudoku'); progress.earnCoins(10, 'sudoku'); }
          renderSudokuUI();
        });
      }
      grid.appendChild(cell);
    }
  }

  const resetBtn = document.getElementById('sudoku-reset');
  if (resetBtn) resetBtn.onclick = () => { sudoku.reset(); renderSudokuUI(); };
}
