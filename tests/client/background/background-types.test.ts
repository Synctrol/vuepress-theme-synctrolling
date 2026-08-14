import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type {
  BackgroundLoader,
  BackgroundModule,
  BackgroundReactiveContext,
  BackgroundRequest,
  IBackgroundHost,
  PageContentType,
} from '../../../src/shared/background'
import type { ContentType } from '../../../src/shared/types'

describe('background module contracts', () => {
  it('exposes reactive refs on BackgroundReactiveContext', () => {
    const context: BackgroundReactiveContext = {
      element: document.createElement('div'),
      route: ref<{ path: string; identity?: string }>({ path: '/zh/' }),
      contentType: ref<{ raw: PageContentType; resolved: ContentType }>({
        raw: 'home',
        resolved: 'home',
      }),
      locale: ref('zh'),
      colorMode: ref<'light' | 'dark'>('dark'),
      reducedMotion: ref(true),
    }
    expect(context.element).toBeInstanceOf(HTMLElement)
    expect(context.route.value.path).toBe('/zh/')
    expect(context.contentType.value.resolved).toBe('home')
    expect(context.locale.value).toBe('zh')
    expect(context.colorMode.value).toBe('dark')
    expect(context.reducedMotion.value).toBe(true)
  })

  it('requires request and dispose on IBackgroundHost', () => {
    const calls: string[] = []
    const request: BackgroundRequest = {
      reason: 'navigate',
      routePath: '/en/releases/',
      contentType: { raw: 'release-collection', resolved: 'release' },
      locale: 'en',
      colorMode: 'light',
      reducedMotion: false,
    }
    const host: IBackgroundHost = {
      request(req) {
        calls.push(`request:${req.routePath}`)
      },
      dispose() {
        calls.push('dispose')
      },
    }
    host.request(request)
    host.dispose()
    expect(calls).toEqual(['request:/en/releases/', 'dispose'])
  })

  it('loads modules through BackgroundLoader returning a default factory', async () => {
    const loader: BackgroundLoader = async () => {
      const mod: BackgroundModule = {
        default(context) {
          expect(context.element).toBeInstanceOf(HTMLElement)
          return { request() {}, dispose() {} }
        },
      }
      return mod
    }
    const mod = await loader()
    const host = mod.default({
      element: document.createElement('div'),
      route: ref({ path: '/zh/news/' }),
      contentType: ref<{ raw: PageContentType; resolved: ContentType }>({
        raw: 'news',
        resolved: 'news',
      }),
      locale: ref('zh'),
      colorMode: ref<'light' | 'dark'>('light'),
      reducedMotion: ref(false),
    })
    expect(typeof host.request).toBe('function')
    expect(typeof host.dispose).toBe('function')
  })
})
