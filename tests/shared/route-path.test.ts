import { describe, expect, it } from 'vitest'
import {
  joinPublicPath,
  normalizeBase,
  normalizePathSuffix,
} from '../../src/shared/route-path'

describe('normalizePathSuffix', () => {
  it('ensures a leading and trailing slash', () => {
    expect(normalizePathSuffix('releases/foo')).toBe('/releases/foo/')
    expect(normalizePathSuffix('/releases/foo/')).toBe('/releases/foo/')
    expect(normalizePathSuffix('/releases/foo')).toBe('/releases/foo/')
  })

  it('collapses the empty suffix to the root', () => {
    expect(normalizePathSuffix('')).toBe('/')
    expect(normalizePathSuffix('/')).toBe('/')
  })
})

describe('normalizeBase', () => {
  it('normalizes empty, bare, and unslashed bases', () => {
    expect(normalizeBase('')).toBe('/')
    expect(normalizeBase('/')).toBe('/')
    expect(normalizeBase('docs')).toBe('/docs/')
    expect(normalizeBase('/docs')).toBe('/docs/')
    expect(normalizeBase('/docs/')).toBe('/docs/')
  })
})

describe('joinPublicPath', () => {
  it('returns the route path unchanged for a root base', () => {
    expect(joinPublicPath('/', '/zh/news/')).toBe('/zh/news/')
  })

  it('prefixes a non-root base exactly once', () => {
    expect(joinPublicPath('/docs/', '/zh/news/')).toBe('/docs/zh/news/')
    expect(joinPublicPath('docs', '/zh/')).toBe('/docs/zh/')
  })
})
