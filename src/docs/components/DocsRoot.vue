<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import { useDocs } from '../context'
import DocsLink from './DocsLink.vue'
import DocsOutline from './DocsOutline.vue'
import DocsSidebar from './DocsSidebar.vue'

const docs = useDocs()
docs.initTheme()

const themeLabel = computed(() => (docs.dark.value ? '切换到浅色模式' : '切换到深色模式'))
</script>

<template>
  <div class="odocs" :data-theme="docs.dark.value ? 'dark' : 'light'">
    <header class="odocs-nav">
      <div class="odocs-nav-inner">
        <DocsLink to="/" class="odocs-brand">{{ docs.title }}</DocsLink>
        <div class="odocs-nav-actions">
          <button
            type="button"
            class="odocs-icon-button"
            :aria-label="themeLabel"
            @click="docs.toggleDark()"
          >
            <span aria-hidden="true">{{ docs.dark.value ? '☀' : '☾' }}</span>
          </button>
        </div>
      </div>
    </header>

    <div class="odocs-layout">
      <aside v-if="docs.theme.sidebar !== false" class="odocs-sidebar">
        <DocsSidebar />
      </aside>

      <main class="odocs-main">
        <RouterView />
      </main>

      <aside v-if="docs.theme.outline !== false" class="odocs-outline">
        <DocsOutline />
      </aside>
    </div>
  </div>
</template>
