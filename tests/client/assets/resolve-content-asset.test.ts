import { describe, expect, it } from 'vitest'
import {
  createResolveContentAsset,
  normalizeContentAssetRef,
} from '../../../src/client/assets/resolve-content-asset'

describe('resolveContentAsset', () => {
  it('returns the public path for a registered package-relative ref', () => {
    const resolveContentAsset = createResolveContentAsset({
      './assets/name.ext': '/assets/content/release/first/name.abcd1234.ext',
      'assets/name.ext': '/assets/content/release/first/name.abcd1234.ext',
    })
    expect(resolveContentAsset('./assets/name.ext')).toBe(
      '/assets/content/release/first/name.abcd1234.ext',
    )
  })

  it('throws when the ref is unknown', () => {
    const resolveContentAsset = createResolveContentAsset({})
    expect(() => resolveContentAsset('./assets/missing.webp')).toThrow(
      /resolveContentAsset/i,
    )
  })

  it('normalizes refs for map lookup', () => {
    expect(normalizeContentAssetRef('assets/a.webp')).toBe('./assets/a.webp')
    expect(normalizeContentAssetRef('./assets/a.webp')).toBe('./assets/a.webp')
  })
})
