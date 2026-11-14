import { inject } from 'vue'
import type { InjectionKey } from 'vue'
import type { DocsContext } from './types'

export const DOCS_KEY: InjectionKey<DocsContext> = Symbol('ohmyidc:docs')

export function useDocs(): DocsContext {
  const docs = inject(DOCS_KEY)
  if (!docs) {
    throw new Error(
      '[ohmyidc:docs] 找不到文档上下文：请调用 app.use(docs)，或使用 <DocsProvider> 包裹内容。',
    )
  }
  return docs
}
