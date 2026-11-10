import type { PlatformTypeRegistration } from '../shared/options.js'
import { coercePlayerAttributes } from '../shared/player-entry.js'
import type { NormalizedPlatformEntry } from '../shared/types.js'
import { fail, isDiagnosticError } from './diagnostics.js'
import type { ScannedPlayerUsage } from './scan-release-markdown.js'

function usagePath(usage: ScannedPlayerUsage): string {
  return usage.line === undefined
    ? usage.sourcePath
    : `${usage.sourcePath}:${usage.line}`
}

export function validatePlayerUsage(
  usage: ScannedPlayerUsage,
  types: Record<string, PlatformTypeRegistration>,
): NormalizedPlatformEntry {
  const registration = types[usage.type]
  if (!registration) {
    fail({
      severity: 'error',
      code: 'UNKNOWN_PLATFORM_TYPE',
      message: `Unknown Player type "${usage.type}"`,
      path: usagePath(usage),
    })
  }

  const entry = {
    platform: usage.type,
    ...coercePlayerAttributes(usage.attrs),
  }

  try {
    return registration.validate(entry) as NormalizedPlatformEntry
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
