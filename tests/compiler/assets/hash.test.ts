import { describe, expect, it } from 'vitest'
import { hashFileContents, insertContentHash } from '../../../src/compiler/assets/hash'

describe('hashFileContents', () => {
  it('returns a stable 8-character lowercase hex digest for the same bytes', () => {
    const a = hashFileContents(Buffer.from('synctrol-cover'))
    const b = hashFileContents(Buffer.from('synctrol-cover'))
    expect(a).toMatch(/^[0-9a-f]{8}$/)
    expect(a).toBe(b)
  })

  it('changes when file contents change', () => {
    const a = hashFileContents(Buffer.from('cover-a'))
    const b = hashFileContents(Buffer.from('cover-b'))
    expect(a).not.toBe(b)
  })
})

describe('insertContentHash', () => {
  it('inserts the hash before the final extension', () => {
    expect(insertContentHash('cover.webp', 'abcd1234')).toBe('cover.abcd1234.webp')
    expect(insertContentHash('logo.svg', 'deadbeef')).toBe('logo.deadbeef.svg')
  })

  it('retains nested relative directories', () => {
    expect(insertContentHash('covers/front.webp', 'abcd1234')).toBe(
      'covers/front.abcd1234.webp',
    )
  })

  it('handles multi-dot basenames by hashing only before the final extension', () => {
    expect(insertContentHash('archive.tar.gz', 'abcd1234')).toBe(
      'archive.tar.abcd1234.gz',
    )
  })
})
