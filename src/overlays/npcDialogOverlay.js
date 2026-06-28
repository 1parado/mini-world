// npcDialogOverlay.js — NPC 对话框（手绘风格气泡）

import { getCtx } from './OverlayContext.js';

let _lastNpcName = '';
let _lastDialogText = '';

export function show(npcName, dialogText) {
  const overlay = document.getElementById('npc-dialog-overlay');
  if (!overlay) return;
  // 记住内容，setMode 二次调用时能恢复
  if (npcName) _lastNpcName = npcName;
  if (dialogText) _lastDialogText = dialogText;
  const nameEl = document.getElementById('npc-dialog-name');
  const textEl = document.getElementById('npc-dialog-text');
  if (nameEl) nameEl.textContent = _lastNpcName;
  if (textEl) textEl.textContent = _lastDialogText;
  overlay.classList.add('visible');

  // 绑定关闭按钮（不绑定背景点击，因为是浮动气泡而非全屏modal）
  const closeBtn = document.getElementById('npc-dialog-close');
  if (closeBtn && !closeBtn._npcBound) {
    closeBtn._npcBound = true;
    closeBtn.onclick = () => hide();
  }
}

export function hide() {
  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay) overlay.classList.remove('visible');
  _lastNpcName = '';
  _lastDialogText = '';
}
