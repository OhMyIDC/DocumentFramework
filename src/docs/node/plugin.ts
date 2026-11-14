import { createHash } from 'node:crypto'
import path from 'node:path'

import matter from 'gray-matter'
import { compileTemplate } from 'vue/compiler-sfc'
import type { Plugin, ViteDevServer } from 'vite'

import { fileToRoute, normalizeBase } from '../shared.ts'
import type { DocsPluginOptions, DocsVirtualConfig } from '../types'
import { renderMarkdown } from './markdown.ts'
import { scanDocs } from './scan.ts'
import type { ScanResult } from './scan.ts'
const VIRTUAL_ID = 'virtual:docs'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

/**
 * 把 docs 目录接入任意 Vite + Vue 应用：
 * - 扫描 Markdown 生成路由元信息（virtual:docs）
 * - 把 Markdown 编译成 Vue 渲染函数
 * - 文件变化时只失效当前页面，侧边栏变化才整页刷新
 */
export function docs(options: DocsPluginOptions = {}): Plugin {
  let root = process.cwd()
  let docsRoot = ''
  let base = '/docs'
  let linkBase = '/docs'
  let isBuild = false
  let cache: ScanResult | null = null

  const rescan = async (): Promise<ScanResult> => {
    try {
      cache = await scanDocs(docsRoot, { includeDrafts: !isBuild })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`[ohmyidc:docs] 找不到文档目录：${docsRoot}`)
      }
      throw error
    }
    return cache
  }

  const refresh = async (server: ViteDevServer): Promise<void> => {
    const previous = cache
    const next = await rescan()
    const sidebarChanged = JSON.stringify(previous?.sidebar) !== JSON.stringify(next.sidebar)

    const virtual = server.moduleGraph.getModuleById(RESOLVED_ID)
    if (virtual) server.moduleGraph.invalidateModule(virtual)

    if (sidebarChanged) server.ws.send({ type: 'full-reload' })
  }

  return {
    name: 'ohmyidc:docs',
    enforce: 'pre',

    configResolved(config) {
      root = config.root
      docsRoot = path.resolve(root, options.root ?? 'docs')
      base = normalizeBase(options.base)

      // 站点的 Vite base + 文档 base，用于编译期写入 <a href>。
      // RouterLink 会自己处理 history base，这里只影响 Markdown 里的原始链接。
      const siteBase =
        config.base === '/' || config.base === './' ? '' : config.base.replace(/\/$/, '')
      linkBase = normalizeBase(`${siteBase}${base}`)

      isBuild = config.command === 'build'
    },

    async buildStart() {
      await rescan()
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },

    async load(id) {
      if (id !== RESOLVED_ID) return null
      const scan = cache ?? (await rescan())
      return generateModule(scan, { options, root, base })
    },

    async transform(source, id) {
      const file = stripQuery(id)
      if (!isMarkdownInside(file, docsRoot)) return null

      const relative = toPosix(path.relative(docsRoot, file))
      return {
        code: await compilePage(source, relative, linkBase, fileToRoute(relative)),
        map: null,
      }
    },

    configureServer(server) {
      const onFileEvent = async (file: string): Promise<void> => {
        if (!isMarkdownInside(file, docsRoot)) return
        await refresh(server)
      }

      server.watcher.on('add', onFileEvent)
      server.watcher.on('unlink', onFileEvent)
    },

    async handleHotUpdate(context) {
      if (!isMarkdownInside(context.file, docsRoot)) return

      await refresh(context.server)

      const modules = context.server.moduleGraph.getModulesByFile(context.file)
      return modules ? [...modules] : undefined
    },
  }
}

interface GenerateOptions {
  options: DocsPluginOptions
  root: string
  base: string
}

function generateModule(scan: ScanResult, context: GenerateOptions): string {
  const { options, root, base } = context

  const pages = scan.pages.map((page) => {
    const relative = toPosix(path.relative(root, page.abs))

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`[ohmyidc:docs] docs 目录必须位于 Vite root 内，当前文件：${page.file}`)
    }

    const meta = {
      path: page.path,
      file: page.file,
      title: page.title,
      description: page.description,
      order: page.order,
      headings: page.headings,
      frontmatter: page.frontmatter,
    }

    return `  {\n    ...${JSON.stringify(meta)},\n    load: () => import(${JSON.stringify(`/${relative}`)}),\n  }`
  })

  const config: DocsVirtualConfig = {
    base,
    title: options.title ?? 'Documentation',
    description: options.description,
    sidebar: options.sidebar ?? scan.sidebar,
    theme: options.theme,
  }

  return `export const config = ${JSON.stringify(config)}\nexport const pages = [\n${pages.join(',\n')}\n]\n`
}

async function compilePage(
  source: string,
  relative: string,
  base: string,
  pagePath: string,
): Promise<string> {
  const parsed = matter(source)
  const { html, headings } = await renderMarkdown(parsed.content, { file: relative, base })
  const hmrId = shortHash(relative)

  const result = compileTemplate({
    source: html,
    filename: relative,
    id: hmrId,
    compilerOptions: {
      hoistStatic: true,
    },
  })

  if (result.errors.length > 0) {
    const message = result.errors
      .map((error) => (typeof error === 'string' ? error : error.message))
      .join('\n')
    throw new Error(`[ohmyidc:docs] 编译 ${relative} 失败：\n${message}`)
  }

  return `${result.code}
import { defineComponent as __odocsDefineComponent } from 'vue'

export const frontmatter = ${JSON.stringify(parsed.data)}
export const headings = ${JSON.stringify(headings)}

const __odocsComponent = __odocsDefineComponent({
  name: ${JSON.stringify(`DocsPage:${relative}`)},
})

__odocsComponent.render = render
__odocsComponent.__file = ${JSON.stringify(relative)}

if (import.meta.hot) {
  __odocsComponent.__hmrId = ${JSON.stringify(hmrId)}

  if (typeof __VUE_HMR_RUNTIME__ !== 'undefined') {
    __VUE_HMR_RUNTIME__.createRecord(__odocsComponent.__hmrId, __odocsComponent)
  }

  import.meta.hot.accept((mod) => {
    if (typeof __VUE_HMR_RUNTIME__ !== 'undefined' && mod) {
      __VUE_HMR_RUNTIME__.reload(__odocsComponent.__hmrId, mod.default)
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ohmyidc:docs-hmr', {
          detail: { path: ${JSON.stringify(pagePath)}, headings: mod?.headings ?? [] },
        }),
      )
    }
  })
}

export default __odocsComponent
`
}

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}

function stripQuery(id: string): string {
  const index = id.indexOf('?')
  return index >= 0 ? id.slice(0, index) : id
}

function isMarkdownInside(file: string, docsRoot: string): boolean {
  if (!file.endsWith('.md')) return false

  const relative = path.relative(docsRoot, file)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/')
}
