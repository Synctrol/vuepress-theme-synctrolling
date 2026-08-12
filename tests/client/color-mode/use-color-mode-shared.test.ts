import { afterEach, describe, expect, it, vi } from 'vitest'
import { fixtureThemeOptions } from '../harness/fixtures'

vi.mock('../../../src/client/composables/useThemeOptions', () => ({
  useThemeOptions: () => fixtureThemeOptions(),
}))

import {
  __resetColorModeStateForTests,
  useColorMode,
  useResolvedColorMode,
} from '../../../src/client/composables/useColorMode'

describe('shared color mode surface', () => {
  afterEach(() => {
    __resetColorModeStateForTests()
  })

  it('returns the same preference/surface for multiple callers', () => {
    const a = useColorMode()
    const b = useColorMode()
    expect(a.preference).toBe(b.preference)
    expect(a.surface).toBe(b.surface)
    expect(useResolvedColorMode()).toBe(a.surface)
  })

  it('updates useResolvedColorMode when preference cycles to a concrete mode', () => {
    const { preference, cycle } = useColorMode()
    const resolved = useResolvedColorMode()
    while (preference.value === 'auto') cycle()
    const after = preference.value
    expect(after === 'light' || after === 'dark').toBe(true)
    expect(resolved.value).toBe(after)
  })
})
