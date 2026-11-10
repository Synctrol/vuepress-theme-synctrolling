import { describe, expect, it } from 'vitest'
import { buildReleaseFrontmatterForPage } from '../../../src/compiler/release/inject-release-frontmatter'
import { asset, releaseDetailPage, zhMessages } from '../../helpers/release-fixtures'
import type { AssetManifest } from '../../../src/shared/asset-types'
import type { CompiledContentPackage, RouteContentPackage } from '../../../src/shared/types'
import type { CompiledPage } from '../../../src/shared/route-types'

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

function collection(
  itemIdentities: CompiledPage['identity'][],
  overrides: Partial<CompiledPage> = {},
): CompiledPage {
  return {
    identity: 'release-index',
    locale: 'zh',
    contentType: 'release-collection',
    url: {
      routePath: '/zh/releases/',
      outputPath: 'zh/releases/index.html',
      publicPath: '/zh/releases/',
      absoluteUrl: 'https://synctrol.com/zh/releases/',
    },
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: 'zh',
    canonicalLocale: 'zh',
    title: '作品',
    collection: { page: 1, pageCount: 1, itemIdentities },
    ...overrides,
  }
}

const releaseOptions = {
  urlSegment: 'releases',
  index: { enabled: true, pagination: 12 },
} as const

describe('buildReleaseFrontmatterForPage', () => {
  it('builds index frontmatter from collection identity order', () => {
    const detail = releaseDetailPage({
      identity: 'release:demo',
      slug: 'demo',
      title: '演示专辑',
      url: {
        routePath: '/zh/releases/demo/',
        outputPath: 'zh/releases/demo/index.html',
        publicPath: '/zh/releases/demo/',
        absoluteUrl: 'https://synctrol.com/zh/releases/demo/',
      },
    })
    const index = collection(['release:demo'])
    const result = buildReleaseFrontmatterForPage({
      compiled: index,
      allPages: [index, detail],
      packages: [pkg],
      compiledPackages: [compiledPackage],
      assetManifest,
      releaseOptions,
      showDrafts: false,
      mainLocale: 'zh',
      messages: zhMessages,
      collectionTitle: '作品',
      loadStrategy: 'interaction',
    })

    expect(result).toMatchObject({
      kind: 'index',
      collectionTitle: '作品',
      prevHref: null,
      nextHref: null,
      model: {
        tiles: [
          {
            slug: 'demo',
            title: '演示专辑',
            href: '/zh/releases/demo/',
            artworkKind: 'artwork',
          },
        ],
      },
    })
  })

  it('isolates index tiles and pagination links by locale', () => {
    const zhDetail = releaseDetailPage({
      identity: 'release:demo',
      slug: 'demo',
      title: '演示专辑',
      url: {
        routePath: '/zh/releases/demo/',
        outputPath: 'zh/releases/demo/index.html',
        publicPath: '/zh/releases/demo/',
        absoluteUrl: 'https://synctrol.com/zh/releases/demo/',
      },
    })
    const enDetail = releaseDetailPage({
      identity: 'release:demo',
      locale: 'en',
      slug: 'demo',
      title: 'Demo Album',
      bodyLocale: 'en',
      canonicalLocale: 'en',
      url: {
        routePath: '/en/releases/demo/',
        outputPath: 'en/releases/demo/index.html',
        publicPath: '/en/releases/demo/',
        absoluteUrl: 'https://synctrol.com/en/releases/demo/',
      },
    })
    const page1 = collection(['release:demo'], {
      collection: {
        page: 1,
        pageCount: 2,
        itemIdentities: ['release:demo'],
      },
    })
    const page2 = collection([], {
      identity: 'release-index:2',
      url: {
        routePath: '/zh/releases/page/2/',
        outputPath: 'zh/releases/page/2/index.html',
        publicPath: '/zh/releases/page/2/',
        absoluteUrl: 'https://synctrol.com/zh/releases/page/2/',
      },
      collection: { page: 2, pageCount: 2, itemIdentities: [] },
    })
    const enPage2 = collection([], {
      identity: 'release-index:en:2',
      locale: 'en',
      url: {
        routePath: '/en/releases/page/2/',
        outputPath: 'en/releases/page/2/index.html',
        publicPath: '/en/releases/page/2/',
        absoluteUrl: 'https://synctrol.com/en/releases/page/2/',
      },
      collection: { page: 2, pageCount: 2, itemIdentities: [] },
    })
    const result = buildReleaseFrontmatterForPage({
      compiled: page1,
      allPages: [page1, zhDetail, enDetail, enPage2, page2],
      packages: [pkg],
      compiledPackages: [compiledPackage],
      assetManifest,
      releaseOptions,
      showDrafts: false,
      mainLocale: 'zh',
      messages: zhMessages,
      collectionTitle: '作品',
      loadStrategy: 'interaction',
    })

    expect(result?.kind).toBe('index')
    if (result?.kind === 'index') {
      expect(result.model.tiles).toHaveLength(1)
      expect(result.model.tiles[0].href).toBe('/zh/releases/demo/')
      expect(result.model.tiles[0].title).toBe('演示专辑')
      expect(result.nextHref).toBe('/zh/releases/page/2/')
      expect(result.prevHref).toBeNull()
    }
  })

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
      releaseOptions,
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
        releaseOptions,
        showDrafts: false,
        mainLocale: 'zh',
        messages: zhMessages,
        collectionTitle: '作品',
        loadStrategy: 'interaction',
      }),
    ).toBeNull()
  })
})
