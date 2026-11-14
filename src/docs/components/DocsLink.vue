<script setup lang="ts">
import { computed, inject } from 'vue'
import { RouterLink, routeLocationKey, routerKey } from 'vue-router'

import { useDocs } from '../context'
import { normalizePagePath } from '../shared'

const props = defineProps<{
  to: string
  active?: boolean
}>()

const docs = useDocs()
const router = inject(routerKey, null)
const route = inject(routeLocationKey, null)

const href = computed(() => docs.withBase(props.to))

const isActive = computed(() => {
  if (props.active !== undefined) return props.active
  if (!route) return false
  return docs.toPagePath(route.path) === normalizePagePath(props.to)
})

const isExternal = computed(
  () => /^[a-z][a-z0-9+.-]*:/i.test(props.to) || props.to.startsWith('//'),
)
</script>

<template>
  <RouterLink
    v-if="router && !isExternal"
    class="odocs-link"
    :class="{ 'is-active': isActive }"
    :to="href"
    :aria-current="isActive ? 'page' : undefined"
  >
    <slot />
  </RouterLink>
  <a
    v-else
    class="odocs-link"
    :class="{ 'is-active': isActive }"
    :href="href"
    :aria-current="isActive ? 'page' : undefined"
  >
    <slot />
  </a>
</template>
