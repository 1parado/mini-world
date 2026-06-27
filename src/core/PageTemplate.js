// PageTemplate — render page background templates on Canvas2D

export const TEMPLATE_TYPES = ['blank', 'lined', 'grid', 'dotgrid'];

const PAGE_W = 800;
const PAGE_H = 1100;
const PAPER_COLOR = '#faf5e8';
const LINE_COLOR = 'rgba(26, 26, 46, 0.12)';
const MARGIN_COLOR = 'rgba(234, 84, 85, 0.18)'; // Red margin line

// Create a canvas with a page template rendered on it.
// Rendering is deterministic per seed so live previews do not make the page jitter.
export function renderTemplate(templateType, canvas, options = {}) {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
  }
  const ctx = canvas.getContext('2d');
  const seedValue = typeof options.seed === 'number'
    ? options.seed
    : hashString(String(options.seed ?? templateType));
  const random = createSeededRandom(seedValue);
  const pageNumber = options.pageNumber ?? null;

  // Paper background
  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Subtle paper texture
  ctx.fillStyle = 'rgba(26, 26, 46, 0.015)';
  for (let i = 0; i < 200; i++) {
    const x = random() * PAGE_W;
    const y = random() * PAGE_H;
    ctx.fillRect(x, y, 1 + random(), 1 + random());
  }

  // Left margin line (red)
  ctx.strokeStyle = MARGIN_COLOR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const marginX = 60 + (random() - 0.5) * 1;
  ctx.moveTo(marginX, 30);
  ctx.lineTo(marginX + (random() - 0.5) * 0.5, PAGE_H - 30);
  ctx.stroke();

  switch (templateType) {
    case 'lined':
      renderLined(ctx, random);
      break;
    case 'grid':
      renderGrid(ctx, random);
      break;
    case 'dotgrid':
      renderDotGrid(ctx, random);
      break;
    case 'blank':
    default:
      break;
  }

  // Page edge shadow (subtle right+bottom darkening)
  const edgeGrad = ctx.createLinearGradient(PAGE_W - 30, 0, PAGE_W, 0);
  edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(1, 'rgba(0,0,0,0.03)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(PAGE_W - 30, 0, 30, PAGE_H);

  const bottomGrad = ctx.createLinearGradient(0, PAGE_H - 30, 0, PAGE_H);
  bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
  bottomGrad.addColorStop(1, 'rgba(0,0,0,0.03)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, PAGE_H - 30, PAGE_W, 30);

  if (pageNumber !== null) {
    ctx.font = '12px Courier New, monospace';
    ctx.fillStyle = 'rgba(26, 26, 46, 0.15)';
    ctx.textAlign = 'right';
    ctx.fillText('- ' + pageNumber + ' -', PAGE_W - 40, PAGE_H - 20);
  }

  return canvas;
}

function renderLined(ctx, random) {
  const startY = 80;
  const lineSpacing = 32;
  const numLines = Math.floor((PAGE_H - startY - 40) / lineSpacing);

  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1;

  for (let i = 0; i < numLines; i++) {
    const y = startY + i * lineSpacing;
    const jitter = 0.5;
    // Hand-drawn line: slight waviness
    ctx.beginPath();
    ctx.moveTo(55 + (random() - 0.5) * jitter, y + (random() - 0.5) * jitter);
    // Draw in segments with slight vertical offset
    const segments = 8;
    for (let s = 1; s <= segments; s++) {
      const sx = 55 + (PAGE_W - 70) * (s / segments);
      const sy = y + (random() - 0.5) * jitter * 0.5;
      ctx.lineTo(sx + (random() - 0.5) * jitter, sy);
    }
    ctx.stroke();
  }
}

function renderGrid(ctx, random) {
  const startX = 55;
  const startY = 50;
  const spacing = 24;
  const cols = Math.floor((PAGE_W - startX - 20) / spacing);
  const rows = Math.floor((PAGE_H - startY - 30) / spacing);

  ctx.strokeStyle = 'rgba(26, 26, 46, 0.06)';
  ctx.lineWidth = 0.5;

  // Vertical lines
  for (let c = 0; c <= cols; c++) {
    const x = startX + c * spacing;
    ctx.beginPath();
    ctx.moveTo(x + (random() - 0.5) * 0.3, startY);
    ctx.lineTo(x + (random() - 0.5) * 0.3, startY + rows * spacing);
    ctx.stroke();
  }

  // Horizontal lines
  for (let r = 0; r <= rows; r++) {
    const y = startY + r * spacing;
    ctx.beginPath();
    ctx.moveTo(startX, y + (random() - 0.5) * 0.3);
    ctx.lineTo(startX + cols * spacing, y + (random() - 0.5) * 0.3);
    ctx.stroke();
  }
}

function renderDotGrid(ctx, random) {
  const startX = 60;
  const startY = 60;
  const spacing = 24;
  const cols = Math.floor((PAGE_W - startX - 20) / spacing);
  const rows = Math.floor((PAGE_H - startY - 30) / spacing);

  ctx.fillStyle = 'rgba(26, 26, 46, 0.15)';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * spacing + (random() - 0.5) * 0.5;
      const y = startY + r * spacing + (random() - 0.5) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { PAGE_W, PAGE_H };
