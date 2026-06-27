import { Page } from './Page.js';
import { TEMPLATE_TYPES } from './PageTemplate.js';

// NotebookWorld — manages the collection of pages and page navigation
export class NotebookWorld {
  constructor(maxPages = 40) {
    this.maxPages = maxPages;
    this.pages = [];
    this.currentSpread = 0; // Index of the left page in the current spread

    // Initialize with some pages
    this.addPage('lined');   // Page 0 (left)
    this.addPage('lined');   // Page 1 (right)
  }

  addPage(template = 'lined') {
    const id = this.pages.length;
    const page = new Page(id, template);
    this.pages.push(page);
    return page;
  }

  getCurrentLeftPage() {
    return this.pages[this.currentSpread] || null;
  }

  getCurrentRightPage() {
    return this.pages[this.currentSpread + 1] || null;
  }

  getCurrentPageNumber() {
    return Math.floor(this.currentSpread / 2) + 1;
  }

  getTotalSpreads() {
    return Math.floor(this.pages.length / 2);
  }

  // Navigate to next spread
  canFlipForward() {
    return this.currentSpread + 2 < this.pages.length;
  }

  canFlipBackward() {
    return this.currentSpread > 0;
  }

  flipForward() {
    if (!this.canFlipForward()) {
      // Add new pages at the end
      this.addPage('lined');
      this.addPage('lined');
    }
    this.currentSpread += 2;
    return {
      left: this.getCurrentLeftPage(),
      right: this.getCurrentRightPage(),
    };
  }

  flipBackward() {
    if (!this.canFlipBackward()) return null;
    this.currentSpread -= 2;
    return {
      left: this.getCurrentLeftPage(),
      right: this.getCurrentRightPage(),
    };
  }

  // Get a page by its 0-based index
  getPage(index) {
    return this.pages[index] || null;
  }

  // Serialize entire notebook for storage/network
  serialize() {
    return {
      currentSpread: this.currentSpread,
      pages: this.pages.map(p => p.serialize()),
    };
  }

  // Deserialize
  static deserialize(data) {
    const nb = new NotebookWorld(0);
    nb.pages = data.pages.map(pd => Page.deserialize(pd));
    nb.currentSpread = data.currentSpread || 0;
    nb.maxPages = Math.max(nb.pages.length, 40);
    return nb;
  }
}
