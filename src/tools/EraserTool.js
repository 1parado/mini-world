// EraserTool — visual radius cursor overlay + adjustable size (no Three.js)
export class EraserTool {
  constructor(notebook) {
    this.notebook = notebook;
    this.onErase = null;
    this.cursor = 'none';
    this.isErasing = false;
    this.radius = 20;
    this.currentSide = null;
    this.cursorEl = document.getElementById('eraser-cursor');
  }

  setRadius(r) {
    this.radius = r;
    this._updateCursorSize();
  }

  onActivate() {
    this.cursor = 'none';
    if (this.cursorEl) this.cursorEl.style.display = 'block';
    this._updateCursorSize();
  }

  onDeactivate() {
    this.isErasing = false;
    if (this.cursorEl) this.cursorEl.style.display = 'none';
  }

  onPointerDown(hit) {
    this.isErasing = true;
    this.currentSide = hit.side;
    this.eraseAt(hit);
  }

  onPointerMove(hit, isDown) {
    if (this.cursorEl) {
      if (hit) {
        this.cursorEl.style.display = 'block';
      }
    }
    if (!this.isErasing || !isDown || !hit) return;
    if (hit.side !== this.currentSide) return;
    this.eraseAt(hit);
  }

  onPointerUp(hit) {
    this.isErasing = false;
    this.currentSide = null;
  }

  eraseAt(hit) {
    const page = hit.side === 'left'
      ? this.notebook.getCurrentLeftPage()
      : this.notebook.getCurrentRightPage();
    if (page) {
      const erased = page.eraseAt(hit.x, hit.y, this.radius);
      if (erased && this.onErase) this.onErase(hit, this.currentSide);
    }
  }

  updateCursorPosition(clientX, clientY) {
    if (!this.cursorEl) return;
    this.cursorEl.style.left = clientX + 'px';
    this.cursorEl.style.top = clientY + 'px';
  }

  _updateCursorSize() {
    if (!this.cursorEl) return;
    this.cursorEl.style.width = this.radius * 2 + 'px';
    this.cursorEl.style.height = this.radius * 2 + 'px';
  }
}
