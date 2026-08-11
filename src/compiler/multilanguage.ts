import { assertRouteSegment } from '../shared/options-validation.js'
import type { LocaleKey, Multilanguage } from '../shared/types.js'
import { fail } from './diagnostics.js'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
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

  if (!isPlainObject(value)) {
    fail({
      severity: 'error',
      code: 'INVALID_MULTILANGUAGE',
      message: `${field} must be a string or locale map`,
      path,
    })
  }

  const record: Record<LocaleKey, string> = {}

  for (const key of Object.keys(value)) {
    const keyField = `${field}.${key}`
    try {
      assertRouteSegment(key, keyField)
    } catch {
      fail({
        severity: 'error',
        code: 'INVALID_MULTILANGUAGE',
        message: `${field} map contains an invalid locale key "${key}"`,
        path,
      })
    }

    const entry = value[key]
    if (typeof entry !== 'string') {
      fail({
        severity: 'error',
        code: 'INVALID_MULTILANGUAGE',
        message: `${field} map values must be strings`,
        path,
      })
    }

    record[key] = entry
  }

  if (!Object.hasOwn(value, mainLocale)) {
    fail({
      severity: 'error',
      code: 'MISSING_MAIN_LOCALE',
      message: `${field} map must define mainLocale "${mainLocale}"`,
      path,
    })
  }

  return { ...record }
}
