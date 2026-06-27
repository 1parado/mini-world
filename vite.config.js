import { defineConfig } from 'vite';
import { createHash } from 'crypto';

// 相册密码：从环境变量读取明文，构建时注入 SHA-256 哈希到 JS
// 非 VITE_ 前缀 → Vite 不会自动内联，构建产物中无明文
const albumPassword = process.env.ALBUM_PASSWORD || '';
const albumPasswordHash = albumPassword
  ? createHash('sha256').update(albumPassword).digest('hex')
  : '';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    host: true,
    port: 3000,
  },
  define: {
    __ALBUM_PWD_HASH__: JSON.stringify(albumPasswordHash),
  },
});
