// CapsuleZone — 时光胶囊
import { Zone } from '../Zone.js';

export class CapsuleZone extends Zone {
  constructor(x, y) {
    super('capsule', x, y, 160, 160, 155, '⏰ 时光胶囊');
    this.type = 'capsule';
  }
}
