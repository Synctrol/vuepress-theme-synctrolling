import { describe, expect, it } from 'vitest'
import * as client from '../../src/client'

describe('client package exports', () => {
  it('keeps Plan 04 asset helpers (JS-only; no Layout SFC export)', () => {
    expect(typeof client.resolveContentAsset).toBe('function')
    expect(typeof client.createResolveContentAsset).toBe('function')
    expect(typeof client.setContentAssetMap).toBe('function')
    expect(typeof client.normalizeContentAssetRef).toBe('function')
    expect(
      Object.prototype.hasOwnProperty.call(client, 'Layout'),
    ).toBe(false)
  })
})
