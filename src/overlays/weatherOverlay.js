// weatherOverlay.js — 🌤️ 气候站
import { getCtx } from '../overlays/OverlayContext.js';

let weatherAnimFrame = null;
let weatherParticles = [];

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('weather-overlay', 'weather-close');
  document.getElementById('weather-overlay').classList.add('visible');
  renderWeatherUI();
  if (!weatherAnimFrame) {
    const animate = () => {
      const overlay = document.getElementById('weather-overlay');
      if (!overlay || !overlay.classList.contains('visible')) { weatherAnimFrame = null; return; }
      drawWeatherCanvas();
      weatherAnimFrame = requestAnimationFrame(animate);
    };
    weatherAnimFrame = requestAnimationFrame(animate);
  }
}

export function hide() {
  document.getElementById('weather-overlay')?.classList.remove('visible');
}

function drawWeatherCanvas() {
  const { gameWorld } = getCtx();
  const wz = gameWorld.getZoneByType('weather');
  const canvasEl = document.getElementById('weather-canvas');
  if (!wz || !canvasEl) return;
  const wctx = canvasEl.getContext('2d');
  const w = canvasEl.width, h = canvasEl.height;

  const skyColors = {
    sunny: '#87CEEB', cloudy: '#90A4AE', rainy: '#546E7A', snowy: '#CFD8DC', windy: '#78909C'
  };
  wctx.fillStyle = skyColors[wz.weather] || '#87CEEB';
  wctx.fillRect(0, 0, w, h);

  if (wz.weather === 'sunny' || wz.weather === 'windy') {
    wctx.fillStyle = '#FFC107';
    wctx.beginPath(); wctx.arc(60, 40, 20, 0, Math.PI * 2); wctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Date.now() * 0.001;
      wctx.strokeStyle = '#FFB300'; wctx.lineWidth = 2;
      wctx.beginPath(); wctx.moveTo(60 + Math.cos(a) * 25, 40 + Math.sin(a) * 25);
      wctx.lineTo(60 + Math.cos(a) * 35, 40 + Math.sin(a) * 35); wctx.stroke();
    }
  }

  if (wz.weather === 'cloudy' || wz.weather === 'rainy') {
    wctx.fillStyle = 'rgba(255,255,255,0.6)';
    const ct = Date.now() * 0.0003;
    [[60, 30], [120, 25], [180, 35]].forEach(([bx, by], i) => {
      const x = bx + Math.sin(ct + i) * 15;
      wctx.beginPath(); wctx.arc(x, by, 20, 0, Math.PI * 2); wctx.fill();
      wctx.beginPath(); wctx.arc(x + 18, by - 3, 15, 0, Math.PI * 2); wctx.fill();
      wctx.beginPath(); wctx.arc(x + 8, by - 12, 14, 0, Math.PI * 2); wctx.fill();
    });
  }

  if (wz.weather === 'rainy') {
    wctx.strokeStyle = 'rgba(100,181,246,0.6)'; wctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const rx = (i * 37 + Date.now() * 0.1) % w;
      const ry = (i * 23 + Date.now() * 0.3) % h;
      wctx.beginPath(); wctx.moveTo(rx, ry); wctx.lineTo(rx - 2, ry + 8); wctx.stroke();
    }
  }

  if (wz.weather === 'snowy') {
    wctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 20; i++) {
      const sx = (i * 41 + Math.sin(Date.now() * 0.001 + i) * 20 + Date.now() * 0.02) % w;
      const sy = (i * 31 + Date.now() * 0.05) % h;
      wctx.beginPath(); wctx.arc(sx, sy, 2, 0, Math.PI * 2); wctx.fill();
    }
  }

  const groundColor = wz.weather === 'snowy' ? '#ECEFF1' : wz.weather === 'rainy' ? '#4E342E' : '#66BB6A';
  wctx.fillStyle = groundColor;
  wctx.fillRect(0, h - 30, w, 30);

  wctx.fillStyle = '#FFF'; wctx.font = 'bold 14px Inter, sans-serif';
  wctx.fillText(wz.temperature + '°C', w - 60, 25);
  wctx.fillText('风 ' + wz.windLevel + '级', w - 60, 45);
}

function renderWeatherUI() {
  const { gameWorld } = getCtx();
  const wz = gameWorld.getZoneByType('weather');
  if (!wz) return;

  const labelEl = document.getElementById('weather-label');
  if (labelEl) labelEl.textContent = wz.getWeatherLabel();

  const btns = document.querySelectorAll('.weather-btn');
  btns.forEach(btn => {
    btn.onclick = () => {
      wz.setWeather(btn.dataset.type);
      renderWeatherUI();
    };
  });
}
