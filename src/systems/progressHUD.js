// progressHUD.js — 🪙 HUD 渲染 + 🏆 成就面板逻辑 + 🎉 庆祝特效
import { getCtx } from '../overlays/OverlayContext.js';
import { spawnConfetti } from './CelebrationFX.js';
import { haptic } from '../utils/haptic.js';

let _progress = null;

/** 初始化 HUD 绑定（main.js 启动时调用一次） */
export function initProgressHUD(progress) {
  _progress = progress;
  updateCoinDisplay(progress);
  progress.setOnUpdate((state) => updateCoinDisplay(progress));

  // 成就按钮
  const badgeBtn = document.getElementById('badge-btn');
  if (badgeBtn) {
    badgeBtn.onclick = () => openBadgePanel(progress);
  }

  // 成就面板关闭按钮
  const badgeClose = document.getElementById('badge-close');
  const badgeOverlay = document.getElementById('badge-overlay');
  if (badgeClose && badgeOverlay) {
    badgeClose.onclick = () => closeBadgePanel();
    badgeOverlay.addEventListener('click', (e) => {
      if (e.target === badgeOverlay) closeBadgePanel();
    });
  }
}

/** 关闭成就面板（供 main.js ESC 处理器调用） */
export function closeBadgePanel() {
  const overlay = document.getElementById('badge-overlay');
  if (overlay) overlay.classList.remove('visible');
  document.body.classList.remove('badge-open');
  if (_progress) {
    _progress.popNewBadges();
    const btn = document.getElementById('badge-btn');
    if (btn) btn.classList.remove('pulse');
  }
}

/** 成就面板是否打开 */
export function isBadgePanelOpen() {
  const overlay = document.getElementById('badge-overlay');
  return overlay && overlay.classList.contains('visible');
}

/** 更新右上角墨水币显示 */
function updateCoinDisplay(progress) {
  const el = document.getElementById('coin-display');
  if (!el) return;
  const prev = parseInt(el.dataset.prev || '0');
  const curr = progress.coins;
  el.textContent = '🪙 ' + curr;
  el.dataset.prev = String(curr);
  if (curr > prev) {
    el.classList.remove('bounce');
    void el.offsetWidth;
    el.classList.add('bounce');
  }
  checkNewBadges(progress);
}

/** 打开成就墙面板 */
function openBadgePanel(progress) {
  const overlay = document.getElementById('badge-overlay');
  if (overlay) overlay.classList.add('visible');
  document.body.classList.add('badge-open');
  renderBadgePanel(progress);
  // 取走新徽章（消除脉冲），但不在这里显示通知（在 checkNewBadges 中处理）
  progress.popNewBadges();
  const btn = document.getElementById('badge-btn');
  if (btn) btn.classList.remove('pulse');
}

/** 渲染成就墙网格 */
export function renderBadgePanel(progress) {
  const grid = document.getElementById('badge-grid');
  const countEl = document.getElementById('badge-count');
  if (!grid) return;

  const state = progress.getState();
  const badgeIds = new Set(state.badges);
  const defs = progress.getBadgeDefs();

  grid.innerHTML = '';
  let unlockedCount = 0;

  for (const badge of defs) {
    const cell = document.createElement('div');
    const owned = badgeIds.has(badge.id);
    cell.className = 'badge-cell ' + (owned ? 'unlocked ' + badge.tier : 'locked');

    const icon = document.createElement('div');
    icon.className = 'badge-icon';
    icon.textContent = owned ? badge.icon : '🔒';
    cell.appendChild(icon);

    const label = document.createElement('div');
    label.className = 'badge-label';
    label.textContent = owned ? badge.name : '???';
    cell.appendChild(label);

    if (owned) unlockedCount++;

    // 提示
    const tip = document.createElement('div');
    tip.className = 'badge-tip';
    tip.textContent = (owned ? '✅ ' : '🔒 ') + badge.desc;
    cell.appendChild(tip);

    grid.appendChild(cell);
  }

  if (countEl) countEl.textContent = unlockedCount;
}

/** 检查新徽章，给成就按钮加脉冲 + 通知 + 庆祝特效 */
function checkNewBadges(progress) {
  const newBadges = progress.popNewBadges();
  if (newBadges.length === 0) return;

  const btn = document.getElementById('badge-btn');
  if (btn) btn.classList.add('pulse');

  const { showNotification } = getCtx();
  for (const id of newBadges) {
    const def = progress.getBadgeDefs().find(b => b.id === id);
    if (def) {
      showNotification(`🏆 成就解锁：${def.icon} ${def.name}！`);
      // 🎉 庆祝金纸片雨
      spawnConfetti(window.innerWidth / 2, window.innerHeight / 2, def.tier);
      // 📳 触觉反馈
      haptic('success');
    }
  }
}
