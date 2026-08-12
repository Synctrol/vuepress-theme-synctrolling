import { mount, type MountingOptions } from '@vue/test-utils'
import { type Component } from 'vue'
import {
  SYNCTROL_THEME_OPTIONS_KEY,
  SYNCTROL_SHELL_CONTEXT_KEY,
  type SynctrolShellContext,
} from '../../../src/client/composables/keys'
import { fixtureThemeOptions } from './fixtures'

export interface MountShellOptions extends MountingOptions<Record<string, unknown>> {
  locale?: string
  identity?: string
  publicPath?: string
  base?: string
  themeOverrides?: Parameters<typeof fixtureThemeOptions>[0]
  shellContext?: Partial<SynctrolShellContext>
}

export function mountShell(
  component: Component,
  options: MountShellOptions = {},
) {
  const theme = fixtureThemeOptions(options.themeOverrides)
  const locale = options.locale ?? 'zh'
  const shell: SynctrolShellContext = {
    locale,
    identity: options.identity ?? 'home',
    publicPath: options.publicPath ?? `/${locale}/`,
    base: options.base ?? '/',
    drawerOpen: false,
    setDrawerOpen: () => {},
    localeAlternates: [
      { locale: 'zh', label: '中文', href: '/zh/' },
      { locale: 'en', label: 'English', href: '/en/' },
    ],
    ...options.shellContext,
  }

  return mount(component, {
    ...options,
    global: {
      ...options.global,
      provide: {
        [SYNCTROL_THEME_OPTIONS_KEY as symbol]: theme,
        [SYNCTROL_SHELL_CONTEXT_KEY as symbol]: shell,
        ...(options.global?.provide ?? {}),
      },
    },
  })
}
