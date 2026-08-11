import { basename } from 'node:path'
import { assertRouteSegment } from '../shared/options-validation.js'
import { CONTENT_TYPES } from '../shared/types.js'
import type {
  ContentManifest,
  ContentType,
  LocalePath,
  NewsManifest,
  PageManifest,
  ReleaseManifest,
} from '../shared/types.js'
import { fail } from './diagnostics.js'
import { loadYamlFile } from './yaml.js'

type PlainObject = Record<string, unknown>

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const ALLOWED_FIELDS: Record<ContentType, readonly string[]> = {
  home: ['type', 'draft'],
  release: ['type', 'slug', 'date', 'draft', 'cover', 'artwork', 'path'],
  news: [
    'type',
    'slug',
    'date',
    'updated',
    'draft',
    'tags',
    'cover',
    'path',
  ],
  page: ['type', 'slug', 'draft', 'cover', 'path'],
}

function invalid(code: string, message: string, path: string): never {
  fail({
    severity: 'error',
    code,
    message,
    path,
  })
}

function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function copyOwnDataFields(value: PlainObject, path: string): PlainObject {
  const copy = Object.create(null) as PlainObject

  for (const field of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field)
    if (descriptor === undefined || !('value' in descriptor)) {
      invalid(
        'INVALID_MANIFEST',
        'content.yml mapping fields must be enumerable data properties',
        path,
      )
    }

    Object.defineProperty(copy, field, {
      configurable: true,
      enumerable: true,
      value: descriptor.value,
      writable: true,
    })
  }

  return copy
}

function isContentType(value: unknown): value is ContentType {
  return (
    typeof value === 'string' &&
    (CONTENT_TYPES as readonly string[]).includes(value)
  )
}

function rejectUnknownFields(
  raw: PlainObject,
  type: ContentType,
  path: string,
): void {
  const allowed = ALLOWED_FIELDS[type]

  for (const field of Object.keys(raw)) {
    if (allowed.includes(field)) continue

    if (field === 'background') {
      invalid(
        'ILLEGAL_BACKGROUND',
        'background is not a legal content.yml field',
        path,
      )
    }

    if (field === 'links') {
      invalid(
        'ILLEGAL_LINKS',
        'top-level links is not a legal content.yml field',
        path,
      )
    }

    invalid(
      'UNKNOWN_FIELD',
      `Field "${field}" is not allowed for ${type} content`,
      path,
    )
  }
}

function parseDraft(value: unknown, path: string): boolean {
  if (value === undefined) return false
  if (typeof value !== 'boolean') {
    invalid('INVALID_DRAFT', 'draft must be a boolean', path)
  }
  return value
}

function parseSlug(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    invalid(
      'INVALID_SLUG',
      'slug must be a safe, non-empty route segment',
      path,
    )
  }

  try {
    assertRouteSegment(value, 'slug')
  } catch {
    invalid(
      'INVALID_SLUG',
      'slug must be a safe, non-empty route segment',
      path,
    )
  }

  return value
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function isGregorianDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1) return false

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  return day <= daysInMonth[month - 1]
}

function parseDate(value: unknown, field: string, path: string): string {
  if (typeof value !== 'string' || !isGregorianDate(value)) {
    invalid(
      'INVALID_DATE',
      `${field} must be a real Gregorian calendar date in YYYY-MM-DD form`,
      path,
    )
  }
  return value
}

function parseOptionalAsset(
  value: unknown,
  field: 'cover' | 'artwork',
  path: string,
): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    invalid(
      field === 'cover' ? 'INVALID_COVER' : 'INVALID_ARTWORK',
      `${field} must be a non-empty string`,
      path,
    )
  }
  return value
}

function invalidPath(message: string, path: string): never {
  invalid('INVALID_PATH', message, path)
}

function parseLocalePath(value: unknown, path: string): LocalePath {
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      invalidPath('path must be a non-empty string or locale map', path)
    }
    return value
  }

  if (!isPlainObject(value)) {
    invalidPath('path must be a non-empty string or locale map', path)
  }

  const entries: [string, string][] = []
  for (const [locale, localePath] of Object.entries(value)) {
    try {
      assertRouteSegment(locale, `path.${locale}`)
    } catch {
      invalidPath(`path contains an invalid locale key "${locale}"`, path)
    }

    if (
      typeof localePath !== 'string' ||
      localePath.trim().length === 0
    ) {
      invalidPath('path map values must be non-empty strings', path)
    }
    entries.push([locale, localePath])
  }

  return Object.fromEntries(entries)
}

function parseOptionalPath(
  value: unknown,
  path: string,
): LocalePath | undefined {
  return value === undefined ? undefined : parseLocalePath(value, path)
}

function parseTags(value: unknown, path: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (tag) => typeof tag !== 'string' || tag.trim().length === 0,
    )
  ) {
    invalid(
      'INVALID_TAGS',
      'tags must be an array of non-empty strings',
      path,
    )
  }
  return value.slice()
}

export function parseContentManifest(
  contentYmlPath: string,
  packageDir: string,
): ContentManifest {
  const rawValue = loadYamlFile(contentYmlPath)
  if (!isPlainObject(rawValue)) {
    invalid(
      'INVALID_MANIFEST',
      'content.yml must be a plain mapping',
      contentYmlPath,
    )
  }
  const raw = copyOwnDataFields(rawValue, contentYmlPath)

  if (!isContentType(raw.type)) {
    invalid(
      'UNKNOWN_CONTENT_TYPE',
      `type must be one of: ${CONTENT_TYPES.join(', ')}`,
      contentYmlPath,
    )
  }
  const type = raw.type

  rejectUnknownFields(raw, type, contentYmlPath)
  const draft = parseDraft(raw.draft, contentYmlPath)

  if (type === 'home') {
    return { type, draft }
  }

  const slug = parseSlug(
    raw.slug === undefined ? basename(packageDir) : raw.slug,
    contentYmlPath,
  )
  const path = parseOptionalPath(raw.path, contentYmlPath)

  if (type === 'release') {
    const manifest: ReleaseManifest = {
      type,
      slug,
      date: parseDate(raw.date, 'date', contentYmlPath),
      draft,
    }
    const cover = parseOptionalAsset(raw.cover, 'cover', contentYmlPath)
    const artwork = parseOptionalAsset(raw.artwork, 'artwork', contentYmlPath)
    if (cover !== undefined) manifest.cover = cover
    if (artwork !== undefined) manifest.artwork = artwork
    if (path !== undefined) manifest.path = path
    return manifest
  }

  if (type === 'news') {
    const date = parseDate(raw.date, 'date', contentYmlPath)
    const updated =
      raw.updated === undefined
        ? undefined
        : parseDate(raw.updated, 'updated', contentYmlPath)
    if (updated !== undefined && updated < date) {
      invalid(
        'INVALID_DATE_ORDER',
        'updated cannot precede date',
        contentYmlPath,
      )
    }

    const manifest: NewsManifest = {
      type,
      slug,
      date,
      draft,
      tags: parseTags(raw.tags, contentYmlPath),
    }
    const cover = parseOptionalAsset(raw.cover, 'cover', contentYmlPath)
    if (updated !== undefined) manifest.updated = updated
    if (cover !== undefined) manifest.cover = cover
    if (path !== undefined) manifest.path = path
    return manifest
  }

  const manifest: PageManifest = { type, slug, draft }
  const cover = parseOptionalAsset(raw.cover, 'cover', contentYmlPath)
  if (cover !== undefined) manifest.cover = cover
  if (path !== undefined) manifest.path = path
  return manifest
}
