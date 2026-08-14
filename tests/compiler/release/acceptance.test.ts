import { describe, expect, it } from 'vitest'
import { selectReleaseImageRoles } from '../../../src/shared/release/image-roles'
import { buildReleaseIndexModel } from '../../../src/compiler/release/list-model'
import { buildReleaseDetailModel } from '../../../src/compiler/release/detail-model'
import { builtInPlatformTypes } from '../../../src/platforms/builtins/index'
import {
  albumBook,
  asset,
  enMessages,
  giftBook,
  releaseCollectionPage,
  releaseDetailPage,
  zhMessages,
} from '../../helpers/release-fixtures'
import type { RouteContentPackage } from '../../../src/shared/types'
import type { CompiledPage } from '../../../src/shared/route-types'

describe('Release acceptance (spec §§21–24, drafts; JSON-LD deferred to Plan 10)', () => {
  const releaseOptions = {
    urlSegment: 'releases',
    index: {
      enabled: true,
      pagination: 2,
    },
    artworkPlaceholder: './assets/placeholder.webp',
  } as const

  it('keeps image roles independent across index and detail', () => {
    const roles = selectReleaseImageRoles({
      cover: './assets/article-cover.webp',
      artwork: './assets/album-entry.webp',
      book: albumBook(),
    })
    expect(roles.cover).toBe('./assets/article-cover.webp')
    expect(roles.artwork).toBe('./assets/album-entry.webp')
    expect(roles.albumCovers[0]).toBe('./assets/front.webp')
    expect(roles.artwork).not.toBe(roles.albumCovers[0])
  })

  it('builds a paginated index preserving identity order without under-tile date/description', () => {
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

    expect(page1!.tiles.map((t) => t.slug)).toEqual(['a', 'b'])
    expect(page1!.tiles.every((t) => t.showDate === false)).toBe(true)
    expect(page1!.tiles.every((t) => t.showDescription === false)).toBe(true)
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

  it('supports album, gift, and markdown-only detail contracts without jsonLd', () => {
    const definitions = {
      bilibili: {
        category: 'digital',
        type: 'bilibili_player',
        name: 'Bilibili',
      },
      taobao: {
        category: 'physical',
        type: 'link',
        name: { zh: '淘宝', en: 'Taobao' },
      },
    } as const

    const album = buildReleaseDetailModel({
      page: releaseDetailPage(),
      pkg: {
        dir: '/content/releases/first-release',
        identity: 'release:first-release',
        type: 'release',
        slug: 'first-release',
        date: '2026-08-11',
        draft: false,
        tags: [],
        artwork: './assets/album-entry.webp',
        locales: {},
      },
      book: albumBook(),
      messages: zhMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => asset('/entry.webp'),
      resolveAlbumCover: (p) => asset(`/${p}`),
      resolvePlaceholder: () => undefined,
      showDrafts: false,
    })
    expect(album.book?.type).toBe('album')
    if (album.book?.type === 'album') {
      expect(album.book.previewLinks).toEqual([])
      expect(album.book.platformLinks.map((l) => l.platform)).toEqual([
        'bilibili',
      ])
      expect(album.book.covers).toHaveLength(2)
      expect(album.book.discs).toHaveLength(1)
      expect(album.book.discs[0].tracks).toHaveLength(2)
      expect(album.book.discs[0].tracks[0].durationLabel).toBe('4:32')
    }
    expect(album.artwork.kind).toBe('artwork')
    expect('jsonLd' in album).toBe(false)

    const gift = buildReleaseDetailModel({
      page: releaseDetailPage({
        title: '周边',
        locale: 'en',
        bodyLocale: 'en',
        canonicalLocale: 'en',
      }),
      pkg: {
        dir: '/content/releases/gift',
        identity: 'release:gift',
        type: 'release',
        slug: 'gift',
        date: '2026-08-11',
        draft: false,
        tags: [],
        locales: {},
      },
      book: giftBook(),
      messages: enMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => undefined,
      resolveAlbumCover: (p) => asset(`/${p}`),
      resolveGiftItemCover: (p) => asset(`/${p}`),
      resolvePlaceholder: () => undefined,
      showDrafts: false,
    })
    expect(gift.book?.type).toBe('gift')
    if (gift.book?.type === 'gift') {
      expect(gift.book.items).toHaveLength(1)
      expect(gift.book.items[0].id).toBe('poster')
      expect(gift.book.items[0].title.text).toBe('Commemorative Poster')
      expect(gift.book.items[0].previewLinks).toEqual([])
      expect(gift.book.items[0].platformLinks.map((l) => l.platform)).toEqual([
        'taobao',
      ])
      expect(gift.book.items[0].covers).toHaveLength(1)
    }
    expect(gift.artwork.kind).toBe('empty-frame')

    const markdownOnly = buildReleaseDetailModel({
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
      book: undefined,
      messages: enMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => undefined,
      resolveAlbumCover: () => {
        throw new Error('no covers')
      },
      resolvePlaceholder: () => undefined,
      showDrafts: true,
    })
    expect(markdownOnly.book).toBeUndefined()
    expect(markdownOnly.includedInIndex).toBe(true)
    expect(markdownOnly.showDraftBadge).toBe(true)
    expect(markdownOnly.artwork.kind).toBe('empty-frame')
  })
})
