import { describe, expect, it } from 'vitest'
import { resolveMultilanguage } from '../../src/shared/multilanguage'

describe('resolveMultilanguage', () => {
  it('returns scalars for every locale', () => {
    expect(resolveMultilanguage('SYNCTROL', 'en', 'zh')).toEqual({
      text: 'SYNCTROL',
      locale: 'en',
      fellBack: false,
    })
  })

  it('prefers the current locale then mainLocale', () => {
    expect(
      resolveMultilanguage(
        { zh: '第一张专辑', en: 'First Album' },
        'en',
        'zh',
      ),
    ).toEqual({
      text: 'First Album',
      locale: 'en',
      fellBack: false,
    })

    expect(
      resolveMultilanguage({ zh: '第一张专辑' }, 'en', 'zh'),
    ).toEqual({
      text: '第一张专辑',
      locale: 'zh',
      fellBack: true,
    })
  })

  it('throws when a map omits mainLocale', () => {
    expect(() =>
      resolveMultilanguage({ en: 'Only English' }, 'en', 'zh'),
    ).toThrow(/mainLocale/)
  })

  it('falls back when the current locale entry is undefined', () => {
    const map = { zh: '第一张专辑', en: undefined } as unknown as Record<
      string,
      string
    >

    expect(resolveMultilanguage(map, 'en', 'zh')).toEqual({
      text: '第一张专辑',
      locale: 'zh',
      fellBack: true,
    })
  })

  it('falls back when the current locale entry is not a string at runtime', () => {
    const map = { zh: '第一张专辑', en: 42 } as unknown as Record<
      string,
      string
    >

    expect(resolveMultilanguage(map, 'en', 'zh')).toEqual({
      text: '第一张专辑',
      locale: 'zh',
      fellBack: true,
    })
  })
})
