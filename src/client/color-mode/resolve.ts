import type { ColorModePreference, SurfaceColorMode } from './types.js'

export function resolveSurfaceColorMode(
  preference: ColorModePreference,
  prefersDark: boolean,
): SurfaceColorMode {
  if (preference === 'auto') return prefersDark ? 'dark' : 'light'
  return preference
}
