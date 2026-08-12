import { describe, expect, it } from 'vitest'
import { compileDetailRoutes } from '../../src/compiler/detail-routes'
import { encodeRouteSegment } from '../../src/compiler/path-suffix'
import { enMessages } from '../../src/shared/messages'
import {
  homePackage,
  localeMarkdown,
  pagePackage,
  releasePackage,
  themeOptions,
} from '../helpers/route-fixtures'

const baseCtx = {
  options: themeOptions(),
  base: '/',
  localeKeys: ['zh', 'en'],
}

describe('compileDetailRoutes', () => {
  it('emits locale-prefixed detail routes for every locale', () => {
    const { pages } = compileDetailRoutes([releasePackage()], baseCtx)

    expect(pages.map((page) => page.url.routePath).sort()).toEqual([
      '/en/releases/first-release/',
      '/zh/releases/first-release/',
    ])
    expect(pages.every((page) => page.identity === 'release:first-release')).toBe(
      true,
    )
    expect(pages.every((page) => page.contentType === 'release')).toBe(true)
    expect(pages.every((page) => page.packagePath === '/content/releases/first-release')).toBe(
      true,
    )
  })

  it('encodes a non-ASCII locale key in routePath while keeping CompiledPage.locale raw', () => {
    const locale = '日本語'
    const encoded = encodeRouteSegment(locale, 'locale')
    const options = themeOptions({
      mainLocale: locale,
      locales: {
        [locale]: { lang: 'ja', label: '日本語', messages: { ...enMessages } },
      },
    })
    const { pages } = compileDetailRoutes(
      [
        releasePackage({
          locales: { [locale]: localeMarkdown({ title: '作品' }) },
        }),
      ],
      { options, base: '/', localeKeys: [locale] },
    )

    expect(pages).toHaveLength(1)
    expect(pages[0]?.locale).toBe(locale)
    expect(pages[0]?.url.routePath).toBe(`/${encoded}/releases/first-release/`)
    expect(pages[0]?.url.outputPath).toBe(
      `${locale}/releases/first-release/index.html`,
    )
    expect(pages[0]?.url.routePath).not.toContain('/日本語/')
  })

  it('emits opaque custom paths including locale-like segments', () => {
    const { pages } = compileDetailRoutes(
      [releasePackage({ path: { zh: '/zh/test/' } })],
      baseCtx,
    )

    expect(pages.find((page) => page.locale === 'zh')?.url.routePath).toBe(
      '/zh/zh/test/',
    )
    expect(pages.find((page) => page.locale === 'en')?.url.routePath).toBe(
      '/en/releases/first-release/',
    )
  })

  it('emits fallback pages with noindex and the main canonical locale', () => {
    const { pages, diagnostics } = compileDetailRoutes(
      [
        releasePackage({
          locales: { zh: localeMarkdown({ title: 'ZH', description: 'D' }) },
        }),
      ],
      baseCtx,
    )

    const en = pages.find((page) => page.locale === 'en')
    expect(en).toMatchObject({
      isFallback: true,
      noindex: true,
      canonicalLocale: 'zh',
      bodyLocale: 'zh',
      title: 'ZH',
      description: 'D',
    })
    expect(en?.url.routePath).toBe('/en/releases/first-release/')
    expect(diagnostics.some((d) => d.code === 'LOCALE_FALLBACK')).toBe(true)

    const zh = pages.find((page) => page.locale === 'zh')
    expect(zh?.isFallback).toBe(false)
    expect(zh?.noindex).toBe(false)
  })

  it('emits home at /{locale}/ only', () => {
    const { pages } = compileDetailRoutes([homePackage()], baseCtx)

    expect(pages.map((page) => page.url.routePath).sort()).toEqual(['/en/', '/zh/'])
    expect(pages.every((page) => page.identity === 'home')).toBe(true)
    expect(pages.every((page) => page.slug === null)).toBe(true)
  })

  it('emits page details at /{locale}/{slug}/', () => {
    const { pages } = compileDetailRoutes([pagePackage()], baseCtx)

    expect(pages.map((page) => page.url.routePath).sort()).toEqual([
      '/en/about/',
      '/zh/about/',
    ])
  })

  it('skips manifest drafts when showDrafts is false', () => {
    const { pages } = compileDetailRoutes([releasePackage({ draft: true })], baseCtx)

    expect(pages).toEqual([])
  })

  it('includes drafts with noindex when showDrafts is true', () => {
    const { pages } = compileDetailRoutes([releasePackage({ draft: true })], {
      ...baseCtx,
      options: themeOptions({ showDrafts: true }),
    })

    expect(pages).toHaveLength(2)
    expect(pages.every((page) => page.isDraft && page.noindex)).toBe(true)
  })

  it('surfaces home matrix errors as diagnostics without emitting pages', () => {
    const { pages, diagnostics } = compileDetailRoutes(
      [homePackage({ draft: true })],
      baseCtx,
    )

    expect(pages).toEqual([])
    expect(diagnostics[0]).toMatchObject({
      severity: 'error',
      code: 'HOME_UNPUBLISHABLE',
    })
  })

  it('builds absolute and public URLs from siteUrl and base', () => {
    const { pages } = compileDetailRoutes([releasePackage()], {
      ...baseCtx,
      base: '/docs/',
    })

    const zh = pages.find((page) => page.locale === 'zh')
    expect(zh?.url.publicPath).toBe('/docs/zh/releases/first-release/')
    expect(zh?.url.absoluteUrl).toBe(
      'https://synctrol.com/docs/zh/releases/first-release/',
    )
    expect(zh?.url.outputPath).toBe('zh/releases/first-release/index.html')
  })
})
