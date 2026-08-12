import { describe, expect, it } from 'vitest'
import { buildPageFrontmatterForPage } from '../../../src/compiler/page/attach-page-page-data'
import { pagePackage, themeOptions } from '../../helpers/news-fixtures'
import type { CompiledPage } from '../../../src/shared/route-types'

describe('buildPageFrontmatterForPage', () => {
  it('builds page detail data with optional cover and fallback message', () => {
    const pkg = pagePackage({ slug: 'team', cover: './assets/team.webp' })
    const page: CompiledPage = {
      identity: 'page:team',
      locale: 'en',
      contentType: 'page',
      url: { routePath: '/en/team/', outputPath: 'en/team/index.html', publicPath: '/base/en/team/', absoluteUrl: 'https://synctrol.com/base/en/team/' },
      isFallback: true,
      isDraft: false,
      noindex: true,
      bodyLocale: 'zh',
      canonicalLocale: 'zh',
      packagePath: pkg.dir,
      slug: 'team',
      title: '团队',
    }
    expect(
      buildPageFrontmatterForPage({
        compiled: page,
        packages: [pkg],
        options: themeOptions(),
        resolveCoverPublicPath: () => '/base/assets/team.webp',
      }),
    ).toEqual({
      kind: 'detail',
      data: {
        kind: 'page-detail',
        slug: 'team',
        title: '关于',
        titleLang: 'zh-CN',
        coverPublicPath: '/base/assets/team.webp',
        isFallback: true,
        isDraft: false,
        translationUnavailableMessage:
          'This article is not yet available in English. Showing the original version.',
        bodyLang: 'zh-CN',
      },
    })
  })
})
