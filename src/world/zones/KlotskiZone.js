// 🏯 华容道区域 — 简化5×4棋盘
import { Zone } from '../Zone.js';

export class KlotskiZone extends Zone {
  constructor(x, y) {
    super('klotski', x, y, 180, 200, 185, '🏯 华容道');
    this.type = 'klotski';

    this.board = []; // 5行×4列，0=空, 1=曹操, 2=竖将, 3=横将, 4=小兵
    this.blocks = [];
    this.moves = 0;
    this.solved = false;
    this.init();
  }

  init() {
    this.moves = 0;
    this.solved = false;
    // 经典横刀立马布局
    // 5×4 棋盘：0=空, 用block对象管理
    this.blocks = [
      { id: 1, name: '曹操', r: 0, c: 1, w: 2, h: 2, color: '#EA5455' },
      { id: 2, name: '关羽', r: 2, c: 1, w: 2, h: 1, color: '#077B8A' },
      { id: 3, name: '张飞', r: 0, c: 0, w: 1, h: 2, color: '#8B7355' },
      { id: 4, name: '赵云', r: 0, c: 3, w: 1, h: 2, color: '#5B8C5A' },
      { id: 5, name: '马超', r: 2, c: 0, w: 1, h: 2, color: '#9B59B6' },
      { id: 6, name: '黄忠', r: 2, c: 3, w: 1, h: 2, color: '#E67E22' },
      { id: 7, name: '兵', r: 3, c: 1, w: 1, h: 1, color: '#95A5A6' },
      { id: 8, name: '兵', r: 3, c: 2, w: 1, h: 1, color: '#95A5A6' },
      { id: 9, name: '兵', r: 4, c: 0, w: 1, h: 1, color: '#95A5A6' },
      { id: 10, name: '兵', r: 4, c: 3, w: 1, h: 1, color: '#95A5A6' },
    ];
    this._rebuildBoard();
  }

  _rebuildBoard() {
    this.board = Array.from({ length: 5 }, () => Array(4).fill(0));
    for (const b of this.blocks) {
      for (let r = b.r; r < b.r + b.h; r++) {
        for (let c = b.c; c < b.c + b.w; c++) {
          this.board[r][c] = b.id;
        }
      }
    }
  }

  /** 尝试将 blockId 向 dr,dc 方向移动一步 → 返回 true/false */
  tryMove(blockId, dr, dc) {
    if (this.solved) return false;
    const block = this.blocks.find(b => b.id === blockId);
    if (!block) return false;

    const newR = block.r + dr;
    const newC = block.c + dc;

    // 边界检查
    if (newR < 0 || newR + block.h > 5 || newC < 0 || newC + block.w > 4) return false;

    // 目标区域必须全空（不包含自身占据的格）
    for (let r = newR; r < newR + block.h; r++) {
      for (let c = newC; c < newC + block.w; c++) {
        if (this.board[r][c] !== 0 && this.board[r][c] !== block.id) return false;
      }
    }

    // 执行移动
    block.r = newR;
    block.c = newC;
    this._rebuildBoard();
    this.moves++;

    // 胜利条件：曹操(2×2)到达 r=3, c=1
    const caocao = this.blocks[0];
    if (caocao.r === 3 && caocao.c === 1) {
      this.solved = true;
    }
    return true;
  }

  /** 点击某格 → 找到该格的方块 → 自动检测可移方向 */
  clickCell(r, c) {
    if (r < 0 || r >= 5 || c < 0 || c >= 4) return false;
    const id = this.board[r][c];
    if (id === 0) return false;
    const block = this.blocks.find(b => b.id === id);
    if (!block) return false;

    // 尝试4个方向
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      if (this.tryMove(id, dr, dc)) return true;
    }
    return false;
  }

  reset() { this.init(); }
}
