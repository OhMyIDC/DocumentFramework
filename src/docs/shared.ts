import type { DocsPageMeta, DocsSidebarItem } from './types'

/** 统一 base 形式：始终以 / 开头，除根路径外不带尾随斜杠。 */
export function normalizeBase(base: string | undefined): string {
  if (!base || base === '/') return '/'
  let value = base.startsWith('/') ? base : `/${base}`
  while (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1)
  return value
}

/** 统一页面路径形式，并把 URL 编码还原成可比较的字符串。 */
export function normalizePagePath(path: string): string {
  let value = path || '/'
  try {
    value = decodeURI(value)
  } catch {
    // 保留原始值，交给后续逻辑处理
  }
  if (!value.startsWith('/')) value = `/${value}`
  while (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1)
  return value
}

/** 把「相对于 docs base 的路径」拼上 base。 */
export function withBase(base: string, path: string): string {
  if (!path) return base
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) return path
  if (path.startsWith('#')) return path

  const value = path.startsWith('/') ? path : `/${path}`
  if (base === '/') return value
  if (value === base || value.startsWith(`${base}/`)) return value
  return value === '/' ? base : `${base}${value}`
}

/** 把完整路由路径（含 base）还原成页面路径。 */
export function toPagePath(routePath: string, base: string): string {
  const value = normalizePagePath(routePath)
  if (base === '/') return value
  if (value === base) return '/'
  if (value.startsWith(`${base}/`)) return value.slice(base.length)
  return value
}

/** Markdown 文件相对路径 -> 页面路由路径。 */
export function fileToRoute(file: string): string {
  let value = file.replace(/\\/g, '/').replace(/\.md$/i, '')
  value = value.replace(/^\.?\//, '').replace(/\/index$/, '')
  if (value === 'index') value = ''
  return `/${value}`.replace(/\/{2,}/g, '/')
}

/** 深度优先展开侧边栏，得到稳定的阅读顺序。 */
export function flattenSidebar(
  items: DocsSidebarItem[],
  result: DocsSidebarItem[] = [],
): DocsSidebarItem[] {
  for (const item of items) {
    if (item.link) result.push(item)
    if (item.items?.length) flattenSidebar(item.items, result)
  }
  return result
}

/** 按 order 再按路径排序，保证每次构建产物稳定。 */
export function comparePages(a: DocsPageMeta, b: DocsPageMeta): number {
  const orderA = a.order ?? 1000
  const orderB = b.order ?? 1000
  if (orderA !== orderB) return orderA - orderB
  return a.path.localeCompare(b.path)
}
