// NPC.js — 墨水瓶精灵，在世界中漫步的可交互角色
// 复用 drawPlayer 的外观接口，沿路径点巡逻

import { drawPlayer, mergeAppearance } from './WorldRenderer.js';

const NPC_SPEED = 55; // 比玩家慢很多

// ── 墨水瓶精灵外观 ──
export const INKWELL_SPIRIT_APPEARANCE = {
  skin:     '#283593',
  skinDark: '#1A237E',
  hair:     '#1A237E',
  shirt:    '#3949AB',
  shirtDark:'#283593',
  pants:    '#1A237E',
  hat:      '#0D47A1',
  hatDark:  '#0D47A1',
  scarf:    '#82B1FF',
  shoe:     '#1A237E',
  cheek:    '#7986CB',
  hairStyle:'bald',
  hatStyle: 'beanie',
  scarfOn:  true,
};

// ── 对话池 ──
const DIALOG_POOLS = {
  inkwell: [
    '需要墨水吗？💧',
    '在这片世界里，每一笔都有意义 ✨',
    '墨水是思维的河流~',
    '我收集了好多颜色的墨水呢 🎨',
    '写字时别忘了休息哦 ☕',
    '小心别把墨水打翻了！',
    '夜晚的墨水格外闪亮 🌙',
  ],
  paper_sprite: [
    '纸飞机去旅行了 ✈️',
    '我的朋友纸鹤又起飞啦~',
    '你折过千纸鹤吗？🦢',
    '在这片纸上，一切皆有可能',
    '纸张的魔法，你感受到了吗？✨',
    '轻轻的，我就能飘起来~',
  ],
  bookmark: [
    '帮你记住来时的路 📖',
    '别忘了回去看看日记哦~',
    '我是这片世界的书签!',
    '迷路了吗？跟我说说 🗺️',
    '每页故事都值得被标记',
    '我住在这本书的两页之间~',
  ],
};

export class NPC {
  /**
   * @param {string} id - NPC 标识
   * @param {number} x - 出生X
   * @param {number} y - 出生Y
   * @param {{x:number,y:number}[]} waypoints - 巡逻路径点
   * @param {object} appearance - 外观（mergeAppearance 格式）
   * @param {string} dialogPoolKey - 对话池键名
   * @param {string} name - NPC 名字
   * @param {number} [interactRadius=80] - 互动距离
   */
  constructor(id, x, y, waypoints, appearance, dialogPoolKey, name, interactRadius = 80) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.waypoints = waypoints;
    this.appearance = appearance;
    this.dialogPoolKey = dialogPoolKey;
    this.name = name;
    this.interactRadius = interactRadius;

    this.currentWaypoint = 0;
    this.direction = 'down';
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.isMoving = true;
    this.playerNear = false;
    this._lastDialog = '';
  }

  update(delta) {
    if (this.waypoints.length === 0) return;

    const target = this.waypoints[this.currentWaypoint];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 12) {
      // 到达路径点，切换下一个
      this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
      this.isMoving = false;
      return;
    }

    // 向目标移动
    const nx = dx / dist;
    const ny = dy / dist;
    const speed = NPC_SPEED * delta;
    this.x += nx * speed;
    this.y += ny * speed;

    // 方向判定
    if (Math.abs(nx) > Math.abs(ny)) {
      this.direction = nx > 0 ? 'right' : 'left';
    } else {
      this.direction = ny > 0 ? 'down' : 'up';
    }

    this.isMoving = true;
    this.walkTimer += delta;
    if (this.walkTimer > 0.22) {
      this.walkFrame = this.walkFrame === 0 ? 1 : 0;
      this.walkTimer = 0;
    }
  }

  /** 检测玩家是否在互动范围内 */
  checkPlayer(playerX, playerY) {
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    const wasNear = this.playerNear;
    this.playerNear = Math.sqrt(dx * dx + dy * dy) < this.interactRadius;
    return this.playerNear;
  }

  /** 从对话池随机取一条 */
  getRandomDialog() {
    const pool = DIALOG_POOLS[this.dialogPoolKey] || DIALOG_POOLS.inkwell;
    let dialog;
    // 避免连续重复
    do {
      dialog = pool[Math.floor(Math.random() * pool.length)];
    } while (dialog === this._lastDialog && pool.length > 1);
    this._lastDialog = dialog;
    return dialog;
  }

  /** 绘制 NPC（复用 drawPlayer） */
  draw(ctx, time) {
    drawPlayer(ctx, this.x, this.y, this.direction, this.walkFrame, this.playerNear, this.appearance);

    // NPC 名字标签
    ctx.font = 'bold 12px Caveat, cursive';
    ctx.fillStyle = 'rgba(44,44,58,0.45)';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - 115);
    ctx.textAlign = 'start';
  }

  /** 获取提示气泡位置 */
  getPromptPosition() {
    return { x: this.x, y: this.y - 120 };
  }
}
