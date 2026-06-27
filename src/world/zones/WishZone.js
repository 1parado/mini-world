// 🪙 许愿池区域
import { Zone } from '../Zone.js';

export class WishZone extends Zone {
  constructor(x, y) {
    super('wish', x, y, 160, 140, 155, '🪙 许愿池');
    this.type = 'wish';

    this.wishes = [];
    this.coinCount = 0;
  }

  /** 投币许愿 */
  addWish(text) {
    this.coinCount++;
    this.wishes.unshift({
      text,
      time: Date.now(),
    });
    // 最多保留20条
    if (this.wishes.length > 20) this.wishes.pop();
    return this.wishes[0];
  }
}
