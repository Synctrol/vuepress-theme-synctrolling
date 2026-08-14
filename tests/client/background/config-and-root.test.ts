import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveThemeOptions } from '../../../src/shared/options'
import { exampleBackground } from '../../fixtures/backgrounds/theme-config-example'
import { generateRootRouterHtml } from '../../../src/compiler/root-router-html'
import { parseContentManifest } from '../../../src/compiler/manifest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
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
  it('accepts background as a loader function', () => {
    const resolved = resolveThemeOptions({
      ...baseInput,
      background: exampleBackground,
    })
    expect(typeof resolved.background).toBe('function')
  })

  it('defaults background to undefined (solid fallback everywhere)', () => {
    const resolved = resolveThemeOptions({ ...baseInput })
    expect(resolved.background).toBeUndefined()
  })

  it('rejects the removed backgrounds map as an unknown field', () => {
    expect(() =>
      resolveThemeOptions({
        ...baseInput,
        backgrounds: { home: exampleBackground },
      } as SynctrolThemeOptions),
    ).toThrow(/Unknown field options\.backgrounds/)
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
        background: exampleBackground,
      }),
      base: '/',
    })
    expect(html).not.toMatch(/syn-background/i)
    expect(html).not.toMatch(/BackgroundSurface|BackgroundRuntime|virtual:synctrol-backgrounds/i)
    expect(html).toMatch(/synctrol:locale/)
  })
})
