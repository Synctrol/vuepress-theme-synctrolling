import { describe, expect, it } from 'vitest'
import { createSynctrolBackgroundsVitePlugin } from '../../../src/compiler/backgrounds/vite-plugin'
import { emitBackgroundsVirtualModule } from '../../../src/compiler/backgrounds/emit-virtual-module'
import type { BackgroundLoader } from '../../../src/shared/background'

/** Build a loader whose toString retains the dynamic-import literal (Vitest may rewrite inline import()). */
function loaderFromSource(source: string): BackgroundLoader {
  return new Function(`return ${source}`)() as BackgroundLoader
}

function asHookFn<T extends (...args: never[]) => unknown>(
  hook: T | { handler: T } | undefined,
): T {
  if (typeof hook === 'function') return hook
  if (hook && typeof hook === 'object' && 'handler' in hook) {
    return hook.handler
  }
  throw new Error('expected Vite plugin hook function')
}

describe('createSynctrolBackgroundsVitePlugin', () => {
  it('resolves virtual:synctrol-backgrounds and @synctrol/backgrounds', () => {
    const plugin = createSynctrolBackgroundsVitePlugin({
      backgrounds: {},
      configDir: '/site/.vuepress',
    })
    const resolveId = asHookFn(plugin.resolveId as never) as (
      id: string,
      importer: string | undefined,
    ) => string | undefined
    expect(resolveId('virtual:synctrol-backgrounds', undefined)).toBe(
      '\0virtual:synctrol-backgrounds',
    )
    expect(resolveId('@synctrol/backgrounds', undefined)).toBe(
      '\0virtual:synctrol-backgrounds',
    )
  })

  it('loads the emitted module source', () => {
    const backgrounds = {
      home: loaderFromSource("() => import('./backgrounds/home')"),
    }
    const plugin = createSynctrolBackgroundsVitePlugin({
      backgrounds,
      configDir: '/site/.vuepress',
    })
    const load = asHookFn(plugin.load as never) as (
      id: string,
    ) => string | undefined
    expect(load('\0virtual:synctrol-backgrounds')).toBe(
      emitBackgroundsVirtualModule(backgrounds, '/site/.vuepress'),
    )
  })
})
