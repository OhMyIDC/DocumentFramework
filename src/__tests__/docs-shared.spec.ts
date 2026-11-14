import { describe, expect, it } from 'vitest'

import { fileToRoute, normalizeBase, normalizePagePath, toPagePath, withBase } from '../docs/shared'

describe('docs path helpers', () => {
  it('normalizes base paths', () => {
    expect(normalizeBase(undefined)).toBe('/')
    expect(normalizeBase('/docs/')).toBe('/docs')
    expect(normalizeBase('docs')).toBe('/docs')
  })

  it('maps markdown files to page paths', () => {
    expect(fileToRoute('index.md')).toBe('/')
    expect(fileToRoute('guide/index.md')).toBe('/guide')
    expect(fileToRoute('guide/start.md')).toBe('/guide/start')
  })

  it('strips base from a route path', () => {
    expect(toPagePath('/docs', '/docs')).toBe('/')
    expect(toPagePath('/docs/guide/start', '/docs')).toBe('/guide/start')
    expect(toPagePath('/docs/guide/start/', '/docs')).toBe('/guide/start')
  })

  it('prefixes base without duplicating it', () => {
    expect(withBase('/docs', '/')).toBe('/docs')
    expect(withBase('/docs', '/guide/start')).toBe('/docs/guide/start')
    expect(withBase('/docs', '/docs/guide/start')).toBe('/docs/guide/start')
    expect(withBase('/docs', 'https://example.com')).toBe('https://example.com')
  })

  it('normalizes page paths and decodes URLs', () => {
    expect(normalizePagePath('/guide/start/')).toBe('/guide/start')
    expect(normalizePagePath('/guide/%E5%BC%80%E5%A7%8B')).toBe('/guide/开始')
  })
})
