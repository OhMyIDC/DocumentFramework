<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, routerKey, useRoute } from 'vue-router'

import { useDocs } from '../context'
import { highlightParts, searchDocs } from '../search'
import type { DocsSearchResult } from '../types'

const docs = useDocs()
const router = inject(routerKey, null)
const route = useRoute()

const open = ref(false)
const query = ref('')
const active = ref(0)
const input = ref<HTMLInputElement | null>(null)

const enabled = computed(() => docs.theme.search !== false && docs.search.value.length > 0)
const results = computed(() => searchDocs(docs.search.value, query.value))

watch(results, () => {
  active.value = 0
})

watch(open, async (value) => {
  if (!value) return
  active.value = 0
  await nextTick()
  input.value?.focus()
})

watch(
  () => route.fullPath,
  () => close(),
)

function openSearch(): void {
  if (!enabled.value) return
  open.value = true
}

function close(): void {
  if (!open.value) return
  open.value = false
  query.value = ''
}

function targetFor(result: DocsSearchResult): string {
  const path = result.anchor ? `${result.path}#${result.anchor}` : result.path
  return docs.withBase(path)
}

function go(result: DocsSearchResult | undefined): void {
  if (!result || !router) return
  close()
  void router.push(targetFor(result))
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if (!enabled.value) return

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    if (open.value) close()
    else openSearch()
    return
  }

  if (event.key === '/' && !open.value && !isEditable(event.target)) {
    event.preventDefault()
    openSearch()
  }
}

function onInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (results.value.length === 0) return
    const step = event.key === 'ArrowDown' ? 1 : -1
    active.value = (active.value + step + results.value.length) % results.value.length
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    go(results.value[active.value])
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <div v-if="enabled" class="odocs-search">
    <button
      type="button"
      class="odocs-search-trigger"
      aria-label="搜索文档"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="openSearch"
    >
      <span class="odocs-search-icon" aria-hidden="true">⌕</span>
      <span class="odocs-search-trigger-text">搜索</span>
      <kbd>/</kbd>
    </button>

    <div v-if="open" class="odocs-search-overlay" @click.self="close">
      <div class="odocs-search-dialog" role="dialog" aria-modal="true" aria-label="搜索文档">
        <input
          ref="input"
          v-model="query"
          class="odocs-search-input"
          type="search"
          placeholder="搜索标题、正文…"
          aria-label="搜索关键词"
          autocomplete="off"
          spellcheck="false"
          @keydown="onInputKeydown"
        />

        <div class="odocs-search-results">
          <p v-if="!query.trim()" class="odocs-search-hint">输入关键词开始搜索，Esc 关闭</p>
          <p v-else-if="results.length === 0" class="odocs-search-empty">没有找到结果</p>

          <ul v-else class="odocs-search-list">
            <li v-for="(result, index) in results" :key="`${result.path}#${result.anchor ?? ''}`">
              <RouterLink
                v-if="router"
                :to="targetFor(result)"
                class="odocs-search-result"
                :class="{ 'is-active': index === active }"
                @mousemove="active = index"
                @click="close"
              >
                <span class="odocs-search-result-title">{{ result.title }}</span>
                <span v-if="result.heading" class="odocs-search-result-heading">
                  {{ result.heading }}
                </span>
                <span class="odocs-search-result-snippet">
                  <template
                    v-for="(part, partIndex) in highlightParts(result.snippet, query)"
                    :key="partIndex"
                  >
                    <span v-if="part.match" class="odocs-search-match">{{ part.text }}</span>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </span>
              </RouterLink>

              <a v-else :href="targetFor(result)" class="odocs-search-result" @click="close">
                <span class="odocs-search-result-title">{{ result.title }}</span>
                <span v-if="result.heading" class="odocs-search-result-heading">
                  {{ result.heading }}
                </span>
                <span class="odocs-search-result-snippet">{{ result.snippet }}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
