// SketchRenderer — hand-drawn line rendering utilities
// Shared rendering functions for pencil-sketch style lines and text

export const SKETCH_COLORS = {
  pencil: 0x1a1a2e,
  blue: 0x2d4059,
  red: 0xea5455,
  teal: 0x077b8a,
  purple: 0x5b2c6f,
  brown: 0x8b6914,
  navy: 0x1a5276,
  black: 0x111111,
};

export const INK_PALETTE = [0x1a1a2e, 0x2d4059, 0xea5455, 0x077b8a, 0x5b2c6f, 0x8b6914];

// Convert hex number to CSS string
export function hexToCSS(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

// Draw a hand-drawn line segment on a Canvas2D context
export function sketchLine(ctx, x1, y1, x2, y2, opts = {}) {
  const {
    color = '#1a1a2e',
    width = 1.5,
    jitter = 1.0,
    passes = 3,
    opacity = 0.8,
  } = opts;

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let p = 0; p < passes; p++) {
    ctx.globalAlpha = opacity / passes + (Math.random() - 0.5) * 0.1;
    ctx.beginPath();
    const ox = (Math.random() - 0.5) * jitter * 0.5;
    const oy = (Math.random() - 0.5) * jitter * 0.5;
    ctx.moveTo(x1 + ox, y1 + oy);
    // Add a slight control point wobble for natural curve
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * jitter;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * jitter;
    ctx.quadraticCurveTo(mx, my, x2 + ox, y2 + oy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Draw a hand-drawn polyline (series of points)
export function sketchPolyline(ctx, points, opts = {}) {
  if (points.length < 2) return;
  const {
    color = '#1a1a2e',
    width = 1.5,
    jitter = 0.8,
    passes = 3,
    opacity = 0.75,
  } = opts;

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let p = 0; p < passes; p++) {
    ctx.globalAlpha = opacity / passes + (Math.random() - 0.5) * 0.08;
    ctx.beginPath();
    ctx.moveTo(
      points[0].x + (Math.random() - 0.5) * jitter,
      points[0].y + (Math.random() - 0.5) * jitter
    );
    for (let i = 1; i < points.length; i++) {
      const offX = (Math.random() - 0.5) * jitter * (p === 0 ? 0.5 : 1.0);
      const offY = (Math.random() - 0.5) * jitter * (p === 0 ? 0.5 : 1.0);
      ctx.lineTo(points[i].x + offX, points[i].y + offY);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Draw hand-drawn text at a position
export function sketchText(ctx, text, x, y, opts = {}) {
  const {
    color = '#1a1a2e',
    fontSize = 20,
    fontFamily = 'Courier New, monospace',
    jitter = 2,
    passes = 3,
  } = opts;

  const font = 'bold ' + fontSize + 'px ' + fontFamily;
  for (let p = 0; p < passes; p++) {
    const ox = (Math.random() - 0.5) * jitter;
    const oy = (Math.random() - 0.5) * jitter;
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 0.4 + Math.random() * 0.3;
    ctx.fillStyle = color;
    ctx.fillText(text, x + ox, y + oy);
  }
  // Outline pass for crispness
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.font = font;
  ctx.strokeText(text, x + (Math.random() - 0.5) * 1, y + (Math.random() - 0.5) * 1);
  ctx.globalAlpha = 1;
}

// Draw a hand-drawn circle/ellipse
export function sketchCircle(ctx, cx, cy, r, opts = {}) {
  const { color = '#1a1a2e', width = 1.5, jitter = 1.5 } = opts;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const jr = r + (Math.random() - 0.5) * jitter;
    const px = cx + Math.cos(angle) * jr;
    const py = cy + Math.sin(angle) * jr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

// Draw a hand-drawn rectangle
export function sketchRect(ctx, x, y, w, h, opts = {}) {
  const { color = '#1a1a2e', width = 1.5, jitter = 1.0 } = opts;
  const pts = [
    [x + rr(jitter), y + rr(jitter)],
    [x + w * 0.5 + rr(jitter), y + rr(jitter)],
    [x + w + rr(jitter), y + rr(jitter)],
    [x + w + rr(jitter), y + h * 0.5 + rr(jitter)],
    [x + w + rr(jitter), y + h + rr(jitter)],
    [x + w * 0.5 + rr(jitter), y + h + rr(jitter)],
    [x + rr(jitter), y + h + rr(jitter)],
    [x + rr(jitter), y + h * 0.5 + rr(jitter)],
    [x + rr(jitter), y + rr(jitter)],
  ];
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.stroke();
}

// Draw a highlighter stroke (wide, semi-transparent)
export function highlighterStroke(ctx, points, opts = {}) {
  if (points.length < 2) return;
  const {
    color = '#077b8a',
    width = 16,
    opacity = 0.25,
  } = opts;

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Draw a sticker (pre-made hand-drawn doodle)
export const STICKER_TYPES = [
  'star', 'heart', 'arrow', 'check', 'circle', 'diamond',
  'lightning', 'smile', 'exclaim', 'question'
];

export function drawSticker(ctx, type, cx, cy, size = 28, opts = {}) {
  const { color = '#1a1a2e', jitter = 1.5 } = opts;
  const r = size / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  switch (type) {
    case 'star':
      for (let i = 0; i < 5; i++) {
        const a1 = (i * 4 * Math.PI / 5) - Math.PI / 2;
        const a2 = ((i + 2) * 4 * Math.PI / 5) - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * r + rr(jitter), cy + Math.sin(a1) * r + rr(jitter));
        ctx.lineTo(cx + Math.cos(a2) * r + rr(jitter), cy + Math.sin(a2) * r + rr(jitter));
        ctx.stroke();
      }
      break;
    case 'heart':
      ctx.beginPath();
      for (let t = 0; t <= Math.PI * 2; t += 0.1) {
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
        const scale = r / 18;
        const px = cx + hx * scale + rr(jitter * 0.5);
        const py = cy + hy * scale + rr(jitter * 0.5);
        if (t < 0.1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    case 'arrow':
      ctx.beginPath();
      ctx.moveTo(cx - r, cy + rr(jitter));
      ctx.lineTo(cx + r * 0.6 + rr(jitter), cy + rr(jitter));
      ctx.lineTo(cx + r * 0.3 + rr(jitter), cy - r * 0.5 + rr(jitter));
      ctx.moveTo(cx + r * 0.6 + rr(jitter), cy + rr(jitter));
      ctx.lineTo(cx + r * 0.3 + rr(jitter), cy + r * 0.5 + rr(jitter));
      ctx.stroke();
      break;
    case 'check':
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.4 + rr(jitter), cy + rr(jitter));
      ctx.lineTo(cx - r * 0.1 + rr(jitter), cy + r * 0.4 + rr(jitter));
      ctx.lineTo(cx + r * 0.5 + rr(jitter), cy - r * 0.4 + rr(jitter));
      ctx.stroke();
      break;
    case 'exclaim':
      ctx.beginPath();
      ctx.moveTo(cx + rr(jitter), cy - r * 0.5);
      ctx.lineTo(cx + rr(jitter), cy + r * 0.2);
      ctx.moveTo(cx, cy + r * 0.55);
      ctx.lineTo(cx + 1, cy + r * 0.55);
      ctx.stroke();
      break;
    case 'question':
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.2, r * 0.35, -Math.PI * 0.8, Math.PI * 0.1, true);
      ctx.lineTo(cx + rr(jitter), cy + r * 0.15);
      ctx.moveTo(cx, cy + r * 0.55);
      ctx.lineTo(cx + 1, cy + r * 0.55);
      ctx.stroke();
      break;
    case 'circle':
      sketchCircle(ctx, cx, cy, r * 0.7, { color, width: 2, jitter });
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.6 + rr(jitter));
      ctx.lineTo(cx + r * 0.5 + rr(jitter), cy + rr(jitter));
      ctx.lineTo(cx + rr(jitter), cy + r * 0.6 + rr(jitter));
      ctx.lineTo(cx - r * 0.5 + rr(jitter), cy + rr(jitter));
      ctx.closePath();
      ctx.stroke();
      break;
    case 'lightning':
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.1 + rr(jitter), cy - r * 0.6);
      ctx.lineTo(cx - r * 0.3 + rr(jitter), cy + rr(jitter) * 0.5);
      ctx.lineTo(cx + r * 0.1 + rr(jitter), cy + rr(jitter));
      ctx.lineTo(cx - r * 0.1 + rr(jitter), cy + r * 0.6);
      ctx.stroke();
      break;
    case 'smile':
      sketchCircle(ctx, cx, cy - r * 0.1, r * 0.55, { color, width: 2, jitter: jitter * 0.5 });
      // Eyes
      ctx.beginPath();
      ctx.arc(cx - r * 0.2, cy - r * 0.2, 2, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.2, cy - r * 0.2, 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      // Smile arc
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.3, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      break;
    default:
      sketchCircle(ctx, cx, cy, r * 0.5, { color, width: 2, jitter });
  }
}

function rr(range) {
  return (Math.random() - 0.5) * range;
}
