// ToolbarUI — "铅笔盒"风格工具栏 + 子工具面板
// 标志性元素：牛皮纸色笔盒放在淡色桌面上，红色页边线活跃指示器
import { INK_PALETTE, hexToCSS, STICKER_TYPES } from '../utils/SketchRenderer.js';

// 贴纸预览表情（每个 STICKER_TYPES 条目一个）
const STICKER_EMOJIS = ['★', '♥', '→', '✓', '○', '◇', '⚡', '☺', '!', '?'];

export class ToolbarUI {
  constructor(onToolSelect, onSubtoolChange) {
    this.onToolSelect = onToolSelect;
    this.onSubtoolChange = onSubtoolChange || (() => {});
    this.container = document.getElementById('toolbar');
    this.subtoolPanel = document.getElementById('subtool-panel');
    this.activeToolId = 'pencil';
    this.activeBtn = null;

    // 当前子工具选择追踪
    this.colorIndex = { colorpen: 1, highlighter: 3 }; // 每个工具的默认颜色索引
    this.stickerIndex = 0;
    this.eraserSize = 'M';   // S=10, M=20, L=35
    this.textSize = 'M';     // S=14, M=18, L=24

    // 工具定义，含墨水指示器默认颜色
    this.tools = [
      { id: 'pencil',      key: '1', label: '铅笔',    icon: '✏️', ink: '#1a1a2e' },
      { id: 'colorpen',   key: '2', label: '彩笔',   icon: '🖊️', ink: '#2d4059' },
      { id: 'eraser',      key: '3', label: '橡皮',   icon: '🧹', ink: null },
      { id: 'highlighter', key: '4', label: '荧光笔', icon: '🖍️', ink: '#077b8a' },
      { id: 'text',        key: '5', label: '文字',   icon: 'Aa', ink: '#1a1a2e' },
      { id: 'sticker',     key: '6', label: '贴纸',   icon: '★', ink: null },
    ];

    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = '';

    // === 工具按钮容器 ===
    const btnContainer = document.createElement('div');
    btnContainer.className = 'toolbar-buttons';

    this.tools.forEach(tool => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (tool.id === this.activeToolId ? ' active' : '');
      btn.dataset.tool = tool.id;

      // 图标
      const iconSpan = document.createElement('span');
      iconSpan.className = 'tool-icon';
      iconSpan.textContent = tool.icon;

      // 快捷键标签
      const labelSpan = document.createElement('span');
      labelSpan.className = 'tool-label';
      labelSpan.textContent = tool.key;

      btn.appendChild(iconSpan);
      btn.appendChild(labelSpan);

      // 墨水指示点（彩笔、荧光笔、铅笔）
      if (tool.ink) {
        const inkDot = document.createElement('span');
        inkDot.className = 'ink-indicator';
        inkDot.style.background = tool.ink;
        inkDot.dataset.toolId = tool.id;
        btn.appendChild(inkDot);
      }

      btn.title = tool.label + ' (' + tool.key + ')';
      btn.addEventListener('click', () => this.selectTool(tool.id));
      btnContainer.appendChild(btn);

      if (tool.id === this.activeToolId) this.activeBtn = btn;
    });

    this.container.appendChild(btnContainer);

    // === 分隔线 ===
    const divider = document.createElement('div');
    divider.className = 'toolbar-divider';
    this.container.appendChild(divider);

    // === 模板按钮（底部）===
    const tmplBtn = document.createElement('button');
    tmplBtn.className = 'tool-btn template-btn';
    tmplBtn.innerHTML = '<span class="tool-icon">📄</span><span class="tool-label">T</span>';
    tmplBtn.title = '更换模板 (T)';
    tmplBtn.addEventListener('click', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', bubbles: true }));
    });
    this.container.appendChild(tmplBtn);
  }

  selectTool(toolId) {
    this.activeToolId = toolId;

    // 更新工具栏按钮活跃状态（不含模板按钮）
    const buttons = this.container.querySelectorAll('.tool-btn:not(.template-btn)');
    buttons.forEach(b => b.classList.remove('active'));
    const btn = this.container.querySelector('[data-tool="' + toolId + '"]');
    if (btn) {
      btn.classList.add('active');
      this.activeBtn = btn;
    }

    // 显示对应子工具面板
    this.showSubtoolPanel(toolId);

    // 更新顶部信息条墨水色点
    this.syncInkDot(toolId);

    if (this.onToolSelect) this.onToolSelect(toolId);
  }

  setActive(toolId) {
    this.selectTool(toolId);
  }

  // === 子工具面板管理 ===

  showSubtoolPanel(toolId) {
    if (!this.subtoolPanel) return;

    // 无子选项的工具隐藏面板
    const noSubtool = ['pencil'];
    if (noSubtool.includes(toolId)) {
      this.subtoolPanel.classList.remove('visible');
      this.subtoolPanel.innerHTML = '';
      return;
    }

    this.subtoolPanel.innerHTML = '';
    this.subtoolPanel.classList.add('visible');

    switch (toolId) {
      case 'colorpen':
      case 'highlighter':
        this.buildColorSwatches(toolId);
        break;
      case 'eraser':
        this.buildEraserSizes();
        break;
      case 'text':
        this.buildTextSizes();
        break;
      case 'sticker':
        this.buildStickerGrid();
        break;
    }
  }

  // --- 彩笔/荧光笔颜色色板 ---

  buildColorSwatches(toolId) {
    const label = document.createElement('div');
    label.className = 'subtool-label';
    label.textContent = '墨水颜色';
    this.subtoolPanel.appendChild(label);

    const swatchRow = document.createElement('div');
    swatchRow.className = 'color-swatches';

    const activeIdx = this.colorIndex[toolId] || 0;

    INK_PALETTE.forEach((hex, idx) => {
      const swatch = document.createElement('button');
      swatch.className = 'color-swatch' + (idx === activeIdx ? ' active-swatch' : '');
      swatch.style.background = hexToCSS(hex);
      swatch.title = '颜色 ' + (idx + 1);
      swatch.addEventListener('click', () => {
        this.colorIndex[toolId] = idx;
        // 更新活跃色块
        swatchRow.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active-swatch'));
        swatch.classList.add('active-swatch');
        // 更新工具栏按钮墨水指示点
        this.updateInkIndicator(toolId, hex);
        // 通知父级
        this.onSubtoolChange('color', { toolId, colorIndex: idx, color: hex });
      });
      swatchRow.appendChild(swatch);
    });

    this.subtoolPanel.appendChild(swatchRow);
  }

  // --- 贴纸网格 ---

  buildStickerGrid() {
    const label = document.createElement('div');
    label.className = 'subtool-label';
    label.textContent = '贴纸';
    this.subtoolPanel.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'sticker-grid';

    STICKER_TYPES.forEach((type, idx) => {
      const btn = document.createElement('button');
      btn.className = 'sticker-option' + (idx === this.stickerIndex ? ' active-sticker' : '');
      btn.textContent = STICKER_EMOJIS[idx] || '?';
      btn.title = type.charAt(0).toUpperCase() + type.slice(1);
      btn.addEventListener('click', () => {
        this.stickerIndex = idx;
        grid.querySelectorAll('.sticker-option').forEach(s => s.classList.remove('active-sticker'));
        btn.classList.add('active-sticker');
        this.onSubtoolChange('sticker', { stickerIndex: idx, stickerType: type });
      });
      grid.appendChild(btn);
    });

    this.subtoolPanel.appendChild(grid);
  }

  // --- 橡皮大小选择 ---

  buildEraserSizes() {
    const label = document.createElement('div');
    label.className = 'subtool-label';
    label.textContent = '橡皮大小';
    this.subtoolPanel.appendChild(label);

    const row = document.createElement('div');
    row.className = 'size-options';

    const sizes = [
      { key: 'S', radius: 10 },
      { key: 'M', radius: 20 },
      { key: 'L', radius: 35 },
    ];

    sizes.forEach(({ key, radius }) => {
      const btn = document.createElement('button');
      btn.className = 'size-btn' + (key === this.eraserSize ? ' active-size' : '');
      btn.textContent = key;
      btn.title = key + ' (' + radius + 'px)';
      btn.addEventListener('click', () => {
        this.eraserSize = key;
        row.querySelectorAll('.size-btn').forEach(s => s.classList.remove('active-size'));
        btn.classList.add('active-size');
        this.onSubtoolChange('eraser-size', { size: key, radius });
      });
      row.appendChild(btn);
    });

    this.subtoolPanel.appendChild(row);
  }

  // --- 文字大小选择 ---

  buildTextSizes() {
    const label = document.createElement('div');
    label.className = 'subtool-label';
    label.textContent = '文字大小';
    this.subtoolPanel.appendChild(label);

    const row = document.createElement('div');
    row.className = 'size-options';

    const sizes = [
      { key: 'S', fontSize: 14 },
      { key: 'M', fontSize: 18 },
      { key: 'L', fontSize: 24 },
    ];

    sizes.forEach(({ key, fontSize }) => {
      const btn = document.createElement('button');
      btn.className = 'size-btn' + (key === this.textSize ? ' active-size' : '');
      btn.textContent = key;
      btn.title = key + ' (' + fontSize + 'px)';
      btn.addEventListener('click', () => {
        this.textSize = key;
        row.querySelectorAll('.size-btn').forEach(s => s.classList.remove('active-size'));
        btn.classList.add('active-size');
        this.onSubtoolChange('text-size', { size: key, fontSize });
      });
      row.appendChild(btn);

    });

    this.subtoolPanel.appendChild(row);
  }

  // === 墨水指示器辅助方法 ===

  updateInkIndicator(toolId, hexColor) {
    const dot = this.container.querySelector('.ink-indicator[data-tool-id="' + toolId + '"]');
    if (dot) dot.style.background = hexToCSS(hexColor);
  }

  syncInkDot(toolId) {
    const topDot = document.getElementById('ink-color-dot');
    if (!topDot) return;

    // 将工具映射到当前颜色，更新顶部信息条色点
    if (toolId === 'pencil') {
      topDot.style.background = '#1a1a2e';
    } else if (toolId === 'colorpen') {
      topDot.style.background = hexToCSS(INK_PALETTE[this.colorIndex.colorpen || 1]);
    } else if (toolId === 'highlighter') {
      topDot.style.background = hexToCSS(INK_PALETTE[this.colorIndex.highlighter || 3]);
    } else if (toolId === 'text') {
      topDot.style.background = '#1a1a2e';
    } else {
      topDot.style.background = 'var(--graphite)';
    }
  }

  // === 公共查询方法（供 ToolManager/main.js 使用）===

  getColorIndex(toolId) {
    return this.colorIndex[toolId] || 0;
  }

  getStickerIndex() {
    return this.stickerIndex;
  }

  getEraserRadius() {
    const map = { S: 10, M: 20, L: 35 };
    return map[this.eraserSize] || 20;
  }

  getTextFontSize() {
    const map = { S: 14, M: 18, L: 24 };
    return map[this.textSize] || 18;
  }
}
