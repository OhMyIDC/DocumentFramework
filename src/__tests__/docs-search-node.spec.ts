// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { extractSearchItem } from '../docs/node/search'

describe('extractSearchItem', () => {
  it('splits sections by heading and skips fenced code', () => {
    const source = [
      '# 快速开始',
      '',
      '开头段落。',
      '',
      '## 安装',
      '',
      '运行 `pnpm install`。',
      '',
      '```bash',
      'secret command',
      '```',
      '',
      '## 安装',
      '',
      '重复标题正文。',
    ].join('\n')

    const item = extractSearchItem(source, {
      path: '/guide/start',
      title: '快速开始',
      description: '从零跑通文档站',
    })

    expect(item.path).toBe('/guide/start')
    expect(item.title).toBe('快速开始')
    expect(item.sections.map((section) => section.id)).toEqual(['快速开始', '安装', '安装-1'])
    expect(item.sections[1]?.text).toContain('pnpm install')
    expect(item.sections[2]?.text).toContain('重复标题正文')
    expect(JSON.stringify(item)).not.toContain('secret command')
  })
})
