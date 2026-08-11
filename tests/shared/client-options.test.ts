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
  copyright: 'SYNCTROL © 2026',
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
const backgroundLoader = () => Promise.resolve('background-component')

describe('client theme options', () => {
  it('projects a complete JSON-safe payload without Node-only registrations', () => {
    const resolved = resolveThemeOptions({
      ...base,
      platforms: {
        loadStrategy: 'viewport',
        types: { custom: registration },
      },
      backgrounds: { home: backgroundLoader },
    })

    const clientOptions: ClientSynctrolThemeOptions =
      toClientThemeOptions(resolved)

    expect(resolved.platforms.types.custom).toBe(registration)
    expect(resolved.backgrounds.home).toBe(backgroundLoader)
    expect(clientOptions).not.toHaveProperty('backgrounds')
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
      backgrounds: { page: backgroundLoader },
    })

    const clientOptions = theme.define.__SYNCTROL_THEME_OPTIONS__
    expect(clientOptions).not.toHaveProperty('backgrounds')
    expect(clientOptions.platforms).toEqual({ loadStrategy: 'interaction' })
    expect(JSON.parse(JSON.stringify(clientOptions))).toEqual(clientOptions)
  })
})
