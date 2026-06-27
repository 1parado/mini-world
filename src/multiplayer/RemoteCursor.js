// RemoteCursor — shows other writers' cursor positions on the notebook (2D canvas version)
// No Three.js dependency

export class RemoteCursor {
  constructor(peerId, color) {
    this.peerId = peerId;
    this.color = color;
    this.x = 0;
    this.y = 0;
    this.visible = false;
    this.lastUpdate = 0;
  }

  updatePosition(pageX, pageY, pageSide) {
    this.x = pageX;
    this.y = pageY;
    this.visible = true;
    this.lastUpdate = performance.now();
  }

  update() {
    if (performance.now() - this.lastUpdate > 2000) {
      this.visible = false;
    }
  }

  draw(ctx, pageRect) {
    if (!this.visible || !pageRect) return;
    // Map page coords to screen coords
    const sx = pageRect.left + (this.x / 800) * pageRect.width;
    const sy = pageRect.top + (this.y / 1100) * pageRect.height;

    // Draw cursor dot
    ctx.fillStyle = '#' + this.color.toString(16).padStart(6, '0');
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw label
    ctx.font = '11px Courier New';
    ctx.fillStyle = '#' + this.color.toString(16).padStart(6, '0');
    ctx.fillText('Writer', sx + 6, sy - 4);
  }
}

export class RemoteCursorManager {
  constructor() {
    this.cursors = new Map();
    this.colors = [0x2d4059, 0xea5455, 0x077b8a, 0x8b6914, 0x5b2c6f, 0x1a5276];
    this.colorIdx = 0;
  }

  addCursor(peerId) {
    if (this.cursors.has(peerId)) return;
    const color = this.colors[this.colorIdx % this.colors.length];
    this.colorIdx++;
    this.cursors.set(peerId, new RemoteCursor(peerId, color));
  }

  removeCursor(peerId) {
    this.cursors.delete(peerId);
  }

  updateCursor(peerId, data) {
    const cursor = this.cursors.get(peerId);
    if (cursor && data.pageX !== undefined) {
      cursor.updatePosition(data.pageX, data.pageY, data.pageSide || 'left');
    }
  }

  update() {
    this.cursors.forEach(c => c.update());
  }

  draw(ctx, pageRect) {
    this.cursors.forEach(c => c.draw(ctx, pageRect));
  }

  getCount() { return this.cursors.size; }
}
