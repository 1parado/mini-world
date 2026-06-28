// capsuleOverlay.js — ⏰ 时光胶囊
import { getCtx } from '../overlays/OverlayContext.js';

const CAPSULE_KEY = 'time-capsules';
let capsuleData = null;
let capsuleSelectedMinutes = 5;

function loadCapsules() {
  try { const raw = localStorage.getItem(CAPSULE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveCapsules() { try { localStorage.setItem(CAPSULE_KEY, JSON.stringify(capsuleData)); } catch {} }

function formatDuration(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '不到1分钟';
  if (mins < 60) return `${mins}分钟`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时`;
  const days = Math.floor(hours / 24);
  return `${days}天`;
}

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('capsule-overlay', 'capsule-close');
  document.getElementById('capsule-overlay').classList.add('visible');
  capsuleData = loadCapsules();
  renderList();

  document.querySelectorAll('.capsule-time-btn').forEach(btn => {
    btn.onclick = () => {
      capsuleSelectedMinutes = parseInt(btn.dataset.minutes);
      document.querySelectorAll('.capsule-time-btn').forEach(b => b.style.background = '');
      btn.style.background = 'var(--teal)';
      btn.style.color = '#fff';
    };
  });
  document.getElementById('capsule-seal').onclick = sealCapsule;
}

export function hide() {
  document.getElementById('capsule-overlay')?.classList.remove('visible');
}

function renderList() {
  const list = document.getElementById('capsule-list');
  if (!list) return;
  list.innerHTML = '';
  if (capsuleData.length === 0) {
    list.innerHTML = '<div style="text-align:center;font-family:var(--font-display);font-size:14px;color:var(--text-ghost);padding:20px 0;">还没有胶囊，写一个吧 ✨</div>';
    return;
  }
  const now = Date.now();
  capsuleData.forEach((cap, i) => {
    const unlocked = now >= cap.unlockAt;
    const remaining = Math.max(0, cap.unlockAt - now);
    const div = document.createElement('div');
    div.style.cssText = `padding:10px;margin:4px 0;border:1.5px solid var(--kraft);border-radius:3px 10px 3px 10px;background:var(--paper);font-family:var(--font-display);display:flex;justify-content:space-between;align-items:center;`;
    if (unlocked) {
      const escapedText = cap.text.replace(/'/g, "\\'");
      div.innerHTML = `<div style="flex:1;">🎉 <span style="font-size:13px;">${cap.text}</span><div style="font-size:11px;color:var(--text-ghost);margin-top:2px;">封存了 ${formatDuration(cap.unlockAt - cap.sealedAt)} 前</div></div><button class="capsule-read-btn" style="font-size:12px;padding:4px 10px;border:1px solid var(--kraft);border-radius:6px;background:var(--paper);cursor:pointer;">📖 读</button>`;
    } else {
      div.innerHTML = `<div>🔒 封存中... <span style="font-size:11px;color:var(--text-ghost);">还剩 ${formatDuration(remaining)}</span></div>`;
    }
    list.appendChild(div);
  });
}

function sealCapsule() {
  const { audio } = getCtx();
  const text = document.getElementById('capsule-text').value.trim();
  if (!text) { document.getElementById('capsule-message').textContent = '请先写下点什么 ✍️'; return; }
  if (capsuleData.length >= 10) {
    const unlockedIdx = capsuleData.findIndex(c => Date.now() >= c.unlockAt);
    if (unlockedIdx >= 0) capsuleData.splice(unlockedIdx, 1);
    else { document.getElementById('capsule-message').textContent = '胶囊已满（最多10个）'; return; }
  }
  capsuleData.push({ text, sealedAt: Date.now(), unlockAt: Date.now() + capsuleSelectedMinutes * 60000 });
  saveCapsules();
  document.getElementById('capsule-text').value = '';
  document.getElementById('capsule-message').textContent = '🔒 胶囊已封存！';
  audio.playSFX('lock');
  renderList();
}
