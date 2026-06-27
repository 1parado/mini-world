// ExploreUI — HUD overlay for the explore mode (walking around the world)
export class ExploreUI {
  constructor() {
    this.container = document.getElementById('explore-hud');
    this.tooltipEl = document.getElementById('explore-tooltip');
  }

  show() {
    if (this.container) {
      this.container.classList.remove('hidden');
      this.container.style.removeProperty('display');
    }
  }

  hide() {
    if (this.container) {
      this.container.classList.add('hidden');
      this.container.style.removeProperty('display');
    }
  }

  setTooltip(text) {
    if (this.tooltipEl) {
      this.tooltipEl.textContent = text;
      this.tooltipEl.style.opacity = text ? '1' : '0';
    }
  }
}
