import path from 'node:path'

import { createHighlighter } from 'shiki'
import type { Highlighter } from 'shiki'
import MarkdownIt from 'markdown-it'
import type { MarkdownIt as MarkdownItInstance, Token } from 'markdown-it'
import container from 'markdown-it-container'

import { fileToRoute, withBase } from '../shared.ts'
import type { DocsHeading } from '../types'

const THEMES = {
  light: 'github-light',
  dark: 'github-dark',
} as const

const LANGUAGES = [
  'bash',
  'sh',
  'shell',
  'console',
  'diff',
  'html',
  'css',
  'scss',
  'javascript',
  'js',
  'jsx',
  'typescript',
  'ts',
  'tsx',
  'vue',
  'json',
  'jsonc',
  'yaml',
  'yml',
  'toml',
  'ini',
  'markdown',
  'md',
  'python',
  'go',
  'rust',
  'java',
  'sql',
  'xml',
] as const

const LANGUAGE_ALIASES: Record<string, string> = {
  sh: 'bash',
  shell: 'bash',
  console: 'bash',
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  yml: 'yaml',
  md: 'markdown',
}

const BLOCK_TITLES: Record<string, string> = {
  tip: '提示',
  info: '信息',
  warning: '注意',
  danger: '警告',
}

interface RenderEnv {
  [key: string | symbol]: unknown
  /** 相对于 docs 根目录的 markdown 文件路径 */
  file: string
  /** 文档挂载路径 */
  base: string
}

let markdownPromise: Promise<MarkdownItInstance> | null = null

async function getMarkdown(): Promise<MarkdownItInstance> {
  if (markdownPromise) return markdownPromise

  markdownPromise = (async () => {
    const highlighter = await createHighlighter({
      themes: [THEMES.light, THEMES.dark],
      langs: [...LANGUAGES],
    })

    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: false,
    })

    setupHighlighting(md, highlighter)
    setupHeadings(md)
    setupContainers(md)
    setupLinks(md)

    return md
  })()

  return markdownPromise
}

/**
 * 把 Markdown 编译成可直接塞进 Vue 模板的 HTML，并收集标题。
 * 这是整个框架最核心的一步：HTML 只是中间产物，最终会被 compileTemplate 编译成渲染函数。
 */
export async function renderMarkdown(
  source: string,
  env: RenderEnv,
): Promise<{ html: string; headings: DocsHeading[] }> {
  const md = await getMarkdown()
  const tokens = md.parse(source, env)
  const headings = collectHeadings(tokens)
  const html = md.renderer.render(tokens, md.options, env)
  return { html, headings }
}

function setupHighlighting(md: MarkdownItInstance, highlighter: Highlighter): void {
  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index]
    if (!token) return ''

    const info = token.info.trim()
    const rawLanguage = info.split(/\s+/)[0] ?? ''
    const language = rawLanguage.replace(/\{.*$/, '')

    if (language) {
      const highlighted = highlight(highlighter, token.content, language)
      if (highlighted) return `${highlighted}\n`
    }

    const className = language ? ` class="language-${md.utils.escapeHtml(language)}"` : ''
    return `<pre v-pre><code${className}>${md.utils.escapeHtml(token.content)}</code></pre>\n`
  }

  md.renderer.rules.code_block = (tokens, index) => {
    const token = tokens[index]
    if (!token) return ''
    return `<pre v-pre><code>${md.utils.escapeHtml(token.content)}</code></pre>\n`
  }

  md.renderer.rules.code_inline = (tokens, index) => {
    const token = tokens[index]
    if (!token) return ''
    return `<code v-pre>${md.utils.escapeHtml(token.content)}</code>`
  }
}

function highlight(highlighter: Highlighter, code: string, language: string): string | null {
  const normalized = LANGUAGE_ALIASES[language] ?? language
  if (!highlighter.getLoadedLanguages().includes(normalized)) return null

  try {
    const html = highlighter.codeToHtml(code, {
      lang: normalized,
      themes: {
        light: THEMES.light,
        dark: THEMES.dark,
      },
    })

    // v-pre 让 Vue 编译器不要解析代码里的 {{ }} 和标签
    return html.replace('<pre ', '<pre v-pre ')
  } catch {
    return null
  }
}

function setupHeadings(md: MarkdownItInstance): void {
  md.renderer.rules.heading_open = (tokens, index, options, _env, self) => {
    const token = tokens[index]
    if (!token) return ''

    const open = self.renderToken(tokens, index, options)
    const rawId = token.attrGet('id')
    const id = rawId === null ? '' : String(rawId)
    if (!id || token.tag === 'h1') return open

    return `${open}<a class="odocs-anchor" href="#${encodeURIComponent(id)}" aria-hidden="true">#</a>`
  }
}

function setupContainers(md: MarkdownItInstance): void {
  for (const [type, title] of Object.entries(BLOCK_TITLES)) {
    md.use(container, type, {
      render(tokens, index) {
        const token = tokens[index]
        if (!token) return ''

        if (token.nesting === 1) {
          const custom = token.info.trim().slice(type.length).trim()
          const heading = custom || title
          return `<div class="odocs-block odocs-block-${type}"><p class="odocs-block-title">${md.utils.escapeHtml(heading)}</p>\n`
        }

        return '</div>\n'
      },
    })
  }
}

function setupLinks(md: MarkdownItInstance): void {
  md.core.ruler.push('ohmyidc_links', (state) => {
    const env = state.env as Partial<RenderEnv>

    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue

      for (const child of token.children) {
        if (child.type !== 'link_open') continue

        const href = child.attrGet('href')
        if (href === null) continue

        const rewritten = rewriteHref(String(href), env.file ?? '', env.base ?? '/')
        if (!rewritten) continue

        child.attrSet('href', rewritten)
        child.attrSet('data-odocs-link', '')
      }
    }
  })
}

/**
 * 只改写在文档内部、且以 .md 结尾的链接；外部链接和 public 资源保持原样。
 */
function rewriteHref(href: string, file: string, base: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//') || href.startsWith('#')) {
    return null
  }

  const hashIndex = href.indexOf('#')
  const pathname = hashIndex >= 0 ? href.slice(0, hashIndex) : href
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : ''

  if (!pathname.toLowerCase().endsWith('.md')) return null

  const target = pathname.startsWith('/')
    ? pathname.slice(1)
    : path.posix.normalize(path.posix.join(path.posix.dirname(file), pathname))

  if (target.startsWith('..')) return null

  return `${withBase(base, fileToRoute(target))}${hash}`
}

function collectHeadings(tokens: Token[]): DocsHeading[] {
  const headings: DocsHeading[] = []
  const seen = new Map<string, number>()

  const slug = (text: string): string => {
    const base = slugify(text)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!token || token.type !== 'heading_open') continue

    const depth = Number(token.tag.slice(1))
    const text = inlineText(tokens[index + 1])
    const id = slug(text)

    token.attrSet('id', id)
    headings.push({ id, text, depth })
  }

  return headings
}

function inlineText(token: Token | undefined): string {
  if (!token) return ''
  if (!token.children) return token.content.trim()

  let text = ''
  for (const child of token.children) {
    if (child.type === 'text' || child.type === 'code_inline' || child.type === 'image') {
      text += child.content
    } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
      text += ' '
    }
  }

  return text.trim()
}

function slugify(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'section'
}
