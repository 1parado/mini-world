// 🌤️ 气候站区域
import { Zone } from '../Zone.js';

export class WeatherZone extends Zone {
  constructor(x, y) {
    super('weather', x, y, 170, 150, 160, '🌤️ 气候站');
    this.type = 'weather';

    this.weather = 'sunny'; // sunny, cloudy, rainy, snowy, windy
    this.temperature = 25;
    this.windLevel = 2;
  }

  setWeather(type) {
    this.weather = type;
    switch (type) {
      case 'sunny':   this.temperature = 28 + Math.floor(Math.random() * 8); this.windLevel = 1 + Math.floor(Math.random() * 2); break;
      case 'cloudy':  this.temperature = 18 + Math.floor(Math.random() * 8); this.windLevel = 2 + Math.floor(Math.random() * 3); break;
      case 'rainy':   this.temperature = 12 + Math.floor(Math.random() * 8); this.windLevel = 3 + Math.floor(Math.random() * 3); break;
      case 'snowy':   this.temperature = -5 + Math.floor(Math.random() * 5); this.windLevel = 1 + Math.floor(Math.random() * 2); break;
      case 'windy':   this.temperature = 15 + Math.floor(Math.random() * 10); this.windLevel = 5 + Math.floor(Math.random() * 3); break;
    }
  }

  getWeatherLabel() {
    const map = { sunny: '☀️ 晴天', cloudy: '☁️ 多云', rainy: '🌧️ 雨天', snowy: '❄️ 雪天', windy: '💨 大风' };
    return map[this.weather] || '☀️ 晴天';
  }
}
