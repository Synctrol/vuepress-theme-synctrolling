import { describe, expect, it } from 'vitest'
import { synctrolTheme } from '../../src/index'
import {
  toClientThemeOptions,
  type ClientSynctrolThemeOptions,
} from '../../src/shared/client-options'
import { resolveThemeOptions } from '../../src/shared/options'

const base = {
  siteUrl: 'https://synctrol.com',
  definitionsPath: './content/definitions.yml',
  mainLocale: 'zh',
  topbarText: 'SYNCTROL © 2026',
  locales: {
    zh: { lang: 'zh-CN', label: '中文' },
    en: { lang: 'en-US', label: 'English' },
  },
  feeds: { rss: true, sitemap: true },
  seo: {
    name: 'Synctrol',
    description: 'Official website of the Synctrol music team',
    defaultImage: './assets/social-default.webp',
    organization: { name: 'Synctrol', logo: './assets/logo.svg' },
    collections: {
      release: {
        title: 'Releases',
        description: 'Synctrol releases',
      },
      news: {
        title: 'News',
        description: 'Synctrol news',
      },
    },
  },
}

const registration = {
  validate: (entry: unknown) => entry as { platform: string },
  component: () => 'custom-platform-component',
  cspOrigins: () => ['https://platform.example'],
}
const background = './backgrounds/host'

describe('client theme options', () => {
  it('projects a complete JSON-safe payload without Node-only registrations', () => {
    const resolved = resolveThemeOptions({
      ...base,
      platforms: {
        loadStrategy: 'viewport',
        types: { custom: registration },
      },
      background,
    })

    const clientOptions: ClientSynctrolThemeOptions =
      toClientThemeOptions(resolved)

    expect(resolved.platforms.types.custom).toBe(registration)
    expect(resolved.background).toBe(background)
    expect(clientOptions).not.toHaveProperty('background')
    expect(clientOptions).not.toHaveProperty('definitionsPath')
    expect(clientOptions).not.toHaveProperty('feeds')
    expect(clientOptions).not.toHaveProperty('seo')
    expect(clientOptions.platforms).toEqual({ loadStrategy: 'viewport' })
    expect(clientOptions.platforms).not.toHaveProperty('types')
    expect(JSON.parse(JSON.stringify(clientOptions))).toEqual(clientOptions)
  })

  it('defines only the serializable client projection on the theme', () => {
    const theme = synctrolTheme({
      ...base,
      platforms: {
        loadStrategy: 'interaction',
        types: { custom: registration },
      },
      background,
    })

    const clientOptions = theme.define.__SYNCTROL_THEME_OPTIONS__
    expect(clientOptions).not.toHaveProperty('background')
    expect(clientOptions.platforms).toEqual({ loadStrategy: 'interaction' })
    expect(JSON.parse(JSON.stringify(clientOptions))).toEqual(clientOptions)
  })

  it('registers backgrounds via Vite plugin, not define JSON', async () => {
    const theme = synctrolTheme({
      ...base,
      background,
    })

    expect(theme.define.__SYNCTROL_THEME_OPTIONS__).not.toHaveProperty(
      'background',
    )
    expect(theme.extendsBundlerOptions).toBeTypeOf('function')

    const bundlerOptions: { viteOptions?: { plugins?: unknown[] } } = {}
    await theme.extendsBundlerOptions!(bundlerOptions, {
      dir: {
        source: (sub?: string) =>
          sub === undefined ? '/site' : `/site/${sub}`,
      },
    } as never)

    expect(bundlerOptions.viteOptions?.plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'synctrol-backgrounds' }),
      ]),
    )
  })

  it('rejects retained nested functions instead of dropping them during serialization', () => {
    const resolved = resolveThemeOptions(base)
    ;(
      resolved.locales.zh.dateFormat as Record<string, unknown>
    ).unsafeFormatter = () => 'not serializable'

    expect(() => toClientThemeOptions(resolved)).toThrow(
      /clientOptions.*not JSON-safe/,
    )
  })

  it('rejects sparse arrays that JSON serialization would rewrite', () => {
    const resolved = resolveThemeOptions({
      ...base,
      navigation: {
        externalTarget: '_blank',
        items: new Array(1),
      },
    })

    expect(() => toClientThemeOptions(resolved)).toThrow(
      /clientOptions\.navigation\.items\[0\].*JSON-safe/,
    )
  })
})
