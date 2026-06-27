// SharpenerZone — 铅笔刀节奏游戏
import { Zone } from '../Zone.js';

export class SharpenerZone extends Zone {
  constructor(x, y) {
    super('sharpener', x, y, 140, 130, 155, '✏️ 铅笔刀');
    this.type = 'sharpener';
  }
}
