---
title: 关于
order: 99
---

# 关于

这是 OhMyIDC 文档框架的最小可用版本，用来验证「可嵌入任意 Vue 应用」这条架构路线。

## 已经具备

- Vite 插件扫描 Markdown，生成侧边栏与页面元信息。
- Markdown 在构建期编译成 Vue 渲染函数。
- 宿主 router 挂载文档子树，不创建第二个 router。
- 相对链接改写、标题锚点、Shiki 双主题高亮、提示块。
- 页面级 HMR；新增或删除文件时自动刷新侧边栏。

## 还没有做

- 静态站点生成（SSG）与独立 CLI。
- 本地搜索和中文分词。
- 主题扩展 API、i18n、版本化文档。
- Nuxt 模块与 Shadow DOM 隔离。

返回 [文档首页](./index.md)。
