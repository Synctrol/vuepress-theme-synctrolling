import { describe, expect, it } from 'vitest'
import { resolveThemeOptions } from '../../src/shared/options'
import type { SynctrolThemeOptions } from '../../src/shared/options'

function baseOptions(
  music?: SynctrolThemeOptions['music'],
): SynctrolThemeOptions {
  return {
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    topbarText: '© Synctrol',
    locales: {
      zh: { lang: 'zh-CN', label: '中文' },
      en: { lang: 'en-US', label: 'English' },
    },
    seo: {
      name: 'Synctrol',
      description: 'Synctrol site',
      defaultImage: './assets/social-default.svg',
      organization: { name: 'Synctrol', logo: './assets/logo.svg' },
      collections: {
        release: { title: 'Releases', description: 'All releases' },
        news: { title: 'News', description: 'All news' },
      },
    },
    ...(music === undefined ? {} : { music }),
  }
}

describe('music option resolution', () => {
  it('is absent by default', () => {
    const resolved = resolveThemeOptions(baseOptions())
    expect(resolved.music).toBeUndefined()
  })

  it('keeps a configured public URL path', () => {
    const resolved = resolveThemeOptions(baseOptions('/music/Beater.mp3'))
    expect(resolved.music).toBe('/music/Beater.mp3')
  })

  it('rejects non-public music URLs', () => {
    for (const url of ['music/Beater.mp3', '//music/Beater.mp3', '/mu\\sic.mp3']) {
      expect(() => resolveThemeOptions(baseOptions(url))).toThrow(
        /options\.music/,
      )
    }
  })
})
