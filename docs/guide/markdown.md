---
title: Markdown 能力
order: 3
description: 代码高亮、提示块、锚点与链接
---

# Markdown 能力

## 代码高亮

使用 Shiki，在构建期完成高亮，运行时只输出带内联样式的 HTML。亮色和暗色主题同时生成，切换主题不需要重新高亮。

```ts
interface DocsPageMeta {
  path: string
  title: string
  load: () => Promise<{ default: Component }>
}

export function createDocs(options: DocsOptions) {
  return { base: options.base ?? '/docs' }
}
```

代码块里写 Vue 插值也不会被解析，因为框架会给代码块加上 `v-pre`：

```vue
<template>
  <p>{{ message }}</p>
</template>
```

行内代码同样安全：`{{ message }}`。

## 提示块

::: tip 提示
用 `::: tip` 包裹内容。标题可以自定义：`::: tip 自定义标题`。
:::

::: info 信息
适合补充说明。
:::

::: warning 注意
适合提醒潜在问题。
:::

::: danger 危险
适合标记破坏性操作。
:::

## 标题锚点

二、三级标题会自动生成 `id` 和悬浮锚点，右侧目录直接复用同一份标题数据。

### 一个中文标题

### 重复标题

### 重复标题

重复标题会自动加后缀，保证 `id` 唯一。

## 相对链接

Markdown 之间的相对链接会在编译期被改写：

```md
[快速开始](./start.md)
[带锚点](./start.md#目录结构)
```

渲染结果会带上文档 base，并标记为内部链接，运行时由 `DocsPage` 拦截成无刷新跳转。

## 表格和引用

| 能力     | 状态   |
| -------- | ------ |
| 代码高亮 | 已完成 |
| 提示块   | 已完成 |
| 右侧目录 | 已完成 |
| 本地搜索 | 计划中 |
| SSG      | 计划中 |

> 引用的样式和正文共享同一组 CSS 变量，暗色模式自动适配。
