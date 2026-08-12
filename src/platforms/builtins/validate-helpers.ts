import type { LocaleKey, Multilanguage } from '../../shared/types.js'
import { fail } from '../../compiler/diagnostics.js'
import { assertMultilanguage } from '../../compiler/multilanguage.js'

export type PlainRecord = Record<string, unknown>

export const VALIDATE_PATH = 'platforms.validate'

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/

export function invalid(
  code: string,
  message: string,
  path: string = VALIDATE_PATH,
): never {
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
  subject = 'platform entry',
): T {
  try {
    return operation()
  } catch {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      `${subject} could not be inspected safely`,
      path,
    )
  }
}

function isPlainMapping(value: unknown, path: string): value is PlainRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = inspectSafely(() => Object.getPrototypeOf(value), path)
  return prototype === Object.prototype || prototype === null
}

/** Copy own data fields from a plain mapping (HEAD-equivalent hardening). */
export function copyOwnDataFields(
  value: unknown,
  path: string = VALIDATE_PATH,
): PlainRecord {
  if (!isPlainMapping(value, path)) {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      'platform entry must be a plain mapping',
      path,
    )
  }

  const copy = Object.create(null) as PlainRecord
  const keys = inspectSafely(() => Reflect.ownKeys(value), path)

  for (const key of keys) {
    if (typeof key !== 'string') {
      invalid(
        'UNKNOWN_FIELD',
        `Unknown platform entry field "${String(key)}"`,
        path,
      )
    }

    const descriptor = inspectSafely(
      () => Object.getOwnPropertyDescriptor(value, key),
      path,
    )
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      invalid(
        'INVALID_PLATFORM_ENTRY',
        'platform entry fields must be own data properties',
        path,
      )
    }

    copy[key] = descriptor.value
  }

  return copy
}

export function asEntryMap(
  raw: unknown,
  path: string = VALIDATE_PATH,
): PlainRecord {
  return copyOwnDataFields(raw, path)
}

export function rejectUnknown(
  entry: PlainRecord,
  allowed: readonly string[],
  path: string = VALIDATE_PATH,
): void {
  for (const key of Object.getOwnPropertyNames(entry)) {
    if (!allowed.includes(key)) {
      invalid(
        'UNKNOWN_FIELD',
        `Unknown platform entry field "${key}"`,
        path,
      )
    }
  }
}

export function requirePlatformKey(
  entry: PlainRecord,
  path: string = VALIDATE_PATH,
): string {
  if (typeof entry.platform !== 'string' || entry.platform.length === 0) {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      'platform must be a non-empty string',
      path,
    )
  }
  return entry.platform
}

/**
 * Optional entry `label` handling matching `validatePlatformEntry`:
 * - absent → undefined
 * - with `mainLocale` → assertMultilanguage (main locale required; locale maps cloned)
 * - without `mainLocale` (pre-validated upstream) → still clone maps for isolation
 */
export function optionalLabel(
  entry: PlainRecord,
  mainLocale?: LocaleKey,
  path: string = VALIDATE_PATH,
): Multilanguage | undefined {
  if (!Object.hasOwn(entry, 'label')) {
    return undefined
  }

  if (mainLocale !== undefined) {
    return assertMultilanguage(entry.label, mainLocale, path, 'label')
  }

  const value = entry.label
  if (typeof value === 'string') {
    return value
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, string>),
    ) as Multilanguage
  }

  return value as Multilanguage
}

export interface ValidatedHttpsUrl {
  parsed: URL
  value: string
}

function hasUserinfoSyntax(value: string): boolean {
  const remainder = value.slice('https://'.length)
  const authorityEnd = remainder.search(/[/?#]/)
  const authority =
    authorityEnd === -1 ? remainder : remainder.slice(0, authorityEnd)
  return authority.includes('@')
}

export function parseHttpsUrl(
  value: unknown,
  field: string,
  path: string = VALIDATE_PATH,
): ValidatedHttpsUrl {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.trim() !== value ||
    CONTROL_CHARACTERS.test(value) ||
    !/^https:\/\//i.test(value)
  ) {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      `${field} must be an absolute HTTPS URL`,
      path,
    )
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      `${field} must be an absolute HTTPS URL`,
      path,
    )
  }

  if (parsed.protocol !== 'https:' || parsed.hostname.length === 0) {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      `${field} must be an absolute HTTPS URL`,
      path,
    )
  }

  if (
    hasUserinfoSyntax(value) ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      `${field} must not contain credentials`,
      path,
    )
  }

  return { parsed, value }
}

export function assertHttpsUrl(
  value: unknown,
  field: string,
  path: string = VALIDATE_PATH,
): string {
  return parseHttpsUrl(value, field, path).value
}

function invalidAudioSource(path: string): never {
  invalid(
    'INVALID_PLATFORM_ENTRY',
    'audio_player.src must be a package-relative asset or absolute HTTPS URL',
    path,
  )
}

function decodePathSegment(segment: string, path: string): string {
  let decoded = segment

  for (let index = 0; index <= segment.length; index += 1) {
    let next: string
    try {
      next = decodeURIComponent(decoded)
    } catch {
      invalidAudioSource(path)
    }

    if (next === decoded) {
      return decoded
    }
    decoded = next
  }

  return decoded
}

export function assertPackageRelativeAsset(
  value: string,
  path: string = VALIDATE_PATH,
): string {
  if (
    value.length <= 2 ||
    value.trim() !== value ||
    CONTROL_CHARACTERS.test(value) ||
    !value.startsWith('./') ||
    value.includes('\\') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    invalidAudioSource(path)
  }

  const relative = value.slice(2)
  if (relative.startsWith('/') || relative.endsWith('/')) {
    invalidAudioSource(path)
  }

  for (const segment of relative.split('/')) {
    if (segment.length === 0) {
      invalidAudioSource(path)
    }

    const decoded = decodePathSegment(segment, path)
    if (
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      decoded.includes('?') ||
      decoded.includes('#') ||
      CONTROL_CHARACTERS.test(decoded)
    ) {
      invalidAudioSource(path)
    }
  }

  return value
}

export function assertAudioSource(
  value: unknown,
  path: string = VALIDATE_PATH,
): string {
  if (typeof value !== 'string') {
    invalidAudioSource(path)
  }

  if (/^https:/i.test(value)) {
    return assertHttpsUrl(value, 'audio_player.src', path)
  }

  return assertPackageRelativeAsset(value, path)
}

export function assertAudioMime(
  value: unknown,
  path: string = VALIDATE_PATH,
): string {
  if (typeof value !== 'string' || !value.startsWith('audio/')) {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      'audio_player.mime must be a string starting with audio/',
      path,
    )
  }
  return value
}

export function assertAutoplay(
  value: unknown,
  path: string = VALIDATE_PATH,
): boolean {
  const autoplay = value === undefined ? false : value
  if (typeof autoplay !== 'boolean') {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      'autoplay must be boolean',
      path,
    )
  }
  return autoplay
}

export function optionalInteger(
  value: unknown,
  minimum: number,
  message: string,
  path: string = VALIDATE_PATH,
): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) {
    invalid('INVALID_PLATFORM_ENTRY', message, path)
  }
  return value
}

export function createBase(
  platform: string,
  label: Multilanguage | undefined,
): { platform: string; label?: Multilanguage } {
  return label === undefined ? { platform } : { platform, label }
}
