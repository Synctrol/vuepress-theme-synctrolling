import type { PlatformTypeRegistration } from '../shared/options.js'
import type { PlatformEntryBase } from '../shared/types.js'
import { fail, isDiagnosticError } from './diagnostics.js'
import type { ScannedPlayerUsage } from './scan-release-markdown.js'

const BOOLEAN_ATTRIBUTES = new Set(['autoplay'])
const INTEGER_ATTRIBUTES = new Set(['page', 'start'])

function attributeName(name: string): string {
  return name.replace(/-([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  )
}

function attributeValue(name: string, value: string): unknown {
  if (BOOLEAN_ATTRIBUTES.has(name) && (value === 'true' || value === 'false')) {
    return value === 'true'
  }
  if (INTEGER_ATTRIBUTES.has(name) && /^\d+$/.test(value)) {
    return Number(value)
  }
  return value
}

function usagePath(usage: ScannedPlayerUsage): string {
  return usage.line === undefined
    ? usage.sourcePath
    : `${usage.sourcePath}:${usage.line}`
}

export function validatePlayerUsage(
  usage: ScannedPlayerUsage,
  types: Record<string, PlatformTypeRegistration>,
): PlatformEntryBase {
  const registration = types[usage.type]
  if (!registration) {
    fail({
      severity: 'error',
      code: 'UNKNOWN_PLATFORM_TYPE',
      message: `Unknown Player type "${usage.type}"`,
      path: usagePath(usage),
    })
  }

  const entry: Record<string, unknown> = { platform: usage.type }
  for (const [rawName, rawValue] of Object.entries(usage.attrs)) {
    const name = attributeName(rawName)
    entry[name] = attributeValue(name, rawValue)
  }

  try {
    return registration.validate(entry)
  } catch (error) {
    if (isDiagnosticError(error) && error.diagnostics[0] !== undefined) {
      fail({
        ...error.diagnostics[0],
        path: usagePath(usage),
      })
    }
    fail({
      severity: 'error',
      code: 'INVALID_PLATFORM_ENTRY',
      message: error instanceof Error ? error.message : 'Invalid Player',
      path: usagePath(usage),
    })
  }
}
