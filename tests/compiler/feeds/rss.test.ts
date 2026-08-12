import { describe, expect, it } from 'vitest'
import { generateLocaleRssXml, rssOutputPath, selectRssItems } from '../../../src/compiler/feeds/rss.js'
import { page, resolvedOptions, seoContentContext, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()

describe('rss', () => {
  it('places rss under locale route path and public base', () => {
    expect(rssOutputPath('en', '/docs/')).toEqual({ routePath: '/en/rss.xml', outputPath: 'en/rss.xml', publicPath: '/docs/en/rss.xml' })
  })

  it('selects non-draft non-fallback news and release pages newest first', () => {
    const pages = [
      page({ identity: 'news:older', locale: 'en', contentType: 'news', packagePath: '/site/content/news/older', url: url('https://synctrol.com/en/news/older/'), title: 'Older', description: 'Old news' }),
      page({ identity: 'release:first', locale: 'en', contentType: 'release', packagePath: '/site/content/releases/first', url: url('https://synctrol.com/en/releases/first/'), title: 'First' }),
      page({ identity: 'news:draft', locale: 'en', contentType: 'news', packagePath: '/site/content/news/draft', url: url('https://synctrol.com/en/news/draft/'), title: 'Draft', isDraft: true, noindex: true }),
      page({ identity: 'news:fallback', locale: 'en', contentType: 'news', packagePath: '/site/content/news/fallback', url: url('https://synctrol.com/en/news/fallback/'), title: 'Fallback', isFallback: true, noindex: true, canonicalLocale: 'zh' }),
      page({ identity: 'home', locale: 'en', contentType: 'home', url: url('https://synctrol.com/en/'), title: 'Home' }),
    ]
    const items = selectRssItems(pages, 'en', options, seoContentContext({ dateByPackagePath: new Map([['/site/content/news/older', '2026-08-01'], ['/site/content/releases/first', '2026-08-05'], ['/site/content/news/draft', '2026-08-10'], ['/site/content/news/fallback', '2026-08-09']]) }))
    expect(items.map((item) => item.title)).toEqual(['First', 'Older'])
    expect(items[0]!.pubDate).toBe('Wed, 05 Aug 2026 00:00:00 GMT')
  })

  it('renders RSS XML metadata', () => {
    const xml = generateLocaleRssXml({ locale: 'en', options, channelLink: 'https://synctrol.com/en/', items: [{ title: 'Launch', description: 'Summary', link: 'https://synctrol.com/en/news/launch/', guid: 'https://synctrol.com/en/news/launch/', pubDate: 'Tue, 11 Aug 2026 00:00:00 GMT' }] })
    expect(xml).toContain('<rss version="2.0">')
    expect(xml).toContain('<title>Synctrol</title>')
    expect(xml).toContain('<guid>https://synctrol.com/en/news/launch/</guid>')
  })
})
