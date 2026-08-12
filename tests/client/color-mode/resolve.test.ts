import { describe, expect, it } from 'vitest'
import { resolveSurfaceColorMode } from '../../../src/client/color-mode/resolve'

describe('resolveSurfaceColorMode', () => {
  it('AUTO follows prefers-color-scheme', () => {
    expect(resolveSurfaceColorMode('auto', true)).toBe('dark')
    expect(resolveSurfaceColorMode('auto', false)).toBe('light')
  })

  it('explicit modes ignore system preference', () => {
    expect(resolveSurfaceColorMode('light', true)).toBe('light')
    expect(resolveSurfaceColorMode('dark', false)).toBe('dark')
  })
})
