import { createDocs } from './docs'
import { config, pages } from 'virtual:docs'

/** 宿主只需要这一行，就能拿到可挂载的文档实例。 */
export const docs = createDocs({
  ...config,
  pages,
})
