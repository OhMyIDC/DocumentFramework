import { describe, expect, it } from 'vitest'

import { highlightParts, searchDocs } from '../docs/search'
import type { DocsSearchItem } from '../docs/types'

const items: DocsSearchItem[] = [
  {
    path: '/guide/start',
    title: '快速开始',
    description: '从零跑通文档站',
    sections: [
      { id: '目录结构', heading: '目录结构', text: '项目文件和目录说明' },
      { id: '挂载路由', heading: '挂载路由', text: 'router.addRoute 把文档挂到 /docs' },
    ],
  },
  {
    path: '/guide/markdown',
    title: 'Markdown 能力',
    description: '代码高亮、提示块、锚点',
    sections: [
      { id: '标题锚点', heading: '标题锚点', text: '中文标题会自动生成锚点，重复标题追加数字。' },
      {
        id: '代码高亮',
        heading: '代码高亮',
        text: 'Shiki 在构建期完成高亮，切换主题不需要重新渲染。',
      },
    ],
  },
  {
    path: '/about',
    title: '关于',
    sections: [{ id: '', heading: '', text: '这是最小可用版本。' }],
  },
]

describe('searchDocs', () => {
  it('returns nothing for empty queries', () => {
    expect(searchDocs(items, '')).toEqual([])
    expect(searchDocs(items, '   ')).toEqual([])
  })

  it('finds headings and keeps a usable anchor and snippet', () => {
    const [result] = searchDocs(items, '锚点')

    expect(result?.path).toBe('/guide/markdown')
    expect(result?.anchor).toBe('标题锚点')
    expect(result?.heading).toBe('标题锚点')
    expect(result?.snippet).toContain('锚点')
  })

  it('requires every term but allows them to match across title and body', () => {
    const results = searchDocs(items, 'markdown 锚点')

    expect(results).toHaveLength(1)
    expect(results[0]?.path).toBe('/guide/markdown')
  })

  it('matches body text and page description', () => {
    expect(searchDocs(items, 'shiki')[0]?.path).toBe('/guide/markdown')
    expect(searchDocs(items, '跑通')[0]?.path).toBe('/guide/start')
  })

  it('returns at most one result per page', () => {
    const results = searchDocs(items, '标题')
    expect(results.filter((result) => result.path === '/guide/markdown')).toHaveLength(1)
  })

  it('returns no result when a term is missing', () => {
    expect(searchDocs(items, '不存在的词')).toEqual([])
  })
})

describe('highlightParts', () => {
  it('splits matched ranges without dropping text', () => {
    const parts = highlightParts('中文标题会自动生成锚点', '锚点')
    expect(parts.map((part) => part.text).join('')).toBe('中文标题会自动生成锚点')
    expect(parts.filter((part) => part.match).map((part) => part.text)).toEqual(['锚点'])
  })

  it('handles overlapping and repeated terms', () => {
    const parts = highlightParts('markdown 和 Markdown 能力', 'markdown')
    expect(parts.filter((part) => part.match)).toHaveLength(2)
  })
})
