// SpinZone — 幸运转盘，靠近可以旋转转盘
import { Zone } from '../Zone.js';

export class SpinZone extends Zone {
  constructor(x, y) {
    super('spin', x, y, 160, 170, 160, '🎰 幸运转盘');
    this.type = 'spin';
    this.lastResult = null;
    this.spinCount = 0;
  }

  spin() {
    const prizes = [
      { text: '今天运气不错 ✨', color: '#FFD54F' },
      { text: '画一幅风景画 🎨', color: '#26A69A' },
      { text: '写一首小诗 📝', color: '#7E57C2' },
      { text: '休息一下喝杯茶 🍵', color: '#8B7355' },
      { text: '灵感大爆发 💡', color: '#EA5455' },
      { text: '记录心情感悟 💭', color: '#077B8A' },
      { text: '尝试新的颜色 🌈', color: '#F4A460' },
      { text: '给朋友画张像 👤', color: '#3D5A80' },
    ];
    const idx = Math.floor(Math.random() * prizes.length);
    this.lastResult = prizes[idx];
    this.spinCount++;
    return { prize: prizes[idx], index: idx };
  }
}
