// klotskiOverlay.js — 🏯 华容道
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('klotski-overlay', 'klotski-close');
  document.getElementById('klotski-overlay').classList.add('visible');
  renderKlotskiUI();
}

export function hide() {
  document.getElementById('klotski-overlay')?.classList.remove('visible');
}

function renderKlotskiUI() {
  const { gameWorld, showNotification, progress } = getCtx();
  const klotski = gameWorld.getZoneByType('klotski');
  if (!klotski) return;
  const board = document.getElementById('klotski-board');
  const movesEl = document.getElementById('klotski-moves');
  const statusEl = document.getElementById('klotski-status');
  if (!board) return;

  if (movesEl) movesEl.textContent = klotski.moves;
  if (statusEl) statusEl.textContent = klotski.solved ? '🎉 曹操脱出！' : '点击方块移动';

  board.innerHTML = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = document.createElement('div');
      cell.className = 'klotski-cell';
      cell.style.gridRow = r + 1;
      cell.style.gridColumn = c + 1;
      cell.addEventListener('click', () => {
        if (klotski.clickCell(r, c)) {
          if (klotski.solved) { showNotification('🏯 华容道通关！'); progress.markZoneComplete('klotski'); progress.earnCoins(10, 'klotski'); }
          renderKlotskiUI();
        }
      });
      board.appendChild(cell);
    }
  }
  for (const block of klotski.blocks) {
    const el = document.createElement('div');
    el.className = 'klotski-block';
    el.style.gridRow = `${block.r + 1} / span ${block.h}`;
    el.style.gridColumn = `${block.c + 1} / span ${block.w}`;
    el.style.backgroundColor = block.color;
    el.textContent = block.name;
    el.addEventListener('click', () => {
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      let moved = false;
      for (const [dr, dc] of dirs) {
        if (klotski.tryMove(block.id, dr, dc)) { moved = true; break; }
      }
      if (moved) {
        if (klotski.solved) showNotification('🏯 华容道通关！');
        renderKlotskiUI();
      }
    });
    board.appendChild(el);
  }

  const resetBtn = document.getElementById('klotski-reset');
  if (resetBtn) resetBtn.onclick = () => { klotski.reset(); renderKlotskiUI(); };
}
