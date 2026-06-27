// DiceZone — 骰子桌，靠近可以掷骰子
import { Zone } from '../Zone.js';

export class DiceZone extends Zone {
  constructor(x, y) {
    super('dice', x, y, 160, 130, 155, '🎲 骰子桌');
    this.type = 'dice';
    this.die1 = 1;
    this.die2 = 1;
    this.rolling = false;
    this.bestScore = 0;
    this.rollCount = 0;
  }

  roll() {
    this.die1 = Math.floor(Math.random() * 6) + 1;
    this.die2 = Math.floor(Math.random() * 6) + 1;
    const total = this.die1 + this.die2;
    this.rollCount++;
    if (total > this.bestScore) this.bestScore = total;
    this.rolling = true;
    return { die1: this.die1, die2: this.die2, total };
  }
}
