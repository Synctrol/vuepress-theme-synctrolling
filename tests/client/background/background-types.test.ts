import { describe, expect, it } from 'vitest'
import type {
  BackgroundContext,
  BackgroundController,
  BackgroundLoader,
  BackgroundModule,
} from '../../../src/shared/background'

describe('background module contracts', () => {
  it('requires BackgroundContext fields from the spec', () => {
    const context: BackgroundContext = {
      element: document.createElement('div'),
      route: '/zh/',
      locale: 'zh',
      colorMode: 'dark',
      reducedMotion: true,
    }
    expect(context.element).toBeInstanceOf(HTMLElement)
    expect(context.route).toBe('/zh/')
    expect(context.locale).toBe('zh')
    expect(context.colorMode).toBe('dark')
    expect(context.reducedMotion).toBe(true)
  })

  it('requires update and dispose on BackgroundController', () => {
    const calls: string[] = []
    const controller: BackgroundController = {
      update(ctx) {
        calls.push(`update:${ctx.route}`)
      },
      dispose() {
        calls.push('dispose')
      },
    }
    controller.update({
      element: document.createElement('div'),
      route: '/en/releases/',
      locale: 'en',
      colorMode: 'light',
      reducedMotion: false,
    })
    controller.dispose()
    expect(calls).toEqual(['update:/en/releases/', 'dispose'])
  })

  it('loads modules through BackgroundLoader returning a default factory', async () => {
    const loader: BackgroundLoader = async () => {
      const mod: BackgroundModule = {
        default(context) {
          expect(context.element).toBeInstanceOf(HTMLElement)
          return {
            update() {},
            dispose() {},
          }
        },
      }
      return mod
    }
    const mod = await loader()
    const controller = mod.default({
      element: document.createElement('div'),
      route: '/zh/news/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(typeof controller.update).toBe('function')
    expect(typeof controller.dispose).toBe('function')
  })
})
