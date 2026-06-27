// PencilTool — with real-time stroke preview (~30fps)
import { INK_PALETTE, hexToCSS } from '../utils/SketchRenderer.js';

export class PencilTool {
  constructor(notebook) {
    this.notebook = notebook;
    this.onStrokeComplete = null;
    this.cursor = 'crosshair';
    this.isDrawing = false;
    this.currentPoints = [];
    this.currentSide = null;
    this.color = 0x1a1a2e;

    this._previewRaf = null;
    this._lastPreviewTime = 0;
    this._previewInterval = 33;
  }

  onActivate() { this.cursor = 'crosshair'; }
  onDeactivate() { this.finishStroke(); }

  onPointerDown(hit) {
    this.isDrawing = true;
    this.currentSide = hit.side;
    this.currentPoints = [{ x: hit.x, y: hit.y }];
    this._schedulePreview();
  }

  onPointerMove(hit, isDown) {
    if (!this.isDrawing || !isDown || !hit) return;
    if (hit.side !== this.currentSide) return;
    this.currentPoints.push({ x: hit.x, y: hit.y });
    this._schedulePreview();
  }

  onPointerUp(hit) { this.finishStroke(); }

  finishStroke() {
    if (this._previewRaf) { cancelAnimationFrame(this._previewRaf); this._previewRaf = null; }

    if (this.currentPoints.length >= 2) {
      const stroke = {
        points: this.currentPoints.slice(),
        color: this.color,
        width: 1.5,
        tool: 'pencil',
      };
      const page = this.currentSide === 'left'
        ? this.notebook.getCurrentLeftPage()
        : this.notebook.getCurrentRightPage();
      if (page) page.addStroke(stroke);
      if (this.onStrokeComplete) this.onStrokeComplete(stroke, this.currentSide);
    }
    this.isDrawing = false;
    this.currentPoints = [];
    this.currentSide = null;
  }

  _schedulePreview() {
    if (!this.isDrawing) return;
    const now = performance.now();
    if (now - this._lastPreviewTime < this._previewInterval) {
      if (!this._previewRaf) {
        this._previewRaf = requestAnimationFrame(() => { this._previewRaf = null; this._renderPreview(); });
      }
      return;
    }
    this._renderPreview();
  }

  _renderPreview() {
    if (!this.isDrawing || this.currentPoints.length < 2) return;
    this._lastPreviewTime = performance.now();
    const page = this.currentSide === 'left'
      ? this.notebook.getCurrentLeftPage()
      : this.notebook.getCurrentRightPage();
    if (!page) return;
    const tmpStroke = { points: this.currentPoints.slice(), color: this.color, width: 1.5, tool: 'pencil' };
    page.renderContent([tmpStroke]);
  }
}
