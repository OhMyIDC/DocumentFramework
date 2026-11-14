<script setup lang="ts">
import { useDocs } from '../context'
import DocsSidebarItems from './DocsSidebarItems.vue'

const docs = useDocs()
</script>

<template>
  <nav class="odocs-sidebar-nav" aria-label="文档导航">
    <DocsSidebarItems :items="docs.sidebar" />
  </nav>
</template>
