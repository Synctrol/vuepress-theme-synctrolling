import { describe, expect, it } from 'vitest'
import { buildUrlLayers } from '../../src/compiler/url-layers'

describe('buildUrlLayers', () => {
  it('builds four layers for a locale-prefixed detail route with a root base', () => {
    expect(
      buildUrlLayers({
        locale: 'zh',
        pathSuffix: '/releases/first-release/',
        base: '/',
        siteUrl: 'https://synctrol.com',
      }),
    ).toEqual({
      routePath: '/zh/releases/first-release/',
      outputPath: 'zh/releases/first-release/index.html',
      publicPath: '/zh/releases/first-release/',
      absoluteUrl: 'https://synctrol.com/zh/releases/first-release/',
    })
  })

  it('builds the locale home from the root suffix', () => {
    expect(
      buildUrlLayers({
        locale: 'en',
        pathSuffix: '/',
        base: '/',
        siteUrl: 'https://synctrol.com',
      }),
    ).toEqual({
      routePath: '/en/',
      outputPath: 'en/index.html',
      publicPath: '/en/',
      absoluteUrl: 'https://synctrol.com/en/',
    })
  })

  it('includes a non-root VuePress base in publicPath and absoluteUrl only', () => {
    const layers = buildUrlLayers({
      locale: 'en',
      pathSuffix: '/',
      base: '/docs/',
      siteUrl: 'https://example.com',
    })

    expect(layers).toEqual({
      routePath: '/en/',
      outputPath: 'en/index.html',
      publicPath: '/docs/en/',
      absoluteUrl: 'https://example.com/docs/en/',
    })
  })

  it('never puts the VuePress base into routePath or outputPath', () => {
    const layers = buildUrlLayers({
      locale: 'zh',
      pathSuffix: '/news/',
      base: '/site/',
      siteUrl: 'https://synctrol.com',
    })

    expect(layers.routePath).toBe('/zh/news/')
    expect(layers.outputPath).toBe('zh/news/index.html')
    expect(layers.publicPath).toBe('/site/zh/news/')
  })

  it('normalizes an unslashed suffix and a trailing-slash siteUrl', () => {
    const layers = buildUrlLayers({
      locale: 'zh',
      pathSuffix: 'news/tags',
      base: '/',
      siteUrl: 'https://synctrol.com/',
    })

    expect(layers.routePath).toBe('/zh/news/tags/')
    expect(layers.absoluteUrl).toBe('https://synctrol.com/zh/news/tags/')
  })

  it('keeps routePath encoded but decodes outputPath to match VuePress', () => {
    const encoded = encodeURIComponent('作品')
    const layers = buildUrlLayers({
      locale: 'zh',
      pathSuffix: `/releases/${encoded}/`,
      base: '/docs/',
      siteUrl: 'https://synctrol.com',
    })

    expect(layers.routePath).toBe(`/zh/releases/${encoded}/`)
    expect(layers.publicPath).toBe(`/docs/zh/releases/${encoded}/`)
    expect(layers.absoluteUrl).toBe(
      `https://synctrol.com/docs/zh/releases/${encoded}/`,
    )
    expect(layers.outputPath).toBe('zh/releases/作品/index.html')
  })

  it('treats locale as an already-encoded segment (CJK must be pre-encoded by the caller)', () => {
    // buildUrlLayers concatenates; it does not call encodeRouteSegment.
    // Callers (detail/collection routes) pass encodeRouteSegment(localeKey, 'locale').
    const locale = encodeURIComponent('日本語')
    const layers = buildUrlLayers({
      locale,
      pathSuffix: '/',
      base: '/docs/',
      siteUrl: 'https://synctrol.com',
    })

    expect(layers.routePath).toBe(`/${locale}/`)
    expect(layers.outputPath).toBe('日本語/index.html')
    expect(layers.publicPath).toBe(`/docs/${locale}/`)
    expect(layers.absoluteUrl).toBe(`https://synctrol.com/docs/${locale}/`)
  })

  it('does not re-encode a locale segment that is already percent-encoded', () => {
    const locale = encodeURIComponent('日本語')
    const layers = buildUrlLayers({
      locale,
      pathSuffix: '/news/tags/a%20b/',
      base: '/',
      siteUrl: 'https://synctrol.com',
    })

    expect(layers.routePath).toBe(`/${locale}/news/tags/a%20b/`)
    expect(layers.outputPath).toBe('日本語/news/tags/a b/index.html')
  })

  it('decodes a percent-encoded space in outputPath only', () => {
    const layers = buildUrlLayers({
      locale: 'zh',
      pathSuffix: '/news/tags/a%20b/',
      base: '/',
      siteUrl: 'https://synctrol.com',
    })

    expect(layers.routePath).toBe('/zh/news/tags/a%20b/')
    expect(layers.outputPath).toBe('zh/news/tags/a b/index.html')
  })
})
