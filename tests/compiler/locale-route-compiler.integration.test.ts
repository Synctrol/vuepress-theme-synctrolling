import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { compileContent } from '../../src/compiler/compile-content'
import { compileSiteRoutes } from '../../src/compiler/compile-site-routes'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { buildRoutePackages } from '../../src/compiler/route-packages'
import { themeOptions, type ThemeOptionOverrides } from '../helpers/route-fixtures'

let root: string

function write(relativePath: string, contents: string): void {
  const absolute = join(root, relativePath)
  mkdirSync(join(absolute, '..'), { recursive: true })
  writeFileSync(absolute, contents, 'utf8')
}

function seedSite(): void {
  write(
    'content/definitions.yml',
    'tags:\n  release:\n    title:\n      zh: 作品发布\n      en: Releases\n',
  )

  write('content/home/content.yml', 'type: home\n')
  write('content/home/zh.md', '---\ntitle: 首页\ndescription: 主页 SEO\n---\n::: home-logo\n# SYNCTROL\n:::\n\n首页正文\n')
  write('content/home/en.md', '---\ntitle: Home\ndescription: Home SEO\n---\n::: home-logo\n# SYNCTROL\n:::\n\nHome body\n')

  write(
    'content/releases/first-release/content.yml',
    'type: release\nslug: first-release\ndate: 2026-08-11\npath:\n  zh: /zh/test/\n',
  )
  write('content/releases/first-release/zh.md', '---\ntitle: 第一张专辑\n---\n正文\n')
  write('content/releases/first-release/en.md', '---\ntitle: First Album\n---\nBody\n')

  write(
    'content/news/launch/content.yml',
    'type: news\nslug: launch\ndate: 2026-08-10\ntags:\n  - release\n',
  )
  write('content/news/launch/zh.md', '---\ntitle: 发布\n---\n发布正文\n')

  write(
    'content/news/secret/content.yml',
    'type: news\nslug: secret\ndate: 2026-08-09\ndraft: true\ntags:\n  - release\n',
  )
  write('content/news/secret/zh.md', '---\ntitle: 秘密\n---\n秘密正文\n')
}

function compileSite(overrides: ThemeOptionOverrides = {}, base = '/') {
  const options = themeOptions(overrides)
  const compiled = compileContent({
    contentRoot: join(root, 'content'),
    sourceDir: root,
    configDir: join(root, '.vuepress'),
    mainLocale: options.mainLocale,
  })

  return compileSiteRoutes({
    packages: buildRoutePackages({
      packages: compiled.packages,
      localeKeys: Object.keys(options.locales),
    }),
    options,
    base,
    declaredTags: Object.keys(compiled.definitions.tags),
  })
}

describe('locale route compiler integration', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'synctrol-site-'))
    seedSite()
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('builds a bilingual site with prefixes, fallbacks, collections, and a root router', () => {
    const result = compileSite({
      release: { index: { pagination: false } },
      news: { index: { pagination: false } },
    })
    const paths = result.pages.map((page) => page.url.routePath)

    for (const expected of [
      '/zh/',
      '/en/',
      '/zh/zh/test/',
      '/en/releases/first-release/',
      '/zh/releases/',
      '/en/releases/',
      '/zh/news/launch/',
      '/en/news/launch/',
      '/zh/news/',
      '/en/news/',
      '/zh/news/tags/',
      '/zh/news/tags/release/',
      '/en/news/tags/release/',
    ]) {
      expect(paths).toContain(expected)
    }

    expect(
      result.pages.every(
        (page) =>
          page.url.routePath.startsWith('/zh/') ||
          page.url.routePath.startsWith('/en/'),
      ),
    ).toBe(true)

    const enNews = result.pages.find(
      (page) => page.locale === 'en' && page.identity === 'news:launch',
    )
    expect(enNews).toMatchObject({
      isFallback: true,
      noindex: true,
      canonicalLocale: 'zh',
      bodyLocale: 'zh',
      title: '发布',
    })
    expect(enNews?.url.absoluteUrl).toBe('https://synctrol.com/en/news/launch/')
    expect(enNews?.url.outputPath).toBe('en/news/launch/index.html')
    expect(enNews?.url.publicPath).toBe('/en/news/launch/')

    expect(paths).not.toContain('/zh/news/secret/')
    expect(result.diagnostics.some((d) => d.code === 'LOCALE_FALLBACK')).toBe(true)
    expect(result.diagnostics.every((d) => d.severity === 'warning')).toBe(true)
    expect(result.rootRouterHtml).toContain('synctrol:locale')
  })

  it('honors showDrafts and index.enabled switches together', () => {
    const hidden = compileSite(
      { showDrafts: false, release: { index: { enabled: false } } },
      '/docs/',
    )

    expect(hidden.pages.some((page) => page.identity === 'release-index')).toBe(false)
    expect(hidden.pages.some((page) => page.identity === 'release:first-release')).toBe(
      true,
    )
    expect(hidden.pages.some((page) => page.identity === 'news:secret')).toBe(false)
    expect(hidden.rootRouterHtml).toContain('"/docs/zh/"')
    expect(
      hidden.pages.find((page) => page.identity === 'home' && page.locale === 'zh')
        ?.url.publicPath,
    ).toBe('/docs/zh/')

    const shown = compileSite({
      showDrafts: true,
      news: { index: { pagination: false } },
    })
    const secret = shown.pages.find(
      (page) => page.identity === 'news:secret' && page.locale === 'zh',
    )

    expect(secret).toMatchObject({ isDraft: true, noindex: true })
    expect(
      shown.pages.find(
        (page) => page.identity === 'news-index' && page.locale === 'zh',
      )?.collection?.itemIdentities,
    ).toEqual(['news:launch', 'news:secret'])
  })

  it('fails the build when the main-locale Home is unpublishable', () => {
    writeFileSync(
      join(root, 'content/home/zh.md'),
      '---\ntitle: 首页\ndescription: 主页 SEO\ndraft: true\n---\n::: home-logo\n# SYNCTROL\n:::\n\n首页正文\n',
      'utf8',
    )

    try {
      compileSite()
    } catch (error) {
      if (!isDiagnosticError(error)) throw error
      expect(error.diagnostics[0]?.code).toBe('HOME_MAIN_UNPUBLISHABLE')
      return
    }
    throw new Error('Expected the build to fail')
  })
})
