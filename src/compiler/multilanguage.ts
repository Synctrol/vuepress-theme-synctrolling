import { assertRouteSegment } from '../shared/options-validation.js'
import type { LocaleKey, Multilanguage } from '../shared/types.js'
import { fail, isDiagnosticError } from './diagnostics.js'

function invalidateMultilanguage(
  path: string,
  field: string,
  message: string,
): never {
  fail({
    severity: 'error',
    code: 'INVALID_MULTILANGUAGE',
    message: `${field} ${message}`,
    path,
  })
}

function guardReflection<T>(
  operation: () => T,
  path: string,
  field: string,
): T {
  try {
    return operation()
  } catch (error) {
    if (isDiagnosticError(error)) {
      throw error
    }

    invalidateMultilanguage(
      path,
      field,
      'locale map could not be inspected safely',
    )
  }
}

function isPlainObject(
  value: unknown,
  path: string,
  field: string,
): value is Record<string, unknown> {
  return guardReflection(() => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false
    }

    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  }, path, field)
}

function isAccessorProperty(descriptor: PropertyDescriptor): boolean {
  return descriptor.get !== undefined || descriptor.set !== undefined
}

export function assertMultilanguage(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
  field: string,
): Multilanguage {
  if (typeof value === 'string') {
    return value
  }

  if (!isPlainObject(value, path, field)) {
    fail({
      severity: 'error',
      code: 'INVALID_MULTILANGUAGE',
      message: `${field} must be a string or locale map`,
      path,
    })
  }

  const record: Record<LocaleKey, string> = {}

  const ownKeys = guardReflection(
    () => Object.getOwnPropertyNames(value),
    path,
    field,
  )

  for (const key of ownKeys) {
    const keyField = `${field}.${key}`
    try {
      assertRouteSegment(key, keyField)
    } catch (error) {
      if (isDiagnosticError(error)) {
        throw error
      }

      invalidateMultilanguage(
        path,
        field,
        `map contains an invalid locale key "${key}"`,
      )
    }

    const descriptor = guardReflection(
      () => Object.getOwnPropertyDescriptor(value, key),
      path,
      field,
    )

    if (!descriptor) {
      continue
    }

    if (isAccessorProperty(descriptor)) {
      invalidateMultilanguage(
        path,
        field,
        'map values must be data properties',
      )
    }

    const entry = descriptor.value
    if (typeof entry !== 'string') {
      invalidateMultilanguage(path, field, 'map values must be strings')
    }

    record[key] = entry
  }

  if (!Object.hasOwn(record, mainLocale) || typeof record[mainLocale] !== 'string') {
    fail({
      severity: 'error',
      code: 'MISSING_MAIN_LOCALE',
      message: `${field} map must define mainLocale "${mainLocale}"`,
      path,
    })
  }

  return { ...record }
}
