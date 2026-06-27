// AudioManager — Web Audio API 音效 + BGM 管理器
// 纯代码合成，无外部音频文件

const STORAGE_KEY = 'stellar-audio-config';

// 音效频率定义
const SFX_DEFS = {
  step:      { freq: 220,  dur: 0.06, type: 'sine',     vol: 0.08 },
  interact:  { freq: 880,  dur: 0.15, type: 'sine',     vol: 0.12 },
  teleport:  { freq: 440,  dur: 0.3,  type: 'sine',     vol: 0.10, sweep: true },
  click:     { freq: 660,  dur: 0.08, type: 'sine',     vol: 0.08 },
  success:   { freq: 523,  dur: 0.4,  type: 'triangle', vol: 0.12, arpeggio: [523, 659, 784] },
  fail:      { freq: 330,  dur: 0.25, type: 'sawtooth', vol: 0.08, arpeggio: [330, 277] },
  flip:      { freq: 1200, dur: 0.08, type: 'sine',     vol: 0.06 },
  dice:      { freq: 180,  dur: 0.1,  type: 'triangle', vol: 0.10, repeat: 3 },
  dart:      { freq: 700,  dur: 0.12, type: 'sawtooth', vol: 0.08 },
  collect:   { freq: 523,  dur: 0.35, type: 'sine',     vol: 0.10, arpeggio: [523, 659, 784, 1047] },
  open:      { freq: 440,  dur: 0.15, type: 'triangle', vol: 0.10 },
  lock:      { freq: 200,  dur: 0.15, type: 'square',   vol: 0.06 },
  perfect:   { freq: 880,  dur: 0.2,  type: 'sine',     vol: 0.12 },
  good:      { freq: 660,  dur: 0.15, type: 'sine',     vol: 0.10 },
  miss:      { freq: 165,  dur: 0.2,  type: 'sawtooth', vol: 0.06 },
};

// BGM 和弦序列（C大调柔和和弦）
const BGM_CHORDS = [
  [261.63, 329.63, 392.00],  // C大调
  [220.00, 261.63, 329.63],  // Am
  [246.94, 311.13, 369.99],  // F大调
  [196.00, 246.94, 293.66],  // G大调
];

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;

    // 配置（从 localStorage 加载）
    const saved = this._loadSaved();
    this.enabled   = saved.enabled   ?? true;
    this.bgmVolume = saved.bgmVolume ?? 0.15;
    this.sfxVolume = saved.sfxVolume ?? 0.5;

    // BGM 状态
    this._bgmPlaying = false;
    this._bgmTimer = null;
    this._bgmChordIdx = 0;
    this._bgmOscs = [];

    // 最后脚步时间（节流）
    this._lastStepTime = 0;
  }

  // ── 初始化 ──────────────────────────────────

  _loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        enabled: this.enabled,
        bgmVolume: this.bgmVolume,
        sfxVolume: this.sfxVolume,
      }));
    } catch { /* ignore */ }
  }

  /** 懒初始化 AudioContext（必须在用户交互之后调用） */
  _ensureCtx() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    // 增益链: sfxGain → masterGain → destination
    //         bgmGain → masterGain → destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? 1 : 0;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.bgmVolume;
    this.bgmGain.connect(this.masterGain);
  }

  /** 用户首次交互时调用，确保 AudioContext 可以播放 */
  resume() {
    this._ensureCtx();
  }

  // ── 开关 + 音量 ────────────────────────────

  setEnabled(v) {
    this.enabled = v;
    if (this.masterGain) this.masterGain.gain.value = v ? 1 : 0;
    if (!v) this.stopBGM();
    this.save();
  }

  setSFXVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
    this.save();
  }

  setBGMVolume(v) {
    this.bgmVolume = v;
    if (this.bgmGain) this.bgmGain.gain.value = v;
    this.save();
  }

  // ── 音效播放 ───────────────────────────────

  playSFX(name) {
    if (!this.enabled) return;
    this._ensureCtx();
    if (!this.ctx) return;

    const def = SFX_DEFS[name];
    if (!def) return;

    // 脚步声节流：至少间隔 280ms
    if (name === 'step') {
      const now = performance.now();
      if (now - this._lastStepTime < 280) return;
      this._lastStepTime = now;
    }

    if (def.arpeggio) {
      this._playArpeggio(def);
    } else if (def.repeat) {
      this._playRepeat(def);
    } else {
      this._playOne(def);
    }
  }

  _playOne(def) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = def.type;
    osc.frequency.value = def.freq;

    // 传送滑音
    if (def.sweep) {
      osc.frequency.setValueAtTime(def.freq * 0.5, t);
      osc.frequency.exponentialRampToValueAtTime(def.freq * 2, t + def.dur);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(def.vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + def.dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + def.dur + 0.05);
  }

  _playArpeggio(def) {
    const t = this.ctx.currentTime;
    const noteGap = def.dur / def.arpeggio.length;
    def.arpeggio.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = def.type;
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t + i * noteGap);
      gain.gain.linearRampToValueAtTime(def.vol, t + i * noteGap + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * noteGap + noteGap);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * noteGap);
      osc.stop(t + i * noteGap + noteGap + 0.05);
    });
  }

  _playRepeat(def) {
    for (let r = 0; r < def.repeat; r++) {
      const offset = r * (def.dur + 0.02);
      const t = this.ctx.currentTime + offset;
      const osc = this.ctx.createOscillator();
      osc.type = def.type;
      // 音高随机微调
      osc.frequency.value = def.freq + Math.random() * 60;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(def.vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + def.dur);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + def.dur + 0.05);
    }
  }

  // ── BGM ─────────────────────────────────────

  startBGM() {
    if (!this.enabled || this._bgmPlaying) return;
    this._ensureCtx();
    if (!this.ctx) return;

    this._bgmPlaying = true;
    this._bgmChordIdx = 0;
    this._playBGMSchedule();
  }

  stopBGM() {
    this._bgmPlaying = false;
    if (this._bgmTimer) { clearTimeout(this._bgmTimer); this._bgmTimer = null; }
    // 淡出当前和弦
    this._bgmOscs.forEach(({ osc, gain }) => {
      try {
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        osc.stop(this.ctx.currentTime + 0.6);
      } catch { /* already stopped */ }
    });
    this._bgmOscs = [];
  }

  _playBGMSchedule() {
    if (!this._bgmPlaying) return;
    const chordFreqs = BGM_CHORDS[this._bgmChordIdx % BGM_CHORDS.length];
    this._playChord(chordFreqs, 3.0); // 每个和弦3秒

    this._bgmChordIdx++;
    this._bgmTimer = setTimeout(() => {
      if (this._bgmPlaying) this._playBGMSchedule();
    }, 3000);
  }

  _playChord(freqs, duration) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const newOscs = [];

    freqs.forEach(freq => {
      // 主音（柔和正弦波）
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq;
      const g1 = this.ctx.createGain();
      g1.gain.setValueAtTime(0.001, t);
      g1.gain.linearRampToValueAtTime(0.04, t + 0.8);
      g1.gain.setValueAtTime(0.04, t + duration - 1.0);
      g1.gain.linearRampToValueAtTime(0.001, t + duration);
      osc1.connect(g1);
      g1.connect(this.bgmGain);
      osc1.start(t);
      osc1.stop(t + duration + 0.1);

      // 泛音（高一个八度，很小声）
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 2;
      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.001, t);
      g2.gain.linearRampToValueAtTime(0.012, t + 1.0);
      g2.gain.setValueAtTime(0.012, t + duration - 1.2);
      g2.gain.linearRampToValueAtTime(0.001, t + duration);
      osc2.connect(g2);
      g2.connect(this.bgmGain);
      osc2.start(t);
      osc2.stop(t + duration + 0.1);

      newOscs.push({ osc: osc1, gain: g1 }, { osc: osc2, gain: g2 });
    });

    // 停掉旧和弦
    this._bgmOscs.forEach(({ osc, gain }) => {
      try {
        gain.gain.linearRampToValueAtTime(0.001, t + 0.5);
        osc.stop(t + 0.6);
      } catch { /* already stopped */ }
    });
    this._bgmOscs = newOscs;
  }

}

// 全局单例
export const audio = new AudioManager();
