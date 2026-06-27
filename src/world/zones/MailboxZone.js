// MailboxZone — 信箱，查看留言
import { Zone } from '../Zone.js';

export class MailboxZone extends Zone {
  constructor(x, y) {
    super('mailbox', x, y, 50, 80, 140, '📮 信箱');
    this.type = 'mailbox';
    this.messages = [];
  }

  addMessage(text) {
    this.messages.unshift(text);
    if (this.messages.length > 20) this.messages.pop();
  }
}
