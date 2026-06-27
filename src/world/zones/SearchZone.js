// SearchZone.js — 搜索台区域
// 在世界中显示为「🔍 搜索台」，玩家走近按F打开搜索弹窗
// 搜索所有场景并支持一键传送跳转

import { Zone } from '../Zone.js';

export class SearchZone extends Zone {
  constructor(x, y) {
    super('search', x, y, 200, 160, 65, '🔍 搜索台');
    this.type = 'search';
  }
}
