import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  isDiagnosticError,
  SynctrolDiagnosticError,
} from '../../src/compiler/diagnostics'
import { parseContentManifest } from '../../src/compiler/manifest'

interface ManifestFixture {
  root: string
  dir: string
  path: string
}

const temporaryRoots = new Set<string>()

function writeManifest(
  body: string,
  packageName = 'content-package',
): ManifestFixture {
  const root = mkdtempSync(join(tmpdir(), 'synctrol-manifest-'))
  temporaryRoots.add(root)
  const dir = join(root, packageName)
  mkdirSync(dir)
  const path = join(dir, 'content.yml')
  writeFileSync(path, body, 'utf8')
  return { root, dir, path }
}

afterEach(() => {
  for (const root of temporaryRoots) {
    rmSync(root, { force: true, recursive: true })
  }
  temporaryRoots.clear()
})

function expectDiagnostic(
  fixture: ManifestFixture,
  code: string,
  message: string,
): void {
  try {
    parseContentManifest(fixture.path, fixture.dir)
    expect.unreachable('should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(SynctrolDiagnosticError)
    expect(isDiagnosticError(error)).toBe(true)
    if (isDiagnosticError(error)) {
      expect(error.diagnostics).toEqual([
        {
          severity: 'error',
          code,
          message,
          path: fixture.path,
        },
      ])
    }
  }
}

describe('parseContentManifest', () => {
  it('parses all release fields and defaults slug to the exact directory name', () => {
    const fixture = writeManifest(
      `
type: release
date: 2026-08-11
draft: true
cover: ./assets/article-cover.webp
artwork: ./assets/album-entry.webp
path:
  zh: /zh/releases/custom/
  en: /en/releases/custom/
`,
      'first-release',
    )

    expect(parseContentManifest(fixture.path, fixture.dir)).toEqual({
      type: 'release',
      slug: 'first-release',
      date: '2026-08-11',
      draft: true,
      cover: './assets/article-cover.webp',
      artwork: './assets/album-entry.webp',
      path: {
        zh: '/zh/releases/custom/',
        en: '/en/releases/custom/',
      },
    })
  })

  it('parses home and defaults draft to false', () => {
    const fixture = writeManifest('type: home\n')

    expect(parseContentManifest(fixture.path, fixture.dir)).toEqual({
      type: 'home',
      draft: false,
    })
  })

  it('parses all news fields and preserves duplicate tags', () => {
    const fixture = writeManifest(`
type: news
slug: announcement
date: 2024-02-29
updated: 2024-03-01
draft: false
tags: [release, release]
cover: ./assets/news.webp
path: /custom/language/prefix/news/
`)

    expect(parseContentManifest(fixture.path, fixture.dir)).toEqual({
      type: 'news',
      slug: 'announcement',
      date: '2024-02-29',
      updated: '2024-03-01',
      draft: false,
      tags: ['release', 'release'],
      cover: './assets/news.webp',
      path: '/custom/language/prefix/news/',
    })
  })

  it('parses all page fields', () => {
    const fixture = writeManifest(`
type: page
slug: about
draft: true
cover: ./assets/about.webp
path: {}
`)

    expect(parseContentManifest(fixture.path, fixture.dir)).toEqual({
      type: 'page',
      slug: 'about',
      draft: true,
      cover: './assets/about.webp',
      path: {},
    })
  })

  it.each([
    ['null', 'null'],
    ['sequence', '[]'],
    ['scalar', 'page'],
  ])('rejects a %s top-level manifest', (_label, body) => {
    expectDiagnostic(
      writeManifest(`${body}\n`),
      'INVALID_MANIFEST',
      'content.yml must be a plain mapping',
    )
  })

  it.each([
    'draft: false\n',
    'type: unknown\n',
    'type: 12\n',
    'type: null\n',
  ])(
    'rejects a missing or invalid content type',
    (body) => {
      expectDiagnostic(
        writeManifest(body),
        'UNKNOWN_CONTENT_TYPE',
        'type must be one of: home, release, news, page',
      )
    },
  )

  it.each([
    ['background', 'type: page\nbackground: ./background.ts\n', 'ILLEGAL_BACKGROUND',
      'background is not a legal content.yml field'],
    ['links', 'type: page\nlinks: []\n', 'ILLEGAL_LINKS',
      'top-level links is not a legal content.yml field'],
    ['unknown', 'type: page\nextra: true\n', 'UNKNOWN_FIELD',
      'Field "extra" is not allowed for page content'],
  ])('rejects the %s field with a specific diagnostic', (_name, body, code, message) => {
    expectDiagnostic(writeManifest(body), code, message)
  })

  it.each([
    ['slug', 'slug: home'],
    ['path', 'path: /home/'],
    ['cover', 'cover: ./cover.webp'],
    ['artwork', 'artwork: ./art.webp'],
    ['date', 'date: 2026-08-11'],
    ['updated', 'updated: 2026-08-12'],
    ['tags', 'tags: []'],
  ])('forbids %s on home', (field, entry) => {
    expectDiagnostic(
      writeManifest(`type: home\n${entry}\n`),
      'UNKNOWN_FIELD',
      `Field "${field}" is not allowed for home content`,
    )
  })

  it.each([
    ['updated', 'updated: 2026-08-12'],
    ['tags', 'tags: []'],
  ])('forbids %s on release', (field, entry) => {
    expectDiagnostic(
      writeManifest(`type: release\ndate: 2026-08-11\n${entry}\n`),
      'UNKNOWN_FIELD',
      `Field "${field}" is not allowed for release content`,
    )
  })

  it('forbids artwork on news', () => {
    expectDiagnostic(
      writeManifest(
        'type: news\ndate: 2026-08-11\ntags: []\nartwork: ./art.webp\n',
      ),
      'UNKNOWN_FIELD',
      'Field "artwork" is not allowed for news content',
    )
  })

  it.each([
    ['date', 'date: 2026-08-11'],
    ['updated', 'updated: 2026-08-12'],
    ['tags', 'tags: []'],
    ['artwork', 'artwork: ./art.webp'],
  ])('forbids %s on page', (field, entry) => {
    expectDiagnostic(
      writeManifest(`type: page\n${entry}\n`),
      'UNKNOWN_FIELD',
      `Field "${field}" is not allowed for page content`,
    )
  })

  it.each(['"false"', '0', 'null', '[]', '{}'])(
    'requires draft to be a boolean, not %s',
    (draft) => {
      expectDiagnostic(
        writeManifest(`type: page\ndraft: ${draft}\n`),
        'INVALID_DRAFT',
        'draft must be a boolean',
      )
    },
  )

  it.each([
    ['numeric', '12'],
    ['null', 'null'],
    ['empty', '""'],
    ['dot', '"."'],
    ['dot-dot', '".."'],
    ['slash', '"a/b"'],
    ['backslash', '"a\\\\b"'],
    ['encoded dot', '"%2e%2e"'],
    ['double-encoded dot', '"%252e%252e"'],
    ['encoded slash', '"a%2fb"'],
    ['encoded backslash', '"a%5cb"'],
    ['leading whitespace', '" page"'],
    ['trailing whitespace', '"page "'],
    ['control character', '"page\\u0007"'],
    ['dangerous key', '"constructor"'],
  ])('rejects a %s slug', (_label, slug) => {
    expectDiagnostic(
      writeManifest(`type: page\nslug: ${slug}\n`),
      'INVALID_SLUG',
      'slug must be a safe, non-empty route segment',
    )
  })

  it('validates an implicit slug with the same route-segment rules', () => {
    expectDiagnostic(
      writeManifest('type: page\n', '%252e%252e'),
      'INVALID_SLUG',
      'slug must be a safe, non-empty route segment',
    )
  })

  it.each([
    ['non-leap February 29', '2023-02-29'],
    ['February 31', '2024-02-31'],
    ['month 13', '2024-13-01'],
    ['month zero', '2024-00-01'],
    ['day zero', '2024-01-00'],
    ['year zero', '0000-01-01'],
    ['wrong form', '08-11-2026'],
  ])('rejects an invalid date: %s', (_label, date) => {
    expectDiagnostic(
      writeManifest(`type: release\ndate: ${date}\n`),
      'INVALID_DATE',
      'date must be a real Gregorian calendar date in YYYY-MM-DD form',
    )
  })

  it('validates updated as a real calendar date', () => {
    expectDiagnostic(
      writeManifest(
        'type: news\ndate: 2024-02-29\nupdated: 2024-02-31\ntags: []\n',
      ),
      'INVALID_DATE',
      'updated must be a real Gregorian calendar date in YYYY-MM-DD form',
    )
  })

  it('rejects updated before date but accepts the same date', () => {
    const invalid = writeManifest(
      'type: news\ndate: 2026-08-11\nupdated: 2026-08-10\ntags: []\n',
    )
    expectDiagnostic(
      invalid,
      'INVALID_DATE_ORDER',
      'updated cannot precede date',
    )

    const valid = writeManifest(
      'type: news\ndate: 2026-08-11\nupdated: 2026-08-11\ntags: []\n',
    )
    expect(parseContentManifest(valid.path, valid.dir)).toMatchObject({
      date: '2026-08-11',
      updated: '2026-08-11',
    })
  })

  it.each([
    ['missing release date', 'type: release\n', 'date'],
    ['numeric release date', 'type: release\ndate: 20260811\n', 'date'],
    ['null news date', 'type: news\ndate: null\ntags: []\n', 'date'],
  ])('rejects %s', (_label, body, field) => {
    expectDiagnostic(
      writeManifest(body),
      'INVALID_DATE',
      `${field} must be a real Gregorian calendar date in YYYY-MM-DD form`,
    )
  })

  it.each([
    ['cover', 'page', '""', 'INVALID_COVER', 'cover must be a non-empty string'],
    ['cover', 'page', 'null', 'INVALID_COVER', 'cover must be a non-empty string'],
    ['cover', 'page', '42', 'INVALID_COVER', 'cover must be a non-empty string'],
    ['cover', 'page', '"   "', 'INVALID_COVER', 'cover must be a non-empty string'],
    ['artwork', 'release', '""', 'INVALID_ARTWORK',
      'artwork must be a non-empty string'],
    ['artwork', 'release', 'null', 'INVALID_ARTWORK',
      'artwork must be a non-empty string'],
    ['artwork', 'release', '42', 'INVALID_ARTWORK',
      'artwork must be a non-empty string'],
    ['artwork', 'release', '"   "', 'INVALID_ARTWORK',
      'artwork must be a non-empty string'],
  ])('rejects invalid %s value %s', (field, type, value, code, message) => {
    const date = type === 'release' ? 'date: 2026-08-11\n' : ''
    expectDiagnostic(
      writeManifest(`type: ${type}\n${date}${field}: ${value}\n`),
      code,
      message,
    )
  })

  it.each([
    ['missing', ''],
    ['null', 'tags: null\n'],
    ['mapping', 'tags: {}\n'],
    ['string', 'tags: release\n'],
    ['numeric entry', 'tags: [1]\n'],
    ['null entry', 'tags: [null]\n'],
    ['empty entry', 'tags: [""]\n'],
    ['blank entry', 'tags: ["   "]\n'],
  ])('rejects %s news tags', (_label, tags) => {
    expectDiagnostic(
      writeManifest(`type: news\ndate: 2026-08-11\n${tags}`),
      'INVALID_TAGS',
      'tags must be an array of non-empty strings',
    )
  })

  it.each([
    ['empty scalar', 'path: ""\n',
      'path must be a non-empty string or locale map'],
    ['blank scalar', 'path: "   "\n',
      'path must be a non-empty string or locale map'],
    ['numeric scalar', 'path: 1\n',
      'path must be a non-empty string or locale map'],
    ['null', 'path: null\n',
      'path must be a non-empty string or locale map'],
    ['sequence', 'path: []\n',
      'path must be a non-empty string or locale map'],
    ['unsafe locale key', 'path:\n  zh/en: /custom/path/\n',
      'path contains an invalid locale key "zh/en"'],
    ['encoded locale key', 'path:\n  "%252e%252e": /custom/path/\n',
      'path contains an invalid locale key "%252e%252e"'],
    ['whitespace locale key', 'path:\n  " en": /custom/path/\n',
      'path contains an invalid locale key " en"'],
    ['dangerous locale key', 'path:\n  constructor: /custom/path/\n',
      'path contains an invalid locale key "constructor"'],
    ['empty map value', 'path:\n  en: ""\n',
      'path map values must be non-empty strings'],
    ['blank map value', 'path:\n  en: "   "\n',
      'path map values must be non-empty strings'],
    ['numeric map value', 'path:\n  en: 1\n',
      'path map values must be non-empty strings'],
    ['null map value', 'path:\n  en: null\n',
      'path map values must be non-empty strings'],
  ])('rejects an invalid LocalePath: %s', (_label, path, message) => {
    expectDiagnostic(
      writeManifest(`type: page\n${path}`),
      'INVALID_PATH',
      message,
    )
  })

  it('accepts an empty LocalePath map without a main-locale fallback', () => {
    const fixture = writeManifest('type: page\npath: {}\n')

    expect(parseContentManifest(fixture.path, fixture.dir)).toMatchObject({
      type: 'page',
      path: {},
    })
  })
})
