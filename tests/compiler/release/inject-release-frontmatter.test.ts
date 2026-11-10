import { describe, expect, it } from 'vitest'
import { buildReleaseFrontmatterForPage } from '../../../src/compiler/release/inject-release-frontmatter'
import { asset, releaseDetailPage, zhMessages } from '../../helpers/release-fixtures'
import type { AssetManifest } from '../../../src/shared/asset-types'
import type { CompiledContentPackage, RouteContentPackage } from '../../../src/shared/types'

const pkg: RouteContentPackage = {
  dir: '/content/releases/demo',
  identity: 'release:demo',
  type: 'release',
  slug: 'demo',
  date: '2026-11-11',
  draft: false,
  tags: [],
  artwork: './artwork.webp',
  locales: {},
}

const compiledPackage: CompiledContentPackage = {
  dir: pkg.dir,
  identity: pkg.identity,
  manifest: {
    type: 'release',
    slug: 'demo',
    date: '2026-11-11',
    draft: false,
  },
  albumBySrc: {
    './album.yml': {
      title: 'Demo',
      covers: ['./cover.webp'],
      discs: [],
    },
  },
  players: [],
}

const assetManifest: AssetManifest = {
  assets: [asset('/artwork.hash.webp'), asset('/cover.hash.webp')],
  bySourcePath: {},
  contentPublicPaths: {
    'release:demo': {
      './artwork.webp': '/artwork.hash.webp',
      './cover.webp': '/cover.hash.webp',
    },
  },
  globalPublicPaths: {},
}

describe('buildReleaseFrontmatterForPage', () => {
  it('injects albumBySrc and the narrowed detail context', () => {
    const detail = releaseDetailPage({
      identity: 'release:demo',
      slug: 'demo',
    })
    const result = buildReleaseFrontmatterForPage({
      compiled: detail,
      allPages: [detail],
      packages: [pkg],
      compiledPackages: [compiledPackage],
      assetManifest,
      releaseOptions: {
        urlSegment: 'releases',
        index: { enabled: true, pagination: 12 },
      },
      showDrafts: false,
      mainLocale: 'zh',
      messages: zhMessages,
      collectionTitle: '作品',
      loadStrategy: 'viewport',
    })

    expect(result).toMatchObject({
      kind: 'detail',
      model: {
        locale: 'zh',
        mainLocale: 'zh',
        loadStrategy: 'viewport',
        albumBySrc: {
          './album.yml': { covers: ['/cover.hash.webp'] },
        },
      },
    })
    expect(result?.kind === 'detail' && 'book' in result.model).toBe(false)
  })

  it('returns null for non-release pages', () => {
    const page = { ...releaseDetailPage(), contentType: 'page' as const }
    expect(
      buildReleaseFrontmatterForPage({
        compiled: page,
        allPages: [page],
        packages: [],
        compiledPackages: [],
        assetManifest,
        releaseOptions: {
          urlSegment: 'releases',
          index: { enabled: true, pagination: 12 },
        },
        showDrafts: false,
        mainLocale: 'zh',
        messages: zhMessages,
        collectionTitle: '作品',
        loadStrategy: 'interaction',
      }),
    ).toBeNull()
  })
})
