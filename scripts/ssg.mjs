import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { build } from 'vite'

const root = process.cwd()
const clientOut = path.resolve(root, 'dist')
const serverOut = path.resolve(root, 'dist-ssr')

await rm(clientOut, { recursive: true, force: true })
await rm(serverOut, { recursive: true, force: true })

console.log('[ssg] building client bundle…')
await build({
  root,
  logLevel: 'warn',
  // 需要排查水合差异时：DOCS_DEBUG_HYDRATION=1 pnpm build:ssg
  define:
    process.env.DOCS_DEBUG_HYDRATION === '1'
      ? { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true' }
      : undefined,
})

console.log('[ssg] building server bundle…')
await build({
  root,
  logLevel: 'warn',
  build: {
    ssr: 'src/entry-server.ts',
    outDir: 'dist-ssr',
    emptyOutDir: false,
    copyPublicDir: false,
  },
})

const serverEntry = path.join(serverOut, 'entry-server.js')
const { render, prerenderUrls } = await import(pathToFileURL(serverEntry).href)
const template = await readFile(path.join(clientOut, 'index.html'), 'utf8')

if (!template.includes('id="app"')) {
  throw new Error('[ssg] dist/index.html 里找不到 #app 占位节点')
}

const urls = prerenderUrls()

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  )
}

function applyHead(template, head) {
  if (!head) return template

  const title = escapeHtml(head.title)
  const tags = []

  if (head.description) {
    tags.push(`<meta name="description" content="${escapeHtml(head.description)}">`)
  }
  tags.push(`<meta property="og:title" content="${title}">`)
  if (head.description) {
    tags.push(`<meta property="og:description" content="${escapeHtml(head.description)}">`)
  }

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace('</head>', `${tags.join('\n    ')}\n  </head>`)
}

for (const url of urls) {
  const { html, head } = await render(url)
  // pathname 会把中文编码成 %XX；写文件时还原成真实目录名。
  const route = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  const file =
    route === '/'
      ? path.join(clientOut, 'index.html')
      : path.join(clientOut, route.replace(/^\//, ''), 'index.html')

  // 每个页面写一份完整 HTML，深层路径直接访问也能拿到预渲染内容。
  const output = applyHead(template, head).replace(
    /(<div id="app">)\s*(<\/div>)/,
    (_, open, close) => `${open}${html}${close}`,
  )
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, output)
  console.log(`[ssg] ${url} → ${path.relative(clientOut, file)}`)
}

console.log(`[ssg] done, ${urls.length} pages`)

// 服务端产物只在预渲染阶段使用，最终只保留可部署的静态文件。
await rm(serverOut, { recursive: true, force: true })
