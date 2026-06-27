// main.js — 2D Canvas 游戏循环 + 模式切换（探索 ↔ 书写 ↔ 27个交互区域）

// 核心
import { NotebookWorld } from './core/NotebookWorld.js';

// 2D探索世界
import { GameWorld } from './world/GameWorld.js';
import { WORLD_W, WORLD_H, spawnClickRipple, drawPlayer, DEFAULT_APPEARANCE, mergeAppearance } from './world/WorldRenderer.js';
import { DeskScene } from './3d/DeskScene.js';
import { initMinimap, toggleMinimap, renderMinimap, handleMinimapClick } from './world/MinimapRenderer.js';

// AI对话
import { AIClient, loadConfig, saveConfig } from './ai/AIClient.js';
import AI_CONFIG from './ai/ai.config.js';

// 图床（Supabase）
import { storageClient, loadPhotos as loadPhotos$1, loadAlbumPassword, saveAlbumPassword } from './supabase/StorageClient.js';
import SUPABASE_CONFIG from './supabase/supabase.config.js';

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
import { PAGE_W, PAGE_H } from './core/PageTemplate.js';

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
}

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

  switch (mode) {
    case 'explore':
      // 清理maze模式的键盘监听器，避免累积泄漏
      if (window._mazeCleanup) { window._mazeCleanup(); window._mazeCleanup = null; }
      exploreUI.show();
      if (exploreHud) exploreHud.classList.remove('hidden');
      if (exploreCtrl) exploreCtrl.style.display = 'block';
      canvas.style.cursor = 'default';
      break;
    case 'writing':
      exploreUI.hide();
      if (toolInfo) toolInfo.classList.add('visible');
      if (toolbarEl) toolbarEl.classList.add('visible');
      if (pageNavEl) pageNavEl.classList.add('visible');
      if (backBtn) backBtn.classList.add('visible');
      if (writingCtrl) writingCtrl.classList.add('visible');
      computeWritingPageRect();
      toolManager.bindEvents(canvas);
      canvas.style.cursor = 'crosshair';
      break;
    case 'board':
      exploreUI.hide();
      showBoardOverlay();
      break;
    case 'shelf':
      exploreUI.hide();
      showShelfOverlay();
      break;
    case 'coffee':
      exploreUI.hide();
      showCoffeeOverlay();
      break;
    case 'album':
      exploreUI.hide();
      showAlbumOverlay();
      break;
    case 'mailbox':
      exploreUI.hide();
      showMailboxOverlay();
      break;
    case 'graffiti':
      exploreUI.hide();
      showGraffitiOverlay();
      break;
    case 'dart':
      exploreUI.hide();
      showDartOverlay();
      break;
    case 'dice':
      exploreUI.hide();
      showDiceOverlay();
      break;
    case 'card':
      exploreUI.hide();
      showCardOverlay();
      break;
    case 'spin':
      exploreUI.hide();
      showSpinOverlay();
      break;
    case 'music':
      exploreUI.hide();
      showMusicOverlay();
      break;
    case 'maze':
      exploreUI.hide();
      showMazeOverlay();
      break;
    case 'puzzle':
      exploreUI.hide();
      showPuzzleOverlay();
      break;
    case 'klotski':
      exploreUI.hide();
      showKlotskiOverlay();
      break;
    case 'sudoku':
      exploreUI.hide();
      showSudokuOverlay();
      break;
    case 'wish':
      exploreUI.hide();
      showWishOverlay();
      break;
    case 'magic':
      exploreUI.hide();
      showMagicOverlay();
      break;
    case 'constellation':
      exploreUI.hide();
      showConstellationOverlay();
      break;
    case 'hourglass':
      exploreUI.hide();
      showHourglassOverlay();
      break;
    case 'kaleidoscope':
      exploreUI.hide();
      showKaleidoscopeOverlay();
      break;
    case 'diary':
      exploreUI.hide();
      showDiaryOverlay();
      break;
    case 'weather':
      exploreUI.hide();
      showWeatherOverlay();
      break;
    case 'cooking':
      exploreUI.hide();
      showCookingOverlay();
      break;
    case 'map':
      exploreUI.hide();
      showMapOverlay();
      break;
    case 'chat':
      exploreUI.hide();
      showChatOverlay();
      break;
    case 'search':
      exploreUI.hide();
      showSearchOverlay();
      break;
    case 'sharpener':
      exploreUI.hide();
      showSharpenerOverlay();
      break;
    case 'inkwell':
      exploreUI.hide();
      showInkwellOverlay();
      break;
    case 'origami':
      exploreUI.hide();
      showOrigamiOverlay();
      break;
    case 'sticker':
      exploreUI.hide();
      showStickerOverlay();
      break;
    case 'abacus':
      exploreUI.hide();
      showAbacusOverlay();
      break;
    case 'capsule':
      exploreUI.hide();
      showCapsuleOverlay();
      break;
  }
}

function handleZoneInteract(zoneType) {
  audio.playSFX('interact'); // 区域互动音效
  switch (zoneType) {
    case 'notebook':
      setMode('writing');
      showNotification('进入书写模式 — ESC 返回探索');
      break;
    case 'board': setMode('board'); break;
    case 'shelf': setMode('shelf'); break;
    case 'coffee': setMode('coffee'); break;
    case 'album': setMode('album'); showNotification('📷 相册 — 上传和浏览照片！'); break;
    case 'mailbox': setMode('mailbox'); break;
    case 'graffiti': setMode('graffiti'); break;
    case 'dart': setMode('dart'); break;
    case 'dice': setMode('dice'); break;
    case 'card': setMode('card'); break;
    case 'spin': setMode('spin'); break;
    case 'music': setMode('music'); break;
    case 'maze': setMode('maze'); break;
    case 'puzzle': setMode('puzzle'); break;
    case 'klotski': setMode('klotski'); break;
    case 'sudoku': setMode('sudoku'); break;
    case 'wish': setMode('wish'); break;
    case 'magic': setMode('magic'); break;
    case 'constellation': setMode('constellation'); break;
    case 'hourglass': setMode('hourglass'); break;
    case 'kaleidoscope': setMode('kaleidoscope'); break;
    case 'diary': setMode('diary'); break;
    case 'weather': setMode('weather'); break;
    case 'cooking': setMode('cooking'); break;
    case 'map': setMode('map'); break;
    case 'chat': setMode('chat'); break;
    case 'search': setMode('search'); break;
    case 'sharpener': setMode('sharpener'); showNotification('✏️ 铅笔刀节奏 — 方向键击拍！'); break;
    case 'inkwell': setMode('inkwell'); showNotification('🪄 墨水台 — 调出目标色！'); break;
    case 'origami': setMode('origami'); showNotification('🦢 折纸桌 — 记住折叠序列！'); break;
    case 'sticker': setMode('sticker'); showNotification('🏷️ 贴纸册 — 收集稀有贴纸！'); break;
    case 'abacus': setMode('abacus'); showNotification('🧮 算盘 — 限时算术！'); break;
    case 'capsule': setMode('capsule'); showNotification('⏰ 时光胶囊 — 给未来的信！'); break;
  }
}

// ============================================================
// 弹出层通用：绑定关闭
// ============================================================

function bindOverlayClose(overlayId, closeBtnId) {
  const overlay = document.getElementById(overlayId);
  const closeBtn = document.getElementById(closeBtnId);
  if (closeBtn) closeBtn.onclick = () => { if (overlay) overlay.classList.remove('visible'); setMode('explore'); };
  if (overlay) overlay.onclick = (e) => { if (e.target === overlay) { overlay.classList.remove('visible'); setMode('explore'); } };
  return overlay;
}

// ============================================================
// 区域弹出层
// ============================================================

function showBoardOverlay() {
  const board = gameWorld.getZoneByType('board');
  if (!board) return;
  const container = document.getElementById('board-messages');
  if (container) {
    container.innerHTML = '';
    board.messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'board-message';
      div.textContent = msg;
      container.appendChild(div);
    });
  }
  bindOverlayClose('board-overlay', 'board-close');
  document.getElementById('board-overlay').classList.add('visible');
}

function showShelfOverlay() {
  const container = document.getElementById('shelf-books');
  if (container) {
    container.innerHTML = '';
    ['📖 页面模板指南', '📒 绘画技巧入门', '📓 墨水与色彩原理', '📕 贴纸图鉴 Vol.1', '📗 创意写作秘诀']
      .forEach(title => { const div = document.createElement('div'); div.className = 'shelf-book'; div.textContent = title; container.appendChild(div); });
  }
  bindOverlayClose('shelf-overlay', 'shelf-close');
  document.getElementById('shelf-overlay').classList.add('visible');
}

function showCoffeeOverlay() {
  bindOverlayClose('coffee-overlay', 'coffee-close');
  document.getElementById('coffee-overlay').classList.add('visible');
}

// ============================================================
// 🔒 相册密码锁
// ============================================================

let albumSessionAuthed = false;       // 本次会话是否已验证
let albumPendingAction = null;         // 验证通过后要执行的回调

/** 获取当前相册密码（从 localStorage 读取，不使用构建时内联值） */
function getAlbumPassword() {
  return loadAlbumPassword();
}

/** 是否启用密码锁 */
function isAlbumPasswordEnabled() {
  return getAlbumPassword() !== '';
}

/** 弹出密码弹窗，验证通过后执行 action */
function requestAlbumAuth(action) {
  // 已验证或无密码 → 直接放行
  if (albumSessionAuthed || !isAlbumPasswordEnabled()) {
    // localStorage 中没有密码 → 提示设置
    if (!isAlbumPasswordEnabled()) {
      showAlbumPwdSetup(action);
      return;
    }
    action();
    return;
  }
  albumPendingAction = action;
  const panel = document.getElementById('album-password-panel');
  const input = document.getElementById('album-password-input');
  const error = document.getElementById('album-password-error');
  // 切换为验证模式
  document.getElementById('album-pwd-verify-section').style.display = '';
  document.getElementById('album-pwd-setup-section').style.display = 'none';
  if (input) input.value = '';
  if (error) error.textContent = '';
  if (panel) panel.classList.add('visible');
  setTimeout(() => { if (input) input.focus(); }, 100);
}

/** 显示密码设置面板（首次使用时） */
function showAlbumPwdSetup(action) {
  albumPendingAction = action;
  const panel = document.getElementById('album-password-panel');
  const error = document.getElementById('album-pwd-setup-error');
  // 切换为设置模式
  document.getElementById('album-pwd-verify-section').style.display = 'none';
  document.getElementById('album-pwd-setup-section').style.display = '';
  const newInput = document.getElementById('album-pwd-new');
  const confirm2Input = document.getElementById('album-pwd-confirm2');
  if (newInput) newInput.value = '';
  if (confirm2Input) confirm2Input.value = '';
  if (error) error.textContent = '';
  if (panel) panel.classList.add('visible');
  setTimeout(() => { if (newInput) newInput.focus(); }, 100);
}

/** 保存新设置的相册密码 */
function setupAlbumPassword() {
  const newPwd = (document.getElementById('album-pwd-new')?.value || '').trim();
  const confirm2 = (document.getElementById('album-pwd-confirm2')?.value || '').trim();
  const error = document.getElementById('album-pwd-setup-error');

  if (!newPwd) {
    if (error) error.textContent = '❌ 密码不能为空';
    return;
  }
  if (newPwd !== confirm2) {
    if (error) error.textContent = '❌ 两次输入不一致';
    return;
  }
  saveAlbumPassword(newPwd);
  albumSessionAuthed = true;
  const panel = document.getElementById('album-password-panel');
  if (panel) panel.classList.remove('visible');
  audio.playSFX('success');
  showNotification('✅ 相册密码已设置');
  if (albumPendingAction) {
    albumPendingAction();
    albumPendingAction = null;
  }
}

/** 跳过密码设置（不设置密码，直接操作） */
function skipAlbumPasswordSetup() {
  const panel = document.getElementById('album-password-panel');
  if (panel) panel.classList.remove('visible');
  if (albumPendingAction) {
    albumPendingAction();
    albumPendingAction = null;
  }
}

function confirmAlbumPassword() {
  const input = document.getElementById('album-password-input');
  const error = document.getElementById('album-password-error');
  const pwd = input ? input.value : '';
  const expected = getAlbumPassword();

  if (pwd === expected) {
    albumSessionAuthed = true;
    const panel = document.getElementById('album-password-panel');
    if (panel) panel.classList.remove('visible');
    audio.playSFX('success');
    if (albumPendingAction) {
      albumPendingAction();
      albumPendingAction = null;
    }
  } else {
    if (error) error.textContent = '❌ 密码错误，请重试';
    audio.playSFX('fail');
    if (input) { input.value = ''; input.focus(); }
  }
}

function cancelAlbumPassword() {
  const panel = document.getElementById('album-password-panel');
  if (panel) panel.classList.remove('visible');
  albumPendingAction = null;
}

function showAlbumOverlay() {
  bindOverlayClose('album-overlay', 'album-close');
  document.getElementById('album-overlay').classList.add('visible');

  document.getElementById('album-empty').style.display = 'none';
  document.getElementById('album-uploading').style.display = 'none';

  if (storageClient.isConfigured()) {
    renderAlbumGrid();
  }

  // 上传按钮（需要密码验证）
  const uploadBtn = document.getElementById('album-upload-btn');
  const fileInput = document.getElementById('album-file-input');
  if (uploadBtn) uploadBtn.onclick = () => {
    if (!storageClient.isConfigured()) {
      showNotification('请先配置图床 ⚙️');
      return;
    }
    requestAlbumAuth(() => fileInput.click());
  };
  if (fileInput) fileInput.onchange = handleAlbumUpload;

  // 密码弹窗按钮绑定
  const pwdConfirm = document.getElementById('album-password-confirm');
  const pwdCancel = document.getElementById('album-password-cancel');
  const pwdInput = document.getElementById('album-password-input');
  if (pwdConfirm) pwdConfirm.onclick = confirmAlbumPassword;
  if (pwdCancel) pwdCancel.onclick = cancelAlbumPassword;
  if (pwdInput) pwdInput.onkeydown = (e) => {
    if (e.key === 'Enter') confirmAlbumPassword();
    if (e.key === 'Escape') cancelAlbumPassword();
  };

  // 密码设置面板按钮绑定
  const pwdSetupSave = document.getElementById('album-pwd-setup-save');
  const pwdSetupSkip = document.getElementById('album-pwd-setup-skip');
  if (pwdSetupSave) pwdSetupSave.onclick = setupAlbumPassword;
  if (pwdSetupSkip) pwdSetupSkip.onclick = skipAlbumPasswordSetup;
  const pwdNewInput = document.getElementById('album-pwd-new');
  const pwdConfirm2Input = document.getElementById('album-pwd-confirm2');
  if (pwdNewInput) pwdNewInput.onkeydown = (e) => {
    if (e.key === 'Enter') setupAlbumPassword();
    if (e.key === 'Escape') cancelAlbumPassword();
  };
  if (pwdConfirm2Input) pwdConfirm2Input.onkeydown = (e) => {
    if (e.key === 'Enter') setupAlbumPassword();
    if (e.key === 'Escape') cancelAlbumPassword();
  };

  // Lightbox 导航 + 编辑
  const lbClose = document.getElementById('album-lightbox-close');
  if (lbClose) lbClose.onclick = closeAlbumLightbox;
  const lbEl = document.getElementById('album-lightbox');
  if (lbEl) lbEl.onclick = (e) => { if (e.target === lbEl) closeAlbumLightbox(); };
  const lbPrev = document.getElementById('album-lb-prev');
  if (lbPrev) lbPrev.onclick = (e) => { e.stopPropagation(); lightboxPrev(); };
  const lbNext = document.getElementById('album-lb-next');
  if (lbNext) lbNext.onclick = (e) => { e.stopPropagation(); lightboxNext(); };
  const lbRename = document.getElementById('album-lb-rename');
  if (lbRename) lbRename.onclick = (e) => { e.stopPropagation(); startRenameCaption(); };
  const lbCaption = document.getElementById('album-lightbox-caption');
  if (lbCaption) lbCaption.onclick = (e) => { e.stopPropagation(); startRenameCaption(); };
  const lbInput = document.getElementById('album-lb-caption-input');
  if (lbInput) lbInput.onkeydown = (e) => {
    if (e.key === 'Enter') { e.stopPropagation(); finishRenameCaption(); }
    if (e.key === 'Escape') { e.stopPropagation(); cancelRenameCaption(); }
    e.stopPropagation(); // 防止方向键触发其他逻辑
  };
  // Lightbox 删除（需要密码验证）
  const lbDelete = document.getElementById('album-lightbox-delete');
  if (lbDelete) lbDelete.onclick = (e) => { e.stopPropagation(); requestAlbumAuth(handleAlbumDelete); };
}

function renderAlbumGrid() {
  const photos = loadPhotos$1();
  const grid = document.getElementById('album-grid');
  const emptyEl = document.getElementById('album-empty');
  const countEl = document.getElementById('album-count');
  if (!grid) return;

  grid.innerHTML = '';
  if (photos.length === 0) {
    emptyEl.style.display = 'block';
    grid.style.display = 'none';
  } else {
    emptyEl.style.display = 'none';
    grid.style.display = 'grid';
    photos.forEach(photo => {
      const card = document.createElement('div');
      card.className = 'album-card';
      card.innerHTML = `
        <img src="${photo.url}" alt="${photo.caption}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23FAF5E8%22 width=%22200%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 font-size=%2240%22 text-anchor=%22middle%22>❌</text></svg>'" />
        <div class="album-card-info">${photo.caption || '未命名'}</div>
        <div class="album-card-date">${photo.date || ''}</div>
      `;
      card.onclick = () => openAlbumLightbox(photo);
      grid.appendChild(card);
    });
  }
  if (countEl) countEl.textContent = `📷 ${photos.length} 张照片`;
}

let currentLightboxPhoto = null;
let lightboxPhotos = [];     // 当前相册全部照片列表
let lightboxIndex = 0;       // 当前照片在列表中的索引

function openAlbumLightbox(photo) {
  lightboxPhotos = loadPhotos$1();
  lightboxIndex = lightboxPhotos.findIndex(p => p.id === photo.id);
  if (lightboxIndex < 0) lightboxIndex = 0;
  showLightboxPhoto();
  document.getElementById('album-lightbox').style.display = 'flex';
  audio.playSFX('open');
}

function showLightboxPhoto() {
  const photo = lightboxPhotos[lightboxIndex];
  if (!photo) return;
  currentLightboxPhoto = photo;
  document.getElementById('album-lightbox-img').src = photo.url;
  document.getElementById('album-lightbox-caption').textContent = photo.caption || '未命名';
  document.getElementById('album-lightbox-caption').style.display = '';
  document.getElementById('album-lb-caption-input').style.display = 'none';
  document.getElementById('album-lightbox-date').textContent = photo.date || '';
  const counter = document.getElementById('album-lb-counter');
  if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  // 首末张隐藏箭头
  const prevBtn = document.getElementById('album-lb-prev');
  const nextBtn = document.getElementById('album-lb-next');
  if (prevBtn) prevBtn.style.display = lightboxIndex > 0 ? '' : 'none';
  if (nextBtn) nextBtn.style.display = lightboxIndex < lightboxPhotos.length - 1 ? '' : 'none';
}

function lightboxPrev() {
  if (lightboxIndex > 0) { lightboxIndex--; showLightboxPhoto(); }
}

function lightboxNext() {
  if (lightboxIndex < lightboxPhotos.length - 1) { lightboxIndex++; showLightboxPhoto(); }
}

function closeAlbumLightbox() {
  document.getElementById('album-lightbox').style.display = 'none';
  currentLightboxPhoto = null;
  lightboxPhotos = [];
}

function startRenameCaption() {
  const photo = lightboxPhotos[lightboxIndex];
  if (!photo) return;
  const captionEl = document.getElementById('album-lightbox-caption');
  const inputEl = document.getElementById('album-lb-caption-input');
  captionEl.style.display = 'none';
  inputEl.style.display = '';
  inputEl.value = photo.caption || '';
  inputEl.focus();
  inputEl.select();
}

function finishRenameCaption() {
  const inputEl = document.getElementById('album-lb-caption-input');
  const captionEl = document.getElementById('album-lightbox-caption');
  const newCaption = inputEl.value.trim() || '未命名';
  const photo = lightboxPhotos[lightboxIndex];
  if (photo && photo.caption !== newCaption) {
    photo.caption = newCaption;
    storageClient.updateCaption(photo.id, newCaption);
    showNotification(`✏️ 已更名为「${newCaption}」`);
    audio.playSFX('click');
    renderAlbumGrid();
  }
  captionEl.textContent = newCaption;
  inputEl.style.display = 'none';
  captionEl.style.display = '';
}

function cancelRenameCaption() {
  const inputEl = document.getElementById('album-lb-caption-input');
  const captionEl = document.getElementById('album-lightbox-caption');
  inputEl.style.display = 'none';
  captionEl.style.display = '';
}

async function handleAlbumUpload(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const uploadEl = document.getElementById('album-uploading');
  const progressFill = document.getElementById('album-progress-fill');
  const grid = document.getElementById('album-grid');
  uploadEl.style.display = 'block';
  grid.style.display = 'none';
  progressFill.style.width = '0%';

  let uploaded = 0;
  for (const file of files) {
    try {
      progressFill.style.width = `${((uploaded + 0.5) / files.length) * 100}%`;
      await storageClient.uploadPhoto(file);
      uploaded++;
      progressFill.style.width = `${(uploaded / files.length) * 100}%`;
      audio.playSFX('collect');
    } catch (err) {
      showNotification(`上传失败: ${err.message}`);
      audio.playSFX('fail');
    }
  }

  uploadEl.style.display = 'none';
  e.target.value = ''; // 清空文件输入
  renderAlbumGrid();
  if (uploaded > 0) {
    showNotification(`✅ 成功上传 ${uploaded} 张照片`);
    audio.playSFX('success');
  }
}

async function handleAlbumDelete() {
  if (!currentLightboxPhoto) return;
  const photoId = currentLightboxPhoto.id;
  try {
    await storageClient.deletePhoto(photoId);
    // 删除后刷新列表，尝试跳到下一张或上一张
    lightboxPhotos = loadPhotos$1();
    audio.playSFX('click');
    if (lightboxPhotos.length === 0) {
      closeAlbumLightbox();
      renderAlbumGrid();
      showNotification('🗑️ 照片已删除');
    } else {
      if (lightboxIndex >= lightboxPhotos.length) lightboxIndex = lightboxPhotos.length - 1;
      showLightboxPhoto();
      renderAlbumGrid();
      showNotification('🗑️ 照片已删除');
    }
  } catch (err) {
    showNotification(`删除失败: ${err.message}`);
  }
}

function showMailboxOverlay() {
  const mailbox = gameWorld.getZoneByType('mailbox');
  if (!mailbox) return;
  const container = document.getElementById('mailbox-messages');
  if (container) {
    container.innerHTML = '';
    if (mailbox.messages.length === 0) {
      const div = document.createElement('div');
      div.className = 'mailbox-message';
      div.textContent = '📭 信箱暂时没有新留言';
      container.appendChild(div);
    } else {
      mailbox.messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'mailbox-message';
        div.textContent = msg;
        container.appendChild(div);
      });
    }
  }
  bindOverlayClose('mailbox-overlay', 'mailbox-close');
  document.getElementById('mailbox-overlay').classList.add('visible');

  // 留言发送
  const sendBtn = document.getElementById('mailbox-send');
  const inputField = document.getElementById('mailbox-input');
  if (sendBtn && inputField) {
    sendBtn.onclick = () => {
      const text = inputField.value.trim();
      if (text) {
        mailbox.addMessage(text);
        inputField.value = '';
        showMailboxOverlay();
        showNotification('✉️ 留言已投递！');
      }
    };
  }
}

function showGraffitiOverlay() {
  bindOverlayClose('graffiti-overlay', 'graffiti-close');
  document.getElementById('graffiti-overlay').classList.add('visible');
}

// ============================================================
// 🎯 飞镖靶弹出层
// ============================================================

function showDartOverlay() {
  bindOverlayClose('dart-overlay', 'dart-close');
  document.getElementById('dart-overlay').classList.add('visible');
  renderDartUI();
}

function renderDartUI() {
  const dart = gameWorld.getZoneByType('dart');
  if (!dart) return;

  const scoreEl = document.getElementById('dart-score');
  const throwsEl = document.getElementById('dart-throws');
  const resultEl = document.getElementById('dart-result');
  const logEl = document.getElementById('dart-log');

  if (scoreEl) scoreEl.textContent = dart.score;
  if (throwsEl) throwsEl.textContent = dart.dartsThrown;
  if (resultEl) resultEl.textContent = dart.lastHit || '—';

  if (logEl) {
    logEl.innerHTML = '';
    dart.results.forEach(r => {
      const span = document.createElement('span');
      span.className = 'dart-log-item';
      const colors = { '红心': '#EA5455', '内环': '#5B2C6F', '中环': '#077B8A', '外环': '#8B6914', '脱靶': '#AAA' };
      span.style.color = colors[r.name] || '#2C2C3A';
      span.textContent = r.name + ' +' + r.points;
      logEl.appendChild(span);
    });
  }

  // 绑定投掷按钮
  const throwBtn = document.getElementById('dart-throw');
  if (throwBtn) {
    throwBtn.onclick = () => {
      const hit = dart.throwDart();
      showNotification('🎯 ' + hit.name + '！+' + hit.points + '分');
      renderDartUI();
    };
  }

  // 绑定重置按钮
  const resetBtn = document.getElementById('dart-reset');
  if (resetBtn) {
    resetBtn.onclick = () => {
      dart.reset();
      renderDartUI();
    };
  }
}

// ============================================================
// 🎲 骰子桌弹出层
// ============================================================

function showDiceOverlay() {
  bindOverlayClose('dice-overlay', 'dice-close');
  document.getElementById('dice-overlay').classList.add('visible');
  renderDiceUI();
}

function renderDiceUI() {
  const dice = gameWorld.getZoneByType('dice');
  if (!dice) return;

  const die1El = document.getElementById('dice-spinner');
  const die2El = document.getElementById('dice-spinner2');
  const totalEl = document.getElementById('dice-total');
  const bestEl = document.getElementById('dice-best');
  const countEl = document.getElementById('dice-count');

  if (die1El) die1El.textContent = dice.die1;
  if (die2El) die2El.textContent = dice.die2;
  if (totalEl) totalEl.textContent = dice.die1 + dice.die2;
  if (bestEl) bestEl.textContent = dice.bestScore;
  if (countEl) countEl.textContent = dice.rollCount;

  const rollBtn = document.getElementById('dice-roll');
  if (rollBtn) {
    rollBtn.onclick = () => {
      if (dice.rolling) return;
      dice.rolling = true;
      const result = dice.roll();
      showNotification('🎲 ' + result.die1 + ' + ' + result.die2 + ' = ' + result.total);
      // 播放旋转动画
      const spinner1 = document.getElementById('dice-spinner');
      const spinner2 = document.getElementById('dice-spinner2');
      if (spinner1) { spinner1.classList.add('spinning'); }
      if (spinner2) { spinner2.classList.add('spinning'); }
      setTimeout(() => {
        if (spinner1) spinner1.classList.remove('spinning');
        if (spinner2) spinner2.classList.remove('spinning');
        dice.rolling = false;
        renderDiceUI();
      }, 600);
    };
  }
}

// ============================================================
// 🃏 卡牌翻翻乐弹出层
// ============================================================

let cardGameState = null;

function showCardOverlay() {
  bindOverlayClose('card-overlay', 'card-close');
  document.getElementById('card-overlay').classList.add('visible');
  if (!cardGameState || cardGameState.matched === cardGameState.pairs) {
    initCardGame();
  }
  renderCardGameUI();
}

function initCardGame() {
  // 重置胜利提示（重新开始时隐藏）
  const winEl = document.getElementById('card-win');
  if (winEl) winEl.style.display = 'none';

  const symbols = ['★', '♥', '♦', '♣', '♠', '☀'];
  const deck = [...symbols, ...symbols];
  // 洗牌
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  cardGameState = {
    deck,
    flipped: [],
    matched: 0,
    pairs: symbols.length,
    moves: 0,
    startTime: Date.now(),
    locked: false,
    revealed: new Array(12).fill(false),
    matchedIdx: new Array(12).fill(false),
  };
}

function renderCardGameUI() {
  if (!cardGameState) return;
  const container = document.getElementById('card-grid');
  if (!container) return;
  container.innerHTML = '';

  const movesEl = document.getElementById('card-moves');
  const pairsEl = document.getElementById('card-pairs');
  const timeEl = document.getElementById('card-time');

  if (movesEl) movesEl.textContent = cardGameState.moves;
  if (pairsEl) pairsEl.textContent = cardGameState.matched + '/' + cardGameState.pairs;
  if (timeEl) {
    const elapsed = Math.floor((Date.now() - cardGameState.startTime) / 1000);
    timeEl.textContent = elapsed + '秒';
  }

  cardGameState.deck.forEach((symbol, idx) => {
    const card = document.createElement('div');
    card.className = 'card-cell';
    const isRevealed = cardGameState.revealed[idx] || cardGameState.matchedIdx[idx];
    if (cardGameState.matchedIdx[idx]) card.classList.add('matched');

    if (isRevealed) {
      card.classList.add('flipped');
      card.textContent = symbol;
    } else {
      card.textContent = '?';
      card.addEventListener('click', () => flipCard(idx));
    }
    container.appendChild(card);
  });

  // 重来按钮
  const restartBtn = document.getElementById('card-restart');
  if (restartBtn) {
    restartBtn.onclick = () => { initCardGame(); renderCardGameUI(); };
  }

  // 胜利
  if (cardGameState.matched === cardGameState.pairs) {
    const elapsed = Math.floor((Date.now() - cardGameState.startTime) / 1000);
    const winEl = document.getElementById('card-win');
    if (winEl) {
      winEl.textContent = '🎉 全部配对！用了 ' + cardGameState.moves + ' 步，' + elapsed + ' 秒';
      winEl.style.display = 'block';
    }
  }
}

function flipCard(idx) {
  if (!cardGameState || cardGameState.locked) return;
  if (cardGameState.revealed[idx] || cardGameState.matchedIdx[idx]) return;

  cardGameState.revealed[idx] = true;
  cardGameState.flipped.push(idx);

  if (cardGameState.flipped.length === 2) {
    cardGameState.moves++;
    cardGameState.locked = true;
    const [a, b] = cardGameState.flipped;

    if (cardGameState.deck[a] === cardGameState.deck[b]) {
      // 配对成功
      cardGameState.matchedIdx[a] = true;
      cardGameState.matchedIdx[b] = true;
      cardGameState.matched++;
      cardGameState.flipped = [];
      cardGameState.locked = false;
      renderCardGameUI();
      if (cardGameState.matched === cardGameState.pairs) {
        showNotification('🃏 配对成功！太厉害了！');
      }
    } else {
      // 配对失败，短暂展示后翻回
      renderCardGameUI();
      setTimeout(() => {
        cardGameState.revealed[a] = false;
        cardGameState.revealed[b] = false;
        cardGameState.flipped = [];
        cardGameState.locked = false;
        renderCardGameUI();
      }, 800);
    }
  } else {
    renderCardGameUI();
  }
}

// ============================================================
// 🎰 幸运转盘弹出层
// ============================================================

function showSpinOverlay() {
  bindOverlayClose('spin-overlay', 'spin-close');
  document.getElementById('spin-overlay').classList.add('visible');
  renderSpinUI();
}

function renderSpinUI() {
  const spin = gameWorld.getZoneByType('spin');
  if (!spin) return;

  const resultEl = document.getElementById('spin-result');
  const countEl = document.getElementById('spin-count');

  if (resultEl) resultEl.textContent = spin.lastResult ? spin.lastResult.text : '—';
  if (resultEl && spin.lastResult) resultEl.style.color = spin.lastResult.color;
  if (countEl) countEl.textContent = spin.spinCount;

  const spinBtn = document.getElementById('spin-btn');
  const wheelEl = document.getElementById('spin-wheel-display');

  if (spinBtn) {
    spinBtn.onclick = () => {
      if (spinBtn.disabled) return;
      spinBtn.disabled = true;
      const result = spin.spin();
      // 转盘旋转动画
      if (wheelEl) {
        const targetAngle = 360 * 5 + result.index * 45 + Math.random() * 30;
        wheelEl.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        wheelEl.style.transform = 'rotate(' + targetAngle + 'deg)';
      }
      setTimeout(() => {
        showNotification('🎰 ' + result.prize.text);
        renderSpinUI();
        spinBtn.disabled = false;
      }, 3200);
    };
  }
}

// ============================================================
// 🎵 音乐盒弹出层
// ============================================================

function showMusicOverlay() {
  bindOverlayClose('music-overlay', 'music-close');
  document.getElementById('music-overlay').classList.add('visible');
  renderMusicUI();
}

// Web Audio 旋律定义
const MELODIES = [
  { name: '小星星', notes: [523,523,784,784,880,880,784,0, 698,698,659,659,587,587,523] },
  { name: '欢乐颂', notes: [659,659,698,784,784,698,659,587, 523,523,587,659,659,0,587,587] },
  { name: '两只老虎', notes: [523,587,659,523, 523,587,659,523, 659,698,784,0, 659,698,784] },
];

let musicAudioCtx = null;
let musicPlaying = false;
let musicCurrentMelody = 0;
let musicNoteTimer = null;

function renderMusicUI() {
  const music = gameWorld.getZoneByType('music');

  const melodyNameEl = document.getElementById('music-melody-name');
  if (melodyNameEl) melodyNameEl.textContent = MELODIES[musicCurrentMelody].name;

  const playBtn = document.getElementById('music-play');
  const stopBtn = document.getElementById('music-stop');
  const prevBtn = document.getElementById('music-prev');
  const nextBtn = document.getElementById('music-next');
  const statusEl = document.getElementById('music-status');

  if (playBtn) {
    playBtn.onclick = () => playMelody();
  }
  if (stopBtn) {
    stopBtn.onclick = () => stopMelody();
  }
  if (prevBtn) {
    prevBtn.onclick = () => { musicCurrentMelody = (musicCurrentMelody - 1 + MELODIES.length) % MELODIES.length; renderMusicUI(); };
  }
  if (nextBtn) {
    nextBtn.onclick = () => { musicCurrentMelody = (musicCurrentMelody + 1) % MELODIES.length; renderMusicUI(); };
  }
  if (statusEl) statusEl.textContent = musicPlaying ? '🔊 播放中' : '🔇 已暂停';
}

function playMelody() {
  if (musicPlaying) return;
  musicPlaying = true;

  if (!musicAudioCtx) {
    musicAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const melody = MELODIES[musicCurrentMelody];
  let noteIdx = 0;
  const noteDuration = 0.25; // 秒

  function playNext() {
    if (!musicPlaying || noteIdx >= melody.notes.length) {
      musicPlaying = false;
      renderMusicUI();
      return;
    }
    const freq = melody.notes[noteIdx];
    if (freq > 0) {
      const osc = musicAudioCtx.createOscillator();
      const gain = musicAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, musicAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, musicAudioCtx.currentTime + noteDuration);
      osc.connect(gain);
      gain.connect(musicAudioCtx.destination);
      osc.start();
      osc.stop(musicAudioCtx.currentTime + noteDuration);
    }
    noteIdx++;
    musicNoteTimer = setTimeout(playNext, noteDuration * 1000);
  }

  playNext();
  renderMusicUI();
}

function stopMelody() {
  musicPlaying = false;
  if (musicNoteTimer) { clearTimeout(musicNoteTimer); musicNoteTimer = null; }
  renderMusicUI();
}

// ============================================================
// 🌿 迷宫花园弹出层
// ============================================================

let mazeAnimFrame = null;

function showMazeOverlay() {
  bindOverlayClose('maze-overlay', 'maze-close');
  document.getElementById('maze-overlay').classList.add('visible');
  const maze = gameWorld.getZoneByType('maze');
  if (!maze.solved && maze.grid.length === 0) maze.generate();
  renderMazeUI();

  // 键盘控制
  const onKey = (e) => {
    if (currentMode !== 'maze') return;
    const maze = gameWorld.getZoneByType('maze');
    if (!maze || maze.solved) return;
    let dr = 0, dc = 0;
    if (e.key === 'ArrowUp' || e.key === 'w') { dr = -1; }
    else if (e.key === 'ArrowDown' || e.key === 's') { dr = 1; }
    else if (e.key === 'ArrowLeft' || e.key === 'a') { dc = -1; }
    else if (e.key === 'ArrowRight' || e.key === 'd') { dc = 1; }
    else return;
    e.preventDefault();
    const result = maze.move(dr, dc);
    if (result === 'win') showNotification('🌿 迷宫通关！太厉害了！');
    renderMazeUI();
  };
  document.addEventListener('keydown', onKey);
  // 清理在 setMode explore 时
  const origSetMode = window._mazeOldSetMode;
  window._mazeCleanup = () => document.removeEventListener('keydown', onKey);
}

function renderMazeUI() {
  const maze = gameWorld.getZoneByType('maze');
  if (!maze) return;
  const canvasEl = document.getElementById('maze-canvas');
  const stepsEl = document.getElementById('maze-steps');
  const timeEl = document.getElementById('maze-time');
  const statusEl = document.getElementById('maze-status');

  if (stepsEl) stepsEl.textContent = maze.steps;
  if (timeEl) {
    const sec = maze.startTime ? Math.floor((Date.now() - maze.startTime) / 1000) : 0;
    timeEl.textContent = sec + '秒';
  }
  if (statusEl) statusEl.textContent = maze.solved ? '🎉 通关！' : '用方向键/WASD走迷宫';

  if (!canvasEl) return;
  const mctx = canvasEl.getContext('2d');
  const R = maze.size * 2 + 1;
  const cs = Math.floor(Math.min(canvasEl.width, canvasEl.height) / R);
  const ox = (canvasEl.width - cs * R) / 2;
  const oy = (canvasEl.height - cs * R) / 2;

  mctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  // 画迷宫
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < R; c++) {
      const x = ox + c * cs, y = oy + r * cs;
      if (maze.grid[r] && maze.grid[r][c] === 1) {
        mctx.fillStyle = '#2E7D32'; mctx.fillRect(x, y, cs, cs);
      } else if (maze.grid[r] && maze.grid[r][c] === 2) {
        mctx.fillStyle = '#EA5455'; mctx.fillRect(x, y, cs, cs);
      } else {
        mctx.fillStyle = '#E8F5E9'; mctx.fillRect(x, y, cs, cs);
      }
    }
  }
  // 画玩家
  const px = ox + maze.playerPos.c * cs + cs / 2;
  const py = oy + maze.playerPos.r * cs + cs / 2;
  mctx.fillStyle = '#077B8A';
  mctx.beginPath(); mctx.arc(px, py, cs / 2 - 2, 0, Math.PI * 2); mctx.fill();

  // 新迷宫按钮
  const resetBtn = document.getElementById('maze-reset');
  if (resetBtn) resetBtn.onclick = () => { maze.reset(); renderMazeUI(); };
}

// ============================================================
// 🧩 拼图桌弹出层
// ============================================================

function showPuzzleOverlay() {
  bindOverlayClose('puzzle-overlay', 'puzzle-close');
  document.getElementById('puzzle-overlay').classList.add('visible');
  const puzzle = gameWorld.getZoneByType('puzzle');
  if (!puzzle.solved && puzzle.tiles.length === 0) puzzle.init();
  renderPuzzleUI();
}

function renderPuzzleUI() {
  const puzzle = gameWorld.getZoneByType('puzzle');
  if (!puzzle) return;
  const container = document.getElementById('puzzle-grid');
  const movesEl = document.getElementById('puzzle-moves');
  const statusEl = document.getElementById('puzzle-status');
  if (!container) return;

  if (movesEl) movesEl.textContent = puzzle.moves;
  if (statusEl) statusEl.textContent = puzzle.solved ? '🎉 还原成功！' : '点击方块移动';

  container.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'puzzle-cell';
    if (puzzle.tiles[i] === 0) {
      cell.classList.add('empty');
    } else {
      cell.textContent = puzzle.tiles[i];
      if (puzzle.tiles[i] === i + 1) cell.classList.add('correct');
      cell.addEventListener('click', () => {
        if (puzzle.tryMove(i)) {
          if (puzzle.solved) showNotification('🧩 拼图还原成功！');
          renderPuzzleUI();
        }
      });
    }
    container.appendChild(cell);
  }

  const resetBtn = document.getElementById('puzzle-reset');
  if (resetBtn) resetBtn.onclick = () => { puzzle.reset(); renderPuzzleUI(); };
}

// ============================================================
// 🏯 华容道弹出层
// ============================================================

function showKlotskiOverlay() {
  bindOverlayClose('klotski-overlay', 'klotski-close');
  document.getElementById('klotski-overlay').classList.add('visible');
  renderKlotskiUI();
}

function renderKlotskiUI() {
  const klotski = gameWorld.getZoneByType('klotski');
  if (!klotski) return;
  const board = document.getElementById('klotski-board');
  const movesEl = document.getElementById('klotski-moves');
  const statusEl = document.getElementById('klotski-status');
  if (!board) return;

  if (movesEl) movesEl.textContent = klotski.moves;
  if (statusEl) statusEl.textContent = klotski.solved ? '🎉 曹操脱出！' : '点击方块移动';

  board.innerHTML = '';
  // 5行×4列背景格
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = document.createElement('div');
      cell.className = 'klotski-cell';
      cell.style.gridRow = r + 1;
      cell.style.gridColumn = c + 1;
      cell.addEventListener('click', () => {
        if (klotski.clickCell(r, c)) {
          if (klotski.solved) showNotification('🏯 曹操脱出！华容道通关！');
          renderKlotskiUI();
        }
      });
      board.appendChild(cell);
    }
  }
  // 块
  for (const block of klotski.blocks) {
    const el = document.createElement('div');
    el.className = 'klotski-block';
    el.style.gridRow = `${block.r + 1} / span ${block.h}`;
    el.style.gridColumn = `${block.c + 1} / span ${block.w}`;
    el.style.backgroundColor = block.color;
    el.textContent = block.name;
    el.addEventListener('click', () => {
      // 尝试4个方向
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      let moved = false;
      for (const [dr, dc] of dirs) {
        if (klotski.tryMove(block.id, dr, dc)) { moved = true; break; }
      }
      if (moved) {
        if (klotski.solved) showNotification('🏯 华容道通关！');
        renderKlotskiUI();
      }
    });
    board.appendChild(el);
  }

  const resetBtn = document.getElementById('klotski-reset');
  if (resetBtn) resetBtn.onclick = () => { klotski.reset(); renderKlotskiUI(); };
}

// ============================================================
// 🔢 数独角弹出层
// ============================================================

function showSudokuOverlay() {
  bindOverlayClose('sudoku-overlay', 'sudoku-close');
  document.getElementById('sudoku-overlay').classList.add('visible');
  renderSudokuUI();
}

function renderSudokuUI() {
  const sudoku = gameWorld.getZoneByType('sudoku');
  if (!sudoku) return;
  const grid = document.getElementById('sudoku-grid');
  const errorsEl = document.getElementById('sudoku-errors');
  const statusEl = document.getElementById('sudoku-status');
  if (!grid) return;

  if (errorsEl) errorsEl.textContent = sudoku.errors;
  if (statusEl) statusEl.textContent = sudoku.solved ? '🎉 数独完成！' : '填入1-4';

  grid.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = document.createElement('div');
      cell.className = 'sudoku-cell';
      const isGiven = sudoku.puzzle[r][c] !== 0;
      const boxBg = (r < 2 && c < 2) || (r >= 2 && c >= 2) ? 'sudoku-box-a' : 'sudoku-box-b';
      cell.classList.add(boxBg);
      if (isGiven) {
        cell.classList.add('given');
        cell.textContent = sudoku.puzzle[r][c];
      } else {
        const val = sudoku.userInput[r][c];
        if (val) {
          cell.textContent = val;
          cell.classList.add(val !== sudoku.solution[r][c] ? 'wrong' : 'correct');
        }
        cell.addEventListener('click', () => {
          // 循环1-4
          const next = (val % 4) + 1;
          const result = sudoku.fill(r, c, next);
          if (result === 'win') showNotification('🔢 数独完成！');
          renderSudokuUI();
        });
      }
      grid.appendChild(cell);
    }
  }

  const resetBtn = document.getElementById('sudoku-reset');
  if (resetBtn) resetBtn.onclick = () => { sudoku.reset(); renderSudokuUI(); };
}

// ============================================================
// 🪙 许愿池弹出层
// ============================================================

function showWishOverlay() {
  bindOverlayClose('wish-overlay', 'wish-close');
  document.getElementById('wish-overlay').classList.add('visible');
  renderWishUI();
}

function renderWishUI() {
  const wish = gameWorld.getZoneByType('wish');
  if (!wish) return;

  const listEl = document.getElementById('wish-list');
  const countEl = document.getElementById('wish-count');
  if (countEl) countEl.textContent = wish.coinCount;

  if (listEl) {
    listEl.innerHTML = '';
    for (const w of wish.wishes) {
      const item = document.createElement('div');
      item.className = 'wish-item';
      item.textContent = '🪙 ' + w.text;
      listEl.appendChild(item);
    }
  }

  const inputEl = document.getElementById('wish-input');
  const tossBtn = document.getElementById('wish-toss');
  if (tossBtn) {
    tossBtn.onclick = () => {
      const text = inputEl ? inputEl.value.trim() : '';
      if (!text) { showNotification('请先写下你的愿望 ✨'); return; }
      wish.addWish(text);
      if (inputEl) inputEl.value = '';
      showNotification('🪙 许愿成功！愿望已沉入池底');
      // 涟漪动画
      const pond = document.querySelector('.wish-pond');
      if (pond) { pond.classList.remove('ripple'); void pond.offsetWidth; pond.classList.add('ripple'); }
      renderWishUI();
    };
  }
}

// ============================================================
// 🔮 魔法阵弹出层
// ============================================================

function showMagicOverlay() {
  bindOverlayClose('magic-overlay', 'magic-close');
  document.getElementById('magic-overlay').classList.add('visible');
  renderMagicUI();
}

function renderMagicUI() {
  const magic = gameWorld.getZoneByType('magic');
  if (!magic) return;

  const stepEl = document.getElementById('magic-step');
  const prophecyEl = document.getElementById('magic-prophecy');
  if (stepEl) stepEl.textContent = magic.currentStep + '/6';
  if (prophecyEl) prophecyEl.textContent = magic.completed ? '🔮 ' + magic.prophecy : '';

  // 6个符文按钮
  const runeContainer = document.getElementById('magic-runes');
  if (runeContainer) {
    runeContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const btn = document.createElement('button');
      btn.className = 'magic-rune';
      if (magic.activated.includes(i)) btn.classList.add('activated');
      btn.textContent = magic.runeSymbols[i] + '\n' + magic.runeNames[i];
      btn.onclick = () => {
        const result = magic.activate(i);
        if (result === 'wrong') {
          showNotification('❌ 顺序错误！符文已重置');
        } else if (result === 'complete') {
          showNotification('🔮 魔法阵激活！' + magic.prophecy);
        }
        renderMagicUI();
      };
      runeContainer.appendChild(btn);
    }
  }

  const resetBtn = document.getElementById('magic-reset');
  if (resetBtn) resetBtn.onclick = () => { magic.reset(); renderMagicUI(); };
}

// ============================================================
// ⭐ 星座仪弹出层
// ============================================================

function showConstellationOverlay() {
  bindOverlayClose('constellation-overlay', 'constellation-close');
  document.getElementById('constellation-overlay').classList.add('visible');
  renderConstellationUI();
}

function renderConstellationUI() {
  const cons = gameWorld.getZoneByType('constellation');
  if (!cons) return;

  const nameEl = document.getElementById('constellation-name');
  const storyEl = document.getElementById('constellation-story');
  const progressEl = document.getElementById('constellation-progress');

  if (nameEl) nameEl.textContent = '⭐ ' + cons.current.name;
  if (progressEl) progressEl.textContent = cons.userConnections.length + '/' + cons.current.connections.length;
  if (storyEl) {
    if (cons.completed.includes(cons.currentIdx)) {
      storyEl.textContent = cons.current.story;
      storyEl.style.display = 'block';
    } else {
      storyEl.style.display = 'none';
    }
  }

  // 画星座Canvas
  const canvasEl = document.getElementById('constellation-canvas');
  if (!canvasEl) return;
  const cctx = canvasEl.getContext('2d');
  cctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  // 夜空背景
  cctx.fillStyle = '#1A237E';
  cctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  // 微星
  for (let i = 0; i < 30; i++) {
    cctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.3})`;
    cctx.beginPath(); cctx.arc(Math.random() * canvasEl.width, Math.random() * canvasEl.height, 0.5 + Math.random(), 0, Math.PI * 2); cctx.fill();
  }

  // 已连线
  cctx.strokeStyle = 'rgba(255,215,0,0.7)'; cctx.lineWidth = 2;
  for (const [a, b] of cons.userConnections) {
    cctx.beginPath();
    cctx.moveTo(cons.current.stars[a].x, cons.current.stars[a].y);
    cctx.lineTo(cons.current.stars[b].x, cons.current.stars[b].y);
    cctx.stroke();
  }

  // 星星
  cons.current.stars.forEach((star, idx) => {
    const isActive = cons.lastStar === idx;
    cctx.fillStyle = isActive ? '#FFD700' : '#FFFFFF';
    cctx.beginPath(); cctx.arc(star.x, star.y, isActive ? 6 : 4, 0, Math.PI * 2); cctx.fill();
    // 点击检测用 hidden overlay buttons
  });

  // 星星可点击区域
  const clickLayer = document.getElementById('constellation-click-layer');
  if (clickLayer) {
    clickLayer.innerHTML = '';
    cons.current.stars.forEach((star, idx) => {
      const btn = document.createElement('div');
      btn.className = 'star-click-target';
      btn.style.left = (star.x - 12) + 'px';
      btn.style.top = (star.y - 12) + 'px';
      btn.onclick = () => {
        const result = cons.clickStar(idx);
        if (result === 'wrong') showNotification('❌ 连线错误！重新开始');
        if (result === 'complete') showNotification('⭐ 星座完成！' + cons.current.story);
        renderConstellationUI();
      };
      clickLayer.appendChild(btn);
    });
  }

  // 导航按钮
  const prevBtn = document.getElementById('constellation-prev');
  const nextBtn = document.getElementById('constellation-next');
  const resetBtn = document.getElementById('constellation-reset');
  if (prevBtn) prevBtn.onclick = () => { cons.prevConstellation(); renderConstellationUI(); };
  if (nextBtn) nextBtn.onclick = () => { cons.nextConstellation(); renderConstellationUI(); };
  if (resetBtn) resetBtn.onclick = () => { cons.resetCurrent(); renderConstellationUI(); };
}

// ============================================================
// ⏳ 时光沙漏弹出层
// ============================================================

let hourglassTimer = null;

function showHourglassOverlay() {
  bindOverlayClose('hourglass-overlay', 'hourglass-close');
  document.getElementById('hourglass-overlay').classList.add('visible');
  renderHourglassUI();
}

function renderHourglassUI() {
  const hg = gameWorld.getZoneByType('hourglass');
  if (!hg) return;

  const sandEl = document.getElementById('hourglass-sand');
  const quoteEl = document.getElementById('hourglass-quote');
  const countEl = document.getElementById('hourglass-count');
  const flipBtn = document.getElementById('hourglass-flip');

  if (countEl) countEl.textContent = hg.flipCount;
  if (sandEl) {
    const pct = Math.round(hg.sandLevel * 100);
    sandEl.style.height = pct + '%';
  }
  if (quoteEl) quoteEl.textContent = hg.quote ? '📜 ' + hg.quote : '';

  if (flipBtn) {
    flipBtn.onclick = () => {
      hg.flip();
      renderHourglassUI();
      // 启动倒计时更新
      if (hourglassTimer) clearInterval(hourglassTimer);
      hourglassTimer = setInterval(() => {
        hg.updateSand();
        const sandEl2 = document.getElementById('hourglass-sand');
        const quoteEl2 = document.getElementById('hourglass-quote');
        if (sandEl2) sandEl2.style.height = Math.round(hg.sandLevel * 100) + '%';
        if (quoteEl2 && hg.quote && !quoteEl2.textContent) {
          quoteEl2.textContent = '📜 ' + hg.quote;
        }
        if (!hg.isFlipped) { clearInterval(hourglassTimer); hourglassTimer = null; }
      }, 200);
    };
  }
}

// ============================================================
// 🔆 万花筒弹出层
// ============================================================

let kaleidoscopeAnim = null;

function showKaleidoscopeOverlay() {
  bindOverlayClose('kaleidoscope-overlay', 'kaleidoscope-close');
  document.getElementById('kaleidoscope-overlay').classList.add('visible');
  renderKaleidoscopeUI();
  // 启动动画
  if (!kaleidoscopeAnim) {
    const animate = () => {
      if (currentMode !== 'kaleidoscope') { kaleidoscopeAnim = null; return; }
      const kz = gameWorld.getZoneByType('kaleidoscope');
      if (kz) { kz.tick(1/60); drawKaleidoscopeCanvas(); }
      kaleidoscopeAnim = requestAnimationFrame(animate);
    };
    kaleidoscopeAnim = requestAnimationFrame(animate);
  }
}

function drawKaleidoscopeCanvas() {
  const kz = gameWorld.getZoneByType('kaleidoscope');
  const canvasEl = document.getElementById('kaleidoscope-canvas');
  if (!kz || !canvasEl) return;
  const kctx = canvasEl.getContext('2d');
  const w = canvasEl.width, h = canvasEl.height;
  const cx = w / 2, cy = h / 2;

  kctx.clearRect(0, 0, w, h);
  kctx.fillStyle = '#1a1a2e';
  kctx.fillRect(0, 0, w, h);

  kctx.save();
  kctx.translate(cx, cy);
  kctx.rotate(kz.rotation);

  const segments = kz.segments;
  const hue = kz.hue;
  const r = Math.min(cx, cy) - 10;

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const nextA = ((i + 1) / segments) * Math.PI * 2;
    // 逐层绘制
    for (let layer = 3; layer >= 1; layer--) {
      const lr = r * layer / 3;
      const h1 = (hue + i * (360 / segments) + layer * 40) % 360;
      const h2 = (hue + (i + 0.5) * (360 / segments) + layer * 60) % 360;
      kctx.fillStyle = `hsla(${h1}, 80%, ${50 + layer * 5}%, 0.25)`;
      kctx.beginPath();
      kctx.moveTo(0, 0);
      kctx.lineTo(Math.cos(a) * lr, Math.sin(a) * lr);
      kctx.lineTo(Math.cos((a + nextA) / 2) * lr * 0.7, Math.sin((a + nextA) / 2) * lr * 0.7);
      kctx.fill();
      kctx.fillStyle = `hsla(${h2}, 70%, 60%, 0.2)`;
      kctx.beginPath();
      kctx.moveTo(0, 0);
      kctx.lineTo(Math.cos((a + nextA) / 2) * lr * 0.7, Math.sin((a + nextA) / 2) * lr * 0.7);
      kctx.lineTo(Math.cos(nextA) * lr, Math.sin(nextA) * lr);
      kctx.fill();
    }
  }
  kctx.restore();
}

function renderKaleidoscopeUI() {
  const kz = gameWorld.getZoneByType('kaleidoscope');
  if (!kz) return;

  const segSlider = document.getElementById('kaleidoscope-segments');
  const hueSlider = document.getElementById('kaleidoscope-hue');
  const speedSlider = document.getElementById('kaleidoscope-speed');
  const segVal = document.getElementById('kaleidoscope-segments-val');
  const hueVal = document.getElementById('kaleidoscope-hue-val');
  const speedVal = document.getElementById('kaleidoscope-speed-val');

  if (segSlider) { segSlider.value = kz.segments; if (segVal) segVal.textContent = kz.segments; segSlider.oninput = () => { kz.setSegments(parseInt(segSlider.value)); if (segVal) segVal.textContent = kz.segments; }; }
  if (hueSlider) { hueSlider.value = kz.hue; if (hueVal) hueVal.textContent = kz.hue + '°'; hueSlider.oninput = () => { kz.setHue(parseInt(hueSlider.value)); if (hueVal) hueVal.textContent = kz.hue + '°'; }; }
  if (speedSlider) { speedSlider.value = kz.speed; if (speedVal) speedVal.textContent = kz.speed.toFixed(1) + 'x'; speedSlider.oninput = () => { kz.setSpeed(parseFloat(speedSlider.value)); if (speedVal) speedVal.textContent = kz.speed.toFixed(1) + 'x'; }; }
}

// ============================================================
// 📔 日记本弹出层
// ============================================================

function showDiaryOverlay() {
  bindOverlayClose('diary-overlay', 'diary-close');
  document.getElementById('diary-overlay').classList.add('visible');
  renderDiaryUI();
}

function renderDiaryUI() {
  const diary = gameWorld.getZoneByType('diary');
  if (!diary) return;

  const listEl = document.getElementById('diary-entries');
  const moodBtns = document.querySelectorAll('.diary-mood-btn');
  const saveBtn = document.getElementById('diary-save');
  const textArea = document.getElementById('diary-text');

  let selectedMood = diary.moods[0];
  moodBtns.forEach(btn => {
    btn.onclick = () => {
      moodBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMood = btn.dataset.mood;
    };
  });

  if (saveBtn) {
    saveBtn.onclick = () => {
      const text = textArea ? textArea.value.trim() : '';
      if (!text) { showNotification('写点什么吧 ✍️'); return; }
      diary.addEntry(selectedMood, text);
      if (textArea) textArea.value = '';
      showNotification('📔 日记已保存');
      renderDiaryUI();
    };
  }

  if (listEl) {
    listEl.innerHTML = '';
    for (const entry of diary.entries) {
      const div = document.createElement('div');
      div.className = 'diary-entry';
      const time = new Date(entry.time);
      const timeStr = time.getHours() + ':' + String(time.getMinutes()).padStart(2, '0');
      div.innerHTML = `<span class="diary-entry-mood">${entry.mood}</span>
        <span class="diary-entry-text">${entry.text}</span>
        <span class="diary-entry-time">${timeStr}</span>`;
      listEl.appendChild(div);
    }
  }
}

// ============================================================
// 🌤️ 气候站弹出层
// ============================================================

let weatherAnimFrame = null;

function showWeatherOverlay() {
  bindOverlayClose('weather-overlay', 'weather-close');
  document.getElementById('weather-overlay').classList.add('visible');
  renderWeatherUI();
  // 启动天气动画
  if (!weatherAnimFrame) {
    const animate = () => {
      if (currentMode !== 'weather') { weatherAnimFrame = null; return; }
      drawWeatherCanvas();
      weatherAnimFrame = requestAnimationFrame(animate);
    };
    weatherAnimFrame = requestAnimationFrame(animate);
  }
}

let weatherParticles = [];

function drawWeatherCanvas() {
  const wz = gameWorld.getZoneByType('weather');
  const canvasEl = document.getElementById('weather-canvas');
  if (!wz || !canvasEl) return;
  const wctx = canvasEl.getContext('2d');
  const w = canvasEl.width, h = canvasEl.height;

  // 天空背景
  const skyColors = {
    sunny: '#87CEEB', cloudy: '#90A4AE', rainy: '#546E7A', snowy: '#CFD8DC', windy: '#78909C'
  };
  wctx.fillStyle = skyColors[wz.weather] || '#87CEEB';
  wctx.fillRect(0, 0, w, h);

  // 太阳
  if (wz.weather === 'sunny' || wz.weather === 'windy') {
    wctx.fillStyle = '#FFC107';
    wctx.beginPath(); wctx.arc(60, 40, 20, 0, Math.PI * 2); wctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Date.now() * 0.001;
      wctx.strokeStyle = '#FFB300'; wctx.lineWidth = 2;
      wctx.beginPath(); wctx.moveTo(60 + Math.cos(a) * 25, 40 + Math.sin(a) * 25);
      wctx.lineTo(60 + Math.cos(a) * 35, 40 + Math.sin(a) * 35); wctx.stroke();
    }
  }

  // 云
  if (wz.weather === 'cloudy' || wz.weather === 'rainy') {
    wctx.fillStyle = 'rgba(255,255,255,0.6)';
    const ct = Date.now() * 0.0003;
    [[60, 30], [120, 25], [180, 35]].forEach(([bx, by], i) => {
      const x = bx + Math.sin(ct + i) * 15;
      wctx.beginPath(); wctx.arc(x, by, 20, 0, Math.PI * 2); wctx.fill();
      wctx.beginPath(); wctx.arc(x + 18, by - 3, 15, 0, Math.PI * 2); wctx.fill();
      wctx.beginPath(); wctx.arc(x + 8, by - 12, 14, 0, Math.PI * 2); wctx.fill();
    });
  }

  // 雨
  if (wz.weather === 'rainy') {
    wctx.strokeStyle = 'rgba(100,181,246,0.6)'; wctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const rx = (i * 37 + Date.now() * 0.1) % w;
      const ry = (i * 23 + Date.now() * 0.3) % h;
      wctx.beginPath(); wctx.moveTo(rx, ry); wctx.lineTo(rx - 2, ry + 8); wctx.stroke();
    }
  }

  // 雪
  if (wz.weather === 'snowy') {
    wctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 20; i++) {
      const sx = (i * 41 + Math.sin(Date.now() * 0.001 + i) * 20 + Date.now() * 0.02) % w;
      const sy = (i * 31 + Date.now() * 0.05) % h;
      wctx.beginPath(); wctx.arc(sx, sy, 2, 0, Math.PI * 2); wctx.fill();
    }
  }

  // 地面
  const groundColor = wz.weather === 'snowy' ? '#ECEFF1' : wz.weather === 'rainy' ? '#4E342E' : '#66BB6A';
  wctx.fillStyle = groundColor;
  wctx.fillRect(0, h - 30, w, 30);

  // 温度计数值
  wctx.fillStyle = '#FFF'; wctx.font = 'bold 14px Inter, sans-serif';
  wctx.fillText(wz.temperature + '°C', w - 60, 25);
  wctx.fillText('风 ' + wz.windLevel + '级', w - 60, 45);
}

function renderWeatherUI() {
  const wz = gameWorld.getZoneByType('weather');
  if (!wz) return;

  const labelEl = document.getElementById('weather-label');
  if (labelEl) labelEl.textContent = wz.getWeatherLabel();

  const btns = document.querySelectorAll('.weather-btn');
  btns.forEach(btn => {
    btn.onclick = () => {
      wz.setWeather(btn.dataset.type);
      renderWeatherUI();
    };
  });
}

// ============================================================
// 🍳 烹饪桌弹出层
// ============================================================

function showCookingOverlay() {
  bindOverlayClose('cooking-overlay', 'cooking-close');
  document.getElementById('cooking-overlay').classList.add('visible');
  renderCookingUI();
}

function renderCookingUI() {
  const cooking = gameWorld.getZoneByType('cooking');
  if (!cooking) return;

  // 食材选择区
  const ingredientGrid = document.getElementById('cooking-ingredients');
  if (ingredientGrid) {
    ingredientGrid.innerHTML = '';
    for (const ing of cooking.allIngredients) {
      const btn = document.createElement('button');
      btn.className = 'cooking-ingredient';
      if (cooking.selected.includes(ing.id)) btn.classList.add('selected');
      btn.textContent = ing.name;
      btn.onclick = () => { cooking.toggleIngredient(ing.id); renderCookingUI(); };
      ingredientGrid.appendChild(btn);
    }
  }

  // 已选食材
  const selectedEl = document.getElementById('cooking-selected');
  if (selectedEl) {
    selectedEl.textContent = cooking.selected.length > 0
      ? cooking.selected.map(id => { const ing = cooking.allIngredients.find(i => i.id === id); return ing ? ing.name : ''; }).join(' ')
      : '请选择食材…';
  }

  // 烹饪按钮
  const cookBtn = document.getElementById('cooking-cook');
  if (cookBtn) {
    cookBtn.disabled = cooking.cooking || cooking.selected.length < 2;
    cookBtn.onclick = () => {
      cooking.cook();
      showNotification('🍳 烹饪中…');
      setTimeout(() => {
        const result = cooking.lastResult;
        if (result) showNotification(result);
        renderCookingUI();
      }, 1600);
      renderCookingUI();
    };
  }

  // 结果
  const resultEl = document.getElementById('cooking-result');
  if (resultEl) resultEl.textContent = cooking.lastResult;

  // 已解锁菜谱
  const recipeEl = document.getElementById('cooking-recipes');
  if (recipeEl) {
    recipeEl.innerHTML = '';
    for (const recipe of cooking.recipes) {
      const div = document.createElement('span');
      div.className = 'cooking-recipe-tag';
      const unlocked = cooking.completed.includes(recipe.name);
      if (!unlocked) div.classList.add('locked');
      div.textContent = unlocked ? recipe.icon + ' ' + recipe.name : '🔒 ???';
      recipeEl.appendChild(div);
    }
  }
}

// ============================================================
// 🗺️ 地图墙弹出层
// ============================================================

function showMapOverlay() {
  bindOverlayClose('map-overlay', 'map-close');
  document.getElementById('map-overlay').classList.add('visible');
  renderMapUI();
}

function renderMapUI() {
  const canvasEl = document.getElementById('map-canvas');
  if (!canvasEl) return;
  const mctx = canvasEl.getContext('2d');
  const w = canvasEl.width, h = canvasEl.height;
  const sx = w / WORLD_W, sy = h / WORLD_H;

  mctx.clearRect(0, 0, w, h);

  // 背景
  mctx.fillStyle = '#FAF5E8';
  mctx.fillRect(0, 0, w, h);

  // 网格线
  mctx.strokeStyle = 'rgba(44,44,58,0.05)'; mctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += w / 10) { mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, h); mctx.stroke(); }
  for (let y = 0; y < h; y += h / 8)  { mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(w, y); mctx.stroke(); }

  // 画出所有区域标记
  const zonePositions = [
    { type: 'notebook', x: 2000, y: 1620, label: '📓', color: '#077B8A' },
    { type: 'board', x: 1620, y: 1450, label: '📋', color: '#8B7355' },
    { type: 'shelf', x: 2420, y: 1300, label: '📚', color: '#5B8C5A' },
    { type: 'coffee', x: 1550, y: 1850, label: '☕', color: '#D4A574' },
    { type: 'album', x: 2500, y: 1100, label: '📷', color: '#C75B39' },
    { type: 'mailbox', x: 2600, y: 1700, label: '📮', color: '#FF9800' },
    { type: 'graffiti', x: 1500, y: 1150, label: '✏️', color: '#9C27B0' },
    { type: 'dart', x: 900, y: 2500, label: '🎯', color: '#EA5455' },
    { type: 'dice', x: 3200, y: 1100, label: '🎲', color: '#546E7A' },
    { type: 'card', x: 2000, y: 550, label: '🃏', color: '#3F51B5' },
    { type: 'spin', x: 3400, y: 2300, label: '🎰', color: '#E91E63' },
    { type: 'music', x: 550, y: 800, label: '🎵', color: '#FF5722' },
    { type: 'maze', x: 800, y: 600, label: '🌿', color: '#2E7D32' },
    { type: 'puzzle', x: 2000, y: 500, label: '🧩', color: '#EF6C00' },
    { type: 'klotski', x: 3200, y: 600, label: '🏯', color: '#EA5455' },
    { type: 'sudoku', x: 3500, y: 1400, label: '🔢', color: '#9C27B0' },
    { type: 'wish', x: 500, y: 1500, label: '🪙', color: '#FFB300' },
    { type: 'magic', x: 1800, y: 1600, label: '🔮', color: '#7B1FA2' },
    { type: 'constellation', x: 3200, y: 2100, label: '⭐', color: '#2196F3' },
    { type: 'hourglass', x: 800, y: 2400, label: '⏳', color: '#FF9800' },
    { type: 'kaleidoscope', x: 1800, y: 2600, label: '🔆', color: '#4CAF50' },
    { type: 'diary', x: 600, y: 2000, label: '📔', color: '#795548' },
    { type: 'weather', x: 2800, y: 1600, label: '🌤️', color: '#03A9F4' },
    { type: 'cooking', x: 3000, y: 2500, label: '🍳', color: '#E64A19' },
    { type: 'chat', x: 2600, y: 400, label: '🤖', color: '#077B8A' },
    { type: 'search', x: 1400, y: 1000, label: '🔍', color: '#00897B' },
  ];

  for (const z of zonePositions) {
    const zx = z.x * sx, zy = z.y * sy;
    mctx.fillStyle = z.color;
    mctx.globalAlpha = 0.7;
    mctx.beginPath(); mctx.arc(zx, zy, 5, 0, Math.PI * 2); mctx.fill();
    mctx.globalAlpha = 1;
    mctx.font = '10px sans-serif';
    mctx.fillText(z.label, zx - 5, zy - 7);
  }

  // 玩家位置
  const px = gameWorld.player.x * sx;
  const py = gameWorld.player.y * sy;
  mctx.fillStyle = '#EA5455';
  mctx.beginPath(); mctx.arc(px, py, 4, 0, Math.PI * 2); mctx.fill();
  mctx.fillText('🧑', px - 6, py - 6);
}

// ============================================================
// 🤖 AI助手聊天窗口
// ============================================================

const aiClient = new AIClient();
let chatTypingEl = null;   // 打字指示器DOM
let currentAssistantEl = null; // 当前流式输出msg元素

function showChatOverlay() {
  const overlay = document.getElementById('chat-overlay');
  overlay.classList.add('visible');

  // 绑定关闭
  const closeBtn = document.getElementById('chat-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.classList.remove('visible');
      aiClient.abort();
      setMode('explore');
    };
  }

  // 发送消息
  const input = document.getElementById('chat-user-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const sendMsg = () => {
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    input.value = '';
    addChatMessage('user', text);
    setChatTyping(true);
    sendBtn.disabled = true;

    aiClient.onToken = (delta, full) => {
      // 流式追加
      if (!currentAssistantEl) {
        setChatTyping(false);
        currentAssistantEl = addChatMessage('assistant', '');
      }
      currentAssistantEl.textContent = full;
      scrollChatBottom();
    };
    aiClient.onDone = (full) => {
      if (currentAssistantEl) currentAssistantEl.textContent = full;
      currentAssistantEl = null;
      setChatTyping(false);
      sendBtn.disabled = false;
      scrollChatBottom();
    };
    aiClient.onError = (err) => {
      setChatTyping(false);
      addChatMessage('error', '⚠️ ' + err);
      sendBtn.disabled = false;
      currentAssistantEl = null;
    };

    aiClient.sendMessage(text);
  };

  sendBtn.onclick = sendMsg;
  input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMsg(); } };

  // 设置面板
  const settingsBtn = document.getElementById('chat-settings-btn');
  const settingsPanel = document.getElementById('chat-settings-panel');
  settingsBtn.onclick = () => {
    settingsPanel.classList.toggle('visible');
    if (settingsPanel.classList.contains('visible')) {
      const cfg = loadConfig();
      document.getElementById('ai-base-url').value = cfg.baseUrl || '';
      document.getElementById('ai-api-key').value = cfg.apiKey || '';
      document.getElementById('ai-model').value = cfg.model || '';
      document.getElementById('ai-temperature').value = cfg.temperature || 0.8;
      document.getElementById('ai-temp-val').textContent = cfg.temperature || 0.8;

      // 如果已有保存的url+key，自动获取模型列表
      if (cfg.baseUrl && cfg.apiKey) {
        doFetchModels(cfg.baseUrl, cfg.apiKey, cfg.model);
      }
    }
  };

  // 温度滑块
  const tempSlider = document.getElementById('ai-temperature');
  if (tempSlider) {
    tempSlider.oninput = () => {
      document.getElementById('ai-temp-val').textContent = tempSlider.value;
    };
  }

  // 获取模型列表
  const fetchBtn = document.getElementById('ai-fetch-models-btn');
  fetchBtn.onclick = () => {
    const baseUrl = document.getElementById('ai-base-url').value.trim();
    const apiKey = document.getElementById('ai-api-key').value.trim();
    if (!baseUrl || !apiKey) {
      showModelStatus('请先填写 API 地址和密钥', true);
      return;
    }
    doFetchModels(baseUrl, apiKey);
  };

  // 下拉选中 → 同步到 input
  const modelSelect = document.getElementById('ai-model-select');
  modelSelect.onchange = () => {
    if (modelSelect.value) {
      document.getElementById('ai-model').value = modelSelect.value;
    }
  };

  async function doFetchModels(baseUrl, apiKey, preselectedModel) {
    const fetchBtnEl = document.getElementById('ai-fetch-models-btn');
    const statusEl = document.getElementById('model-fetch-status');
    fetchBtnEl.disabled = true;
    fetchBtnEl.classList.add('spinning');
    statusEl.textContent = '正在获取模型列表...';
    statusEl.className = 'chat-setting-row model-status';

    try {
      const models = await aiClient.fetchModels(baseUrl, apiKey);
      const select = document.getElementById('ai-model-select');
      select.innerHTML = '<option value="">— 选择模型 (' + models.length + ' 个可用) —</option>';
      for (const id of models) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = id;
        select.appendChild(opt);
      }
      // 如果有已保存的模型，预选
      const currentModel = preselectedModel || document.getElementById('ai-model').value;
      if (currentModel) {
        select.value = currentModel;
        // 如果下拉没匹配到，说明模型不在列表中，手动保留
        if (!select.value && currentModel) {
          document.getElementById('ai-model').value = currentModel;
        }
      }
      statusEl.textContent = `✅ 找到 ${models.length} 个模型`;
      statusEl.className = 'chat-setting-row model-status';
    } catch (e) {
      statusEl.textContent = '❌ ' + e.message;
      statusEl.className = 'chat-setting-row model-status error';
    } finally {
      fetchBtnEl.disabled = false;
      fetchBtnEl.classList.remove('spinning');
    }
  }

  function showModelStatus(msg, isError) {
    const el = document.getElementById('model-fetch-status');
    if (!el) return;
    el.textContent = isError ? '❌ ' + msg : '✅ ' + msg;
    el.className = 'chat-setting-row model-status' + (isError ? ' error' : '');
  }

  // 保存设置
  document.getElementById('ai-settings-save').onclick = () => {
    // 优先用下拉选中的，否则用手动输入的
    const selectedFromDrop = document.getElementById('ai-model-select').value;
    const manualInput = document.getElementById('ai-model').value.trim();
    const finalModel = selectedFromDrop || manualInput || AI_CONFIG.model;

    saveConfig({
      baseUrl: document.getElementById('ai-base-url').value,
      apiKey: document.getElementById('ai-api-key').value,
      model: finalModel,
      temperature: parseFloat(document.getElementById('ai-temperature').value) || 0.8,
    });
    aiClient.refreshConfig();
    settingsPanel.classList.remove('visible');
    showNotification('✅ AI设置已保存 — 模型: ' + finalModel);
  };
  document.getElementById('ai-settings-cancel').onclick = () => {
    settingsPanel.classList.remove('visible');
  };

  // 清空对话
  document.getElementById('chat-clear-btn').onclick = () => {
    aiClient.clearChat();
    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = '<div class="chat-welcome">嗨！我是文具世界的AI助手 ✏️<br/>来和我聊天吧~</div>';
  };

  // 加载历史消息
  const history = aiClient.history;
  if (history.length > 0) {
    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = '';
    for (const msg of history) {
      addChatMessage(msg.role, msg.content);
    }
  }

  // 聚焦输入框
  setTimeout(() => input.focus(), 100);
}

function addChatMessage(role, content) {
  const msgContainer = document.getElementById('chat-messages');
  // 清除欢迎语
  const welcome = msgContainer.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  div.textContent = content;
  msgContainer.appendChild(div);
  scrollChatBottom();
  return div;
}

function setChatTyping(on) {
  const msgContainer = document.getElementById('chat-messages');
  const existing = msgContainer.querySelector('.chat-typing');
  if (existing) existing.remove();

  if (on) {
    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.innerHTML = '<span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span>';
    msgContainer.appendChild(typing);
    scrollChatBottom();
  }
}

function scrollChatBottom() {
  const msgContainer = document.getElementById('chat-messages');
  if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
}

// ============================================================
// 🔍 搜索台 — 场景搜索 + 跳转传送
// ============================================================

/** 所有可搜索的场景数据（与GameWorld中的zone坐标同步） */
const SEARCHABLE_ZONES = [
  { type: 'notebook',      emoji: '📓', label: '笔记本书写台', desc: '中央书写台，可以书写和绘画', x: 2000, y: 1620 },
  { type: 'board',         emoji: '📌', label: '公告板',       desc: '贴满手写便签的公告板',     x: 1620, y: 1450 },
  { type: 'shelf',         emoji: '📚', label: '书架',         desc: '摆满故事书的书架',         x: 2420, y: 1300 },
  { type: 'coffee',        emoji: '☕', label: '咖啡角',       desc: '温暖的小憩空间',           x: 1550, y: 1850 },
  { type: 'album',         emoji: '📷', label: '相册',         desc: '上传和浏览照片',           x: 2500, y: 1100 },
  { type: 'mailbox',       emoji: '📮', label: '信箱',         desc: '写信寄给朋友',             x: 2600, y: 1700 },
  { type: 'graffiti',      emoji: '🖌️', label: '涂鸦墙',      desc: '自由涂鸦的创作墙',         x: 1500, y: 1150 },
  { type: 'dart',          emoji: '🎯', label: '飞镖靶',       desc: '投掷飞镖得分',             x: 900,  y: 2500 },
  { type: 'dice',          emoji: '🎲', label: '骰子桌',       desc: '掷骰子比大小',             x: 3200, y: 1100 },
  { type: 'card',          emoji: '🃏', label: '卡牌桌',       desc: '翻牌记忆配对游戏',         x: 2000, y: 550  },
  { type: 'spin',          emoji: '🎡', label: '转盘',         desc: '旋转幸运转盘',             x: 3400, y: 2300 },
  { type: 'music',         emoji: '🎵', label: '音乐盒',       desc: '弹奏钢琴旋律',             x: 550,  y: 800  },
  { type: 'maze',          emoji: '🌀', label: '迷宫花园',     desc: '随机生成的迷宫挑战',       x: 800,  y: 600  },
  { type: 'puzzle',        emoji: '🧩', label: '拼图桌',       desc: '3×3滑块拼图',             x: 2000, y: 500  },
  { type: 'klotski',       emoji: '🏯', label: '华容道',       desc: '经典三国华容道',           x: 3200, y: 600  },
  { type: 'sudoku',        emoji: '🔢', label: '数独角',       desc: '4×4数独挑战',             x: 3500, y: 1400 },
  { type: 'wish',          emoji: '🌟', label: '许愿池',       desc: '投币许愿',                 x: 500,  y: 1500 },
  { type: 'magic',         emoji: '🔮', label: '魔法阵',       desc: '按顺序激活符文',           x: 1800, y: 1600 },
  { type: 'constellation',  emoji: '⭐', label: '星座台',      desc: '连接星星观察星座',         x: 3200, y: 2100 },
  { type: 'hourglass',     emoji: '⏳', label: '沙漏',         desc: '翻转沙漏，珍惜当下',       x: 800,  y: 2400 },
  { type: 'kaleidoscope',  emoji: '🎨', label: '万花筒',       desc: '对称镜像的视觉魔法',       x: 1800, y: 2600 },
  { type: 'diary',         emoji: '📖', label: '日记本',       desc: '记录每日心情',             x: 600,  y: 2000 },
  { type: 'weather',       emoji: '🌤️', label: '天气站',      desc: '切换天气类型观察变化',     x: 2800, y: 1600 },
  { type: 'cooking',       emoji: '🍳', label: '烹饪台',      desc: '收集食材烹饪料理',         x: 3000, y: 2500 },
  { type: 'map',           emoji: '🗺️', label: '地图墙',      desc: '鸟瞰整个手绘世界',         x: 2000, y: 2800 },
  { type: 'chat',          emoji: '🤖', label: 'AI助手台',     desc: '与AI助手聊天对话',         x: 2600, y: 400  },
  { type: 'search',        emoji: '🔍', label: '搜索台',       desc: '搜索并传送到任意场景',     x: 1400, y: 1000 },
  { type: 'sharpener',    emoji: '✏️', label: '铅笔刀',       desc: '节奏削笔音乐游戏',       x: 1200, y: 2500 },
  { type: 'inkwell',      emoji: '🪄', label: '墨水台',       desc: '调色配色挑战',           x: 300,  y: 1100 },
  { type: 'origami',      emoji: '🦢', label: '折纸桌',       desc: '记忆折叠序列',           x: 3700, y: 1800 },
  { type: 'sticker',      emoji: '🏷️', label: '贴纸册',      desc: '收集稀有贴纸',           x: 600,  y: 2700 },
  { type: 'abacus',       emoji: '🧮', label: '算盘',         desc: '算术限时挑战',           x: 3400, y: 400  },
  { type: 'capsule',      emoji: '⏰', label: '时光胶囊',     desc: '给未来自己留封信',       x: 1500, y: 2800 },
];

function showSearchOverlay() {
  bindOverlayClose('search-overlay', 'search-close');
  document.getElementById('search-overlay').classList.add('visible');

  const input = document.getElementById('search-input');
  const resultsEl = document.getElementById('search-results');

  // 初始显示全部场景
  renderSearchResults('');

  // 搜索过滤
  input.oninput = () => {
    renderSearchResults(input.value.trim().toLowerCase());
  };

  // 聚焦搜索框
  setTimeout(() => { input.value = ''; input.focus(); }, 50);
}

function renderSearchResults(query) {
  const resultsEl = document.getElementById('search-results');
  resultsEl.innerHTML = '';

  const filtered = query
    ? SEARCHABLE_ZONES.filter(z =>
        z.label.toLowerCase().includes(query) ||
        z.type.toLowerCase().includes(query) ||
        z.desc.toLowerCase().includes(query) ||
        z.emoji.includes(query)
      )
    : SEARCHABLE_ZONES;

  if (filtered.length === 0) {
    resultsEl.innerHTML = '<div style="text-align:center;font-family:var(--font-display);font-size:16px;color:var(--text-ghost);padding:20px 0;">没有找到匹配的场景 🤔</div>';
    return;
  }

  for (const zone of filtered) {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.innerHTML = `
      <div class="search-item-emoji">${zone.emoji}</div>
      <div class="search-item-info">
        <div class="search-item-name">${zone.label}</div>
        <div class="search-item-desc">${zone.desc}</div>
      </div>
      <div class="search-item-action">传送 →</div>
    `;
    item.onclick = () => teleportToZone(zone);
    resultsEl.appendChild(item);
  }
}

/** 传送到指定场景位置 */
function teleportToZone(zone) {
  // 关闭搜索overlay
  document.getElementById('search-overlay').classList.remove('visible');
  setMode('explore');

  // 传送玩家到目标zone前方(站在zone下方30px处)
  const targetX = zone.x;
  const targetY = zone.y + 30; // zone.y是底部，+30让玩家站在稍前方

  gameWorld.player.x = targetX;
  gameWorld.player.y = targetY;
  gameWorld.player.targetX = targetX;
  gameWorld.player.targetY = targetY;
  gameWorld.player.navigating = false;

  // 立即跳转相机，避免平滑拖拽造成的延迟感
  gameWorld.cameraX = Math.max(0, Math.min(WORLD_W - gameWorld.viewportW, targetX - gameWorld.viewportW / 2));
  gameWorld.cameraY = Math.max(0, Math.min(WORLD_H - gameWorld.viewportH, targetY - gameWorld.viewportH / 2));

  audio.playSFX('teleport');
  showNotification(`✨ 已传送到「${zone.emoji} ${zone.label}」`);
}

// ============================================================
// ✏️ 铅笔刀 — 节奏游戏
// ============================================================

let sharpenerState = null;
const SHARPENER_DIRS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const SHARPENER_DIR_EMOJI = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };

function loadSharpenerHigh() {
  try { return parseInt(localStorage.getItem('sharpener-high') || '0'); } catch { return 0; }
}
function saveSharpenerHigh(s) {
  try { localStorage.setItem('sharpener-high', String(s)); } catch { /* ignore */ }
}

function showSharpenerOverlay() {
  bindOverlayClose('sharpener-overlay', 'sharpener-close');
  document.getElementById('sharpener-overlay').classList.add('visible');
  const hs = loadSharpenerHigh();
  document.getElementById('sharpener-highscore').textContent = hs;
  if (!sharpenerState) {
    sharpenerState = { playing: false, notes: [], noteIdx: 0, score: 0, combo: 0, timer: null, startTime: 0 };
  }
  document.getElementById('sharpener-score').textContent = 0;
  document.getElementById('sharpener-combo').textContent = 0;
  document.getElementById('sharpener-judge').textContent = '';
  document.getElementById('sharpener-result').style.display = 'none';
  document.getElementById('sharpener-notes').innerHTML = '';
  document.getElementById('sharpener-start').onclick = startSharpenerGame;
  document.getElementById('sharpener-restart').onclick = () => { stopSharpenerGame(); startSharpenerGame(); };
}

function startSharpenerGame() {
  const ns = { playing: true, notes: [], noteIdx: 0, score: 0, combo: 0, timer: null, startTime: Date.now(), noteEls: [] };
  // 生成10个随机音符
  for (let i = 0; i < 10; i++) {
    ns.notes.push(SHARPENER_DIRS[Math.floor(Math.random() * 4)]);
  }
  sharpenerState = ns;
  document.getElementById('sharpener-score').textContent = 0;
  document.getElementById('sharpener-combo').textContent = 0;
  document.getElementById('sharpener-judge').textContent = '';
  document.getElementById('sharpener-result').style.display = 'none';
  document.getElementById('sharpener-notes').innerHTML = '';

  // 渲染音符DOM
  const container = document.getElementById('sharpener-notes');
  ns.notes.forEach((dir, i) => {
    const col = SHARPENER_DIRS.indexOf(dir);
    const el = document.createElement('div');
    el.textContent = SHARPENER_DIR_EMOJI[dir];
    el.style.cssText = `position:absolute;left:${col * 25 + 12.5}%;top:${-30 - i * 50}px;font-size:22px;width:25%;text-align:center;transform:translateX(-50%);transition:top 0.05s linear;font-family:var(--font-display);`;
    container.appendChild(el);
    ns.noteEls.push(el);
  });

  // 启动动画循环
  const speed = 1.5; // pixels per ms
  let lastT = performance.now();
  function tick(now) {
    if (!sharpenerState.playing) return;
    const dt = now - lastT;
    lastT = now;
    const elapsed = now - ns.startTime;
    ns.noteEls.forEach((el, i) => {
      const targetY = 200; // 判定线位置
      const baseY = -30 - i * 50;
      const currentY = baseY + (elapsed * speed / 16);
      el.style.top = currentY + 'px';
    });
    // 自动miss检查
    while (ns.noteIdx < ns.notes.length) {
      const elapsed2 = performance.now() - ns.startTime;
      const noteY = -30 - ns.noteIdx * 50 + (elapsed2 * speed / 16);
      if (noteY > 210) {
        // 超出判定区 → Miss
        sharpenerJudge('miss');
        ns.noteIdx++;
      } else {
        break;
      }
    }
    if (ns.noteIdx >= ns.notes.length) {
      endSharpenerGame();
      return;
    }
    sharpenerState.timer = requestAnimationFrame(tick);
  }
  sharpenerState.timer = requestAnimationFrame(tick);
}

function sharpenerJudge(result) {
  const el = document.getElementById('sharpener-judge');
  if (result === 'perfect') { el.textContent = '✨ Perfect!'; el.style.color = '#077B8A'; sharpenerState.score += 100; sharpenerState.combo++; audio.playSFX('perfect'); }
  else if (result === 'good') { el.textContent = '👌 Good!'; el.style.color = '#5B8C5A'; sharpenerState.score += 50; sharpenerState.combo++; audio.playSFX('good'); }
  else { el.textContent = '💨 Miss'; el.style.color = '#EA5455'; sharpenerState.combo = 0; audio.playSFX('miss'); }
  document.getElementById('sharpener-score').textContent = sharpenerState.score;
  document.getElementById('sharpener-combo').textContent = sharpenerState.combo;
}

function endSharpenerGame() {
  sharpenerState.playing = false;
  if (sharpenerState.timer) cancelAnimationFrame(sharpenerState.timer);
  const score = sharpenerState.score;
  const hs = loadSharpenerHigh();
  const isNew = score > hs;
  if (isNew) { saveSharpenerHigh(score); document.getElementById('sharpener-highscore').textContent = score; }
  const resultEl = document.getElementById('sharpener-result');
  resultEl.style.display = 'block';
  resultEl.textContent = `终结！得分 ${score}${isNew ? ' 🎉新纪录！' : ''}`;
  audio.playSFX(score > 0 ? 'success' : 'fail');
}

function stopSharpenerGame() {
  if (sharpenerState) {
    sharpenerState.playing = false;
    if (sharpenerState.timer) cancelAnimationFrame(sharpenerState.timer);
  }
}

// 铅笔刀全局键盘监听
window._sharpenerKeyHandler = (e) => {
  if (!sharpenerState || !sharpenerState.playing) return;
  const dir = e.code;
  if (!SHARPENER_DIRS.includes(dir)) return;
  e.preventDefault();
  if (sharpenerState.noteIdx >= sharpenerState.notes.length) return;
  const expected = sharpenerState.notes[sharpenerState.noteIdx];
  if (dir === expected) {
    // 判定距离
    const elapsed = performance.now() - sharpenerState.startTime;
    const noteY = -30 - sharpenerState.noteIdx * 50 + (elapsed * 1.5 / 16);
    const dist = Math.abs(noteY - 200);
    if (dist < 25) sharpenerJudge('perfect');
    else if (dist < 55) sharpenerJudge('good');
    else sharpenerJudge('miss');
  } else {
    sharpenerJudge('miss');
  }
  sharpenerState.noteIdx++;
  if (sharpenerState.noteIdx >= sharpenerState.notes.length) endSharpenerGame();
};
document.addEventListener('keydown', window._sharpenerKeyHandler);

// ============================================================
// 🪄 墨水台 — 配色游戏
// ============================================================

const INKWELL_MIXES = {
  'red+blue':    { name: '紫色',  color: '#9B59B6' },
  'red+yellow':   { name: '橙色',  color: '#E67E22' },
  'blue+yellow':  { name: '绿色',  color: '#27AE60' },
};
const INKWELL_OPTIONS = Object.values(INKWELL_MIXES);
let inkwellState = null;

function loadInkwellHigh() {
  try { return parseInt(localStorage.getItem('inkwell-high') || '0'); } catch { return 0; }
}
function saveInkwellHigh(s) { try { localStorage.setItem('inkwell-high', String(s)); } catch {} }

function showInkwellOverlay() {
  bindOverlayClose('inkwell-overlay', 'inkwell-close');
  document.getElementById('inkwell-overlay').classList.add('visible');
  document.getElementById('inkwell-highscore').textContent = loadInkwellHigh();
  inkwellState = { round: 0, score: 0, correct: 0, selected: [], target: null };
  inkwellNextRound();
  // 绑定颜色按钮
  document.querySelectorAll('.inkwell-color-btn').forEach(btn => {
    btn.onclick = () => {
      if (!inkwellState) return;
      const c = btn.dataset.color;
      if (inkwellState.selected.includes(c)) return;
      if (inkwellState.selected.length >= 2) return;
      inkwellState.selected.push(c);
      btn.style.transform = 'scale(0.9)';
      btn.style.boxShadow = '0 0 8px rgba(7,123,138,0.5)';
      document.getElementById('inkwell-selected').textContent = inkwellState.selected.map(s => ({red:'🔴红',blue:'🔵蓝',yellow:'🟡黄'}[s])).join(' + ');
      document.getElementById('inkwell-mix').disabled = inkwellState.selected.length < 2;
    };
  });
  document.getElementById('inkwell-mix').onclick = inkwellMix;
  document.getElementById('inkwell-clear-sel').onclick = inkwellClearSel;
}

function inkwellNextRound() {
  if (inkwellState.round >= 10) {
    const hs = loadInkwellHigh();
    if (inkwellState.score > hs) { saveInkwellHigh(inkwellState.score); document.getElementById('inkwell-highscore').textContent = inkwellState.score; }
    showNotification(`🎨 配色结束！得分 ${inkwellState.score}`);
    audio.playSFX('success');
    return;
  }
  inkwellState.selected = [];
  const target = INKWELL_OPTIONS[Math.floor(Math.random() * INKWELL_OPTIONS.length)];
  inkwellState.target = target;
  document.getElementById('inkwell-target').style.background = target.color;
  document.getElementById('inkwell-target-name').textContent = target.name;
  document.getElementById('inkwell-selected').textContent = '点击选择颜色（选2个）';
  document.getElementById('inkwell-mix').disabled = true;
  inkwellClearSel();
}

function inkwellMix() {
  if (!inkwellState || inkwellState.selected.length < 2) return;
  const sel = [...inkwellState.selected].sort();
  const key = sel.join('+');
  const result = INKWELL_MIXES[key];
  if (result && result.name === inkwellState.target.name) {
    inkwellState.score += 10;
    inkwellState.correct++;
    audio.playSFX('success');
    showNotification('✅ 正确！');
  } else {
    inkwellState.score = Math.max(0, inkwellState.score - 2);
    audio.playSFX('fail');
    showNotification('❌ 不对哦～');
  }
  inkwellState.round++;
  document.getElementById('inkwell-score').textContent = inkwellState.score;
  document.getElementById('inkwell-correct').textContent = inkwellState.correct;
  setTimeout(inkwellNextRound, 800);
}

function inkwellClearSel() {
  if (!inkwellState) return;
  inkwellState.selected = [];
  document.querySelectorAll('.inkwell-color-btn').forEach(btn => { btn.style.transform = ''; btn.style.boxShadow = ''; });
  document.getElementById('inkwell-selected').textContent = '点击选择颜色（选2个）';
  document.getElementById('inkwell-mix').disabled = true;
}

// ============================================================
// 🦢 折纸桌 — Simon Says
// ============================================================

const ORIGAMI_DIRS = ['ru', 'rd', 'ld', 'lu', 'u', 'd'];
const ORIGAMI_EMOJI = { ru: '↗', rd: '↘', ld: '↙', lu: '↖', u: '⬆', d: '⬇' };
let origamiState = null;

function loadOrigamiHigh() {
  try { return parseInt(localStorage.getItem('origami-high') || '0'); } catch { return 0; }
}
function saveOrigamiHigh(l) { try { localStorage.setItem('origami-high', String(l)); } catch {} }

function showOrigamiOverlay() {
  bindOverlayClose('origami-overlay', 'origami-close');
  document.getElementById('origami-overlay').classList.add('visible');
  document.getElementById('origami-highlevel').textContent = loadOrigamiHigh();
  origamiState = { sequence: [], playerIdx: 0, level: 1, phase: 'idle', showIdx: 0 };
  document.getElementById('origami-start').onclick = startOrigamiGame;
  document.querySelectorAll('.origami-dir-btn').forEach(btn => {
    btn.onclick = () => {
      if (!origamiState || origamiState.phase !== 'input') return;
      const dir = btn.dataset.dir;
      if (dir === origamiState.sequence[origamiState.playerIdx]) {
        origamiState.playerIdx++;
        audio.playSFX('click');
        if (origamiState.playerIdx >= origamiState.sequence.length) {
          // 本轮成功
          origamiState.level++;
          audio.playSFX('success');
          showNotification(`📐 级别 ${origamiState.level}！`);
          setTimeout(origamiNextRound, 600);
        }
      } else {
        // 失败
        origamiState.phase = 'idle';
        audio.playSFX('fail');
        const hl = loadOrigamiHigh();
        if (origamiState.level - 1 > hl) { saveOrigamiHigh(origamiState.level - 1); document.getElementById('origami-highlevel').textContent = origamiState.level - 1; }
        document.getElementById('origami-status').textContent = `❌ 失败！到达级别 ${origamiState.level - 1}`;
        document.getElementById('origami-start').textContent = '🔄 再来';
      }
    };
  });
}

function startOrigamiGame() {
  origamiState = { sequence: [], playerIdx: 0, level: 1, phase: 'show', showIdx: 0 };
  origamiNextRound();
}

function origamiNextRound() {
  if (!origamiState) return;
  const seqLen = origamiState.level + 1; // 级别1→2步, 级别2→3步…
  // 加一个新方向
  origamiState.sequence.push(ORIGAMI_DIRS[Math.floor(Math.random() * 6)]);
  origamiState.playerIdx = 0;
  origamiState.phase = 'show';
  origamiState.showIdx = 0;

  document.getElementById('origami-level').textContent = origamiState.level;
  document.getElementById('origami-seqlen').textContent = origamiState.sequence.length;
  document.getElementById('origami-status').textContent = '👀 观察序列...';
  document.getElementById('origami-display').textContent = '';

  // 逐个展示
  let i = 0;
  const showNext = () => {
    if (i >= origamiState.sequence.length) {
      origamiState.phase = 'input';
      document.getElementById('origami-status').textContent = '👆 你的回合！';
      document.getElementById('origami-display').textContent = '❓';
      return;
    }
    const dir = origamiState.sequence[i];
    document.getElementById('origami-display').textContent = ORIGAMI_EMOJI[dir];
    audio.playSFX('click');
    i++;
    setTimeout(showNext, 600);
  };
  setTimeout(showNext, 400);
}

// ============================================================
// 🏷️ 贴纸收集册 — 收集系统
// ============================================================

const STICKER_ALL = ['🌟','🌸','🐱','🌈','🎵','🍎','🦋','🌙','🍀','🎈','🎨','🍕','🌺','🐰','🍦','🎭','🦊','🍄','🌺','🌈','⭐','🎀','🐼','🌼','🍒','🐳','🎪','🌻','🦉','💎'];
let stickerCollection = null;

function loadStickerData() {
  try {
    const raw = localStorage.getItem('sticker-data');
    return raw ? JSON.parse(raw) : { owned: [] };
  } catch { return { owned: [] }; }
}
function saveStickerData() {
  try { localStorage.setItem('sticker-data', JSON.stringify(stickerCollection)); } catch {}
}

function showStickerOverlay() {
  bindOverlayClose('sticker-overlay', 'sticker-close');
  document.getElementById('sticker-overlay').classList.add('visible');
  if (!stickerCollection) stickerCollection = loadStickerData();
  renderStickerGrid();
  document.getElementById('sticker-draw').onclick = stickerDraw;
}

function renderStickerGrid() {
  const grid = document.getElementById('sticker-grid');
  if (!grid) return;
  grid.innerHTML = '';
  // 展示20个槽位
  for (let i = 0; i < 20; i++) {
    const slot = document.createElement('div');
    slot.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1;background:var(--paper);border:1.5px solid var(--kraft);border-radius:6px;font-size:24px;';
    if (i < stickerCollection.owned.length) {
      slot.textContent = stickerCollection.owned[i];
    } else {
      slot.textContent = '❓';
      slot.style.opacity = '0.4';
    }
    grid.appendChild(slot);
  }
  const unique = new Set(stickerCollection.owned);
  document.getElementById('sticker-progress').textContent = `${unique.size}/20`;
  document.getElementById('sticker-bar').style.width = `${(unique.size / 20) * 100}%`;
}

function stickerDraw() {
  if (!stickerCollection) return;
  // 从全部30种中随机
  const sticker = STICKER_ALL[Math.floor(Math.random() * STICKER_ALL.length)];
  stickerCollection.owned.push(sticker);
  saveStickerData();
  audio.playSFX('collect');
  const result = document.getElementById('sticker-draw-result');
  result.textContent = sticker;
  result.style.transform = 'scale(1.5)';
  setTimeout(() => { result.style.transform = 'scale(1)'; }, 200);
  const unique = new Set(stickerCollection.owned);
  if (unique.size >= 20) {
    showNotification('🎉 恭喜！贴纸收集完成！');
    audio.playSFX('success');
  }
  renderStickerGrid();
}

// ============================================================
// 🧮 算盘 — 数学挑战
// ============================================================

let abacusState = null;

function loadAbacusHigh() {
  try { return parseInt(localStorage.getItem('abacus-high') || '0'); } catch { return 0; }
}
function saveAbacusHigh(s) { try { localStorage.setItem('abacus-high', String(s)); } catch {} }

function showAbacusOverlay() {
  bindOverlayClose('abacus-overlay', 'abacus-close');
  document.getElementById('abacus-overlay').classList.add('visible');
  document.getElementById('abacus-highstreak').textContent = loadAbacusHigh();
  abacusState = { playing: false, streak: 0, answer: 0, timeLeft: 10, timer: null };
  document.getElementById('abacus-start').onclick = startAbacusGame;
  document.getElementById('abacus-submit').onclick = checkAbacusAnswer;
  // Enter键提交
  const input = document.getElementById('abacus-answer');
  if (input) input.onkeydown = (e) => { if (e.code === 'Enter') checkAbacusAnswer(); };
}

function startAbacusGame() {
  abacusState = { playing: true, streak: 0, answer: 0, timeLeft: 10, timer: null, difficulty: 1 };
  abacusNextProblem();
}

function abacusNextProblem() {
  if (!abacusState) return;
  const d = abacusState.difficulty;
  let a, b, op, answer;
  if (d <= 2) {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    op = Math.random() < 0.5 ? '+' : '-';
    if (op === '-' && a < b) [a, b] = [b, a];
    answer = op === '+' ? a + b : a - b;
  } else if (d <= 5) {
    a = Math.floor(Math.random() * 50) + 10;
    b = Math.floor(Math.random() * 30) + 1;
    const ops = ['+', '-', '×'];
    op = ops[Math.floor(Math.random() * 3)];
    if (op === '-' && a < b) [a, b] = [b, a];
    if (op === '×') { a = Math.floor(Math.random() * 12) + 2; b = Math.floor(Math.random() * 12) + 2; answer = a * b; }
    else answer = op === '+' ? a + b : a - b;
  } else {
    a = Math.floor(Math.random() * 100) + 10;
    b = Math.floor(Math.random() * 50) + 1;
    op = ['+', '-', '×'][Math.floor(Math.random() * 3)];
    if (op === '-' && a < b) [a, b] = [b, a];
    if (op === '×') { a = Math.floor(Math.random() * 15) + 2; b = Math.floor(Math.random() * 15) + 2; answer = a * b; }
    else answer = op === '+' ? a + b : a - b;
  }
  abacusState.answer = answer;
  document.getElementById('abacus-problem').textContent = `${a} ${op} ${b} = ?`;
  document.getElementById('abacus-answer').value = '';
  document.getElementById('abacus-answer').focus();
  document.getElementById('abacus-feedback').textContent = '';
  // 倒计时
  abacusState.timeLeft = 10;
  document.getElementById('abacus-time').textContent = '10';
  document.getElementById('abacus-timer-fill').style.width = '100%';
  if (abacusState.timer) clearInterval(abacusState.timer);
  abacusState.timer = setInterval(() => {
    abacusState.timeLeft -= 0.1;
    if (abacusState.timeLeft <= 0) {
      abacusState.timeLeft = 0;
      clearInterval(abacusState.timer);
      abacusFail();
    }
    document.getElementById('abacus-time').textContent = Math.ceil(abacusState.timeLeft);
    document.getElementById('abacus-timer-fill').style.width = `${(abacusState.timeLeft / 10) * 100}%`;
    if (abacusState.timeLeft < 3) document.getElementById('abacus-timer-fill').style.background = 'var(--redline)';
    else document.getElementById('abacus-timer-fill').style.background = 'var(--teal)';
  }, 100);
}

function checkAbacusAnswer() {
  if (!abacusState || !abacusState.playing) return;
  const val = parseInt(document.getElementById('abacus-answer').value);
  if (isNaN(val)) return;
  if (val === abacusState.answer) {
    abacusState.streak++;
    abacusState.difficulty = Math.floor(abacusState.streak / 3) + 1;
    document.getElementById('abacus-streak').textContent = abacusState.streak;
    document.getElementById('abacus-feedback').textContent = '✅ 正确！';
    document.getElementById('abacus-feedback').style.color = '#077B8A';
    audio.playSFX('success');
    if (abacusState.timer) clearInterval(abacusState.timer);
    setTimeout(abacusNextProblem, 500);
  } else {
    abacusFail();
  }
}

function abacusFail() {
  if (!abacusState) return;
  abacusState.playing = false;
  if (abacusState.timer) clearInterval(abacusState.timer);
  document.getElementById('abacus-feedback').textContent = `❌ 答案是 ${abacusState.answer}，连胜 ${abacusState.streak}`;
  document.getElementById('abacus-feedback').style.color = '#EA5455';
  audio.playSFX('fail');
  const hs = loadAbacusHigh();
  if (abacusState.streak > hs) { saveAbacusHigh(abacusState.streak); document.getElementById('abacus-highstreak').textContent = abacusState.streak; }
  document.getElementById('abacus-start').textContent = '🔄 再来';
}

// ============================================================
// ⏰ 时光胶囊 — 存信
// ============================================================

const CAPSULE_KEY = 'time-capsules';
let capsuleData = null;
let capsuleSelectedMinutes = 5;

function loadCapsules() {
  try { const raw = localStorage.getItem(CAPSULE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveCapsules() { try { localStorage.setItem(CAPSULE_KEY, JSON.stringify(capsuleData)); } catch {} }

function showCapsuleOverlay() {
  bindOverlayClose('capsule-overlay', 'capsule-close');
  document.getElementById('capsule-overlay').classList.add('visible');
  capsuleData = loadCapsules();
  renderCapsuleList();

  // 时间选择按钮
  document.querySelectorAll('.capsule-time-btn').forEach(btn => {
    btn.onclick = () => {
      capsuleSelectedMinutes = parseInt(btn.dataset.minutes);
      document.querySelectorAll('.capsule-time-btn').forEach(b => b.style.background = '');
      btn.style.background = 'var(--teal)';
      btn.style.color = '#fff';
    };
  });
  document.getElementById('capsule-seal').onclick = sealCapsule;
}

function renderCapsuleList() {
  const list = document.getElementById('capsule-list');
  if (!list) return;
  list.innerHTML = '';
  if (capsuleData.length === 0) {
    list.innerHTML = '<div style="text-align:center;font-family:var(--font-display);font-size:14px;color:var(--text-ghost);padding:20px 0;">还没有胶囊，写一个吧 ✨</div>';
    return;
  }
  const now = Date.now();
  capsuleData.forEach((cap, i) => {
    const unlocked = now >= cap.unlockAt;
    const remaining = Math.max(0, cap.unlockAt - now);
    const div = document.createElement('div');
    div.style.cssText = `padding:10px;margin:4px 0;border:1.5px solid var(--kraft);border-radius:3px 10px 3px 10px;background:var(--paper);font-family:var(--font-display);display:flex;justify-content:space-between;align-items:center;`;
    if (unlocked) {
      div.innerHTML = `<div style="flex:1;">🎉 <span style="font-size:13px;">${cap.text}</span><div style="font-size:11px;color:var(--text-ghost);margin-top:2px;">封存了 ${formatDuration(cap.unlockAt - cap.sealedAt)} 前</div></div><button style="font-size:12px;padding:4px 10px;border:1px solid var(--kraft);border-radius:6px;background:var(--paper);cursor:pointer;" onclick="document.getElementById('capsule-list').querySelectorAll('div')[${i}].querySelector('div').innerHTML='📖 ${cap.text.replace(/'/g, "\\'")}';">📖 读</button>`;
    } else {
      div.innerHTML = `<div>🔒 封存中... <span style="font-size:11px;color:var(--text-ghost);">还剩 ${formatDuration(remaining)}</span></div>`;
    }
    list.appendChild(div);
  });
}

function sealCapsule() {
  const text = document.getElementById('capsule-text').value.trim();
  if (!text) { document.getElementById('capsule-message').textContent = '请先写下点什么 ✍️'; return; }
  if (capsuleData.length >= 10) {
    // 删除最旧的已解锁胶囊
    const unlockedIdx = capsuleData.findIndex(c => Date.now() >= c.unlockAt);
    if (unlockedIdx >= 0) capsuleData.splice(unlockedIdx, 1);
    else { document.getElementById('capsule-message').textContent = '胶囊已满（最多10个）'; return; }
  }
  capsuleData.push({ text, sealedAt: Date.now(), unlockAt: Date.now() + capsuleSelectedMinutes * 60000 });
  saveCapsules();
  document.getElementById('capsule-text').value = '';
  document.getElementById('capsule-message').textContent = '🔒 胶囊已封存！';
  audio.playSFX('lock');
  renderCapsuleList();
}

function formatDuration(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '不到1分钟';
  if (mins < 60) return `${mins}分钟`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时`;
  const days = Math.floor(hours / 24);
  return `${days}天`;
}

// ============================================================
// 返回探索按钮
// ============================================================

const backBtn = document.getElementById('back-to-explore');
if (backBtn) backBtn.addEventListener('click', () => { stopMelody(); setMode('explore'); });

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
    if (e.code === 'ArrowLeft') { lightboxPrev(); return; }
    if (e.code === 'ArrowRight') { lightboxNext(); return; }
  }

  if (e.code === 'Escape') {
    const textOverlay = document.getElementById('text-input-overlay');
    if (textOverlay && textOverlay.style.display === 'flex') return;
    // 如果相册密码弹窗打开，先关闭它而不退出 album 模式
    const pwdPanel = document.getElementById('album-password-panel');
    if (pwdPanel && pwdPanel.classList.contains('visible')) { cancelAlbumPassword(); return; }
    if (currentMode !== 'explore') { e.preventDefault(); stopMelody(); stopSharpenerGame(); if (hourglassTimer) { clearInterval(hourglassTimer); hourglassTimer = null; } if (abacusState && abacusState.timer) { clearInterval(abacusState.timer); abacusState.timer = null; } setMode('explore'); return; }
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

const OVERLAY_MODES = ['board', 'shelf', 'coffee', 'album', 'mailbox', 'graffiti', 'dart', 'dice', 'card', 'spin', 'music', 'maze', 'puzzle', 'klotski', 'sudoku', 'wish', 'magic', 'constellation', 'hourglass', 'kaleidoscope', 'diary', 'weather', 'cooking', 'map', 'chat', 'search', 'sharpener', 'inkwell', 'origami', 'sticker', 'abacus', 'capsule'];

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
      exploreUI.setTooltip(nearZone ? '按 F — ' + nearZone.label : '');

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
