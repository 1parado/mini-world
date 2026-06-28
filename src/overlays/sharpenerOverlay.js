// sharpenerOverlay.js — ✏️ 铅笔刀节奏游戏
import { getCtx } from '../overlays/OverlayContext.js';
import { haptic } from '../utils/haptic.js';

const SHARPENER_DIRS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const SHARPENER_DIR_EMOJI = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };

let sharpenerState = null;
let keyHandlerBound = false;
let _rhythmDpadBound = false;

function loadHigh() {
  try { return parseInt(localStorage.getItem('sharpener-high') || '0'); } catch { return 0; }
}
function saveHigh(s) {
  try { localStorage.setItem('sharpener-high', String(s)); } catch { /* ignore */ }
}

export function show() {
  const { bindOverlayClose, audio } = getCtx();
  bindOverlayClose('sharpener-overlay', 'sharpener-close');
  document.getElementById('sharpener-overlay').classList.add('visible');
  const hs = loadHigh();
  document.getElementById('sharpener-highscore').textContent = hs;
  if (!sharpenerState) {
    sharpenerState = { playing: false, notes: [], noteIdx: 0, score: 0, combo: 0, timer: null, startTime: 0 };
  }
  document.getElementById('sharpener-score').textContent = 0;
  document.getElementById('sharpener-combo').textContent = 0;
  document.getElementById('sharpener-judge').textContent = '';
  document.getElementById('sharpener-result').style.display = 'none';
  document.getElementById('sharpener-notes').innerHTML = '';
  document.getElementById('sharpener-start').onclick = startGame;
  document.getElementById('sharpener-restart').onclick = () => { stopGame(); startGame(); };

  // 注册全局键盘监听（仅注册一次）
  if (!keyHandlerBound) {
    document.addEventListener('keydown', keyHandler);
    keyHandlerBound = true;
  }

  // 虚拟方向键（触屏设备）
  bindRhythmDpad();

  // 提示文案适配
  const tipEl = document.getElementById('sharpener-tip');
  if (tipEl) {
    const isMobile = 'ontouchstart' in window;
    tipEl.textContent = isMobile
      ? '箭头到达判定线时点击下方对应方向'
      : '箭头到达判定线时按下对应方向键';
  }
}

/* ── 虚拟方向键绑定（触屏节奏按钮） ────────────── */
function bindRhythmDpad() {
  const dpad = document.getElementById('sharpener-dpad');
  if (!dpad) return;
  if (!('ontouchstart' in window)) return;
  if (_rhythmDpadBound) return;
  _rhythmDpadBound = true;

  const btns = dpad.querySelectorAll('.rhythm-btn');
  btns.forEach(btn => {
    const dir = btn.dataset.dir;
    // 使用 touchstart 减少延迟（节奏游戏对时机敏感）
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleDirInput(dir);
    }, { passive: false });
  });
}

/** 方向输入统一处理（键盘和触屏共用） */
function handleDirInput(dir) {
  if (!sharpenerState || !sharpenerState.playing) return;
  if (!SHARPENER_DIRS.includes(dir)) return;
  haptic('light');
  if (sharpenerState.noteIdx >= sharpenerState.notes.length) return;
  const expected = sharpenerState.notes[sharpenerState.noteIdx];
  if (dir === expected) {
    const elapsed = performance.now() - sharpenerState.startTime;
    const noteY = -30 - sharpenerState.noteIdx * 50 + (elapsed * 1.5 / 16);
    const dist = Math.abs(noteY - 200);
    if (dist < 25) judge('perfect');
    else if (dist < 55) judge('good');
    else judge('miss');
  } else {
    judge('miss');
  }
  sharpenerState.noteIdx++;
  if (sharpenerState.noteIdx >= sharpenerState.notes.length) endGame();
}

export function hide() {
  document.getElementById('sharpener-overlay')?.classList.remove('visible');
  stopGame();
}

/** 供 ESC 全局清理 */
export function stopGame() {
  if (sharpenerState) {
    sharpenerState.playing = false;
    if (sharpenerState.timer) cancelAnimationFrame(sharpenerState.timer);
  }
}

function keyHandler(e) {
  if (!sharpenerState || !sharpenerState.playing) return;
  const dir = e.code;
  if (!SHARPENER_DIRS.includes(dir)) return;
  e.preventDefault();
  handleDirInput(dir);
}

function startGame() {
  const ns = { playing: true, notes: [], noteIdx: 0, score: 0, combo: 0, timer: null, startTime: Date.now(), noteEls: [] };
  for (let i = 0; i < 10; i++) {
    ns.notes.push(SHARPENER_DIRS[Math.floor(Math.random() * 4)]);
  }
  sharpenerState = ns;
  document.getElementById('sharpener-score').textContent = 0;
  document.getElementById('sharpener-combo').textContent = 0;
  document.getElementById('sharpener-judge').textContent = '';
  document.getElementById('sharpener-result').style.display = 'none';
  document.getElementById('sharpener-notes').innerHTML = '';

  const container = document.getElementById('sharpener-notes');
  ns.notes.forEach((dir, i) => {
    const col = SHARPENER_DIRS.indexOf(dir);
    const el = document.createElement('div');
    el.textContent = SHARPENER_DIR_EMOJI[dir];
    el.style.cssText = `position:absolute;left:${col * 25 + 12.5}%;top:${-30 - i * 50}px;font-size:22px;width:25%;text-align:center;transform:translateX(-50%);transition:top 0.05s linear;font-family:var(--font-display);`;
    container.appendChild(el);
    ns.noteEls.push(el);
  });

  const speed = 1.5;
  let lastT = performance.now();
  function tick(now) {
    if (!sharpenerState.playing) return;
    const dt = now - lastT;
    lastT = now;
    const elapsed = now - ns.startTime;
    ns.noteEls.forEach((el, i) => {
      const baseY = -30 - i * 50;
      const currentY = baseY + (elapsed * speed / 16);
      el.style.top = currentY + 'px';
    });
    while (ns.noteIdx < ns.notes.length) {
      const elapsed2 = performance.now() - ns.startTime;
      const noteY = -30 - ns.noteIdx * 50 + (elapsed2 * speed / 16);
      if (noteY > 210) {
        judge('miss');
        ns.noteIdx++;
      } else {
        break;
      }
    }
    if (ns.noteIdx >= ns.notes.length) {
      endGame();
      return;
    }
    sharpenerState.timer = requestAnimationFrame(tick);
  }
  sharpenerState.timer = requestAnimationFrame(tick);
}

function judge(result) {
  const { audio } = getCtx();
  const el = document.getElementById('sharpener-judge');
  if (result === 'perfect') { el.textContent = '✨ Perfect!'; el.style.color = '#077B8A'; sharpenerState.score += 100; sharpenerState.combo++; audio.playSFX('perfect'); }
  else if (result === 'good') { el.textContent = '👌 Good!'; el.style.color = '#5B8C5A'; sharpenerState.score += 50; sharpenerState.combo++; audio.playSFX('good'); }
  else { el.textContent = '💨 Miss'; el.style.color = '#EA5455'; sharpenerState.combo = 0; audio.playSFX('miss'); }
  document.getElementById('sharpener-score').textContent = sharpenerState.score;
  document.getElementById('sharpener-combo').textContent = sharpenerState.combo;
}

function endGame() {
  const { audio, progress } = getCtx();
  sharpenerState.playing = false;
  if (sharpenerState.timer) cancelAnimationFrame(sharpenerState.timer);
  const score = sharpenerState.score;
  const hs = loadHigh();
  const isNew = score > hs;
  if (isNew) { saveHigh(score); document.getElementById('sharpener-highscore').textContent = score; }
  const resultEl = document.getElementById('sharpener-result');
  resultEl.style.display = 'block';
  resultEl.textContent = `终结！得分 ${score}${isNew ? ' 🎉新纪录！' : ''}`;
  audio.playSFX(score > 0 ? 'success' : 'fail');
  progress.reportHighScore('sharpener', score);
}
