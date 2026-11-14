import type { DocsSearchItem, DocsSearchResult } from './types'

export interface HighlightPart {
  text: string
  match: boolean
}

const SNIPPET_RADIUS = 110
const MAX_RESULTS = 8

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFKC')
}

function queryTerms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean)
}

function occurrences(haystack: string, term: string): number {
  let count = 0
  let from = 0

  while (from < haystack.length) {
    const index = haystack.indexOf(term, from)
    if (index < 0) break
    count += 1
    from = index + term.length
  }

  return count
}

function buildSnippet(text: string, terms: string[]): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''

  const lower = clean.toLowerCase()
  let start = -1

  for (const term of terms) {
    const index = lower.indexOf(term)
    if (index >= 0 && (start < 0 || index < start)) start = index
  }

  if (start < 0) {
    return clean.length > SNIPPET_RADIUS ? `${clean.slice(0, SNIPPET_RADIUS)}…` : clean
  }

  const from = Math.max(0, start - 50)
  const to = Math.min(clean.length, start + SNIPPET_RADIUS)
  return `${from > 0 ? '…' : ''}${clean.slice(from, to).trim()}${to < clean.length ? '…' : ''}`
}

interface ScoredResult extends DocsSearchResult {
  score: number
}

/**
 * 本地搜索：所有关键词都要命中页面，标题权重最高，
 * 每个页面只保留一个最相关的区块。
 */
export function searchDocs(
  items: DocsSearchItem[],
  query: string,
  limit = MAX_RESULTS,
): DocsSearchResult[] {
  const terms = queryTerms(query)
  if (terms.length === 0) return []

  const scored: ScoredResult[] = []

  for (const item of items) {
    const title = normalize(item.title)
    const sections = item.sections.map((section) => ({
      section,
      heading: normalize(section.heading),
      text: normalize(section.text),
    }))

    const pageText = sections.map((entry) => `${entry.heading} ${entry.text}`).join(' ')
    const pageHaystack = `${title} ${normalize(item.description ?? '')} ${pageText}`
    if (!terms.every((term) => pageHaystack.includes(term))) continue

    let best: (typeof sections)[number] | null = null
    let bestScore = 0

    for (const entry of sections) {
      let score = 0
      for (const term of terms) {
        score += occurrences(title, term) * 40
        score += occurrences(entry.heading, term) * 12
        score += Math.min(occurrences(entry.text, term), 4) * 4
      }

      if (score > bestScore) {
        bestScore = score
        best = entry
      }
    }

    const snippetSource = best?.section.text.trim() || item.description || item.title
    const anchor = best?.section.id || undefined
    const heading =
      best?.section.heading && best.section.heading !== item.title
        ? best.section.heading
        : undefined

    scored.push({
      path: item.path,
      title: item.title,
      heading,
      anchor,
      snippet: buildSnippet(snippetSource, terms),
      score: bestScore,
    })
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))

  return scored.slice(0, limit).map((result) => ({
    path: result.path,
    title: result.title,
    heading: result.heading,
    anchor: result.anchor,
    snippet: result.snippet,
  }))
}

/** 把文本切成普通片段和高亮片段，交给模板渲染，避免 v-html。 */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const terms = queryTerms(query).sort((a, b) => b.length - a.length)
  if (terms.length === 0) return [{ text, match: false }]

  const lower = text.toLowerCase()
  const ranges: Array<[number, number]> = []

  for (const term of terms) {
    let from = 0
    while (from < lower.length) {
      const index = lower.indexOf(term, from)
      if (index < 0) break
      ranges.push([index, index + term.length])
      from = index + term.length
    }
  }

  if (ranges.length === 0) return [{ text, match: false }]

  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []

  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([range[0], range[1]])
  }

  const parts: HighlightPart[] = []
  let cursor = 0

  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false })
    parts.push({ text: text.slice(start, end), match: true })
    cursor = end
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false })

  return parts
}
