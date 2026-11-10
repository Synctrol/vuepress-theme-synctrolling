import type { LocaleKey, Multilanguage } from '../shared/types.js'
import type {
  CompiledAlbumMetadata,
  CompiledDisc,
  CompiledTrack,
  CreditMap,
} from '../shared/release/types.js'
import { fail } from './diagnostics.js'
import { assertMultilanguage } from './multilanguage.js'

export type {
  CompiledAlbumMetadata,
  CompiledDisc,
  CompiledTrack,
  CreditMap,
} from '../shared/release/types.js'

type PlainRecord = Record<string, unknown>

const CREDIT_KEYS = [
  'catalogNumber',
  'illustrator',
  'designer',
  'mastering',
  'mix',
  'webDesign',
  'producer',
  'specialThanks',
] as const

const ALBUM_FIELDS = [
  'title',
  'copyright',
  'credit',
  'covers',
  'discs',
] as const
const DISC_FIELDS = ['title', 'desc', 'tracks'] as const
const TRACK_FIELDS = [
  'title',
  'artists',
  'duration',
  'desc',
  'copyright',
] as const

function invalid(message: string, path: string): never {
  fail({
    severity: 'error',
    code: 'INVALID_ALBUM_METADATA',
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
    invalid(`${fieldPath} could not be inspected safely`, path)
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
): PlainRecord {
  if (!isPlainMapping(value, path, fieldPath)) {
    invalid(`${fieldPath} must be a plain mapping`, path)
  }

  const copy = Object.create(null) as PlainRecord
  const keys = inspectSafely(() => Reflect.ownKeys(value), path, fieldPath)
  for (const key of keys) {
    const keyPath =
      typeof key === 'string' ? `${fieldPath}.${key}` : fieldPath
    const descriptor = inspectSafely(
      () => Object.getOwnPropertyDescriptor(value, key),
      path,
      keyPath,
    )
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      invalid(`${keyPath} must be an own data property`, path)
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
      fieldPath.length === 0
        ? String(key)
        : `${fieldPath}.${String(key)}`
    fail({
      severity: 'error',
      code: 'UNKNOWN_FIELD',
      message: `Unknown field "${unknownPath}"`,
      path,
    })
  }
}

function readArray(
  value: unknown,
  path: string,
  fieldPath: string,
): unknown[] {
  if (!inspectSafely(() => Array.isArray(value), path, fieldPath)) {
    invalid(`${fieldPath} must be an array`, path)
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
      invalid(`${itemPath} must be an own data property`, path)
    }
    result.push(descriptor.value)
  }
  return result
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

function parseOptionalString(
  value: unknown,
  path: string,
  fieldPath: string,
): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    invalid(`${fieldPath} must be a string`, path)
  }
  return value
}

function parseCredit(
  value: unknown,
  path: string,
): CreditMap | undefined {
  if (value === undefined) return undefined
  const raw = copyOwnDataFields(value, path, 'credit')
  rejectUnknownFields(raw, CREDIT_KEYS, path, 'credit')

  const credit: CreditMap = {}
  for (const key of CREDIT_KEYS) {
    if (!Object.hasOwn(raw, key)) continue
    const entry = raw[key]
    if (typeof entry === 'string') {
      credit[key] = entry
      continue
    }
    if (!Array.isArray(entry)) {
      invalid(
        `credit.${key} must be a string or a non-empty array of strings`,
        path,
      )
    }
    const entries = readArray(entry, path, `credit.${key}`)
    if (
      entries.length === 0 ||
      entries.some((item) => typeof item !== 'string')
    ) {
      invalid(
        `credit.${key} must be a string or a non-empty array of strings`,
        path,
      )
    }
    credit[key] = entries as string[]
  }
  return credit
}

function parseCovers(value: unknown, path: string): string[] {
  if (value === undefined) return []
  return readArray(value, path, 'covers').map((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      invalid(
        `covers[${index}] must be a non-empty asset path string`,
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
  const artists = readArray(value, path, fieldPath).map((entry, index) => {
    if (typeof entry !== 'string') {
      invalid(`${fieldPath}[${index}] must be a string`, path)
    }
    return entry
  })
  if (artists.length === 0) {
    invalid(`${fieldPath} must be a non-empty string array`, path)
  }
  return artists
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
): CompiledTrack {
  const raw = copyOwnDataFields(value, path, fieldPath)
  rejectUnknownFields(raw, TRACK_FIELDS, path, fieldPath)
  const desc = parseOptionalMultilanguage(
    raw.desc,
    mainLocale,
    path,
    `${fieldPath}.desc`,
  )
  const copyright = parseOptionalString(
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
    artists: parseArtists(raw.artists, path, `${fieldPath}.artists`),
    duration: parseDuration(raw.duration, path, `${fieldPath}.duration`),
    ...(desc === undefined ? {} : { desc }),
    ...(copyright === undefined ? {} : { copyright }),
  }
}

function parseDisc(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
  fieldPath: string,
): CompiledDisc {
  const raw = copyOwnDataFields(value, path, fieldPath)
  rejectUnknownFields(raw, DISC_FIELDS, path, fieldPath)
  const desc = parseOptionalMultilanguage(
    raw.desc,
    mainLocale,
    path,
    `${fieldPath}.desc`,
  )
  const tracks = readArray(raw.tracks, path, `${fieldPath}.tracks`).map(
    (track, index) => parseTrack(
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

function parseDiscs(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
): CompiledDisc[] {
  if (value === undefined) return []
  return readArray(value, path, 'discs').map((disc, index) =>
    parseDisc(disc, mainLocale, path, `discs[${index}]`),
  )
}

export function parseAlbumMetadata(
  rawValue: unknown,
  absolutePath: string,
  mainLocale: LocaleKey,
): CompiledAlbumMetadata {
  const raw = copyOwnDataFields(rawValue, absolutePath, 'album.yml')
  rejectUnknownFields(raw, ALBUM_FIELDS, absolutePath, '')
  const copyright = parseOptionalString(
    raw.copyright,
    absolutePath,
    'copyright',
  )
  const credit = parseCredit(raw.credit, absolutePath)

  return {
    title: assertMultilanguage(
      raw.title,
      mainLocale,
      absolutePath,
      'title',
    ),
    ...(copyright === undefined ? {} : { copyright }),
    ...(credit === undefined ? {} : { credit }),
    covers: parseCovers(raw.covers, absolutePath),
    discs: parseDiscs(raw.discs, mainLocale, absolutePath),
  }
}
