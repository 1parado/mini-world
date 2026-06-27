// 🔮 魔法阵区域 — 按顺序激活符文
import { Zone } from '../Zone.js';

export class MagicZone extends Zone {
  constructor(x, y) {
    super('magic', x, y, 170, 170, 165, '🔮 魔法阵');
    this.type = 'magic';

    this.runeNames = ['火', '水', '风', '地', '光', '暗'];
    this.runeSymbols = ['🔥', '💧', '🌪️', '🪨', '✨', '🌑'];
    this.correctOrder = [];  // 每局随机
    this.activated = [];     // 已激活的符文索引列表
    this.currentStep = 0;
    this.completed = false;
    this.prophecy = '';
    this.prophecies = [
      '远方的风带来了好消息',
      '耐心等待，收获将至',
      '勇敢迈出下一步',
      '黑暗之后，必见光明',
      '旧友将重逢',
      '今日的汗水是明日的珍珠',
      '灵感如泉涌，创作正当时',
      '星光指引你前行',
      '放下执念，自在将至',
      '一切皆有可能',
      '温柔的坚持胜过激烈的争辩',
      '机缘已至，请伸手把握',
    ];
    this.init();
  }

  init() {
    // 随机生成激活顺序
    this.correctOrder = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    this.activated = [];
    this.currentStep = 0;
    this.completed = false;
    this.prophecy = '';
  }

  /** 尝试激活一个符文 → 'ok'|'wrong'|'complete' */
  activate(index) {
    if (this.completed) return 'complete';
    if (this.activated.includes(index)) return 'ok'; // 已激活

    if (this.correctOrder[this.currentStep] === index) {
      this.activated.push(index);
      this.currentStep++;
      if (this.currentStep >= 6) {
        this.completed = true;
        this.prophecy = this.prophecies[Math.floor(Math.random() * this.prophecies.length)];
        return 'complete';
      }
      return 'ok';
    } else {
      // 错误 — 重置
      this.activated = [];
      this.currentStep = 0;
      return 'wrong';
    }
  }

  reset() { this.init(); }
}
