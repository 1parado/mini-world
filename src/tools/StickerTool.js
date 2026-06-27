// StickerTool — click-to-place hand-drawn stickers (no Three.js)
import { STICKER_TYPES } from '../utils/SketchRenderer.js';

export class StickerTool {
  constructor(notebook) {
    this.notebook = notebook;
    this.onStickerAdded = null;
    this.cursor = 'copy';
    this.stickerIndex = 0;
    this.stickerType = STICKER_TYPES[0];
    this.color = 0x1a1a2e;
  }

  cycleSticker() {
    this.stickerIndex = (this.stickerIndex + 1) % STICKER_TYPES.length;
    this.stickerType = STICKER_TYPES[this.stickerIndex];
  }

  onActivate() { this.cursor = 'copy'; }
  onDeactivate() {}

  onPointerDown(hit) {
    const sticker = { x: hit.x, y: hit.y, type: this.stickerType, size: 30, color: this.color };
    const page = hit.side === 'left'
      ? this.notebook.getCurrentLeftPage()
      : this.notebook.getCurrentRightPage();
    if (page) page.addSticker(sticker);
    if (this.onStickerAdded) this.onStickerAdded(sticker, hit.side);
  }

  onPointerMove(hit, isDown) {}
  onPointerUp(hit) {}
}
