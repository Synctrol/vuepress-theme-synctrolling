import { describe, expect, it } from 'vitest'
import { resolveBackgroundContentType } from '../../../src/client/background/resolve-type'

describe('resolveBackgroundContentType', () => {
  it('maps home, release, news, and page detail types to themselves', () => {
    expect(resolveBackgroundContentType('home')).toBe('home')
    expect(resolveBackgroundContentType('release')).toBe('release')
    expect(resolveBackgroundContentType('news')).toBe('news')
    expect(resolveBackgroundContentType('page')).toBe('page')
  })

  it('maps release collection pages to release', () => {
    expect(resolveBackgroundContentType('release-collection')).toBe('release')
  })

  it('maps news collection and tag archive pages to news', () => {
    expect(resolveBackgroundContentType('news-collection')).toBe('news')
  })
})
