import { describe, expect, it } from 'vitest'
import {
  buildAssetAbsoluteUrl,
  buildAssetPublicPath,
} from '../../../src/compiler/assets/emit-url'

describe('buildAssetPublicPath', () => {
  it('applies root VuePress base', () => {
    expect(
      buildAssetPublicPath('/assets/content/release/first/cover.abcd1234.webp', '/'),
    ).toBe('/assets/content/release/first/cover.abcd1234.webp')
  })

  it('applies a non-root VuePress base', () => {
    expect(
      buildAssetPublicPath(
        '/assets/content/home/logo.abcd1234.svg',
        '/docs/',
      ),
    ).toBe('/docs/assets/content/home/logo.abcd1234.svg')
  })

  it('never inserts a locale segment', () => {
    const publicPath = buildAssetPublicPath(
      '/assets/global/social-default.abcd1234.webp',
      '/site/',
    )
    expect(publicPath).toBe('/site/assets/global/social-default.abcd1234.webp')
    expect(publicPath).not.toMatch(/\/zh\//)
    expect(publicPath).not.toMatch(/\/en\//)
  })
})

describe('buildAssetAbsoluteUrl', () => {
  it('joins siteUrl origin with the public path', () => {
    expect(
      buildAssetAbsoluteUrl(
        '/assets/theme/grid.abcd1234.svg',
        'https://synctrol.com',
      ),
    ).toBe('https://synctrol.com/assets/theme/grid.abcd1234.svg')
  })

  it('keeps a non-root base inside the absolute URL', () => {
    expect(
      buildAssetAbsoluteUrl(
        '/docs/assets/global/logo.abcd1234.svg',
        'https://example.com',
      ),
    ).toBe('https://example.com/docs/assets/global/logo.abcd1234.svg')
  })

  it('normalizes a trailing slash on siteUrl via assertSiteUrl', () => {
    expect(
      buildAssetAbsoluteUrl(
        '/assets/theme/grid.abcd1234.svg',
        'https://synctrol.com/',
      ),
    ).toBe('https://synctrol.com/assets/theme/grid.abcd1234.svg')
  })
})
