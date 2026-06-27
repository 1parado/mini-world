// CardZone — 卡牌翻翻乐，记忆配对小游戏
import { Zone } from '../Zone.js';

export class CardZone extends Zone {
  constructor(x, y) {
    super('card', x, y, 200, 150, 165, '🃏 卡牌翻翻乐');
    this.type = 'card';
  }
}
