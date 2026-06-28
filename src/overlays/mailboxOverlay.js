// mailboxOverlay.js — 📮 信箱
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose, gameWorld, storageClient, helpers, showNotification } = getCtx();
  const { dbListMessages, dbAddMessage } = helpers;
  const mailbox = gameWorld.getZoneByType('mailbox');
  if (!mailbox) return;
  const container = document.getElementById('mailbox-messages');
  bindOverlayClose('mailbox-overlay', 'mailbox-close');
  document.getElementById('mailbox-overlay').classList.add('visible');

  const renderMessages = (messages) => {
    if (!container) return;
    container.innerHTML = '';
    const list = messages.length === 0 ? (mailbox.messages.length > 0 ? mailbox.messages : ['📭 信箱暂时没有新留言']) : messages;
    list.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'mailbox-message';
      div.textContent = msg;
      container.appendChild(div);
    });
  };

  if (storageClient.isConfigured()) {
    dbListMessages().then(renderMessages).catch(() => renderMessages(mailbox.messages));
  } else {
    renderMessages(mailbox.messages);
  }

  const sendBtn = document.getElementById('mailbox-send');
  const inputField = document.getElementById('mailbox-input');
  if (sendBtn && inputField) {
    sendBtn.onclick = () => {
      const text = inputField.value.trim();
      if (text) {
        mailbox.addMessage(text);
        inputField.value = '';
        if (storageClient.isConfigured()) {
          dbAddMessage(text).then(() => show());
        } else {
          show();
        }
        showNotification('✉️ 留言已投递！');
      }
    };
  }
}

export function hide() {
  document.getElementById('mailbox-overlay')?.classList.remove('visible');
}
