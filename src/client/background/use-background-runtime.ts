import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useData, useRoute } from 'vuepress/client'
import backgroundLoader from 'virtual:synctrol-backgrounds'
import { useResolvedColorMode } from '../composables/useColorMode.js'
import {
  readReducedMotion,
  subscribeReducedMotion,
} from './reduced-motion.js'
import { BackgroundRuntime } from './runtime.js'
import { resolveBackgroundContentType } from './resolve-type.js'
import type { SynctrolClientPageData } from './types.js'
import type {
  BackgroundRequest,
  PageContentType,
} from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'

/**
 * Builds the reactive context refs and a page-identity `requestInput`.
 * BackgroundSurface owns mount / request / dispose — do not call runtime.request here.
 */
export function useBackgroundRuntime(): {
  runtime: BackgroundRuntime
  requestInput: Ref<BackgroundRequest | null>
} {
  const route = useRoute()
  const { page } = useData()
  const colorMode = useResolvedColorMode()
  const reducedMotion = ref(readReducedMotion())

  const unsubscribeMotion = subscribeReducedMotion((value) => {
    reducedMotion.value = value
  })

  const pageData = computed<SynctrolClientPageData | undefined>(
    () => page.value.frontmatter.synctrol as SynctrolClientPageData | undefined,
  )

  const routeRef = computed<{ path: string; identity?: string }>(() => {
    const data = pageData.value
    return {
      path: data?.routePath || route.path || page.value.path,
      ...(data?.identity === undefined ? {} : { identity: data.identity }),
    }
  })

  const contentTypeRef = computed<{
    raw: PageContentType
    resolved: ContentType
  }>(() => {
    const raw = pageData.value?.contentType
    if (!raw) return { raw: 'page', resolved: 'page' }
    return { raw, resolved: resolveBackgroundContentType(raw) }
  })

  const localeRef = computed<string>(() => pageData.value?.locale ?? '')

  const runtime = new BackgroundRuntime({
    loader: backgroundLoader ?? undefined,
    context: {
      route: routeRef,
      contentType: contentTypeRef,
      locale: localeRef,
      colorMode,
      reducedMotion,
    },
  })

  const requestInput = ref<BackgroundRequest | null>(null)

  watch(
    () => {
      const data = pageData.value
      if (!data?.contentType) return null
      const routePath = data.routePath || route.path || page.value.path
      return `${routePath}|${data.contentType}|${data.identity ?? ''}`
    },
    () => {
      const data = pageData.value
      if (!data?.contentType) {
        requestInput.value = null
        return
      }
      requestInput.value = {
        reason: 'navigate',
        routePath: data.routePath || route.path || page.value.path,
        contentType: {
          raw: data.contentType,
          resolved: resolveBackgroundContentType(data.contentType),
        },
        ...(data.identity === undefined ? {} : { identity: data.identity }),
        locale: data.locale,
        colorMode: colorMode.value,
        reducedMotion: reducedMotion.value,
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    unsubscribeMotion()
  })

  return { runtime, requestInput }
}
