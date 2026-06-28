// GameWorld — 2D手绘世界引擎
// 管理地图、区域、装饰物、玩家、相机、粒子效果与渲染

import { Player } from './Player.js';
import { NotebookZone } from './zones/NotebookZone.js';
import { BoardZone } from './zones/BoardZone.js';
import { ShelfZone } from './zones/ShelfZone.js';
import { CoffeeZone } from './zones/CoffeeZone.js';
import { AlbumZone } from './zones/AlbumZone.js';
import { MailboxZone } from './zones/MailboxZone.js';
import { GraffitiZone } from './zones/GraffitiZone.js';
import { DartZone } from './zones/DartZone.js';
import { DiceZone } from './zones/DiceZone.js';
import { CardZone } from './zones/CardZone.js';
import { SpinZone } from './zones/SpinZone.js';
import { MusicZone } from './zones/MusicZone.js';
// 新增13个交互区域
import { MazeZone } from './zones/MazeZone.js';
import { PuzzleZone } from './zones/PuzzleZone.js';
import { KlotskiZone } from './zones/KlotskiZone.js';
import { SudokuZone } from './zones/SudokuZone.js';
import { WishZone } from './zones/WishZone.js';
import { MagicZone } from './zones/MagicZone.js';
import { ConstellationZone } from './zones/ConstellationZone.js';
import { HourglassZone } from './zones/HourglassZone.js';
import { KaleidoscopeZone } from './zones/KaleidoscopeZone.js';
import { DiaryZone } from './zones/DiaryZone.js';
import { WeatherZone } from './zones/WeatherZone.js';
import { CookingZone } from './zones/CookingZone.js';
import { MapZone } from './zones/MapZone.js';
import { ChatZone } from './zones/ChatZone.js';
import { SearchZone } from './zones/SearchZone.js';
import { SharpenerZone } from './zones/SharpenerZone.js';
import { InkwellZone } from './zones/InkwellZone.js';
import { OrigamiZone } from './zones/OrigamiZone.js';
import { StickerZone } from './zones/StickerZone.js';
import { AbacusZone } from './zones/AbacusZone.js';
import { CapsuleZone } from './zones/CapsuleZone.js';
import {
  WORLD_W, WORLD_H, ensureBackground,
  drawNotebook, drawBulletinBoard, drawBookshelf,
  drawCoffeeCorner, drawAlbum, drawMailbox, drawGraffitiWall,
  drawDartBoard, drawDiceTable, drawCardTable, drawSpinWheel, drawMusicBox,
  drawMazeGarden, drawPuzzleTable, drawKlotskiBoard, drawSudokuCorner,
  drawWishPond, drawMagicCircle, drawConstellation, drawHourglass,
  drawKaleidoscope, drawDiary, drawWeatherStation, drawCookingTable, drawMapWall,
  drawAIDesk, drawSearchDesk,
  drawSharpener, drawInkwell, drawOrigamiTable, drawStickerAlbum, drawAbacus, drawTimeCapsule,
  drawCoffeeCup, drawPlant, drawCat, drawPencil, drawPictureFrame,
  drawMushroom, drawFlowers, drawLamp, drawPaperPlane, drawButterfly,
  drawFootprints, drawRock, drawGrassTuft,
  drawPromptBubble, drawPlayer, drawZoneLabel,
  spawnDust, spawnClickRipple, updateEffects, drawEffects,
} from './WorldRenderer.js';

export class GameWorld {
  constructor(onZoneInteract) {
    this.onZoneInteract = onZoneInteract;
    this.player = new Player(WORLD_W / 2, WORLD_H - 200);
    this.zones = [];
    this.decorations = [];
    this.cameraX = 0;
    this.cameraY = 0;
    this.viewportW = 0;
    this.viewportH = 0;
    this.activeNearZone = null;
    this._prevWalking = false;

    this.buildWorld();
  }

  buildWorld() {
    // === 原始交互区域（坐标按比例适配 4000×3000） ===
    const notebook = new NotebookZone(WORLD_W / 2, WORLD_H / 2 + 120);
    const board = new BoardZone(WORLD_W / 2 - 380, WORLD_H / 2 - 50);
    const shelf = new ShelfZone(WORLD_W / 2 + 420, WORLD_H / 2 - 200);
    const coffee = new CoffeeZone(WORLD_W / 2 - 450, WORLD_H / 2 + 350);
    const album = new AlbumZone(WORLD_W / 2 + 500, WORLD_H / 2 - 400);
    const mailbox = new MailboxZone(WORLD_W / 2 + 600, WORLD_H / 2 + 200);
    const graffiti = new GraffitiZone(WORLD_W / 2 - 500, WORLD_H / 2 - 350);
    const dart = new DartZone(900, 2500);
    const dice = new DiceZone(3200, 1100);
    const card = new CardZone(2000, 550);
    const spin = new SpinZone(3400, 2300);
    const music = new MusicZone(550, 800);

    // === 新增13个交互区域 ===
    const maze = new MazeZone(800, 600);
    const puzzle = new PuzzleZone(2000, 500);
    const klotski = new KlotskiZone(3200, 600);
    const sudoku = new SudokuZone(3500, 1400);
    const wish = new WishZone(500, 1500);
    const magic = new MagicZone(1800, 1600);
    const constellation = new ConstellationZone(3200, 2100);
    const hourglass = new HourglassZone(800, 2400);
    const kaleidoscope = new KaleidoscopeZone(1800, 2600);
    const diary = new DiaryZone(600, 2000);
    const weather = new WeatherZone(2800, 1600);
    const cooking = new CookingZone(3000, 2500);
    const mapZone = new MapZone(2000, 2800);
    const chat = new ChatZone(2600, 400);
    const search = new SearchZone(1400, 1000);

    // === 新增6个交互区域 ===
    const sharpener = new SharpenerZone(1200, 2500);
    const inkwell = new InkwellZone(300, 1100);
    const origami = new OrigamiZone(3700, 1800);
    const sticker = new StickerZone(600, 2700);
    const abacus = new AbacusZone(3400, 400);
    const capsule = new CapsuleZone(1500, 2800);

    this.zones = [
      notebook, board, shelf, coffee, album, mailbox, graffiti,
      dart, dice, card, spin, music,
      maze, puzzle, klotski, sudoku, wish, magic, constellation,
      hourglass, kaleidoscope, diary, weather, cooking, mapZone,
      chat, search,
      sharpener, inkwell, origami, sticker, abacus, capsule,
    ];

    // === 绑定交互回调 ===
    notebook.onInteract = () => this.onZoneInteract('notebook');
    board.onInteract = () => this.onZoneInteract('board');
    shelf.onInteract = () => this.onZoneInteract('shelf');
    coffee.onInteract = () => this.onZoneInteract('coffee');
    album.onInteract = () => this.onZoneInteract('album');
    mailbox.onInteract = () => this.onZoneInteract('mailbox');
    graffiti.onInteract = () => this.onZoneInteract('graffiti');
    dart.onInteract = () => this.onZoneInteract('dart');
    dice.onInteract = () => this.onZoneInteract('dice');
    card.onInteract = () => this.onZoneInteract('card');
    spin.onInteract = () => this.onZoneInteract('spin');
    music.onInteract = () => this.onZoneInteract('music');
    maze.onInteract = () => this.onZoneInteract('maze');
    puzzle.onInteract = () => this.onZoneInteract('puzzle');
    klotski.onInteract = () => this.onZoneInteract('klotski');
    sudoku.onInteract = () => this.onZoneInteract('sudoku');
    wish.onInteract = () => this.onZoneInteract('wish');
    magic.onInteract = () => this.onZoneInteract('magic');
    constellation.onInteract = () => this.onZoneInteract('constellation');
    hourglass.onInteract = () => this.onZoneInteract('hourglass');
    kaleidoscope.onInteract = () => this.onZoneInteract('kaleidoscope');
    diary.onInteract = () => this.onZoneInteract('diary');
    weather.onInteract = () => this.onZoneInteract('weather');
    cooking.onInteract = () => this.onZoneInteract('cooking');
    mapZone.onInteract = () => this.onZoneInteract('map');
    chat.onInteract = () => this.onZoneInteract('chat');
    search.onInteract = () => this.onZoneInteract('search');
    sharpener.onInteract = () => this.onZoneInteract('sharpener');
    inkwell.onInteract = () => this.onZoneInteract('inkwell');
    origami.onInteract = () => this.onZoneInteract('origami');
    sticker.onInteract = () => this.onZoneInteract('sticker');
    abacus.onInteract = () => this.onZoneInteract('abacus');
    capsule.onInteract = () => this.onZoneInteract('capsule');

    board.addMessage('欢迎！');
    board.addMessage('手绘笔记本');
    board.addMessage('靠近场景互动');

    mailbox.addMessage('你好，欢迎来到手绘世界！ ✨');
    mailbox.addMessage('每一笔都是独特的痕迹');
    mailbox.addMessage('祝你创作愉快 🎨');

    this.decorations = [
      { type: 'coffee', x: WORLD_W / 2 - 160, y: WORLD_H / 2 - 20 },
      { type: 'plant',  x: WORLD_W / 2 + 240, y: WORLD_H / 2 + 40 },
      { type: 'cat',    x: WORLD_W / 2 + 180, y: WORLD_H / 2 + 130 },
      { type: 'pencil', x: WORLD_W / 2 - 240, y: WORLD_H / 2 + 70, angle: -0.3 },
      { type: 'pencil', x: WORLD_W / 2 - 200, y: WORLD_H / 2 + 90, angle: 0.2 },
      { type: 'frame',  x: WORLD_W / 2 - 440, y: WORLD_H / 2 - 220 },
      { type: 'plant',  x: WORLD_W / 2 + 440, y: WORLD_H / 2 - 30 },
      { type: 'coffee', x: WORLD_W / 2 + 80, y: WORLD_H / 2 - 180 },
      { type: 'cat',    x: WORLD_W / 2 - 80, y: WORLD_H / 2 + 260 },
      { type: 'frame',  x: WORLD_W / 2 + 320, y: WORLD_H / 2 - 280 },
      { type: 'plant',  x: WORLD_W / 2 - 400, y: WORLD_H / 2 + 400 },
      { type: 'frame',  x: WORLD_W / 2 + 550, y: WORLD_H / 2 - 500 },
      { type: 'cat',    x: WORLD_W / 2 - 550, y: WORLD_H / 2 - 250 },
      { type: 'coffee', x: WORLD_W / 2 + 680, y: WORLD_H / 2 + 100 },
      // 游戏区域附近装饰
      { type: 'pencil', x: 820, y: 540, angle: 0.4 },
      { type: 'plant',  x: 1920, y: 440 },
      { type: 'frame',  x: 3120, y: 530 },
      { type: 'pencil', x: 3430, y: 1340, angle: -0.2 },
      { type: 'plant',  x: 420, y: 1440 },
      { type: 'cat',    x: 1720, y: 1530 },
      { type: 'coffee', x: 3120, y: 2030 },
      { type: 'pencil', x: 730, y: 2330, angle: 0.5 },
      { type: 'frame',  x: 1730, y: 2530 },
      { type: 'plant',  x: 520, y: 1940 },
      { type: 'coffee', x: 2720, y: 1540 },
      { type: 'cat',    x: 2920, y: 2440 },
      { type: 'frame',  x: 1920, y: 2740 },
      // 原有游戏区域装饰
      { type: 'pencil', x: 830, y: 2420, angle: 0.4 },
      { type: 'frame',  x: 3100, y: 1030 },
      { type: 'plant',  x: 1950, y: 490 },
      { type: 'cat',    x: 3550, y: 2220 },
      { type: 'frame',  x: 450, y: 740 },
      // 新增丰富装饰物：蘑菇、花丛、路灯、纸飞机、蝴蝶、脚印、石头、草丛
      { type: 'mushroom',  x: 680, y: 560 },
      { type: 'mushroom',  x: 2950, y: 2550 },
      { type: 'mushroom',  x: 1650, y: 1650 },
      { type: 'flowers',   x: 920, y: 660 },
      { type: 'flowers',   x: 2720, y: 1680 },
      { type: 'flowers',   x: 540, y: 2050 },
      { type: 'flowers',   x: 3350, y: 2000 },
      { type: 'lamp',      x: 1400, y: 1050 },
      { type: 'lamp',      x: 2600, y: 450 },
      { type: 'lamp',      x: 2000, y: 2650 },
      { type: 'paperplane',x: 1100, y: 500, angle: 0.2 },
      { type: 'paperplane',x: 3000, y: 900, angle: -0.3 },
      { type: 'paperplane',x: 2300, y: 2300, angle: 0.4 },
      { type: 'butterfly', x: 720, y: 800 },
      { type: 'butterfly', x: 2200, y: 600 },
      { type: 'butterfly', x: 1600, y: 2700 },
      { type: 'footprints',x: 1050, y: 2450 },
      { type: 'footprints',x: 2250, y: 1100 },
      { type: 'rock',      x: 380, y: 1300 },
      { type: 'rock',      x: 3650, y: 600 },
      { type: 'rock',      x: 1200, y: 2600 },
      { type: 'grass',     x: 480, y: 900 },
      { type: 'grass',     x: 1900, y: 1200 },
      { type: 'grass',     x: 3300, y: 1650 },
      { type: 'grass',     x: 950, y: 2100 },
      { type: 'grass',     x: 2800, y: 2800 },
    ];

    ensureBackground();
  }

  resize(w, h) {
    this.viewportW = w;
    this.viewportH = h;
  }

  update(delta, input) {
    if (this.viewportW === 0 || this.viewportH === 0) return;

    this.player.update(delta, input);

    // 走路扬尘
    if (this.player.isMoving) {
      if (Math.random() < 0.3) {
        spawnDust(this.player.x + (Math.random() - 0.5) * 10, this.player.y);
      }
    }

    // 更新粒子效果
    updateEffects(delta);

    // 区域靠近检测
    this.activeNearZone = null;
    for (const zone of this.zones) {
      zone.update(this.player);
      if (zone.playerNear) {
        this.activeNearZone = zone;
      }
    }

    // 相机：平滑跟随
    const targetCX = this.player.x - this.viewportW / 2;
    const targetCY = this.player.y - this.viewportH / 2;
    const t = 1 - Math.exp(-8 * delta);
    this.cameraX += (targetCX - this.cameraX) * t;
    this.cameraY += (targetCY - this.cameraY) * t;

    const maxCamX = Math.max(0, WORLD_W - this.viewportW);
    const maxCamY = Math.max(0, WORLD_H - this.viewportH);
    this.cameraX = Math.max(0, Math.min(maxCamX, this.cameraX));
    this.cameraY = Math.max(0, Math.min(maxCamY, this.cameraY));

    // 处理 F 键交互
    if (input.interact && this.activeNearZone) {
      if (this.activeNearZone.onInteract) {
        this.activeNearZone.onInteract();
      }
    }
  }

  render(ctx, time, bgAlpha = 1.0) {
    ctx.save();

    // 相机变换
    ctx.translate(-Math.round(this.cameraX), -Math.round(this.cameraY));

    // 1. 背景（支持半透明以让3D桌面穿透）
    const bg = ensureBackground(bgAlpha);
    ctx.drawImage(bg, 0, 0);

    // 2. 装饰物
    for (const d of this.decorations) {
      switch (d.type) {
        case 'coffee': drawCoffeeCup(ctx, d.x, d.y, time); break;
        case 'plant':  drawPlant(ctx, d.x, d.y, time); break;
        case 'cat':    drawCat(ctx, d.x, d.y, time); break;
        case 'pencil': drawPencil(ctx, d.x, d.y, d.angle); break;
        case 'frame':  drawPictureFrame(ctx, d.x, d.y, time); break;
        case 'mushroom':  drawMushroom(ctx, d.x, d.y, time); break;
        case 'flowers':   drawFlowers(ctx, d.x, d.y, time); break;
        case 'lamp':      drawLamp(ctx, d.x, d.y, time); break;
        case 'paperplane':drawPaperPlane(ctx, d.x, d.y, time); break;
        case 'butterfly': drawButterfly(ctx, d.x, d.y, time); break;
        case 'footprints':drawFootprints(ctx, d.x, d.y); break;
        case 'rock':      drawRock(ctx, d.x, d.y); break;
        case 'grass':     drawGrassTuft(ctx, d.x, d.y, time); break;
      }
    }

    // 3. 交互区域
    for (const zone of this.zones) {
      switch (zone.type) {
        case 'notebook':    drawNotebook(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'board':       drawBulletinBoard(ctx, zone.x - zone.w / 2, zone.y - zone.h, time, zone.messages); break;
        case 'shelf':       drawBookshelf(ctx, zone.x - zone.w / 2, zone.y - zone.h, time, 18); break;
        case 'coffee':      drawCoffeeCorner(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'album':        drawAlbum(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'mailbox':     drawMailbox(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'graffiti':    drawGraffitiWall(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'dart':        drawDartBoard(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'dice':        drawDiceTable(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'card':        drawCardTable(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'spin':        drawSpinWheel(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'music':       drawMusicBox(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'maze':        drawMazeGarden(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'puzzle':      drawPuzzleTable(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'klotski':     drawKlotskiBoard(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'sudoku':      drawSudokuCorner(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'wish':        drawWishPond(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'magic':       drawMagicCircle(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'constellation': drawConstellation(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'hourglass':   drawHourglass(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'kaleidoscope': drawKaleidoscope(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'diary':       drawDiary(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'weather':     drawWeatherStation(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'cooking':     drawCookingTable(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'map':         drawMapWall(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'chat':        drawAIDesk(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'search':      drawSearchDesk(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'sharpener':   drawSharpener(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'inkwell':     drawInkwell(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'origami':     drawOrigamiTable(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'sticker':     drawStickerAlbum(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'abacus':      drawAbacus(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
        case 'capsule':     drawTimeCapsule(ctx, zone.x - zone.w / 2, zone.y - zone.h, time); break;
      }
      drawZoneLabel(ctx, zone.x, zone.y + 8, zone.label);

      // 靠近时高亮
      if (zone.playerNear) {
        ctx.strokeStyle = 'rgba(7,123,138,0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(zone.x - zone.w / 2 - 8, zone.y - zone.h - 8, zone.w + 16, zone.h + 16);
        ctx.setLineDash([]);

        // 发光
        ctx.fillStyle = 'rgba(7,123,138,0.03)';
        ctx.fillRect(zone.x - zone.w / 2 - 12, zone.y - zone.h - 12, zone.w + 24, zone.h + 24);
      }
    }

    // 4. 玩家
    drawPlayer(ctx, this.player.x, this.player.y, this.player.direction, this.player.walkFrame, this.activeNearZone !== null, this.player.getAppearance());

    // 5. 交互提示气泡
    if (this.activeNearZone) {
      const pp = this.player.getPromptPosition();
      drawPromptBubble(ctx, pp.x, pp.y, this.activeNearZone.label, this.viewportW, this.viewportH);
    }

    // 6. 粒子效果
    drawEffects(ctx);

    ctx.restore();
  }

  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.cameraX,
      y: screenY + this.cameraY,
    };
  }

  getNearZone() {
    return this.activeNearZone;
  }

  getZoneByType(type) {
    return this.zones.find(z => z.type === type);
  }

  /** 设置玩家外观 */
  setPlayerAppearance(cfg) {
    this.player.appearance = cfg;
  }

  addBoardMessage(text) {
    const board = this.zones.find(z => z.type === 'board');
    if (board) board.addMessage(text);
  }

  addMailboxMessage(text) {
    const mailbox = this.zones.find(z => z.type === 'mailbox');
    if (mailbox) mailbox.addMessage(text);
  }
}
