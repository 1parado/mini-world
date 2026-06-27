// InkwellZone — 墨水台配色游戏
import { Zone } from '../Zone.js';

export class InkwellZone extends Zone {
  constructor(x, y) {
    super('inkwell', x, y, 160, 140, 155, '🪄 墨水台');
    this.type = 'inkwell';
  }
}
