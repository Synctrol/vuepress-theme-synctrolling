import { describe, expect, it, vi } from 'vitest'
import { buildReleaseIndexModel } from '../../../src/compiler/release/list-model'
import type { RouteContentPackage } from '../../../src/shared/types'
import type { CompiledPage } from '../../../src/shared/route-types'
import { asset, releaseDetailPage } from '../../helpers/release-fixtures'

function releasePkg(
  partial: Partial<RouteContentPackage> & { slug: string; date: string },
): RouteContentPackage {
  return {
    dir: `/content/releases/${partial.slug}`,
    identity: `release:${partial.slug}`,
    draft: false,
    tags: [],
    locales: {},
    ...partial,
    type: 'release',
  }
}

function collectionPage(
  itemIdentities: CompiledPage['identity'][],
  page = 1,
  pageCount = 1,
): CompiledPage {
  return {
    identity: page === 1 ? 'release-index' : `release-page:${page}`,
    locale: 'zh',
    contentType: 'release-collection',
    url: {
      routePath: page === 1 ? '/zh/releases/' : `/zh/releases/page/${page}/`,
      outputPath:
        page === 1
          ? 'zh/releases/index.html'
          : `zh/releases/page/${page}/index.html`,
      publicPath: page === 1 ? '/zh/releases/' : `/zh/releases/page/${page}/`,
      absoluteUrl:
        page === 1
          ? 'https://synctrol.com/zh/releases/'
          : `https://synctrol.com/zh/releases/page/${page}/`,
    },
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: 'zh',
    canonicalLocale: 'zh',
    title: 'release-index',
    collection: {
      page,
      pageCount,
      itemIdentities: itemIdentities as NonNullable<
        CompiledPage['collection']
      >['itemIdentities'],
    },
  }
}

describe('buildReleaseIndexModel', () => {
  const resolveArtwork = vi.fn((pkg: RouteContentPackage) =>
    pkg.artwork
      ? asset(
          `/assets/content/release/${pkg.slug}/${pkg.artwork.replace('./assets/', '')}`,
        )
      : undefined,
  )
  const resolvePlaceholder = vi.fn(() =>
    asset('/assets/global/placeholder.hash.webp'),
  )

  it('returns null when release.index.enabled is false', () => {
    const model = buildReleaseIndexModel({
      collectionPage: collectionPage(['release:a']),
      detailPages: [
        releaseDetailPage({ identity: 'release:a', slug: 'a', title: 'A' }),
      ],
      packages: [releasePkg({ slug: 'a', date: '2026-08-11', artwork: './assets/a.webp' })],
      releaseOptions: {
        urlSegment: 'releases',
        index: {
          enabled: false,
          pagination: 12,
          mobileGridColumns: 2,
          desktopGridColumns: 3,
        },
      },
      resolveArtwork,
      resolvePlaceholder,
      showDrafts: false,
    })
    expect(model).toBeNull()
  })

  it('preserves Plan 03 itemIdentities order (does not re-sort by date)', () => {
    // Plan 03 already sorted date-desc; feed a deliberate order and require preservation.
    const model = buildReleaseIndexModel({
      collectionPage: collectionPage(['release:newer', 'release:older']),
      detailPages: [
        releaseDetailPage({
          identity: 'release:older',
          slug: 'older',
          title: 'Older',
          description: 'Should not appear under tile',
          url: {
            routePath: '/zh/releases/older/',
            outputPath: 'zh/releases/older/index.html',
            publicPath: '/zh/releases/older/',
            absoluteUrl: 'https://synctrol.com/zh/releases/older/',
          },
        }),
        releaseDetailPage({
          identity: 'release:newer',
          slug: 'newer',
          title: 'Newer',
          description: 'Also hidden',
          url: {
            routePath: '/zh/releases/newer/',
            outputPath: 'zh/releases/newer/index.html',
            publicPath: '/zh/releases/newer/',
            absoluteUrl: 'https://synctrol.com/zh/releases/newer/',
          },
        }),
      ],
      packages: [
        releasePkg({
          slug: 'older',
          date: '2026-08-10',
          artwork: './assets/old.webp',
          cover: './assets/old-cover.webp',
        }),
        releasePkg({
          slug: 'newer',
          date: '2026-08-11',
          artwork: './assets/new.webp',
        }),
      ],
      releaseOptions: {
        urlSegment: 'releases',
        index: {
          enabled: true,
          pagination: 12,
          mobileGridColumns: 2,
          desktopGridColumns: 3,
        },
      },
      resolveArtwork,
      resolvePlaceholder,
      showDrafts: false,
    })
    expect(model).not.toBeNull()
    expect(model!.tiles.map((t) => t.slug)).toEqual(['newer', 'older'])
    expect(model!.tiles[0]).toMatchObject({
      title: 'Newer',
      href: '/zh/releases/newer/',
      showDate: false,
      showDescription: false,
    })
    expect(model!.tiles[0].date).toBe('2026-08-11')
    expect(model!.mobileGridColumns).toBe(2)
    expect(model!.desktopGridColumns).toBe(3)
  })

  it('uses artworkPlaceholder or empty frame, never cover, when artwork is missing', () => {
    const withPlaceholder = buildReleaseIndexModel({
      collectionPage: collectionPage(['release:a']),
      detailPages: [
        releaseDetailPage({ identity: 'release:a', slug: 'a', title: 'A' }),
      ],
      packages: [
        releasePkg({
          slug: 'a',
          date: '2026-08-11',
          cover: './assets/cover.webp',
        }),
      ],
      releaseOptions: {
        urlSegment: 'releases',
        index: {
          enabled: true,
          pagination: 12,
          mobileGridColumns: 2,
          desktopGridColumns: 3,
        },
        artworkPlaceholder: './assets/placeholder.webp',
      },
      resolveArtwork,
      resolvePlaceholder,
      showDrafts: false,
    })
    expect(withPlaceholder!.tiles[0].artworkKind).toBe('placeholder')
    expect(withPlaceholder!.tiles[0].artwork?.publicPath).toContain('placeholder')
    expect(withPlaceholder!.tiles[0].artwork?.publicPath).not.toContain('cover')

    const emptyFrame = buildReleaseIndexModel({
      collectionPage: collectionPage(['release:a']),
      detailPages: [
        releaseDetailPage({ identity: 'release:a', slug: 'a', title: 'A' }),
      ],
      packages: [
        releasePkg({ slug: 'a', date: '2026-08-11', cover: './assets/cover.webp' }),
      ],
      releaseOptions: {
        urlSegment: 'releases',
        index: {
          enabled: true,
          pagination: 12,
          mobileGridColumns: 2,
          desktopGridColumns: 3,
        },
      },
      resolveArtwork,
      resolvePlaceholder: () => undefined,
      showDrafts: false,
    })
    expect(emptyFrame!.tiles[0].artworkKind).toBe('empty-frame')
    expect(emptyFrame!.tiles[0].artwork).toBeUndefined()
  })

  it('marks draft tiles when showDrafts made them visible', () => {
    const model = buildReleaseIndexModel({
      collectionPage: collectionPage(['release:secret']),
      detailPages: [
        releaseDetailPage({
          identity: 'release:secret',
          slug: 'secret',
          title: 'Secret',
          isDraft: true,
          noindex: true,
        }),
      ],
      packages: [
        releasePkg({
          slug: 'secret',
          date: '2026-08-11',
          draft: true,
          artwork: './assets/s.webp',
        }),
      ],
      releaseOptions: {
        urlSegment: 'releases',
        index: {
          enabled: true,
          pagination: 12,
          mobileGridColumns: 2,
          desktopGridColumns: 3,
        },
      },
      resolveArtwork,
      resolvePlaceholder,
      showDrafts: true,
    })
    expect(model!.tiles[0].isDraft).toBe(true)
    expect(model!.tiles[0].showDraftBadge).toBe(true)
  })

  it('honors collection page slice from route compiler pagination', () => {
    const model = buildReleaseIndexModel({
      collectionPage: collectionPage(['release:b'], 2, 2),
      detailPages: [
        releaseDetailPage({ identity: 'release:a', slug: 'a', title: 'A' }),
        releaseDetailPage({
          identity: 'release:b',
          slug: 'b',
          title: 'B',
          url: {
            routePath: '/zh/releases/b/',
            outputPath: 'zh/releases/b/index.html',
            publicPath: '/zh/releases/b/',
            absoluteUrl: 'https://synctrol.com/zh/releases/b/',
          },
        }),
      ],
      packages: [
        releasePkg({ slug: 'a', date: '2026-08-12', artwork: './assets/a.webp' }),
        releasePkg({ slug: 'b', date: '2026-08-11', artwork: './assets/b.webp' }),
      ],
      releaseOptions: {
        urlSegment: 'releases',
        index: {
          enabled: true,
          pagination: 1,
          mobileGridColumns: 2,
          desktopGridColumns: 4,
        },
      },
      resolveArtwork,
      resolvePlaceholder,
      showDrafts: false,
    })
    expect(model!.page).toBe(2)
    expect(model!.pageCount).toBe(2)
    expect(model!.tiles).toHaveLength(1)
    expect(model!.tiles[0].slug).toBe('b')
    expect(model!.desktopGridColumns).toBe(4)
  })
})
