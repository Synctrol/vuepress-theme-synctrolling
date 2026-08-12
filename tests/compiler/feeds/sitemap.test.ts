import { describe, expect, it } from 'vitest'
import { generateSitemapXml, selectSitemapUrls, sitemapOutputPath } from '../../../src/compiler/feeds/sitemap.js'
import { page, url } from '../../helpers/seo-fixtures.js'

describe('sitemap', () => {
  it('writes sitemap.xml at destination root with base-aware public path', () => {
    expect(sitemapOutputPath('/docs/')).toEqual({ routePath: '/sitemap.xml', outputPath: 'sitemap.xml', publicPath: '/docs/sitemap.xml' })
  })

  it('excludes drafts and fallbacks and keeps locale URLs', () => {
    const urls = selectSitemapUrls([
      page({ identity: 'home', locale: 'zh', contentType: 'home', url: url('https://synctrol.com/zh/'), title: '首页' }),
      page({ identity: 'home', locale: 'en', contentType: 'home', url: url('https://synctrol.com/en/'), title: 'Home' }),
      page({ identity: 'news:draft', locale: 'zh', contentType: 'news', url: url('https://synctrol.com/zh/news/draft/'), title: 'Draft', isDraft: true, noindex: true }),
      page({ identity: 'news:only-zh', locale: 'en', contentType: 'news', url: url('https://synctrol.com/en/news/only-zh/'), title: 'Only', isFallback: true, noindex: true, canonicalLocale: 'zh' }),
    ])
    expect(urls).toEqual(['https://synctrol.com/en/', 'https://synctrol.com/zh/'])
    expect(generateSitemapXml(urls)).toContain('<loc>https://synctrol.com/en/</loc>')
  })
})
