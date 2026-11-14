import { promises as fs } from 'node:fs'
import path from 'node:path'

import matter from 'gray-matter'

import { fileToRoute } from '../shared.ts'
import type { DocsPageMeta, DocsSearchItem, DocsSidebarItem } from '../types'
import { extractSearchItem } from './search.ts'

export interface ScannedPage extends Omit<DocsPageMeta, 'load'> {
  /** 源文件绝对路径 */
  abs: string
  draft: boolean
}

export interface ScanOptions {
  includeDrafts?: boolean
  /** 是否生成搜索索引，默认 true */
  search?: boolean
}

export interface ScanResult {
  pages: ScannedPage[]
  sidebar: DocsSidebarItem[]
  search: DocsSearchItem[]
}

export async function scanDocs(docsRoot: string, options: ScanOptions = {}): Promise<ScanResult> {
  const files = await walk(docsRoot)
  const pages: ScannedPage[] = []
  const search: DocsSearchItem[] = []

  for (const absolute of files) {
    const file = toPosix(path.relative(docsRoot, absolute))
    const raw = await fs.readFile(absolute, 'utf8')
    const parsed = matter(raw)
    const frontmatter = parsed.data as Record<string, unknown>
    const draft = frontmatter.draft === true

    if (draft && !options.includeDrafts) continue

    const title =
      typeof frontmatter.title === 'string' && frontmatter.title.trim()
        ? frontmatter.title.trim()
        : (extractTitle(parsed.content) ?? humanize(path.basename(file)))

    const route = fileToRoute(file)
    const description =
      typeof frontmatter.description === 'string' ? frontmatter.description : undefined

    pages.push({
      path: route,
      file,
      abs: absolute,
      title,
      description,
      order: typeof frontmatter.order === 'number' ? frontmatter.order : undefined,
      headings: [],
      frontmatter,
      draft,
    })

    if (options.search !== false) {
      search.push(extractSearchItem(parsed.content, { path: route, title, description }))
    }
  }

  pages.sort(compareScanned)

  return {
    pages,
    sidebar: buildSidebar(pages),
    search,
  }
}

function compareScanned(a: ScannedPage, b: ScannedPage): number {
  const orderA = a.order ?? 1000
  const orderB = b.order ?? 1000
  if (orderA !== orderB) return orderA - orderB
  return a.path.localeCompare(b.path)
}

function buildSidebar(pages: ScannedPage[]): DocsSidebarItem[] {
  const groups = new Map<string, ScannedPage[]>()

  for (const page of pages) {
    if (page.path === '/') continue

    const key = page.path.split('/').filter(Boolean)[0]
    if (!key) continue

    const group = groups.get(key)
    if (group) group.push(page)
    else groups.set(key, [page])
  }

  const entries: Array<{ item: DocsSidebarItem; order: number }> = []

  for (const [key, group] of groups) {
    group.sort(compareScanned)

    const indexPage = group.find((page) => page.path === `/${key}`)
    const children = group.filter((page) => page !== indexPage)
    const order =
      indexPage?.order ?? group.reduce((min, page) => Math.min(min, page.order ?? 1000), 1000)

    entries.push({
      order,
      item: {
        text: indexPage?.title ?? humanize(key),
        link: indexPage?.path,
        items: children.length
          ? children.map((page) => ({ text: page.title, link: page.path }))
          : undefined,
      },
    })
  }

  entries.sort((a, b) => a.order - b.order || a.item.text.localeCompare(b.item.text))

  return entries.map((entry) => entry.item)
}

async function walk(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute)))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(absolute)
    }
  }

  return files.sort()
}

function extractTitle(content: string): string | undefined {
  const match = /^#\s+(.+)$/m.exec(content)
  if (!match?.[1]) return undefined

  return match[1]
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()
}

function humanize(value: string): string {
  const base = value.replace(/\.md$/i, '')
  return base.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/')
}
