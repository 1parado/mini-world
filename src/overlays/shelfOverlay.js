// shelfOverlay.js — 📚 书架
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  const container = document.getElementById('shelf-books');
  if (container) {
    container.innerHTML = '';
    ['📖 页面模板指南', '📒 绘画技巧入门', '📓 墨水与色彩原理', '📕 贴纸图鉴 Vol.1', '📗 创意写作秘诀']
      .forEach(title => { const div = document.createElement('div'); div.className = 'shelf-book'; div.textContent = title; container.appendChild(div); });
  }
  bindOverlayClose('shelf-overlay', 'shelf-close');
  document.getElementById('shelf-overlay').classList.add('visible');
}

export function hide() {
  document.getElementById('shelf-overlay')?.classList.remove('visible');
}
