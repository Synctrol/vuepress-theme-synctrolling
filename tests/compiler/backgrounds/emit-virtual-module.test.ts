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

  it('emits forward slashes for a Windows-style config dir', () => {
    const source = emitBackgroundsVirtualModule(
      './backgrounds/host',
      'C:\\site\\.vuepress',
    )
    expect(source).toBe(
      'export default () => import("C:/site/.vuepress/backgrounds/host")\n',
    )
  })

  it('emits forward slashes for an absolute Windows background path', () => {
    const source = emitBackgroundsVirtualModule(
      'C:\\abs\\backgrounds\\host',
      'C:\\site\\.vuepress',
    )
    expect(source).toBe('export default () => import("C:/abs/backgrounds/host")\n')
  })

  it('never embeds a backslash in the emitted source', () => {
    const source = emitBackgroundsVirtualModule(
      './backgrounds/host',
      'C:\\Users\\demo\\site\\.vuepress',
    )
    expect(source).not.toMatch(/\\/u)
  })
})
