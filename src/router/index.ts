import { createRouter, createWebHistory } from 'vue-router'

import { docs } from '../docs-setup'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: docs.base,
      component: docs.Root,
      children: docs.routes(),
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 72 }
    return { top: 0 }
  },
})

export default router
