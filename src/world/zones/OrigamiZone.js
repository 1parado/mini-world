// OrigamiZone — 折纸桌 Simon Says
import { Zone } from '../Zone.js';

export class OrigamiZone extends Zone {
  constructor(x, y) {
    super('origami', x, y, 180, 150, 155, '🦢 折纸桌');
    this.type = 'origami';
  }
}
