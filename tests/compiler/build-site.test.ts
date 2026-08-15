import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildSite, mergeSiteDiagnostics } from '../../src/compiler/build-site'
import type { SynctrolDiagnostic } from '../../src/compiler/diagnostics'
import { themeOptions } from '../helpers/route-fixtures'

let root: string

function write(relativePath: string, contents: string): void {
  const absolute = join(root, relativePath)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, contents, 'utf8')
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'synctrol-buildsite-'))
  write('content/definitions.yml', 'tags:\n  release:\n    title:\n      zh: 作品\n      en: Releases\n')
  write('content/home/content.yml', 'type: home\n')
  write('content/home/zh.md', '---\ntitle: 首页\ndescription: SEO\n---\n::: home-logo\n# SYNCTROL\n:::\n\n首页正文\n')
  write('content/news/launch/content.yml', 'type: news\nslug: launch\ndate: 2026-08-10\ntags:\n  - release\n')
  write('content/news/launch/zh.md', '---\ntitle: 发布\n---\n发布正文\n')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('mergeSiteDiagnostics', () => {
  it('keeps content warnings ahead of route warnings', () => {
    const content: SynctrolDiagnostic[] = [
      { severity: 'warning', code: 'CONTENT_WARNING', message: 'from Plan 02' },
    ]
    const route: SynctrolDiagnostic[] = [
      { severity: 'warning', code: 'LOCALE_FALLBACK', message: 'from Plan 03' },
    ]

    expect(mergeSiteDiagnostics(content, route).map((d) => d.code)).toEqual([
      'CONTENT_WARNING',
      'LOCALE_FALLBACK',
    ])
  })

  it('returns a fresh array that does not alias its inputs', () => {
    const content: SynctrolDiagnostic[] = []
    const merged = mergeSiteDiagnostics(content, [])
    merged.push({ severity: 'warning', code: 'X', message: 'x' })

    expect(content).toEqual([])
  })
})

describe('buildSite', () => {
  it('wires content compilation, route packages, and route compilation', () => {
    const built = buildSite({
      sourceDir: root,
      configDir: join(root, '.vuepress'),
      options: themeOptions({ news: { index: { pagination: false } } }),
      base: '/',
    })

    const paths = built.site.pages.map((page) => page.url.routePath)
    expect(paths).toContain('/zh/')
    expect(paths).toContain('/en/')
    expect(paths).toContain('/zh/article/launch/')
    expect(paths).toContain('/zh/news/tags/release/')

    expect(built.packages.map((pkg) => pkg.identity).sort()).toEqual([
      'home',
      'news:launch',
    ])
    expect(Object.keys(built.definitions.tags)).toEqual(['release'])

    // Plan 04 Task 10: compiled packages retained for the asset adapter.
    expect(built.compiledPackages).toBeDefined()
    expect(
      built.compiledPackages.map((pkg) => ({
        dir: pkg.dir,
        identity: pkg.identity,
      })),
    ).toEqual(
      built.packages.map((pkg) => ({
        dir: pkg.dir,
        identity: pkg.identity,
      })),
    )
  })

  it('surfaces Plan 02 content warnings through the site diagnostics', () => {
    const built = buildSite({
      sourceDir: root,
      configDir: join(root, '.vuepress'),
      options: themeOptions({ news: { index: { pagination: false } } }),
      base: '/',
    })

    // Plan 02 emits no warnings today; the fallback warning proves the merged
    // array is the one returned, and mergeSiteDiagnostics covers the ordering.
    expect(built.site.diagnostics.some((d) => d.code === 'LOCALE_FALLBACK')).toBe(true)
    expect(built.site.diagnostics.every((d) => d.severity === 'warning')).toBe(true)
  })

  it('reads definitions from a configured definitionsPath', () => {
    write('.vuepress/custom-definitions.yml', 'tags:\n  extra:\n    title: Extra\n')
    // Align news tags with the custom definitions (same as compile-content tests).
    write(
      'content/news/launch/content.yml',
      'type: news\nslug: launch\ndate: 2026-08-10\ntags:\n  - extra\n',
    )

    const built = buildSite({
      sourceDir: root,
      configDir: join(root, '.vuepress'),
      options: themeOptions({ news: { index: { pagination: false } } }),
      base: '/',
      definitionsPath: 'custom-definitions.yml',
    })

    expect(Object.keys(built.definitions.tags)).toEqual(['extra'])
  })
})
