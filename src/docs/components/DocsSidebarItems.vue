<script setup lang="ts">
import DocsLink from './DocsLink.vue'
import type { DocsSidebarItem } from '../types'

withDefaults(
  defineProps<{
    items: DocsSidebarItem[]
    depth?: number
  }>(),
  { depth: 0 },
)
</script>

<template>
  <ul class="odocs-sidebar-list" :class="`odocs-sidebar-depth-${depth}`">
    <li v-for="item in items" :key="`${item.text}:${item.link ?? ''}`" class="odocs-sidebar-item">
      <DocsLink v-if="item.link" :to="item.link">{{ item.text }}</DocsLink>
      <span v-else class="odocs-sidebar-group">{{ item.text }}</span>
      <DocsSidebarItems v-if="item.items?.length" :items="item.items" :depth="depth + 1" />
    </li>
  </ul>
</template>
