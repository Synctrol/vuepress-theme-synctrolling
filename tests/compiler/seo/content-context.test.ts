import { describe, expect, it } from 'vitest'
import { buildSeoContentContext } from '../../../src/compiler/seo/content-context.js'
import type { AssetManifest } from '../../../src/shared/asset-types.js'
import type { AlbumBook, CompiledContentPackage, RouteContentPackage } from '../../../src/shared/types.js'
import { definitions, resolvedOptions } from '../../helpers/seo-fixtures.js'

const album: AlbumBook = { type: 'album', title: 'Album', album: { discs: [] } }

const assetManifest: AssetManifest = {
  assets: [
    { kind: 'global', sourcePath: '/site/.vuepress/assets/social.webp', assetPath: '/assets/global/social.11111111.webp', publicPath: '/assets/global/social.11111111.webp', absoluteUrl: 'https://synctrol.com/assets/global/social.11111111.webp', contentHash: '11111111' },
    { kind: 'global', sourcePath: '/site/.vuepress/assets/logo.svg', assetPath: '/assets/global/logo.22222222.svg', publicPath: '/assets/global/logo.22222222.svg', absoluteUrl: 'https://synctrol.com/assets/global/logo.22222222.svg', contentHash: '22222222' },
    { kind: 'content', sourcePath: '/site/content/releases/first/assets/cover.webp', assetPath: '/assets/content/release/first/cover.33333333.webp', publicPath: '/assets/content/release/first/cover.33333333.webp', absoluteUrl: 'https://synctrol.com/assets/content/release/first/cover.33333333.webp', contentHash: '33333333' },
  ],
  bySourcePath: {},
  globalPublicPaths: {
    './assets/social-default.webp': '/assets/global/social.11111111.webp',
    './assets/logo.svg': '/assets/global/logo.22222222.svg',
  },
  contentPublicPaths: {
    'release:first': {
      './assets/cover.webp': '/assets/content/release/first/cover.33333333.webp',
    },
  },
}

const packages: RouteContentPackage[] = [
  { dir: '/site/content/releases/first', identity: 'release:first', type: 'release', slug: 'first', date: '2026-08-05', draft: false, tags: [], cover: './assets/cover.webp', locales: {} },
  { dir: '/site/content/news/launch', identity: 'news:launch', type: 'news', slug: 'launch', date: '2026-08-11', updated: '2026-08-12', draft: false, tags: ['release'], cover: 'https://cdn.synctrol.com/news.webp', locales: {} },
]

const compiledPackages: CompiledContentPackage[] = [
  { dir: '/site/content/releases/first', identity: 'release:first', manifest: { type: 'release', draft: false, slug: 'first', date: '2026-08-05', cover: './assets/cover.webp' }, book: album },
]

describe('buildSeoContentContext', () => {
  it('maps packages, books, dates, updated dates, covers, default image, and org logo', () => {
    const context = buildSeoContentContext({ assetManifest, packages, compiledPackages, definitions: definitions(), options: resolvedOptions() })
    expect(context.assets.defaultImageAbsoluteUrl).toBe('https://synctrol.com/assets/global/social.11111111.webp')
    expect(context.assets.organizationLogoAbsoluteUrl).toBe('https://synctrol.com/assets/global/logo.22222222.svg')
    expect(context.assets.coverAbsoluteUrlByPackagePath.get('/site/content/releases/first')).toBe('https://synctrol.com/assets/content/release/first/cover.33333333.webp')
    expect(context.assets.coverAbsoluteUrlByPackagePath.get('/site/content/news/launch')).toBe('https://cdn.synctrol.com/news.webp')
    expect(context.bookByPackagePath.get('/site/content/releases/first')).toBe(album)
    expect(context.dateByPackagePath.get('/site/content/news/launch')).toBe('2026-08-11')
    expect(context.updatedByPackagePath.get('/site/content/news/launch')).toBe('2026-08-12')
    expect(context.definitions.platforms).toEqual({})
  })

  it('converts root-absolute default assets using siteUrl', () => {
    const context = buildSeoContentContext({
      assetManifest: { ...assetManifest, globalPublicPaths: {} },
      packages: [],
      compiledPackages: [],
      definitions: definitions(),
      options: resolvedOptions({ seo: { ...resolvedOptions().seo, defaultImage: '/images/og.png', organization: { name: 'Synctrol', logo: '/images/logo.png' } } }),
    })
    expect(context.assets.defaultImageAbsoluteUrl).toBe('https://synctrol.com/images/og.png')
    expect(context.assets.organizationLogoAbsoluteUrl).toBe('https://synctrol.com/images/logo.png')
  })
})
