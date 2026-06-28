// musicOverlay.js — 🎵 音乐盒
import { getCtx } from '../overlays/OverlayContext.js';

const MELODIES = [
  { name: '小星星', notes: [523,523,784,784,880,880,784,0, 698,698,659,659,587,587,523] },
  { name: '欢乐颂', notes: [659,659,698,784,784,698,659,587, 523,523,587,659,659,0,587,587] },
  { name: '两只老虎', notes: [523,587,659,523, 523,587,659,523, 659,698,784,0, 659,698,784] },
];

let musicAudioCtx = null;
let musicPlaying = false;
let musicCurrentMelody = 0;
let musicNoteTimer = null;
let musicMelodiesListened = new Set(); // 追踪已听完的曲目

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('music-overlay', 'music-close');
  document.getElementById('music-overlay').classList.add('visible');
  renderMusicUI();
}

export function hide() {
  document.getElementById('music-overlay')?.classList.remove('visible');
}

/** 供 ESC 全局调用来停止播放 */
export function stopMelody() {
  musicPlaying = false;
  if (musicNoteTimer) { clearTimeout(musicNoteTimer); musicNoteTimer = null; }
  renderMusicUI();
}

function renderMusicUI() {
  const melodyNameEl = document.getElementById('music-melody-name');
  if (melodyNameEl) melodyNameEl.textContent = MELODIES[musicCurrentMelody].name;

  const playBtn = document.getElementById('music-play');
  const stopBtn = document.getElementById('music-stop');
  const prevBtn = document.getElementById('music-prev');
  const nextBtn = document.getElementById('music-next');
  const statusEl = document.getElementById('music-status');

  if (playBtn) playBtn.onclick = () => playMelody();
  if (stopBtn) stopBtn.onclick = () => stopMelody();
  if (prevBtn) prevBtn.onclick = () => { musicCurrentMelody = (musicCurrentMelody - 1 + MELODIES.length) % MELODIES.length; renderMusicUI(); };
  if (nextBtn) nextBtn.onclick = () => { musicCurrentMelody = (musicCurrentMelody + 1) % MELODIES.length; renderMusicUI(); };
  if (statusEl) statusEl.textContent = musicPlaying ? '🔊 播放中' : '🔇 已暂停';

  /* 黑胶唱片旋转动画 */
  const vinylEl = document.getElementById('music-vinyl');
  if (vinylEl) vinylEl.classList.toggle('playing', musicPlaying);
}

function playMelody() {
  if (musicPlaying) return;
  musicPlaying = true;

  if (!musicAudioCtx) {
    musicAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const melody = MELODIES[musicCurrentMelody];
  let noteIdx = 0;
  const noteDuration = 0.25;

  function playNext() {
    if (!musicPlaying || noteIdx >= melody.notes.length) {
      musicPlaying = false;
      /* 记录听完的曲目，3首全部听完 → 音乐家成就 */
      musicMelodiesListened.add(musicCurrentMelody);
      if (musicMelodiesListened.size >= MELODIES.length) {
        const { progress } = getCtx();
        progress.markMusicListened();
      }
      renderMusicUI();
      return;
    }
    const freq = melody.notes[noteIdx];
    if (freq > 0) {
      const osc = musicAudioCtx.createOscillator();
      const gain = musicAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, musicAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, musicAudioCtx.currentTime + noteDuration);
      osc.connect(gain);
      gain.connect(musicAudioCtx.destination);
      osc.start();
      osc.stop(musicAudioCtx.currentTime + noteDuration);
    }
    noteIdx++;
    musicNoteTimer = setTimeout(playNext, noteDuration * 1000);
  }

  playNext();
  renderMusicUI();
}
