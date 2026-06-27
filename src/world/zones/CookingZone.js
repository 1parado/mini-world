// 🍳 烹饪桌区域
import { Zone } from '../Zone.js';

export class CookingZone extends Zone {
  constructor(x, y) {
    super('cooking', x, y, 190, 150, 170, '🍳 烹饪桌');
    this.type = 'cooking';

    this.allIngredients = [
      { id: 'tomato', name: '🍅 番茄', color: '#EA5455' },
      { id: 'egg', name: '🥚 鸡蛋', color: '#F5D680' },
      { id: 'rice', name: '🍚 米饭', color: '#FAF5E8' },
      { id: 'chicken', name: '🍗 鸡肉', color: '#D4A574' },
      { id: 'fish', name: '🐟 鱼', color: '#5DADE2' },
      { id: 'tofu', name: '🧈 豆腐', color: '#FFF5E1' },
      { id: 'pepper', name: '🌶️ 辣椒', color: '#E74C3C' },
      { id: 'onion', name: '🧅 洋葱', color: '#8E6E53' },
      { id: 'noodle', name: '🍜 面条', color: '#F0D9A0' },
      { id: 'mushroom', name: '🍄 蘑菇', color: '#A0522D' },
    ];

    this.recipes = [
      { name: '番茄炒蛋', ingredients: ['tomato', 'egg'], icon: '🍳' },
      { name: '蛋炒饭', ingredients: ['egg', 'rice'], icon: '🍛' },
      { name: '宫保鸡丁', ingredients: ['chicken', 'pepper'], icon: '🍗' },
      { name: '水煮鱼', ingredients: ['fish', 'pepper'], icon: '🐟' },
      { name: '麻婆豆腐', ingredients: ['tofu', 'pepper'], icon: '🫘' },
      { name: '蘑菇汤', ingredients: ['mushroom', 'onion'], icon: '🥣' },
      { name: '海鲜面', ingredients: ['fish', 'noodle'], icon: '🍜' },
      { name: '洋葱炒蛋', ingredients: ['onion', 'egg'], icon: '🧅' },
    ];

    this.selected = [];      // 已选食材id
    this.completed = [];     // 已解锁菜谱名
    this.cooking = false;
    this.lastResult = '';    // 烹饪结果消息
  }

  toggleIngredient(id) {
    const idx = this.selected.indexOf(id);
    if (idx >= 0) {
      this.selected.splice(idx, 1);
    } else if (this.selected.length < 4) {
      this.selected.push(id);
    }
  }

  /** 烹饪 — 返回结果 */
  cook() {
    if (this.cooking || this.selected.length < 2) return '';
    this.cooking = true;

    // 查找匹配菜谱
    let matched = null;
    for (const recipe of this.recipes) {
      const s = new Set(this.selected);
      const r = new Set(recipe.ingredients);
      if (s.size === r.size && [...s].every(x => r.has(x))) {
        matched = recipe;
        break;
      }
    }

    setTimeout(() => {
      this.cooking = false;
      if (matched) {
        if (!this.completed.includes(matched.name)) {
          this.completed.push(matched.name);
        }
        this.lastResult = matched.icon + ' ' + matched.name + ' 完成！';
      } else {
        this.lastResult = '🤔 不对……产生了奇怪的东西…';
      }
      this.selected = [];
    }, 1500);

    return this.cooking ? 'cooking' : '';
  }

  reset() {
    this.selected = [];
    this.completed = [];
    this.cooking = false;
    this.lastResult = '';
  }
}
