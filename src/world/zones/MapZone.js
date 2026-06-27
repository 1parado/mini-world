// 🗺️ 地图墙区域 — 迷你鸟瞰世界地图
import { Zone } from '../Zone.js';

export class MapZone extends Zone {
  constructor(x, y) {
    super('map', x, y, 200, 160, 170, '🗺️ 地图墙');
    this.type = 'map';
    // 地图数据由 main.js 实时从 GameWorld 获取
  }
}
