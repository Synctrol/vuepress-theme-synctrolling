import { describe, expect, it } from 'vitest'
import { buildPageSeo } from '../../../src/compiler/seo/build-page-seo.js'
import { page, resolvedOptions, seoContentContext, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()

describe('buildPageSeo', () => {
  it('assembles SEO for translated news, collections, and fallback pages', () => {
    const zhNews = page({ identity: 'news:launch', locale: 'zh', contentType: 'news', packagePath: '/site/content/news/launch', url: url('https://synctrol.com/zh/article/launch/'), title: '发布', description: '中文摘要' })
    const enNews = page({ identity: 'news:launch', locale: 'en', contentType: 'news', packagePath: '/site/content/news/launch', url: url('https://synctrol.com/en/article/launch/'), title: 'Launch', description: 'English summary' })
    const newsSeo = buildPageSeo(enNews, [enNews, zhNews], options, seoContentContext({ dateByPackagePath: new Map([['/site/content/news/launch', '2026-08-11']]) }))
    expect(newsSeo.title).toBe('Launch')
    expect(newsSeo.hreflang).toEqual([
      { hreflang: 'zh-CN', href: 'https://synctrol.com/zh/article/launch/' },
      { hreflang: 'en-US', href: 'https://synctrol.com/en/article/launch/' },
    ])
    expect(newsSeo.jsonLd[0]!['@type']).toBe('Article')

    const collection = page({ identity: 'release-index', locale: 'zh', contentType: 'release-collection', url: url('https://synctrol.com/zh/releases/'), collection: { page: 1, pageCount: 1, itemIdentities: [] } })
    expect(buildPageSeo(collection, [collection], options, seoContentContext()).title).toBe('作品')

    const zhRelease = page({ identity: 'release:first', locale: 'zh', contentType: 'release', url: url('https://synctrol.com/zh/releases/first/'), title: '第一张' })
    const enFallback = page({ identity: 'release:first', locale: 'en', contentType: 'release', url: url('https://synctrol.com/en/releases/first/'), title: '第一张', isFallback: true, noindex: true, canonicalLocale: 'zh', bodyLocale: 'zh' })
    const fallbackSeo = buildPageSeo(enFallback, [zhRelease, enFallback], options, seoContentContext())
    expect(fallbackSeo.canonicalUrl).toBe('https://synctrol.com/zh/releases/first/')
    expect(fallbackSeo.robots).toBe('noindex,follow')
  })
})
