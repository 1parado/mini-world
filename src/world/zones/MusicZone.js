// MusicZone — 音乐盒，靠近可以听简单旋律
import { Zone } from '../Zone.js';

export class MusicZone extends Zone {
  constructor(x, y) {
    super('music', x, y, 120, 100, 150, '🎵 音乐盒');
    this.type = 'music';
    this.isPlaying = false;
    this.currentMelody = 0;
    this.audioCtx = null;
  }

  stop() {
    this.isPlaying = false;
    if (this._oscNodes) {
      this._oscNodes.forEach(n => { try { n.stop(); } catch(e) {} });
      this._oscNodes = [];
    }
  }
}
