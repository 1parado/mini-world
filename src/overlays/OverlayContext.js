// OverlayContext — 共享依赖注入，所有 overlay 模块通过 show(ctx) 接收
// 避免循环引用，让 main.js 在初始化时注入所有依赖

/**
 * @typedef {Object} OverlayContext
 * @property {Function} setMode        - 切换模式 (explore/writing/overlay名)
 * @property {Function} bindOverlayClose - 绑定关闭按钮 (overlayId, closeBtnId)
 * @property {Function} showNotification - 显示 toast 通知
 * @property {Object}   audio           - AudioManager 实例 (.playSFX, .startBGM, .stopBGM)
 * @property {Object}   gameWorld       - GameWorld 实例 (.getZoneByType, .player)
 * @property {number}   WORLD_W        - 世界宽度
 * @property {number}   WORLD_H        - 世界高度
 * @property {Object}   storageClient   - Supabase Storage 客户端
 * @property {Object}   helpers         - { dbListMessages, dbAddMessage, dbListBoardMessages, dbAddBoardMessage, dbListWishes, dbAddWish, loadConfig, saveConfig, AI_CONFIG, AIClient }
 * @property {string[]} ALL_OVERLAY_IDS - 所有 overlay DOM ID 列表
 * @property {string[]} OVERLAY_MODES   - 所有 overlay 模式名列表
 * @property {Object}   progress        - PlayerProgress 实例 (.earnCoins, .spendCoins, .markZoneComplete, .incrementVisit, .reportHighScore, .markMusicListened)
 * @property {boolean}  isMobile        - 是否为移动端设备
 */

let _ctx = null;

/**
 * 初始化上下文（main.js 在启动时调用一次）
 * @param {OverlayContext} ctx
 */
export function initOverlayContext(ctx) {
  _ctx = ctx;
}

/**
 * 获取上下文（各 overlay 模块调用）
 * @returns {OverlayContext}
 */
export function getCtx() {
  if (!_ctx) throw new Error('OverlayContext not initialized — call initOverlayContext() first');
  return _ctx;
}
