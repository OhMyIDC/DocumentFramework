import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { renderToString } from 'vue/server-renderer'

import App from './App.vue'
import { docs } from './docs-setup'
import { createHostRouter } from './router'

export interface DocsHead {
  title: string
  description?: string
}

export interface RenderResult {
  html: string
  /** 文档页的 head 信息；宿主首页等非文档页为 null，沿用模板默认值。 */
  head: DocsHead | null
}

/**
 * 宿主提供的最小 SSR 入口：给一个 URL，返回完整应用 HTML。
 * SSG 脚本会枚举 prerenderUrls()，逐个调用 render()。
 */
export async function render(url: string): Promise<RenderResult> {
  const app = createSSRApp(App)
  const router = createHostRouter()

  app.use(createPinia())
  app.use(router)
  app.use(docs)

  await router.push(url)
  await router.isReady()

  // 先解析页面模块，水合时客户端能拿到与 SSR 完全一致的首帧。
  const page = docs.getPage(router.currentRoute.value.path)
  if (page) await docs.loadPage(page)

  const html = await renderToString(app)

  return {
    html,
    head: page
      ? {
          title: page.path === '/' ? docs.title : `${page.title} | ${docs.title}`,
          description: page.description,
        }
      : null,
  }
}

/** 需要预渲染的 URL 由宿主决定，这里包含首页和全部文档页。 */
export function prerenderUrls(): string[] {
  const siteBase =
    import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')
  const docsBase = `${siteBase}${docs.base}`
  const pages = docs.pages
    .filter((page) => page.path !== '/')
    .map((page) => `${docsBase}${page.path}`)

  return [...new Set([siteBase || '/', docsBase, ...pages])]
}
