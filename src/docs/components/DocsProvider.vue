<script setup lang="ts">
import { provide } from 'vue'

import { DOCS_KEY } from '../context'
import type { DocsContext } from '../types'

const props = defineProps<{
  docs: DocsContext
}>()

provide(DOCS_KEY, props.docs)
</script>

<template>
  <slot />
</template>
