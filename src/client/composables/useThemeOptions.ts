import { inject } from 'vue'
import type { ClientSynctrolThemeOptions } from '../../shared/client-options.js'
import { SYNCTROL_THEME_OPTIONS_KEY } from './keys.js'

declare const __SYNCTROL_THEME_OPTIONS__: ClientSynctrolThemeOptions

export function useThemeOptions(): ClientSynctrolThemeOptions {
  return (
    inject(SYNCTROL_THEME_OPTIONS_KEY, null) ?? __SYNCTROL_THEME_OPTIONS__
  )
}
