import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

import { docs as docsPlugin } from './src/docs/node/plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // 文档插件必须早于 vue()，它会把 .md 直接编译成 Vue 渲染函数
    docsPlugin({
      root: 'docs',
      base: '/docs',
      title: 'OhMyIDC 文档框架',
      description: '输入 Markdown，输出可以嵌入任意 Vue 应用的文档站。',
    }),
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
