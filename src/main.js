// main.js — 2D Canvas 游戏循环 + 模式切换（探索 ↔ 书写 ↔ 27个交互区域）

// 核心
import { NotebookWorld } from './core/NotebookWorld.js';
import { PlayerProgress } from './systems/PlayerProgress.js';
import { initProgressHUD, closeBadgePanel, isBadgePanelOpen } from './systems/progressHUD.js';
import { spawnStarBurst } from './systems/CelebrationFX.js';

// 2D探索世界
import { GameWorld } from './world/GameWorld.js';
import { WORLD_W, WORLD_H, spawnClickRipple, drawPlayer, DEFAULT_APPEARANCE, mergeAppearance } from './world/WorldRenderer.js';
import { DeskScene } from './3d/DeskScene.js';
import { initMinimap, toggleMinimap, renderMinimap, handleMinimapClick } from './world/MinimapRenderer.js';

// AI对话
import { AIClient, loadConfig, saveConfig } from './ai/AIClient.js';
import AI_CONFIG from './ai/ai.config.js';

// 图床（Supabase）
import { storageClient, isAlbumPasswordEnabled, verifyAlbumPassword } from './supabase/StorageClient.js';
import SUPABASE_CONFIG from './supabase/supabase.config.js';
import { dbListMessages, dbAddMessage, dbListBoardMessages, dbAddBoardMessage, dbListWishes, dbAddWish } from './supabase/DatabaseClient.js';

// 工具
import { CanvasToolManager } from './tools/CanvasToolManager.js';
import { PencilTool } from './tools/PencilTool.js';
import { ColorPenTool } from './tools/ColorPenTool.js';
import { EraserTool } from './tools/EraserTool.js';
import { HighlighterTool } from './tools/HighlighterTool.js';
import { TextTool } from './tools/TextTool.js';
import { StickerTool } from './tools/StickerTool.js';

// UI
import { ToolbarUI } from './ui/ToolbarUI.js';
import { PageNavUI } from './ui/PageNavUI.js';
import { ExploreUI } from './ui/ExploreUI.js';
import { ChatUI } from './ui/ChatUI.js';
import { ShareLinkUI } from './ui/ShareLinkUI.js';

// 多人协作
import { PeerManager } from './multiplayer/PeerManager.js';

// 音效
import { audio } from './audio/AudioManager.js';

// 工具函数
import { updateFps, showNotification, setLoadingProgress, hideLoading } from './utils/helpers.js';
import { haptic } from './utils/haptic.js';
import { PAGE_W, PAGE_H } from './core/PageTemplate.js';

// 样式（Vite 自动注入 CSS）
import './styles/design-system.css';
import './styles/canvas.css';
import './styles/writing.css';
import './styles/explore.css';
import './styles/zone-modal.css';
import './styles/loading.css';
import './styles/responsive.css';
import './styles/overlays/dart.css';
import './styles/overlays/dice.css';
import './styles/overlays/card.css';
import './styles/overlays/spin.css';
import './styles/overlays/spin-overlay.css';
import './styles/overlays/music.css';
import './styles/overlays/coffee.css';
import './styles/overlays/coffee-overlay.css';
import './styles/overlays/weather.css';
import './styles/overlays/cooking.css';
import './styles/overlays/album.css';
import './styles/overlays/album-overlay.css';
/* 拟物弹窗样式 — 覆写默认 .zone-modal */
import './styles/overlays/board.css';
import './styles/overlays/shelf.css';
import './styles/overlays/mailbox.css';
import './styles/overlays/graffiti.css';
import './styles/overlays/diary.css';
import './styles/overlays/capsule.css';
import './styles/overlays/map.css';
import './styles/overlays/maze.css';
import './styles/overlays/puzzle.css';
import './styles/overlays/klotski.css';
import './styles/overlays/sudoku.css';
import './styles/overlays/magic.css';
import './styles/overlays/constellation.css';
import './styles/overlays/search.css';
import './styles/overlays/hourglass.css';
import './styles/overlays/wish.css';
import './styles/overlays/kaleidoscope.css';
import './styles/overlays/sharpener.css';
import './styles/overlays/inkwell.css';
import './styles/overlays/origami.css';
import './styles/overlays/sticker.css';
import './styles/overlays/abacus.css';
import './styles/progress.css';
import './styles/celebration.css';
import './styles/overlays/zones-new.css';
import './styles/components/chat-window.css';
import './styles/components/search-bar.css';
import './styles/components/dpad.css';

// Overlay 模块（各区域弹出层）
import { initOverlayContext } from './overlays/OverlayContext.js';
import * as boardOverlay from './overlays/boardOverlay.js';
import * as shelfOverlay from './overlays/shelfOverlay.js';
import * as coffeeOverlay from './overlays/coffeeOverlay.js';
import * as albumOverlay from './overlays/albumOverlay.js';
import * as mailboxOverlay from './overlays/mailboxOverlay.js';
import * as graffitiOverlay from './overlays/graffitiOverlay.js';
import * as dartOverlay from './overlays/dartOverlay.js';
import * as diceOverlay from './overlays/diceOverlay.js';
import * as cardOverlay from './overlays/cardOverlay.js';
import * as spinOverlay from './overlays/spinOverlay.js';
import * as musicOverlay from './overlays/musicOverlay.js';
import * as mazeOverlay from './overlays/mazeOverlay.js';
import * as puzzleOverlay from './overlays/puzzleOverlay.js';
import * as klotskiOverlay from './overlays/klotskiOverlay.js';
import * as sudokuOverlay from './overlays/sudokuOverlay.js';
import * as wishOverlay from './overlays/wishOverlay.js';
import * as magicOverlay from './overlays/magicOverlay.js';
import * as constellationOverlay from './overlays/constellationOverlay.js';
import * as hourglassOverlay from './overlays/hourglassOverlay.js';
import * as kaleidoscopeOverlay from './overlays/kaleidoscopeOverlay.js';
import * as diaryOverlay from './overlays/diaryOverlay.js';
import * as weatherOverlay from './overlays/weatherOverlay.js';
import * as cookingOverlay from './overlays/cookingOverlay.js';
import * as mapOverlay from './overlays/mapOverlay.js';
import * as chatOverlay from './overlays/chatOverlay.js';
import * as searchOverlay from './overlays/searchOverlay.js';
import * as sharpenerOverlay from './overlays/sharpenerOverlay.js';
import * as inkwellOverlay from './overlays/inkwellOverlay.js';
import * as origamiOverlay from './overlays/origamiOverlay.js';
import * as stickerOverlay from './overlays/stickerOverlay.js';
import * as abacusOverlay from './overlays/abacusOverlay.js';
import * as capsuleOverlay from './overlays/capsuleOverlay.js';

// Overlay 名 → 模块 映射表
const OVERLAY_MAP = {
  board: boardOverlay, shelf: shelfOverlay, coffee: coffeeOverlay, album: albumOverlay,
  mailbox: mailboxOverlay, graffiti: graffitiOverlay, dart: dartOverlay, dice: diceOverlay,
  card: cardOverlay, spin: spinOverlay, music: musicOverlay, maze: mazeOverlay,
  puzzle: puzzleOverlay, klotski: klotskiOverlay, sudoku: sudokuOverlay, wish: wishOverlay,
  magic: magicOverlay, constellation: constellationOverlay, hourglass: hourglassOverlay,
  kaleidoscope: kaleidoscopeOverlay, diary: diaryOverlay, weather: weatherOverlay,
  cooking: cookingOverlay, map: mapOverlay, chat: chatOverlay, search: searchOverlay,
  sharpener: sharpenerOverlay, inkwell: inkwellOverlay, origami: origamiOverlay,
  sticker: stickerOverlay, abacus: abacusOverlay, capsule: capsuleOverlay,
};

// ============================================================
// 画布
// ============================================================

setLoadingProgress(5, '准备画布...');

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// 3D文具桌面场景
const threeCanvas = document.getElementById('three-canvas');
const deskScene = new DeskScene();
deskScene.init(threeCanvas);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (gameWorld) gameWorld.resize(canvas.width, canvas.height);
  if (deskScene) deskScene.resize(canvas.width, canvas.height);
  if (currentMode === 'writing') computeWritingPageRect();
}
window.addEventListener('resize', resizeCanvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ============================================================
// 输入
// ============================================================

const input = {
  left: false, right: false, up: false, down: false,
  interact: false, _interactPressed: false,
};
let currentMode = 'explore';

// 所有弹出层 overlay ID 列表
const ALL_OVERLAY_IDS = [
  'board-overlay', 'shelf-overlay', 'coffee-overlay', 'album-overlay',
  'mailbox-overlay', 'graffiti-overlay',
  'dart-overlay', 'dice-overlay', 'card-overlay', 'spin-overlay', 'music-overlay',
  'maze-overlay', 'puzzle-overlay', 'klotski-overlay', 'sudoku-overlay',
  'wish-overlay', 'magic-overlay', 'constellation-overlay', 'hourglass-overlay',
  'kaleidoscope-overlay', 'diary-overlay', 'weather-overlay', 'cooking-overlay', 'map-overlay',
  'chat-overlay', 'search-overlay',
  'sharpener-overlay', 'inkwell-overlay', 'origami-overlay', 'sticker-overlay', 'abacus-overlay', 'capsule-overlay',
  'badge-overlay',
];

// ============================================================
// 笔记本
// ============================================================

setLoadingProgress(20, '书写页面中...');
const notebook = new NotebookWorld(40);

// ============================================================
// 游戏世界
// ============================================================

setLoadingProgress(40, '构建世界中...');
const gameWorld = new GameWorld((zoneType) => {
  handleZoneInteract(zoneType);
});
gameWorld.resize(canvas.width, canvas.height);
gameWorld.cameraX = Math.max(0, Math.min(WORLD_W - canvas.width, gameWorld.player.x - canvas.width / 2));
gameWorld.cameraY = Math.max(0, Math.min(WORLD_H - canvas.height, gameWorld.player.y - canvas.height / 2));

// 初始化小地图
initMinimap();
const minimapCanvas = document.getElementById('minimap-canvas');
if (minimapCanvas) {
  minimapCanvas.addEventListener('click', (e) => handleMinimapClick(e, gameWorld));
  // 移动端触摸支持
  minimapCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMinimapClick({ clientX: touch.clientX, clientY: touch.clientY }, gameWorld);
  }, { passive: false });
}

// 墨水币 + 成就系统
const progress = new PlayerProgress();

// 移动端检测（提前定义，多处需要）
const IS_MOBILE = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// 注入所有 overlay 模块的共享依赖
initOverlays();

// 🪙 初始化 HUD + 成就面板
initProgressHUD(progress);

// 🎉 首次通关庆祝：星星爆发
progress.setOnZoneFirstClear((zoneType) => {
  spawnStarBurst(window.innerWidth / 2, window.innerHeight / 2);
});

// ============================================================
// 工具
// ============================================================

setLoadingProgress(60, '准备工具...');

const pageRect = { left: 0, top: 0, width: 0, height: 0 };
const toolManager = new CanvasToolManager(notebook, pageRect);

const pencilTool = new PencilTool(notebook);
const colorPenTool = new ColorPenTool(notebook);
const eraserTool = new EraserTool(notebook);
const highlighterTool = new HighlighterTool(notebook);
const textTool = new TextTool(notebook);
const stickerTool = new StickerTool(notebook);

toolManager.registerTool('pencil', pencilTool);
toolManager.registerTool('colorpen', colorPenTool);
toolManager.registerTool('eraser', eraserTool);
toolManager.registerTool('highlighter', highlighterTool);
toolManager.registerTool('text', textTool);
toolManager.registerTool('sticker', stickerTool);
toolManager.setActiveTool('pencil');

// ============================================================
// 工具栏UI
// ============================================================

setLoadingProgress(70, '削铅笔中...');

const toolbar = new ToolbarUI(
  (toolId) => { toolManager.setActiveTool(toolId); syncToolName(toolId); },
  (type, data) => {
    switch (type) {
      case 'color':
        if (data.toolId === 'colorpen') colorPenTool.setColorIndex(data.colorIndex);
        else if (data.toolId === 'highlighter') highlighterTool.setColorIndex(data.colorIndex);
        break;
      case 'sticker':
        stickerTool.stickerIndex = data.stickerIndex;
        stickerTool.stickerType = data.stickerType;
        break;
      case 'eraser-size': eraserTool.setRadius(data.radius); break;
      case 'text-size': textTool.fontSize = data.fontSize; break;
    }
  }
);

toolManager.onColorCycle = () => {
  const active = toolManager.activeToolName;
  if (active === 'colorpen') {
    const next = (colorPenTool.colorIndex + 1) % 6;
    colorPenTool.setColorIndex(next);
    toolbar.colorIndex.colorpen = next;
    toolbar.showSubtoolPanel('colorpen');
  } else if (active === 'highlighter') {
    const next = (highlighterTool.colorIndex + 1) % 6;
    highlighterTool.setColorIndex(next);
    toolbar.colorIndex.highlighter = next;
    toolbar.showSubtoolPanel('highlighter');
  }
};

// ============================================================
// 页面导航
// ============================================================

const pageNav = new PageNavUI((dir) => {
  if (dir === 'forward') flipForward(); else flipBackward();
});

function flipForward() { if (notebook.flipForward()) updatePageNavUI(); }
function flipBackward() { if (notebook.flipBackward()) updatePageNavUI(); }
function updatePageNavUI() { pageNav.update(notebook.getCurrentPageNumber(), notebook.getTotalSpreads()); }
updatePageNavUI();

// ============================================================
// 探索UI
// ============================================================

const exploreUI = new ExploreUI();

// ============================================================
// 聊天
// ============================================================

const chatUI = new ChatUI();
let isChatMode = false;

// ============================================================
// 模式切换
// ============================================================

function setMode(mode) {
  currentMode = mode;

  const toolInfo = document.getElementById('tool-info');
  const toolbarEl = document.getElementById('toolbar');
  const pageNavEl = document.getElementById('page-nav');
  const backBtn = document.getElementById('back-to-explore');
  const exploreHud = document.getElementById('explore-hud');
  const exploreCtrl = document.getElementById('explore-controls');
  const writingCtrl = document.getElementById('writing-controls');

  // 隐藏全部UI
  if (toolInfo) toolInfo.classList.remove('visible');
  if (toolbarEl) toolbarEl.classList.remove('visible');
  if (pageNavEl) pageNavEl.classList.remove('visible');
  if (backBtn) backBtn.classList.remove('visible');
  if (exploreHud) exploreHud.classList.add('hidden');
  if (exploreCtrl) exploreCtrl.style.display = 'none';
  if (writingCtrl) writingCtrl.classList.remove('visible');
  // 隐藏所有弹出层
  ALL_OVERLAY_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });

  // BGM：仅explore模式播放，其余模式停止
  if (mode === 'explore') {
    audio.startBGM();
  } else {
    audio.stopBGM();
  }

  if (mode === 'explore') {
    // 清理maze模式的键盘监听器，避免累积泄漏
    if (window._mazeCleanup) { window._mazeCleanup(); window._mazeCleanup = null; }
    exploreUI.show();
    if (exploreHud) exploreHud.classList.remove('hidden');
    if (exploreCtrl) exploreCtrl.style.display = 'block';
    canvas.style.cursor = 'default';
  } else if (mode === 'writing') {
    exploreUI.hide();
    if (toolInfo) toolInfo.classList.add('visible');
    if (toolbarEl) toolbarEl.classList.add('visible');
    if (pageNavEl) pageNavEl.classList.add('visible');
    if (backBtn) backBtn.classList.add('visible');
    if (writingCtrl) writingCtrl.classList.add('visible');
    computeWritingPageRect();
    toolManager.bindEvents(canvas);
    canvas.style.cursor = 'crosshair';
  } else if (OVERLAY_MAP[mode]) {
    exploreUI.hide();
    OVERLAY_MAP[mode].show();
    progress.incrementVisit(mode);  // 🪙 区域访问追踪
  }
  // 移动端：非 explore 模式时隐藏互动按钮
  if (typeof updateInteractButton === 'function') updateInteractButton();
}

function handleZoneInteract(zoneType) {
  audio.playSFX('interact'); // 区域互动音效
  haptic('medium'); // 📳 区域互动触觉反馈
  switch (zoneType) {
    case 'notebook':
      setMode('writing');
      showNotification(IS_MOBILE ? '进入书写模式 — 点击返回按钮 返回探索' : '进入书写模式 — ESC 返回探索');
      break;
    case 'album': setMode('album'); showNotification('📷 相册 — 上传和浏览照片！'); break;
    default:
      if (OVERLAY_MAP[zoneType]) { setMode(zoneType); }
      break;
  }
}

// initOverlayContext — 注入所有 overlay 模块共享的依赖
// （在 gameWorld / audio / 设置等初始化完成后调用）
function initOverlays() {
  initOverlayContext({
    setMode, bindOverlayClose, showNotification, audio, gameWorld,
    WORLD_W, WORLD_H, storageClient, progress, isMobile: IS_MOBILE,
    helpers: { dbListMessages, dbAddMessage, dbListBoardMessages, dbAddBoardMessage, dbListWishes, dbAddWish, loadConfig, saveConfig, AI_CONFIG, AIClient },
    ALL_OVERLAY_IDS, OVERLAY_MODES: Object.keys(OVERLAY_MAP),
  });
}

function bindOverlayClose(overlayId, closeBtnId) {
  const overlay = document.getElementById(overlayId);
  const closeBtn = document.getElementById(closeBtnId);
  if (closeBtn) closeBtn.onclick = () => { if (overlay) overlay.classList.remove('visible'); setMode('explore'); };
  if (overlay) overlay.onclick = (e) => { if (e.target === overlay) { overlay.classList.remove('visible'); setMode('explore'); } };
  return overlay;
}

// ============================================================
// 返回探索按钮
// ============================================================

const backBtn = document.getElementById('back-to-explore');
if (backBtn) backBtn.addEventListener('click', () => { musicOverlay.stopMelody(); setMode('explore'); });

// ── 音效开关按钮 ──
const audioToggleBtn = document.getElementById('audio-toggle-btn');
if (audioToggleBtn) {
  // 初始图标
  audioToggleBtn.textContent = audio.enabled ? '🔊' : '🔇';
  audioToggleBtn.addEventListener('click', () => {
    audio.resume();
    audio.setEnabled(!audio.enabled);
    audioToggleBtn.textContent = audio.enabled ? '🔊' : '🔇';
  });
}

// ============================================================
// 书写模式 — 页面矩形 + 渲染
// ============================================================

const PAGE_GAP = 20;
const PAGE_MARGIN_TOP = 50;
let leftPageRect = { left: 0, top: 0, width: 0, height: 0 };
let rightPageRect = { left: 0, top: 0, width: 0, height: 0 };

function computeWritingPageRect() {
  const vw = canvas.width, vh = canvas.height;
  const availW = vw - 100, availH = vh - PAGE_MARGIN_TOP - 80;
  const pageAspect = PAGE_W / PAGE_H;
  let pageDisplayH = availH, pageDisplayW = pageDisplayH * pageAspect;
  const totalW = 2 * pageDisplayW + PAGE_GAP;
  if (totalW > availW) { pageDisplayW = (availW - PAGE_GAP) / 2; pageDisplayH = pageDisplayW / pageAspect; }
  const startX = 80 + (availW - totalW) / 2;
  const startY = PAGE_MARGIN_TOP + (availH - pageDisplayH) / 2;
  leftPageRect = { left: startX, top: startY, width: pageDisplayW, height: pageDisplayH };
  rightPageRect = { left: startX + pageDisplayW + PAGE_GAP, top: startY, width: pageDisplayW, height: pageDisplayH };
  toolManager.setPageRect(leftPageRect);
}

function renderWritingMode(ctx, _time) {
  const vw = canvas.width, vh = canvas.height;
  const deskGrad = ctx.createLinearGradient(0, 0, 0, vh);
  deskGrad.addColorStop(0, '#D4C4A8');
  deskGrad.addColorStop(1, '#c9b998');
  ctx.fillStyle = deskGrad;
  ctx.fillRect(0, 0, vw, vh);

  const leftPage = notebook.getCurrentLeftPage();
  if (leftPage) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(leftPageRect.left + 3, leftPageRect.top + 3, leftPageRect.width, leftPageRect.height);
    leftPage.drawToCanvas(ctx, leftPageRect.left, leftPageRect.top, leftPageRect.width, leftPageRect.height);
    ctx.strokeStyle = 'rgba(44,44,58,0.12)'; ctx.lineWidth = 1;
    ctx.strokeRect(leftPageRect.left, leftPageRect.top, leftPageRect.width, leftPageRect.height);
  }
  const rightPage = notebook.getCurrentRightPage();
  if (rightPage) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(rightPageRect.left + 3, rightPageRect.top + 3, rightPageRect.width, rightPageRect.height);
    rightPage.drawToCanvas(ctx, rightPageRect.left, rightPageRect.top, rightPageRect.width, rightPageRect.height);
    ctx.strokeStyle = 'rgba(44,44,58,0.12)'; ctx.lineWidth = 1;
    ctx.strokeRect(rightPageRect.left, rightPageRect.top, rightPageRect.width, rightPageRect.height);
  }
  const spineX = leftPageRect.left + leftPageRect.width + PAGE_GAP / 2;
  ctx.strokeStyle = 'rgba(44,44,58,0.08)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(spineX, leftPageRect.top); ctx.lineTo(spineX, leftPageRect.top + leftPageRect.height); ctx.stroke();
}

function syncToolName(toolId) {
  const nameEl = document.getElementById('current-tool-name');
  if (nameEl) {
    const names = { pencil: '铅笔', colorpen: '彩笔', eraser: '橡皮', highlighter: '荧光笔', text: '文字', sticker: '贴纸' };
    nameEl.textContent = names[toolId] || toolId;
  }
}

// ============================================================
// 输入 — 键盘
// ============================================================

document.addEventListener('keydown', (e) => {
  // 首次交互时激活音频上下文
  audio.resume();

  // Ctrl+F / Cmd+F — 全局快捷搜索（writing模式下不拦截，允许浏览器原生搜索）
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
    if (currentMode === 'writing') return; // writing模式允许浏览器默认搜索
    e.preventDefault(); // 阻止浏览器默认搜索
    e.stopPropagation();
    setMode('search');
    return;
  }

  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    if (isChatMode && chatUI.isActive()) {
      if (e.code === 'Enter') {
        const msg = chatUI.getMessage();
        if (msg) { showNotification(msg); if (multiplayerReady) peerManager.sendChat(msg); }
        chatUI.hide(); isChatMode = false;
      }
      if (e.code === 'Escape') { chatUI.hide(); isChatMode = false; }
    }
    // 搜索输入框中 ESC 关闭搜索overlay
    if (currentMode === 'search' && e.code === 'Escape') {
      e.preventDefault();
      document.getElementById('search-overlay').classList.remove('visible');
      setMode('explore');
      return;
    }
    return;
  }

  // 相册 Lightbox 键盘导航
  const lbEl2 = document.getElementById('album-lightbox');
  if (lbEl2 && lbEl2.style.display === 'flex') {
    if (e.code === 'ArrowLeft') { albumOverlay.lightboxPrev(); return; }
    if (e.code === 'ArrowRight') { albumOverlay.lightboxNext(); return; }
  }

  if (e.code === 'Escape') {
    const textOverlay = document.getElementById('text-input-overlay');
    if (textOverlay && textOverlay.style.display === 'flex') return;
    // 如果相册密码弹窗打开，先关闭它而不退出 album 模式
    const pwdPanel = document.getElementById('album-password-panel');
    if (pwdPanel && pwdPanel.classList.contains('visible')) { albumOverlay.cancelAlbumPassword(); return; }
    // 成就面板 ESC 关闭
    if (isBadgePanelOpen()) { closeBadgePanel(); return; }
    if (currentMode !== 'explore') {
      e.preventDefault();
      musicOverlay.stopMelody();
      sharpenerOverlay.stopGame();
      hourglassOverlay.clearTimer();
      abacusOverlay.clearTimer();
      setMode('explore');
      return;
    }
  }

  if (currentMode === 'explore') {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') input.up = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
    if (e.code === 'KeyF' && !input._interactPressed) { input.interact = true; input._interactPressed = true; }
    if (e.code === 'KeyM') { const vis = toggleMinimap(); showNotification(vis ? '🗺️ 小地图已开启' : '🗺️ 小地图已关闭'); }
    if (e.code === 'Enter' && !isChatMode) { isChatMode = true; chatUI.show(); }
  }

  if (currentMode === 'writing') {
    if (e.code === 'ArrowRight' || e.code === 'ArrowDown') flipForward();
    if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') flipBackward();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') input.up = false;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = false;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
  if (e.code === 'KeyF') { input.interact = false; input._interactPressed = false; }
});

// ============================================================
// 输入 — 鼠标
// ============================================================

canvas.addEventListener('mousedown', (e) => {
  audio.resume(); // 首次交互激活音频
  if (currentMode === 'explore' && e.button === 0) {
    const world = gameWorld.screenToWorld(e.clientX, e.clientY);
    gameWorld.player.navigateTo(world.x, world.y);
    spawnClickRipple(world.x, world.y);
    audio.playSFX('click');
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (currentMode === 'writing' && toolManager.activeToolName === 'eraser') {
    eraserTool.updateCursorPosition(e.clientX, e.clientY);
  }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================================
// 移动端触摸事件
// ============================================================

if (IS_MOBILE) {
  // 阻止移动端默认触摸行为（缩放/滚动）
  canvas.style.touchAction = 'none';
  document.body.style.touchAction = 'none';
  document.body.style.overscrollBehavior = 'none';
  // 阻止双击缩放
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  // 阻止 Safari 双指捏合缩放
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });

  // 探索模式：点击移动（touch → 等效 mouse/keyboard click-to-navigate）
  canvas.addEventListener('touchstart', (e) => {
    if (currentMode !== 'explore') return;
    e.preventDefault();
    audio.resume();
    const touch = e.touches[0];
    const world = gameWorld.screenToWorld(touch.clientX, touch.clientY);
    gameWorld.player.navigateTo(world.x, world.y);
    spawnClickRipple(world.x, world.y);
    audio.playSFX('click');

    // 浮动互动按钮：判断是否在zone附近
    updateInteractButton();
  }, { passive: false });

  // 书写模式：将触摸事件传递给 toolManager
  // （CanvasToolManager.bindTouchEvents 内部处理）
  toolManager.bindTouchEvents(canvas);

  // 橡皮擦光标跟随（触控板+移动端）
  canvas.addEventListener('touchmove', (e) => {
    if (currentMode === 'writing' && toolManager.activeToolName === 'eraser') {
      const touch = e.touches[0];
      if (touch) eraserTool.updateCursorPosition(touch.clientX, touch.clientY);
    }
  }, { passive: true });
}

// 浮动互动按钮（移动端替代 F 键）
const interactBtn = document.getElementById('mobile-interact-btn');
function updateInteractButton(nearZone) {
  if (!interactBtn) return;
  if (!IS_MOBILE || currentMode !== 'explore') {
    interactBtn.classList.remove('visible');
    return;
  }
  // nearZone 由 gameLoop 每帧传入；没有参数时用上一次缓存
  if (nearZone !== undefined) interactBtn._nearZone = nearZone;
  const nz = interactBtn._nearZone;
  if (nz) {
    interactBtn.textContent = nz.emoji + ' ' + nz.label;
    interactBtn.classList.add('visible');
  } else {
    interactBtn.classList.remove('visible');
  }
}
if (interactBtn) {
  interactBtn.addEventListener('click', () => {
    const nz = interactBtn._nearZone;
    if (nz) {
      handleZoneInteract(nz.type);
      interactBtn.classList.remove('visible');
    }
  });
}

// 移动端 HUD 文案适配
if (IS_MOBILE) {
  const hudHint = document.querySelector('#explore-hud > span:first-child');
  if (hudHint) hudHint.textContent = '点击移动 · 靠近场景互动';
}

// ============================================================
// 多人协作（非阻塞）
// ============================================================

setLoadingProgress(85, '连接中...');

const peerManager = new PeerManager();
let multiplayerReady = false;

initMultiplayer();

async function initMultiplayer() {
  try {
    const roomId = await peerManager.init();
    peerManager.onRemoteJoin = () => updateOnlineCount();
    peerManager.onRemoteLeave = () => updateOnlineCount();
    peerManager.onRemoteChat = (_, message) => showNotification('写作者: ' + message);
    peerManager.onRemoteEdit = (_, data) => applyRemoteEdit(data);
    multiplayerReady = true;
    showNotification('已连接到房间');
  } catch (err) {
    console.warn('[Main] 多人连接失败:', err);
    showNotification('单人模式');
  }
}

function updateOnlineCount() {
  const el = document.getElementById('online-count');
  if (el) el.textContent = '1';
}

function applyRemoteEdit(data) {
  const pageIdx = data.pageIndex !== undefined ? data.pageIndex : notebook.currentSpread;
  const page = notebook.getPage(pageIdx);
  if (!page) return;
  switch (data.type) {
    case 'stroke-add': if (data.stroke) page.addStroke(data.stroke); break;
    case 'stroke-erase': if (data.x !== undefined) page.eraseAt(data.x, data.y, data.radius || 20); break;
    case 'text-add': if (data.textBox) page.addTextBox(data.textBox); break;
    case 'sticker-add': if (data.sticker) page.addSticker(data.sticker); break;
  }
}

pencilTool.onStrokeComplete = (stroke, side) => { if (multiplayerReady) peerManager.sendEdit({ type: 'stroke-add', stroke, pageIndex: notebook.currentSpread + (side === 'right' ? 1 : 0) }); };
colorPenTool.onStrokeComplete = (stroke, side) => { if (multiplayerReady) peerManager.sendEdit({ type: 'stroke-add', stroke, pageIndex: notebook.currentSpread + (side === 'right' ? 1 : 0) }); };
highlighterTool.onStrokeComplete = (stroke, side) => { if (multiplayerReady) peerManager.sendEdit({ type: 'stroke-add', stroke, pageIndex: notebook.currentSpread + (side === 'right' ? 1 : 0) }); };
eraserTool.onErase = (hit, side) => { if (multiplayerReady) peerManager.sendEdit({ type: 'stroke-erase', x: hit.x, y: hit.y, radius: eraserTool.radius, pageIndex: notebook.currentSpread + (side === 'right' ? 1 : 0) }); };
textTool.onTextAdded = (textBox, side) => { if (multiplayerReady) peerManager.sendEdit({ type: 'text-add', textBox, pageIndex: notebook.currentSpread + (side === 'right' ? 1 : 0) }); };
stickerTool.onStickerAdded = (sticker, side) => { if (multiplayerReady) peerManager.sendEdit({ type: 'sticker-add', sticker, pageIndex: notebook.currentSpread + (side === 'right' ? 1 : 0) }); };

function syncInkDotToActiveTool() {
  const activeTool = toolManager.getActiveTool();
  if (activeTool && activeTool.color !== undefined) {
    const inkDot = document.getElementById('ink-color-dot');
    if (inkDot) inkDot.style.background = '#' + activeTool.color.toString(16).padStart(6, '0');
  }
}

// ============================================================
// 动画循环
// ============================================================

setLoadingProgress(100, '准备就绪...');

// ── 角色定制流程 ────────────────────────────────
const PLAYER_APPEARANCE_KEY = 'player-appearance';

/** 从 localStorage 读取已保存的外观 */
function loadPlayerAppearance() {
  try {
    const raw = localStorage.getItem(PLAYER_APPEARANCE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

/** 保存外观到 localStorage */
function savePlayerAppearance(cfg) {
  try { localStorage.setItem(PLAYER_APPEARANCE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

/** 读取角色定制器当前所有选项，合成外观对象 */
function collectCreatorConfig() {
  const hairStyle = document.querySelector('input[name="cc-hair"]:checked')?.value || 'short';
  const hatStyle = document.querySelector('input[name="cc-hat"]:checked')?.value || 'beanie';
  const scarfOn = (document.querySelector('input[name="cc-scarf"]:checked')?.value || 'on') === 'on';
  const shirt = document.getElementById('cc-shirt')?.value || '#26A69A';
  // 自动计算暗面色
  const shirtDark = darkenColorHex(shirt, 30);
  const hat = document.getElementById('cc-hat-color')?.value || '#EA5455';
  const hatDark = darkenColorHex(hat, 30);
  return {
    skin:     document.getElementById('cc-skin')?.value || '#FFDBB4',
    hair:     document.getElementById('cc-hair-color')?.value || '#3E2723',
    shirt,
    shirtDark,
    pants:    document.getElementById('cc-pants')?.value || '#3D5A80',
    hat,
    hatDark,
    scarf:    document.getElementById('cc-scarf-color')?.value || '#FFD54F',
    shoe:     document.getElementById('cc-shoe')?.value || '#4E342E',
    cheek:    document.getElementById('cc-cheek')?.value || '#FFB5A0',
    hairStyle,
    hatStyle,
    scarfOn,
  };
}

/** 辅助：hex 颜色变暗 */
function darkenColorHex(hex, amount) {
  if (!hex || !hex.startsWith('#')) return hex;
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/** 将外观配置写入定制器 UI 控件 */
function applyConfigToCreator(cfg) {
  const a = mergeAppearance(cfg);
  // 发型
  const hairRadio = document.querySelector(`input[name="cc-hair"][value="${a.hairStyle}"]`);
  if (hairRadio) hairRadio.checked = true;
  // 帽子
  const hatRadio = document.querySelector(`input[name="cc-hat"][value="${a.hatStyle}"]`);
  if (hatRadio) hatRadio.checked = true;
  // 围巾
  const scarfVal = a.scarfOn ? 'on' : 'off';
  const scarfRadio = document.querySelector(`input[name="cc-scarf"][value="${scarfVal}"]`);
  if (scarfRadio) scarfRadio.checked = true;
  // 颜色
  const setColor = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setColor('cc-skin', a.skin);
  setColor('cc-hair-color', a.hair);
  setColor('cc-shirt', a.shirt);
  setColor('cc-pants', a.pants);
  setColor('cc-shoe', a.shoe);
  setColor('cc-hat-color', a.hat);
  setColor('cc-scarf-color', a.scarf);
  setColor('cc-cheek', a.cheek);
}

/** 绘制预览 Canvas */
function renderCreatorPreview() {
  const cvs = document.getElementById('cc-canvas');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  const cfg = collectCreatorConfig();
  // 在画布中央绘制角色（面朝下、站立）
  drawPlayer(ctx, cvs.width / 2, cvs.height - 20, 'down', 0, false, cfg);
}

/** 启动角色定制器 */
function showCharacterCreator() {
  const saved = loadPlayerAppearance();
  if (saved) applyConfigToCreator(saved);
  document.getElementById('character-creator').style.display = 'flex';
  // 绑定实时预览
  const onChange = () => setTimeout(renderCreatorPreview, 0);
  document.querySelectorAll('#character-creator input').forEach(el => {
    el.addEventListener('input', onChange);
    el.addEventListener('change', onChange);
  });
  renderCreatorPreview();
}

/** 角色定制完成，进入游戏 */
function finishCharacterCreator() {
  const cfg = collectCreatorConfig();
  savePlayerAppearance(cfg);
  gameWorld.setPlayerAppearance(cfg);
  document.getElementById('character-creator').style.display = 'none';
  launchGame();
}

// ── 游戏启动入口 ──────────────────────────────
let gameLaunched = false;

function launchGame() {
  if (gameLaunched) return;
  gameLaunched = true;
  hideLoading();
  setTimeout(() => { const hint = document.getElementById('explore-controls'); if (hint) hint.style.opacity = '0'; }, 6000);
}

setTimeout(() => {
  const saved = loadPlayerAppearance();
  const skipNext = localStorage.getItem(PLAYER_APPEARANCE_KEY + '-skip') === 'true';
  // 如果已有保存的外观且用户选择跳过，直接进入
  if (saved && skipNext) {
    gameWorld.setPlayerAppearance(saved);
    launchGame();
  } else {
    // 显示角色定制器
    hideLoading();
    showCharacterCreator();
  }

  // 绑定「开始探索」按钮
  const startBtn = document.getElementById('cc-start-btn');
  if (startBtn) startBtn.onclick = () => {
    const skipEl = document.getElementById('cc-skip-next');
    if (skipEl && skipEl.checked) {
      localStorage.setItem(PLAYER_APPEARANCE_KEY + '-skip', 'true');
    } else {
      localStorage.removeItem(PLAYER_APPEARANCE_KEY + '-skip');
    }
    finishCharacterCreator();
  };
}, 300);

let lastTime = 0;
let startTime = 0;

const OVERLAY_MODES = Object.keys(OVERLAY_MAP);

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  if (!startTime) startTime = timestamp;
  const delta = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  const time = (timestamp - startTime) / 1000;

  const fps = updateFps();
  const fpsEl = document.getElementById('fps-display');
  if (fpsEl) fpsEl.textContent = fps;

  // === 3D 场景更新（每帧先渲染3D底层） ===
  const show3D = (currentMode === 'explore');
  if (show3D) {
    deskScene.updateParallax(gameWorld.cameraX, gameWorld.cameraY, WORLD_W, WORLD_H);
    deskScene.update(delta);
  }
  // 3D始终渲染（overlay下保持可见），writing模式也渲染以过渡自然
  deskScene.render();

  // 控制3D画布可见性
  const threeEl = document.getElementById('three-canvas');
  if (threeEl) threeEl.style.opacity = show3D ? '1' : '0.3';

  // 2D 画布清除（探索模式用半透明底色让3D穿透）
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (currentMode) {
    case 'explore':
      gameWorld.update(delta, input);
      input.interact = false;

      const nearZone = gameWorld.getNearZone();
      exploreUI.setTooltip(nearZone ? (IS_MOBILE ? '点击 💬 互动 — ' + nearZone.label : '按 F — ' + nearZone.label) : '');

      // 移动端：浮动互动按钮显隐
      if (IS_MOBILE) updateInteractButton(nearZone);

      // 探索模式下2D背景半透（0.82），3D桌面纹理可见
      gameWorld.render(ctx, time, 0.82);

      // 小地图渲染（仅探索模式）
      renderMinimap(gameWorld, time);

      // 移动时播放脚步音效
      if (gameWorld.player.navigating) audio.playSFX('step');
      break;

    case 'writing':
      renderWritingMode(ctx, time);
      syncInkDotToActiveTool();
      break;

    default:
      if (OVERLAY_MODES.includes(currentMode)) {
        gameWorld.update(0, input);
        ctx.save();
        ctx.globalAlpha = 0.3;
        gameWorld.render(ctx, time);
        ctx.restore();
      }
      break;
  }
}

requestAnimationFrame(gameLoop);
setMode('explore');

console.log('手绘笔记本世界已初始化！');
