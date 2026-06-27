// TextTool — working text input with proper listener lifecycle (no Three.js)
import { hexToCSS } from '../utils/SketchRenderer.js';

export class TextTool {
  constructor(notebook) {
    this.notebook = notebook;
    this.onTextAdded = null;
    this.cursor = 'text';
    this.color = 0x1a1a2e;
    this.fontSize = 18;
    this._active = false;
    this._cleanupFns = [];
    this._pendingHit = null;
  }

  onActivate() { this.cursor = 'text'; }
  onDeactivate() { this._closeOverlay(); }

  onPointerDown(hit) {
    if (this._active) this._closeOverlay();
    this.showTextInput(hit);
  }

  onPointerMove(hit, isDown) {}
  onPointerUp(hit) {}

  showTextInput(hit) {
    const wrapper = document.getElementById('text-input-overlay');
    if (!wrapper) return;
    const input = document.getElementById('text-input-field');
    const confirmBtn = document.getElementById('text-input-confirm');
    const cancelBtn = document.getElementById('text-input-cancel');
    if (!input || !confirmBtn || !cancelBtn) return;

    this._pendingHit = hit;
    wrapper.style.display = 'flex';
    input.value = '';
    this._active = true;

    const handleConfirm = () => {
      const text = input.value.trim();
      if (text && this._pendingHit) this.addText(this._pendingHit, text);
      this._closeOverlay();
    };
    const handleCancel = () => { this._closeOverlay(); };
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleConfirm(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); handleCancel(); }
    };

    input.addEventListener('keydown', handleKey);
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);

    this._cleanupFns = [
      () => { input.removeEventListener('keydown', handleKey); },
      () => { confirmBtn.removeEventListener('click', handleConfirm); },
      () => { cancelBtn.removeEventListener('click', handleCancel); },
    ];

    requestAnimationFrame(() => input.focus());
  }

  _closeOverlay() {
    this._cleanupFns.forEach(fn => fn());
    this._cleanupFns = [];
    this._pendingHit = null;
    this._active = false;
    const wrapper = document.getElementById('text-input-overlay');
    if (wrapper) wrapper.style.display = 'none';
  }

  addText(hit, text) {
    const textBox = { x: hit.x, y: hit.y, text, fontSize: this.fontSize, color: this.color };
    const page = hit.side === 'left'
      ? this.notebook.getCurrentLeftPage()
      : this.notebook.getCurrentRightPage();
    if (page) page.addTextBox(textBox);
    if (this.onTextAdded) this.onTextAdded(textBox, hit.side);
  }
}
