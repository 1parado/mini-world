-- ============================================
-- Supabase 数据库初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 照片元数据表
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  date TEXT DEFAULT '',
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 邮箱留言表
CREATE TABLE IF NOT EXISTS mailbox_messages (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 公告板消息表
CREATE TABLE IF NOT EXISTS board_messages (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 许愿池表
CREATE TABLE IF NOT EXISTS wishes (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security — 全部允许公开访问
-- （写操作的前端密码锁由业务层控制）
-- ============================================

-- photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public reads" ON photos FOR SELECT USING (true);
CREATE POLICY "Allow public inserts" ON photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public updates" ON photos FOR UPDATE USING (true);
CREATE POLICY "Allow public deletes" ON photos FOR DELETE USING (true);

-- mailbox_messages
ALTER TABLE mailbox_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public reads" ON mailbox_messages FOR SELECT USING (true);
CREATE POLICY "Allow public inserts" ON mailbox_messages FOR INSERT WITH CHECK (true);

-- board_messages
ALTER TABLE board_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public reads" ON board_messages FOR SELECT USING (true);
CREATE POLICY "Allow public inserts" ON board_messages FOR INSERT WITH CHECK (true);

-- wishes
ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public reads" ON wishes FOR SELECT USING (true);
CREATE POLICY "Allow public inserts" ON wishes FOR INSERT WITH CHECK (true);
