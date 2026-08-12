import { describe, expect, it } from 'vitest'
import { compileSiteRoutes } from '../../src/compiler/compile-site-routes'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import type { SynctrolDiagnostic } from '../../src/compiler/diagnostics'
import {
  homePackage,
  localeMarkdown,
  newsPackage,
  pagePackage,
  releasePackage,
  themeOptions,
} from '../helpers/route-fixtures'

function collectDiagnostics(action: () => unknown): SynctrolDiagnostic[] {
  try {
    action()
  } catch (error) {
    if (!isDiagnosticError(error)) throw error
    return error.diagnostics
  }
  throw new Error('Expected a SynctrolDiagnosticError')
}

describe('compileSiteRoutes', () => {
  it('orchestrates details, collections, and the root router', () => {
    const result = compileSiteRoutes({
      packages: [homePackage(), releasePackage()],
      options: themeOptions({ release: { index: { pagination: false } } }),
      base: '/',
      declaredTags: [],
    })

    const paths = result.pages.map((page) => page.url.routePath)
    expect(paths).toContain('/zh/')
    expect(paths).toContain('/en/')
    expect(paths).toContain('/zh/releases/')
    expect(paths).toContain('/zh/releases/first-release/')
    expect(result.diagnostics.every((d) => d.severity === 'warning')).toBe(true)
    expect(result.rootRouterHtml).toContain('location.replace')
    expect(result.rootRouterHtml).toContain('href="/zh/"')
  })

  it('derives locale keys from configured locales in order', () => {
    const result = compileSiteRoutes({
      packages: [homePackage()],
      options: themeOptions(),
      base: '/',
      declaredTags: [],
    })

    expect(
      result.pages
        .filter((page) => page.identity === 'home')
        .map((page) => page.locale),
    ).toEqual(['zh', 'en'])
  })

  it('throws when a page detail collides with a collection route', () => {
    const diagnostics = collectDiagnostics(() =>
      compileSiteRoutes({
        packages: [homePackage(), pagePackage({ slug: 'releases' })],
        options: themeOptions({ release: { index: { pagination: false } } }),
        base: '/',
        declaredTags: [],
      }),
    )

    expect(diagnostics.some((d) => d.code === 'ROUTE_COLLISION')).toBe(true)
  })

  it('throws every home matrix error at once', () => {
    const diagnostics = collectDiagnostics(() =>
      compileSiteRoutes({
        packages: [homePackage({ draft: true })],
        options: themeOptions(),
        base: '/',
        declaredTags: [],
      }),
    )

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.code).toBe('HOME_UNPUBLISHABLE')
  })

  it('aggregates a Home error and route collisions into one thrown error', () => {
    const diagnostics = collectDiagnostics(() =>
      compileSiteRoutes({
        packages: [homePackage({ draft: true }), pagePackage({ slug: 'releases' })],
        options: themeOptions({ release: { index: { pagination: false } } }),
        base: '/',
        declaredTags: [],
      }),
    )

    // Proves collect-then-throw rather than fail-fast: the Home matrix error
    // and the collisions it did not prevent are reported together.
    expect(diagnostics.filter((d) => d.code === 'HOME_UNPUBLISHABLE')).toHaveLength(1)
    expect(diagnostics.filter((d) => d.code === 'ROUTE_COLLISION')).toHaveLength(2)
    expect(diagnostics.every((d) => d.severity === 'error')).toBe(true)
  })

  it('keeps fallback warnings in the successful result', () => {
    const result = compileSiteRoutes({
      packages: [
        homePackage(),
        newsPackage({ locales: { zh: localeMarkdown({ title: '发布' }) } }),
      ],
      options: themeOptions({ news: { index: { pagination: false } } }),
      base: '/',
      declaredTags: ['release'],
    })

    expect(result.diagnostics.some((d) => d.code === 'LOCALE_FALLBACK')).toBe(true)
  })
})
