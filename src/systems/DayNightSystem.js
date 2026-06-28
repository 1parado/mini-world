// DayNightSystem — 基于真实时间的昼夜循环 + 环境色膜
// 影响世界渲染：背景色调、路灯光晕、天气粒子激活

const PHASES = {
  morning:   { start: 6,  end: 11, label: '🌅 清晨', overlay: 'rgba(255,235,180,0.04)',  alpha: 0.04 },
  afternoon: { start: 11, end: 17, label: '☀️ 午后', overlay: 'rgba(255,255,220,0.00)',  alpha: 0.0  },
  evening:   { start: 17, end: 21, label: '🌆 黄昏', overlay: 'rgba(255,140,50,0.06)',   alpha: 0.06 },
  night:     { start: 21, end: 6,  label: '🌙 夜晚', overlay: 'rgba(20,20,60,0.28)',     alpha: 0.28 },
};

/** 根据真实时间获取当前时段 */
export function getDayPhase() {
  const hour = new Date().getHours();
  if (hour >= 6  && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/** 获取时段中文标签（带 emoji） */
export function getPhaseLabel() {
  return PHASES[getDayPhase()].label;
}

/** 是否夜间 */
export function isNight() {
  return getDayPhase() === 'night';
}

/**
 * 获取当前环境色膜参数 — 用于渲染管线叠色
 * @returns {{ color: string, alpha: number }}
 */
export function getAmbientOverlay() {
  const phase = getDayPhase();
  const p = PHASES[phase];
  return { color: p.overlay, alpha: p.alpha };
}

/**
 * 计算夜间路灯光晕参数
 * @returns {{ radius: number, baseAlpha: number, pulseAmp: number }}
 */
export function getLampGlowParams() {
  if (isNight()) {
    return { radius: 55, baseAlpha: 0.18, pulseAmp: 0.06 };
  }
  return { radius: 22, baseAlpha: 0.12, pulseAmp: 0.03 };
}

/**
 * 根据时段推荐天气类型（夜间更多阴雨，白天更多晴朗）
 * @returns {string} 推荐的天气类型
 */
export function suggestWeather() {
  const phase = getDayPhase();
  const roll = Math.random();
  if (phase === 'night') {
    if (roll < 0.4) return 'cloudy';
    if (roll < 0.7) return 'rainy';
    return 'sunny';
  }
  if (phase === 'evening') {
    if (roll < 0.3) return 'cloudy';
    if (roll < 0.5) return 'windy';
    return 'sunny';
  }
  // morning / afternoon
  if (roll < 0.15) return 'cloudy';
  if (roll < 0.25) return 'rainy';
  if (roll < 0.35) return 'windy';
  return 'sunny';
}
