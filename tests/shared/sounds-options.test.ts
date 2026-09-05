import { describe, expect, it } from 'vitest'
import { resolveThemeOptions, SOUND_KEYS } from '../../src/shared/options'
import type { SynctrolThemeOptions } from '../../src/shared/options'

function baseOptions(
  sounds?: SynctrolThemeOptions['sounds'],
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
    ...(sounds === undefined ? {} : { sounds }),
  }
}

describe('SOUND_KEYS', () => {
  it('locks the nine interaction keys', () => {
    expect(SOUND_KEYS).toEqual([
      'navigate',
      'menuOpen',
      'menuClose',
      'themeCycle',
      'localeChange',
      'paginate',
      'tabSelect',
      'accordionToggle',
      'embedActivate',
    ])
  })
})

describe('sounds option resolution', () => {
  it('defaults to enabled with no keys', () => {
    const resolved = resolveThemeOptions(baseOptions())
    expect(resolved.sounds).toEqual({ enabled: true, keys: {} })
  })

  it('resolves enabled and copies the configured key subset', () => {
    const resolved = resolveThemeOptions(
      baseOptions({
        enabled: false,
        keys: {
          navigate: '/sounds/navigate.webm',
          tabSelect: '/sounds/select.ogg',
        },
      }),
    )
    expect(resolved.sounds.enabled).toBe(false)
    expect(resolved.sounds.keys).toEqual({
      navigate: '/sounds/navigate.webm',
      tabSelect: '/sounds/select.ogg',
    })
  })

  it('does not mutate the input keys object', () => {
    const keys = { navigate: '/sounds/navigate.webm' }
    const resolved = resolveThemeOptions(baseOptions({ keys }))
    keys.navigate = '/mutated.webm'
    expect(resolved.sounds.keys).toEqual({ navigate: '/sounds/navigate.webm' })
  })

  it('rejects unknown sound keys', () => {
    expect(() =>
      resolveThemeOptions(
        baseOptions({ keys: { hover: '/sounds/hover.webm' } as never }),
      ),
    ).toThrow(/Unknown field options\.sounds\.keys\.hover/)
  })

  it('rejects non-public sound URLs', () => {
    const bad = [
      'sounds/navigate.webm',
      '//sounds/navigate.webm',
      '/sounds/nav\\igate.webm',
      '/sounds/na v.webm',
    ]
    for (const url of bad) {
      expect(() =>
        resolveThemeOptions(baseOptions({ keys: { navigate: url } })),
      ).toThrow(/options\.sounds\.keys\.navigate/)
    }
  })

  it('rejects a non-boolean enabled value and non-object sounds', () => {
    expect(() =>
      resolveThemeOptions(baseOptions({ enabled: 'yes' as never })),
    ).toThrow(/options\.sounds\.enabled/)
    expect(() =>
      resolveThemeOptions({ ...baseOptions(), sounds: 'on' as never }),
    ).toThrow(/options\.sounds/)
    expect(() =>
      resolveThemeOptions(baseOptions({ unknown: 1 } as never)),
    ).toThrow(/options\.sounds/)
  })
})
