// CoffeeZone — 咖啡角，靠近享用咖啡/甜点
import { Zone } from '../Zone.js';

export class CoffeeZone extends Zone {
  constructor(x, y) {
    super('coffee', x, y, 180, 150, 170, '☕ 咖啡角');
    this.type = 'coffee';
  }
}
