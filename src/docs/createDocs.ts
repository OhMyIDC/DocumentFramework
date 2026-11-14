import { ref, shallowRef } from 'vue'
import type { App, Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'

import DocsLink from './components/DocsLink.vue'
import DocsOutline from './components/DocsOutline.vue'
import DocsPage from './components/DocsPage.vue'
import DocsProvider from './components/DocsProvider.vue'
import DocsRoot from './components/DocsRoot.vue'
import DocsSidebar from './components/DocsSidebar.vue'
import { DOCS_KEY } from './context'
import { comparePages, normalizeBase, normalizePagePath, toPagePath, withBase } from './shared'
import type {
  DocsContext,
  DocsCurrentPage,
  DocsOptions,
  DocsPageMeta,
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
  let themeInitialized = false

  const sidebar: DocsSidebarItem[] = options.sidebar ?? []

  const getPage = (routePath: string): DocsPageMeta | undefined => {
    return pageMap.get(normalizePagePath(toPagePath(routePath, base)))
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
    current,
    dark,
    getPage,
    toPagePath: (routePath) => toPagePath(routePath, base),
    withBase: (path) => withBase(base, path),
    initTheme,
    setDark,
    toggleDark: () => setDark(!dark.value),
  }

  const routes = (): RouteRecordRaw[] => [
    { path: '', component: DocsPage },
    { path: ':pathMatch(.*)*', component: DocsPage },
  ]

  const install = (app: App): void => {
    app.provide(DOCS_KEY, context)
    app.component('DocsLink', DocsLink)
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
      DocsSidebar,
      DocsOutline,
    },
  }
}
