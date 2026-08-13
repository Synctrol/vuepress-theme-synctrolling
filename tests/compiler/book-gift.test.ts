import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseBook,
  parseGiftBook,
} from '../../src/compiler/book'
import {
  isDiagnosticError,
  SynctrolDiagnosticError,
} from '../../src/compiler/diagnostics'
import type { ContentDefinitions, GiftBook } from '../../src/shared/types'

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
  const root = mkdtempSync(join(tmpdir(), 'synctrol-gift-'))
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

function minimalRaw(
  gift: Record<string, unknown> = { items: [] },
): Record<string, unknown> {
  return { type: 'gift', title: 'Gifts', gift }
}

function parseDirect(raw: Record<string, unknown>) {
  return parseGiftBook(raw, defs, 'zh', directPath)
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

describe('parseBook gift YAML', () => {
  it('parses every GiftBook field and preserves item and link order', () => {
    const path = writeBook(`
type: gift
title:
  zh: 周边系列
  en: Merchandise
copyright: © 2026 Synctrol
gift:
  items:
    - id: poster
      title:
        zh: 纪念海报
        en: Commemorative Poster
      desc: Limited Edition
      covers:
        - ./assets/poster-front.webp
        - ./assets/poster-back.webp
      links:
        - platform: taobao
          label:
            zh: 购买
            en: Buy
          url: https://item.taobao.com/poster
        - platform: taobao
          url: https://item.taobao.com/poster-back
      copyright: © 2026 Synctrol
    - id: pin
      title: Enamel Pin
`)

    expect(parseBook(path, defs, 'zh')).toEqual({
      type: 'gift',
      title: { zh: '周边系列', en: 'Merchandise' },
      copyright: '© 2026 Synctrol',
      gift: {
        items: [
          {
            id: 'poster',
            title: { zh: '纪念海报', en: 'Commemorative Poster' },
            desc: 'Limited Edition',
            covers: [
              './assets/poster-front.webp',
              './assets/poster-back.webp',
            ],
            links: [
              {
                platform: 'taobao',
                label: { zh: '购买', en: 'Buy' },
                url: 'https://item.taobao.com/poster',
              },
              {
                platform: 'taobao',
                url: 'https://item.taobao.com/poster-back',
              },
            ],
            copyright: '© 2026 Synctrol',
          },
          { id: 'pin', title: 'Enamel Pin' },
        ],
      },
    })
  })

  it('allows empty gift.items and omits every absent optional field', () => {
    const path = writeBook(`
type: gift
title: Gifts
gift:
  items: []
`)

    const book = parseBook(path, defs, 'zh')
    expect(book).toEqual({
      type: 'gift',
      title: 'Gifts',
      gift: { items: [] },
    })
    expectNoUndefined(book)
  })

  it('preserves explicitly empty optional arrays', () => {
    const path = writeBook(`
type: gift
title: Gifts
gift:
  items:
    - id: poster
      title: Poster
      covers: []
      links: []
`)

    expect(parseBook(path, defs, 'zh')).toEqual({
      type: 'gift',
      title: 'Gifts',
      gift: {
        items: [{ id: 'poster', title: 'Poster', covers: [], links: [] }],
      },
    })
  })

  it('forbids album branch independently from requiring gift branch', () => {
    const forbidden = writeBook(`
type: gift
title: Gifts
album: {}
gift:
  items: []
`)
    expectDiagnostic(
      () => parseBook(forbidden, defs, 'zh'),
      'INVALID_BOOK_BRANCH',
      'gift book forbids album',
      forbidden,
    )

    const missing = writeBook('type: gift\ntitle: Gifts\n')
    expectDiagnostic(
      () => parseBook(missing, defs, 'zh'),
      'INVALID_BOOK_BRANCH',
      'gift book requires gift',
      missing,
    )
  })

  it.each([
    ['unknown', 'type: compilation\ntitle: X\n'],
    ['missing', 'title: X\ngift:\n  items: []\n'],
  ])('rejects a %s dispatcher type', (_name, body) => {
    const path = writeBook(body)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'INVALID_BOOK_BRANCH',
      'type',
      path,
    )
  })

  it('rejects duplicate item ids with the duplicate id and index', () => {
    const path = writeBook(`
type: gift
title: Gifts
gift:
  items:
    - id: poster
      title: First
    - id: pin
      title: Pin
    - id: poster
      title: Duplicate
`)

    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'DUPLICATE_GIFT_ITEM_ID',
      'gift.items[2].id',
      path,
    )
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'DUPLICATE_GIFT_ITEM_ID',
      '"poster"',
      path,
    )
  })

  it('rejects digital platform entries with the exact item link path', () => {
    const path = writeBook(`
type: gift
title: Gifts
gift:
  items:
    - id: poster
      title: Poster
      links:
        - platform: bilibili
          bvid: BV1xxxxxxxxx
`)

    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'PLATFORM_CATEGORY_MISMATCH',
      'gift.items[0].links[0]',
      path,
    )
  })

  it.each([
    [
      'book title',
      'title:\n  en: Gifts\ngift:\n  items: []',
      'title',
    ],
    [
      'item title',
      'title: Gifts\ngift:\n  items:\n    - id: poster\n      title:\n        en: Poster',
      'gift.items[0].title',
    ],
    [
      'item description',
      'title: Gifts\ngift:\n  items:\n    - id: poster\n      title: Poster\n      desc:\n        en: Description',
      'gift.items[0].desc',
    ],
    [
      'link label',
      'title: Gifts\ngift:\n  items:\n    - id: poster\n      title: Poster\n      links:\n        - platform: taobao\n          label:\n            en: Buy\n          url: https://item.taobao.com/poster',
      'gift.items[0].links[0].label',
    ],
  ])('validates mainLocale in %s maps', (_name, fields, message) => {
    const path = writeBook(`type: gift\n${fields}\n`)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'MISSING_MAIN_LOCALE',
      message,
      path,
    )
  })

  it.each([
    [
      'top-level',
      'type: gift\ntitle: Gifts\ngift:\n  items: []\nextra: true\n',
      'extra',
    ],
    [
      'gift',
      'type: gift\ntitle: Gifts\ngift:\n  items: []\n  extra: true\n',
      'gift.extra',
    ],
    [
      'item',
      'type: gift\ntitle: Gifts\ngift:\n  items:\n    - id: poster\n      title: Poster\n      extra: true\n',
      'gift.items[0].extra',
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
    ['missing items', 'gift: {}', 'gift.items'],
    ['items mapping', 'gift:\n  items: {}', 'gift.items'],
    ['item scalar', 'gift:\n  items: [poster]', 'gift.items[0]'],
    [
      'missing item id',
      'gift:\n  items:\n    - title: Poster',
      'gift.items[0].id',
    ],
    [
      'empty item id',
      'gift:\n  items:\n    - id: ""\n      title: Poster',
      'gift.items[0].id',
    ],
    [
      'non-string item id',
      'gift:\n  items:\n    - id: 1\n      title: Poster',
      'gift.items[0].id',
    ],
    [
      'covers mapping',
      'gift:\n  items:\n    - id: poster\n      title: Poster\n      covers: {}',
      'gift.items[0].covers',
    ],
    [
      'empty cover',
      'gift:\n  items:\n    - id: poster\n      title: Poster\n      covers: [""]',
      'gift.items[0].covers[0]',
    ],
    [
      'numeric cover',
      'gift:\n  items:\n    - id: poster\n      title: Poster\n      covers: [1]',
      'gift.items[0].covers[0]',
    ],
    [
      'links mapping',
      'gift:\n  items:\n    - id: poster\n      title: Poster\n      links: {}',
      'gift.items[0].links',
    ],
    [
      'item copyright number',
      'gift:\n  items:\n    - id: poster\n      title: Poster\n      copyright: 2026',
      'gift.items[0].copyright',
    ],
    ['book copyright number', 'copyright: 2026\ngift:\n  items: []', 'copyright'],
  ])('rejects invalid structure or field: %s', (_name, fields, message) => {
    const path = writeBook(`type: gift\ntitle: Gifts\n${fields}\n`)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'INVALID_BOOK',
      message,
      path,
    )
  })

  it.each([
    ['missing book title', 'gift:\n  items: []', 'title'],
    ['invalid book title', 'title: 1\ngift:\n  items: []', 'title'],
    [
      'missing item title',
      'title: Gifts\ngift:\n  items:\n    - id: poster',
      'gift.items[0].title',
    ],
    [
      'invalid item title',
      'title: Gifts\ngift:\n  items:\n    - id: poster\n      title: 1',
      'gift.items[0].title',
    ],
  ])('rejects a %s', (_name, body, message) => {
    const path = writeBook(`type: gift\n${body}\n`)
    expectDiagnostic(
      () => parseBook(path, defs, 'zh'),
      'INVALID_MULTILANGUAGE',
      message,
      path,
    )
  })

  it('parses gift credit and rejects top-level desc/authors', () => {
    const book = parseBook(
      writeBook(`type: gift
title: Gifts
credit:
  producer: Synctrol
gift:
  items: []
`),
      defs,
      'zh',
    ) as GiftBook
    expect(book.credit).toEqual({ producer: 'Synctrol' })

    for (const field of ['desc: x', 'authors: [A]']) {
      const run = () =>
        parseBook(
          writeBook(`type: gift
title: Gifts
${field}
gift:
  items: []
`),
          defs,
          'zh',
        )
      expect(run).toThrowError(/Unknown field/)
    }
  })
})

describe('parseGiftBook mapping safety and isolation', () => {
  it('validates its own gift discriminator', () => {
    expectDiagnostic(
      () =>
        parseDirect({
          type: 'album',
          title: 'Wrong branch',
          gift: { items: [] },
        }),
      'INVALID_BOOK_BRANCH',
      'type must be "gift"',
      directPath,
    )
  })

  it('accepts null-prototype mappings at every Gift schema layer', () => {
    const item = Object.assign(Object.create(null), {
      id: 'poster',
      title: 'Poster',
    })
    const gift = Object.assign(Object.create(null), { items: [item] })
    const raw = Object.assign(Object.create(null), {
      type: 'gift',
      title: 'Gifts',
      gift,
    })

    expect(parseDirect(raw)).toEqual({
      type: 'gift',
      title: 'Gifts',
      gift: { items: [{ id: 'poster', title: 'Poster' }] },
    })
  })

  it.each([
    ['top-level', new (class BookRecord {})(), 'book.yml'],
    ['gift', new (class GiftRecord {})(), 'gift'],
    ['item', new (class ItemRecord {})(), 'gift.items[0]'],
  ])('rejects a non-plain %s mapping', (level, value, message) => {
    const raw =
      level === 'top-level'
        ? (value as Record<string, unknown>)
        : level === 'gift'
          ? { type: 'gift', title: 'Gifts', gift: value }
          : minimalRaw({ items: [value] })

    expectDiagnostic(
      () => parseDirect(raw),
      level === 'gift' ? 'INVALID_BOOK_BRANCH' : 'INVALID_BOOK',
      message,
      directPath,
    )
  })

  it.each([
    ['top-level', 'title'],
    ['gift', 'items'],
    ['item', 'title'],
  ])('rejects a %s accessor without executing it', (level, field) => {
    let getterCalled = false
    const accessed: Record<string, unknown> =
      level === 'top-level'
        ? { type: 'gift', gift: { items: [] } }
        : level === 'gift'
          ? {}
          : { id: 'poster' }
    Object.defineProperty(accessed, field, {
      enumerable: true,
      get() {
        getterCalled = true
        return level === 'gift' ? [] : 'polluted'
      },
    })

    const raw =
      level === 'top-level'
        ? accessed
        : level === 'gift'
          ? { type: 'gift', title: 'Gifts', gift: accessed }
          : minimalRaw({ items: [accessed] })

    expectDiagnostic(
      () => parseDirect(raw),
      'INVALID_BOOK',
      level === 'top-level'
        ? 'book.yml.title'
        : level === 'gift'
          ? 'gift.items'
          : 'gift.items[0].title',
      directPath,
    )
    expect(getterCalled).toBe(false)
  })

  it('does not obtain missing fields from Object.prototype', () => {
    const originals = new Map<string, PropertyDescriptor | undefined>()
    const pollution: Record<string, unknown> = {
      gift: { items: [] },
      items: [],
      id: 'polluted',
      title: 'Polluted',
      covers: ['./polluted.webp'],
      links: [],
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
        () => parseDirect({ type: 'gift', title: 'Gifts' }),
        'INVALID_BOOK_BRANCH',
        'gift book requires gift',
        directPath,
      )
      expectDiagnostic(
        () => parseDirect({ type: 'gift', title: 'Gifts', gift: {} }),
        'INVALID_BOOK',
        'gift.items',
        directPath,
      )
      expectDiagnostic(
        () => parseDirect(minimalRaw({ items: [{}] })),
        'INVALID_BOOK',
        'gift.items[0].id',
        directPath,
      )
      expect(parseDirect(minimalRaw())).toEqual({
        type: 'gift',
        title: 'Gifts',
        gift: { items: [] },
      })
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

  it('rejects non-enumerable and symbol unknown own fields at every level', () => {
    const raw = minimalRaw()
    Object.defineProperty(raw, 'hidden', { value: true })
    expectDiagnostic(
      () => parseDirect(raw),
      'UNKNOWN_FIELD',
      'hidden',
      directPath,
    )

    const gift = { items: [] }
    Object.defineProperty(gift, 'hidden', { value: true })
    expectDiagnostic(
      () => parseDirect(minimalRaw(gift)),
      'UNKNOWN_FIELD',
      'gift.hidden',
      directPath,
    )

    const symbol = Symbol('hidden')
    expectDiagnostic(
      () =>
        parseDirect(
          minimalRaw({
            items: [{ id: 'poster', title: 'Poster', [symbol]: true }],
          }),
        ),
      'UNKNOWN_FIELD',
      'gift.items[0].Symbol(hidden)',
      directPath,
    )
  })

  it('returns deep copies isolated from later input mutation', () => {
    const title = { zh: '周边', en: 'Gifts' }
    const credit: Record<string, string> = {
      producer: 'Synctrol',
      specialThanks: 'Fans',
    }
    const itemTitle = { zh: '海报', en: 'Poster' }
    const itemDesc = { zh: '限量', en: 'Limited' }
    const covers = ['./poster.webp']
    const label = { zh: '购买', en: 'Buy' }
    const link = {
      platform: 'taobao',
      label,
      url: 'https://item.taobao.com/poster',
    }
    const links = [link]
    const item = {
      id: 'poster',
      title: itemTitle,
      desc: itemDesc,
      covers,
      links,
    }
    const items = [item]
    const gift = { items }
    const raw = {
      type: 'gift',
      title,
      credit,
      gift,
    }

    const result = parseDirect(raw)
    title.zh = '已修改'
    credit.producer = 'Changed'
    credit.specialThanks = 'Changed'
    credit.webDesign = 'Added Later'
    item.id = 'mutated'
    itemTitle.zh = '已修改'
    itemDesc.zh = '已修改'
    covers.push('./back.webp')
    label.zh = '已修改'
    link.url = 'https://item.taobao.com/mutated'
    links.push({
      platform: 'taobao',
      label: { zh: '新增', en: 'Added' },
      url: 'https://item.taobao.com/added',
    })
    items.push({ id: 'pin', title: { zh: '徽章', en: 'Pin' }, desc: itemDesc, covers, links })

    expect(result).toEqual({
      type: 'gift',
      title: { zh: '周边', en: 'Gifts' },
      credit: { producer: 'Synctrol', specialThanks: 'Fans' },
      gift: {
        items: [
          {
            id: 'poster',
            title: { zh: '海报', en: 'Poster' },
            desc: { zh: '限量', en: 'Limited' },
            covers: ['./poster.webp'],
            links: [
              {
                platform: 'taobao',
                label: { zh: '购买', en: 'Buy' },
                url: 'https://item.taobao.com/poster',
              },
            ],
          },
        ],
      },
    })
  })

  it('keeps Album dispatch behavior working', () => {
    const path = writeBook(`
type: album
title: Album
album:
  covers: [./cover.webp]
`)

    expect(parseBook(path, defs, 'zh')).toEqual({
      type: 'album',
      title: 'Album',
      album: { covers: ['./cover.webp'] },
    })
  })
})
