// wishOverlay.js — 🪙 许愿池
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose, gameWorld, storageClient, helpers, showNotification } = getCtx();
  const { dbAddWish, dbListWishes } = helpers;
  bindOverlayClose('wish-overlay', 'wish-close');
  document.getElementById('wish-overlay').classList.add('visible');
  renderWishUI();
}

export function hide() {
  document.getElementById('wish-overlay')?.classList.remove('visible');
}

function renderWishUI() {
  const { gameWorld, storageClient, helpers, showNotification, progress } = getCtx();
  const { dbAddWish, dbListWishes } = helpers;
  const wish = gameWorld.getZoneByType('wish');
  if (!wish) return;

  const listEl = document.getElementById('wish-list');
  const countEl = document.getElementById('wish-count');

  const renderWishes = (data) => {
    if (countEl) countEl.textContent = data.coinCount;
    if (listEl) {
      listEl.innerHTML = '';
      for (const w of data.wishes) {
        const item = document.createElement('div');
        item.className = 'wish-item';
        item.textContent = '🪙 ' + w.text;
        listEl.appendChild(item);
      }
    }
  };

  if (storageClient.isConfigured()) {
    dbListWishes().then(renderWishes).catch(() => {
      renderWishes({ wishes: wish.wishes, coinCount: wish.coinCount });
    });
  } else {
    renderWishes({ wishes: wish.wishes, coinCount: wish.coinCount });
  }

  const inputEl = document.getElementById('wish-input');
  const tossBtn = document.getElementById('wish-toss');
  if (tossBtn) {
    tossBtn.onclick = () => {
      const text = inputEl ? inputEl.value.trim() : '';
      if (!text) { showNotification('请先写下你的愿望 ✨'); return; }
      if (!progress.spendCoins(2)) { showNotification('🪙 墨水币不足！需要 2 枚'); return; }
      wish.addWish(text);
      if (inputEl) inputEl.value = '';
      showNotification('🪙 许愿成功！愿望已沉入池底');
      const pond = document.querySelector('.wish-pond');
      if (pond) { pond.classList.remove('ripple'); void pond.offsetWidth; pond.classList.add('ripple'); }
      if (storageClient.isConfigured()) {
        dbAddWish(text).then(() => renderWishUI());
      } else {
        renderWishUI();
      }
    };
  }
}
