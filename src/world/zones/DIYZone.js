// DIYZone.js — 🎨 手工坊区域
import { Zone } from '../Zone.js';

export class DIYZone extends Zone {
  constructor(x, y) {
    super('diy', x, y, 200, 170, 140, '🎨 手工坊');
    this.type = 'diy';
    // 用户放置的装饰物（localStorage 持久化）
    this.placedDecorations = [];
    this._loadPlacedDecorations();
  }

  addPlacedDecoration(deco) {
    this.placedDecorations.push(deco);
    this._savePlacedDecorations();
  }

  removePlacedDecoration(index) {
    if (index >= 0 && index < this.placedDecorations.length) {
      this.placedDecorations.splice(index, 1);
      this._savePlacedDecorations();
    }
  }

  _loadPlacedDecorations() {
    try {
      const raw = localStorage.getItem('diy-placed-decorations');
      if (raw) this.placedDecorations = JSON.parse(raw);
    } catch { /* ignore */ }
  }

  _savePlacedDecorations() {
    try {
      localStorage.setItem('diy-placed-decorations', JSON.stringify(this.placedDecorations));
    } catch { /* ignore */ }
  }
}
