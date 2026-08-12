import { describe, expect, it } from 'vitest'
import { compileCollectionRoutes } from '../../src/compiler/collection-routes'
import { compileDetailRoutes } from '../../src/compiler/detail-routes'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { encodeRouteSegment } from '../../src/compiler/path-suffix'
import { enMessages } from '../../src/shared/messages'
import type { ResolvedSynctrolThemeOptions } from '../../src/shared/options'
import type { RouteContentPackage } from '../../src/shared/types'
import {
  localeMarkdown,
  newsPackage,
  releasePackage,
  themeOptions,
} from '../helpers/route-fixtures'

function compile(
  packages: RouteContentPackage[],
  options: ResolvedSynctrolThemeOptions,
  localeKeys: readonly string[],
  declaredTags: string[] = [],
) {
  const detail = compileDetailRoutes(packages, { options, base: '/', localeKeys })
  return compileCollectionRoutes({
    detailPages: detail.pages,
    packages,
    options,
    base: '/',
    localeKeys,
    declaredTags,
  })
}

describe('compileCollectionRoutes', () => {
  it('emits release, news, tags index, and tag archive routes per locale', () => {
    const options = themeOptions({
      release: { index: { pagination: false } },
      news: { index: { pagination: false } },
    })
    const pages = compile(
      [releasePackage(), newsPackage()],
      options,
      ['zh', 'en'],
      ['release'],
    )
    const paths = pages.map((page) => page.url.routePath)

    for (const expected of [
      '/zh/releases/',
      '/en/releases/',
      '/zh/news/',
      '/en/news/',
      '/zh/news/tags/',
      '/en/news/tags/',
      '/zh/news/tags/release/',
      '/en/news/tags/release/',
    ]) {
      expect(paths).toContain(expected)
    }
    expect(pages.every((page) => !page.isFallback && !page.noindex)).toBe(true)
  })

  it('respects custom urlSegment values shared by every locale', () => {
    const options = themeOptions({
      release: { urlSegment: 'works', index: { pagination: false } },
      news: {
        urlSegment: 'journal',
        index: { pagination: false },
        tags: { urlSegment: 'topics', index: { enabled: false } },
      },
    })
    const paths = compile(
      [releasePackage(), newsPackage()],
      options,
      ['zh'],
      ['release'],
    ).map((page) => page.url.routePath)

    expect(paths).toContain('/zh/works/')
    expect(paths).toContain('/zh/journal/')
    expect(paths).toContain('/zh/journal/topics/release/')
    expect(paths).not.toContain('/zh/journal/topics/')
  })

  it('encodes a non-ASCII locale key into every collection routePath', () => {
    const locale = '日本語'
    const encoded = encodeRouteSegment(locale, 'locale')
    // Plan 01 requires complete messages for non-zh/en locales (same as Task 7).
    const options = themeOptions({
      mainLocale: locale,
      locales: {
        [locale]: { lang: 'ja', label: '日本語', messages: { ...enMessages } },
        en: { lang: 'en-US', label: 'English' },
      },
      release: { index: { pagination: false } },
      news: { index: { pagination: false } },
    })
    const paths = compile(
      [
        releasePackage({
          locales: { [locale]: localeMarkdown({ title: '作品' }) },
        }),
        newsPackage({
          locales: { [locale]: localeMarkdown({ title: 'ニュース' }) },
        }),
      ],
      options,
      [locale],
      ['release'],
    ).map((page) => page.url.routePath)

    expect(paths).toContain(`/${encoded}/releases/`)
    expect(paths).toContain(`/${encoded}/news/`)
    expect(paths).toContain(`/${encoded}/news/tags/`)
    expect(paths).toContain(`/${encoded}/news/tags/release/`)
    expect(paths.every((path) => !path.includes('/日本語/'))).toBe(true)
  })

  it('rejects a Plan-01-valid urlSegment that VuePress would rewrite', () => {
    const options = themeOptions({
      release: { urlSegment: 'x*y', index: { pagination: false } },
    })
    try {
      compile([releasePackage()], options, ['zh'])
      throw new Error('Expected UNROUTABLE_SEGMENT')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('UNROUTABLE_SEGMENT')
      }
    }
  })

  it('suppresses indexes when enabled is false but keeps tag archives', () => {
    const options = themeOptions({
      release: { index: { enabled: false } },
      news: { index: { enabled: false } },
    })
    const paths = compile(
      [releasePackage(), newsPackage()],
      options,
      ['zh'],
      ['release'],
    ).map((page) => page.url.routePath)

    expect(paths).not.toContain('/zh/releases/')
    expect(paths).not.toContain('/zh/news/')
    expect(paths).toContain('/zh/news/tags/')
    expect(paths).toContain('/zh/news/tags/release/')
  })

  it('paginates from page two and keeps fallback items visible', () => {
    const options = themeOptions({ release: { index: { pagination: 2 } } })
    const packages = [
      releasePackage({ slug: 'a', date: '2026-08-13', dir: '/content/releases/a' }),
      releasePackage({ slug: 'b', date: '2026-08-12', dir: '/content/releases/b' }),
      releasePackage({
        slug: 'c',
        date: '2026-08-11',
        dir: '/content/releases/c',
        locales: { zh: localeMarkdown({ title: 'C' }) },
      }),
    ]
    const pages = compile(packages, options, ['zh', 'en'])

    expect(pages.some((page) => page.identity === 'release-page:1')).toBe(false)

    const zhIndex = pages.find(
      (page) => page.identity === 'release-index' && page.locale === 'zh',
    )
    expect(zhIndex?.collection).toEqual({
      page: 1,
      pageCount: 2,
      itemIdentities: ['release:a', 'release:b'],
    })

    const zhPageTwo = pages.find(
      (page) => page.identity === 'release-page:2' && page.locale === 'zh',
    )
    expect(zhPageTwo?.url.routePath).toBe('/zh/releases/page/2/')
    expect(zhPageTwo?.collection?.itemIdentities).toEqual(['release:c'])

    const enIndex = pages.find(
      (page) => page.identity === 'release-index' && page.locale === 'en',
    )
    expect(enIndex?.collection?.pageCount).toBe(2)
    expect(enIndex?.collection?.itemIdentities).toEqual(['release:a', 'release:b'])
  })

  it('emits one unpaginated list when pagination is false', () => {
    const options = themeOptions({ release: { index: { pagination: false } } })
    const packages = [
      releasePackage({ slug: 'a', date: '2026-08-13', dir: '/content/releases/a' }),
      releasePackage({ slug: 'b', date: '2026-08-12', dir: '/content/releases/b' }),
    ]
    const pages = compile(packages, options, ['zh'])

    expect(pages.filter((page) => page.contentType === 'release-collection')).toHaveLength(1)
    expect(pages[0]?.collection).toEqual({
      page: 1,
      pageCount: 1,
      itemIdentities: ['release:a', 'release:b'],
    })
  })

  it('emits an empty index when a collection has no visible items', () => {
    const options = themeOptions({ release: { index: { pagination: 2 } } })
    const pages = compile([], options, ['zh'])

    expect(pages.find((page) => page.identity === 'release-index')?.collection).toEqual({
      page: 1,
      pageCount: 1,
      itemIdentities: [],
    })
  })

  it('sorts by date descending then slug ascending', () => {
    const options = themeOptions({ news: { index: { pagination: false } } })
    const packages = [
      newsPackage({ slug: 'b', date: '2026-08-10', dir: '/content/news/b' }),
      newsPackage({ slug: 'a', date: '2026-08-10', dir: '/content/news/a' }),
      newsPackage({ slug: 'c', date: '2026-08-11', dir: '/content/news/c' }),
    ]
    const pages = compile(packages, options, ['zh'], ['release'])

    expect(
      pages.find((page) => page.identity === 'news-index')?.collection?.itemIdentities,
    ).toEqual(['news:c', 'news:a', 'news:b'])
  })

  it('percent-encodes tag segments and keeps the raw tag in identity and collection', () => {
    const options = themeOptions({
      news: { index: { pagination: false }, tags: { index: { enabled: false } } },
    })
    const pages = compile(
      [newsPackage({ tags: ['作品发布'] })],
      options,
      ['zh'],
      ['作品发布'],
    )
    const archive = pages.find((page) => page.identity === 'news-tag:作品发布')

    expect(archive?.url.routePath).toBe(
      `/zh/news/tags/${encodeURIComponent('作品发布')}/`,
    )
    expect(archive?.collection?.tag).toBe('作品发布')
  })

  it('paginates tag archives with news.index.pagination', () => {
    const options = themeOptions({ news: { index: { pagination: 1 } } })
    const packages = [
      newsPackage({ slug: 'a', date: '2026-08-11', dir: '/content/news/a' }),
      newsPackage({ slug: 'b', date: '2026-08-10', dir: '/content/news/b' }),
    ]
    const pages = compile(packages, options, ['zh'], ['release'])

    expect(
      pages.find((page) => page.identity === 'news-tag:release:page:2')?.url.routePath,
    ).toBe('/zh/news/tags/release/page/2/')
  })

  it('omits tag archives for declared tags with no visible items', () => {
    const options = themeOptions({ news: { index: { pagination: false } } })
    const paths = compile(
      [newsPackage({ tags: ['release'] })],
      options,
      ['zh'],
      ['release', 'unused'],
    ).map((page) => page.url.routePath)

    expect(paths).toContain('/zh/news/tags/release/')
    expect(paths).not.toContain('/zh/news/tags/unused/')
  })

  it('excludes items whose detail page was skipped', () => {
    const options = themeOptions({ release: { index: { pagination: false } } })
    const pages = compile(
      [releasePackage(), releasePackage({ slug: 'hidden', draft: true, dir: '/content/releases/hidden' })],
      options,
      ['zh'],
    )

    expect(
      pages.find((page) => page.identity === 'release-index')?.collection?.itemIdentities,
    ).toEqual(['release:first-release'])
  })
})
