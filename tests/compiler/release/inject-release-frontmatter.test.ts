import { describe, expect, it } from 'vitest'
import { buildReleaseFrontmatterForPage } from '../../../src/compiler/release/inject-release-frontmatter'
import {
  albumBook,
  asset,
  releaseDetailPage,
  zhMessages,
} from '../../helpers/release-fixtures'
import type { AssetManifest } from '../../../src/shared/asset-types'
import type { CompiledContentPackage, RouteContentPackage } from '../../../src/shared/types'
import type { CompiledPage } from '../../../src/shared/route-types'

const releaseOptions = {
  urlSegment: 'releases',
  index: {
    enabled: true,
    pagination: 12,
    mobileGridColumns: 2,
    desktopGridColumns: 3,
  },
} as const

function collection(
  itemIdentities: CompiledPage['identity'][],
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
    title: 'release-index',
    collection: { page: 1, pageCount: 1, itemIdentities: itemIdentities as never },
  }
}

describe('buildReleaseFrontmatterForPage', () => {
  it('builds index payload from collection page and trusts itemIdentities order', () => {
    const detail = releaseDetailPage({
      identity: 'release:first-release',
      slug: 'first-release',
      title: '第一张专辑',
    })
    const pkg: RouteContentPackage = {
      dir: '/content/releases/first-release',
      identity: 'release:first-release',
      type: 'release',
      slug: 'first-release',
      date: '2026-08-11',
      draft: false,
      tags: [],
      artwork: './assets/album-entry.webp',
      locales: {},
    }
    const manifest: AssetManifest = {
      assets: [
        asset('/assets/content/release/first-release/album-entry.hash.webp'),
      ],
      bySourcePath: {},
      contentPublicPaths: {
        'release:first-release': {
          './assets/album-entry.webp':
            '/assets/content/release/first-release/album-entry.hash.webp',
        },
      },
      globalPublicPaths: {},
    }

    const result = buildReleaseFrontmatterForPage({
      compiled: collection(['release:first-release']),
      allPages: [collection(['release:first-release']), detail],
      packages: [pkg],
      compiledPackages: [
        {
          dir: pkg.dir,
          identity: pkg.identity,
          manifest: {
            type: 'release',
            slug: 'first-release',
            date: '2026-08-11',
            draft: false,
          },
          book: albumBook(),
        } as CompiledContentPackage,
      ],
      assetManifest: manifest,
      releaseOptions,
      showDrafts: false,
      mainLocale: 'zh',
      messages: zhMessages,
      collectionTitle: '作品',
      formatDate: (d) => d,
      releaseIndexHrefForLocale: () => '/zh/releases/',
    })

    expect(result).toMatchObject({ kind: 'index' })
    if (result?.kind === 'index') {
      expect(result.model.tiles).toHaveLength(1)
      expect(result.model.tiles[0].artwork?.publicPath).toContain('album-entry')
      expect(result.collectionTitle).toBe('作品')
    }
  })

  it('looks up book from compiledPackages for detail pages', () => {
    const detail = releaseDetailPage()
    const pkg: RouteContentPackage = {
      dir: '/content/releases/first-release',
      identity: 'release:first-release',
      type: 'release',
      slug: 'first-release',
      date: '2026-08-11',
      draft: false,
      tags: [],
      artwork: './assets/album-entry.webp',
      locales: {},
    }
    const compiledPkg: CompiledContentPackage = {
      dir: pkg.dir,
      identity: pkg.identity,
      manifest: {
        type: 'release',
        slug: 'first-release',
        date: '2026-08-11',
        draft: false,
      },
      book: albumBook(),
    }
    const manifest: AssetManifest = {
      assets: [
        asset('/assets/content/release/first-release/album-entry.hash.webp'),
        asset('/assets/content/release/first-release/front.hash.webp'),
        asset('/assets/content/release/first-release/back.hash.webp'),
      ],
      bySourcePath: {},
      contentPublicPaths: {
        'release:first-release': {
          './assets/album-entry.webp':
            '/assets/content/release/first-release/album-entry.hash.webp',
          './assets/front.webp':
            '/assets/content/release/first-release/front.hash.webp',
          './assets/back.webp':
            '/assets/content/release/first-release/back.hash.webp',
        },
      },
      globalPublicPaths: {},
    }

    const result = buildReleaseFrontmatterForPage({
      compiled: detail,
      allPages: [detail],
      packages: [pkg],
      compiledPackages: [compiledPkg],
      assetManifest: manifest,
      releaseOptions,
      showDrafts: false,
      mainLocale: 'zh',
      messages: zhMessages,
      collectionTitle: '作品',
      formatDate: (d) => d,
      releaseIndexHrefForLocale: () => '/zh/releases/',
    })

    expect(result?.kind).toBe('detail')
    if (result?.kind === 'detail') {
      expect(result.model.sections.map((s) => s.kind)).toContain('album-body')
      expect(result.model.sections.find((s) => s.kind === 'markdown')).toEqual({
        kind: 'markdown',
        bodyLang: 'zh',
      })
    }
  })

  it('returns null for non-release pages', () => {
    const home: CompiledPage = {
      identity: 'home',
      locale: 'zh',
      contentType: 'home',
      url: {
        routePath: '/zh/',
        outputPath: 'zh/index.html',
        publicPath: '/zh/',
        absoluteUrl: 'https://synctrol.com/zh/',
      },
      isFallback: false,
      isDraft: false,
      noindex: false,
      bodyLocale: 'zh',
      canonicalLocale: 'zh',
      title: '首页',
    }
    expect(
      buildReleaseFrontmatterForPage({
        compiled: home,
        allPages: [home],
        packages: [],
        compiledPackages: [],
        assetManifest: {
          assets: [],
          bySourcePath: {},
          contentPublicPaths: {},
          globalPublicPaths: {},
        },
        releaseOptions,
        showDrafts: false,
        mainLocale: 'zh',
        messages: zhMessages,
        collectionTitle: '作品',
        formatDate: (d) => d,
        releaseIndexHrefForLocale: () => '/zh/releases/',
      }),
    ).toBeNull()
  })
})
