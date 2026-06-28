// abacusOverlay.js — 🧮 算盘数学挑战
import { getCtx } from '../overlays/OverlayContext.js';

let abacusState = null;

function loadHigh() {
  try { return parseInt(localStorage.getItem('abacus-high') || '0'); } catch { return 0; }
}
function saveHigh(s) { try { localStorage.setItem('abacus-high', String(s)); } catch {} }

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('abacus-overlay', 'abacus-close');
  document.getElementById('abacus-overlay').classList.add('visible');
  document.getElementById('abacus-highstreak').textContent = loadHigh();
  abacusState = { playing: false, streak: 0, answer: 0, timeLeft: 10, timer: null };
  document.getElementById('abacus-start').onclick = startGame;
  document.getElementById('abacus-submit').onclick = checkAnswer;
  const input = document.getElementById('abacus-answer');
  if (input) input.onkeydown = (e) => { if (e.code === 'Enter') checkAnswer(); };
}

export function hide() {
  document.getElementById('abacus-overlay')?.classList.remove('visible');
  clearTimer();
}

/** 供 ESC 全局清理 */
export function clearTimer() {
  if (abacusState) {
    abacusState.playing = false;
    if (abacusState.timer) { clearInterval(abacusState.timer); abacusState.timer = null; }
  }
}

function startGame() {
  abacusState = { playing: true, streak: 0, answer: 0, timeLeft: 10, timer: null, difficulty: 1 };
  nextProblem();
}

function nextProblem() {
  if (!abacusState) return;
  const d = abacusState.difficulty;
  let a, b, op, answer;
  if (d <= 2) {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    op = Math.random() < 0.5 ? '+' : '-';
    if (op === '-' && a < b) [a, b] = [b, a];
    answer = op === '+' ? a + b : a - b;
  } else if (d <= 5) {
    a = Math.floor(Math.random() * 50) + 10;
    b = Math.floor(Math.random() * 30) + 1;
    const ops = ['+', '-', '×'];
    op = ops[Math.floor(Math.random() * 3)];
    if (op === '-' && a < b) [a, b] = [b, a];
    if (op === '×') { a = Math.floor(Math.random() * 12) + 2; b = Math.floor(Math.random() * 12) + 2; answer = a * b; }
    else answer = op === '+' ? a + b : a - b;
  } else {
    a = Math.floor(Math.random() * 100) + 10;
    b = Math.floor(Math.random() * 50) + 1;
    op = ['+', '-', '×'][Math.floor(Math.random() * 3)];
    if (op === '-' && a < b) [a, b] = [b, a];
    if (op === '×') { a = Math.floor(Math.random() * 15) + 2; b = Math.floor(Math.random() * 15) + 2; answer = a * b; }
    else answer = op === '+' ? a + b : a - b;
  }
  abacusState.answer = answer;
  document.getElementById('abacus-problem').textContent = `${a} ${op} ${b} = ?`;
  document.getElementById('abacus-answer').value = '';
  document.getElementById('abacus-answer').focus();
  document.getElementById('abacus-feedback').textContent = '';
  abacusState.timeLeft = 10;
  document.getElementById('abacus-time').textContent = '10';
  document.getElementById('abacus-timer-fill').style.width = '100%';
  if (abacusState.timer) clearInterval(abacusState.timer);
  abacusState.timer = setInterval(() => {
    abacusState.timeLeft -= 0.1;
    if (abacusState.timeLeft <= 0) {
      abacusState.timeLeft = 0;
      clearInterval(abacusState.timer);
      abacusState.timer = null;
      fail();
    }
    document.getElementById('abacus-time').textContent = Math.ceil(abacusState.timeLeft);
    document.getElementById('abacus-timer-fill').style.width = `${(abacusState.timeLeft / 10) * 100}%`;
    if (abacusState.timeLeft < 3) document.getElementById('abacus-timer-fill').style.background = 'var(--redline)';
    else document.getElementById('abacus-timer-fill').style.background = 'var(--teal)';
  }, 100);
}

function checkAnswer() {
  if (!abacusState || !abacusState.playing) return;
  const { audio } = getCtx();
  const val = parseInt(document.getElementById('abacus-answer').value);
  if (isNaN(val)) return;
  if (val === abacusState.answer) {
    abacusState.streak++;
    abacusState.difficulty = Math.floor(abacusState.streak / 3) + 1;
    document.getElementById('abacus-streak').textContent = abacusState.streak;
    document.getElementById('abacus-feedback').textContent = '✅ 正确！';
    document.getElementById('abacus-feedback').style.color = '#077B8A';
    audio.playSFX('success');
    if (abacusState.timer) clearInterval(abacusState.timer);
    setTimeout(nextProblem, 500);
  } else {
    fail();
  }
}

function fail() {
  if (!abacusState) return;
  const { audio } = getCtx();
  abacusState.playing = false;
  if (abacusState.timer) { clearInterval(abacusState.timer); abacusState.timer = null; }
  document.getElementById('abacus-feedback').textContent = `❌ 答案是 ${abacusState.answer}，连胜 ${abacusState.streak}`;
  document.getElementById('abacus-feedback').style.color = '#EA5455';
  audio.playSFX('fail');
  const hs = loadHigh();
  if (abacusState.streak > hs) { saveHigh(abacusState.streak); document.getElementById('abacus-highstreak').textContent = abacusState.streak; }
  document.getElementById('abacus-start').textContent = '🔄 再来';
  const { progress } = getCtx();
  progress.reportHighScore('abacus', abacusState.streak);
}
