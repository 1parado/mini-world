// diaryOverlay.js — 📔 日记本
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('diary-overlay', 'diary-close');
  document.getElementById('diary-overlay').classList.add('visible');
  renderDiaryUI();
}

export function hide() {
  document.getElementById('diary-overlay')?.classList.remove('visible');
}

function renderDiaryUI() {
  const { gameWorld, showNotification } = getCtx();
  const diary = gameWorld.getZoneByType('diary');
  if (!diary) return;

  const listEl = document.getElementById('diary-entries');
  const moodBtns = document.querySelectorAll('.diary-mood-btn');
  const saveBtn = document.getElementById('diary-save');
  const textArea = document.getElementById('diary-text');

  let selectedMood = diary.moods[0];
  moodBtns.forEach(btn => {
    btn.onclick = () => {
      moodBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMood = btn.dataset.mood;
    };
  });

  if (saveBtn) {
    saveBtn.onclick = () => {
      const text = textArea ? textArea.value.trim() : '';
      if (!text) { showNotification('写点什么吧 ✍️'); return; }
      diary.addEntry(selectedMood, text);
      if (textArea) textArea.value = '';
      showNotification('📔 日记已保存');
      renderDiaryUI();
    };
  }

  if (listEl) {
    listEl.innerHTML = '';
    for (const entry of diary.entries) {
      const div = document.createElement('div');
      div.className = 'diary-entry';
      const time = new Date(entry.time);
      const timeStr = time.getHours() + ':' + String(time.getMinutes()).padStart(2, '0');
      div.innerHTML = `<span class="diary-entry-mood">${entry.mood}</span>
        <span class="diary-entry-text">${entry.text}</span>
        <span class="diary-entry-time">${timeStr}</span>`;
      listEl.appendChild(div);
    }
  }
}
