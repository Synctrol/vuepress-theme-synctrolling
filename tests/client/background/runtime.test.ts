import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
import type { BackgroundLoader } from '../../../src/shared/background'
import type { ContentType } from '../../../src/shared/types'

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

  function run(
    backgrounds: Partial<Record<ContentType, BackgroundLoader>>,
    input: {
      contentType: ContentType | 'release-collection' | 'news-collection'
      route: string
      locale: string
      colorMode: 'light' | 'dark'
      reducedMotion: boolean
    },
  ) {
    const runtime = new BackgroundRuntime({ backgrounds })
    runtime.setHost(host)
    return runtime.sync(input).then(() => runtime)
  }

  it('loads the module for the resolved content type and initializes with context', async () => {
    const runtime = await run(
      { home: solidProbeLoader },
      {
        contentType: 'home',
        route: '/zh/',
        locale: 'zh',
        colorMode: 'dark',
        reducedMotion: false,
      },
    )
    expect(solidProbeLog).toEqual(['init:/zh/:zh:dark:false'])
    expect(host.dataset.probe).toBe('solid')
    expect(host.dataset.synBackground).toBe('module')
    runtime.dispose()
  })

  it('uses the release module for release-collection pages', async () => {
    const runtime = await run(
      { release: solidProbeLoader },
      {
        contentType: 'release-collection',
        route: '/zh/releases/',
        locale: 'zh',
        colorMode: 'light',
        reducedMotion: true,
      },
    )
    expect(solidProbeLog[0]).toBe('init:/zh/releases/:zh:light:true')
    runtime.dispose()
  })

  it('uses the news module for news-collection pages', async () => {
    const runtime = await run(
      { news: solidProbeLoader },
      {
        contentType: 'news-collection',
        route: '/en/news/tags/release/',
        locale: 'en',
        colorMode: 'light',
        reducedMotion: false,
      },
    )
    expect(solidProbeLog[0]).toContain('/en/news/tags/release/')
    runtime.dispose()
  })

  it('renders an empty solid background when the loader is missing', async () => {
    const runtime = await run(
      {},
      {
        contentType: 'page',
        route: '/zh/about/',
        locale: 'zh',
        colorMode: 'light',
        reducedMotion: false,
      },
    )
    expect(solidProbeLog).toEqual([])
    expect(host.dataset.synBackground).toBe('solid')
    expect(host.childNodes.length).toBe(0)
    expect(getComputedStyle(host).backgroundColor).not.toBe('')
    runtime.dispose()
  })

  it('calls update when route/locale/colorMode/reducedMotion change for the same module', async () => {
    const runtime = new BackgroundRuntime({
      backgrounds: { home: solidProbeLoader },
    })
    runtime.setHost(host)
    await runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    await runtime.sync({
      contentType: 'home',
      route: '/en/',
      locale: 'en',
      colorMode: 'dark',
      reducedMotion: true,
    })
    expect(solidProbeLog).toEqual([
      'init:/zh/:zh:light:false',
      'update:/en/:en:dark:true',
    ])
    runtime.dispose()
  })

  it('disposes the current module before replacing it with another type', async () => {
    const runtime = new BackgroundRuntime({
      backgrounds: {
        home: solidProbeLoader,
        page: solidProbeLoader,
      },
    })
    runtime.setHost(host)
    await runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    await runtime.sync({
      contentType: 'page',
      route: '/zh/team/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(solidProbeLog).toEqual([
      'init:/zh/:zh:light:false',
      'dispose',
      'init:/zh/team/:zh:light:false',
    ])
    runtime.dispose()
  })

  it('disposes before switching from a module to solid fallback', async () => {
    const runtime = new BackgroundRuntime({
      backgrounds: { home: solidProbeLoader },
    })
    runtime.setHost(host)
    await runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    await runtime.sync({
      contentType: 'page',
      route: '/zh/team/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(solidProbeLog).toEqual(['init:/zh/:zh:light:false', 'dispose'])
    expect(host.dataset.synBackground).toBe('solid')
    runtime.dispose()
  })

  it('requires modules to clean up events, raf, observers, and DOM on dispose', async () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const runtime = await run(
      { page: animatingProbeLoader },
      {
        contentType: 'page',
        route: '/zh/about/',
        locale: 'zh',
        colorMode: 'light',
        reducedMotion: false,
      },
    )
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

  it('passes reducedMotion so modules can disable animation', async () => {
    const runtime = await run(
      { page: animatingProbeLoader },
      {
        contentType: 'page',
        route: '/zh/about/',
        locale: 'zh',
        colorMode: 'light',
        reducedMotion: true,
      },
    )
    expect(animatingProbeState.reducedMotionHonored).toContain(true)
    expect(host.querySelector('.animating-probe')?.getAttribute('data-motion')).toBe(
      'static',
    )
    runtime.dispose()
  })

  it('ignores sync before setHost and remains safe on the server', async () => {
    const runtime = new BackgroundRuntime({
      backgrounds: { home: solidProbeLoader },
    })
    await runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(solidProbeLog).toEqual([])
    runtime.dispose()
  })

  it('falls back to solid when the loader rejects', async () => {
    const runtime = new BackgroundRuntime({
      backgrounds: {
        home: async () => {
          throw new Error('background load failed')
        },
      },
    })
    runtime.setHost(host)

    await expect(
      runtime.sync({
        contentType: 'home',
        route: '/zh/',
        locale: 'zh',
        colorMode: 'light',
        reducedMotion: false,
      }),
    ).resolves.toBeUndefined()

    expect(host.dataset.synBackground).toBe('solid')
    expect(host.style.backgroundColor).toBe('var(--syn-bg)')
    expect(solidProbeLog).toEqual([])
    runtime.dispose()
  })

  it('ignores a pending loader when sync falls back to solid before it resolves', async () => {
    let resolveLoader!: (mod: Awaited<ReturnType<BackgroundLoader>>) => void
    const pendingLoader: BackgroundLoader = () =>
      new Promise((resolve) => {
        resolveLoader = resolve
      })

    const runtime = new BackgroundRuntime({
      backgrounds: { home: pendingLoader },
    })
    runtime.setHost(host)

    const pending = runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })

    await runtime.sync({
      contentType: 'page',
      route: '/zh/about/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(host.dataset.synBackground).toBe('solid')

    resolveLoader({
      default() {
        host.dataset.leaked = '1'
        return { update() {}, dispose() {} }
      },
    })
    await pending
    expect(host.dataset.synBackground).toBe('solid')
    expect(host.dataset.leaked).toBeUndefined()
    runtime.dispose()
  })

  it('ignores a pending loader after setHost so it cannot mount into a stale host', async () => {
    let resolveLoader!: (mod: Awaited<ReturnType<BackgroundLoader>>) => void
    const pendingLoader: BackgroundLoader = () =>
      new Promise((resolve) => {
        resolveLoader = resolve
      })

    const oldHost = host
    const newHost = document.createElement('div')
    newHost.className = 'syn-background'
    document.body.appendChild(newHost)

    const runtime = new BackgroundRuntime({
      backgrounds: { home: pendingLoader },
    })
    runtime.setHost(oldHost)

    const pending = runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })

    runtime.setHost(newHost)

    resolveLoader({
      default(context) {
        context.element.dataset.leaked = '1'
        return { update() {}, dispose() {} }
      },
    })
    await pending

    expect(oldHost.dataset.leaked).toBeUndefined()
    expect(newHost.dataset.leaked).toBeUndefined()
    expect(newHost.dataset.synBackground).not.toBe('module')
    expect(solidProbeLog).toEqual([])
    runtime.dispose()
  })
})
