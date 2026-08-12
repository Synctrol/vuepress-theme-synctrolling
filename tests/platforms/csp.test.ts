import { describe, expect, it } from 'vitest'
import {
  emptyCspJson,
  mergeCspDirectives,
  normalizeOrigin,
} from '../../src/platforms/csp'

describe('CSP helpers', () => {
  it('normalizes URLs to scheme+host(+non-default port) origins', () => {
    expect(normalizeOrigin('https://www.youtube.com/embed/abc')).toBe(
      'https://www.youtube.com',
    )
    expect(normalizeOrigin('https://player.bilibili.com')).toBe(
      'https://player.bilibili.com',
    )
    expect(normalizeOrigin('https://example.com:8443/path')).toBe(
      'https://example.com:8443',
    )
    expect(normalizeOrigin("'self'")).toBe("'self'")
    expect(normalizeOrigin('not a url')).toBe(undefined)
    expect(normalizeOrigin('http://insecure.example/x')).toBe(undefined)
  })

  it('merges and dedupes frame-src, media-src, and connect-src', () => {
    const merged = mergeCspDirectives([
      {
        'frame-src': ['https://www.youtube.com', 'https://player.bilibili.com'],
        'media-src': ["'self'"],
        'connect-src': [],
      },
      {
        'frame-src': ['https://www.youtube.com', 'https://open.spotify.com'],
        'media-src': ['https://cdn.example.com'],
        'connect-src': ['https://api.example.com'],
      },
    ])
    expect(merged).toEqual({
      'frame-src': [
        'https://www.youtube.com',
        'https://player.bilibili.com',
        'https://open.spotify.com',
      ],
      'media-src': ["'self'", 'https://cdn.example.com'],
      'connect-src': ['https://api.example.com'],
    })
  })

  it('starts from empty directive arrays', () => {
    expect(emptyCspJson()).toEqual({
      'frame-src': [],
      'media-src': [],
      'connect-src': [],
    })
  })
})
