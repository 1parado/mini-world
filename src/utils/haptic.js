// haptic.js — 📳 轻量触觉反馈工具
// 仅在支持 Vibration API 的移动设备上生效

const PATTERNS = {
  light:   10,
  medium:  25,
  heavy:   50,
  success: [30, 50, 30],
  error:   [50, 30, 50, 30, 50],
};

/**
 * 触发触觉反馈
 * @param {'light'|'medium'|'heavy'|'success'|'error'} type
 */
export function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  const pattern = PATTERNS[type] || PATTERNS.light;
  try { navigator.vibrate(pattern); } catch { /* 忽略不支持的环境 */ }
}
