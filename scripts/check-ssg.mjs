import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import { chromium } from '@playwright/test'

const root = process.cwd()
const dist = path.resolve(root, 'dist')
const port = Number(process.env.SSG_PORT ?? 4321)
const origin = `http://127.0.0.1:${port}`

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon',
}

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0])
  const target = path.join(dist, clean)
  if (path.relative(dist, target).startsWith('..')) return null

  for (const candidate of [target, path.join(target, 'index.html')]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate
    } catch {
      // 继续尝试下一个候选
    }
  }
  return null
}

const server = createServer(async (request, response) => {
  const file = await resolveFile(request.url ?? '/')
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('not found')
    return
  }

  response.writeHead(200, {
    'content-type': contentTypes[path.extname(file)] ?? 'application/octet-stream',
  })
  response.end(await readFile(file))
})

const failures = []
function check(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    return
  }
  failures.push(message)
  console.error(`  ✗ ${message}`)
}

await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))

const pages = [
  ['/docs', 'OhMyIDC 文档框架'],
  ['/docs/guide/start', '快速开始'],
  ['/docs/guide/markdown', 'Markdown 能力'],
  ['/docs/about', '关于'],
]

try {
  console.log('\n[ssg] 检查预渲染 HTML')
  for (const [url, title] of pages) {
    const html = await (await fetch(`${origin}${url}`)).text()
    check(html.includes('<div class="odocs-markdown">'), `${url} 包含预渲染正文`)
    check(html.includes(`<h1`), `${url} 包含 h1`)
    check(!html.includes('正在加载'), `${url} 不含加载占位`)
    check(html.includes(title), `${url} 包含标题「${title}」`)
  }

  console.log('\n[ssg] 检查水合与交互')
  const localChromium =
    process.env.CHROMIUM_PATH ?? '/Applications/Chromium.app/Contents/MacOS/Chromium'
  const executablePath = existsSync(localChromium) ? localChromium : undefined
  const browser = await chromium.launch(executablePath ? { executablePath } : {})
  const page = await browser.newPage()
  const consoleIssues = []

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => consoleIssues.push(`pageerror: ${error.message}`))

  // 直接访问深层路径：SSG 的核心收益
  const response = await page.goto(`${origin}/docs/guide/start`)
  check(response?.status() === 200, '直接访问 /docs/guide/start 返回 200')
  await page.waitForSelector('.odocs-content h1')
  check((await page.locator('.odocs-content h1').textContent()) === '快速开始', '深层路径正文正确')
  check((await page.locator('.odocs-loading').count()) === 0, '水合后没有加载占位')

  // 刷新仍然可用
  await page.reload()
  await page.waitForSelector('.odocs-content h1')
  check((await page.locator('.odocs-content h1').textContent()) === '快速开始', '刷新后正文正确')

  // 水合后的交互
  await page.locator('.odocs-icon-button').click()
  await page.waitForFunction(
    () => document.querySelector('.odocs')?.getAttribute('data-theme') === 'dark',
  )
  check(true, '主题切换可用')

  await page.locator('.odocs-content a[data-odocs-link]').last().click()
  await page.waitForURL('**/docs/guide/embed')
  await page.waitForSelector('.odocs-content h1')
  check(
    (await page.locator('.odocs-content h1').textContent()) === '嵌入到宿主',
    '客户端路由跳转可用',
  )

  check(
    consoleIssues.length === 0,
    `控制台没有报错或警告${consoleIssues.length ? `：${consoleIssues.join(' | ')}` : ''}`,
  )

  await browser.close()
} finally {
  server.close()
}

if (failures.length > 0) {
  console.error(`\n[ssg] ${failures.length} 项检查失败`)
  process.exit(1)
}

console.log('\n[ssg] 全部检查通过')
