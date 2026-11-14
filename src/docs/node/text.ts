import type { Token } from 'markdown-it'

/** 从 inline token 里提取纯文本，忽略链接地址和标记符号。 */
export function inlineText(token: Token | undefined): string {
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

export function slugify(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'section'
}

/** 重复标题共享同一套后缀规则，保证目录、搜索锚点和正文 id 一致。 */
export function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>()

  return (text: string): string => {
    const base = slugify(text)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}
