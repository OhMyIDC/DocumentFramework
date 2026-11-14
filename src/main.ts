import { createApp, createSSRApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { docs } from './docs-setup'
import { createHostRouter } from './router'
import './styles/main.css'

async function bootstrap(): Promise<void> {
  const container = document.querySelector<HTMLElement>('#app')
  if (!container) throw new Error('[ohmyidc] 找不到 #app 挂载节点')

  // SSG 产物里 #app 已经有 SSR HTML，此时走水合；纯 SPA 开发时正常 mount。
  const hydrating = container.childElementCount > 0
  const app = hydrating ? createSSRApp(App) : createApp(App)
  const router = createHostRouter()

  app.use(createPinia())
  app.use(router)
  app.use(docs)

  // 挂载前确定主题，暗色模式下不会先闪一帧白色。
  docs.initTheme()

  await router.isReady()

  if (hydrating) {
    const page = docs.getPage(router.currentRoute.value.path)
    if (page) await docs.loadPage(page)
  }

  app.mount(container)
}

void bootstrap()
