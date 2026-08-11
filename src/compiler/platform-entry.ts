import type {
  BuiltInPlatformType,
  ContentDefinitions,
  LocaleKey,
  NormalizedPlatformEntry,
  PlatformCategory,
} from '../shared/types.js'
import { fail } from './diagnostics.js'
import { assertMultilanguage } from './multilanguage.js'

type PlainRecord = Record<string, unknown>

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/

const ALLOWED_FIELDS: Record<BuiltInPlatformType, readonly string[]> = {
  link: ['platform', 'label', 'url'],
  audio_player: ['platform', 'label', 'src', 'mime', 'autoplay'],
  youtube_player: ['platform', 'label', 'videoId', 'start', 'autoplay'],
  bilibili_player: ['platform', 'label', 'bvid', 'page', 'autoplay'],
  apple_music_player: ['platform', 'label', 'url'],
  spotify_player: ['platform', 'label', 'uri'],
  soundcloud_player: ['platform', 'label', 'url'],
  netease_player: ['platform', 'label', 'id', 'resourceType'],
}

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

  const prototype = inspectSafely(
    () => Object.getPrototypeOf(value),
    path,
  )
  return prototype === Object.prototype || prototype === null
}

function copyOwnDataFields(value: unknown, path: string): PlainRecord {
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

function isBuiltInPlatformType(value: string): value is BuiltInPlatformType {
  return Object.hasOwn(ALLOWED_FIELDS, value)
}

function rejectUnknownFields(
  entry: PlainRecord,
  allowed: readonly string[],
  path: string,
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

interface ValidatedHttpsUrl {
  parsed: URL
  value: string
}

function parseHttpsUrl(
  value: unknown,
  path: string,
  field: string,
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

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      `${field} must not contain credentials`,
      path,
    )
  }

  return { parsed, value }
}

function assertHttpsUrl(
  value: unknown,
  path: string,
  field: string,
): string {
  return parseHttpsUrl(value, path, field).value
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

function assertPackageRelativeAsset(value: string, path: string): string {
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

function assertAudioSource(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    invalidAudioSource(path)
  }

  if (/^https:/i.test(value)) {
    return assertHttpsUrl(value, path, 'audio_player.src')
  }

  return assertPackageRelativeAsset(value, path)
}

function assertAudioMime(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('audio/') ||
    value.length === 'audio/'.length ||
    value.trim() !== value ||
    /\s/.test(value) ||
    CONTROL_CHARACTERS.test(value)
  ) {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      'audio_player.mime must be a non-empty audio/... string',
      path,
    )
  }
  return value
}

function assertAutoplay(value: unknown, path: string): boolean {
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

function optionalInteger(
  value: unknown,
  minimum: number,
  path: string,
  message: string,
): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) {
    invalid('INVALID_PLATFORM_ENTRY', message, path)
  }
  return value
}

function validateLabel(
  entry: PlainRecord,
  mainLocale: LocaleKey,
  path: string,
) {
  if (!Object.hasOwn(entry, 'label')) {
    return undefined
  }
  return assertMultilanguage(entry.label, mainLocale, path, 'label')
}

function createBase(
  platform: string,
  label: ReturnType<typeof validateLabel>,
): NormalizedPlatformEntry {
  return label === undefined ? { platform } : { platform, label }
}

export function validatePlatformEntry(
  entry: unknown,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
  requiredCategory: PlatformCategory,
): NormalizedPlatformEntry {
  const raw = copyOwnDataFields(entry, path)
  const platform = raw.platform
  if (typeof platform !== 'string' || platform.length === 0) {
    invalid(
      'INVALID_PLATFORM_ENTRY',
      'platform must be a non-empty string',
      path,
    )
  }

  const declared = inspectSafely(
    () => Object.hasOwn(defs.platforms, platform),
    path,
    'platform definitions',
  )
  if (!declared) {
    invalid(
      'UNKNOWN_PLATFORM',
      `Referencing undeclared platform "${platform}"`,
      path,
    )
  }

  const definition = inspectSafely(
    () => defs.platforms[platform],
    path,
    'platform definition',
  )
  if (definition.category !== requiredCategory) {
    invalid(
      'PLATFORM_CATEGORY_MISMATCH',
      `platform "${platform}" is ${definition.category} but ${requiredCategory} is required`,
      path,
    )
  }

  if (!isBuiltInPlatformType(definition.type)) {
    invalid(
      'UNKNOWN_PLATFORM_TYPE',
      `Unknown platform type "${definition.type}"`,
      path,
    )
  }

  rejectUnknownFields(raw, ALLOWED_FIELDS[definition.type], path)
  const base = createBase(platform, validateLabel(raw, mainLocale, path))

  switch (definition.type) {
    case 'link':
      return {
        ...base,
        url: assertHttpsUrl(raw.url, path, 'link.url'),
      }

    case 'audio_player': {
      const src = assertAudioSource(raw.src, path)
      const mime =
        raw.mime === undefined ? undefined : assertAudioMime(raw.mime, path)
      return {
        ...base,
        src,
        ...(mime === undefined ? {} : { mime }),
        autoplay: assertAutoplay(raw.autoplay, path),
      }
    }

    case 'youtube_player': {
      if (
        typeof raw.videoId !== 'string' ||
        !/^[A-Za-z0-9_-]{11}$/.test(raw.videoId)
      ) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'youtube_player.videoId must be exactly 11 [A-Za-z0-9_-] characters',
          path,
        )
      }
      const start = optionalInteger(
        raw.start,
        0,
        path,
        'youtube_player.start must be a non-negative integer',
      )
      return {
        ...base,
        videoId: raw.videoId,
        ...(start === undefined ? {} : { start }),
        autoplay: assertAutoplay(raw.autoplay, path),
      }
    }

    case 'bilibili_player': {
      if (
        typeof raw.bvid !== 'string' ||
        !/^BV[A-Za-z0-9]{10}$/.test(raw.bvid)
      ) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'bilibili_player.bvid must be BV followed by ten ASCII letters or digits',
          path,
        )
      }
      const page = optionalInteger(
        raw.page,
        1,
        path,
        'bilibili_player.page must be an integer >= 1',
      )
      return {
        ...base,
        bvid: raw.bvid,
        ...(page === undefined ? {} : { page }),
        autoplay: assertAutoplay(raw.autoplay, path),
      }
    }

    case 'apple_music_player': {
      const { parsed, value } = parseHttpsUrl(
        raw.url,
        path,
        'apple_music_player.url',
      )
      if (parsed.hostname !== 'music.apple.com') {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'apple_music_player.url must be HTTPS on music.apple.com',
          path,
        )
      }
      return { ...base, url: value }
    }

    case 'spotify_player':
      if (
        typeof raw.uri !== 'string' ||
        !/^spotify:(album|track|playlist):[^:\s]+$/.test(raw.uri)
      ) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'spotify_player.uri must be spotify:album|track|playlist:<non-empty resource ID>',
          path,
        )
      }
      return { ...base, uri: raw.uri }

    case 'soundcloud_player': {
      const { parsed, value } = parseHttpsUrl(
        raw.url,
        path,
        'soundcloud_player.url',
      )
      if (parsed.hostname !== 'soundcloud.com') {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'soundcloud_player.url must be HTTPS on soundcloud.com',
          path,
        )
      }
      return { ...base, url: value }
    }

    case 'netease_player':
      if (typeof raw.id !== 'string' || !/^\d+$/.test(raw.id)) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'netease_player.id must be a non-empty decimal digit string',
          path,
        )
      }
      if (
        raw.resourceType !== 'song' &&
        raw.resourceType !== 'album' &&
        raw.resourceType !== 'playlist'
      ) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'netease_player.resourceType must be song|album|playlist',
          path,
        )
      }
      return {
        ...base,
        id: raw.id,
        resourceType: raw.resourceType,
      }
  }
}
