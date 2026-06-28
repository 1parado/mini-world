// stickerOverlay.js — 🏷️ 贴纸收集册
import { getCtx } from '../overlays/OverlayContext.js';

const STICKER_ALL = ['🌟','🌸','🐱','🌈','🎵','🍎','🦋','🌙','🍀','🎈','🎨','🍕','🌺','🐰','🍦','🎭','🦊','🍄','🌺','🌈','⭐','🎀','🐼','🌼','🍒','🐳','🎪','🌻','🦉','💎'];
let stickerCollection = null;

function loadData() {
  try {
    const raw = localStorage.getItem('sticker-data');
    return raw ? JSON.parse(raw) : { owned: [] };
  } catch { return { owned: [] }; }
}
function saveData() {
  try { localStorage.setItem('sticker-data', JSON.stringify(stickerCollection)); } catch {}
}

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('sticker-overlay', 'sticker-close');
  document.getElementById('sticker-overlay').classList.add('visible');
  if (!stickerCollection) stickerCollection = loadData();
  renderGrid();
  document.getElementById('sticker-draw').onclick = draw;
}

export function hide() {
  document.getElementById('sticker-overlay')?.classList.remove('visible');
}

function renderGrid() {
  const grid = document.getElementById('sticker-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const slot = document.createElement('div');
    slot.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1;background:var(--paper);border:1.5px solid var(--kraft);border-radius:6px;font-size:24px;';
    if (i < stickerCollection.owned.length) {
      slot.textContent = stickerCollection.owned[i];
    } else {
      slot.textContent = '❓';
      slot.style.opacity = '0.4';
    }
    grid.appendChild(slot);
  }
  const unique = new Set(stickerCollection.owned);
  document.getElementById('sticker-progress').textContent = `${unique.size}/20`;
  document.getElementById('sticker-bar').style.width = `${(unique.size / 20) * 100}%`;
}

function draw() {
  if (!stickerCollection) return;
  const { audio, showNotification, progress } = getCtx();
  const sticker = STICKER_ALL[Math.floor(Math.random() * STICKER_ALL.length)];
  stickerCollection.owned.push(sticker);
  saveData();
  audio.playSFX('collect');
  const result = document.getElementById('sticker-draw-result');
  result.textContent = sticker;
  result.style.transform = 'scale(1.5)';
  setTimeout(() => { result.style.transform = 'scale(1)'; }, 200);
  const unique = new Set(stickerCollection.owned);
  if (unique.size >= 20) {
    showNotification('🎉 恭喜！贴纸收集完成！');
    progress.markZoneComplete('sticker');
    progress.earnCoins(15, 'sticker');
    audio.playSFX('success');
  }
  renderGrid();
}
