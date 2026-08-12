import { describe, expect, it } from 'vitest'
import { nextColorMode } from '../../../src/client/color-mode/cycle'

describe('nextColorMode', () => {
  it('cycles AUTO → LIGHT → DARK → AUTO', () => {
    expect(nextColorMode('auto')).toBe('light')
    expect(nextColorMode('light')).toBe('dark')
    expect(nextColorMode('dark')).toBe('auto')
  })
})
