import { describe, expect, it } from 'vitest'
import { emitBackgroundsVirtualModule } from '../../../src/compiler/backgrounds/emit-virtual-module'
import type { BackgroundLoader } from '../../../src/shared/background'

/** Build a loader whose toString retains the dynamic-import literal (Vitest may rewrite inline import()). */
function loaderFromSource(source: string): BackgroundLoader {
  return new Function(`return ${source}`)() as BackgroundLoader
}

describe('emitBackgroundsVirtualModule', () => {
  it('emits an undefined default export when no loader is configured', () => {
    expect(emitBackgroundsVirtualModule(undefined, '/site/.vuepress')).toBe(
      'export default undefined\n',
    )
  })

  it('emits a single loader default export for the configured provider', () => {
    const loader = loaderFromSource("() => import('./backgrounds/host')")
    const source = emitBackgroundsVirtualModule(loader, '/site/.vuepress')
    expect(source).toContain('export default () => import(')
    expect(source).toContain('/site/.vuepress/backgrounds/host')
  })
})
