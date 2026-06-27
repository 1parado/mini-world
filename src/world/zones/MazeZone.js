// 🌿 迷宫花园区域
import { Zone } from '../Zone.js';

export class MazeZone extends Zone {
  constructor(x, y) {
    super('maze', x, y, 180, 160, 175, '🌿 迷宫花园');
    this.type = 'maze';

    // 迷宫状态 — 由 main.js showMazeOverlay() 调用 generate()
    this.grid = [];
    this.playerPos = { r: 0, c: 0 };
    this.steps = 0;
    this.startTime = 0;
    this.solved = false;
    this.size = 9; // 9×9 通道
  }

  /** DFS 迷宫生成 (后序 carve) */
  generate() {
    const R = this.size * 2 + 1; // 实际网格尺寸 19×19
    const C = R;
    this.grid = Array.from({ length: R }, () => Array(C).fill(1)); // 1=墙
    this.playerPos = { r: 1, c: 1 };
    this.steps = 0;
    this.startTime = Date.now();
    this.solved = false;

    const visited = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    const carve = (r, c) => {
      visited[r][c] = true;
      this.grid[r * 2 + 1][c * 2 + 1] = 0; // 打通当前格
      const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
      for (const [dr, dc] of shuffled) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && !visited[nr][nc]) {
          this.grid[r * 2 + 1 + dr][c * 2 + 1 + dc] = 0; // 打通中间墙
          carve(nr, nc);
        }
      }
    };
    carve(0, 0);

    // 终点标记
    const exitR = (this.size - 1) * 2 + 1;
    const exitC = (this.size - 1) * 2 + 1;
    this.grid[exitR][exitC] = 2; // 2=出口
  }

  /** 移动玩家 — 返回 'ok' | 'wall' | 'win' */
  move(dr, dc) {
    if (this.solved) return 'win';
    const nr = this.playerPos.r + dr;
    const nc = this.playerPos.c + dc;
    const R = this.size * 2 + 1;
    if (nr < 0 || nr >= R || nc < 0 || nc >= R) return 'wall';
    if (this.grid[nr][nc] === 1) return 'wall';
    this.playerPos.r = nr;
    this.playerPos.c = nc;
    this.steps++;
    if (this.grid[nr][nc] === 2) {
      this.solved = true;
      return 'win';
    }
    return 'ok';
  }

  reset() {
    this.generate();
  }
}
