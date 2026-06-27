// ⭐ 星座仪区域 — 连接星星画星座
import { Zone } from '../Zone.js';

export class ConstellationZone extends Zone {
  constructor(x, y) {
    super('constellation', x, y, 180, 160, 165, '⭐ 星座仪');
    this.type = 'constellation';

    this.constellations = [
      {
        name: '北斗七星',
        story: '北斗七星指引着旅人的方向，千年不变。',
        stars: [
          { x: 50, y: 80 }, { x: 90, y: 70 }, { x: 130, y: 60 },
          { x: 170, y: 65 }, { x: 200, y: 90 }, { x: 230, y: 110 }, { x: 250, y: 95 },
        ],
        connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]],
      },
      {
        name: '猎户座',
        story: '猎户是夜空中最耀眼的猎人，肩披繁星。',
        stars: [
          { x: 120, y: 40 }, { x: 180, y: 40 },  // 肩
          { x: 140, y: 80 }, { x: 150, y: 85 }, { x: 160, y: 80 },  // 腰带
          { x: 110, y: 140 }, { x: 180, y: 140 },  // 脚
        ],
        connections: [[0,2],[1,4],[2,3],[3,4],[2,5],[4,6]],
      },
      {
        name: '仙后座',
        story: '仙后座的W形如王冠一般闪耀在北天。',
        stars: [
          { x: 50, y: 80 }, { x: 100, y: 40 }, { x: 150, y: 80 },
          { x: 200, y: 40 }, { x: 250, y: 80 },
        ],
        connections: [[0,1],[1,2],[2,3],[3,4]],
      },
    ];
    this.currentIdx = 0;
    this.userConnections = [];
    this.completed = [];
    this.lastStar = -1;
  }

  get current() {
    return this.constellations[this.currentIdx];
  }

  /** 点击一颗星 → 尝试与前一颗连线 → 'ok'|'done'|'next' */
  clickStar(starIdx) {
    if (this.completed.includes(this.currentIdx)) return 'done';
    if (this.lastStar === -1) {
      this.lastStar = starIdx;
      return 'ok';
    }
    if (starIdx === this.lastStar) return 'ok';
    // 检查这条线是否在正确连接中
    const conn = this.current.connections;
    const a = this.lastStar, b = starIdx;
    const isCorrect = conn.some(([c1, c2]) =>
      (c1 === a && c2 === b) || (c1 === b && c2 === a));
    const alreadyDone = this.userConnections.some(([c1, c2]) =>
      (c1 === a && c2 === b) || (c1 === b && c2 === a));

    if (isCorrect && !alreadyDone) {
      this.userConnections.push([a, b]);
      this.lastStar = starIdx;
      // 是否全部连完
      if (this.userConnections.length >= conn.length) {
        this.completed.push(this.currentIdx);
        this.lastStar = -1;
        return 'complete';
      }
      return 'ok';
    } else if (alreadyDone) {
      this.lastStar = starIdx;
      return 'ok';
    } else {
      // 错误连线，重置
      this.userConnections = [];
      this.lastStar = -1;
      return 'wrong';
    }
  }

  /** 切换到下一个星座 */
  nextConstellation() {
    const next = (this.currentIdx + 1) % this.constellations.length;
    this.currentIdx = next;
    this.userConnections = [];
    this.lastStar = -1;
  }

  prevConstellation() {
    const prev = (this.currentIdx - 1 + this.constellations.length) % this.constellations.length;
    this.currentIdx = prev;
    this.userConnections = [];
    this.lastStar = -1;
  }

  resetCurrent() {
    this.userConnections = [];
    this.lastStar = -1;
  }
}
