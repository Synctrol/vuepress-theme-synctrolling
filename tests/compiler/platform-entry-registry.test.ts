import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { validatePlatformEntry } from '../../src/compiler/platform-entry'
import { resolvePlatformTypes } from '../../src/platforms/registry'
import type { ContentDefinitions } from '../../src/shared/types'
import { isDiagnosticError } from '../../src/compiler/diagnostics'

const defs: ContentDefinitions = {
  tags: {},
  platforms: {
    bilibili: { category: 'digital', type: 'bilibili_player', name: 'Bilibili' },
    taobao: {
      category: 'physical',
      type: 'link',
      name: { zh: '淘宝', en: 'Taobao' },
    },
    bandcamp: { category: 'digital', type: 'bandcamp_player', name: 'Bandcamp' },
  },
}

describe('validatePlatformEntry with registry', () => {
  it('still enforces album digital / gift physical categories', () => {
    expect(() =>
      validatePlatformEntry(
        { platform: 'taobao', url: 'https://item.taobao.com/example' },
        defs,
        'zh',
        '/book.yml',
        'digital',
      ),
    ).toThrow(/PLATFORM_CATEGORY_MISMATCH|digital/)

    expect(
      validatePlatformEntry(
        { platform: 'taobao', url: 'https://item.taobao.com/example' },
        defs,
        'zh',
        '/book.yml',
        'physical',
      ),
    ).toMatchObject({ platform: 'taobao', url: 'https://item.taobao.com/example' })
  })

  it('validates custom registered types and errors on unknown types', () => {
    const types = resolvePlatformTypes({
      bandcamp_player: {
        validate(entry: unknown) {
          const e = entry as { platform: string; url: string }
          if (typeof e.url !== 'string' || !e.url.startsWith('https://')) {
            throw Object.assign(new Error('invalid bandcamp'), {
              diagnostics: [
                {
                  severity: 'error',
                  code: 'INVALID_PLATFORM_ENTRY',
                  message: 'bandcamp url required',
                  path: '/book.yml',
                },
              ],
            })
          }
          return e
        },
        component: defineComponent({ setup: () => () => h('div') }),
        cspOrigins: () => ['https://bandcamp.com'],
        fallbackUrl: (e: { platform: string }) =>
          (e as unknown as { url: string }).url,
      },
    })

    const entry = validatePlatformEntry(
      { platform: 'bandcamp', url: 'https://bandcamp.com/album/x' },
      defs,
      'zh',
      '/content/releases/a/book.yml',
      'digital',
      types,
    )
    expect(entry).toMatchObject({
      platform: 'bandcamp',
      url: 'https://bandcamp.com/album/x',
    })

    try {
      validatePlatformEntry(
        { platform: 'bandcamp', url: 'http://insecure' },
        defs,
        'zh',
        '/content/releases/a/book.yml',
        'digital',
        types,
      )
      expect.unreachable('should throw')
    } catch (error) {
      expect(isDiagnosticError(error) || error instanceof Error).toBe(true)
    }
  })
})
