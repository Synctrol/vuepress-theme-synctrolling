import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
import { useData, useRoute } from 'vuepress/client'
import backgroundLoaders from 'virtual:synctrol-backgrounds'
import { useResolvedColorMode } from '../composables/useColorMode.js'
import {
  readReducedMotion,
  subscribeReducedMotion,
} from './reduced-motion.js'
import { BackgroundRuntime, type BackgroundSyncInput } from './runtime.js'
import type { SynctrolClientPageData } from './types.js'

/**
 * Builds reactive sync input (+ reduced-motion subscription).
 * BackgroundHost owns setHost / sync / dispose — do not call runtime.sync here.
 */
export function useBackgroundRuntime(): {
  runtime: BackgroundRuntime
  syncInput: Ref<BackgroundSyncInput | null>
} {
  const runtime = new BackgroundRuntime({
    backgrounds: backgroundLoaders ?? {},
  })
  const route = useRoute()
  const { page } = useData()
  const colorMode = useResolvedColorMode()
  const reducedMotion = ref(readReducedMotion())

  const unsubscribeMotion = subscribeReducedMotion((value) => {
    reducedMotion.value = value
  })

  const syncInput = computed<BackgroundSyncInput | null>(() => {
    const data = page.value.frontmatter.synctrol as
      | SynctrolClientPageData
      | undefined
    if (!data?.contentType) return null
    return {
      contentType: data.contentType,
      route: data.routePath || route.path || page.value.path,
      locale: data.locale,
      colorMode: colorMode.value,
      reducedMotion: reducedMotion.value,
    }
  })

  onBeforeUnmount(() => {
    unsubscribeMotion()
  })

  return { runtime, syncInput }
}
