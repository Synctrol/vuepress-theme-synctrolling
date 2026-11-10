import { builtInPlatformTypes } from './builtins/index.js'
import type { PlatformTypeRegistration } from '../shared/options.js'
import type { BuiltInPlatformType } from '../shared/types.js'

export function resolvePlatformTypes(): Record<string, PlatformTypeRegistration> {
  return { ...builtInPlatformTypes }
}

export function isBuiltInPlatformType(type: string): type is BuiltInPlatformType {
  return Object.prototype.hasOwnProperty.call(builtInPlatformTypes, type)
}
