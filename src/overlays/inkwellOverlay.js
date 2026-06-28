// inkwellOverlay.js — 🪄 墨水台配色游戏
import { getCtx } from '../overlays/OverlayContext.js';

const INKWELL_MIXES = {
  'red+blue':    { name: '紫色',  color: '#9B59B6' },
  'red+yellow':   { name: '橙色',  color: '#E67E22' },
  'blue+yellow':  { name: '绿色',  color: '#27AE60' },
};
const INKWELL_OPTIONS = Object.values(INKWELL_MIXES);
let inkwellState = null;

function loadHigh() {
  try { return parseInt(localStorage.getItem('inkwell-high') || '0'); } catch { return 0; }
}
function saveHigh(s) { try { localStorage.setItem('inkwell-high', String(s)); } catch {} }

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('inkwell-overlay', 'inkwell-close');
  document.getElementById('inkwell-overlay').classList.add('visible');
  document.getElementById('inkwell-highscore').textContent = loadHigh();
  inkwellState = { round: 0, score: 0, correct: 0, selected: [], target: null };
  nextRound();
  document.querySelectorAll('.inkwell-color-btn').forEach(btn => {
    btn.onclick = () => {
      if (!inkwellState) return;
      const c = btn.dataset.color;
      if (inkwellState.selected.includes(c)) return;
      if (inkwellState.selected.length >= 2) return;
      inkwellState.selected.push(c);
      btn.style.transform = 'scale(0.9)';
      btn.style.boxShadow = '0 0 8px rgba(7,123,138,0.5)';
      document.getElementById('inkwell-selected').textContent = inkwellState.selected.map(s => ({red:'🔴红',blue:'🔵蓝',yellow:'🟡黄'}[s])).join(' + ');
      document.getElementById('inkwell-mix').disabled = inkwellState.selected.length < 2;
    };
  });
  document.getElementById('inkwell-mix').onclick = mix;
  document.getElementById('inkwell-clear-sel').onclick = clearSel;
}

export function hide() {
  document.getElementById('inkwell-overlay')?.classList.remove('visible');
  inkwellState = null;
}

function nextRound() {
  if (inkwellState.round >= 10) {
    const { audio, showNotification, progress } = getCtx();
    const hs = loadHigh();
    if (inkwellState.score > hs) { saveHigh(inkwellState.score); document.getElementById('inkwell-highscore').textContent = inkwellState.score; }
    showNotification(`🎨 配色结束！得分 ${inkwellState.score}`);
    audio.playSFX('success');
    progress.reportHighScore('inkwell', inkwellState.score);
    return;
  }
  inkwellState.selected = [];
  const target = INKWELL_OPTIONS[Math.floor(Math.random() * INKWELL_OPTIONS.length)];
  inkwellState.target = target;
  document.getElementById('inkwell-target').style.background = target.color;
  document.getElementById('inkwell-target-name').textContent = target.name;
  document.getElementById('inkwell-selected').textContent = '点击选择颜色（选2个）';
  document.getElementById('inkwell-mix').disabled = true;
  clearSel();
}

function mix() {
  if (!inkwellState || inkwellState.selected.length < 2) return;
  const { audio, showNotification } = getCtx();
  const sel = [...inkwellState.selected].sort();
  const key = sel.join('+');
  const result = INKWELL_MIXES[key];
  if (result && result.name === inkwellState.target.name) {
    inkwellState.score += 10;
    inkwellState.correct++;
    audio.playSFX('success');
    showNotification('✅ 正确！');
  } else {
    inkwellState.score = Math.max(0, inkwellState.score - 2);
    audio.playSFX('fail');
    showNotification('❌ 不对哦～');
  }
  inkwellState.round++;
  document.getElementById('inkwell-score').textContent = inkwellState.score;
  document.getElementById('inkwell-correct').textContent = inkwellState.correct;
  setTimeout(nextRound, 800);
}

function clearSel() {
  if (!inkwellState) return;
  inkwellState.selected = [];
  document.querySelectorAll('.inkwell-color-btn').forEach(btn => { btn.style.transform = ''; btn.style.boxShadow = ''; });
  document.getElementById('inkwell-selected').textContent = '点击选择颜色（选2个）';
  document.getElementById('inkwell-mix').disabled = true;
}
