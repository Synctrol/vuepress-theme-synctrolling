import { inject } from 'vue'
import type { InjectionKey } from 'vue'
import type { ReleaseDetailModel } from '../../../shared/release/types.js'
import type {
  ContentDefinitions,
  LocaleKey,
  LocaleMessages,
} from '../../../shared/types.js'
import type { PlatformTypeRegistration } from '../../../shared/options.js'

export interface ReleasePageContext {
  locale: LocaleKey
  mainLocale: LocaleKey
  model: ReleaseDetailModel
  definitions: ContentDefinitions['platforms']
  types: Record<string, PlatformTypeRegistration>
  loadStrategy: 'interaction' | 'viewport'
  messages: LocaleMessages
}

export const SYNCTROL_RELEASE_CONTEXT_KEY: InjectionKey<ReleasePageContext> =
  Symbol('synctrol-release')

export function useReleasePage(): ReleasePageContext | undefined {
  const context = inject(SYNCTROL_RELEASE_CONTEXT_KEY, undefined)
  if (context === undefined) {
    console.warn(
      '[vuepress-theme-synctrolling] Album components must be used on a release page',
    )
  }
  return context
}
