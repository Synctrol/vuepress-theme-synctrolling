import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveThemeOptions } from '../../../src/shared/options'
import { exampleBackgrounds } from '../../fixtures/backgrounds/theme-config-example'
import { generateRootRouterHtml } from '../../../src/compiler/root-router-html'
import { parseContentManifest } from '../../../src/compiler/manifest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
import { BackgroundRuntime } from '../../../src/client/background/runtime'
import type { ContentType } from '../../../src/shared/types'
import type { SynctrolThemeOptions } from '../../../src/shared/options'

/** Minimal valid theme *input* (not resolved) — mirror tests/shared/client-options.test.ts. */
const baseInput = {
  siteUrl: 'https://synctrol.com',
  mainLocale: 'zh',
  locales: {
    zh: { lang: 'zh-CN', label: '中文' },
    en: { lang: 'en-US', label: 'English' },
  },
  topbarText: '© Synctrol',
  seo: {
    name: 'Synctrol',
    description: 'Official website of the Synctrol music team',
    defaultImage: './assets/social-default.webp',
    organization: { name: 'Synctrol', logo: './assets/logo.svg' },
    collections: {
      release: { title: 'Releases', description: 'Synctrol releases' },
      news: { title: 'News', description: 'Synctrol news' },
    },
  },
} as const satisfies SynctrolThemeOptions

const temporaryRoots = new Set<string>()

afterEach(() => {
  for (const root of temporaryRoots) {
    rmSync(root, { force: true, recursive: true })
  }
  temporaryRoots.clear()
})

describe('background theme config and exclusions', () => {
  it('accepts backgrounds keyed only by home/release/news/page', () => {
    const resolved = resolveThemeOptions({
      ...baseInput,
      backgrounds: exampleBackgrounds,
    })
    const keys = Object.keys(resolved.backgrounds).sort()
    expect(keys).toEqual(['home', 'news', 'page', 'release'])
    for (const key of keys as ContentType[]) {
      expect(typeof resolved.backgrounds[key]).toBe('function')
    }
  })

  it('defaults backgrounds to an empty object (solid fallback everywhere)', () => {
    const resolved = resolveThemeOptions({ ...baseInput })
    expect(resolved.backgrounds).toEqual({})
  })

  it('rejects unknown background keys such as splash', () => {
    expect(() =>
      resolveThemeOptions({
        ...baseInput,
        backgrounds: {
          ...exampleBackgrounds,
          splash: exampleBackgrounds.home,
        } as SynctrolThemeOptions['backgrounds'],
      }),
    ).toThrow(/Unknown field options\.backgrounds\.splash/)
  })

  it('rejects background in content.yml via Plan 02 schema', () => {
    const root = mkdtempSync(join(tmpdir(), 'synctrol-bg-manifest-'))
    temporaryRoots.add(root)
    const dir = join(root, 'about')
    mkdirSync(dir)
    const path = join(dir, 'content.yml')
    writeFileSync(path, 'type: page\nbackground: ./bg.ts\n', 'utf8')
    try {
      parseContentManifest(path, dir)
      expect.unreachable('should throw')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      expect(String(error)).toMatch(/background|ILLEGAL_BACKGROUND/i)
    }
  })

  it('root language router HTML does not mount or import backgrounds', () => {
    const html = generateRootRouterHtml({
      options: resolveThemeOptions({
        ...baseInput,
        backgrounds: exampleBackgrounds,
      }),
      base: '/',
    })
    expect(html).not.toMatch(/syn-background/i)
    expect(html).not.toMatch(/BackgroundHost|BackgroundRuntime|virtual:synctrol-backgrounds/i)
    expect(html).toMatch(/synctrol:locale/)
  })

  it('runtime still paints solid when config omits a type even if others exist', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const runtime = new BackgroundRuntime({
      backgrounds: { home: exampleBackgrounds.home },
    })
    runtime.setHost(host)
    await runtime.sync({
      contentType: 'page',
      route: '/zh/about/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(host.dataset.synBackground).toBe('solid')
    runtime.dispose()
    host.remove()
  })
})
