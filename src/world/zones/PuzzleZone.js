// 🧩 拼图桌区域 — 3×3 滑块拼图
import { Zone } from '../Zone.js';

export class PuzzleZone extends Zone {
  constructor(x, y) {
    super('puzzle', x, y, 170, 150, 165, '🧩 拼图桌');
    this.type = 'puzzle';

    this.tiles = [];      // [1,2,3,...,8,0]  0=空格
    this.emptyIdx = 8;
    this.moves = 0;
    this.startTime = 0;
    this.solved = false;
  }

  /** 初始化 & 洗牌 (从已解状态做随机合法移动) */
  init() {
    this.tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    this.emptyIdx = 8;
    this.moves = 0;
    this.startTime = Date.now();
    this.solved = false;

    // 做100次随机合法移动保证可解
    for (let i = 0; i < 100; i++) {
      const neighbors = this._getNeighbors(this.emptyIdx);
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      this._swap(pick, this.emptyIdx);
      this.emptyIdx = pick;
    }
  }

  /** 尝试移动 idx 处的方块 → 返回 true/false */
  tryMove(idx) {
    if (this.solved) return false;
    const neighbors = this._getNeighbors(this.emptyIdx);
    if (!neighbors.includes(idx)) return false;
    this._swap(idx, this.emptyIdx);
    this.emptyIdx = idx;
    this.moves++;
    // 检查胜利
    for (let i = 0; i < 8; i++) {
      if (this.tiles[i] !== i + 1) return true;
    }
    this.solved = true;
    return true;
  }

  _getNeighbors(idx) {
    const r = Math.floor(idx / 3), c = idx % 3;
    const n = [];
    if (r > 0) n.push(idx - 3);
    if (r < 2) n.push(idx + 3);
    if (c > 0) n.push(idx - 1);
    if (c < 2) n.push(idx + 1);
    return n;
  }

  _swap(a, b) {
    [this.tiles[a], this.tiles[b]] = [this.tiles[b], this.tiles[a]];
  }

  reset() { this.init(); }
}
