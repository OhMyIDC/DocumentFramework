import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'

import { docs } from '../docs-setup'
import HomeView from '../views/HomeView.vue'

/** 每个请求/客户端实例都需要独立的 router，SSR 时使用内存 history。 */
export function createHostRouter() {
  return createRouter({
    history: import.meta.env.SSR
      ? createMemoryHistory(import.meta.env.BASE_URL)
      : createWebHistory(import.meta.env.BASE_URL),
    routes: [
      {
        path: '/',
        name: 'home',
        component: HomeView,
      },
      {
        path: docs.base,
        component: docs.Root,
        children: docs.routes(),
      },
    ],
    scrollBehavior(_to, _from, savedPosition) {
      if (savedPosition) return savedPosition
      // 文档正文是异步加载的，hash 滚动由 DocsPage 在内容渲染后处理。
      return { top: 0 }
    },
  })
}
