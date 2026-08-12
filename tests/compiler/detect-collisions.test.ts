import { describe, expect, it } from 'vitest'
import { detectRouteCollisions } from '../../src/compiler/detect-collisions'
import type { CompiledPage } from '../../src/shared/route-types'

function page(routePath: string, identity: string, dir?: string): CompiledPage {
  const compiled: CompiledPage = {
    identity: identity as CompiledPage['identity'],
    locale: 'zh',
    contentType: 'page',
    url: {
      routePath,
      outputPath: `${routePath.slice(1)}index.html`,
      publicPath: routePath,
      absoluteUrl: `https://synctrol.com${routePath}`,
    },
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: 'zh',
    canonicalLocale: 'zh',
    title: identity,
  }
  if (dir !== undefined) compiled.packagePath = dir
  return compiled
}

describe('detectRouteCollisions', () => {
  it('reports an error for duplicate routePath values', () => {
    const diagnostics = detectRouteCollisions([
      page('/zh/about/', 'page:about', '/content/pages/about'),
      page('/zh/about/', 'page:about-2', '/content/pages/about-2'),
    ])

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      severity: 'error',
      code: 'ROUTE_COLLISION',
      path: '/content/pages/about-2',
      relatedPath: '/content/pages/about',
    })
    expect(diagnostics[0]?.message).toContain('/zh/about/')
  })

  it('allows the same suffix under different locales', () => {
    const zh = page('/zh/about/', 'page:about')
    const en = page('/en/about/', 'page:about')
    en.locale = 'en'

    expect(detectRouteCollisions([zh, en])).toEqual([])
  })

  it('reports each duplicate once per extra page', () => {
    expect(
      detectRouteCollisions([
        page('/zh/a/', 'page:a'),
        page('/zh/a/', 'page:b'),
        page('/zh/a/', 'page:c'),
      ]),
    ).toHaveLength(2)
  })
})
