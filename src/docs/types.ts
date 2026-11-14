import type { Component, Ref, ShallowRef } from 'vue'

/** 一个 Markdown 标题，用于右侧目录。 */
export interface DocsHeading {
  id: string
  text: string
  depth: number
}

/** Markdown 页面模块在运行时的导出。 */
export interface DocsPageModule {
  default: Component
  headings?: DocsHeading[]
  frontmatter?: Record<string, unknown>
}

/** 一个文档页面的元信息。 */
export interface DocsPageMeta {
  /** 相对于 docs base 的路由路径，始终以 / 开头，例如 /guide/start */
  path: string
  /** 相对于 docs 根目录的文件路径，例如 guide/start.md */
  file: string
  title: string
  description?: string
  order?: number
  headings: DocsHeading[]
  frontmatter: Record<string, unknown>
  /** 动态加载编译后的页面组件 */
  load: () => Promise<DocsPageModule>
}

/** 当前正在展示的页面。 */
export interface DocsCurrentPage extends DocsPageMeta {
  headings: DocsHeading[]
}

export interface DocsSidebarItem {
  text: string
  link?: string
  items?: DocsSidebarItem[]
}

export interface DocsThemeConfig {
  sidebar?: boolean
  outline?: boolean
  prevNext?: boolean
}

/** 构建期写入 virtual:docs 的配置。 */
export interface DocsConfig {
  base: string
  title: string
  description?: string
  sidebar: DocsSidebarItem[]
  theme?: DocsThemeConfig
}

/** createDocs() 的入参。 */
export interface DocsOptions extends Partial<DocsConfig> {
  pages: DocsPageMeta[]
}

/** virtual:docs 模块导出的配置。 */
export type DocsVirtualConfig = DocsConfig

/** 通过 provide/inject 共享的运行时上下文。 */
export interface DocsContext {
  readonly base: string
  readonly title: string
  readonly description?: string
  readonly pages: DocsPageMeta[]
  readonly sidebar: DocsSidebarItem[]
  readonly theme: DocsThemeConfig
  readonly current: ShallowRef<DocsCurrentPage | null>
  readonly dark: Ref<boolean>
  getPage(routePath: string): DocsPageMeta | undefined
  /** 加载页面模块，同一个页面只会真正 import 一次。 */
  loadPage(page: DocsPageMeta): Promise<DocsPageModule>
  /** 同步读取已经加载过的页面模块，供水合时首帧使用。 */
  getLoadedPage(routePath: string): DocsPageModule | undefined
  toPagePath(routePath: string): string
  withBase(path: string): string
  initTheme(): void
  setDark(value: boolean): void
  toggleDark(): void
}

/** Vite 插件配置。 */
export interface DocsPluginOptions {
  /** Markdown 目录，相对 Vite root，默认 docs */
  root?: string
  /** 挂载路径，必须与宿主的 router 父路由一致，默认 /docs */
  base?: string
  title?: string
  description?: string
  /** 显式侧边栏；不传则按目录自动生成 */
  sidebar?: DocsSidebarItem[]
  theme?: DocsThemeConfig
}
