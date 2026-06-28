// searchOverlay.js — 🔍 搜索台
import { getCtx } from '../overlays/OverlayContext.js';

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
  { type: 'diy',          emoji: '🎨', label: '手工坊',       desc: '购买装饰物放入背包自由放置', x: 3200, y: 2800 },
  { type: 'backpack',     emoji: '🎒', label: '背包容器',     desc: '查看背包中的装饰物',     x: 2000, y: 2000 },
];

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('search-overlay', 'search-close');
  document.getElementById('search-overlay').classList.add('visible');

  const input = document.getElementById('search-input');
  renderSearchResults('');

  input.oninput = () => {
    renderSearchResults(input.value.trim().toLowerCase());
  };

  setTimeout(() => { input.value = ''; input.focus(); }, 50);
}

export function hide() {
  document.getElementById('search-overlay')?.classList.remove('visible');
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

function teleportToZone(zone) {
  const { setMode, gameWorld, audio, showNotification, WORLD_W, WORLD_H } = getCtx();
  document.getElementById('search-overlay').classList.remove('visible');
  setMode('explore');

  const targetX = zone.x;
  const targetY = zone.y + 30;

  gameWorld.player.x = targetX;
  gameWorld.player.y = targetY;
  gameWorld.player.targetX = targetX;
  gameWorld.player.targetY = targetY;
  gameWorld.player.navigating = false;

  gameWorld.cameraX = Math.max(0, Math.min(WORLD_W - gameWorld.viewportW, targetX - gameWorld.viewportW / 2));
  gameWorld.cameraY = Math.max(0, Math.min(WORLD_H - gameWorld.viewportH, targetY - gameWorld.viewportH / 2));

  audio.playSFX('teleport');
  showNotification(`✨ 已传送到「${zone.emoji} ${zone.label}」`);
}
