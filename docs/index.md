---
title: 首页
description: OhMyIDC 文档框架的设计与用法
---

# OhMyIDC 文档框架

把 Markdown 编译成 Vue 组件，再挂进任意 Vue 应用。独立部署和嵌入式文档共用同一套运行时。

::: tip 当前阶段
这是 MVP：已经跑通「宿主 router 挂载 `/docs` → Markdown 渲染 → 文件热更新」这条主线。SSG、搜索、主题扩展还在路线图上。
:::

## 它解决什么问题

大多数文档框架默认自己拥有整个应用：创建 router、接管 HTML 入口、全局注入样式。一旦你想把文档塞进现有产品，就会处处打架。

这个框架反过来：**App 的所有权始终在宿主手里**。

- 宿主决定 router、base、SSR 和构建流程。
- 文档只提供路由片段、页面组件和布局原语。
- 独立模式只是一个「只装了文档的宿主壳」。

## 三分钟跑起来

```bash
pnpm install
pnpm dev
```

然后打开 `/docs`。修改 `docs/guide/start.md` 里的任意文字，页面会热更新。

## 接下来读什么

- [快速开始](./guide/start.md) —— 目录结构和构建流程
- [嵌入到宿主](./guide/embed.md) —— 在现有 Vue 应用里挂载文档
- [Markdown 能力](./guide/markdown.md) —— 代码高亮、提示块、锚点
