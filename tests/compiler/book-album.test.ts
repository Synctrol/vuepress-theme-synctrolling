import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseAlbumBook, parseBook } from '../../src/compiler/book'
import {
  isDiagnosticError,
  SynctrolDiagnosticError,
} from '../../src/compiler/diagnostics'
import type { AlbumBook, ContentDefinitions } from '../../src/shared/types'

const defs: ContentDefinitions = {
  tags: {},
  platforms: {
    bilibili: {
      category: 'digital',
      type: 'bilibili_player',
      name: 'Bilibili',
    },
    taobao: {
      category: 'physical',
      type: 'link',
      name: { zh: '淘宝', en: 'Taobao' },
    },
  },
}

const directPath = '/content/releases/example/book.yml'
const temporaryRoots = new Set<string>()

function writeBook(body: string): string {
  const root = mkdtempSync(join(tmpdir(), 'synctrol-book-'))
  temporaryRoots.add(root)
  const path = join(root, 'book.yml')
  writeFileSync(path, body, 'utf8')
  return path
}

afterEach(() => {
  for (const root of temporaryRoots) {
    rmSync(root, { force: true, recursive: true })
  }
  temporaryRoots.clear()
})

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
  code: string,
  message: string,
  path?: string,
): void {
  const error = captureError(action)
  expect(error).toBeInstanceOf(SynctrolDiagnosticError)
  expect(isDiagnosticError(error)).toBe(true)
  if (isDiagnosticError(error)) {
    expect(error.diagnostics).toHaveLength(1)
    expect(error.diagnostics[0]).toMatchObject({
      severity: 'error',
      code,
      path,
    })
    expect(error.diagnostics[0].message).toContain(message)
  }
}

function parseDirect(raw: Record<string, unknown>) {
  return parseAlbumBook(raw, defs, 'zh', directPath)
}

function minimalRaw(
  album: Record<string, unknown> = {},
): Record<string, unknown> {
  return { type: 'album', title: 'Album', album }
}

function expectNoUndefined(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(expectNoUndefined)
    return
  }
  if (value === null || typeof value !== 'object') return
  for (const entry of Object.values(value)) {
    expect(entry).not.toBeUndefined()
    expectNoUndefined(entry)
  }
}

describe('parseBook album YAML', () => {
  it('parses every AlbumBook field and preserves disc and track order', () => {
    const path = writeBook(`
type: album
title:
  zh: 第一张专辑
  en: First Album
copyright: © 2026 Synctrol
album:
  covers:
    - ./assets/front.webp
    - ./assets/back.webp
  links:
    - platform: bilibili
      label:
        zh: 播放
        en: Play
      bvid: BV1xxxxxxxxx
      page: 1
      autoplay: false
  discs:
    - title:
        zh: 第一碟
        en: Disc One
      desc: Main disc
      tracks:
        - title:
            zh: 第一曲
            en: Track One
          desc: Opening track
          artists: [Synctrol, Vocalist]
          duration: 272
          copyright: © 2026 Synctrol
        - title: Track Two
          artists: [Solo Artist]
          duration: 0
    - title: Disc Two
      tracks: []
`)

    expect(parseBook(path, defs, 'zh')).toEqual({
      type: 'album',
      title: { zh: '第一张专辑', en: 'First Album' },
      copyright: '© 2026 Synctrol',
      album: {
        covers: ['./assets/front.webp', './assets/back.webp'],
        links: [
          {
            platform: 'bilibili',
            label: { zh: '播放', en: 'Play' },
            bvid: 'BV1xxxxxxxxx',
            page: 1,
            autoplay: false,
          },
        ],
        discs: [
          {
            title: { zh: '第一碟', en: 'Disc One' },
            desc: 'Main disc',
            tracks: [
              {
                title: { zh: '第一曲', en: 'Track One' },
                desc: 'Opening track',
                artists: ['Synctrol', 'Vocalist'],
                duration: 272,
                copyright: '© 2026 Synctrol',
              },
              { title: 'Track Two', artists: ['Solo Artist'], duration: 0 },
            ],
          },
          { title: 'Disc Two', tracks: [] },
        ],
      },
    })
  })

  it('omits every absent optional field instead of emitting undefined', () => {
    const path = writeBook(`
type: album
title: Minimal Album
album: {}
`)

    const book = parseBook(path, defs, 'zh')
    expect(book).toEqual({
      type: 'album',
      title: 'Minimal Album',
      album: {},
    })
    expectNoUndefined(book)
  })

  it('preserves explicitly empty optional arrays and required track arrays', () => {
    const path = writeBook(`
type: album
title: Empty Album
album:
  covers: []
  links: []
  discs:
    - title: Empty Disc
      tracks: []
`)

    expect(parseBook(path, defs, 'zh')).toEqual({
      type: 'album',
      title: 'Empty Album',
      album: {
        covers: [],
        links: [],
        discs: [{ title: 'Empty Disc', tracks: [] }],
      },
    })
  })

  it('validates mainLocale in book, disc, track, description, and link label maps', () => {
    const invalidCases = [
      ['title', 'title:\n  en: Album\nalbum: {}', 'title'],
      [
        'disc description',
        'title: Album\nalbum:\n  discs:\n    - title: Disc\n      desc:\n        en: Description\n      tracks: []',
        'album.discs[0].desc',
      ],
      [
        'disc title',
        'title: Album\nalbum:\n  discs:\n    - title:\n        en: Disc\n      tracks: []',
        'album.discs[0].title',
      ],
      [
        'track title',
        'title: Album\nalbum:\n  discs:\n    - title: Disc\n      tracks:\n        - title:\n            en: Track\n          artists: [Artist]\n          duration: 0',
        'album.discs[0].tracks[0].title',
      ],
      [
        'label',
        'title: Album\nalbum:\n  links:\n    - platform: bilibili\n      label:\n        en: Play\n      bvid: BV1xxxxxxxxx',
        'album.links[0].label',
      ],
    ] as const

    for (const [_name, fields, message] of invalidCases) {
      const path = writeBook(`type: album\n${fields}\n`)
      expectDiagnostic(
        () => parseBook(path, defs, 'zh'),
        'MISSING_MAIN_LOCALE',
        message,
        path,
      )
    }
  })

  it('reports missing album and forbidden gift branches independently', () => {
    const missing = writeBook('type: album\ntitle: Album\n')
    expectDiagnostic(
      () => parseBook(missing, defs, 'zh'),
      'INVALID_BOOK_BRANCH',
      'album book requires album',
      missing,
    )

    const forbidden = writeBook(`
type: album
title: Album
album: {}
gift:
  items: []
`)
    expectDiagnostic(
      () => parseBook(forbidden, defs, 'zh'),
      'INVALID_BOOK_BRANCH',
      'album book forbids gift',
      forbidden,
    )
  })

  it.each([
    ['unknown', 'type: compilation\ntitle: X\n'],
    ['missing', 'title: X\nalbum: {}\n'],
  ])('rejects the %s dispatcher branch', (_name, body) => {
    const path = writeBook(body)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'INVALID_BOOK_BRANCH',
      'type',
      path,
    )
  })

  it.each([
    ['null', 'null'],
    ['sequence', '[]'],
    ['scalar', 'album'],
  ])('rejects a %s top-level value', (_name, body) => {
    const path = writeBook(`${body}\n`)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'INVALID_BOOK',
      'book.yml must be a plain mapping',
      path,
    )
  })

  it.each([
    [
      'top-level',
      'type: album\ntitle: Album\nalbum: {}\nextra: true\n',
      'extra',
    ],
    [
      'album',
      'type: album\ntitle: Album\nalbum:\n  extra: true\n',
      'album.extra',
    ],
    [
      'disc',
      'type: album\ntitle: Album\nalbum:\n  discs:\n    - title: Disc\n      tracks: []\n      extra: true\n',
      'album.discs[0].extra',
    ],
    [
      'track',
      'type: album\ntitle: Album\nalbum:\n  discs:\n    - title: Disc\n      tracks:\n        - title: Track\n          artists: [Artist]\n          duration: 0\n          extra: true\n',
      'album.discs[0].tracks[0].extra',
    ],
  ])('rejects an unknown %s field', (_name, body, message) => {
    const path = writeBook(body)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'UNKNOWN_FIELD',
      message,
      path,
    )
  })

  it.each([
    ['copyright number', 'copyright: 2026', 'copyright'],
    ['covers mapping', 'album:\n  covers: {}', 'album.covers'],
    ['empty cover', 'album:\n  covers: [""]', 'album.covers[0]'],
    ['numeric cover', 'album:\n  covers: [1]', 'album.covers[0]'],
    ['links mapping', 'album:\n  links: {}', 'album.links'],
    ['discs mapping', 'album:\n  discs: {}', 'album.discs'],
    ['disc scalar', 'album:\n  discs: [disc]', 'album.discs[0]'],
    [
      'missing disc tracks',
      'album:\n  discs:\n    - title: Disc',
      'album.discs[0].tracks',
    ],
    [
      'track scalar',
      'album:\n  discs:\n    - title: Disc\n      tracks: [track]',
      'album.discs[0].tracks[0]',
    ],
    [
      'missing artists',
      'album:\n  discs:\n    - title: Disc\n      tracks:\n        - title: Track\n          duration: 0',
      'album.discs[0].tracks[0].artists',
    ],
    [
      'non-string artist',
      'album:\n  discs:\n    - title: Disc\n      tracks:\n        - title: Track\n          artists: [Artist, 1]\n          duration: 0',
      'album.discs[0].tracks[0].artists[1]',
    ],
    [
      'track copyright number',
      'album:\n  discs:\n    - title: Disc\n      tracks:\n        - title: Track\n          artists: [Artist]\n          duration: 0\n          copyright: 2026',
      'album.discs[0].tracks[0].copyright',
    ],
  ])('rejects invalid optional or nested structure: %s', (_name, body, message) => {
    const normalizedBody = body.startsWith('album:')
      ? body
      : `album: {}\n${body}`
    const path = writeBook(`type: album\ntitle: Album\n${normalizedBody}\n`)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'INVALID_BOOK',
      message,
      path,
    )
  })

  it.each([
    ['missing book title', 'album: {}', 'title'],
    ['invalid book title', 'title: 1\nalbum: {}', 'title'],
    [
      'missing disc title',
      'title: Album\nalbum:\n  discs:\n    - tracks: []',
      'album.discs[0].title',
    ],
    [
      'missing track title',
      'title: Album\nalbum:\n  discs:\n    - title: Disc\n      tracks:\n        - artists: [Artist]\n          duration: 0',
      'album.discs[0].tracks[0].title',
    ],
  ])('rejects a %s', (_name, body, message) => {
    const path = writeBook(`type: album\n${body}\n`)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'INVALID_MULTILANGUAGE',
      message,
      path,
    )
  })

  it.each([
    ['missing', ''],
    ['negative', '-1'],
    ['fractional', '1.5'],
    ['NaN-like YAML', '.nan'],
  ])('rejects a %s track duration', (_name, duration) => {
    const durationField = duration === '' ? '' : `          duration: ${duration}\n`
    const path = writeBook(`
type: album
title: Album
album:
  discs:
    - title: Disc
      tracks:
        - title: Track
          artists: [Artist]
${durationField}`)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'INVALID_BOOK',
      'album.discs[0].tracks[0].duration',
      path,
    )
  })

  it('rejects an empty artists array with the exact indexed track path', () => {
    const path = writeBook(`
type: album
title: Album
album:
  discs:
    - title: Disc One
      tracks: []
    - title: Disc Two
      tracks:
        - title: Valid Track
          artists: [Artist]
          duration: 1
        - title: Invalid Track
          artists: []
          duration: 2
`)

    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'INVALID_BOOK',
      'album.discs[1].tracks[1].artists',
      path,
    )
  })

  it('rejects physical platform entries in album.links', () => {
    const path = writeBook(`
type: album
title: Album
album:
  links:
    - platform: taobao
      url: https://item.taobao.com/example
`)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'PLATFORM_CATEGORY_MISMATCH',
      'album.links[0]',
      path,
    )
  })
})

describe('parseAlbumBook credit validation', () => {
  it('parses credit keys and ignores omitted ones', () => {
    const path = writeBook(`type: album
title: Album
credit:
  catalogNumber: DVSP-0327
  illustrator: タイキ
album: {}
`)
    const book = parseBook(path, defs, 'zh') as AlbumBook
    expect(book.credit).toEqual({ catalogNumber: 'DVSP-0327', illustrator: 'タイキ' })
  })

  it('rejects unknown credit keys', () => {
    const run = () =>
      parseBook(
        writeBook(`type: album
title: Album
credit:
  master: Who
album: {}
`),
        defs,
        'zh',
      )
    expect(run).toThrowError(/Unknown field "credit\.master"/)
  })

  it('accepts string arrays and rejects other credit value types', () => {
    const withArray = parseBook(
      writeBook(`type: album
title: Album
credit:
  illustrator:
    - タイキ
    - 助手
album: {}
`),
      defs,
      'zh',
    ) as AlbumBook
    expect(withArray.credit).toEqual({ illustrator: ['タイキ', '助手'] })

    const number = () =>
      parseBook(
        writeBook(`type: album
title: Album
credit:
  illustrator: 123
album: {}
`),
        defs,
        'zh',
      )
    expect(number).toThrowError(/credit\.illustrator must be a string or an array of strings/)

    const mixed = () =>
      parseBook(
        writeBook(`type: album
title: Album
credit:
  illustrator:
    - タイキ
    - 123
album: {}
`),
        defs,
        'zh',
      )
    expect(mixed).toThrowError(/credit\.illustrator must be a string or an array of strings/)

    const empty = () =>
      parseBook(
        writeBook(`type: album
title: Album
credit:
  illustrator: []
album: {}
`),
        defs,
        'zh',
      )
    expect(empty).toThrowError(/credit\.illustrator must be a string or an array of strings/)
  })

  it('rejects top-level desc and authors fields', () => {
    for (const field of ['desc: x', 'authors: [A]']) {
      const run = () =>
        parseBook(
          writeBook(`type: album
title: Album
${field}
album: {}
`),
          defs,
          'zh',
        )
      expect(run).toThrowError(/Unknown field/)
    }
  })

  it('keeps disc and track desc fields', () => {
    const book = parseBook(
      writeBook(`type: album
title: Album
album:
  discs:
    - title: Disc
      desc: Main disc
      tracks:
        - title: T
          artists: [A]
          duration: 60
          desc: Opening track
`),
      defs,
      'zh',
    ) as AlbumBook
    expect(book.album.discs?.[0]?.desc).toBe('Main disc')
  })
})

describe('parseAlbumBook mapping safety and isolation', () => {
  it('accepts null-prototype mappings at every schema layer', () => {
    const track = Object.assign(Object.create(null), {
      title: 'Track',
      artists: ['Artist'],
      duration: 1,
    })
    const disc = Object.assign(Object.create(null), {
      title: 'Disc',
      tracks: [track],
    })
    const album = Object.assign(Object.create(null), { discs: [disc] })
    const raw = Object.assign(Object.create(null), {
      type: 'album',
      title: 'Album',
      album,
    })

    expect(parseDirect(raw)).toEqual({
      type: 'album',
      title: 'Album',
      album: {
        discs: [
          {
            title: 'Disc',
            tracks: [{ title: 'Track', artists: ['Artist'], duration: 1 }],
          },
        ],
      },
    })
  })

  it.each([
    ['top-level', new (class BookRecord {})(), 'book.yml'],
    ['album', new (class AlbumRecord {})(), 'album'],
    ['disc', new (class DiscRecord {})(), 'album.discs[0]'],
    ['track', new (class TrackRecord {})(), 'album.discs[0].tracks[0]'],
  ])('rejects a non-plain %s mapping', (level, value, message) => {
    let raw: Record<string, unknown>
    if (level === 'top-level') {
      raw = value as Record<string, unknown>
    } else if (level === 'album') {
      raw = { type: 'album', title: 'Album', album: value }
    } else if (level === 'disc') {
      raw = minimalRaw({ discs: [value] })
    } else {
      raw = minimalRaw({
        discs: [{ title: 'Disc', tracks: [value] }],
      })
    }

    expectDiagnostic(
      () => parseDirect(raw),
      level === 'album' ? 'INVALID_BOOK_BRANCH' : 'INVALID_BOOK',
      message,
      directPath,
    )
  })

  it.each([
    ['top-level', 'title'],
    ['album', 'covers'],
    ['disc', 'tracks'],
    ['track', 'duration'],
    ['credit', 'producer'],
  ])('rejects a %s accessor without executing it', (level, field) => {
    let getterCalled = false
    const accessed: Record<string, unknown> =
      level === 'top-level'
        ? { type: 'album', album: {} }
        : level === 'album' || level === 'credit'
          ? {}
          : level === 'disc'
            ? { title: 'Disc' }
            : { title: 'Track', artists: ['Artist'] }
    Object.defineProperty(accessed, field, {
      enumerable: true,
      get() {
        getterCalled = true
        return level === 'disc' ? [] : level === 'track' ? 0 : 'polluted'
      },
    })

    const raw =
      level === 'top-level'
        ? accessed
        : level === 'album'
          ? { type: 'album', title: 'Album', album: accessed }
          : level === 'credit'
            ? { ...minimalRaw(), credit: accessed }
            : level === 'disc'
              ? minimalRaw({ discs: [accessed] })
              : minimalRaw({
                  discs: [{ title: 'Disc', tracks: [accessed] }],
                })

    expectDiagnostic(
      () => parseDirect(raw),
      'INVALID_BOOK',
      level === 'top-level'
        ? 'title'
        : level === 'album'
          ? `album.${field}`
          : level === 'credit'
            ? `credit.${field}`
            : level === 'disc'
              ? `album.discs[0].${field}`
              : `album.discs[0].tracks[0].${field}`,
      directPath,
    )
    expect(getterCalled).toBe(false)
  })

  it('does not obtain missing required or optional fields from Object.prototype', () => {
    const originals = new Map<string, PropertyDescriptor | undefined>()
    const pollution: Record<string, unknown> = {
      album: {},
      covers: ['./polluted.webp'],
      tracks: [],
      artists: ['Polluted'],
      duration: 99,
    }
    for (const [key, value] of Object.entries(pollution)) {
      originals.set(key, Object.getOwnPropertyDescriptor(Object.prototype, key))
      Object.defineProperty(Object.prototype, key, {
        configurable: true,
        value,
        writable: true,
      })
    }

    try {
      expectDiagnostic(
        () => parseDirect({ type: 'album', title: 'Album' }),
        'INVALID_BOOK_BRANCH',
        'album book requires album',
        directPath,
      )
      expect(parseDirect(minimalRaw())).toEqual({
        type: 'album',
        title: 'Album',
        album: {},
      })
      expectDiagnostic(
        () =>
          parseDirect(
            minimalRaw({
              discs: [{ title: 'Disc', tracks: [{ title: 'Track' }] }],
            }),
          ),
        'INVALID_BOOK',
        'album.discs[0].tracks[0].artists',
        directPath,
      )
    } finally {
      for (const [key, descriptor] of [...originals].reverse()) {
        if (descriptor === undefined) {
          Reflect.deleteProperty(Object.prototype, key)
        } else {
          Object.defineProperty(Object.prototype, key, descriptor)
        }
      }
    }
  })

  it('rejects non-enumerable and symbol unknown own fields', () => {
    const album = {}
    Object.defineProperty(album, 'hidden', { value: true })
    expectDiagnostic(
      () => parseDirect(minimalRaw(album)),
      'UNKNOWN_FIELD',
      'album.hidden',
      directPath,
    )

    const symbol = Symbol('hidden')
    expectDiagnostic(
      () => parseDirect(minimalRaw({ [symbol]: true })),
      'UNKNOWN_FIELD',
      'Symbol(hidden)',
      directPath,
    )
  })

  it('returns deep copies isolated from later input mutation', () => {
    const title = { zh: '专辑', en: 'Album' }
    const credit: Record<string, string> = {
      producer: 'Synctrol',
      illustrator: 'タイキ',
    }
    const covers = ['./front.webp']
    const label = { zh: '播放', en: 'Play' }
    const artists = ['Artist']
    const trackTitle = { zh: '歌曲', en: 'Track' }
    const track = {
      title: trackTitle,
      artists,
      duration: 5,
    }
    const tracks = [track]
    const disc = { title: 'Disc', tracks }
    const discs = [disc]
    const links = [
      {
        platform: 'bilibili',
        label,
        bvid: 'BV1xxxxxxxxx',
      },
    ]
    const album = { covers, links, discs }
    const raw = {
      type: 'album',
      title,
      credit,
      album,
    }

    const result = parseDirect(raw)
    title.zh = '已修改'
    credit.producer = 'Changed'
    credit.illustrator = 'Changed'
    credit.catalogNumber = 'Added Later'
    covers.push('./back.webp')
    label.zh = '已修改'
    artists.push('Mutated')
    trackTitle.zh = '已修改'
    track.duration = 999
    tracks.push({
      title: { zh: '新增', en: 'Added' },
      artists: ['Added Artist'],
      duration: 0,
    })
    discs.push({ title: 'Added Disc', tracks: [] })
    links.push({
      platform: 'bilibili',
      label: { zh: '新增', en: 'Added' },
      bvid: 'BV2yyyyyyyyy',
    })

    expect(result).toEqual({
      type: 'album',
      title: { zh: '专辑', en: 'Album' },
      credit: { producer: 'Synctrol', illustrator: 'タイキ' },
      album: {
        covers: ['./front.webp'],
        links: [
          {
            platform: 'bilibili',
            label: { zh: '播放', en: 'Play' },
            bvid: 'BV1xxxxxxxxx',
            autoplay: false,
          },
        ],
        discs: [
          {
            title: 'Disc',
            tracks: [
              {
                title: { zh: '歌曲', en: 'Track' },
                artists: ['Artist'],
                duration: 5,
              },
            ],
          },
        ],
      },
    })
  })
})
