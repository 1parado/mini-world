// CanvasToolManager — input dispatch for 2D canvas writing mode
// Replaces the old Three.js-based ToolManager

import { PAGE_W, PAGE_H } from '../core/PageTemplate.js';

export class CanvasToolManager {
  constructor(notebook, pageRect) {
    this.notebook = notebook;
    this.tools = {};
    this.activeToolName = 'pencil';
    this.isMouseDown = false;
    this.lastHit = null; // { side, x, y }
    this.pageRect = pageRect; // { left, top, width, height } — screen rect where left page is drawn
    this.onColorCycle = null;
    this._bound = false;
    this._touchBound = false;
  }

  registerTool(name, tool) {
    this.tools[name] = tool;
  }

  setActiveTool(name) {
    if (this.tools[name]) {
      if (this.tools[this.activeToolName]) {
        this.tools[this.activeToolName].onDeactivate();
      }
      this.activeToolName = name;
      this.tools[name].onActivate();
    }
  }

  getActiveTool() {
    return this.tools[this.activeToolName];
  }

  // Update the page rectangle (where pages are drawn on screen)
  setPageRect(rect) {
    this.pageRect = rect;
  }

  // Convert a mouse event to page canvas coordinates
  hitTestPage(e, whichSide) {
    if (!this.pageRect) return null;
    const pr = this.pageRect;
    const side = whichSide || 'left';

    // For now we support drawing on the left page
    // The page rect covers { left, top, width, height } on screen
    const relX = e.clientX - pr.left;
    const relY = e.clientY - pr.top;

    if (relX < 0 || relY < 0 || relX > pr.width || relY > pr.height) {
      return null;
    }

    // Map screen coords to page canvas coords
    const pageX = (relX / pr.width) * PAGE_W;
    const pageY = (relY / pr.height) * PAGE_H;

    return { side, x: pageX, y: pageY };
  }

  // Convert a Touch object to { clientX, clientY } for hitTestPage
  _touchToMouse(touch) {
    return { clientX: touch.clientX, clientY: touch.clientY };
  }

  bindEvents(canvas) {
    if (this._bound) return;
    this._bound = true;
    const pr = this.pageRect;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const hit = this.hitTestPage(e, 'left');
      if (!hit) return;
      this.isMouseDown = true;
      this.lastHit = hit;
      this.getActiveTool().onPointerDown(hit);
    });

    canvas.addEventListener('mousemove', (e) => {
      const hit = this.hitTestPage(e, 'left');
      if (this.getActiveTool()) {
        this.getActiveTool().onPointerMove(hit, this.isMouseDown);
      }
      if (this.isMouseDown && hit) {
        this.lastHit = hit;
      }
      // Cursor feedback
      if (hit) {
        const tool = this.getActiveTool();
        canvas.style.cursor = tool ? (tool.cursor || 'crosshair') : 'crosshair';
      } else {
        canvas.style.cursor = 'default';
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      this.isMouseDown = false;
      if (this.lastHit) {
        this.getActiveTool().onPointerUp(this.lastHit);
      }
    });

    // Keyboard shortcuts (only when not in INPUT/TEXTAREA)
    document.addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const toolMap = { '1': 'pencil', '2': 'colorpen', '3': 'eraser', '4': 'highlighter', '5': 'text', '6': 'sticker' };
      if (toolMap[e.key]) {
        this.setActiveTool(toolMap[e.key]);
        return;
      }

      // T to cycle template
      if (e.code === 'KeyT') {
        const types = ['blank', 'lined', 'grid', 'dotgrid'];
        const currentPage = this.notebook.getCurrentLeftPage();
        if (currentPage) {
          const idx = types.indexOf(currentPage.templateType);
          currentPage.setTemplate(types[(idx + 1) % types.length]);
        }
        return;
      }

      // C to cycle ink color
      if (e.code === 'KeyC') {
        if (this.onColorCycle) this.onColorCycle();
      }
    });
  }

  // 移动端触摸事件绑定（writing 模式下用手指绘画）
  bindTouchEvents(canvas) {
    if (this._touchBound) return;
    this._touchBound = true;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const fakeE = this._touchToMouse(touch);
      const hit = this.hitTestPage(fakeE, 'left');
      if (!hit) return;
      this.isMouseDown = true;
      this.lastHit = hit;
      this.getActiveTool().onPointerDown(hit);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const fakeE = this._touchToMouse(touch);
      const hit = this.hitTestPage(fakeE, 'left');
      if (this.getActiveTool()) {
        this.getActiveTool().onPointerMove(hit, this.isMouseDown);
      }
      if (this.isMouseDown && hit) {
        this.lastHit = hit;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isMouseDown = false;
      if (this.lastHit) {
        this.getActiveTool().onPointerUp(this.lastHit);
      }
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
      this.isMouseDown = false;
    });
  }
}
