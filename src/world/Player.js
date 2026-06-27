// Player — stick figure character with WASD/click movement
import { WORLD_W, WORLD_H, DEFAULT_APPEARANCE, mergeAppearance } from './WorldRenderer.js';

const SPEED = 220; // pixels per second (slightly faster for exploration feel)
const SIZE = 20;   // collision radius (matches scaled-up player visual)

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.direction = 'down';
    this.isMoving = false;
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.navigating = false;
    this.nearZone = null;
    this.appearance = null; // 由外部 setPlayerAppearance 注入
  }

  /** 获取当前外观（合并默认值） */
  getAppearance() {
    return mergeAppearance(this.appearance);
  }

  update(delta, input) {
    let dx = 0, dy = 0;

    if (input.left)  dx -= 1;
    if (input.right) dx += 1;
    if (input.up)    dy -= 1;
    if (input.down)  dy += 1;

    const hasKeyInput = dx !== 0 || dy !== 0;

    if (hasKeyInput) {
      this.navigating = false;
      this.targetX = this.x;
      this.targetY = this.y;
    }

    if (this.navigating) {
      const ndx = this.targetX - this.x;
      const ndy = this.targetY - this.y;
      const dist = Math.sqrt(ndx * ndx + ndy * ndy);
      if (dist > 8) {
        dx = ndx / dist;
        dy = ndy / dist;
      } else {
        this.navigating = false;
      }
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;

      const speed = SPEED * delta;
      this.x += dx * speed;
      this.y += dy * speed;

      this.x = Math.max(SIZE, Math.min(WORLD_W - SIZE, this.x));
      this.y = Math.max(SIZE, Math.min(WORLD_H - SIZE, this.y));

      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? 'right' : 'left';
      } else {
        this.direction = dy > 0 ? 'down' : 'up';
      }

      this.isMoving = true;

      this.walkTimer += delta;
      if (this.walkTimer > 0.18) {
        this.walkFrame = this.walkFrame === 0 ? 1 : 0;
        this.walkTimer = 0;
      }
    } else {
      this.isMoving = false;
      this.walkFrame = 0;
      this.walkTimer = 0;
    }
  }

  navigateTo(worldX, worldY) {
    this.targetX = Math.max(SIZE, Math.min(WORLD_W - SIZE, worldX));
    this.targetY = Math.max(SIZE, Math.min(WORLD_H - SIZE, worldY));
    this.navigating = true;
  }

  isNearZone(zone) {
    const dx = this.x - zone.x;
    const dy = this.y - zone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < zone.triggerRadius;
  }

  collidesWith(zone) {
    return this.x > zone.x - zone.w / 2 - SIZE &&
           this.x < zone.x + zone.w / 2 + SIZE &&
           this.y > zone.y - zone.h - SIZE &&
           this.y < zone.y + SIZE;
  }

  // Prompt bubble appears above the player's head (scaled for 2.5x player)
  getPromptPosition() {
    return { x: this.x, y: this.y - 110 };
  }
}
