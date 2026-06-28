// diyOverlay.js — 🎨 手工坊（放置装饰 + 手绘NPC/宠物 + 签名墙）
import { getCtx } from './OverlayContext.js';
import { dbListSignatures, dbAddSignature } from '../supabase/DatabaseClient.js';

const DIY_STORAGE_KEY = 'diy-custom-drawings';

// 可放置的装饰物列表及价格
const DECORATION_CATALOG = [
  { id: 'lamp',    name: '🏮 路灯',   cost: 5  },
  { id: 'mushroom',name: '🍄 蘑菇',   cost: 5  },
  { id: 'flowers', name: '🌸 花丛',   cost: 8  },
  { id: 'rock',    name: '🪨 石头',   cost: 5  },
  { id: 'grass',   name: '🌿 草丛',   cost: 5  },
  { id: 'cat',     name: '🐱 猫咪',   cost: 15 },
  { id: 'butterfly',name:'🦋 蝴蝶',  cost: 12 },
  { id: 'paperplane',name:'✈️ 纸飞机',cost: 10 },
  { id: 'frame',   name: '🖼️ 画框',   cost: 20 },
];

// 像素画调色板
const PIXEL_COLORS = [
  '#2C2C3A','#FAF5E8','#EA5455','#FF9800','#FFC107',
  '#4CAF50','#26A69A','#2196F3','#9C27B0','#795548',
];

let activeTab = 'place'; // 'place' | 'draw' | 'sign'
let selectedDeco = null;
let signatures = [];
let pixelCanvas = null;
let pixelCtx = null;
const PIXEL_SIZE = 16; // 16x16 像素画
let pixelData = null;
let currentPixelColor = '#2C2C3A';
let isDrawing = false;

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('diy-overlay', 'diy-close');
  document.getElementById('diy-overlay').classList.add('visible');
  activeTab = 'place';
  renderDIYUI();
  loadSignatures();
}

export function hide() {
  const overlay = document.getElementById('diy-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function renderDIYUI() {
  switchTab(activeTab);
  updateCoinDisplay();
}

function updateCoinDisplay() {
  const { gameWorld } = getCtx();
  // access progress system through context
  const el = document.getElementById('diy-coin-display');
  if (el) {
    const coinEl = document.getElementById('coin-display');
    el.textContent = coinEl ? coinEl.textContent : '🪙 0';
  }
}

function switchTab(tab) {
  activeTab = tab;
  // 更新标签页按钮样式
  document.querySelectorAll('.diy-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  // 显示/隐藏对应内容
  const panels = ['diy-place-panel', 'diy-draw-panel', 'diy-sign-panel'];
  panels.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const activePanel = document.getElementById(`diy-${tab}-panel`);
  if (activePanel) activePanel.style.display = 'block';

  if (tab === 'place') renderPlacePanel();
  if (tab === 'draw') renderDrawPanel();
  if (tab === 'sign') renderSignPanel();
}

function renderPlacePanel() {
  const listEl = document.getElementById('diy-deco-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  for (const deco of DECORATION_CATALOG) {
    const item = document.createElement('div');
    item.className = 'diy-deco-item';
    item.innerHTML = `
      <span class="diy-deco-name">${deco.name}</span>
      <span class="diy-deco-cost">🪙 ${deco.cost}</span>
      <button class="diy-deco-buy" data-id="${deco.id}" data-cost="${deco.cost}">购买</button>
    `;
    listEl.appendChild(item);
  }
  // 绑定购买按钮
  listEl.querySelectorAll('.diy-deco-buy').forEach(btn => {
    btn.onclick = () => handleBuyDecoration(btn.dataset.id, parseInt(btn.dataset.cost));
  });
}

function handleBuyDecoration(decoId, cost) {
  const progress = window._playerProgress;
  const backpack = window._backpack;
  if (!progress || !backpack) { alert('系统未就绪'); return; }
  if (!progress.spendCoins(cost)) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = `墨水币不足！需要 🪙${cost}`;
    document.getElementById('notifications')?.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
    return;
  }
  // 加入背包而非直接放置
  const decoName = DECORATION_CATALOG.find(d=>d.id===decoId)?.name || decoId;
  backpack.addItem(decoId, decoName, 'decoration');
  // 通知
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `${decoName} 已加入背包！按 B 打开背包放置`;
  document.getElementById('notifications')?.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
  updateCoinDisplay();
}

function renderDrawPanel() {
  // 初始化像素画布
  const canvasEl = document.getElementById('diy-pixel-canvas');
  if (!canvasEl) return;
  pixelCanvas = canvasEl;
  pixelCtx = canvasEl.getContext('2d');

  // 加载已保存的画作
  if (!pixelData) {
    try {
      const saved = localStorage.getItem(DIY_STORAGE_KEY);
      pixelData = saved ? JSON.parse(saved) : Array(PIXEL_SIZE * PIXEL_SIZE).fill(null);
    } catch {
      pixelData = Array(PIXEL_SIZE * PIXEL_SIZE).fill(null);
    }
  }

  drawPixelGrid();

  // 颜色选择
  const palette = document.getElementById('diy-palette');
  if (palette) {
    palette.innerHTML = '';
    for (const color of PIXEL_COLORS) {
      const swatch = document.createElement('div');
      swatch.className = 'diy-palette-swatch';
      swatch.style.background = color;
      swatch.onclick = () => {
        currentPixelColor = color;
        palette.querySelectorAll('.diy-palette-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      };
      if (color === currentPixelColor) swatch.classList.add('active');
      palette.appendChild(swatch);
    }
  }

  // 绑定画布事件
  if (!canvasEl._bound) {
    canvasEl._bound = true;
    canvasEl.addEventListener('mousedown', (e) => { isDrawing = true; paintPixel(e); });
    canvasEl.addEventListener('mousemove', (e) => { if (isDrawing) paintPixel(e); });
    canvasEl.addEventListener('mouseup', () => { isDrawing = false; saveDrawing(); });
    canvasEl.addEventListener('mouseleave', () => { isDrawing = false; });
    canvasEl.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; paintPixelTouch(e); }, { passive: false });
    canvasEl.addEventListener('touchmove', (e) => { e.preventDefault(); if (isDrawing) paintPixelTouch(e); }, { passive: false });
    canvasEl.addEventListener('touchend', () => { isDrawing = false; saveDrawing(); });
  }

  // 清除按钮
  const clearBtn = document.getElementById('diy-clear-btn');
  if (clearBtn) clearBtn.onclick = () => {
    pixelData = Array(PIXEL_SIZE * PIXEL_SIZE).fill(null);
    drawPixelGrid();
    saveDrawing();
  };

  // 保存为世界装饰按钮
  const saveBtn = document.getElementById('diy-save-btn');
  if (saveBtn) saveBtn.onclick = () => {
    saveDrawingToWorld();
  };
}

function drawPixelGrid() {
  if (!pixelCtx || !pixelCanvas) return;
  const cellSize = pixelCanvas.width / PIXEL_SIZE;
  pixelCtx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);

  // 绘制像素
  for (let y = 0; y < PIXEL_SIZE; y++) {
    for (let x = 0; x < PIXEL_SIZE; x++) {
      const idx = y * PIXEL_SIZE + x;
      if (pixelData[idx]) {
        pixelCtx.fillStyle = pixelData[idx];
        pixelCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  // 网格线
  pixelCtx.strokeStyle = 'rgba(44,44,58,0.1)';
  pixelCtx.lineWidth = 0.5;
  for (let i = 0; i <= PIXEL_SIZE; i++) {
    pixelCtx.beginPath();
    pixelCtx.moveTo(i * cellSize, 0);
    pixelCtx.lineTo(i * cellSize, pixelCanvas.height);
    pixelCtx.stroke();
    pixelCtx.beginPath();
    pixelCtx.moveTo(0, i * cellSize);
    pixelCtx.lineTo(pixelCanvas.width, i * cellSize);
    pixelCtx.stroke();
  }
}

function paintPixel(e) {
  if (!pixelCanvas) return;
  const rect = pixelCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / (rect.width / PIXEL_SIZE));
  const y = Math.floor((e.clientY - rect.top) / (rect.height / PIXEL_SIZE));
  if (x >= 0 && x < PIXEL_SIZE && y >= 0 && y < PIXEL_SIZE) {
    pixelData[y * PIXEL_SIZE + x] = currentPixelColor;
    drawPixelGrid();
  }
}

function paintPixelTouch(e) {
  if (!pixelCanvas) return;
  const touch = e.touches[0];
  const rect = pixelCanvas.getBoundingClientRect();
  const x = Math.floor((touch.clientX - rect.left) / (rect.width / PIXEL_SIZE));
  const y = Math.floor((touch.clientY - rect.top) / (rect.height / PIXEL_SIZE));
  if (x >= 0 && x < PIXEL_SIZE && y >= 0 && y < PIXEL_SIZE) {
    pixelData[y * PIXEL_SIZE + x] = currentPixelColor;
    drawPixelGrid();
  }
}

function saveDrawing() {
  try {
    localStorage.setItem(DIY_STORAGE_KEY, JSON.stringify(pixelData));
  } catch { /* ignore */ }
}

function saveDrawingToWorld() {
  const backpack = window._backpack;
  if (!backpack) return;
  // 将像素画数据保存进背包，稍后通过放置模式放置
  try {
    const id = 'pixel_' + Date.now();
    // 存绘画数据到独立 key
    const pixelArtStore = JSON.parse(localStorage.getItem('diy-pixel-art-store') || '{}');
    pixelArtStore[id] = [...pixelData];
    localStorage.setItem('diy-pixel-art-store', JSON.stringify(pixelArtStore));
    // 加入背包
    backpack.addItem(id, '🎨 自定义画', 'pixel_art');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = '🎨 像素画已加入背包！按 B 打开背包放置';
    document.getElementById('notifications')?.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  } catch { /* ignore */ }
}

// ── 签名墙 ──

async function loadSignatures() {
  signatures = await dbListSignatures();
  renderSignPanel();
}

function renderSignPanel() {
  const listEl = document.getElementById('diy-sign-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  for (const sig of signatures) {
    const item = document.createElement('div');
    item.className = 'diy-sign-item';
    item.textContent = sig.text + (sig.author ? ` — ${sig.author}` : '');
    listEl.appendChild(item);
  }
  // 提交签名
  const submitBtn = document.getElementById('diy-sign-submit');
  const inputEl = document.getElementById('diy-sign-input');
  if (submitBtn && inputEl) {
    submitBtn.onclick = async () => {
      const text = inputEl.value.trim();
      if (!text) return;
      const author = localStorage.getItem('diy-sign-author') || '匿名画家';
      await dbAddSignature(text, author);
      inputEl.value = '';
      signatures = await dbListSignatures();
      renderSignPanel();
    };
  }
  // 作者名保存
  const authorEl = document.getElementById('diy-sign-author');
  if (authorEl) {
    authorEl.value = localStorage.getItem('diy-sign-author') || '';
    authorEl.onchange = () => {
      localStorage.setItem('diy-sign-author', authorEl.value || '匿名画家');
    };
  }
}

// 初始化时绑定标签页按钮
export function initDIYTabs() {
  document.querySelectorAll('.diy-tab-btn').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });
}
