import type { ColorModePreference } from './types.js'

const ORDER: ColorModePreference[] = ['auto', 'light', 'dark']

export function nextColorMode(
  current: ColorModePreference,
): ColorModePreference {
  const index = ORDER.indexOf(current)
  return ORDER[(index + 1) % ORDER.length]!
}
