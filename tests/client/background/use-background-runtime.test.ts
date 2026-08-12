import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
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
    default: {
      home: solidProbeLoader,
      release: solidProbeLoader,
    },
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
      const { runtime, syncInput } = useBackgroundRuntime()
      let hostBound = false
      return () =>
        h('div', { class: 'syn-shell' }, [
          h('div', {
            class: 'syn-background',
            ref: (el) => {
              if (el instanceof HTMLElement && !hostBound) {
                hostBound = true
                runtime.setHost(el)
                if (syncInput.value) void runtime.sync(syncInput.value)
              }
            },
          }),
        ])
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

  it('updates on route, locale, colorMode, and reducedMotion changes', async () => {
    wrapper = mountHarness()
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog[0]).toMatch(/^init:\/zh\/:zh:light:false$/)

    routePath.value = '/zh/releases/'
    synctrol.value = {
      locale: 'zh',
      contentType: 'release-collection',
      routePath: '/zh/releases/',
    }
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog).toContain('dispose')
    expect(solidProbeLog.at(-1)).toMatch(/^init:\/zh\/releases\/:zh:light:false$/)

    synctrol.value = {
      locale: 'en',
      contentType: 'release-collection',
      routePath: '/en/releases/',
    }
    routePath.value = '/en/releases/'
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog.at(-1)).toMatch(/^update:\/en\/releases\/:en:light:false$/)

    colorMode.value = 'dark'
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog.at(-1)).toMatch(/^update:\/en\/releases\/:en:dark:false$/)

    const emit = (
      subscribeReducedMotion as unknown as { _emit?: (v: boolean) => void }
    )._emit
    emit?.(true)
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog.at(-1)).toMatch(/^update:\/en\/releases\/:en:dark:true$/)
  })

  it('does not load a background when synctrol contentType is missing', async () => {
    synctrol.value = {
      locale: 'zh',
      contentType: undefined as never,
      routePath: '/',
    }
    // Prefer: omit contentType entirely in the mock frontmatter for this case.
    wrapper = mountHarness()
    await nextTick()
    await Promise.resolve()
    // When contentType is absent, syncInput is null — no module init.
    expect(solidProbeLog).toEqual([])
  })
})
