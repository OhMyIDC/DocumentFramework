import './styles/index.css'

export { createDocs } from './createDocs'
export type { DocsInstance } from './createDocs'
export { DOCS_KEY, useDocs } from './context'
export { fileToRoute, flattenSidebar, normalizeBase, toPagePath, withBase } from './shared'
export { highlightParts, searchDocs } from './search'
export { default as DocsLink } from './components/DocsLink.vue'
export { default as DocsOutline } from './components/DocsOutline.vue'
export { default as DocsPage } from './components/DocsPage.vue'
export { default as DocsProvider } from './components/DocsProvider.vue'
export { default as DocsRoot } from './components/DocsRoot.vue'
export { default as DocsSearch } from './components/DocsSearch.vue'
export { default as DocsSidebar } from './components/DocsSidebar.vue'

export type {
  DocsConfig,
  DocsContext,
  DocsCurrentPage,
  DocsHeading,
  DocsOptions,
  DocsPageMeta,
  DocsPageModule,
  DocsPluginOptions,
  DocsSearchItem,
  DocsSearchResult,
  DocsSearchSection,
  DocsSidebarItem,
  DocsThemeConfig,
  DocsVirtualConfig,
} from './types'
