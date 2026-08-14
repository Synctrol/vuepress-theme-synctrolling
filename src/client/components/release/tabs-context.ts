import type { ComputedRef, InjectionKey, Ref } from 'vue'

export interface SynctrolTabPanelRegistration {
  id: number
  label: string
}

export interface SynctrolTabsContext {
  panels: SynctrolTabPanelRegistration[]
  activeId: Ref<number | null>
  register: (label: string) => number
  unregister: (id: number) => void
}

export const SYNCTROL_TABS_CONTEXT_KEY: InjectionKey<SynctrolTabsContext> =
  Symbol('synctrol-tabs-context')

export const SYNCTROL_TAB_PANEL_ACTIVE_KEY: InjectionKey<
  ComputedRef<boolean>
> = Symbol('synctrol-tab-panel-active')
