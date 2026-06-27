// AbacusZone — 算盘数学挑战
import { Zone } from '../Zone.js';

export class AbacusZone extends Zone {
  constructor(x, y) {
    super('abacus', x, y, 200, 150, 155, '🧮 算盘');
    this.type = 'abacus';
  }
}
