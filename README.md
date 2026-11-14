# OhMyIDC Document Framework

输入 Markdown，输出可以**独立部署**、也可以**挂进任意 Vue 应用**的文档站。

和 VitePress 最大的区别：这个框架不拥有 App。宿主继续使用自己的 router、history 模式、SSR 和全局样式，文档只提供路由片段、页面组件和布局原语。独立模式只是一个「只装了文档的宿主壳」。

## 当前状态

这是 MVP，已经跑通：

- Vite 插件扫描 `docs/**/*.md`，生成路由元信息和侧边栏。
- Markdown 在构建期编译成 Vue 渲染函数，运行时不需要 Markdown 解析器。
- 宿主 router 挂载 `/docs` 子树，不创建第二个 router。
- 相对 `.md` 链接改写、标题锚点、右侧目录、上一页/下一页。
- Shiki 双主题代码高亮、`::: tip` 系列提示块。
- 页面级 HMR；新增/删除文件导致侧边栏变化时整页刷新。
- SSG：`pnpm build:ssg` 为每个文档页生成可直访的静态 HTML，并在客户端水合。

还没做：独立 CLI、本地搜索、主题扩展 API、i18n、版本化、Nuxt 模块、Shadow DOM 隔离。

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:5173/docs>。

```bash
pnpm build        # 类型检查 + 生产构建（SPA 产物）
pnpm build:ssg    # 类型检查 + SSG 预渲染
pnpm test:unit    # Vitest
pnpm test:e2e     # Playwright（开发服务器）
pnpm test:ssg     # 构建 SSG 并检查预渲染与水合
```

Playwright 默认复用 `/Applications/Chromium.app`（可用 `CHROMIUM_PATH` 覆盖），CI 上回退到 Playwright 自带浏览器。

## 目录结构

```text
.
├─ docs/                     # Markdown 内容
│  ├─ index.md               # 文档首页
│  ├─ guide/
│  │  ├─ index.md            # 分组首页，同时作为侧边栏分组标题
│  │  ├─ start.md
│  │  ├─ embed.md
│  │  └─ markdown.md
│  └─ about.md
├─ src/
│  ├─ docs/                  # 框架本体
│  │  ├─ components/         # Root / Page / Sidebar / Outline / Link / Provider
│  │  ├─ node/               # Vite 插件、扫描、Markdown 编译（仅 Node）
│  │  ├─ styles/             # .odocs 命名空间下的默认主题
│  │  ├─ createDocs.ts       # 运行时工厂
│  │  ├─ shared.ts           # base / 路由路径工具
│  │  └─ types.ts
│  ├─ docs-setup.ts          # 宿主创建文档实例
│  ├─ entry-server.ts        # SSR 入口：render(url) + prerenderUrls()
│  ├─ router/index.ts        # 宿主路由，挂载 docs 子树
│  └─ main.ts                # 客户端入口，SSG 页面上自动水合
├─ scripts/
│  ├─ ssg.mjs                # 客户端 + 服务端构建，逐页写 HTML
│  └─ check-ssg.mjs          # 校验预渲染 HTML 与水合
├─ vite.config.ts
└─ playwright.config.ts
```

`src/docs/node/**` 只参与构建，不会进入客户端 bundle。

## 宿主如何集成

### 1. 注册 Vite 插件

```ts
// vite.config.ts
import { docs } from './src/docs/node/plugin.ts'

export default defineConfig({
  plugins: [docs({ root: 'docs', base: '/docs', title: '产品文档' }), vue()],
})
```

插件生成 `virtual:docs`：

```ts
export const config = { base: '/docs', title: '产品文档', sidebar: [...] }
export const pages = [
  { path: '/guide/start', title: '快速开始', load: () => import('/docs/guide/start.md') },
]
```

### 2. 创建实例

```ts
// src/docs-setup.ts
import { createDocs } from './docs'
import { config, pages } from 'virtual:docs'

export const docs = createDocs({ ...config, pages })
```

```ts
// src/main.ts
app.use(docs)
```

### 3. 挂路由

```ts
// src/router/index.ts
router.addRoute({
  path: docs.base,
  component: docs.Root,
  children: docs.routes(),
})
```

`docs.routes()` 只返回两个路由记录（首页 + catch-all），具体页面由 `DocsPage` 按当前路径查表并动态加载。

## 嵌入深度

```vue
<!-- 全布局 -->
<DocsRoot />

<!-- 只内容：宿主自己管壳 -->
<DocsProvider :docs="docs">
  <MyShell><RouterView /></MyShell>
</DocsProvider>

<!-- Headless：拿原语自己拼 -->
<DocsSidebar />
<DocsPage />
<DocsOutline />
```

## 静态生成（SSG）

`pnpm build:ssg` 先构建客户端，再把 `src/entry-server.ts` 构建成 Node 侧入口，逐页渲染并写回 `dist`：

```text
dist/
├─ index.html
├─ assets/…
└─ docs/
   ├─ index.html
   ├─ about/index.html
   └─ guide/start/index.html
```

宿主需要提供两个导出：

```ts
// src/entry-server.ts
export async function render(url: string): Promise<{ html: string }>
export function prerenderUrls(): string[]
```

- `render()` 为每个 URL 创建独立的 `createSSRApp` 和内存 router，预加载当前页面模块后调用 `renderToString`。
- `prerenderUrls()` 决定生成哪些 HTML；文档页由 `docs.pages` 自动推导。
- 客户端启动时如果发现 `#app` 已有内容，会改用 `createSSRApp` 水合，并在 `mount` 前预加载当前页，让首帧直接拿到相同的页面内容。
- 静态托管需要把 `/docs/guide/start` 解析到 `docs/guide/start/index.html`，也就是支持目录索引（大多数静态托管默认支持）。

## 设计约束

- **不碰全局**：模块顶层不访问 `window` / `document`；不修改 `document.title` 和 `<html>` class。
- **样式不越界**：所有选择器收在 `.odocs` 下，默认不注入 reset。
- **base 感知**：编译期写入 `<a href>` 的路径同时包含 Vite base 和文档 base；`RouterLink` 由宿主 router 处理 history base。
- **多实例安全**：`createDocs()` 是工厂，上下文通过 `provide/inject` 传递，不使用模块级可变单例。
- **docs 目录必须在 Vite root 内**（当前版本限制）。

## Markdown 约定

- frontmatter：`title`、`description`、`order`、`draft`。
- 页面标题取 frontmatter `title`，其次取正文第一个 `#` 标题，最后回退到文件名。
- 相对链接 `./next.md#安装` 会在编译期改写为带 base 的文档路径。
- 代码块自动加 `v-pre`，里面的 `{{ }}` 和标签不会被 Vue 编译。
- `::: tip` / `::: info` / `::: warning` / `::: danger` 生成提示块。

## 已知限制

- 相对图片路径暂未处理，图片请放在 `public/` 并用绝对路径引用。
- SSG 目前不会为每个页面写入独立的 `<title>` / meta，标题仍由宿主控制。
- 用户保存了暗色主题时，水合前后会修补一次 `data-theme`（生产环境无警告，暗色首屏可能有一帧差异）。
- 搜索结果、主题覆盖 API 尚未实现。
- 侧边栏只按一级目录分组，二级目录会平铺。
