// ⏳ 时光沙漏区域
import { Zone } from '../Zone.js';

export class HourglassZone extends Zone {
  constructor(x, y) {
    super('hourglass', x, y, 120, 180, 165, '⏳ 时光沙漏');
    this.type = 'hourglass';

    this.isFlipped = false;
    this.sandLevel = 1.0;    // 1=满 → 0=空
    this.startTime = 0;
    this.duration = 30;      // 30秒
    this.quote = '';
    this.flipCount = 0;
    this.quotes = [
      '时间是最公平的裁判，给每个人同样的24小时。',
      '此刻打盹，你将做梦；此刻学习，你将圆梦。',
      '逝者如斯夫，不舍昼夜。 — 孔子',
      '时间就像海绵里的水，只要愿挤，总还是有的。 — 鲁迅',
      '昨日之深渊，今日之浅谈。',
      '珍惜今天，就是昨天的梦想。',
      '一万年太久，只争朝夕。 — 毛泽东',
      '生命是以时间为单位的，浪费别人的时间等于谋财害命。 — 鲁迅',
      '最严重的浪费就是时间的浪费。',
      '抛弃时间的人，时间也抛弃他。 — 莎士比亚',
      '时间是最好的医生。 — 法国谚语',
      '盛年不重来，一日难再晨。 — 陶渊明',
      '你热爱生命吗？那么别浪费时间。 — 富兰克林',
      '完成工作的方法是爱惜每一分钟。 — 达尔文',
      '时光不老，我们不散。',
    ];
  }

  /** 翻转沙漏 */
  flip() {
    this.isFlipped = true;
    this.sandLevel = 1.0;
    this.startTime = Date.now();
    this.quote = '';
    this.flipCount++;
  }

  /** 每帧更新沙子 */
  updateSand() {
    if (!this.isFlipped) return;
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.sandLevel = Math.max(0, 1 - elapsed / this.duration);
    if (this.sandLevel <= 0) {
      this.isFlipped = false;
      this.sandLevel = 0;
      this.quote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
    }
  }
}
