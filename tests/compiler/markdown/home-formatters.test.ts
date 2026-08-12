import MarkdownIt from 'markdown-it'
import { describe, expect, it } from 'vitest'
import { buildHomeFrontmatterForPage } from '../../../src/compiler/home/build-home-frontmatter'
import { extractHomeFormatterHtml } from '../../../src/compiler/home/extract-home-formatter-html'
import { assertHomeHasLogo, registerHomeFormatters } from '../../../src/compiler/markdown/home-formatters'
import { homePackage } from '../../helpers/news-fixtures'
import type { CompiledPage } from '../../../src/shared/route-types'

describe('home formatters', () => {
  it('registers the home-logo markdown-it container', () => {
    const md = new MarkdownIt()
    registerHomeFormatters(md)
    const html = md.render('::: home-logo\n# SYNCTROL\n:::\n')
    expect(html).toContain('data-syn-formatter="home-logo"')
    expect(html).toContain('SYNCTROL')
    expect(html).not.toContain('home-footer')
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

  it('renders the extracted logo HTML with reference classes and per-line sub-labels', () => {
    const md = new MarkdownIt()
    registerHomeFormatters(md)
    const html = md.render(
      '::: home-logo\n# SYNCTROL\n\nWE SHAPE WAVE  \nAND DESCRIBE SOUND\n:::\n',
    )
    const extracted = extractHomeFormatterHtml(html)
    expect(extracted.logoHtml).toContain('<h1 class="logo">SYNCTROL</h1>')
    expect(extracted.logoHtml).toContain('<p class="logo-sub">WE SHAPE WAVE</p>')
    expect(extracted.logoHtml).toContain('<p class="logo-sub">AND DESCRIBE SOUND</p>')
    expect(extracted.logoHtml).not.toContain('<br')
    expect(extracted.logoHtml).toContain('data-syn-formatter="home-logo"')
  })
})
