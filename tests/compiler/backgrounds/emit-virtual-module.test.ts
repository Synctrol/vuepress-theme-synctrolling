import { describe, expect, it } from 'vitest'
import { emitBackgroundsVirtualModule } from '../../../src/compiler/backgrounds/emit-virtual-module'

describe('emitBackgroundsVirtualModule', () => {
  it('emits an undefined default export when no background path is configured', () => {
    expect(emitBackgroundsVirtualModule(undefined, '/site/.vuepress')).toBe(
      'export default undefined\n',
    )
  })

  it('emits a resolved loader for a relative background path', () => {
    const source = emitBackgroundsVirtualModule(
      './backgrounds/host',
      '/site/.vuepress',
    )
    expect(source).toBe(
      'export default () => import("/site/.vuepress/backgrounds/host")\n',
    )
  })

  it('keeps an absolute background path as-is', () => {
    const source = emitBackgroundsVirtualModule(
      '/abs/backgrounds/host',
      '/site/.vuepress',
    )
    expect(source).toBe('export default () => import("/abs/backgrounds/host")\n')
  })
})
