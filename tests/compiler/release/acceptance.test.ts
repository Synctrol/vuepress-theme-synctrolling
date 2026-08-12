import { describe, expect, it } from 'vitest'
import { selectReleaseImageRoles } from '../../../src/shared/release/image-roles'
import { buildReleaseIndexModel } from '../../../src/compiler/release/list-model'
import { buildReleaseDetailModel } from '../../../src/compiler/release/detail-model'
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
      mobileGridColumns: 2,
      desktopGridColumns: 3,
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
      releaseIndexHref: '/zh/releases/',
      resolveArtwork: () => asset('/entry.webp'),
      resolveAlbumCover: (p) => asset(`/${p}`),
      resolvePlaceholder: () => undefined,
      releaseOptions: { ...releaseOptions },
      showDrafts: false,
      formatDate: (d) => d,
    })
    expect(album.sections.map((s) => s.kind)).toEqual([
      'return-link',
      'title-date',
      'artwork',
      'book-identity',
      'album-body',
      'markdown',
    ])
    expect(
      (album.sections.find((s) => s.kind === 'album-body') as { order: string[] })
        .order,
    ).toEqual(['links', 'covers', 'discs'])
    expect('jsonLd' in album).toBe(false)

    const gift = buildReleaseDetailModel({
      page: releaseDetailPage({ title: '周边' }),
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
      releaseIndexHref: '/en/releases/',
      resolveArtwork: () => undefined,
      resolveAlbumCover: (p) => asset(`/${p}`),
      resolveGiftItemCover: (p) => asset(`/${p}`),
      resolvePlaceholder: () => undefined,
      releaseOptions: { ...releaseOptions },
      showDrafts: false,
      formatDate: (d) => d,
    })
    const giftBody = gift.sections.find((s) => s.kind === 'gift-body') as {
      items: Array<{ linksHoisted: boolean; coverOrder: string }>
    }
    expect(giftBody.items.every((i) => i.linksHoisted === false)).toBe(true)
    expect(giftBody.items.every((i) => i.coverOrder === 'before-links')).toBe(true)

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
      releaseIndexHref: '/en/releases/',
      resolveArtwork: () => undefined,
      resolveAlbumCover: () => {
        throw new Error('no covers')
      },
      resolvePlaceholder: () => undefined,
      releaseOptions: { ...releaseOptions },
      showDrafts: true,
      formatDate: (d) => d,
    })
    expect(markdownOnly.sections.map((s) => s.kind)).toEqual([
      'return-link',
      'title-date',
      'artwork',
      'markdown',
    ])
    expect(markdownOnly.includedInIndex).toBe(true)
    expect(markdownOnly.showDraftBadge).toBe(true)
  })
})
