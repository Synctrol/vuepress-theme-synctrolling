import type {
  ContentDefinitions,
  LocaleKey,
  NormalizedPlatformEntry,
  PlatformCategory,
} from '../shared/types.js'
import type { PlatformTypeRegistration } from '../shared/options.js'
import { resolvePlatformTypes } from '../platforms/registry.js'
import { fail, isDiagnosticError } from './diagnostics.js'
import { assertMultilanguage } from './multilanguage.js'

type PlainRecord = Record<string, unknown>

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

export function validatePlatformEntry(
  entry: unknown,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
  requiredCategory: PlatformCategory,
  types: Record<string, PlatformTypeRegistration> = resolvePlatformTypes({}),
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

  const registration = types[definition.type]
  if (!registration) {
    fail({
      severity: 'error',
      code: 'UNKNOWN_PLATFORM_TYPE',
      message: `Unknown platform type "${definition.type}"`,
      path,
    })
  }

  const label = validateLabel(raw, mainLocale, path)

  try {
    const normalized = registration.validate({
      ...raw,
      platform,
      ...(label !== undefined ? { label } : {}),
    })
    return normalized as NormalizedPlatformEntry
  } catch (error) {
    if (isDiagnosticError(error) && error.diagnostics[0] !== undefined) {
      const diagnostic = error.diagnostics[0]
      fail({
        ...diagnostic,
        path,
      })
    }
    fail({
      severity: 'error',
      code: 'INVALID_PLATFORM_ENTRY',
      message: error instanceof Error ? error.message : 'Invalid platform entry',
      path,
    })
  }
}
