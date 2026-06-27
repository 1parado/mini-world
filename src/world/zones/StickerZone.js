// StickerZone — 贴纸收集册
import { Zone } from '../Zone.js';

export class StickerZone extends Zone {
  constructor(x, y) {
    super('sticker', x, y, 180, 160, 155, '🏷️ 贴纸册');
    this.type = 'sticker';
  }
}
