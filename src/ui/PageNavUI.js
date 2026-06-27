export class PageNavUI {
  constructor(onFlip) {
    this.onFlip = onFlip;
    this.container = document.getElementById('page-nav');
    this.pageNumEl = document.getElementById('page-num');
    this.totalEl = document.getElementById('page-total');
    this.init();
  }

  init() {
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.onFlip) this.onFlip('backward');
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.onFlip) this.onFlip('forward');
      });
    }
  }

  update(current, total) {
    if (this.pageNumEl) this.pageNumEl.textContent = current;
    if (this.totalEl) this.totalEl.textContent = total;
  }
}
