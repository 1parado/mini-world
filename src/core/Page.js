// Page — single page data model + canvas rendering (no Three.js dependency)
import { renderTemplate, PAGE_W, PAGE_H } from './PageTemplate.js';
import { sketchPolyline, sketchText, highlighterStroke, drawSticker, hexToCSS } from '../utils/SketchRenderer.js';

export class Page {
  constructor(id, templateType = 'lined') {
    this.id = id;
    this.templateType = templateType;

    // Page content
    this.strokes = [];    // { points, color, width, tool, id }
    this.textBoxes = [];  // { x, y, text, fontSize, color, id }
    this.stickers = [];   // { x, y, type, size, color, id }

    // Canvas for compositing
    this.canvas = document.createElement('canvas');
    this.canvas.width = PAGE_W;
    this.canvas.height = PAGE_H;
    this.ctx = this.canvas.getContext('2d');

    this.dirty = true;

    // Initial render
    this.fullRender();
  }

  // Full re-render: template + all content
  fullRender() {
    renderTemplate(this.templateType, this.canvas, this.getTemplateRenderOptions());
    this.ctx = this.canvas.getContext('2d');
    this.renderAllContent();
    this.dirty = false;
  }

  // Re-render content with optional extra preview strokes
  renderContent(extraStrokes) {
    renderTemplate(this.templateType, this.canvas, this.getTemplateRenderOptions());
    this.ctx = this.canvas.getContext('2d');
    this.renderAllContent();
    if (extraStrokes && extraStrokes.length > 0) {
      extraStrokes.filter(s => s.tool === 'highlighter').forEach(s => this.renderStroke(s));
      extraStrokes.filter(s => s.tool !== 'highlighter').forEach(s => this.renderStroke(s));
    }
    this.dirty = false;
  }

  renderAllContent() {
    const ctx = this.ctx;
    const highlights = this.strokes.filter(s => s.tool === 'highlighter');
    highlights.forEach(s => this.renderStroke(s));
    const pens = this.strokes.filter(s => s.tool !== 'highlighter');
    pens.forEach(s => this.renderStroke(s));
    this.stickers.forEach(s => this.renderSticker(s));
    this.textBoxes.forEach(t => this.renderTextBox(t));
  }

  renderStroke(stroke) {
    if (!stroke.points || stroke.points.length < 2) return;
    const ctx = this.ctx;
    if (stroke.tool === 'highlighter') {
      highlighterStroke(ctx, stroke.points, {
        color: hexToCSS(stroke.color),
        width: stroke.width || 16,
        opacity: 0.25,
      });
    } else if (stroke.tool === 'colorpen') {
      sketchPolyline(ctx, stroke.points, {
        color: hexToCSS(stroke.color),
        width: stroke.width || 4,
        jitter: 1.2,
        passes: 5,
        opacity: 0.85,
      });
    } else {
      sketchPolyline(ctx, stroke.points, {
        color: hexToCSS(stroke.color),
        width: stroke.width || 1.5,
        jitter: 0.8,
        passes: 3,
        opacity: 0.75,
      });
    }
  }

  renderSticker(sticker) {
    drawSticker(this.ctx, sticker.type, sticker.x, sticker.y, sticker.size || 28, {
      color: hexToCSS(sticker.color || 0x1a1a2e),
    });
  }

  renderTextBox(textBox) {
    sketchText(this.ctx, textBox.text, textBox.x, textBox.y, {
      color: hexToCSS(textBox.color || 0x1a1a2e),
      fontSize: textBox.fontSize || 18,
      jitter: 1.5,
      passes: 3,
    });
  }

  getTemplateRenderOptions() {
    return {
      seed: 'page-' + this.id + ':' + this.templateType,
      pageNumber: this.id + 1,
    };
  }

  // Draw this page's canvas onto a main display canvas at position/scale
  drawToCanvas(ctx, dx, dy, dw, dh) {
    ctx.drawImage(this.canvas, dx, dy, dw, dh);
  }

  // Add content methods
  addStroke(stroke) {
    stroke.id = stroke.id || ('s-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
    this.strokes.push(stroke);
    this.dirty = true;
    this.renderContent();
    return stroke;
  }

  addTextBox(textBox) {
    textBox.id = textBox.id || ('t-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
    this.textBoxes.push(textBox);
    this.dirty = true;
    this.renderContent();
    return textBox;
  }

  addSticker(sticker) {
    sticker.id = sticker.id || ('k-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
    this.stickers.push(sticker);
    this.dirty = true;
    this.renderContent();
    return sticker;
  }

  // Erase content (strokes, text, stickers) within a circle at (x, y) with radius r
  eraseAt(x, y, radius = 15) {
    const r2 = radius * radius;
    let erased = false;

    this.strokes = this.strokes.filter(stroke => {
      for (const pt of stroke.points) {
        const dx = pt.x - x;
        const dy = pt.y - y;
        if (dx * dx + dy * dy < r2) { erased = true; return false; }
      }
      return true;
    });

    this.textBoxes = this.textBoxes.filter(tb => {
      const dx = tb.x - x;
      const dy = tb.y - y;
      if (dx * dx + dy * dy < r2) { erased = true; return false; }
      return true;
    });

    const prevLen = this.stickers.length;
    this.stickers = this.stickers.filter(sticker => {
      const dx = sticker.x - x;
      const dy = sticker.y - y;
      return dx * dx + dy * dy >= r2;
    });
    if (this.stickers.length < prevLen) erased = true;

    if (erased) {
      this.dirty = true;
      this.renderContent();
    }
    return erased;
  }

  setTemplate(templateType) {
    this.templateType = templateType;
    this.dirty = true;
    this.fullRender();
  }

  clearAll() {
    this.strokes = [];
    this.textBoxes = [];
    this.stickers = [];
    this.dirty = true;
    this.fullRender();
  }

  serialize() {
    return {
      id: this.id,
      template: this.templateType,
      strokes: this.strokes.map(s => ({
        ...s,
        points: s.points.map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })),
      })),
      textBoxes: this.textBoxes,
      stickers: this.stickers,
    };
  }

  static deserialize(data) {
    const page = new Page(data.id, data.template || 'lined');
    page.strokes = data.strokes || [];
    page.textBoxes = data.textBoxes || [];
    page.stickers = data.stickers || [];
    page.renderContent();
    return page;
  }
}
