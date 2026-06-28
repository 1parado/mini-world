// IntroAnimation.js — "翻开笔记本" 开场动画
// 三阶段：1.翻页展开 2.钢笔勾勒世界轮廓 3.手写字幕逐字显现
// 首次访问播放，localStorage 标记后跳过

const INTRO_KEY = 'intro-played';

/** 三阶段总时长（秒） */
const PHASE1_END = 1.5;
const PHASE2_END = 4.0;
const PHASE3_END = 6.5;

/** 需要保证 Caveat 字体已加载 */
const WAIT_FONTS = ['Caveat'];

// 建筑轮廓线段路径（归一化 0-1，映射到 viewport）
const SKETCH_PATHS = [
  // 笔记本 — 中心大方框
  [[0.35,0.35],[0.65,0.35],[0.65,0.65],[0.35,0.65],[0.35,0.35]],
  // 公告牌 — 左侧小框
  [[0.20,0.30],[0.30,0.30],[0.30,0.50],[0.20,0.50],[0.20,0.30]],
  // 书架 — 右侧
  [[0.70,0.25],[0.80,0.25],[0.80,0.50],[0.70,0.50],[0.70,0.25]],
  // 咖啡角 — 左下
  [[0.22,0.70],[0.32,0.70],[0.32,0.85],[0.22,0.85],[0.22,0.70]],
  // 路灯竖线 — 3根
  [[0.55,0.55],[0.55,0.45]],
  [[0.15,0.60],[0.15,0.50]],
  [[0.85,0.35],[0.85,0.25]],
  // 小山丘
  [[0.10,0.90],[0.30,0.75],[0.50,0.88],[0.70,0.72],[0.90,0.90]],
];

const WELCOME_TEXT = '欢迎来到 Paradox 的 mini world';

/**
 * 播放开场动画
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @returns {Promise<'completed'|'skipped'>}
 */
export function playIntroAnimation(canvas, ctx) {
  return new Promise((resolve) => {
    // 如果已播放过则跳过
    if (localStorage.getItem(INTRO_KEY) === '1') {
      resolve('skipped');
      return;
    }

    let introStart = null;
    let resolved = false;
    let charIndex = 0;
    let lastCharTime = 0;

    const w = canvas.width;
    const h = canvas.height;

    /** 跳过动画 */
    function skip() {
      if (resolved) return;
      resolved = true;
      localStorage.setItem(INTRO_KEY, '1');
      // 清理事件
      window.removeEventListener('keydown', skip);
      canvas.removeEventListener('click', skip);
      canvas.removeEventListener('touchstart', skip);
      resolve('skipped');
    }

    // 任意交互跳过
    window.addEventListener('keydown', skip, { once: false });
    canvas.addEventListener('click', skip, { once: false });
    canvas.addEventListener('touchstart', skip, { once: false });

    function frame(ts) {
      if (resolved) return;
      if (!introStart) introStart = ts;
      const elapsed = (ts - introStart) / 1000;

      ctx.clearRect(0, 0, w, h);

      // 底色：白纸
      ctx.fillStyle = '#FAF5E8';
      ctx.fillRect(0, 0, w, h);

      if (elapsed < PHASE1_END) {
        // ── Phase 1: 翻开笔记本 ──
        const p1 = Math.min(1, elapsed / PHASE1_END);
        const ease = 1 - Math.pow(1 - p1, 3); // ease-out cubic

        // 纸面从中心展开（上下裁剪）
        const openH = h * ease;
        const clipTop = (h - openH) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, clipTop, w, openH);
        ctx.clip();

        // 纸张纹理线条
        ctx.strokeStyle = 'rgba(44,44,58,0.04)';
        ctx.lineWidth = 0.8;
        for (let ly = 45; ly < h; ly += 38) {
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.lineTo(w, ly);
          ctx.stroke();
        }
        // 红色页边线
        ctx.strokeStyle = 'rgba(234,84,85,0.06)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(65, 0); ctx.lineTo(65, h); ctx.stroke();

        ctx.restore();

        // 翻页弧线动画
        if (p1 < 0.8) {
          const pageAngle = (1 - p1 / 0.8) * Math.PI * 0.5;
          const pageW = w * 0.4 * (1 - p1 / 0.8);
          ctx.save();
          ctx.translate(w * 0.5, 0);
          ctx.globalAlpha = 0.15 * (1 - p1 / 0.8);
          ctx.fillStyle = '#D4C4A8';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(pageW * 0.5, h * 0.3, pageW * 0.8, h * 0.7);
          ctx.lineTo(pageW * 0.3, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      if (elapsed >= PHASE1_END * 0.6 && elapsed < PHASE2_END) {
        // ── Phase 2: 钢笔画世界轮廓 ──
        const p2raw = (elapsed - PHASE1_END * 0.6) / (PHASE2_END - PHASE1_END * 0.6);
        const p2 = Math.min(1, p2raw);

        ctx.strokeStyle = 'rgba(44,44,58,0.35)';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const totalPaths = SKETCH_PATHS.length;
        const progressPerPath = 1 / totalPaths;

        for (let pi = 0; pi < totalPaths; pi++) {
          const pathStart = pi * progressPerPath;
          const pathProgress = Math.max(0, Math.min(1, (p2 - pathStart) / progressPerPath));
          if (pathProgress <= 0) continue;

          const path = SKETCH_PATHS[pi];
          const totalSegments = path.length - 1;
          const segsToDraw = Math.floor(pathProgress * totalSegments);
          const lastSegFrac = (pathProgress * totalSegments) - segsToDraw;

          ctx.beginPath();
          ctx.moveTo(path[0][0] * w, path[0][1] * h);
          for (let s = 0; s < segsToDraw && s < totalSegments; s++) {
            ctx.lineTo(path[s + 1][0] * w, path[s + 1][1] * h);
          }
          // 部分段（动画插值）
          if (segsToDraw < totalSegments && lastSegFrac > 0) {
            const from = path[segsToDraw];
            const to = path[segsToDraw + 1];
            const ix = from[0] + (to[0] - from[0]) * lastSegFrac;
            const iy = from[1] + (to[1] - from[1]) * lastSegFrac;
            ctx.lineTo(ix * w, iy * h);
          }
          ctx.stroke();
        }

        // 小笔尖图标（跟随绘制末端）
        if (p2 < 1) {
          const currentPathIdx = Math.min(Math.floor(p2 * totalPaths), totalPaths - 1);
          const cp = SKETCH_PATHS[currentPathIdx];
          const localP = Math.min(1, (p2 - currentPathIdx / totalPaths) / (1 / totalPaths));
          const segIdx = Math.min(Math.floor(localP * (cp.length - 1)), cp.length - 2);
          const segFrac = localP * (cp.length - 1) - segIdx;
          const px = (cp[segIdx][0] + (cp[segIdx + 1][0] - cp[segIdx][0]) * segFrac) * w;
          const py = (cp[segIdx][1] + (cp[segIdx + 1][1] - cp[segIdx][1]) * segFrac) * h;

          ctx.fillStyle = 'rgba(44,44,58,0.5)';
          ctx.beginPath();
          ctx.moveTo(px + 8, py - 4);
          ctx.lineTo(px, py);
          ctx.lineTo(px - 2, py + 2);
          ctx.closePath();
          ctx.fill();
        }
      }

      if (elapsed >= PHASE2_END) {
        // ── Phase 3: 手写字幕逐字显现 ──
        const p3 = Math.min(1, (elapsed - PHASE2_END) / (PHASE3_END - PHASE2_END));
        const targetChars = Math.floor(p3 * WELCOME_TEXT.length);

        // 同时保持 Phase 2 的线条（淡入淡出）
        const fadeAlpha = p3 < 0.3 ? 0.35 * (1 - p3 / 0.3) + 0.05 : 0.05;
        ctx.strokeStyle = `rgba(44,44,58,${fadeAlpha})`;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        for (const path of SKETCH_PATHS) {
          ctx.beginPath();
          ctx.moveTo(path[0][0] * w, path[0][1] * h);
          for (let s = 1; s < path.length; s++) {
            ctx.lineTo(path[s][0] * w, path[s][1] * h);
          }
          ctx.stroke();
        }

        // 逐字显现
        if (targetChars > charIndex) {
          charIndex = targetChars;
          lastCharTime = elapsed;
        }
        const displayText = WELCOME_TEXT.substring(0, charIndex);
        ctx.font = 'bold 36px Caveat, cursive';
        ctx.fillStyle = '#2C2C3A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayText, w / 2, h * 0.5);

        // 打字光标
        if (charIndex < WELCOME_TEXT.length) {
          const textW = ctx.measureText(displayText).width;
          const cursorX = w / 2 + textW / 2 + 3;
          if (Math.sin(elapsed * 6) > 0) {
            ctx.fillRect(cursorX, h * 0.5 - 16, 2, 32);
          }
        }

        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }

      // 动画完成
      if (elapsed >= PHASE3_END) {
        resolved = true;
        localStorage.setItem(INTRO_KEY, '1');
        window.removeEventListener('keydown', skip);
        canvas.removeEventListener('click', skip);
        canvas.removeEventListener('touchstart', skip);
        resolve('completed');
        return;
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
}

/** 检查是否需要播放开场动画 */
export function shouldPlayIntro() {
  return localStorage.getItem(INTRO_KEY) !== '1';
}
