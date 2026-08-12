import type { InjectionKey, Ref } from 'vue'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { LocaleKey } from '../../shared/types.js'
import type { PageIdentity } from '../../shared/route-types.js'

export interface LocaleAlternateLink {
  locale: LocaleKey
  label: string
  href: string
}

export interface SynctrolShellContext {
  locale: LocaleKey
  identity: PageIdentity | string
  publicPath: string
  base: string
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  localeAlternates: LocaleAlternateLink[]
}

export const SYNCTROL_THEME_OPTIONS_KEY: InjectionKey<ResolvedSynctrolThemeOptions> =
  Symbol('synctrol-theme-options')

export const SYNCTROL_SHELL_CONTEXT_KEY: InjectionKey<SynctrolShellContext> =
  Symbol('synctrol-shell-context')

export const SYNCTROL_DRAWER_OPEN_KEY: InjectionKey<Ref<boolean>> = Symbol(
  'synctrol-drawer-open',
)
