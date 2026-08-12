import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileContent } from '../../src/compiler/compile-content'
import { compileSiteRoutes } from '../../src/compiler/compile-site-routes'
import { buildRoutePackages } from '../../src/compiler/route-packages'
import { buildNewsFrontmatterForPage } from '../../src/compiler/news/attach-news-page-data'
import { buildPageFrontmatterForPage } from '../../src/compiler/page/attach-page-page-data'
import { themeOptions } from '../helpers/route-fixtures'

const fixtureRoot = resolve('tests/fixtures/news-page-site')

function compileFixture(overrides = {}, base = '/base/') {
  const options = themeOptions(overrides)
  const content = compileContent({
    contentRoot: join(fixtureRoot, 'content'),
    sourceDir: fixtureRoot,
    configDir: join(fixtureRoot, '.vuepress'),
    mainLocale: options.mainLocale,
  })
  const packages = buildRoutePackages({
    packages: content.packages,
    localeKeys: Object.keys(options.locales),
  })
  const site = compileSiteRoutes({
    packages,
    options,
    base,
    declaredTags: Object.keys(content.definitions.tags),
  })
  return { options, content, packages, site }
}

describe('news and page integration fixture', () => {
  it('emits default routes, fallback list data, tag counts, and page frontmatter', () => {
    const { options, content, packages, site } = compileFixture()
    const paths = site.pages.map((page) => page.url.publicPath)
    expect(paths).toContain('/base/zh/news/')
    expect(paths).toContain('/base/zh/news/tags/')
    expect(paths).toContain('/base/zh/news/tags/release/')
    expect(paths).toContain('/base/en/news/beta/')
    expect(paths).toContain('/base/zh/team/')
    expect(paths).not.toContain('/base/zh/pages/')

    const enIndex = site.pages.find((page) => page.url.publicPath === '/base/en/news/')
    const enIndexData = buildNewsFrontmatterForPage({
      compiled: enIndex!,
      allPages: site.pages,
      packages,
      options,
      definitions: content.definitions,
      resolveCoverPublicPath: (pkg, rel) => `/base/assets/${pkg.slug}/${rel}`,
      base: '/base/',
    })
    expect(enIndexData?.kind).toBe('index')
    if (enIndexData?.kind !== 'index') return
    const beta = enIndexData.data.items.find((item) => item.slug === 'beta')
    expect(beta).toMatchObject({ isFallback: true, excludeFromRss: true, titleLang: 'zh-CN' })

    const team = site.pages.find((page) => page.url.publicPath === '/base/zh/team/')
    expect(
      buildPageFrontmatterForPage({
        compiled: team!,
        packages,
        options,
        resolveCoverPublicPath: () => '/base/assets/team.webp',
      }),
    ).toMatchObject({ kind: 'detail', data: { kind: 'page-detail' } })
  })

  it('honors custom urlSegments and enabled flags', () => {
    const { site } = compileFixture({
      news: {
        urlSegment: 'journal',
        index: { enabled: false, pagination: 12 },
        tags: { urlSegment: 'topics', index: { enabled: false } },
      },
    })
    const paths = site.pages.map((page) => page.url.publicPath)
    expect(paths).not.toContain('/base/zh/journal/')
    expect(paths).not.toContain('/base/zh/journal/topics/')
    expect(paths).toContain('/base/zh/journal/alpha/')
    expect(paths).toContain('/base/zh/journal/topics/release/')
  })
})
