import type { SynctrolThemeOptions } from './shared/options.js'
import { resolveThemeOptions } from './shared/options.js'

export function synctrolTheme(options: SynctrolThemeOptions) {
  const resolved = resolveThemeOptions(options)
  return {
    name: 'vuepress-theme-synctrolling',
    // Later plans attach plugins/layouts using `resolved`.
    define: {
      __SYNCTROL_THEME_OPTIONS__: resolved,
    },
  }
}

export * from './shared/types.js'
export * from './shared/messages.js'
export * from './shared/multilanguage.js'
export * from './shared/options.js'
