import { describe, expect, it } from 'vitest'
import { buildNewsListItems } from '../../../src/compiler/news/build-news-list-items'
import {
  newsDefinitions,
  newsDetailPage,
  newsPackage,
  tagArchivePage,
  themeOptions,
} from '../../helpers/news-fixtures'

describe('buildNewsListItems', () => {
  it('sorts by date desc then slug and uses detail/tag publicPath links', () => {
    const a = newsPackage({ slug: 'a', date: '2026-08-10', tags: ['release'] })
    const b = newsPackage({
      slug: 'b',
      date: '2026-08-11',
      cover: './assets/b.webp',
      tags: ['release', 'tour'],
    })
    const c = newsPackage({ slug: 'c', date: '2026-08-11', tags: ['tour'] })
    const items = buildNewsListItems({
      locale: 'en',
      packages: [a, b, c],
      detailPages: [newsDetailPage(a, 'en'), newsDetailPage(b, 'en'), newsDetailPage(c, 'en')],
      tagArchivePages: [tagArchivePage('release'), tagArchivePage('tour')],
      options: themeOptions(),
      definitions: newsDefinitions,
      resolveCoverPublicPath: (pkg, rel) => `/base/assets/${pkg.slug}/${rel.replace(/^\.\//, '')}`,
      base: '/base/',
    })
    expect(items.map((item) => item.slug)).toEqual(['b', 'c', 'a'])
    expect(items[0]).toMatchObject({
      publicPath: '/base/en/news/b/',
      coverPublicPath: '/base/assets/b/assets/b.webp',
      title: 'Launch',
      titleLang: 'en-US',
      excludeFromRss: false,
    })
    expect(items[0]!.tags.map((tag) => tag.publicPath)).toEqual([
      '/base/en/news/tags/release/',
      '/base/en/news/tags/tour/',
    ])
  })

  it('uses body-locale text/lang and excludes fallback or draft items from RSS', () => {
    const pkg = newsPackage({
      slug: 'fallback',
      draft: true,
      locales: {
        zh: {
          filePath: 'zh.md',
          title: '发布',
          description: '中文说明',
          draft: false,
          body: '正文',
        },
      },
    })
    const items = buildNewsListItems({
      locale: 'en',
      packages: [pkg],
      detailPages: [
        newsDetailPage(pkg, 'en', {
          isFallback: true,
          isDraft: true,
          noindex: true,
          bodyLocale: 'zh',
          canonicalLocale: 'zh',
        }),
      ],
      tagArchivePages: [tagArchivePage('release')],
      options: themeOptions({ showDrafts: true }),
      definitions: newsDefinitions,
      resolveCoverPublicPath: () => undefined,
      base: '/base/',
    })
    expect(items[0]).toMatchObject({
      title: '发布',
      titleLang: 'zh-CN',
      description: '中文说明',
      descriptionLang: 'zh-CN',
      isFallback: true,
      isDraft: true,
      excludeFromRss: true,
      publicPath: '/base/en/news/fallback/',
    })
  })
})
