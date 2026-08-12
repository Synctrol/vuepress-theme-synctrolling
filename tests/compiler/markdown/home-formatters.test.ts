import MarkdownIt from 'markdown-it'
import { describe, expect, it } from 'vitest'
import { buildHomeFrontmatterForPage } from '../../../src/compiler/home/build-home-frontmatter'
import { extractHomeFormatterHtml } from '../../../src/compiler/home/extract-home-formatter-html'
import { assertHomeHasLogo, registerHomeFormatters } from '../../../src/compiler/markdown/home-formatters'
import { homePackage } from '../../helpers/news-fixtures'
import type { CompiledPage } from '../../../src/shared/route-types'

describe('home formatters', () => {
  it('registers home-logo and home-footer markdown-it containers', () => {
    const md = new MarkdownIt()
    registerHomeFormatters(md)
    const html = md.render('::: home-logo\n# SYNCTROL\n:::\n\n::: home-footer\nContact\n:::\n')
    expect(html).toContain('data-syn-formatter="home-logo"')
    expect(html).toContain('SYNCTROL')
    expect(html).toContain('data-syn-formatter="home-footer"')
  })

  it('asserts home-logo exists in Home markdown source', () => {
    expect(() => assertHomeHasLogo('::: home-logo\n# SYNCTROL\n:::\n', '/content/home/zh.md')).not.toThrow()
    expect(() => assertHomeHasLogo('# Missing', '/content/home/zh.md')).toThrow(/home-logo/)
  })

  it('extracts formatter HTML and builds Home frontmatter', () => {
    const md = new MarkdownIt()
    registerHomeFormatters(md)
    const extracted = extractHomeFormatterHtml(md.render('::: home-logo\n# SYNCTROL\n:::\n'))
    expect(extracted.logoHtml).toContain('SYNCTROL')
    expect(extracted.footerHtml).toBeUndefined()

    const pkg = homePackage({
      locales: {
        en: {
          filePath: 'en.md',
          title: 'Home SEO',
          description: 'SEO only',
          draft: false,
          body: '::: home-logo\n# SYNCTROL\n:::\n',
        },
      },
    })
    const page: CompiledPage = {
      identity: 'home',
      locale: 'en',
      contentType: 'home',
      url: { routePath: '/en/', outputPath: 'en/index.html', publicPath: '/base/en/', absoluteUrl: 'https://synctrol.com/base/en/' },
      isFallback: false,
      isDraft: false,
      noindex: false,
      bodyLocale: 'en',
      canonicalLocale: 'en',
      packagePath: pkg.dir,
      slug: null,
      title: 'Home SEO',
    }
    expect(buildHomeFrontmatterForPage({ compiled: page, packages: [pkg] })).toMatchObject({
      kind: 'home',
      logoHtml: expect.stringContaining('SYNCTROL'),
    })
  })
})
