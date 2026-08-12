import { describe, expect, it } from 'vitest'
import { emitBackgroundsVirtualModule } from '../../../src/compiler/backgrounds/emit-virtual-module'
import type { BackgroundLoader } from '../../../src/shared/background'

/** Build a loader whose toString retains the dynamic-import literal (Vitest may rewrite inline import()). */
function loaderFromSource(source: string): BackgroundLoader {
  return new Function(`return ${source}`)() as BackgroundLoader
}

describe('emitBackgroundsVirtualModule', () => {
  it('emits an empty default export when no loaders are configured', () => {
    expect(emitBackgroundsVirtualModule({}, '/site/.vuepress')).toBe(
      'export default {}\n',
    )
  })

  it('emits resolved absolute import ids for configured keys', () => {
    const backgrounds = {
      home: loaderFromSource("() => import('./backgrounds/home')"),
      news: loaderFromSource("() => import('./backgrounds/news')"),
    }
    const source = emitBackgroundsVirtualModule(
      backgrounds,
      '/site/.vuepress',
    )
    expect(source).toContain('home: () => import(')
    expect(source).toContain('/site/.vuepress/backgrounds/home')
    expect(source).toContain('news: () => import(')
    expect(source).not.toContain('release:')
    expect(source).not.toContain('page:')
  })
})
