import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { BackgroundRuntime } from '../../../src/client/background/runtime'
import {
  animatingProbeLoader,
  animatingProbeState,
  resetAnimatingProbeState,
} from '../../fixtures/backgrounds/animating-probe'
import {
  solidProbeLoader,
  solidProbeLog,
} from '../../fixtures/backgrounds/solid-probe'
import { resolveBackgroundContentType } from '../../../src/client/background/resolve-type'
import type {
  BackgroundLoader,
  BackgroundRequest,
  PageContentType,
} from '../../../src/shared/background'
import type { ContentType } from '../../../src/shared/types'

function makeRuntime(loader?: BackgroundLoader) {
  const route = ref<{ path: string; identity?: string }>({ path: '' })
  const contentType = ref<{ raw: PageContentType; resolved: ContentType }>({
    raw: 'page',
    resolved: 'page',
  })
  const locale = ref('')
  const colorMode = ref<'light' | 'dark'>('light')
  const reducedMotion = ref(false)
  const runtime = new BackgroundRuntime({
    loader,
    context: { route, contentType, locale, colorMode, reducedMotion },
  })
  return { runtime, route, contentType, locale, colorMode, reducedMotion }
}

function request(input: {
  reason?: 'init' | 'navigate'
  routePath?: string
  raw?: PageContentType
  identity?: string
  locale?: string
  colorMode?: 'light' | 'dark'
  reducedMotion?: boolean
}): BackgroundRequest {
  const raw = input.raw ?? 'home'
  return {
    reason: input.reason ?? 'navigate',
    routePath: input.routePath ?? '/zh/',
    contentType: { raw, resolved: resolveBackgroundContentType(raw) },
    ...(input.identity === undefined ? {} : { identity: input.identity }),
    locale: input.locale ?? 'zh',
    colorMode: input.colorMode ?? 'light',
    reducedMotion: input.reducedMotion ?? false,
  }
}

describe('BackgroundRuntime', () => {
  let host: HTMLElement

  beforeEach(() => {
    document.documentElement.style.setProperty('--syn-bg', 'rgb(10, 20, 30)')
    host = document.createElement('div')
    host.className = 'syn-background'
    document.body.appendChild(host)
    solidProbeLog.length = 0
    resetAnimatingProbeState()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.style.removeProperty('--syn-bg')
  })

  it('loads the provider on first request and initializes with the reactive context', async () => {
    const { runtime, route, contentType, locale, colorMode, reducedMotion } =
      makeRuntime(solidProbeLoader)
    route.value = { path: '/zh/' }
    contentType.value = { raw: 'home', resolved: 'home' }
    locale.value = 'zh'
    colorMode.value = 'dark'
    reducedMotion.value = false

    runtime.mount(host)
    runtime.request(request({ reason: 'init', colorMode: 'dark' }))
    await Promise.resolve()
    await Promise.resolve()

    expect(solidProbeLog).toEqual([
      'init:/zh/:zh:dark:false',
      'request:init:/zh/:zh:dark:false',
    ])
    expect(host.dataset.probe).toBe('solid')
    expect(host.dataset.synBackground).toBe('module')
    runtime.dispose()
  })

  it('does not reload the provider for subsequent requests', async () => {
    const { runtime, contentType } = makeRuntime(solidProbeLoader)
    runtime.mount(host)
    runtime.request(request({ reason: 'init' }))
    await Promise.resolve()
    await Promise.resolve()

    contentType.value = { raw: 'release-collection', resolved: 'release' }
    runtime.request(
      request({
        reason: 'navigate',
        routePath: '/zh/releases/',
        raw: 'release-collection',
      }),
    )
    await Promise.resolve()

    expect(solidProbeLog.filter((e) => e.startsWith('init:')).length).toBe(1)
    expect(solidProbeLog.at(-1)).toBe(
      'request:navigate:/zh/releases/:zh:light:false',
    )
    runtime.dispose()
  })

  it('renders an empty solid background when no loader is configured', async () => {
    const { runtime } = makeRuntime(undefined)
    runtime.mount(host)
    runtime.request(request({ reason: 'init' }))
    await Promise.resolve()

    expect(solidProbeLog).toEqual([])
    expect(host.dataset.synBackground).toBe('solid')
    expect(host.childNodes.length).toBe(0)
    expect(getComputedStyle(host).backgroundColor).not.toBe('')
    runtime.dispose()
  })

  it('falls back to solid when the loader rejects', async () => {
    const { runtime } = makeRuntime(async () => {
      throw new Error('background load failed')
    })
    runtime.mount(host)
    runtime.request(request({ reason: 'init' }))
    await Promise.resolve()
    await Promise.resolve()

    expect(host.dataset.synBackground).toBe('solid')
    expect(host.style.backgroundColor).toBe('var(--syn-bg)')
    expect(solidProbeLog).toEqual([])
    runtime.dispose()
  })

  it('delivers the latest pending request once the provider finishes loading', async () => {
    let resolveLoader!: (mod: Awaited<ReturnType<BackgroundLoader>>) => void
    const pendingLoader: BackgroundLoader = () =>
      new Promise((resolve) => {
        resolveLoader = resolve
      })

    const { runtime } = makeRuntime(pendingLoader)
    runtime.mount(host)
    runtime.request(request({ reason: 'init', routePath: '/zh/' }))
    runtime.request(
      request({ reason: 'navigate', routePath: '/zh/news/', raw: 'news' }),
    )

    resolveLoader(await solidProbeLoader())

    await Promise.resolve()
    await Promise.resolve()

    expect(solidProbeLog.filter((e) => e.startsWith('request:')).length).toBe(1)
    expect(solidProbeLog.at(-1)).toBe(
      'request:navigate:/zh/news/:zh:light:false',
    )
    runtime.dispose()
  })

  it('ignores a pending loader after dispose', async () => {
    let resolveLoader!: (mod: Awaited<ReturnType<BackgroundLoader>>) => void
    const pendingLoader: BackgroundLoader = () =>
      new Promise((resolve) => {
        resolveLoader = resolve
      })

    const { runtime } = makeRuntime(pendingLoader)
    runtime.mount(host)
    runtime.request(request({ reason: 'init' }))
    runtime.dispose()

    resolveLoader(await solidProbeLoader())
    await Promise.resolve()

    expect(solidProbeLog).toEqual([])
    expect(host.dataset.synBackground).toBe('solid')
    runtime.dispose()
  })

  it('requires providers to clean up events, raf, observers, and DOM on dispose', async () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const { runtime } = makeRuntime(animatingProbeLoader)
    runtime.mount(host)
    runtime.request(request({ reason: 'init' }))
    await Promise.resolve()
    await Promise.resolve()

    expect(animatingProbeState.nodes).toHaveLength(1)
    expect(animatingProbeState.listeners).toHaveLength(1)
    expect(animatingProbeState.observers).toHaveLength(1)
    expect(animatingProbeState.reducedMotionHonored[0]).toBe(false)

    runtime.dispose()

    expect(host.querySelector('.animating-probe')).toBeNull()
    expect(animatingProbeState.nodes).toHaveLength(0)
    expect(animatingProbeState.listeners).toHaveLength(0)
    expect(animatingProbeState.observers).toHaveLength(0)
    expect(cancelSpy).toHaveBeenCalled()
    cancelSpy.mockRestore()
  })

  it('lets the provider react to reducedMotion through the reactive context', async () => {
    const { runtime, reducedMotion } = makeRuntime(animatingProbeLoader)
    reducedMotion.value = true
    runtime.mount(host)
    runtime.request(request({ reason: 'init', reducedMotion: true }))
    await Promise.resolve()
    await Promise.resolve()

    expect(animatingProbeState.reducedMotionHonored).toContain(true)
    expect(
      host.querySelector('.animating-probe')?.getAttribute('data-motion'),
    ).toBe('static')

    reducedMotion.value = false
    await nextTick()
    expect(
      host.querySelector('.animating-probe')?.getAttribute('data-motion'),
    ).toBe('animated')
    runtime.dispose()
  })
})
