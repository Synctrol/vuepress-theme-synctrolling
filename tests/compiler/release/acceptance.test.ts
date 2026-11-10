import { describe, expect, it } from 'vitest'
import { selectReleaseImageRoles } from '../../../src/shared/release/image-roles'
import { buildReleaseIndexModel } from '../../../src/compiler/release/list-model'
import { buildReleaseDetailModel } from '../../../src/compiler/release/detail-model'
import {
  asset,
  releaseCollectionPage,
  releaseDetailPage,
  zhMessages,
} from '../../helpers/release-fixtures'
import type { RouteContentPackage } from '../../../src/shared/types'
import type { CompiledPage } from '../../../src/shared/route-types'

describe('release acceptance', () => {
  const releaseOptions = {
    urlSegment: 'releases',
    index: {
      enabled: true,
      pagination: 2,
    },
    artworkPlaceholder: './assets/placeholder.webp',
  } as const

  it('keeps cover, artwork, and album metadata cover roles independent', () => {
    const roles = selectReleaseImageRoles({
      cover: './assets/article-cover.webp',
      artwork: './assets/album-entry.webp',
    })

    expect(roles.cover).toBe('./assets/article-cover.webp')
    expect(roles.artwork).toBe('./assets/album-entry.webp')
    expect(roles.albumCovers).toEqual([])
  })

  it('builds a paginated index preserving identity order and image roles', () => {
    const pkgs: RouteContentPackage[] = [
      {
        dir: '/content/releases/a',
        identity: 'release:a',
        type: 'release',
        slug: 'a',
        date: '2026-08-13',
        draft: false,
        tags: [],
        artwork: './assets/a.webp',
        locales: {},
      },
      {
        dir: '/content/releases/b',
        identity: 'release:b',
        type: 'release',
        slug: 'b',
        date: '2026-08-12',
        draft: false,
        tags: [],
        cover: './assets/b-cover.webp',
        locales: {},
      },
      {
        dir: '/content/releases/c',
        identity: 'release:c',
        type: 'release',
        slug: 'c',
        date: '2026-08-11',
        draft: true,
        tags: [],
        artwork: './assets/c.webp',
        locales: {},
      },
    ]
    const details: CompiledPage[] = [
      releaseDetailPage({
        identity: 'release:a',
        slug: 'a',
        title: 'A',
        url: {
          routePath: '/zh/releases/a/',
          outputPath: 'zh/releases/a/index.html',
          publicPath: '/zh/releases/a/',
          absoluteUrl: 'https://synctrol.com/zh/releases/a/',
        },
      }),
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
      releaseDetailPage({
        identity: 'release:c',
        slug: 'c',
        title: 'C',
        isDraft: true,
        noindex: true,
        url: {
          routePath: '/zh/releases/c/',
          outputPath: 'zh/releases/c/index.html',
          publicPath: '/zh/releases/c/',
          absoluteUrl: 'https://synctrol.com/zh/releases/c/',
        },
      }),
    ]
    const indexPage = releaseCollectionPage({
      collection: {
        page: 1,
        pageCount: 2,
        itemIdentities: ['release:a', 'release:b'],
      },
    })
    const page1 = buildReleaseIndexModel({
      collectionPage: indexPage,
      detailPages: details,
      packages: pkgs,
      releaseOptions: { ...releaseOptions },
      resolveArtwork: (pkg) =>
        pkg.artwork ? asset(`/assets/${pkg.slug}.webp`) : undefined,
      resolvePlaceholder: () => asset('/assets/global/placeholder.webp'),
      showDrafts: true,
    })

    expect(page1!.pageCount).toBe(2)
    expect(page1!.tiles.map((tile) => tile.slug)).toEqual(['a', 'b'])
    expect(page1!.tiles.every((tile) => tile.showDate === false)).toBe(true)
    expect(page1!.tiles.every((tile) => tile.showDescription === false)).toBe(
      true,
    )
    expect(page1!.tiles[1].artworkKind).toBe('placeholder')
    expect(page1!.tiles[1].artwork?.publicPath).not.toContain('b-cover')

    const disabled = buildReleaseIndexModel({
      collectionPage: indexPage,
      detailPages: details,
      packages: pkgs,
      releaseOptions: {
        ...releaseOptions,
        index: { ...releaseOptions.index, enabled: false },
      },
      resolveArtwork: () => undefined,
      resolvePlaceholder: () => undefined,
      showDrafts: true,
    })
    expect(disabled).toBeNull()
  })

  it('uses src-keyed album metadata and excludes legacy book/platform catalogs', () => {
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
    const model = buildReleaseDetailModel({
      page: releaseDetailPage({ identity: 'release:demo', slug: 'demo' }),
      pkg,
      albumBySrc: {
        './album.yml': {
          title: 'Demo',
          copyright: '© 2026 Synctrol',
          credit: { producer: 'Synctrol' },
          covers: ['./album-cover.webp'],
          discs: [],
        },
      },
      messages: zhMessages,
      mainLocale: 'zh',
      loadStrategy: 'interaction',
      resolveArtwork: () => asset('/artwork.webp'),
      resolveAlbumCover: (path) => asset(path),
      resolvePlaceholder: () => undefined,
      showDrafts: false,
    })

    expect(model.albumBySrc['./album.yml']).toMatchObject({
      title: 'Demo',
      credit: { producer: 'Synctrol' },
      covers: ['./album-cover.webp'],
    })
    expect(model.artwork.artwork?.publicPath).toBe('/artwork.webp')
    expect(model.albumBySrc['./album.yml'].covers[0]).not.toBe(
      model.artwork.artwork?.publicPath,
    )
    expect('book' in model).toBe(false)
    expect('definitions' in model).toBe(false)
    expect('platformTypes' in model).toBe(false)
  })

  it('keeps markdown-only draft details and placeholder behavior', () => {
    const model = buildReleaseDetailModel({
      page: releaseDetailPage({ title: 'Note', isDraft: true }),
      pkg: {
        dir: '/content/releases/note',
        identity: 'release:note',
        type: 'release',
        slug: 'note',
        date: '2026-08-11',
        draft: true,
        tags: [],
        locales: {},
      },
      albumBySrc: {},
      messages: zhMessages,
      mainLocale: 'zh',
      loadStrategy: 'viewport',
      resolveArtwork: () => undefined,
      resolveAlbumCover: () => {
        throw new Error('no album covers')
      },
      resolvePlaceholder: () => asset('/placeholder.webp'),
      showDrafts: true,
    })

    expect(model.albumBySrc).toEqual({})
    expect(model.includedInIndex).toBe(true)
    expect(model.showDraftBadge).toBe(true)
    expect(model.artwork.kind).toBe('placeholder')
  })
})
