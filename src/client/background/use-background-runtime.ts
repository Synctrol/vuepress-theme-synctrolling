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
      // A page without a content type (e.g. the 404 page) behaves as a
      // generic non-home "page", so the wave eases to a stop there too.
      const contentType = data?.contentType ?? 'page'
      const routePath = data?.routePath || route.path || page.value.path
      return `${routePath}|${contentType}|${data?.identity ?? ''}`
    },
    () => {
      const data = pageData.value
      const raw = data?.contentType ?? 'page'
      requestInput.value = {
        reason: 'navigate',
        routePath: data?.routePath || route.path || page.value.path,
        contentType: {
          raw,
          resolved: resolveBackgroundContentType(raw),
        },
        ...(data?.identity === undefined ? {} : { identity: data.identity }),
        locale: data?.locale ?? '',
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
