// PlayerProgress.js — 🪙 墨水币 + 🏆 成就/徽章 系统核心
const STORAGE_KEY = 'player-progress';

/* ── 成就定义 ────────────────────────────── */
const BADGE_DEFS = [
  // 🥉 铜墨水（入门）
  { id: 'first_step',    icon: '🦶', name: '第一步',     desc: '首次访问任何区域',         tier: 'bronze' },
  { id: 'first_coin',    icon: '🪙', name: '第一桶金',   desc: '首次获得墨水币',         tier: 'bronze' },
  { id: 'explorer_5',    icon: '🗺️', name: '小小探索家', desc: '访问 5 个不同区域',       tier: 'bronze' },
  { id: 'first_clear',   icon: '✨', name: '初出茅庐',   desc: '首次通关任何区域',       tier: 'bronze' },
  // 🥈 银墨水（进阶）
  { id: 'puzzle_master', icon: '🧩', name: '解谜达人',   desc: '通关 4 个解谜区域',       tier: 'silver' },
  { id: 'collector',     icon: '🏷️', name: '收藏家',     desc: '贴纸收集完成',           tier: 'silver' },
  { id: 'lucky_7',       icon: '🎰', name: '幸运儿',     desc: '转盘转 7 次',            tier: 'silver' },
  { id: 'musician',      icon: '🎵', name: '音乐家',     desc: '听完全部 3 首曲子',     tier: 'silver' },
  { id: 'coin_100',      icon: '💰', name: '小富翁',     desc: '累计获得 100🪙',         tier: 'silver' },
  // 🥇 金墨水（大师）
  { id: 'completionist', icon: '👑', name: '全踩点',     desc: '访问全部区域',           tier: 'gold' },
  { id: 'grand_master',  icon: '🏆', name: '全通关',     desc: '通关全部 8 个通关类区域', tier: 'gold' },
  { id: 'coin_500',      icon: '💎', name: '墨水大亨',   desc: '累计获得 500🪙',         tier: 'gold' },
  { id: 'marathon',      icon: '🏃', name: '马拉松',     desc: '单次会话访问 10 个不同区域', tier: 'gold' },
  { id: 'perfectionist', icon: '💎', name: '完美主义',   desc: '同一会话内通关 4 个区域', tier: 'gold' },
  { id: 'stargazer',     icon: '⭐', name: '观星者',     desc: '星座全部完成',           tier: 'gold' },
];

/* ── 区域分类 ────────────────────────────── */
// 通关类（首次完成 +10🪙）
const CLEAR_ZONES = ['maze', 'puzzle', 'klotski', 'sudoku', 'card', 'constellation', 'magic', 'sticker'];
// 解谜类（puzzle_master 成就统计用）
const PUZZLE_ZONES = ['maze', 'puzzle', 'klotski', 'sudoku'];
// 挑战类（刷新高分 +5🪙）
const CHALLENGE_ZONES = ['dart', 'dice', 'sharpener', 'inkwell', 'origami', 'abacus'];

/* ── 每日奖励 ────────────────────────────── */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/* ── 空状态 ────────────────────────────── */
function emptyState() {
  return {
    coins: 0,
    badges: [],
    zoneCompleted: {},
    totalVisits: {},       // { zoneType: count }
    dailyRewardDate: '',   // '2026-6-28'
    stats: {
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
    },
  };
}

/* ── 主类 ────────────────────────────── */
export class PlayerProgress {
  constructor() {
    this._state = emptyState();
    this._sessionVisited = new Set();   // 本次会话访问的区域
    this._sessionCleared = new Set();   // 本次会话通关的区域
    this._highScores = {};              // { zoneType: bestScore } 挑战类高分追踪
    this._newBadges = [];               // 新解锁待展示的徽章
    this._onUpdate = null;              // HUD 更新回调
    this._onZoneFirstClear = null;      // 首次通关庆祝回调
    this.load();
  }

  /* ── HUD 回调绑定 ────────────── */
  setOnUpdate(fn) { this._onUpdate = fn; }
  setOnZoneFirstClear(fn) { this._onZoneFirstClear = fn; }
  _notify() { if (this._onUpdate) this._onUpdate(this._state); }

  /* ── 持久化 ────────────── */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // 合并到空状态（防止旧版少字段报错）
        this._state = { ...emptyState(), ...saved, stats: { ...emptyState().stats, ...(saved.stats || {}) } };
      }
    } catch { /* 损坏则重置 */ }
  }
  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state)); } catch { /* 忽略 */ }
  }

  /* ── 墨水币 ────────────── */
  earnCoins(amount, reason) {
    if (amount <= 0) return;
    this._state.coins += amount;
    this._state.stats.totalCoinsEarned += amount;
    this.save();
    this.checkBadges();
    this._notify();
  }

  spendCoins(amount) {
    if (amount <= 0 || this._state.coins < amount) return false;
    this._state.coins -= amount;
    this._state.stats.totalCoinsSpent += amount;
    this.save();
    this._notify();
    return true;
  }

  get coins() { return this._state.coins; }

  /* ── 区域完成 ────────────── */
  markZoneComplete(zoneType) {
    if (this._state.zoneCompleted[zoneType]) return; // 已完成过，防刷
    this._state.zoneCompleted[zoneType] = true;
    this._sessionCleared.add(zoneType);
    this.save();
    this.checkBadges();
    this._notify();
    // 🎉 首次通关庆祝
    if (this._onZoneFirstClear) this._onZoneFirstClear(zoneType);
  }

  isZoneCompleted(zoneType) { return !!this._state.zoneCompleted[zoneType]; }

  /* ── 挑战类高分奖励 ────────────── */
  reportHighScore(zoneType, score) {
    const prev = this._highScores[zoneType] || 0;
    if (score > prev) {
      this._highScores[zoneType] = score;
      if (prev > 0) {
        // 非首次、真的刷新了高分 → 奖励
        this.earnCoins(5, zoneType + '_high');
      }
    }
  }

  /* ── 区域访问 ────────────── */
  incrementVisit(zoneType) {
    this._state.totalVisits[zoneType] = (this._state.totalVisits[zoneType] || 0) + 1;
    this._sessionVisited.add(zoneType);

    // 每日首访奖励
    const today = todayKey();
    if (this._state.dailyRewardDate !== today) {
      this._state.dailyRewardDate = today;
      this.earnCoins(1, 'daily_visit');
    }

    this.save();
    this.checkBadges();
    this._notify();
  }

  /* ── 成就检测 ────────────── */
  checkBadges() {
    const s = this._state;
    const owned = new Set(s.badges);

    const conditions = {
      first_step:    () => Object.keys(s.totalVisits).length >= 1,
      first_coin:    () => s.stats.totalCoinsEarned > 0,
      explorer_5:    () => Object.keys(s.totalVisits).length >= 5,
      first_clear:   () => Object.keys(s.zoneCompleted).length >= 1,
      puzzle_master: () => PUZZLE_ZONES.every(z => s.zoneCompleted[z]),
      collector:     () => s.zoneCompleted['sticker'],
      lucky_7:       () => (s.totalVisits['spin'] || 0) >= 7,
      musician:      () => s.musicListenedAll,
      coin_100:      () => s.stats.totalCoinsEarned >= 100,
      completionist: () => Object.keys(s.totalVisits).length >= 27,
      grand_master:  () => CLEAR_ZONES.every(z => s.zoneCompleted[z]),
      coin_500:      () => s.stats.totalCoinsEarned >= 500,
      marathon:      () => this._sessionVisited.size >= 10,
      perfectionist: () => this._sessionCleared.size >= 4,
      stargazer:     () => s.zoneCompleted['constellation'],
    };

    for (const badge of BADGE_DEFS) {
      if (owned.has(badge.id)) continue;
      const fn = conditions[badge.id];
      if (fn && fn()) {
        s.badges.push(badge.id);
        this._newBadges.push(badge.id);
      }
    }
    if (this._newBadges.length) this.save();
  }

  /** 弹窗取走新解锁的徽章列表 */
  popNewBadges() {
    const list = [...this._newBadges];
    this._newBadges = [];
    return list;
  }

  /* ── 音乐家成就辅助 ────────────── */
  markMusicListened() {
    this._state.musicListenedAll = true;
    this.save();
    this.checkBadges();
  }

  /* ── 读取 ────────────── */
  getState() { return this._state; }
  getBadgeDefs() { return BADGE_DEFS; }

  /** 特定区域访问次数 */
  getVisitCount(zoneType) { return this._state.totalVisits[zoneType] || 0; }
}

export { BADGE_DEFS, CLEAR_ZONES, CHALLENGE_ZONES };
