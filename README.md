# Sketch Notebook

一个基于 `Three.js` 的手绘风格 3D 笔记本。用户可以在桌面场景里的打开书本上书写、标注、贴贴纸、翻页，并通过 `PeerJS` 分享房间进行实时协作。

## 功能

- 3D 书桌场景和打开的笔记本视图
- 铅笔、彩笔、荧光笔、橡皮、文字、贴纸六种工具
- `blank`、`lined`、`grid`、`dotgrid` 四种纸张模板
- 手绘质感的 Canvas 页面渲染
- 自定义翻页动画
- 基于 URL 房间链接的多人协作和远端光标
- 简单聊天输入和分享按钮

## 操作

| 操作 | 功能 |
| --- | --- |
| `1` - `6` | 切换工具 |
| 左键拖拽 | 在页面上书写或放置内容 |
| 右键拖拽 | 平移视角 |
| 滚轮 | 缩放 |
| `←` / `→` | 翻页 |
| `T` | 切换当前左页模板 |
| `C` | 循环切换彩笔或荧光笔颜色 |
| `Enter` | 打开或发送聊天 |
| `Esc` | 关闭聊天或文字输入 |

## 项目结构

```text
src/
  core/          页面数据、模板和翻页逻辑
  scene/         书本、书桌、灯光
  tools/         绘图与编辑工具
  ui/            原生 DOM UI
  multiplayer/   PeerJS 房间和远端光标
  effects/       后处理
  utils/         渲染和通用辅助函数
```

## 本地开发

```bash
npm install
npm run dev
npm run build
npm run preview
```

## 技术栈

- `Three.js`
- `PeerJS`
- `Vite`
- `Canvas 2D`

## 已知限制

- 目前没有撤销 / 重做
- 多人同步以页面内容广播为主，没有持久化存储
