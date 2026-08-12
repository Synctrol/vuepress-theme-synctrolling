import { describe, expect, it } from 'vitest'
import { resolveOgImage } from '../../../src/compiler/seo/resolve-og-image.js'
import { page, seoContentContext, url } from '../../helpers/seo-fixtures.js'

const assets = seoContentContext({
  assets: {
    defaultImageAbsoluteUrl: 'https://synctrol.com/assets/global/social-default.hash.webp',
    organizationLogoAbsoluteUrl: 'https://synctrol.com/assets/global/logo.hash.svg',
    coverAbsoluteUrlByPackagePath: new Map([['/site/content/releases/first', 'https://synctrol.com/assets/content/release/first/cover.hash.webp']]),
  },
}).assets

describe('resolveOgImage', () => {
  it('uses cover for content detail pages, default image otherwise, and never uses artwork', () => {
    expect(resolveOgImage(page({ identity: 'release:first', locale: 'zh', contentType: 'release', packagePath: '/site/content/releases/first', url: url('https://synctrol.com/zh/releases/first/') }), assets)).toBe('https://synctrol.com/assets/content/release/first/cover.hash.webp')
    expect(resolveOgImage(page({ identity: 'home', locale: 'zh', contentType: 'home', packagePath: '/site/content/home', url: url('https://synctrol.com/zh/') }), assets)).toBe('https://synctrol.com/assets/global/social-default.hash.webp')
    expect(resolveOgImage(page({ identity: 'release:no-cover', locale: 'en', contentType: 'release', packagePath: '/site/content/releases/no-cover', url: url('https://synctrol.com/en/releases/no-cover/') }), assets)).toBe('https://synctrol.com/assets/global/social-default.hash.webp')
  })
})
