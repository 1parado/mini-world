// NotebookZone — the central notebook, enter → writing mode
import { Zone } from '../Zone.js';

export class NotebookZone extends Zone {
  constructor(x, y) {
    super('notebook', x, y, 240, 180, 180, '📓 笔记本');
    this.type = 'notebook';
  }
}
