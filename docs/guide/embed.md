---
title: 嵌入到宿主
order: 2
description: 把文档挂进现有 Vue 应用的任意路径
---

# 嵌入到宿主

目标：宿主继续使用自己的 router、history 模式、SSR 和全局样式，文档只是挂在某个父路由下的一棵子树。

## 1. 在宿主的 Vite 配置里注册插件

```ts
// vite.config.ts
import { docs } from '@ohmyidc/docs/vite'

export default defineConfig({
  plugins: [
    vue(),
    docs({
      root: 'docs',
      base: '/docs',
      title: '产品文档',
    }),
  ],
})
```

插件会生成两个虚拟导出：

```ts
// virtual:docs
export const config = { base: '/docs', title: '产品文档', sidebar: [...] }
export const pages = [
  {
    path: '/guide/start',
    title: '快速开始',
    load: () => import('/docs/guide/start.md'),
  },
]
```

## 2. 创建实例并注册

```ts
// main.ts
import { createDocs } from '@ohmyidc/docs'
import { config, pages } from 'virtual:docs'
import '@ohmyidc/docs/style.css'

const docs = createDocs({ ...config, pages })

app.use(docs)
```

## 3. 挂到宿主 router

```ts
// router/index.ts
router.addRoute({
  path: docs.base,
  component: docs.Root,
  children: docs.routes(),
})
```

不要创建第二个 router。URL 同步、导航守卫、滚动恢复都应该由宿主负责。

## 三种嵌入深度

```vue
<!-- 全布局：导航 + 侧边栏 + 正文 + 目录 -->
<DocsRoot />

<!-- 只内容：宿主自己管壳 -->
<DocsProvider :docs="docs">
  <MyShell>
    <RouterView />
  </MyShell>
</DocsProvider>

<!-- Headless：拿原语自己拼 -->
<DocsSidebar />
<DocsPage />
<DocsOutline />
```

产品内嵌文档通常用第二种：文档长在产品页面里，导航由产品提供。

## 必须遵守的约束

::: warning 不要碰全局
模块顶层不要访问 `window` 或 `document`；不要修改 `document.title` 和 `<html>` 的 class。否则嵌入 SSR 宿主时会直接失败。
:::

- 所有链接走 `withBase()`，编译期不写死 `/`。
- 样式收在 `.odocs` 命名空间，默认不注入 reset。
- 多实例场景下不要用模块级单例，`createDocs()` 每次返回独立上下文。

## 下一步

- [Markdown 能力](./markdown.md)
- 回到 [指南首页](./index.md)
