// EasterEggs.js — 隐藏彩蛋系统
// 三种触发方式：序列 LJL、同时按键组合
// 效果：全屏彩色粒子 / 反转色 / 闪电

import { spawnDust } from '../world/WorldRenderer.js';
import { showNotification } from '../utils/helpers.js';

// 彩蛋序列: LJL（简单易触发）
const KONAMI_SEQUENCE = [
  'KeyL', 'KeyJ', 'KeyL',
];

// 彩蛋粒子（独立于 WorldRenderer 的尘埃系统）
const easterParticles = [];

/** 彩蛋管理器 */
export class EasterEggs {
  constructor() {
    this.keyBuffer = [];
    this.simultaneousKeys = new Set();
    this.triggered = new Set(); // 已触发的彩蛋（防止重复）
    this._pressedKeys = new Set(); // 防止键盘重复填充缓冲区

    // 特效状态
    this.invertActive = false;
    this.invertTimer = 0;
    this.lightningActive = false;
    this.lightningTimer = 0;
    this.lightningBolts = [];
    this.konamiParticlesActive = false;
    this.konamiParticleTimer = 0;
  }

  /** 键盘按下时调用 */
  onKeydown(code) {
    // 忽略键盘按住产生的重复事件
    if (this._pressedKeys.has(code)) return;
    this._pressedKeys.add(code);

    // 更新序列缓冲
    this.keyBuffer.push(code);
    if (this.keyBuffer.length > KONAMI_SEQUENCE.length) {
      this.keyBuffer.shift();
    }

    // 跟踪同时按下的键
    this.simultaneousKeys.add(code);

    // 检测 Konami 序列
    if (!this.triggered.has('konami')) {
      this._checkKonami();
    }

    // 检测同时按键组合
    if (!this.triggered.has('miracle')) {
      this._checkMiracle();
    }
    if (!this.triggered.has('lightning')) {
      this._checkLightning();
    }
  }

  /** 键盘释放时调用 */
  onKeyup(code) {
    this.simultaneousKeys.delete(code);
    this._pressedKeys.delete(code);
  }

  /** 每帧更新彩蛋特效 */
  update(delta) {
    // 反转色倒计时
    if (this.invertActive) {
      this.invertTimer -= delta;
      if (this.invertTimer <= 0) {
        this.invertActive = false;
        this.triggered.delete('miracle');
      }
    }

    // 闪电倒计时
    if (this.lightningActive) {
      this.lightningTimer -= delta;
      if (this.lightningTimer <= 0) {
        this.lightningActive = false;
        this.lightningBolts = [];
        this.triggered.delete('lightning');
      }
    }

    // 彩蛋粒子更新
    for (let i = easterParticles.length - 1; i >= 0; i--) {
      const p = easterParticles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += 180 * delta; // 重力
      p.life -= delta;
      if (p.life <= 0) easterParticles.splice(i, 1);
    }

    if (this.konamiParticlesActive) {
      this.konamiParticleTimer -= delta;
      if (this.konamiParticleTimer <= 0) {
        this.konamiParticlesActive = false;
        this.triggered.delete('konami');
      }
    }
  }

  /** 绘制彩蛋特效（在主渲染之上） */
  draw(ctx, canvasW, canvasH) {
    // 彩蛋粒子
    for (const p of easterParticles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color.replace('1)', `${a})`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }

    // 反转色滤镜
    if (this.invertActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.restore();
    }

    // 闪电
    if (this.lightningActive) {
      for (const bolt of this.lightningBolts) {
        const elapsed = this.lightningTimer;
        const boltAlpha = Math.max(0, Math.min(1, (bolt.ttl - elapsed + 0.1) / 0.3));
        if (boltAlpha <= 0) continue;

        // 白色闪光
        if (bolt.flashAlpha > 0) {
          ctx.fillStyle = `rgba(255,255,255,${bolt.flashAlpha * boltAlpha * 0.3})`;
          ctx.fillRect(0, 0, canvasW, canvasH);
        }

        // 闪电线
        ctx.strokeStyle = `rgba(255,255,220,${boltAlpha * 0.9})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(200,200,255,0.8)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        let bx = bolt.x, by = 0;
        ctx.moveTo(bx, by);
        for (const seg of bolt.segments) {
          bx += seg.dx;
          by += seg.dy;
          ctx.lineTo(bx, by);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  // ── 检测逻辑 ──

  _checkKonami() {
    if (this.keyBuffer.length < KONAMI_SEQUENCE.length) return;
    for (let i = 0; i < KONAMI_SEQUENCE.length; i++) {
      if (this.keyBuffer[i] !== KONAMI_SEQUENCE[i]) return;
    }
    this.triggered.add('konami');
    this._triggerKonami();
  }

  _checkMiracle() {
    if (this.simultaneousKeys.has('KeyM') &&
        this.simultaneousKeys.has('KeyI') &&
        this.simultaneousKeys.has('KeyR')) {
      this.triggered.add('miracle');
      this._triggerMiracle();
    }
  }

  _checkLightning() {
    if (this.simultaneousKeys.has('KeyQ') &&
        this.simultaneousKeys.has('KeyL')) {
      this.triggered.add('lightning');
      this._triggerLightning();
    }
  }

  // ── 效果触发 ──

  _triggerKonami() {
    this.konamiParticlesActive = true;
    this.konamiParticleTimer = 3;
    // 生成彩色粒子爆发
    const colors = [
      'rgba(234,84,85,1)', 'rgba(255,152,0,1)', 'rgba(255,213,79,1)',
      'rgba(76,175,80,1)', 'rgba(33,150,243,1)', 'rgba(156,39,176,1)',
    ];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 300;
      easterParticles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
        y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 200,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5,
        life: 1.5 + Math.random() * 1.5,
        maxLife: 3,
      });
    }
    showNotification('🎉 你发现了 Konami 彩蛋！+50 🪙');
  }

  _triggerMiracle() {
    this.invertActive = true;
    this.invertTimer = 2;
    showNotification('✨ 奇迹发生了！世界短暂反转~');
  }

  _triggerLightning() {
    this.lightningActive = true;
    this.lightningTimer = 1.5;

    const canvasW = window.innerWidth;
    // 生成2-3条闪电
    const count = 2 + Math.floor(Math.random() * 2);
    this.lightningBolts = [];
    for (let i = 0; i < count; i++) {
      const bolt = {
        x: Math.random() * canvasW,
        segments: [],
        ttl: 0.3 + Math.random() * 0.5,
        flashAlpha: 0.6 + Math.random() * 0.4,
      };
      let by = 0;
      while (by < window.innerHeight) {
        const dx = (Math.random() - 0.5) * 60;
        const dy = 30 + Math.random() * 50;
        bolt.segments.push({ dx, dy });
        by += dy;
      }
      this.lightningBolts.push(bolt);
    }

    // 窗体抖动
    const shakeEl = document.getElementById('game-canvas');
    if (shakeEl) {
      const origTransform = shakeEl.style.transform;
      let shakeCount = 0;
      const shakeInterval = setInterval(() => {
        shakeEl.style.transform = `translate(${(Math.random()-0.5)*8}px, ${(Math.random()-0.5)*8}px)`;
        shakeCount++;
        if (shakeCount > 10) {
          clearInterval(shakeInterval);
          shakeEl.style.transform = origTransform || '';
        }
      }, 50);
    }

    showNotification('⚡ 闪电降临！');
  }

  /** 外部检查是否需要额外渲染层 */
  hasActiveEffects() {
    return this.konamiParticlesActive || this.invertActive || this.lightningActive;
  }

  /** Konami 彩蛋是否已触发（用于外部奖励） */
  isKonamiTriggered() {
    return this.triggered.has('konami') && easterParticles.length > 0;
  }
}
