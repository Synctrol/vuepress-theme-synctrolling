import { describe, expect, it } from 'vitest'
import { buildReleaseDetailModel } from '../../../src/compiler/release/detail-model'
import { albumBook, asset, giftBook, releaseDetailPage, zhMessages } from '../../helpers/release-fixtures'
import { builtInPlatformTypes } from '../../../src/platforms/builtins/index'
import type { RouteContentPackage, ContentDefinitions } from '../../../src/shared/types'

const basePkg: RouteContentPackage = {
  dir: '/content/releases/first-release',
  identity: 'release:first-release',
  type: 'release',
  slug: 'first-release',
  date: '2026-08-11',
  draft: false,
  tags: [],
  cover: './assets/article-cover.webp',
  artwork: './assets/album-entry.webp',
  locales: {},
}

const definitions: ContentDefinitions['platforms'] = {
  soundcloud: { category: 'digital', type: 'soundcloud_player', name: 'SoundCloud' },
  bilibili: { category: 'digital', type: 'bilibili_player', name: { zh: '哔哩哔哩', en: 'Bilibili' } },
  taobao: { category: 'physical', type: 'link', name: '淘宝' },
}

describe('buildReleaseDetailModel', () => {
  it('produces the injected context shape for an album book', () => {
    const book = albumBook({
      credit: { catalogNumber: 'DVSP-0327', illustrator: 'タイキ' },
      album: {
        covers: ['./assets/front.webp'],
        links: [
          { platform: 'soundcloud', url: 'https://soundcloud.com/synctrol/x' },
          { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 1, autoplay: false },
        ],
        discs: [
          {
            title: { zh: '第一碟', en: 'Disc One' },
            tracks: [
              { title: { zh: '第一曲', en: 'Track One' }, artists: ['Synctrol'], duration: 272 },
            ],
          },
        ],
      },
    })
    const model = buildReleaseDetailModel({
      page: releaseDetailPage(),
      pkg: basePkg,
      book,
      messages: zhMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => asset('/assets/content/release/first-release/album-entry.hash.webp'),
      resolveAlbumCover: (p) => asset(`/assets/content/release/first-release/${p.replace('./assets/', '')}`),
      resolveGiftItemCover: (p) => asset(`/assets/content/release/first-release/${p.replace('./assets/', '')}`),
      resolvePlaceholder: () => undefined,
      showDrafts: false,
    })

    expect(model.includedInIndex).toBe(true)
    expect(model.showDraftBadge).toBe(false)
    expect(model.date).toBe('2026-08-11')
    expect(model.artwork).toMatchObject({ kind: 'artwork' })
    expect(model.book).toMatchObject({
      type: 'album',
      title: { text: '第一张专辑' },
      copyright: '© 2026 Synctrol',
      credit: { catalogNumber: 'DVSP-0327', illustrator: 'タイキ' },
    })
    expect(model.book?.type === 'album' && model.book.previewLinks.map((e) => e.platform)).toEqual(['soundcloud'])
    expect(model.book?.type === 'album' && model.book.platformLinks.map((e) => e.platform)).toEqual(['bilibili'])
    expect(model.book?.type === 'album' && model.book.covers).toHaveLength(1)
    expect(model.book?.type === 'album' && model.book.discs[0].tracks[0].number).toBe(1)
  })

  it('builds gift items with split links and keeps item desc', () => {
    const book = giftBook({
      gift: {
        items: [
          {
            id: 'poster',
            title: { zh: '纪念海报', en: 'Poster' },
            desc: { zh: '限量', en: 'Limited' },
            covers: ['./assets/poster-front.webp'],
            links: [{ platform: 'taobao', url: 'https://item.taobao.com/example' }],
          },
        ],
      },
    })
    const model = buildReleaseDetailModel({
      page: releaseDetailPage(),
      pkg: { ...basePkg, artwork: undefined },
      book,
      messages: zhMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => undefined,
      resolveAlbumCover: (p) => asset(p),
      resolveGiftItemCover: (p) => asset(p),
      resolvePlaceholder: () => undefined,
      showDrafts: false,
    })

    expect(model.artwork).toMatchObject({ kind: 'empty-frame' })
    expect(model.book?.type === 'gift' && model.book.items).toHaveLength(1)
    expect(model.book?.type === 'gift' && model.book.items[0]).toMatchObject({
      id: 'poster',
      title: { text: '纪念海报' },
      desc: { text: '限量' },
    })
    expect(model.book?.type === 'gift' && model.book.items[0].platformLinks.map((e) => e.platform)).toEqual(['taobao'])
  })

  it('omits book but keeps artwork and draft flags when book.yml is absent', () => {
    const model = buildReleaseDetailModel({
      page: releaseDetailPage({ isDraft: true }),
      pkg: basePkg,
      book: undefined,
      messages: zhMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => asset('/entry.webp'),
      resolveAlbumCover: () => {
        throw new Error('should not resolve album covers without a book')
      },
      resolveGiftItemCover: () => {
        throw new Error('should not resolve gift covers without a book')
      },
      resolvePlaceholder: () => undefined,
      showDrafts: true,
    })
    expect(model.book).toBeUndefined()
    expect(model.showDraftBadge).toBe(true)
    expect(model.draftLabel).toBe('草稿')
    expect(model.artwork.kind).toBe('artwork')
  })

  it('falls back to the placeholder artwork when package artwork is missing', () => {
    const model = buildReleaseDetailModel({
      page: releaseDetailPage(),
      pkg: { ...basePkg, artwork: undefined },
      book: undefined,
      messages: zhMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => undefined,
      resolveAlbumCover: () => {
        throw new Error('unused')
      },
      resolveGiftItemCover: () => {
        throw new Error('unused')
      },
      resolvePlaceholder: () => asset('/placeholder.webp'),
      showDrafts: false,
    })
    expect(model.artwork.kind).toBe('placeholder')
    expect(model.artwork.artwork?.publicPath).toBe('/placeholder.webp')
  })
})
