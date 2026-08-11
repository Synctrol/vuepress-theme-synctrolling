import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  compileContent,
  type CompileContentOptions,
} from '../../src/compiler/compile-content'
import {
  isDiagnosticError,
  SynctrolDiagnosticError,
  type SynctrolDiagnostic,
} from '../../src/compiler/diagnostics'

const okRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/compiler/compile/ok',
)

interface TemporarySite {
  configDir: string
  contentRoot: string
  root: string
}

interface CreateSiteOptions {
  definitions?: string | false
  home?: boolean
}

const EMPTY_DEFINITIONS = 'tags: {}\nplatforms: {}\n'
const temporaryRoots = new Set<string>()

function writePackage(
  site: TemporarySite,
  relativeDir: string,
  manifest: string,
  book?: string,
): string {
  const dir = join(site.contentRoot, relativeDir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'content.yml'), manifest, 'utf8')
  if (book !== undefined) {
    writeFileSync(join(dir, 'book.yml'), book, 'utf8')
  }
  return dir
}

function createSite(options: CreateSiteOptions = {}): TemporarySite {
  const root = mkdtempSync(join(tmpdir(), 'synctrol-compile-'))
  temporaryRoots.add(root)
  const contentRoot = join(root, 'content')
  const configDir = join(root, '.vuepress')
  mkdirSync(contentRoot, { recursive: true })
  mkdirSync(configDir, { recursive: true })

  if (options.definitions !== false) {
    writeFileSync(
      join(contentRoot, 'definitions.yml'),
      options.definitions ?? EMPTY_DEFINITIONS,
      'utf8',
    )
  }

  const site = { configDir, contentRoot, root }
  if (options.home !== false) {
    writePackage(site, 'home', 'type: home\n')
  }
  return site
}

function compileSite(
  site: TemporarySite,
  overrides: Partial<CompileContentOptions> = {},
) {
  return compileContent({
    contentRoot: site.contentRoot,
    sourceDir: site.root,
    configDir: site.configDir,
    mainLocale: 'zh',
    ...overrides,
  })
}

function captureError(action: () => unknown): unknown {
  try {
    action()
    return undefined
  } catch (error) {
    return error
  }
}

function expectDiagnostic(
  action: () => unknown,
  expected: Partial<SynctrolDiagnostic> & Pick<SynctrolDiagnostic, 'code'>,
): void {
  const error = captureError(action)
  expect(error).toBeInstanceOf(SynctrolDiagnosticError)
  expect(isDiagnosticError(error)).toBe(true)
  if (isDiagnosticError(error)) {
    expect(error.diagnostics).toHaveLength(1)
    expect(error.diagnostics[0]).toMatchObject({
      severity: 'error',
      ...expected,
    })
  }
}

afterEach(() => {
  for (const root of temporaryRoots) {
    rmSync(root, { force: true, recursive: true })
  }
  temporaryRoots.clear()
})

describe('compileContent successful orchestration', () => {
  it('compiles definitions, Home, news, and an Album release deterministically', () => {
    const result = compileContent({
      contentRoot: join(okRoot, 'content'),
      sourceDir: okRoot,
      configDir: join(okRoot, '.vuepress'),
      mainLocale: 'zh',
    })

    expect(result.packages.map(({ identity }) => identity)).toEqual([
      'home',
      'news:hello',
      'release:first-release',
    ])
    expect(result.packages.map(({ dir }) => dir)).toEqual([
      join(okRoot, 'content/home'),
      join(okRoot, 'content/news/hello'),
      join(okRoot, 'content/releases/first-release'),
    ])
    expect(result.packages.every(({ dir }) => isAbsolute(dir))).toBe(true)
    expect(result.definitions.platforms.bilibili.type).toBe(
      'bilibili_player',
    )
    expect(Object.hasOwn(result.definitions.tags, 'unused')).toBe(true)
    expect(Object.hasOwn(result.definitions.platforms, 'unused-shop')).toBe(
      true,
    )

    const news = result.packages[1]
    expect(news.manifest).toMatchObject({
      type: 'news',
      path: '/updates/hello/',
      tags: ['release'],
    })
    const release = result.packages[2]
    expect(release.book).toMatchObject({
      type: 'album',
      title: { zh: 'SYNCTROL', en: 'SYNCTROL' },
      album: {
        covers: ['./cover.webp'],
        links: [
          {
            platform: 'bilibili',
            bvid: 'BV1xxxxxxxxx',
            autoplay: false,
          },
        ],
      },
    })
    expect(Object.hasOwn(result.packages[0], 'book')).toBe(false)
    expect(Object.hasOwn(news, 'book')).toBe(false)
    expect(Object.hasOwn(release, 'book')).toBe(true)
    expect(result.warnings).toEqual([])
  })

  it('accepts a relative content root and still emits absolute package dirs', () => {
    const result = compileContent({
      contentRoot: relative(process.cwd(), join(okRoot, 'content')),
      sourceDir: relative(process.cwd(), okRoot),
      configDir: relative(process.cwd(), join(okRoot, '.vuepress')),
      mainLocale: 'zh',
    })

    expect(result.packages.map(({ dir }) => dir)).toEqual([
      resolve(okRoot, 'content/home'),
      resolve(okRoot, 'content/news/hello'),
      resolve(okRoot, 'content/releases/first-release'),
    ])
  })

  it('resolves a relative definitionsPath against configDir', () => {
    const site = createSite()
    mkdirSync(join(site.configDir, 'data'), { recursive: true })
    writeFileSync(
      join(site.configDir, 'data/definitions.yml'),
      'tags:\n  external:\n    title: External\nplatforms: {}\n',
      'utf8',
    )
    writePackage(
      site,
      'news/external',
      'type: news\ndate: 2026-08-11\ntags: [external]\n',
    )

    const result = compileSite(site, {
      definitionsPath: './data/definitions.yml',
    })

    expect(result.definitions.tags.external.title).toBe('External')
    expect(result.packages.map(({ identity }) => identity)).toEqual([
      'home',
      'news:external',
    ])
  })

  it('uses an absolute external definitionsPath unchanged by configDir', () => {
    const site = createSite()
    const externalDefinitions = join(site.root, 'external-definitions.yml')
    writeFileSync(
      externalDefinitions,
      'tags:\n  absolute:\n    title: Absolute\nplatforms: {}\n',
      'utf8',
    )
    writePackage(
      site,
      'news/absolute',
      'type: news\ndate: 2026-08-11\ntags: [absolute]\n',
    )

    const result = compileSite(site, {
      definitionsPath: externalDefinitions,
    })

    expect(result.definitions.tags.absolute.title).toBe('Absolute')
    expect(result.packages.map(({ identity }) => identity)).toEqual([
      'home',
      'news:absolute',
    ])
  })

  it('dispatches a Gift Book for a release package', () => {
    const site = createSite()
    writePackage(
      site,
      'releases/gifts',
      'type: release\ndate: 2026-08-11\n',
      [
        'type: gift',
        'title: Gifts',
        'gift:',
        '  items:',
        '    - id: poster',
        '      title: Poster',
        '',
      ].join('\n'),
    )

    const result = compileSite(site)

    expect(result.packages.map(({ identity }) => identity)).toEqual([
      'home',
      'release:gifts',
    ])
    expect(result.packages[1].book).toEqual({
      type: 'gift',
      title: 'Gifts',
      gift: { items: [{ id: 'poster', title: 'Poster' }] },
    })
  })

  it('allows the same slug across different non-Home content types', () => {
    const site = createSite({
      definitions:
        'tags:\n  release:\n    title: Releases\nplatforms: {}\n',
    })
    writePackage(site, 'page-pkg', 'type: page\nslug: shared\n')
    writePackage(
      site,
      'news-pkg',
      'type: news\nslug: shared\ndate: 2026-08-11\ntags: [release]\n',
    )

    expect(compileSite(site).packages.map(({ identity }) => identity)).toEqual([
      'home',
      'news:shared',
      'page:shared',
    ])
  })

  it('retains draft packages without filtering them', () => {
    const site = createSite()
    writePackage(site, 'draft-page', 'type: page\ndraft: true\n')

    const result = compileSite(site)

    expect(result.packages.map(({ identity }) => identity)).toEqual([
      'page:draft-page',
      'home',
    ])
    expect(result.packages[0].manifest.draft).toBe(true)
  })

  it('returns fresh result containers isolated from later result mutation', () => {
    const first = compileContent({
      contentRoot: join(okRoot, 'content'),
      sourceDir: okRoot,
      configDir: join(okRoot, '.vuepress'),
      mainLocale: 'zh',
    })
    const second = compileContent({
      contentRoot: join(okRoot, 'content'),
      sourceDir: okRoot,
      configDir: join(okRoot, '.vuepress'),
      mainLocale: 'zh',
    })

    first.packages.pop()
    first.packages[0].manifest.draft = true
    first.warnings.push({
      severity: 'warning',
      code: 'MUTATED',
      message: 'mutated',
    })
    first.definitions.platforms.bilibili.type = 'mutated'

    expect(second.packages.map(({ identity }) => identity)).toEqual([
      'home',
      'news:hello',
      'release:first-release',
    ])
    expect(second.packages[0].manifest.draft).toBe(false)
    expect(second.warnings).toEqual([])
    expect(second.warnings).not.toBe(first.warnings)
    expect(second.packages).not.toBe(first.packages)
    expect(second.definitions.platforms.bilibili.type).toBe(
      'bilibili_player',
    )
  })
})

describe('compileContent diagnostics and invariants', () => {
  it('preserves a structured definitions loading diagnostic', () => {
    const site = createSite({ definitions: false })

    expectDiagnostic(() => compileSite(site), {
      code: 'INVALID_YAML',
      path: join(site.contentRoot, 'definitions.yml'),
    })
  })

  it('rejects duplicate slugs within the same non-Home content type', () => {
    const site = createSite()
    const first = writePackage(site, 'a', 'type: page\nslug: same\n')
    const duplicate = writePackage(site, 'b', 'type: page\nslug: same\n')

    expectDiagnostic(() => compileSite(site), {
      code: 'DUPLICATE_SLUG',
      path: duplicate,
      relatedPath: first,
    })
  })

  it('rejects book.yml on non-release content before parsing that Book', () => {
    const site = createSite()
    const pageDir = writePackage(
      site,
      'about',
      'type: page\n',
      'malformed: [\n',
    )

    expectDiagnostic(() => compileSite(site), {
      code: 'BOOK_NOT_ALLOWED',
      path: join(pageDir, 'book.yml'),
      relatedPath: join(pageDir, 'content.yml'),
    })
  })

  it('rejects an undeclared news tag with the content manifest path', () => {
    const site = createSite()
    const newsDir = writePackage(
      site,
      'news/unknown',
      'type: news\ndate: 2026-08-11\ntags: [missing]\n',
    )

    expectDiagnostic(() => compileSite(site), {
      code: 'UNKNOWN_TAG',
      path: join(newsDir, 'content.yml'),
    })
  })

  it('does not accept an Object.prototype key as a declared news tag', () => {
    const site = createSite()
    const newsDir = writePackage(
      site,
      'news/prototype',
      'type: news\ndate: 2026-08-11\ntags: [toString]\n',
    )

    expectDiagnostic(() => compileSite(site), {
      code: 'UNKNOWN_TAG',
      path: join(newsDir, 'content.yml'),
    })
  })

  it('requires a Home package independently from other invariants', () => {
    const site = createSite({ home: false })
    writePackage(site, 'about', 'type: page\n')

    expectDiagnostic(() => compileSite(site), {
      code: 'MISSING_HOME',
      path: site.contentRoot,
    })
  })

  it('reports duplicate Home with both package paths, not DUPLICATE_SLUG', () => {
    const site = createSite({ home: false })
    const first = writePackage(site, 'a-home', 'type: home\n')
    const duplicate = writePackage(site, 'b-home', 'type: home\n')

    expectDiagnostic(() => compileSite(site), {
      code: 'DUPLICATE_HOME',
      path: duplicate,
      relatedPath: first,
    })
  })

  it.each([
    ['missing options object', undefined],
    ['null options object', null],
    [
      'non-string contentRoot',
      {
        contentRoot: null,
        sourceDir: '/site',
        configDir: '/site/.vuepress',
        mainLocale: 'zh',
      },
    ],
    [
      'empty sourceDir',
      {
        contentRoot: '/site/content',
        sourceDir: '',
        configDir: '/site/.vuepress',
        mainLocale: 'zh',
      },
    ],
    [
      'non-string configDir',
      {
        contentRoot: '/site/content',
        sourceDir: '/site',
        configDir: [],
        mainLocale: 'zh',
      },
    ],
    [
      'empty mainLocale',
      {
        contentRoot: '/site/content',
        sourceDir: '/site',
        configDir: '/site/.vuepress',
        mainLocale: '',
      },
    ],
    [
      'non-string definitionsPath',
      {
        contentRoot: '/site/content',
        sourceDir: '/site',
        configDir: '/site/.vuepress',
        mainLocale: 'zh',
        definitionsPath: 1,
      },
    ],
  ])('rejects %s with a structured diagnostic', (_label, value) => {
    expectDiagnostic(
      () =>
        compileContent(value as unknown as CompileContentOptions),
      { code: 'INVALID_COMPILE_OPTIONS' },
    )
  })
})
