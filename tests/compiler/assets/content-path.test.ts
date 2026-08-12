import { describe, expect, it } from 'vitest'
import { buildContentAssetPath } from '../../../src/compiler/assets/content-path'

describe('buildContentAssetPath', () => {
  it('emits typed content paths with slug and content hash', () => {
    expect(
      buildContentAssetPath({
        type: 'release',
        slug: 'first-release',
        packageRelativeAsset: 'assets/cover.webp',
        contentHash: 'abcd1234',
      }),
    ).toBe('/assets/content/release/first-release/cover.abcd1234.webp')
  })

  it('emits Home paths without a slug segment', () => {
    expect(
      buildContentAssetPath({
        type: 'home',
        slug: null,
        packageRelativeAsset: 'assets/logo.svg',
        contentHash: 'deadbeef',
      }),
    ).toBe('/assets/content/home/logo.deadbeef.svg')
  })

  it('retains nested paths under the package assets directory', () => {
    expect(
      buildContentAssetPath({
        type: 'news',
        slug: 'hello',
        packageRelativeAsset: 'assets/covers/front.webp',
        contentHash: 'aabbccdd',
      }),
    ).toBe('/assets/content/news/hello/covers/front.aabbccdd.webp')
  })

  it('accepts refs that already omit a leading ./', () => {
    expect(
      buildContentAssetPath({
        type: 'page',
        slug: 'team',
        packageRelativeAsset: './assets/banner.webp',
        contentHash: '11223344',
      }),
    ).toBe('/assets/content/page/team/banner.11223344.webp')
  })
})
