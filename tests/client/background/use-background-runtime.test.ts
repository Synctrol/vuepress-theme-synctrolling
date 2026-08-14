import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import BackgroundSurface from '../../../src/client/background/BackgroundSurface.vue'
import { useBackgroundRuntime } from '../../../src/client/background/use-background-runtime'
import { solidProbeLoader, solidProbeLog } from '../../fixtures/backgrounds/solid-probe'
import type { SynctrolClientPageData } from '../../../src/client/background/types'
import { __resetColorModeStateForTests } from '../../../src/client/composables/useColorMode'

const routePath = ref('/zh/')
const synctrol = ref<SynctrolClientPageData>({
  locale: 'zh',
  contentType: 'home',
  routePath: '/zh/',
})
const colorMode = ref<'light' | 'dark'>('light')
const reducedMotionMatches = ref(false)

vi.mock('vuepress/client', () => ({
  useData: () => ({
    page: ref({
      path: routePath.value,
      get frontmatter() {
        return { synctrol: synctrol.value }
      },
    }),
    siteData: ref({ base: '/' }),
  }),
  useRoute: () => ({
    get path() {
      return routePath.value
    },
  }),
}))

vi.mock('virtual:synctrol-backgrounds', async () => {
  const { solidProbeLoader } = await import(
    '../../fixtures/backgrounds/solid-probe'
  )
  return {
    default: solidProbeLoader,
  }
})

vi.mock('../../../src/client/composables/useColorMode', async () => {
  const actual = await vi.importActual<
    typeof import('../../../src/client/composables/useColorMode')
  >('../../../src/client/composables/useColorMode')
  return {
    ...actual,
    useResolvedColorMode: () => colorMode,
  }
})

vi.mock('../../../src/client/background/reduced-motion', async () => {
  const actual = await vi.importActual<
    typeof import('../../../src/client/background/reduced-motion')
  >('../../../src/client/background/reduced-motion')
  return {
    ...actual,
    readReducedMotion: () => reducedMotionMatches.value,
    subscribeReducedMotion: (listener: (value: boolean) => void) => {
      ;(subscribeReducedMotion as unknown as { _emit?: (v: boolean) => void })._emit = (
        value: boolean,
      ) => {
        reducedMotionMatches.value = value
        listener(value)
      }
      return () => {}
    },
  }
})

import { subscribeReducedMotion } from '../../../src/client/background/reduced-motion'

function mountHarness() {
  const Harness = defineComponent({
    setup() {
      const { runtime, requestInput } = useBackgroundRuntime()
      return () =>
        h(BackgroundSurface, {
          runtime,
          requestInput: requestInput.value,
        })
    },
  })
  return mount(Harness, { attachTo: document.body })
}

describe('useBackgroundRuntime', () => {
  let wrapper: ReturnType<typeof mount> | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    solidProbeLog.length = 0
    routePath.value = '/zh/'
    synctrol.value = {
      locale: 'zh',
      contentType: 'home',
      routePath: '/zh/',
    }
    colorMode.value = 'light'
    reducedMotionMatches.value = false
    __resetColorModeStateForTests()
    document.body.innerHTML = ''
  })

  it('builds requestInput without driving runtime.request', async () => {
    let requestSpy: ReturnType<typeof vi.spyOn> | undefined
    const Harness = defineComponent({
      setup() {
        const { runtime, requestInput } = useBackgroundRuntime()
        requestSpy = vi.spyOn(runtime, 'request')
        return () =>
          h('div', {
            'data-route': requestInput.value?.routePath ?? 'none',
          })
      },
    })
    wrapper = mount(Harness)
    await nextTick()
    expect(wrapper.get('div').attributes('data-route')).toBe('/zh/')

    colorMode.value = 'dark'
    await nextTick()
    expect(requestSpy).not.toHaveBeenCalled()
    expect(solidProbeLog).toEqual([])
  })

  it('forwards init then navigation requests through the surface', async () => {
    wrapper = mountHarness()
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    expect(solidProbeLog[0]).toMatch(/^init:/)
    expect(solidProbeLog[1]).toMatch(/^request:init:\/zh\//)

    routePath.value = '/zh/releases/'
    synctrol.value = {
      locale: 'zh',
      contentType: 'release-collection',
      routePath: '/zh/releases/',
    }
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog.at(-1)).toMatch(
      /^request:navigate:\/zh\/releases\//,
    )
  })

  it('does not load a background when synctrol contentType is missing', async () => {
    synctrol.value = {
      locale: 'zh',
      contentType: undefined as never,
      routePath: '/',
    }
    wrapper = mountHarness()
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    expect(solidProbeLog).toEqual([])
  })
})
