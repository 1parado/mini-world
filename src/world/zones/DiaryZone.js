// 📔 日记本区域
import { Zone } from '../Zone.js';

export class DiaryZone extends Zone {
  constructor(x, y) {
    super('diary', x, y, 150, 130, 150, '📔 日记本');
    this.type = 'diary';

    this.entries = [];
    this.moods = ['😊 开心', '😌 平静', '🤔 思考', '😢 难过', '🔥 激动'];
  }

  /** 写日记 */
  addEntry(mood, text) {
    this.entries.unshift({
      mood,
      text,
      time: new Date(),
    });
    if (this.entries.length > 20) this.entries.pop();
  }
}
