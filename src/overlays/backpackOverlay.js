// backpackOverlay.js — 🎒 背包面板
// 按 B 键打开/关闭，点击物品进入放置模式
import { getCtx } from './OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('backpack-overlay', 'backpack-close');
  document.getElementById('backpack-overlay').classList.add('visible');
  renderBackpackUI();
}

export function hide() {
  document.getElementById('backpack-overlay')?.classList.remove('visible');
}

function renderBackpackUI() {
  const gridEl = document.getElementById('backpack-grid');
  const emptyEl = document.getElementById('backpack-empty');
  if (!gridEl) return;

  const { gameWorld } = getCtx();
  const backpack = window._backpack;
  if (!backpack) return;

  const items = backpack.getItems();
  gridEl.innerHTML = '';

  if (items.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'backpack-item';
    card.innerHTML = `
      <span class="backpack-item-name">${item.name}</span>
      <span class="backpack-item-count">×${item.count}</span>
    `;
    card.onclick = () => handleSelectItem(item);
    gridEl.appendChild(card);
  }
}

function handleSelectItem(item) {
  const { gameWorld, setMode } = getCtx();
  // 设置待放置装饰
  gameWorld.pendingPlacement = { type: item.id, name: item.name };
  // 关闭背包并切回探索模式（放置模式下需要 explore 状态响应鼠标/键盘）
  hide();
  setMode('explore');
  // 设置放置状态（setMode 会清理 overlay，这里重新设置 pending）
  gameWorld.pendingPlacement = { type: item.id, name: item.name };
  // 通知 main.js 进入放置模式
  if (gameWorld.onEnterPlaceMode) gameWorld.onEnterPlaceMode(item.name);
}
