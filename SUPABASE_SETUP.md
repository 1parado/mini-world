# ☁️ Supabase 配置教程

手绘笔记本世界使用 Supabase 作为后端，提供：
- **Storage** — 相册图片存储
- **PostgreSQL** — 照片元数据、留言、许愿池等共享数据

---

## 📋 前提条件

- 一个 [Supabase](https://supabase.com) 账号（免费版即可）
- 一个已部署的 GitHub Pages 站点

## 🚀 步骤一：创建 Supabase 项目

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 点击 **New Project**
3. 填写项目名称和数据库密码
4. 选择离你最近的区域
5. 等待项目初始化完成（约 1~2 分钟）

## 📦 步骤二：创建 Storage Bucket（相册图片）

1. 在项目左侧菜单中选择 **Storage**
2. 点击 **New Bucket**
3. Bucket 名称填 `photos`（或你喜欢的名字，需与设置中一致）
4. **取消勾选** "Private bucket" — 设为公开（Public），这样上传的图片才可直接通过 URL 访问
5. 点击 **Create bucket**

### 配置 CORS（重要）

为了让你的 GitHub Pages 站点可以上传文件到 Supabase Storage，需要配置 CORS：

1. 进入 Storage 页面，点击 Bucket 右侧的 ⋯ → **Configure CORS**
2. 添加以下规则：

| 字段 | 值 |
|------|------|
| Allowed Origins | `https://你的用户名.github.io` |
| Allowed Methods | `POST, GET, PUT, DELETE` |
| Allowed Headers | `*` |
| Max Age (seconds) | `3600` |

> 开发阶段也可以临时将 Allowed Origins 设为 `http://localhost:3000`

## 🗄️ 步骤三：创建数据库表（共享数据）

1. 在项目左侧菜单中选择 **SQL Editor**
2. 点击 **New Query**
3. 复制项目中的 `supabase/init-db.sql` 全部内容，粘贴到编辑器
4. 点击 **Run** 执行

这将创建 4 张表：
- `photos` — 照片元数据（所有人共享标题）
- `mailbox_messages` — 邮箱留言
- `board_messages` — 公告板消息
- `wishes` — 许愿池愿望

并配置 Row Level Security（RLS）策略，允许公开读写。

> ⚠️ 必须执行此步骤，否则相册、邮箱、公告板、许愿池功能将无法正常工作！

## 🔑 步骤四：获取 API 密钥

1. 在项目左侧菜单中选择 **Settings** → **API**
2. 找到以下两个字段：
   - **Project URL**：形如 `https://xxxxx.supabase.co`
   - **anon public**：一串很长的 JWT token（以 `eyJ` 开头）
3. 复制这两个值

> ⚠️ `anon public` 密钥是安全的，可以暴露在前端代码中。Supabase 使用 Row Level Security (RLS) 来保护数据。切勿使用 `service_role` 密钥！

## 🔐 步骤五：配置 RLS 策略（Storage，推荐）

为了安全性，建议配置 Storage 的 Row Level Security 策略：

1. 进入 Storage 页面 → 点击 `photos` bucket
2. 点击 **Policies** 标签
3. 推荐策略：

### 上传策略（允许任何人上传）
```sql
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos');
```

### 读取策略（允许任何人查看）
```sql
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');
```

### 删除策略（仅允许上传者删除）
```sql
CREATE POLICY "Allow public deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'photos');
```

> 💡 如果是完全公开的相册，可以直接在 bucket 设置中开启 Public，无需手动配置策略。

## 🎮 步骤六：在游戏中配置

1. 启动游戏，走到 **📷 相册** 区域
2. 按 **空格键** 或 **E键** 与相册交互
3. 点击右上角 **⚙️ 设置** 按钮
4. 填入：
   - **Supabase URL**：步骤四中复制的 Project URL
   - **Supabase Anon Key**：步骤四中复制的 anon public 密钥
   - **Bucket 名称**：`photos`（或步骤二中自定义的名称）
5. 点击 **🔗 测试连接** — 应显示 ✅ 连接成功
6. 点击 **💾 保存设置**

配置保存后，你就可以上传和浏览照片了！

## 📸 使用说明

### 相册
- 上传照片需要密码验证（站长通过环境变量 `ALBUM_PASSWORD` 配置）
- 浏览照片无需密码，所有人可见
- 修改标题所有人共享（存数据库）

### 邮箱 / 公告板 / 许愿池
- 留言、公告、许愿全部存数据库，所有人共享
- 无需额外配置，只要 Supabase 连接正常即可

## 🛠️ 常见问题

### ❌ 上传失败 "Failed to fetch"
- 检查 CORS 配置是否正确
- 确认 Allowed Origins 包含你的站点域名
- 开发环境需包含 `http://localhost:3000`

### ❌ 连接测试失败
- 确认 Supabase 项目已启动（未暂停）
- 确认 URL 和 Key 格式正确
- URL 应为 `https://xxxxx.supabase.co`，末尾无斜杠

### ❌ 数据库操作失败（relation "photos" does not exist）
- 确认已执行 `supabase/init-db.sql` 建表脚本
- 在 SQL Editor 中执行 `SELECT * FROM photos;` 验证表是否存在

### ❌ 上传成功但图片无法显示
- 确认 Storage Bucket 已设为 Public
- 或确认已配置 SELECT 类型的 RLS 策略

### ❌ 图片太大上传很慢
- 图片上传前会自动压缩到 800px 宽度
- 如果仍太大，可以手动缩小图片后再上传

## 📊 配额参考（Supabase 免费版）

| 资源 | 免费额度 |
|------|---------|
| Storage 容量 | 1 GB |
| 带宽 | 5 GB/月 |
| 上传文件大小 | 50 MB/文件 |
| 数据库行数 | 50,000 行 |

> 💡 通常一张压缩后的照片约 100-300KB，1GB 可存约 3000-10000 张照片。
