// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { renderMarkdown } from '../docs/node/markdown'

describe('renderMarkdown', () => {
  it('rewrites internal md links and protects code from Vue interpolation', async () => {
    const source = [
      '# 开始',
      '',
      '[下一步](./next.md#安装)',
      '',
      '`{{ code }}`',
      '',
      '```ts',
      'const value = "{{ not-interpolated }}"',
      '```',
    ].join('\n')

    const { html, headings } = await renderMarkdown(source, {
      file: 'guide/index.md',
      base: '/docs',
    })

    expect(html).toContain('href="/docs/guide/next#%E5%AE%89%E8%A3%85"')
    expect(html).toContain('data-odocs-link')
    expect(html).toContain('v-pre')
    expect(html).toContain('{{ code }}')
    expect(html).toContain('{{ not-interpolated }}')
    expect(headings).toEqual([{ id: '开始', text: '开始', depth: 1 }])
  })
})
