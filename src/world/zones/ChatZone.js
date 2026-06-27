// ChatZone.js — AI对话区域
// 在世界中显示为一张「AI助手台」，玩家走近按F打开聊天窗口

import { Zone } from '../Zone.js';

export class ChatZone extends Zone {
  constructor(x, y) {
    super('chat', x, y, 200, 160, 60, '🤖 AI助手台');
    this.type = 'chat';
    this.greeting = '嗨！我是文具世界的AI助手，来和我聊天吧 ✏️';
  }
}
