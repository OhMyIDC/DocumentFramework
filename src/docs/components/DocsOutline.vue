<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { useDocs } from '../context'
import type { DocsHeading } from '../types'

const docs = useDocs()
const activeId = ref('')
let observer: IntersectionObserver | null = null

const headings = computed<DocsHeading[]>(() =>
  (docs.current.value?.headings ?? []).filter(
    (heading) => heading.depth >= 2 && heading.depth <= 3,
  ),
)

function observe(): void {
  observer?.disconnect()
  activeId.value = ''
  if (typeof window === 'undefined' || headings.value.length === 0) return

  const nodes = headings.value
    .map((heading) => document.getElementById(heading.id))
    .filter((node): node is HTMLElement => node !== null)

  if (nodes.length === 0) return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.find((entry) => entry.isIntersecting)
      if (visible?.target.id) activeId.value = visible.target.id
    },
    { rootMargin: '0px 0px -70% 0px', threshold: 0 },
  )
  for (const node of nodes) observer.observe(node)
}

watch(
  headings,
  async () => {
    await nextTick()
    observe()
  },
  { immediate: true },
)

onBeforeUnmount(() => observer?.disconnect())

function scrollTo(id: string): void {
  const node = document.getElementById(id)
  if (!node) return
  node.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activeId.value = id
  history.replaceState(null, '', `#${id}`)
}
</script>

<template>
  <div v-if="headings.length" class="odocs-outline-inner">
    <p class="odocs-outline-title">本页目录</p>
    <ul class="odocs-outline-list">
      <li
        v-for="heading in headings"
        :key="heading.id"
        :class="[`odocs-outline-depth-${heading.depth}`, { 'is-active': activeId === heading.id }]"
      >
        <a :href="`#${heading.id}`" @click.prevent="scrollTo(heading.id)">{{ heading.text }}</a>
      </li>
    </ul>
  </div>
</template>
