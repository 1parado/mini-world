// boardOverlay.js — 📌 公告板
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose, gameWorld, storageClient, helpers, showNotification } = getCtx();
  const { dbListBoardMessages } = helpers;

  const board = gameWorld.getZoneByType('board');
  if (!board) return;
  const container = document.getElementById('board-messages');
  bindOverlayClose('board-overlay', 'board-close');
  document.getElementById('board-overlay').classList.add('visible');

  // 从数据库读取公告（所有人共享）
  const renderBoard = (messages) => {
    if (!container) return;
    container.innerHTML = '';
    const list = messages.length === 0 ? board.messages : messages;
    list.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'board-message';
      div.textContent = msg;
      container.appendChild(div);
    });
  };

  if (storageClient.isConfigured()) {
    dbListBoardMessages().then(renderBoard).catch(() => renderBoard(board.messages));
  } else {
    renderBoard(board.messages);
  }
}

export function hide() {
  document.getElementById('board-overlay')?.classList.remove('visible');
}
