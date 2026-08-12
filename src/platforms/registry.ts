import { builtInPlatformTypes } from './builtins/index.js'
import type { PlatformTypeRegistration } from '../shared/options.js'
import type { BuiltInPlatformType } from '../shared/types.js'

export function resolvePlatformTypes(
  custom: Record<string, PlatformTypeRegistration> = {},
): Record<string, PlatformTypeRegistration> {
  const builtInKeys = new Set(Object.keys(builtInPlatformTypes))
  for (const key of Object.keys(custom)) {
    if (builtInKeys.has(key)) {
      throw new Error(`Cannot override built-in platform type "${key}"`)
    }
  }
  return {
    ...builtInPlatformTypes,
    ...custom,
  }
}

export function isBuiltInPlatformType(type: string): type is BuiltInPlatformType {
  return Object.prototype.hasOwnProperty.call(builtInPlatformTypes, type)
}
