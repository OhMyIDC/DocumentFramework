import { ref, shallowRef } from 'vue'
import type { App, Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'

import DocsLink from './components/DocsLink.vue'
import DocsOutline from './components/DocsOutline.vue'
import DocsPage from './components/DocsPage.vue'
import DocsProvider from './components/DocsProvider.vue'
import DocsRoot from './components/DocsRoot.vue'
import DocsSearch from './components/DocsSearch.vue'
import DocsSidebar from './components/DocsSidebar.vue'
import { DOCS_KEY } from './context'
import { comparePages, normalizeBase, normalizePagePath, toPagePath, withBase } from './shared'
import type {
  DocsContext,
  DocsCurrentPage,
  DocsOptions,
  DocsPageMeta,
  DocsPageModule,
  DocsSearchItem,
  DocsSidebarItem,
} from './types'

const THEME_STORAGE_KEY = 'ohmyidc-docs-theme'

export interface DocsInstance extends DocsContext {
  install(app: App): void
  routes(): RouteRecordRaw[]
  Root: Component
  Page: Component
  Provider: Component
  components: Record<string, Component>
}

/**
 * 创建一个可以挂进任意 Vue 应用的文档实例。
 *
 * 独立站点只是「一个只装了文档的宿主」，所以独立模式和嵌入式模式共用这一套运行时。
 */
export function createDocs(options: DocsOptions): DocsInstance {
  const base = normalizeBase(options.base)
  const pages = [...options.pages].sort(comparePages)
  const pageMap = new Map(pages.map((page) => [normalizePagePath(page.path), page]))

  const current = shallowRef<DocsCurrentPage | null>(null)
  const dark = ref(false)
  const search = shallowRef<DocsSearchItem[]>(options.search ?? [])
  let themeInitialized = false

  // 页面模块缓存：SSR 预加载后，客户端水合时可以直接同步拿到首帧组件。
  const loadedPages = new Map<string, DocsPageModule>()
  const pendingPages = new Map<string, Promise<DocsPageModule>>()

  const sidebar: DocsSidebarItem[] = options.sidebar ?? []

  const getPage = (routePath: string): DocsPageMeta | undefined => {
    return pageMap.get(normalizePagePath(toPagePath(routePath, base)))
  }

  const getLoadedPage = (routePath: string): DocsPageModule | undefined => {
    const page = getPage(routePath)
    return page ? loadedPages.get(page.path) : undefined
  }

  const loadPage = (page: DocsPageMeta): Promise<DocsPageModule> => {
    const loaded = loadedPages.get(page.path)
    if (loaded) return Promise.resolve(loaded)

    const pending = pendingPages.get(page.path)
    if (pending) return pending

    const promise = page
      .load()
      .then((module) => {
        loadedPages.set(page.path, module)
        return module
      })
      .finally(() => {
        pendingPages.delete(page.path)
      })

    pendingPages.set(page.path, promise)
    return promise
  }

  const initTheme = (): void => {
    if (themeInitialized || typeof window === 'undefined') return
    themeInitialized = true
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
      dark.value = saved
        ? saved === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      dark.value = false
    }
  }

  const setDark = (value: boolean): void => {
    dark.value = value
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, value ? 'dark' : 'light')
    } catch {
      // 忽略隐私模式下的存储异常
    }
  }

  const context: DocsContext = {
    base,
    title: options.title ?? 'Documentation',
    description: options.description,
    pages,
    sidebar,
    theme: options.theme ?? {},
    search,
    current,
    dark,
    getPage,
    loadPage,
    getLoadedPage,
    toPagePath: (routePath) => toPagePath(routePath, base),
    withBase: (path) => withBase(base, path),
    initTheme,
    setDark,
    toggleDark: () => setDark(!dark.value),
    setSearch: (items) => {
      search.value = items
    },
  }

  // 开发期编辑 Markdown 时，插件会把重新扫描出的索引推过来，避免搜索命中旧内容。
  if (import.meta.hot) {
    import.meta.hot.on('ohmyidc:docs-search', (items: DocsSearchItem[]) => {
      search.value = items
    })
  }

  const routes = (): RouteRecordRaw[] => [
    { path: '', component: DocsPage },
    { path: ':pathMatch(.*)*', component: DocsPage },
  ]

  const install = (app: App): void => {
    app.provide(DOCS_KEY, context)
    app.component('DocsLink', DocsLink)
    app.component('DocsSearch', DocsSearch)
    app.component('DocsSidebar', DocsSidebar)
    app.component('DocsOutline', DocsOutline)
  }

  return {
    ...context,
    install,
    routes,
    Root: DocsRoot,
    Page: DocsPage,
    Provider: DocsProvider,
    components: {
      DocsLink,
      DocsSearch,
      DocsSidebar,
      DocsOutline,
    },
  }
}
