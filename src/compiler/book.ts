import type {
  AlbumBook,
  Book,
  BookCredit,
  BookCreditKey,
  ContentDefinitions,
  Disc,
  GiftBook,
  GiftItem,
  LocaleKey,
  Multilanguage,
  NormalizedPlatformEntry,
  PlatformCategory,
  Track,
} from '../shared/types.js'
import { BOOK_CREDIT_KEYS } from '../shared/types.js'
import type { PlatformTypeRegistration } from '../shared/options.js'
import { resolvePlatformTypes } from '../platforms/registry.js'
import { fail, isDiagnosticError } from './diagnostics.js'
import { assertMultilanguage } from './multilanguage.js'
import { validatePlatformEntry } from './platform-entry.js'
import { loadYamlFile } from './yaml.js'

type PlainRecord = Record<string, unknown>

const ALBUM_BOOK_FIELDS = ['type', 'title', 'copyright', 'credit', 'album'] as const
const GIFT_BOOK_FIELDS = ['type', 'title', 'copyright', 'credit', 'gift'] as const
const ALBUM_FIELDS = ['covers', 'links', 'discs'] as const
const GIFT_FIELDS = ['items'] as const
const GIFT_ITEM_FIELDS = [
  'id',
  'title',
  'desc',
  'covers',
  'links',
  'copyright',
] as const
const DISC_FIELDS = ['title', 'desc', 'tracks'] as const
const TRACK_FIELDS = [
  'title',
  'artists',
  'duration',
  'desc',
  'copyright',
] as const

function invalid(code: string, message: string, path: string): never {
  fail({
    severity: 'error',
    code,
    message,
    path,
  })
}

function inspectSafely<T>(
  operation: () => T,
  path: string,
  fieldPath: string,
): T {
  try {
    return operation()
  } catch {
    invalid(
      'INVALID_BOOK',
      `${fieldPath} could not be inspected safely`,
      path,
    )
  }
}

function isPlainMapping(
  value: unknown,
  path: string,
  fieldPath: string,
): value is PlainRecord {
  return inspectSafely(() => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false
    }
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  }, path, fieldPath)
}

function copyOwnDataFields(
  value: unknown,
  path: string,
  fieldPath: string,
  invalidMappingCode = 'INVALID_BOOK',
): PlainRecord {
  if (!isPlainMapping(value, path, fieldPath)) {
    invalid(
      invalidMappingCode,
      `${fieldPath} must be a plain mapping`,
      path,
    )
  }

  const copy = Object.create(null) as PlainRecord
  const keys = inspectSafely(() => Reflect.ownKeys(value), path, fieldPath)
  for (const key of keys) {
    const descriptor = inspectSafely(
      () => Object.getOwnPropertyDescriptor(value, key),
      path,
      typeof key === 'string' ? `${fieldPath}.${key}` : fieldPath,
    )
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      invalid(
        'INVALID_BOOK',
        `${fieldPath}.${String(key)} must be an own data property`,
        path,
      )
    }
    Object.defineProperty(copy, key, {
      configurable: true,
      enumerable: true,
      value: descriptor.value,
      writable: true,
    })
  }
  return copy
}

function rejectUnknownFields(
  value: PlainRecord,
  allowed: readonly string[],
  path: string,
  fieldPath: string,
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'string' && allowed.includes(key)) continue
    const unknownPath =
      typeof key === 'string'
        ? fieldPath.length === 0
          ? key
          : `${fieldPath}.${key}`
        : fieldPath.length === 0
          ? String(key)
          : `${fieldPath}.${String(key)}`
    invalid('UNKNOWN_FIELD', `Unknown field "${unknownPath}"`, path)
  }
}

function readArray(value: unknown, path: string, fieldPath: string): unknown[] {
  const isArray = inspectSafely(() => Array.isArray(value), path, fieldPath)
  if (!isArray) {
    invalid('INVALID_BOOK', `${fieldPath} must be an array`, path)
  }

  const array = value as unknown[]
  const result: unknown[] = []
  for (let index = 0; index < array.length; index += 1) {
    const itemPath = `${fieldPath}[${index}]`
    const descriptor = inspectSafely(
      () => Object.getOwnPropertyDescriptor(array, String(index)),
      path,
      itemPath,
    )
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      invalid(
        'INVALID_BOOK',
        `${itemPath} must be an own data property`,
        path,
      )
    }
    result.push(descriptor.value)
  }
  return result
}

function parseStringArray(
  value: unknown,
  path: string,
  fieldPath: string,
): string[] {
  return readArray(value, path, fieldPath).map((entry, index) => {
    if (typeof entry !== 'string') {
      invalid(
        'INVALID_BOOK',
        `${fieldPath}[${index}] must be a string`,
        path,
      )
    }
    return entry
  })
}

function parseArtists(
  value: unknown,
  path: string,
  fieldPath: string,
): string[] {
  const artists = parseStringArray(value, path, fieldPath)
  if (artists.length === 0) {
    invalid(
      'INVALID_BOOK',
      `${fieldPath} must be a non-empty string array`,
      path,
    )
  }
  return artists
}

function parseCovers(
  value: unknown,
  path: string,
  fieldPath: string,
): string[] | undefined {
  if (value === undefined) return undefined
  return readArray(value, path, fieldPath).map((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      invalid(
        'INVALID_BOOK',
        `${fieldPath}[${index}] must be a non-empty asset path string`,
        path,
      )
    }
    return entry
  })
}

function parseOptionalMultilanguage(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
  fieldPath: string,
): Multilanguage | undefined {
  return value === undefined
    ? undefined
    : assertMultilanguage(value, mainLocale, path, fieldPath)
}

function parseOptionalCopyright(
  value: unknown,
  path: string,
  fieldPath: string,
): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    invalid('INVALID_BOOK', `${fieldPath} must be a string`, path)
  }
  return value
}

function parseCredit(
  value: unknown,
  path: string,
): BookCredit | undefined {
  if (value === undefined) return undefined
  const raw = copyOwnDataFields(value, path, 'credit')
  rejectUnknownFields(raw, BOOK_CREDIT_KEYS, path, 'credit')
  const credit: BookCredit = {}
  for (const key of Reflect.ownKeys(raw)) {
    if (typeof key !== 'string') continue
    const entry = raw[key]
    const validArray =
      Array.isArray(entry) &&
      entry.length > 0 &&
      entry.every((item) => typeof item === 'string')
    if (typeof entry !== 'string' && !validArray) {
      invalid(
        'INVALID_BOOK',
        `credit.${key} must be a string or an array of strings`,
        path,
      )
    }
    credit[key as BookCreditKey] = entry
  }
  return credit
}

function parseDuration(
  value: unknown,
  path: string,
  fieldPath: string,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    invalid(
      'INVALID_BOOK',
      `${fieldPath} must be a non-negative integer number of seconds`,
      path,
    )
  }
  return value
}

function parseTrack(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
  fieldPath: string,
): Track {
  const raw = copyOwnDataFields(value, path, fieldPath)
  rejectUnknownFields(raw, TRACK_FIELDS, path, fieldPath)

  const desc = parseOptionalMultilanguage(
    raw.desc,
    mainLocale,
    path,
    `${fieldPath}.desc`,
  )
  const copyright = parseOptionalCopyright(
    raw.copyright,
    path,
    `${fieldPath}.copyright`,
  )
  return {
    title: assertMultilanguage(
      raw.title,
      mainLocale,
      path,
      `${fieldPath}.title`,
    ),
    artists: parseArtists(
      raw.artists,
      path,
      `${fieldPath}.artists`,
    ),
    duration: parseDuration(
      raw.duration,
      path,
      `${fieldPath}.duration`,
    ),
    ...(desc === undefined ? {} : { desc }),
    ...(copyright === undefined ? {} : { copyright }),
  }
}

function parseDisc(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
  fieldPath: string,
): Disc {
  const raw = copyOwnDataFields(value, path, fieldPath)
  rejectUnknownFields(raw, DISC_FIELDS, path, fieldPath)

  const desc = parseOptionalMultilanguage(
    raw.desc,
    mainLocale,
    path,
    `${fieldPath}.desc`,
  )
  const tracks = readArray(
    raw.tracks,
    path,
    `${fieldPath}.tracks`,
  ).map((track, index) =>
    parseTrack(
      track,
      mainLocale,
      path,
      `${fieldPath}.tracks[${index}]`,
    ),
  )

  return {
    title: assertMultilanguage(
      raw.title,
      mainLocale,
      path,
      `${fieldPath}.title`,
    ),
    ...(desc === undefined ? {} : { desc }),
    tracks,
  }
}

function validateBookLink(
  entry: unknown,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
  fieldPath: string,
  requiredCategory: PlatformCategory,
  platformTypes?: Record<string, PlatformTypeRegistration>,
): NormalizedPlatformEntry {
  try {
    return validatePlatformEntry(
      entry,
      defs,
      mainLocale,
      path,
      requiredCategory,
      platformTypes ?? resolvePlatformTypes({}),
    )
  } catch (error) {
    if (isDiagnosticError(error) && error.diagnostics[0] !== undefined) {
      const diagnostic = error.diagnostics[0]
      fail({
        ...diagnostic,
        message: diagnostic.message.startsWith('label ')
          ? `${fieldPath}.${diagnostic.message}`
          : `${fieldPath}: ${diagnostic.message}`,
        path,
      })
    }
    invalid(
      'INVALID_BOOK',
      `${fieldPath} could not be validated safely`,
      path,
    )
  }
}

function parseLinks(
  value: unknown,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
  fieldPath: string,
  requiredCategory: PlatformCategory,
  platformTypes?: Record<string, PlatformTypeRegistration>,
): NormalizedPlatformEntry[] | undefined {
  if (value === undefined) return undefined
  return readArray(value, path, fieldPath).map((entry, index) =>
    validateBookLink(
      entry,
      defs,
      mainLocale,
      path,
      `${fieldPath}[${index}]`,
      requiredCategory,
      platformTypes,
    ),
  )
}

function parseDiscs(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
  fieldPath: string,
): Disc[] | undefined {
  if (value === undefined) return undefined
  return readArray(value, path, fieldPath).map((disc, index) =>
    parseDisc(disc, mainLocale, path, `${fieldPath}[${index}]`),
  )
}

export function parseAlbumBook(
  rawValue: Record<string, unknown>,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
  platformTypes?: Record<string, PlatformTypeRegistration>,
): AlbumBook {
  const raw = copyOwnDataFields(rawValue, path, 'book.yml')
  if (raw.type !== 'album') {
    invalid(
      'INVALID_BOOK_BRANCH',
      'type must be "album" for an album book',
      path,
    )
  }
  if (Object.hasOwn(raw, 'gift')) {
    invalid(
      'INVALID_BOOK_BRANCH',
      'album book forbids gift branch',
      path,
    )
  }
  if (!Object.hasOwn(raw, 'album')) {
    invalid(
      'INVALID_BOOK_BRANCH',
      'album book requires album branch',
      path,
    )
  }

  const album = copyOwnDataFields(
    raw.album,
    path,
    'album',
    'INVALID_BOOK_BRANCH',
  )
  rejectUnknownFields(raw, ALBUM_BOOK_FIELDS, path, '')
  rejectUnknownFields(album, ALBUM_FIELDS, path, 'album')

  const copyright = parseOptionalCopyright(
    raw.copyright,
    path,
    'copyright',
  )
  const credit = parseCredit(raw.credit, path)
  const covers = parseCovers(album.covers, path, 'album.covers')
  const links = parseLinks(
    album.links,
    defs,
    mainLocale,
    path,
    'album.links',
    'digital',
    platformTypes,
  )
  const discs = parseDiscs(
    album.discs,
    mainLocale,
    path,
    'album.discs',
  )

  return {
    type: 'album',
    title: assertMultilanguage(raw.title, mainLocale, path, 'title'),
    ...(copyright === undefined ? {} : { copyright }),
    ...(credit === undefined ? {} : { credit }),
    album: {
      ...(covers === undefined ? {} : { covers }),
      ...(links === undefined ? {} : { links }),
      ...(discs === undefined ? {} : { discs }),
    },
  }
}

function parseGiftItem(
  value: unknown,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
  fieldPath: string,
  platformTypes?: Record<string, PlatformTypeRegistration>,
): GiftItem {
  const raw = copyOwnDataFields(value, path, fieldPath)
  rejectUnknownFields(raw, GIFT_ITEM_FIELDS, path, fieldPath)

  if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
    invalid(
      'INVALID_BOOK',
      `${fieldPath}.id must be a non-empty string`,
      path,
    )
  }

  const desc = parseOptionalMultilanguage(
    raw.desc,
    mainLocale,
    path,
    `${fieldPath}.desc`,
  )
  const covers = parseCovers(raw.covers, path, `${fieldPath}.covers`)
  const links = parseLinks(
    raw.links,
    defs,
    mainLocale,
    path,
    `${fieldPath}.links`,
    'physical',
    platformTypes,
  )
  const copyright = parseOptionalCopyright(
    raw.copyright,
    path,
    `${fieldPath}.copyright`,
  )

  return {
    id: raw.id,
    title: assertMultilanguage(
      raw.title,
      mainLocale,
      path,
      `${fieldPath}.title`,
    ),
    ...(desc === undefined ? {} : { desc }),
    ...(covers === undefined ? {} : { covers }),
    ...(links === undefined ? {} : { links }),
    ...(copyright === undefined ? {} : { copyright }),
  }
}

export function parseGiftBook(
  rawValue: Record<string, unknown>,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
  platformTypes?: Record<string, PlatformTypeRegistration>,
): GiftBook {
  const raw = copyOwnDataFields(rawValue, path, 'book.yml')
  if (raw.type !== 'gift') {
    invalid(
      'INVALID_BOOK_BRANCH',
      'type must be "gift" for a gift book',
      path,
    )
  }
  if (Object.hasOwn(raw, 'album')) {
    invalid(
      'INVALID_BOOK_BRANCH',
      'gift book forbids album branch',
      path,
    )
  }
  if (!Object.hasOwn(raw, 'gift')) {
    invalid(
      'INVALID_BOOK_BRANCH',
      'gift book requires gift branch',
      path,
    )
  }

  const gift = copyOwnDataFields(
    raw.gift,
    path,
    'gift',
    'INVALID_BOOK_BRANCH',
  )
  rejectUnknownFields(raw, GIFT_BOOK_FIELDS, path, '')
  rejectUnknownFields(gift, GIFT_FIELDS, path, 'gift')

  const seenItemIds = new Set<string>()
  const items = readArray(gift.items, path, 'gift.items').map(
    (item, index) => {
      const fieldPath = `gift.items[${index}]`
      const parsed = parseGiftItem(
        item,
        defs,
        mainLocale,
        path,
        fieldPath,
        platformTypes,
      )
      if (seenItemIds.has(parsed.id)) {
        invalid(
          'DUPLICATE_GIFT_ITEM_ID',
          `Duplicate gift item id "${parsed.id}" at ${fieldPath}.id`,
          path,
        )
      }
      seenItemIds.add(parsed.id)
      return parsed
    },
  )

  const copyright = parseOptionalCopyright(
    raw.copyright,
    path,
    'copyright',
  )
  const credit = parseCredit(raw.credit, path)

  return {
    type: 'gift',
    title: assertMultilanguage(raw.title, mainLocale, path, 'title'),
    ...(copyright === undefined ? {} : { copyright }),
    ...(credit === undefined ? {} : { credit }),
    gift: { items },
  }
}

export function parseBook(
  bookYmlPath: string,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  platformTypes?: Record<string, PlatformTypeRegistration>,
): Book {
  const rawValue = loadYamlFile(bookYmlPath)
  const raw = copyOwnDataFields(rawValue, bookYmlPath, 'book.yml')
  if (raw.type === 'album') {
    return parseAlbumBook(raw, defs, mainLocale, bookYmlPath, platformTypes)
  }
  if (raw.type === 'gift') {
    return parseGiftBook(raw, defs, mainLocale, bookYmlPath, platformTypes)
  }

  invalid(
    'INVALID_BOOK_BRANCH',
    `Invalid Book type "${String(raw.type)}"`,
    bookYmlPath,
  )
}
