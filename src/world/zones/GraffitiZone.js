// GraffitiZone — 涂鸦墙，靠近可以看涂鸦
import { Zone } from '../Zone.js';

export class GraffitiZone extends Zone {
  constructor(x, y) {
    super('graffiti', x, y, 280, 160, 170, '🖊️ 涂鸦墙');
    this.type = 'graffiti';
  }
}
