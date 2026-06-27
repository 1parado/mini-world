// DartZone — 飞镖靶，靠近可以投掷飞镖计分
import { Zone } from '../Zone.js';

export class DartZone extends Zone {
  constructor(x, y) {
    super('dart', x, y, 140, 160, 160, '🎯 飞镖靶');
    this.type = 'dart';
    this.score = 0;
    this.dartsThrown = 0;
    this.lastHit = '';
    this.results = [];
  }

  throwDart() {
    const zones = [
      { name: '红心', points: 50, weight: 1 },
      { name: '内环', points: 30, weight: 3 },
      { name: '中环', points: 20, weight: 5 },
      { name: '外环', points: 10, weight: 7 },
      { name: '脱靶', points: 0, weight: 4 },
    ];
    const totalWeight = zones.reduce((s, z) => s + z.weight, 0);
    let r = Math.random() * totalWeight;
    let hit = zones[zones.length - 1];
    for (const z of zones) {
      r -= z.weight;
      if (r <= 0) { hit = z; break; }
    }
    this.score += hit.points;
    this.dartsThrown++;
    this.lastHit = hit.name;
    this.results.unshift(hit);
    if (this.results.length > 6) this.results.pop();
    return hit;
  }

  reset() {
    this.score = 0;
    this.dartsThrown = 0;
    this.lastHit = '';
    this.results = [];
  }
}
