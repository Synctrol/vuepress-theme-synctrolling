import type { ColorModePreference } from './types.js'
import { COLOR_MODE_STORAGE_KEY } from './storage.js'

export function buildColorModeBootScript(
  defaultColorMode: ColorModePreference,
): string {
  const key = JSON.stringify(COLOR_MODE_STORAGE_KEY)
  const fallback = JSON.stringify(defaultColorMode)
  return `(function(){try{var k=${key};var d=${fallback};var v=localStorage.getItem(k);if(v!=='auto'&&v!=='light'&&v!=='dark')v=d;var dark=v==='dark'||(v==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`
}
