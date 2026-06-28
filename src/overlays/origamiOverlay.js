// origamiOverlay.js — 🦢 折纸桌 Simon Says
import { getCtx } from '../overlays/OverlayContext.js';

const ORIGAMI_DIRS = ['ru', 'rd', 'ld', 'lu', 'u', 'd'];
const ORIGAMI_EMOJI = { ru: '↗', rd: '↘', ld: '↙', lu: '↖', u: '⬆', d: '⬇' };
let origamiState = null;

function loadHigh() {
  try { return parseInt(localStorage.getItem('origami-high') || '0'); } catch { return 0; }
}
function saveHigh(l) { try { localStorage.setItem('origami-high', String(l)); } catch {} }

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('origami-overlay', 'origami-close');
  document.getElementById('origami-overlay').classList.add('visible');
  document.getElementById('origami-highlevel').textContent = loadHigh();
  origamiState = { sequence: [], playerIdx: 0, level: 1, phase: 'idle', showIdx: 0 };
  document.getElementById('origami-start').onclick = startGame;
  document.querySelectorAll('.origami-dir-btn').forEach(btn => {
    btn.onclick = () => {
      if (!origamiState || origamiState.phase !== 'input') return;
      const { audio, showNotification, progress } = getCtx();
      const dir = btn.dataset.dir;
      if (dir === origamiState.sequence[origamiState.playerIdx]) {
        origamiState.playerIdx++;
        audio.playSFX('click');
        if (origamiState.playerIdx >= origamiState.sequence.length) {
          origamiState.level++;
          audio.playSFX('success');
          showNotification(`📐 级别 ${origamiState.level}！`);
          progress.reportHighScore('origami', origamiState.level);
          setTimeout(nextRound, 600);
        }
      } else {
        origamiState.phase = 'idle';
        audio.playSFX('fail');
        const hl = loadHigh();
        if (origamiState.level - 1 > hl) { saveHigh(origamiState.level - 1); document.getElementById('origami-highlevel').textContent = origamiState.level - 1; }
        document.getElementById('origami-status').textContent = `❌ 失败！到达级别 ${origamiState.level - 1}`;
        document.getElementById('origami-start').textContent = '🔄 再来';
      }
    };
  });
}

export function hide() {
  document.getElementById('origami-overlay')?.classList.remove('visible');
  origamiState = null;
}

function startGame() {
  origamiState = { sequence: [], playerIdx: 0, level: 1, phase: 'show', showIdx: 0 };
  nextRound();
}

function nextRound() {
  if (!origamiState) return;
  const { audio } = getCtx();
  origamiState.sequence.push(ORIGAMI_DIRS[Math.floor(Math.random() * 6)]);
  origamiState.playerIdx = 0;
  origamiState.phase = 'show';
  origamiState.showIdx = 0;

  document.getElementById('origami-level').textContent = origamiState.level;
  document.getElementById('origami-seqlen').textContent = origamiState.sequence.length;
  document.getElementById('origami-status').textContent = '👀 观察序列...';
  document.getElementById('origami-display').textContent = '';

  let i = 0;
  const showNext = () => {
    if (i >= origamiState.sequence.length) {
      origamiState.phase = 'input';
      document.getElementById('origami-status').textContent = '👆 你的回合！';
      document.getElementById('origami-display').textContent = '❓';
      return;
    }
    const dir = origamiState.sequence[i];
    document.getElementById('origami-display').textContent = ORIGAMI_EMOJI[dir];
    audio.playSFX('click');
    i++;
    setTimeout(showNext, 600);
  };
  setTimeout(showNext, 400);
}
