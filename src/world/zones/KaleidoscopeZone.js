// 🔆 万花筒区域
import { Zone } from '../Zone.js';

export class KaleidoscopeZone extends Zone {
  constructor(x, y) {
    super('kaleidoscope', x, y, 150, 150, 155, '🔆 万花筒');
    this.type = 'kaleidoscope';

    this.segments = 8;   // 镜片数 6-12
    this.hue = 0;        // 色相 0-360
    this.speed = 1.0;    // 旋转速度 0.5-3.0
    this.rotation = 0;   // 当前旋转角
  }

  setSegments(val) { this.segments = Math.max(4, Math.min(12, val)); }
  setHue(val) { this.hue = ((val % 360) + 360) % 360; }
  setSpeed(val) { this.speed = Math.max(0.2, Math.min(3.0, val)); }

  /** 每帧更新旋转 */
  tick(delta) {
    this.rotation += delta * this.speed * 0.5;
  }
}
