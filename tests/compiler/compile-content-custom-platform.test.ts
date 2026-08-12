import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { compileContent } from '../../src/compiler/compile-content'
import { resolvePlatformTypes } from '../../src/platforms/registry'

function write(root: string, relative: string, contents: string): void {
  const absolute = join(root, relative)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, contents, 'utf8')
}

describe('compileContent custom platform types', () => {
  it('accepts book.yml entries whose definition.type is registered via platformTypes', () => {
    const root = mkdtempSync(join(tmpdir(), 'synctrol-custom-plat-'))
    const contentRoot = join(root, 'content')
    write(
      root,
      'content/definitions.yml',
      `tags: {}
platforms:
  bandcamp:
    category: digital
    type: bandcamp_player
    name: Bandcamp
`,
    )
    write(root, 'content/home/content.yml', 'type: home\n')
    write(
      root,
      'content/releases/demo/content.yml',
      'type: release\nslug: demo\ndate: 2024-01-01\n',
    )
    write(
      root,
      'content/releases/demo/book.yml',
      `type: album
title: Demo Album
album:
  links:
    - platform: bandcamp
      url: https://bandcamp.com/album/demo
`,
    )

    const types = resolvePlatformTypes({
      bandcamp_player: {
        validate(entry: unknown) {
          const e = entry as { platform: string; url?: string }
          if (typeof e.url !== 'string' || !e.url.startsWith('https://')) {
            throw new Error('bandcamp url required')
          }
          return e
        },
        component: defineComponent({ setup: () => () => h('div') }),
        cspOrigins: () => ['https://bandcamp.com'],
        fallbackUrl: (e: { platform: string }) =>
          (e as unknown as { url: string }).url,
      },
    })

    // Without platformTypes, custom definition.type must fail.
    expect(() =>
      compileContent({
        contentRoot,
        sourceDir: root,
        configDir: join(root, '.vuepress'),
        mainLocale: 'zh',
      }),
    ).toThrow(/UNKNOWN_PLATFORM_TYPE|bandcamp_player/)

    const result = compileContent({
      contentRoot,
      sourceDir: root,
      configDir: join(root, '.vuepress'),
      mainLocale: 'zh',
      platformTypes: types,
    })
    const release = result.packages.find((p) => p.identity === 'release:demo')
    expect(release?.book).toMatchObject({
      type: 'album',
      album: {
        links: [{ platform: 'bandcamp', url: 'https://bandcamp.com/album/demo' }],
      },
    })
  })
})
