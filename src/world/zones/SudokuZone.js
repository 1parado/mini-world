// 🔢 数独角区域 — 4×4 简易数独
import { Zone } from '../Zone.js';

export class SudokuZone extends Zone {
  constructor(x, y) {
    super('sudoku', x, y, 160, 160, 155, '🔢 数独角');
    this.type = 'sudoku';

    this.puzzle = [];      // 4×4 初始题目（0=空）
    this.solution = [];    // 4×4 解答
    this.userInput = [];   // 4×4 玩家输入（0=未填）
    this.errors = 0;
    this.solved = false;
    this.generate();
  }

  /** 生成4×4数独 */
  generate() {
    this.errors = 0;
    this.solved = false;
    this.userInput = Array.from({ length: 4 }, () => Array(4).fill(0));

    // 生成基础4×4（2×2宫格）
    const base = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ];
    // 随机打乱行(同一band内)和列(同一stack内)以增加变化
    const shuffleBand = () => {
      const a = Math.random() < 0.5 ? [0, 1] : [1, 0];
      const b = Math.random() < 0.5 ? [2, 3] : [3, 2];
      return [base[a[0]], base[a[1]], base[b[0]], base[b[1]]];
    };
    const rows = shuffleBand();
    // 打乱列
    const colOrder = [0, 1, 2, 3];
    // 同stack内交换
    if (Math.random() < 0.5) { [colOrder[0], colOrder[1]] = [colOrder[1], colOrder[0]]; }
    if (Math.random() < 0.5) { [colOrder[2], colOrder[3]] = [colOrder[3], colOrder[2]]; }

    this.solution = rows.map(r => colOrder.map(c => r[c]));

    // 挖空 8 个格子
    this.puzzle = this.solution.map(r => [...r]);
    const cells = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cells.push([r, c]);
    // 随机选8个挖空
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    for (let k = 0; k < 8; k++) {
      const [r, c] = cells[k];
      this.puzzle[r][c] = 0;
    }
    this.userInput = this.puzzle.map(r => [...r]);
  }

  /** 填入数字 → 返回 'ok'|'error'|'win' */
  fill(r, c, num) {
    if (this.solved) return 'win';
    if (this.puzzle[r][c] !== 0) return 'ok'; // 预设格不可改
    this.userInput[r][c] = num;
    // 校验
    if (num !== this.solution[r][c]) {
      this.errors++;
      return 'error';
    }
    // 检查是否全部填完
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        if (this.userInput[i][j] === 0) return 'ok';
    this.solved = true;
    return 'win';
  }

  reset() { this.generate(); }
}
