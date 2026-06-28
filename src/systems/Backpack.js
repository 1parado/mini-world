// Backpack.js — 背包系统核心
// 存储从手工坊购买的装饰物，支持堆叠、持久化
// 搭配放置模式：从背包选择 → 点击世界任意位置放置

const STORAGE_KEY = 'backpack-items';

export class Backpack {
  constructor() {
    this.items = []; // [{ id, name, type, count }]
    this.load();
  }

  /** 购买装饰后加入背包 */
  addItem(decoId, decoName, type = 'decoration') {
    const existing = this.items.find(i => i.id === decoId);
    if (existing) {
      existing.count++;
    } else {
      this.items.push({ id: decoId, name: decoName, type, count: 1 });
    }
    this.save();
  }

  /** 放置时消耗一个，返回是否成功 */
  removeItem(decoId) {
    const item = this.items.find(i => i.id === decoId);
    if (!item || item.count <= 0) return false;
    item.count--;
    if (item.count <= 0) {
      this.items = this.items.filter(i => i.id !== decoId);
    }
    this.save();
    return true;
  }

  /** 获取所有背包物品 */
  getItems() {
    return [...this.items];
  }

  /** 背包是否为空 */
  isEmpty() {
    return this.items.length === 0;
  }

  /** 获取指定物品的数量 */
  getCount(decoId) {
    const item = this.items.find(i => i.id === decoId);
    return item ? item.count : 0;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch { /* ignore */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.items = JSON.parse(raw);
    } catch { this.items = []; }
  }
}
