import { inject } from 'vue'
import type { InjectionKey } from 'vue'
import type {
  CompiledAlbumMetadata,
  ReleaseDetailModel,
} from '../../../shared/release/types.js'
import type {
  LocaleKey,
  LocaleMessages,
} from '../../../shared/types.js'

export interface ReleasePageContext {
  locale: LocaleKey
  mainLocale: LocaleKey
  date: string
  artwork: ReleaseDetailModel['artwork']
  albumBySrc: Record<string, CompiledAlbumMetadata>
  loadStrategy: 'interaction' | 'viewport'
  messages: LocaleMessages
}

export function normalizeAlbumSrc(src: string): string {
  const segments: string[] = []
  for (const segment of src.replace(/\\/g, '/').split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  return `./${segments.join('/')}`
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
