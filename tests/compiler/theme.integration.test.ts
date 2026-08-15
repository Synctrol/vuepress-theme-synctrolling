import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBuildApp } from 'vuepress/core'
import type { App, Bundler, Page } from 'vuepress/core'
import { sanitizeFileName } from 'vuepress/utils'
import { buildSite } from '../../src/compiler/build-site'
import { encodePathSegment } from '../../src/compiler/path-suffix'
import { assertNoCspMetaInjection } from '../../src/compiler/platforms/write-csp-artifact'
import { enMessages } from '../../src/shared/messages'
import {
  resolveThemeOptions,
  type SynctrolThemeOptions,
} from '../../src/shared/options'
import { synctrolTheme } from '../../src/index'

let root: string

function write(relativePath: string, contents: string): void {
  const absolute = join(root, relativePath)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, contents, 'utf8')
}

/**
 * Honours the same `Page.htmlFilePath` contract the real bundlers use, so the
 * lifecycle is real VuePress without pulling in a full Vite build.
 */
function stubBundler(): Bundler {
  return {
    name: 'synctrol-test-bundler',
    dev: async () => async () => {},
    build: async (app: App) => {
      for (const page of app.pages) {
        mkdirSync(dirname(page.htmlFilePath), { recursive: true })
        writeFileSync(page.htmlFilePath, `<!--${page.path}-->`, 'utf8')
      }
    },
  }
}

async function runBuild(base: '/' | `/${string}/` = '/') {
  const app = createBuildApp({
    source: root,
    dest: join(root, '.vuepress/dist'),
    base,
    bundler: stubBundler(),
    theme: synctrolTheme({
      siteUrl: 'https://synctrol.com',
      mainLocale: 'zh',
      topbarText: '© Synctrol',
      locales: {
        zh: { lang: 'zh-CN', label: '中文' },
        en: { lang: 'en-US', label: 'English' },
      },
      seo: {
        name: 'Synctrol',
        description: 'Synctrol releases and news',
        defaultImage: '/images/og.png',
        organization: { name: 'Synctrol', logo: '/images/logo.png' },
        collections: {
          release: { title: 'Releases', description: 'All releases' },
          news: { title: 'News', description: 'All news' },
        },
      },
      // Partial collection overrides — same cast as route-fixtures (resolver fills defaults).
      release: { index: { pagination: false } },
      news: { index: { pagination: false } },
    } as unknown as SynctrolThemeOptions),
  })

  await app.init()
  await app.prepare()
  await app.build()
  await app.pluginApi.hooks.onGenerated.process(app)
  return app
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'synctrol-theme-'))
  write('content/definitions.yml', 'tags:\n  release:\n    title:\n      zh: 作品\n      en: Releases\n')
  write('content/home/content.yml', 'type: home\n')
  write('content/home/zh.md', '---\ntitle: 首页\ndescription: SEO\n---\n::: home-logo\n# SYNCTROL\n:::\n\n首页正文\n')
  write('content/home/en.md', '---\ntitle: Home\ndescription: SEO\n---\n::: home-logo\n# SYNCTROL\n:::\n\nHome body\n')
  write('content/releases/first-release/content.yml', 'type: release\nslug: first-release\ndate: 2026-08-11\n')
  write('content/releases/first-release/zh.md', '---\ntitle: 第一张专辑\n---\n正文\n')
  write('content/releases/first-release/en.md', '---\ntitle: First Album\n---\nBody\n')
  write('content/releases/作品/content.yml', 'type: release\nslug: 作品\ndate: 2026-08-09\n')
  write('content/releases/作品/zh.md', '---\ntitle: 作品\n---\n正文\n')
  write('content/releases/作品/en.md', '---\ntitle: Work\n---\nBody\n')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('synctrolTheme production integration', () => {
  it('keeps the Plan 01 theme contract', () => {
    const theme = synctrolTheme({
      siteUrl: 'https://synctrol.com',
      mainLocale: 'zh',
      topbarText: '© Synctrol',
      locales: { zh: { lang: 'zh-CN', label: '中文' } },
      seo: {
        name: 'Synctrol',
        description: 'd',
        defaultImage: '/i.png',
        organization: { name: 'Synctrol', logo: '/l.png' },
        collections: {
          release: { title: 'R', description: 'r' },
          news: { title: 'N', description: 'n' },
        },
      },
      background: './backgrounds/host',
    })

    expect(theme.name).toBe('vuepress-theme-synctrolling')
    expect(theme.define.__SYNCTROL_THEME_OPTIONS__).toMatchObject({
      siteUrl: 'https://synctrol.com',
      showDrafts: false,
    })
    expect(theme.define.__SYNCTROL_THEME_OPTIONS__).not.toHaveProperty(
      'background',
    )
  })

  it('registers the backgrounds Vite plugin via extendsBundlerOptions', async () => {
    const theme = synctrolTheme({
      siteUrl: 'https://synctrol.com',
      mainLocale: 'zh',
      topbarText: '© Synctrol',
      locales: { zh: { lang: 'zh-CN', label: '中文' } },
      seo: {
        name: 'Synctrol',
        description: 'd',
        defaultImage: '/i.png',
        organization: { name: 'Synctrol', logo: '/l.png' },
        collections: {
          release: { title: 'R', description: 'r' },
          news: { title: 'N', description: 'n' },
        },
      },
      background: './backgrounds/host',
    })

    expect(theme.extendsBundlerOptions).toBeTypeOf('function')

    const bundlerOptions: { viteOptions?: { plugins?: unknown[] } } = {}
    const app = {
      dir: {
        source: (sub?: string) =>
          sub === undefined ? root : join(root, sub),
      },
    } as unknown as App

    await theme.extendsBundlerOptions!(bundlerOptions, app)

    expect(bundlerOptions.viteOptions?.plugins).toHaveLength(1)
    expect(
      (bundlerOptions.viteOptions!.plugins![0] as { name: string }).name,
    ).toBe('synctrol-backgrounds')
  })

  it('stamps frontmatter.synctrol.routePath from compiled.url.routePath', async () => {
    const app = await runBuild()
    const built = buildSite({
      sourceDir: root,
      configDir: join(root, '.vuepress'),
      options: resolveThemeOptions({
        siteUrl: 'https://synctrol.com',
        mainLocale: 'zh',
        topbarText: '© Synctrol',
        locales: {
          zh: { lang: 'zh-CN', label: '中文' },
          en: { lang: 'en-US', label: 'English' },
        },
        seo: {
          name: 'Synctrol',
          description: 'Synctrol releases and news',
          defaultImage: '/images/og.png',
          organization: { name: 'Synctrol', logo: '/images/logo.png' },
          collections: {
            release: { title: 'Releases', description: 'All releases' },
            news: { title: 'News', description: 'All news' },
          },
        },
        release: { index: { pagination: false } },
        news: { index: { pagination: false } },
      } as unknown as SynctrolThemeOptions),
      base: '/',
    })

    expect(built.site.pages.length).toBeGreaterThan(0)
    for (const compiled of built.site.pages) {
      const page = app.pages.find(
        (candidate: Page) => candidate.path === compiled.url.routePath,
      )
      expect(page).toBeDefined()
      const synctrol = page!.frontmatter.synctrol as { routePath: string }
      expect(synctrol.routePath).toBe(compiled.url.routePath)
    }
  })

  it('registers locale-prefixed pages and removes the auto-globbed content markdown', async () => {
    const app = await runBuild()
    const paths = app.pages.map((page: Page) => page.path)

    expect(paths).toContain('/zh/')
    expect(paths).toContain('/en/')
    expect(paths).toContain('/zh/releases/first-release/')
    expect(paths).toContain('/en/releases/first-release/')
    expect(paths).toContain('/zh/releases/')

    // The content tree must not leak in as VuePress-inferred pages.
    expect(paths.some((path: string) => path.startsWith('/content/'))).toBe(false)
    // The automatic 404 page has a null filePathRelative and must survive.
    expect(paths).toContain('/404.html')
  })

  it('agrees with VuePress on every route and output path', async () => {
    const app = await runBuild()
    const compiled = app.pages.filter(
      (page: Page) => page.filePathRelative === null && page.path !== '/404.html',
    )
    expect(compiled.length).toBeGreaterThan(0)

    for (const page of compiled) {
      expect(page.htmlFilePathRelative).toBe(
        `${decodeURI(page.path).slice(1)}index.html`,
      )
    }

    const encoded = app.pages.find(
      (page: Page) => page.path === `/zh/releases/${encodePathSegment('作品')}/`,
    )
    expect(encoded).toBeDefined()
    expect(encoded?.htmlFilePathRelative).toBe('zh/releases/作品/index.html')
  })

  it('generates the locale Home and detail files plus the root router', async () => {
    const app = await runBuild()
    const dest = app.dir.dest()

    for (const relative of [
      'index.html',
      'zh/index.html',
      'en/index.html',
      'zh/releases/first-release/index.html',
      'en/releases/first-release/index.html',
      'zh/releases/作品/index.html',
      'zh/releases/index.html',
    ]) {
      expect(existsSync(join(dest, relative))).toBe(true)
    }

    const rootHtml = readFileSync(join(dest, 'index.html'), 'utf8')
    expect(rootHtml).toContain('location.replace')
    expect(rootHtml).toContain('synctrol:locale')
    expect(rootHtml).toContain('"homes"')
  })

  it('honours a non-root base in the root router links', async () => {
    const app = await runBuild('/docs/')
    const rootHtml = readFileSync(join(app.dir.dest(), 'index.html'), 'utf8')

    expect(rootHtml).toContain('"/docs/zh/"')
    expect(rootHtml).toContain('"base":"/docs/"')
    expect(existsSync(join(app.dir.dest(), 'zh/index.html'))).toBe(true)
  })

  it('keeps the routable-segment gate aligned with the installed VuePress', () => {
    // If VuePress changes sanitizeFileName, this fails instead of silently
    // serving routes that differ from the compiled routePath.
    const safe = ['first-release', '作品', 'café', 'A-B_c.d~e', 'a b', '日本語']
    for (const segment of safe) {
      expect(encodeURI(sanitizeFileName(segment))).toBe(encodePathSegment(segment))
    }

    const rejected = ['a(b)', 'a*b', 'a!b', 'a,b', '_lead', "a!'()*b", 'x*y']
    for (const segment of rejected) {
      expect(encodeURI(sanitizeFileName(segment))).not.toBe(encodePathSegment(segment))
    }
  })

  it('keeps compiled routePath/outputPath identical to VuePress for a CJK locale + CJK slug', async () => {
    // Regression: raw locale/slug literals diverge from
    // encodeURI(sanitizeFileName(...)). Encode locale keys (and slugs);
    // !'()* stay rejected by assertRoutableSegment (path-suffix / collection
    // unit tests) rather than suddenly banning CJK locales Plan 01 allows.
    write(
      'content/definitions.yml',
      'tags:\n  release:\n    title:\n      日本語: 作品\n',
    )
    write('content/home/日本語.md', '---\ntitle: ホーム\ndescription: SEO\n---\n::: home-logo\n# SYNCTROL\n:::\n\n本文\n')
    write('content/releases/作品/content.yml', 'type: release\nslug: 作品\ndate: 2026-08-09\n')
    write('content/releases/作品/日本語.md', '---\ntitle: 作品\n---\n本文\n')

    const locale = '日本語'
    const encodedLocale = encodePathSegment(locale)
    const encodedSlug = encodePathSegment('作品')

    const themeOptionsInput = {
      siteUrl: 'https://synctrol.com',
      mainLocale: locale,
      topbarText: '© Synctrol',
      locales: {
        // Plan 01 requires complete messages for non-zh/en locales (same as Tasks 7–9).
        [locale]: {
          lang: 'ja',
          label: '日本語',
          messages: { ...enMessages },
        },
      },
      seo: {
        name: 'Synctrol',
        description: 'Synctrol releases and news',
        defaultImage: '/images/og.png',
        organization: { name: 'Synctrol', logo: '/images/logo.png' },
        collections: {
          release: { title: 'Releases', description: 'All releases' },
          news: { title: 'News', description: 'All news' },
        },
      },
      release: { index: { pagination: false } },
      news: { index: { enabled: false } },
    } as unknown as SynctrolThemeOptions

    const app = createBuildApp({
      source: root,
      dest: join(root, '.vuepress/dist-cjk'),
      base: '/',
      bundler: stubBundler(),
      theme: synctrolTheme({ ...themeOptionsInput }),
    })

    await app.init()
    await app.prepare()
    await app.build()
    await app.pluginApi.hooks.onGenerated.process(app)

    const built = buildSite({
      sourceDir: root,
      configDir: join(root, '.vuepress'),
      options: resolveThemeOptions({ ...themeOptionsInput }),
      base: '/',
    })

    const homeCompiled = built.site.pages.find(
      (page) => page.identity === 'home' && page.locale === locale,
    )
    const detailCompiled = built.site.pages.find(
      (page) => page.identity === 'release:作品' && page.locale === locale,
    )
    expect(homeCompiled).toBeDefined()
    expect(detailCompiled).toBeDefined()

    const homePage = app.pages.find(
      (page: Page) => page.path === `/${encodedLocale}/`,
    )
    const detailPage = app.pages.find(
      (page: Page) =>
        page.path === `/${encodedLocale}/releases/${encodedSlug}/`,
    )
    expect(homePage).toBeDefined()
    expect(detailPage).toBeDefined()

    expect(homeCompiled!.url.routePath).toBe(homePage!.path)
    expect(homeCompiled!.url.outputPath).toBe(homePage!.htmlFilePathRelative)
    expect(detailCompiled!.url.routePath).toBe(detailPage!.path)
    expect(detailCompiled!.url.outputPath).toBe(detailPage!.htmlFilePathRelative)

    expect(homeCompiled!.url.routePath).not.toContain('/日本語/')
    expect(detailCompiled!.url.routePath).not.toContain('/日本語/')

    const rootHtml = readFileSync(join(app.dir.dest(), 'index.html'), 'utf8')
    expect(rootHtml).toContain(`"/${encodedLocale}/"`)
    expect(rootHtml).not.toContain('href="/日本語/"')
  })

  it('injects frontmatter.synctrol.contentAssets and writes hashed content assets', async () => {
    write(
      'content/releases/first-release/content.yml',
      'type: release\nslug: first-release\ndate: 2026-08-11\ncover: ./assets/cover.webp\n',
    )
    write('content/releases/first-release/assets/cover.webp', 'fake-webp-bytes')

    const app = await runBuild()
    const page = app.pages.find(
      (candidate: Page) => candidate.path === '/zh/releases/first-release/',
    )
    expect(page).toBeDefined()

    const synctrol = page!.frontmatter.synctrol as {
      identity: string
      contentAssets: Record<string, string>
    }
    expect(synctrol.identity).toBe('release:first-release')
    expect(synctrol.contentAssets).toEqual(expect.any(Object))
    expect(synctrol.contentAssets['./assets/cover.webp']).toMatch(
      /^\/assets\/content\/release\/first-release\/cover\.[0-9a-f]{8}\.webp$/,
    )

    const publicPath = synctrol.contentAssets['./assets/cover.webp']
    expect(existsSync(join(app.dir.dest(), publicPath.slice(1)))).toBe(true)
  })

  it('does not compile assets for draft packages when showDrafts is false', async () => {
    write(
      'content/releases/secret/content.yml',
      'type: release\nslug: secret\ndate: 2026-08-10\ndraft: true\ncover: ./assets/missing.webp\n',
    )
    write(
      'content/releases/secret/zh.md',
      '---\ntitle: Secret\n---\n<img src=./assets/bad.webp>\n',
    )
    write('content/releases/secret/en.md', '---\ntitle: Secret\n---\nDraft\n')
    write(
      'content/releases/first-release/content.yml',
      'type: release\nslug: first-release\ndate: 2026-08-11\ncover: ./assets/cover.webp\n',
    )
    write('content/releases/first-release/assets/cover.webp', 'fake-webp-bytes')

    const app = await runBuild()
    expect(app.pages.some((page: Page) => page.path.includes('secret'))).toBe(
      false,
    )

    const page = app.pages.find(
      (candidate: Page) => candidate.path === '/zh/releases/first-release/',
    )
    expect(page).toBeDefined()
    const synctrol = page!.frontmatter.synctrol as {
      contentAssets: Record<string, string>
    }
    expect(synctrol.contentAssets['./assets/cover.webp']).toMatch(
      /^\/assets\/content\/release\/first-release\/cover\.[0-9a-f]{8}\.webp$/,
    )
  })

  it('keeps Plan 03 Task 12 behaviors after asset wiring', async () => {
    // Same contract shape as the existing "keeps the Plan 01 theme contract" case.
    const theme = synctrolTheme({
      siteUrl: 'https://synctrol.com',
      mainLocale: 'zh',
      topbarText: '© Synctrol',
      locales: { zh: { lang: 'zh-CN', label: '中文' } },
      seo: {
        name: 'Synctrol',
        description: 'd',
        defaultImage: '/i.png',
        organization: { name: 'Synctrol', logo: '/l.png' },
        collections: {
          release: { title: 'R', description: 'r' },
          news: { title: 'N', description: 'n' },
        },
      },
    })
    expect(theme.define.__SYNCTROL_THEME_OPTIONS__).toMatchObject({
      siteUrl: 'https://synctrol.com',
      showDrafts: false,
    })

    const app = await runBuild()
    const paths = app.pages.map((page: Page) => page.path)

    // content/** filter retained
    expect(paths.some((path: string) => path.startsWith('/content/'))).toBe(false)

    // root router written
    const rootHtml = readFileSync(join(app.dir.dest(), 'index.html'), 'utf8')
    expect(rootHtml).toContain('location.replace')
    expect(rootHtml).toContain('synctrol:locale')
    expect(rootHtml).toContain('"homes"')

    // frontmatter.synctrol.contentAssets injected on content pages (empty map ok when no assets)
    const home = app.pages.find((page: Page) => page.path === '/zh/')
    expect(home).toBeDefined()
    const homeSynctrol = home!.frontmatter.synctrol as {
      identity: string
      contentAssets: Record<string, string>
    }
    expect(homeSynctrol.identity).toBe('home')
    expect(homeSynctrol.contentAssets).toEqual(expect.any(Object))
  })

  it('allows root-absolute seo.defaultImage without requiring a file', async () => {
    // runBuild() already uses defaultImage: '/images/og.png' — must still succeed.
    await expect(runBuild()).resolves.toBeTruthy()
  })

  it('writes synctrol-csp.json on generate without CSP meta and keeps root router', async () => {
    write(
      'content/definitions.yml',
      `tags:
  release:
    title:
      zh: 作品
      en: Releases
platforms:
  youtube:
    category: digital
    type: youtube_player
    name: YouTube
`,
    )
    write(
      'content/releases/first-release/book.yml',
      `type: album
title: First Album
album:
  links:
    - platform: youtube
      videoId: dQw4w9WgXcQ
`,
    )

    const app = await runBuild()
    const dest = app.dir.dest()
    const cspPath = join(dest, 'synctrol-csp.json')
    expect(existsSync(cspPath)).toBe(true)
    const csp = JSON.parse(readFileSync(cspPath, 'utf8')) as {
      'frame-src': string[]
    }
    expect(csp['frame-src']).toContain('https://www.youtube.com')

    const indexHtml = readFileSync(join(dest, 'index.html'), 'utf8')
    expect(indexHtml).toContain('location.replace')
    expect(indexHtml).toContain('synctrol:locale')
    expect(indexHtml).toContain('"homes"')
    assertNoCspMetaInjection(indexHtml)

    const pageHtml = readFileSync(
      join(dest, 'zh/releases/first-release/index.html'),
      'utf8',
    )
    assertNoCspMetaInjection(pageHtml)
  })

  it('injects frontmatter.synctrol.release for detail and index pages', async () => {
    write(
      'content/definitions.yml',
      `tags:
  release:
    title:
      zh: 作品
      en: Releases
platforms:
  youtube:
    category: digital
    type: youtube_player
    name: YouTube
`,
    )
    write(
      'content/releases/first-release/book.yml',
      `type: album
title: First Album
album:
  covers:
    - ./assets/front.webp
  links:
    - platform: youtube
      videoId: dQw4w9WgXcQ
`,
    )
    write('content/releases/first-release/assets/front.webp', 'fake-webp-bytes')
    write(
      'content/releases/first-release/content.yml',
      'type: release\nslug: first-release\ndate: 2026-08-11\nartwork: ./assets/album-entry.webp\n',
    )
    write(
      'content/releases/first-release/assets/album-entry.webp',
      'fake-artwork-bytes',
    )

    const app = createBuildApp({
      source: root,
      dest: join(root, '.vuepress/dist-release-fm'),
      base: '/',
      bundler: stubBundler(),
      theme: synctrolTheme({
        siteUrl: 'https://synctrol.com',
        mainLocale: 'zh',
        topbarText: '© Synctrol',
        locales: {
          zh: { lang: 'zh-CN', label: '中文' },
          en: { lang: 'en-US', label: 'English' },
        },
        seo: {
          name: 'Synctrol',
          description: 'Synctrol releases and news',
          defaultImage: '/images/og.png',
          organization: { name: 'Synctrol', logo: '/images/logo.png' },
          collections: {
            release: { title: 'Releases', description: 'All releases' },
            news: { title: 'News', description: 'All news' },
          },
        },
        // Index enabled with pagination so collection pages are emitted.
        release: { index: { enabled: true, pagination: 1 } },
        news: { index: { pagination: false } },
      } as unknown as SynctrolThemeOptions),
    })

    await app.init()
    await app.prepare()
    await app.build()
    await app.pluginApi.hooks.onGenerated.process(app)

    const detail = app.pages.find(
      (candidate: Page) => candidate.path === '/zh/releases/first-release/',
    )
    expect(detail).toBeDefined()
    const detailSynctrol = detail!.frontmatter.synctrol as {
      platformDefinitions: Record<string, unknown>
      release: {
        kind: string
        model: {
          includedInIndex: boolean
          artwork: { kind: string }
          book?: {
            type: string
            title: { text: string }
            platformLinks: Array<{ platform: string }>
            previewLinks: Array<{ platform: string }>
            discs: Array<{ number: number }>
          }
        }
      }
    }
    expect(detailSynctrol.release.kind).toBe('detail')
    expect(detailSynctrol.release.model.artwork.kind).toBe('artwork')
    expect(detailSynctrol.release.model.book?.type).toBe('album')
    expect(
      detailSynctrol.release.model.book?.platformLinks.map((l) => l.platform),
    ).toContain('youtube')
    expect(detailSynctrol.platformDefinitions).toMatchObject({
      youtube: expect.objectContaining({ type: 'youtube_player' }),
    })

    const index = app.pages.find(
      (candidate: Page) => candidate.path === '/zh/releases/',
    )
    expect(index).toBeDefined()
    const indexSynctrol = index!.frontmatter.synctrol as {
      release: {
        kind: string
        model: { tiles: unknown[]; page: number; pageCount: number }
        collectionTitle: string
      }
    }
    expect(indexSynctrol.release.kind).toBe('index')
    expect(indexSynctrol.release.model.tiles.length).toBeGreaterThan(0)
    expect(indexSynctrol.release.model.pageCount).toBeGreaterThan(1)
    expect(indexSynctrol.release.collectionTitle).toBe('Releases')
    // Index tiles must use same-locale detail hrefs (not overwritten by en pages).
    const zhIndexTiles = indexSynctrol.release.model.tiles as Array<{
      href: string
      title: string
    }>
    for (const tile of zhIndexTiles) {
      expect(tile.href.startsWith('/zh/')).toBe(true)
      expect(tile.href.startsWith('/en/')).toBe(false)
    }

    const enIndex = app.pages.find(
      (candidate: Page) => candidate.path === '/en/releases/',
    )
    expect(enIndex).toBeDefined()
    const enIndexSynctrol = enIndex!.frontmatter.synctrol as {
      release: {
        kind: string
        model: { tiles: Array<{ href: string; title: string }> }
      }
    }
    expect(enIndexSynctrol.release.kind).toBe('index')
    for (const tile of enIndexSynctrol.release.model.tiles) {
      expect(tile.href.startsWith('/en/')).toBe(true)
      expect(tile.href.startsWith('/zh/')).toBe(false)
    }

    const home = app.pages.find((candidate: Page) => candidate.path === '/zh/')
    expect(home).toBeDefined()
    const homeSynctrol = home!.frontmatter.synctrol as {
      release?: unknown
      platformDefinitions: Record<string, unknown>
    }
    expect(homeSynctrol.release).toBeUndefined()
    expect(homeSynctrol.platformDefinitions).toEqual(expect.any(Object))
  })

  it('injects frontmatter.synctrol.news, page, and home for Plan 09 kinds', async () => {
    write(
      'content/news/alpha/content.yml',
      'type: news\nslug: alpha\ndate: 2026-08-11\ntags: [release]\n',
    )
    write(
      'content/news/alpha/zh.md',
      '---\ntitle: Alpha\n---\n正文\n',
    )
    write(
      'content/news/alpha/en.md',
      '---\ntitle: Alpha EN\n---\nBody\n',
    )
    write(
      'content/pages/team/content.yml',
      'type: page\nslug: team\n',
    )
    write(
      'content/pages/team/zh.md',
      '---\ntitle: 团队\n---\n正文\n',
    )
    write(
      'content/pages/team/en.md',
      '---\ntitle: Team\n---\nBody\n',
    )

    const app = await runBuild()

    const newsDetail = app.pages.find(
      (candidate: Page) => candidate.path === '/zh/article/alpha/',
    )
    expect(newsDetail).toBeDefined()
    expect(
      (newsDetail!.frontmatter.synctrol as { news?: { kind: string } }).news
        ?.kind,
    ).toBe('detail')

    const newsIndex = app.pages.find(
      (candidate: Page) => candidate.path === '/zh/news/',
    )
    expect(newsIndex).toBeDefined()
    expect(
      (newsIndex!.frontmatter.synctrol as { news?: { kind: string } }).news
        ?.kind,
    ).toBe('index')

    const pageDetail = app.pages.find(
      (candidate: Page) => candidate.path === '/zh/team/',
    )
    expect(pageDetail).toBeDefined()
    expect(
      (pageDetail!.frontmatter.synctrol as { page?: { kind: string } }).page
        ?.kind,
    ).toBe('detail')

    const home = app.pages.find((candidate: Page) => candidate.path === '/zh/')
    expect(home).toBeDefined()
    const homeSynctrol = home!.frontmatter.synctrol as {
      home?: { kind: string; logoHtml?: string }
      contentAssets?: Record<string, string>
      alternates?: unknown
      platformDefinitions?: unknown
      release?: unknown
    }
    expect(homeSynctrol.home?.logoHtml).toEqual(expect.any(String))
    expect(homeSynctrol.home!.logoHtml!.length).toBeGreaterThan(0)
    expect(homeSynctrol.contentAssets).toEqual(expect.any(Object))
    expect(homeSynctrol.alternates).toEqual(expect.any(Array))
    expect(homeSynctrol.platformDefinitions).toEqual(expect.any(Object))
    expect(homeSynctrol.release).toBeUndefined()
    expect(home!.content).toContain('首页正文')
    expect(home!.content).not.toContain('home-logo')
  })

  it('attaches SEO head tags and writes rss/sitemap while preserving root router and CSP', async () => {
    write('content/news/alpha/content.yml', 'type: news\nslug: alpha\ndate: 2026-08-11\ntags: [release]\n')
    write('content/news/alpha/zh.md', '---\ntitle: Alpha\ndescription: Alpha desc\n---\n正文\n')
    write('content/news/alpha/en.md', '---\ntitle: Alpha EN\ndescription: Alpha EN desc\n---\nBody\n')

    const app = await runBuild()
    const page = app.pages.find((candidate: Page) => candidate.path === '/en/article/alpha/')
    expect(page).toBeDefined()
    expect(page!.frontmatter.title).toBe('Alpha EN')
    expect(page!.frontmatter.head).toEqual(
      expect.arrayContaining([
        ['link', { rel: 'canonical', href: 'https://synctrol.com/en/article/alpha/' }],
        ['meta', { property: 'og:type', content: 'article' }],
      ]),
    )

    const dest = app.dir.dest()
    expect(existsSync(join(dest, 'en/rss.xml'))).toBe(true)
    expect(existsSync(join(dest, 'zh/rss.xml'))).toBe(true)
    expect(existsSync(join(dest, 'sitemap.xml'))).toBe(true)
    expect(existsSync(join(dest, 'index.html'))).toBe(true)
    expect(existsSync(join(dest, 'synctrol-csp.json'))).toBe(true)

    // The language-router root page must never appear in the sitemap.
    const sitemap = readFileSync(join(dest, 'sitemap.xml'), 'utf8')
    expect(sitemap).not.toContain('<loc>https://synctrol.com/</loc>')
  })
})
