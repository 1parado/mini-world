// graffitiOverlay.js — 🎨 涂鸦墙
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('graffiti-overlay', 'graffiti-close');
  document.getElementById('graffiti-overlay').classList.add('visible');
}

export function hide() {
  document.getElementById('graffiti-overlay')?.classList.remove('visible');
}
