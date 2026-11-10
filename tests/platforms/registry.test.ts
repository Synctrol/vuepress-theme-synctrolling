import { describe, expect, it } from 'vitest'
import { resolvePlatformTypes } from '../../src/platforms/registry'
import { builtInPlatformTypes } from '../../src/platforms/builtins'

describe('resolvePlatformTypes', () => {
  it('returns built-ins without a custom registration API', () => {
    const types = resolvePlatformTypes()
    expect(types.youtube_player).toBe(builtInPlatformTypes.youtube_player)
    expect(types).not.toBe(builtInPlatformTypes)
  })
})
