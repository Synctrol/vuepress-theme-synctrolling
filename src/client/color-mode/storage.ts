import type { ColorModePreference } from './types.js'

export const COLOR_MODE_STORAGE_KEY = 'synctrol:color-mode'

export interface ColorModeStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function isPreference(value: string): value is ColorModePreference {
  return value === 'auto' || value === 'light' || value === 'dark'
}

export function readColorModePreference(
  storage: ColorModeStorageLike,
  fallback: ColorModePreference,
): ColorModePreference {
  const raw = storage.getItem(COLOR_MODE_STORAGE_KEY)
  if (!raw || !isPreference(raw)) return fallback
  return raw
}

export function writeColorModePreference(
  storage: ColorModeStorageLike,
  value: ColorModePreference,
): void {
  storage.setItem(COLOR_MODE_STORAGE_KEY, value)
}
