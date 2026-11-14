<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { Component } from 'vue'
import { routerKey, useRoute } from 'vue-router'

import { useDocs } from '../context'
import type { DocsHeading, DocsPageMeta } from '../types'
import DocsLink from './DocsLink.vue'

const docs = useDocs()
const route = useRoute()
const router = inject(routerKey, null)

const component = shallowRef<Component | null>(null)
const meta = ref<DocsPageMeta | null>(null)
const loading = ref(false)

let requestId = 0

const orderedPages = computed(() => docs.pages.filter((page) => page.path !== '/'))

const currentIndex = computed(() => {
  const path = meta.value?.path
  if (!path) return -1
  return orderedPages.value.findIndex((page) => page.path === path)
})

const prev = computed(() => {
  if (currentIndex.value <= 0) return null
  return orderedPages.value[currentIndex.value - 1] ?? null
})

const next = computed(() => {
  if (currentIndex.value < 0) return null
  return orderedPages.value[currentIndex.value + 1] ?? null
})

function scrollToLocation(): void {
  if (typeof window === 'undefined') return
  if (route.hash) {
    let id = route.hash.slice(1)
    try {
      id = decodeURIComponent(id)
    } catch {
      // 使用原始 hash
    }
    const node = document.getElementById(id)
    if (node) {
      node.scrollIntoView({ block: 'start' })
      return
    }
  }
  window.scrollTo(0, 0)
}

watch(
  () => route.path,
  async () => {
    const request = ++requestId
    const found = docs.getPage(route.path) ?? null
    meta.value = found
    component.value = null

    if (!found) {
      docs.current.value = null
      loading.value = false
      return
    }

    loading.value = true
    try {
      const module = await found.load()
      if (request !== requestId) return

      const headings = module.headings?.length ? module.headings : found.headings
      docs.current.value = { ...found, headings }
      component.value = module.default
      await nextTick()
      scrollToLocation()
    } finally {
      if (request === requestId) loading.value = false
    }
  },
  { immediate: true },
)

function onDocsHmr(event: Event): void {
  const detail = (event as CustomEvent<{ path?: string; headings?: DocsHeading[] }>).detail
  if (!detail?.path || detail.path !== meta.value?.path) return

  const current = docs.current.value
  if (!current) return

  docs.current.value = { ...current, headings: detail.headings ?? current.headings }
}

onMounted(() => {
  window.addEventListener('ohmyidc:docs-hmr', onDocsHmr)
})
onBeforeUnmount(() => {
  window.removeEventListener('ohmyidc:docs-hmr', onDocsHmr)
})

function onClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (!router) return

  const target = event.target
  if (!(target instanceof Element)) return

  const anchor = target.closest<HTMLAnchorElement>('a[data-odocs-link]')
  if (!anchor) return

  const href = anchor.getAttribute('href')
  if (!href || anchor.target === '_blank') return

  event.preventDefault()
  void router.push(href)
}
</script>

<template>
  <article class="odocs-content" @click="onClick">
    <div v-if="loading && !component" class="odocs-loading">正在加载…</div>

    <div v-else-if="!meta" class="odocs-not-found">
      <h1>404</h1>
      <p>找不到这个页面。</p>
      <DocsLink to="/">返回文档首页</DocsLink>
    </div>

    <component :is="component" v-else-if="component" />

    <nav v-if="meta && docs.theme.prevNext !== false" class="odocs-prev-next" aria-label="翻页">
      <DocsLink v-if="prev" :to="prev.path" class="odocs-prev">
        <span class="odocs-prev-next-label">上一页</span>
        <span>{{ prev.title }}</span>
      </DocsLink>
      <span v-else class="odocs-prev-next-spacer" />

      <DocsLink v-if="next" :to="next.path" class="odocs-next">
        <span class="odocs-prev-next-label">下一页</span>
        <span>{{ next.title }}</span>
      </DocsLink>
    </nav>
  </article>
</template>
