import { describe, expect, it } from 'vitest'
import { buildNewsFrontmatterForPage } from '../../../src/compiler/news/attach-news-page-data'
import {
  newsDefinitions,
  newsDetailPage,
  newsPackage,
  tagArchivePage,
  themeOptions,
} from '../../helpers/news-fixtures'
import type { CompiledPage } from '../../../src/shared/route-types'

function collectionPage(partial: Partial<CompiledPage> & Pick<CompiledPage, 'identity' | 'url' | 'collection'>): CompiledPage {
  return {
    locale: 'en',
    contentType: 'news-collection',
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: 'en',
    canonicalLocale: 'en',
    title: String(partial.identity),
    ...partial,
  }
}

describe('buildNewsFrontmatterForPage', () => {
  it('builds index data with paginated title and sibling publicPath pagination', () => {
    const a = newsPackage({ slug: 'a', date: '2026-08-11' })
    const b = newsPackage({ slug: 'b', date: '2026-08-10' })
    const index = collectionPage({
      identity: 'news-index',
      url: { routePath: '/en/news/', outputPath: 'en/news/index.html', publicPath: '/base/en/news/', absoluteUrl: 'https://synctrol.com/base/en/news/' },
      collection: { page: 1, pageCount: 2, itemIdentities: ['news:a'] },
    })
    const page2 = collectionPage({
      identity: 'news-page:2',
      url: { routePath: '/en/news/page/2/', outputPath: 'en/news/page/2/index.html', publicPath: '/base/en/news/page/2/', absoluteUrl: 'https://synctrol.com/base/en/news/page/2/' },
      collection: { page: 2, pageCount: 2, itemIdentities: ['news:b'] },
    })
    const frontmatter = buildNewsFrontmatterForPage({
      compiled: page2,
      allPages: [newsDetailPage(a, 'en'), newsDetailPage(b, 'en'), index, page2, tagArchivePage('release')],
      packages: [a, b],
      options: themeOptions(),
      definitions: newsDefinitions,
      resolveCoverPublicPath: () => undefined,
      base: '/base/',
    })
    expect(frontmatter).toMatchObject({
      kind: 'index',
      data: {
        kind: 'news-index',
        heading: 'News · Page 2',
        pagination: {
          page: 2,
          pageCount: 2,
          prevPublicPath: '/base/en/news/',
          nextPublicPath: undefined,
        },
      },
    })
    expect(frontmatter?.kind).toBe('index')
    if (frontmatter?.kind === 'index') {
      expect(frontmatter.data.items.map((item) => item.slug)).toEqual(['b'])
    }
  })

  it('builds tags index and tag archive frontmatter', () => {
    const pkg = newsPackage({ slug: 'a', tags: ['release'] })
    const tagsIndex = collectionPage({
      identity: 'news-tags-index',
      url: { routePath: '/en/news/tags/', outputPath: 'en/news/tags/index.html', publicPath: '/base/en/news/tags/', absoluteUrl: 'https://synctrol.com/base/en/news/tags/' },
      collection: { page: 1, pageCount: 1, itemIdentities: [] },
    })
    const archive = tagArchivePage('release')
    const allPages = [newsDetailPage(pkg, 'en'), tagsIndex, archive]
    expect(
      buildNewsFrontmatterForPage({
        compiled: tagsIndex,
        allPages,
        packages: [pkg],
        options: themeOptions(),
        definitions: newsDefinitions,
        resolveCoverPublicPath: () => undefined,
        base: '/base/',
      }),
    ).toMatchObject({ kind: 'tags-index', data: { kind: 'news-tags-index', pagination: null } })
    expect(
      buildNewsFrontmatterForPage({
        compiled: archive,
        allPages,
        packages: [pkg],
        options: themeOptions(),
        definitions: newsDefinitions,
        resolveCoverPublicPath: () => undefined,
        base: '/base/',
      }),
    ).toMatchObject({ kind: 'tag', data: { kind: 'news-tag', heading: 'Releases · News', tagKey: 'release' } })
  })

  it('builds detail data with fallback message and cover publicPath', () => {
    const pkg = newsPackage({ slug: 'launch', updated: '2026-08-12', cover: './assets/n.webp' })
    const page = newsDetailPage(pkg, 'en', { isFallback: true, bodyLocale: 'zh', canonicalLocale: 'zh' })
    const frontmatter = buildNewsFrontmatterForPage({
      compiled: page,
      allPages: [page, tagArchivePage('release')],
      packages: [pkg],
      options: themeOptions(),
      definitions: newsDefinitions,
      resolveCoverPublicPath: (_pkg, ref) => `/base/assets/${ref}`,
      base: '/base/',
    })
    expect(frontmatter).toMatchObject({
      kind: 'detail',
      data: {
        slug: 'launch',
        titleLang: 'zh-CN',
        updated: '2026-08-12',
        coverPublicPath: '/base/assets/./assets/n.webp',
        translationUnavailableMessage: 'This article is not yet available in English. Showing the original version.',
      },
    })
  })
})
