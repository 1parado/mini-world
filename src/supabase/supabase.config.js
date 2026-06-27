// Supabase 配置 — 从环境变量读取默认值
// 真实密钥存放在 .env.local（不提交到 git）
// 用户也可在游戏内「相册 → 设置」中修改，会覆写到 localStorage
const SUPABASE_CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  bucketName: import.meta.env.VITE_SUPABASE_BUCKET || 'photos',
  // 相册密码不再从环境变量读取（避免构建时内联到 JS 暴露）
  // 改为由用户在页面设置中配置 → 保存到 localStorage
};

export default SUPABASE_CONFIG;
