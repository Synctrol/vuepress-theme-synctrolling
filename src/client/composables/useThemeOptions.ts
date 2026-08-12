import { inject } from 'vue'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import { SYNCTROL_THEME_OPTIONS_KEY } from './keys.js'

declare const __SYNCTROL_THEME_OPTIONS__: ResolvedSynctrolThemeOptions

export function useThemeOptions(): ResolvedSynctrolThemeOptions {
  return (
    inject(SYNCTROL_THEME_OPTIONS_KEY, null) ?? __SYNCTROL_THEME_OPTIONS__
  )
}
