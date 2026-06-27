// ShelfZone — bookshelf for browsing saved pages
import { Zone } from '../Zone.js';

export class ShelfZone extends Zone {
  constructor(x, y) {
    super('shelf', x, y, 160, 200, 160, '📚 Shelf');
    this.type = 'shelf';
  }
}
