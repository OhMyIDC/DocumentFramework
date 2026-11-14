import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../App.vue'

describe('App', () => {
  it('renders host routes through RouterView', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { render: () => h('h1', 'Host home') } }],
    })

    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('Host home')
  })
})
