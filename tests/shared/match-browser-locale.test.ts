import { describe, expect, it } from 'vitest'
import {
  matchBrowserLocale,
  normalizeLanguageTag,
  toLocaleTable,
} from '../../src/shared/match-browser-locale'
import { baseLocales } from '../helpers/route-fixtures'

const locales = toLocaleTable(baseLocales())

describe('normalizeLanguageTag', () => {
  it('lowercases, trims, and converts underscores', () => {
    expect(normalizeLanguageTag('  ZH_cn ')).toEqual({
      full: 'zh-cn',
      primary: 'zh',
    })
  })
})

describe('toLocaleTable', () => {
  it('preserves configuration order', () => {
    expect(locales).toEqual([
      { key: 'zh', lang: 'zh-CN' },
      { key: 'en', lang: 'en-US' },
    ])
  })
})

describe('matchBrowserLocale', () => {
  it('matches an exact locale key case-insensitively with underscores normalized', () => {
    expect(matchBrowserLocale(['EN'], locales, 'zh')).toBe('en')
    expect(matchBrowserLocale(['zh_CN'], locales, 'en')).toBe('zh')
  })

  it('matches an exact configured lang', () => {
    expect(matchBrowserLocale(['zh-CN'], locales, 'en')).toBe('zh')
    expect(matchBrowserLocale(['en-US'], locales, 'zh')).toBe('en')
  })

  it('matches the primary subtag against keys then langs', () => {
    expect(matchBrowserLocale(['en-GB'], locales, 'zh')).toBe('en')
    expect(matchBrowserLocale(['zh-TW'], locales, 'en')).toBe('zh')
  })

  it('walks preferences in order', () => {
    expect(matchBrowserLocale(['fr', 'en', 'zh'], locales, 'zh')).toBe('en')
  })

  it('prefers a key match over a lang match within one preference', () => {
    const table = [
      { key: 'en', lang: 'zh-CN' },
      { key: 'zh', lang: 'en-US' },
    ]
    expect(matchBrowserLocale(['en'], table, 'zh')).toBe('en')
  })

  it('falls back to mainLocale when nothing matches', () => {
    expect(matchBrowserLocale(['fr-FR', 'de'], locales, 'zh')).toBe('zh')
    expect(matchBrowserLocale([], locales, 'en')).toBe('en')
    expect(matchBrowserLocale(['', '   '], locales, 'zh')).toBe('zh')
  })
})
