import { describe, expect, it } from 'vitest'
import { AssetRegistry } from '../../../src/compiler/assets/registry'
import type { ResolvedAsset } from '../../../src/shared/asset-types'

function asset(partial: Partial<ResolvedAsset> & Pick<ResolvedAsset, 'sourcePath' | 'publicPath'>): ResolvedAsset {
  return {
    kind: 'content',
    assetPath: partial.publicPath,
    absoluteUrl: `https://synctrol.com${partial.publicPath}`,
    contentHash: 'abcd1234',
    ...partial,
  }
}

describe('AssetRegistry', () => {
  it('registers by source path and package-relative ref', () => {
    const registry = new AssetRegistry()
    registry.registerContent('release:first-release', './assets/cover.webp', asset({
      sourcePath: '/content/releases/first-release/assets/cover.webp',
      publicPath: '/assets/content/release/first-release/cover.abcd1234.webp',
    }))
    expect(
      registry.getContentPublicPath('release:first-release', './assets/cover.webp'),
    ).toBe('/assets/content/release/first-release/cover.abcd1234.webp')
    expect(
      registry.getBySource('/content/releases/first-release/assets/cover.webp')
        ?.publicPath,
    ).toBe('/assets/content/release/first-release/cover.abcd1234.webp')
  })

  it('normalizes ./ prefix when looking up content refs', () => {
    const registry = new AssetRegistry()
    registry.registerContent('home', 'assets/logo.svg', asset({
      kind: 'content',
      sourcePath: '/content/home/assets/logo.svg',
      publicPath: '/assets/content/home/logo.abcd1234.svg',
    }))
    expect(registry.getContentPublicPath('home', './assets/logo.svg')).toBe(
      '/assets/content/home/logo.abcd1234.svg',
    )
  })
})
