import type { SynctrolThemeOptions } from './shared/options.js'
import { resolveThemeOptions } from './shared/options.js'
import { toClientThemeOptions } from './shared/client-options.js'

export function synctrolTheme(options: SynctrolThemeOptions) {
  const resolved = resolveThemeOptions(options)
  const clientOptions = toClientThemeOptions(resolved)
  return {
    name: 'vuepress-theme-synctrolling',
    // Later plans attach plugins/layouts using `resolved`.
    define: {
      __SYNCTROL_THEME_OPTIONS__: clientOptions,
    },
  }
}

export * from './shared/client-options.js'
export * from './shared/types.js'
export * from './shared/messages.js'
export * from './shared/multilanguage.js'
export * from './shared/options.js'
