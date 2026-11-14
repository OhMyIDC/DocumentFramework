---
title: 快速开始
order: 1
description: 从零跑通文档站
---

# 快速开始

## 目录结构

```text
.
├─ docs/                  # Markdown 内容
│  ├─ index.md            # 文档首页
│  ├─ guide/
│  │  ├─ index.md         # 分组首页
│  │  └─ start.md
│  └─ about.md
├─ src/
│  ├─ docs/               # 框架运行时与 Vite 插件
│  ├─ docs-setup.ts       # 宿主创建文档实例
│  └─ router/index.ts     # 宿主路由
└─ vite.config.ts
```

## 一次构建发生了什么

1. Vite 插件扫描 `docs/**/*.md`，读取 frontmatter，生成侧边栏和页面元信息。
2. 每个 `.md` 被编译成一段 HTML，再交给 `compileTemplate` 变成 Vue 渲染函数。
3. 页面模块通过 `virtual:docs` 暴露给宿主，用动态 `import()` 按需加载。
4. 宿主 router 把文档挂在父路由下，剩下的交给 Vue。

::: info 为什么不用运行时 Markdown
把 `markdown-it` 和 Shiki 打进浏览器会显著增加体积，还会带来 XSS 风险。构建期编译后，运行时只多出页面组件本身。
:::

## 创建文档实例

宿主只需要一个文件：

```ts
// src/docs-setup.ts
import { createDocs } from './docs'
import { config, pages } from 'virtual:docs'

export const docs = createDocs({
  ...config,
  pages,
})
```

然后在入口注册：

```ts
app.use(docs)
```

## 挂载路由

```ts
router.addRoute({
  path: docs.base,
  component: docs.Root,
  children: docs.routes(),
})
```

`docs.routes()` 只返回两个路由记录：分组首页和一个 catch-all。具体渲染哪个页面，由 `DocsPage` 根据当前路径查表决定。

## 修改内容

编辑任意 Markdown 文件，保存即可看到更新。插件只失效当前页面模块；如果新增或删除文件导致侧边栏变化，才会整页刷新。

下一步：[嵌入到宿主](./embed.md)。
