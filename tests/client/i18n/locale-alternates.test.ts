import { describe, expect, it } from 'vitest'
import { buildLocaleAlternates } from '../../../src/client/i18n/locale-alternates'

describe('buildLocaleAlternates', () => {
  it('maps the same identity to each locale publicPath with full labels', () => {
    const links = buildLocaleAlternates({
      identity: 'release:first-release',
      localeOptions: {
        zh: { label: '中文' },
        en: { label: 'English' },
      },
      pages: [
        {
          identity: 'release:first-release',
          locale: 'zh',
          publicPath: '/zh/releases/first-release/',
        },
        {
          identity: 'release:first-release',
          locale: 'en',
          publicPath: '/en/releases/first-release/',
        },
      ],
    })
    expect(links).toEqual([
      { locale: 'zh', label: '中文', href: '/zh/releases/first-release/' },
      { locale: 'en', label: 'English', href: '/en/releases/first-release/' },
    ])
  })

  it('includes generated collection identities', () => {
    const links = buildLocaleAlternates({
      identity: 'news-tag:release',
      localeOptions: {
        zh: { label: '中文' },
        en: { label: 'English' },
      },
      pages: [
        {
          identity: 'news-tag:release',
          locale: 'zh',
          publicPath: '/zh/news/tags/release/',
        },
        {
          identity: 'news-tag:release',
          locale: 'en',
          publicPath: '/en/news/tags/release/',
        },
      ],
    })
    expect(links.map((l) => l.href)).toEqual([
      '/zh/news/tags/release/',
      '/en/news/tags/release/',
    ])
  })
})
