import { describe, expect, it } from 'vitest'
import type { Multilanguage } from '../../src/shared/types'
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

  it('accepts empty string as valid locale text', () => {
    expect(
      resolveMultilanguage({ zh: '', en: 'First Album' }, 'zh', 'zh'),
    ).toEqual({
      text: '',
      locale: 'zh',
      fellBack: false,
    })
  })

  it('throws for null, number, boolean, and array top-level values', () => {
    const invalidValues = [
      null,
      42,
      true,
      ['only'],
    ] as unknown as Multilanguage[]

    for (const value of invalidValues) {
      expect(() => resolveMultilanguage(value, 'en', 'zh')).toThrow(
        /multilanguage/i,
      )
    }
  })

  it('throws when mainLocale value is undefined', () => {
    const map = { zh: undefined } as unknown as Record<string, string>

    expect(() => resolveMultilanguage(map, 'en', 'zh')).toThrow(/mainLocale/)
  })

  it('throws when mainLocale value is not a string even if current locale is valid', () => {
    const map = { zh: 42, en: 'First Album' } as unknown as Record<
      string,
      string
    >

    expect(() => resolveMultilanguage(map, 'en', 'zh')).toThrow(/mainLocale/)
  })

  it('throws when mainLocale value is an object even if current locale is valid', () => {
    const map = {
      zh: { nested: 'bad' },
      en: 'First Album',
    } as unknown as Record<string, string>

    expect(() => resolveMultilanguage(map, 'en', 'zh')).toThrow(/mainLocale/)
  })

  it('reads the current locale value once and returns the validated string', () => {
    let reads = 0
    const map = {
      zh: '第一张专辑',
      get en() {
        reads += 1
        return reads === 1 ? 'First Album' : 42
      },
    } as unknown as Record<string, string>

    expect(resolveMultilanguage(map, 'en', 'zh')).toEqual({
      text: 'First Album',
      locale: 'en',
      fellBack: false,
    })
    expect(reads).toBe(1)
  })

  it('falls back to mainLocale when current locale is only inherited', () => {
    const proto = { en: 'Inherited English' }
    const map = Object.create(proto) as Record<string, string>
    map.zh = '第一张专辑'

    expect(resolveMultilanguage(map, 'en', 'zh')).toEqual({
      text: '第一张专辑',
      locale: 'zh',
      fellBack: true,
    })
  })
})
