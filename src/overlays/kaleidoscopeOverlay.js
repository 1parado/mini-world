// kaleidoscopeOverlay.js — 🔆 万花筒
import { getCtx } from '../overlays/OverlayContext.js';

let kaleidoscopeAnim = null;

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('kaleidoscope-overlay', 'kaleidoscope-close');
  document.getElementById('kaleidoscope-overlay').classList.add('visible');
  renderKaleidoscopeUI();
  if (!kaleidoscopeAnim) {
    const animate = () => {
      const overlay = document.getElementById('kaleidoscope-overlay');
      if (!overlay || !overlay.classList.contains('visible')) { kaleidoscopeAnim = null; return; }
      const { gameWorld } = getCtx();
      const kz = gameWorld.getZoneByType('kaleidoscope');
      if (kz) { kz.tick(1/60); drawKaleidoscopeCanvas(); }
      kaleidoscopeAnim = requestAnimationFrame(animate);
    };
    kaleidoscopeAnim = requestAnimationFrame(animate);
  }
}

export function hide() {
  document.getElementById('kaleidoscope-overlay')?.classList.remove('visible');
}

function drawKaleidoscopeCanvas() {
  const { gameWorld } = getCtx();
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
  const { gameWorld } = getCtx();
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
