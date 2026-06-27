# ☁️ Supabase 图床配置教程

相册功能使用 Supabase Storage 作为外部图床，让你的照片可以在线展示。
本文档将手把手教你在 GitHub Pages 部署场景下配置 Supabase。

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

## 📦 步骤二：创建 Storage Bucket

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

> 开发阶段也可以临时将 Allowed Origins 设为 `http://localhost:5173`

## 🔑 步骤三：获取 API 密钥

1. 在项目左侧菜单中选择 **Settings** → **API**
2. 找到以下两个字段：
   - **Project URL**：形如 `https://xxxxx.supabase.co`
   - **anon public**：一串很长的 JWT token（以 `eyJ` 开头）
3. 复制这两个值

> ⚠️ `anon public` 密钥是安全的，可以暴露在前端代码中。Supabase 使用 Row Level Security (RLS) 来保护数据。切勿使用 `service_role` 密钥！

## 🔐 步骤四：配置 RLS 策略（推荐）

为了安全性，建议配置 Storage 的 Row Level Security 策略：

1. 进入 Storage 页面 → 点击 `photos` bucket
2. 点击 **Policies** 标签
3. 推荐策略：

### 上传策略（允许任何人上传）
```sql
-- 允许上传
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos');
```

### 读取策略（允许任何人查看）
```sql
-- 允许公开读取
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');
```

### 删除策略（仅允许上传者删除）
```sql
-- 允许删除（如需限制，可添加 auth.uid() 判断）
CREATE POLICY "Allow public deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'photos');
```

> 💡 如果是完全公开的相册，可以直接在 bucket 设置中开启 Public，无需手动配置策略。
> 如果需要限制只有认证用户才能上传，可在策略中加入 `auth.uid() IS NOT NULL`。

## 🎮 步骤五：在游戏中配置

1. 启动游戏，走到 **📷 相册** 区域
2. 按 **空格键** 或 **E键** 与相册交互
3. 点击右上角 **⚙️ 设置** 按钮
4. 填入：
   - **Supabase URL**：步骤三中复制的 Project URL
   - **Supabase Anon Key**：步骤三中复制的 anon public 密钥
   - **Bucket 名称**：`photos`（或步骤二中自定义的名称）
5. 点击 **🔗 测试连接** — 应显示 ✅ 连接成功
6. 点击 **💾 保存设置**

配置保存后，你就可以上传和浏览照片了！

## 📸 使用说明

### 上传照片
1. 点击 **📸 上传照片** 按钮
2. 选择图片文件（支持 JPG / PNG / GIF / WebP）
3. 图片会自动压缩到 800px 宽度后上传
4. 上传成功后照片自动出现在相册中

### 浏览照片
- 点击照片缩略图打开 **灯箱** 大图查看
- 在灯箱中可编辑标题或删除照片

### 数据存储
- **图片文件**：存储在 Supabase Storage（云端）
- **元数据**（标题、时间等）：存储在浏览器 localStorage
- 清除浏览器数据不会删除云端图片，但会丢失本地元数据

## 🛠️ 常见问题

### ❌ 上传失败 "Failed to fetch"
- 检查 CORS 配置是否正确
- 确认 Allowed Origins 包含你的站点域名
- 开发环境需包含 `http://localhost:5173`

### ❌ 连接测试失败
- 确认 Supabase 项目已启动（未暂停）
- 确认 URL 和 Key 格式正确
- URL 应为 `https://xxxxx.supabase.co`，末尾无斜杠

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

> 💡 通常一张压缩后的照片约 100-300KB，1GB 可存约 3000-10000 张照片。
