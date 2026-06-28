// coffeeOverlay.js — ☕ 咖啡角
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('coffee-overlay', 'coffee-close');
  document.getElementById('coffee-overlay').classList.add('visible');
}

export function hide() {
  document.getElementById('coffee-overlay')?.classList.remove('visible');
}
