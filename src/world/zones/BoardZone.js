// BoardZone — bulletin board for messages/notifications
import { Zone } from '../Zone.js';

export class BoardZone extends Zone {
  constructor(x, y) {
    super('board', x, y, 180, 140, 160, '📋 Board');
    this.type = 'board';
    this.messages = [];
  }

  addMessage(text) {
    this.messages.unshift(text);
    if (this.messages.length > 20) this.messages.pop();
  }
}
