import { describe, expect, it } from 'vitest'
import { emitSeoAndFeeds } from '../../../src/compiler/seo/emit-seo-and-feeds.js'
import { page, resolvedOptions, seoContentContext, siteFixture, url } from '../../helpers/seo-fixtures.js'

function site() {
  return siteFixture([
    page({ identity: 'home', locale: 'zh', contentType: 'home', url: url('https://synctrol.com/zh/'), title: '首页' }),
    page({ identity: 'home', locale: 'en', contentType: 'home', url: url('https://synctrol.com/en/'), title: 'Home' }),
    page({ identity: 'news:launch', locale: 'zh', contentType: 'news', packagePath: '/site/content/news/launch', url: url('https://synctrol.com/zh/article/launch/'), title: '发布', description: '新闻说明' }),
    page({ identity: 'news:launch', locale: 'en', contentType: 'news', packagePath: '/site/content/news/launch', url: url('https://synctrol.com/en/article/launch/'), title: 'Launch', description: 'News blurb' }),
    page({ identity: 'news:secret', locale: 'zh', contentType: 'news', packagePath: '/site/content/news/secret', url: url('https://synctrol.com/zh/article/secret/'), title: '秘密', isDraft: true, noindex: true }),
  ])
}

const content = seoContentContext({
  dateByPackagePath: new Map([
    ['/site/content/news/launch', '2026-08-11'],
    ['/site/content/news/secret', '2026-08-10'],
  ]),
})

describe('emitSeoAndFeeds', () => {
  it('builds head tags, rss for each locale, and sitemap while honoring exclusions', () => {
    const result = emitSeoAndFeeds({ site: site(), options: resolvedOptions(), content, base: '/' })
    expect(result.headTagsByRoute.get('en:/en/article/launch/')!.some((tag) => tag.tag === 'title' && tag.text === 'Launch')).toBe(true)
    expect(result.filesToWrite.map((file) => file.outputPath).sort()).toEqual(['en/rss.xml', 'sitemap.xml', 'zh/rss.xml'])
    expect(result.filesToWrite.find((file) => file.outputPath === 'zh/rss.xml')!.contents).not.toContain('秘密')
    expect(result.filesToWrite.find((file) => file.outputPath === 'sitemap.xml')!.contents).not.toContain('/zh/article/secret/')
  })

  it('suppresses rss and sitemap without changing page head SEO', () => {
    const full = emitSeoAndFeeds({ site: site(), options: resolvedOptions(), content, base: '/' })
    const neither = emitSeoAndFeeds({ site: site(), options: resolvedOptions({ feeds: { rss: false, sitemap: false } }), content, base: '/' })
    expect(neither.filesToWrite).toEqual([])
    expect(neither.headTagsByRoute.get('en:/en/article/launch/')).toEqual(full.headTagsByRoute.get('en:/en/article/launch/'))
  })
})
