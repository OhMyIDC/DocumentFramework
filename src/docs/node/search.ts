import MarkdownIt from 'markdown-it'

import type { DocsSearchItem, DocsSearchSection } from '../types.ts'
import { createSlugger, inlineText } from './text.ts'

const md = new MarkdownIt({ html: false })

/** 单页正文最多索引这么多字符，避免把整本站点塞进客户端。 */
const MAX_SECTION_TEXT = 1600
const MAX_SECTIONS = 40

export interface SearchPageInput {
  path: string
  title: string
  description?: string
}

/**
 * 只用 markdown-it 做词法分析，不跑 Shiki，扫描阶段足够便宜。
 * 代码块不进入索引，正文只保留可读文本。
 */
export function extractSearchItem(source: string, page: SearchPageInput): DocsSearchItem {
  const tokens = md.parse(source, {})
  const slug = createSlugger()
  const sections: DocsSearchSection[] = []
  let current: DocsSearchSection | null = null

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!token) continue

    if (token.type === 'heading_open') {
      const depth = Number(token.tag.slice(1))
      if (depth <= 4) {
        const heading = inlineText(tokens[index + 1])
        current = { id: slug(heading), heading, text: '' }
        sections.push(current)
      }
      continue
    }

    if (token.type !== 'inline') continue
    if (tokens[index - 1]?.type === 'heading_open') continue

    const text = inlineText(token)
    if (!text) continue

    if (!current) {
      current = { id: '', heading: '', text: '' }
      sections.push(current)
    }

    if (current.text.length < MAX_SECTION_TEXT) {
      current.text = `${current.text} ${text}`.trim().slice(0, MAX_SECTION_TEXT)
    }
  }

  return {
    path: page.path,
    title: page.title,
    description: page.description,
    sections: sections.filter((section) => section.heading || section.text).slice(0, MAX_SECTIONS),
  }
}
