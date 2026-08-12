import { describe, expect, it } from 'vitest'
import { buildReleaseDetailModel } from '../../../src/compiler/release/detail-model'
import {
  albumBook,
  asset,
  giftBook,
  releaseDetailPage,
  zhMessages,
} from '../../helpers/release-fixtures'
import type { RouteContentPackage } from '../../../src/shared/types'

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

const releaseOptions = {
  urlSegment: 'releases',
  index: {
    enabled: true,
    pagination: 12,
    mobileGridColumns: 2,
    desktopGridColumns: 3,
  },
} as const

describe('buildReleaseDetailModel', () => {
  it('orders sections: return, title/date, artwork, book identity, type body, markdown marker', () => {
    const model = buildReleaseDetailModel({
      page: releaseDetailPage(),
      pkg: basePkg,
      book: albumBook(),
      messages: zhMessages,
      mainLocale: 'zh',
      releaseIndexHref: '/zh/releases/',
      resolveArtwork: () =>
        asset('/assets/content/release/first-release/album-entry.hash.webp'),
      resolveAlbumCover: (path) =>
        asset(
          `/assets/content/release/first-release/${path.replace('./assets/', '')}`,
        ),
      resolvePlaceholder: () => undefined,
      releaseOptions,
      showDrafts: false,
      formatDate: (d) => d,
    })

    expect(model.sections.map((s) => s.kind)).toEqual([
      'return-link',
      'title-date',
      'artwork',
      'book-identity',
      'album-body',
      'markdown',
    ])
    expect(model.sections[0]).toMatchObject({
      kind: 'return-link',
      href: '/zh/releases/',
      label: '返回作品列表',
    })
    expect(model.sections[1]).toMatchObject({
      kind: 'title-date',
      title: '第一张专辑',
      date: '2026-08-11',
    })
    expect(model.sections[2]).toMatchObject({
      kind: 'artwork',
      artworkKind: 'artwork',
    })
    expect(model.sections[3]).toMatchObject({
      kind: 'book-identity',
      bookType: 'album',
    })
    expect(model.sections[4]).toMatchObject({
      kind: 'album-body',
      order: ['links', 'covers', 'discs'],
    })
    expect(model.sections[5]).toEqual({
      kind: 'markdown',
      bodyLang: 'zh',
    })
    expect(model.showDraftBadge).toBe(false)
    expect('jsonLd' in model).toBe(false)
  })

  it('omits book identity and type body when book.yml is absent but keeps markdown marker', () => {
    const model = buildReleaseDetailModel({
      page: releaseDetailPage(),
      pkg: { ...basePkg, artwork: undefined, cover: './assets/article-cover.webp' },
      book: undefined,
      messages: zhMessages,
      mainLocale: 'zh',
      releaseIndexHref: '/zh/releases/',
      resolveArtwork: () => undefined,
      resolveAlbumCover: () => {
        throw new Error('should not resolve album covers without a book')
      },
      resolvePlaceholder: () => undefined,
      releaseOptions,
      showDrafts: false,
      formatDate: (d) => d,
    })
    expect(model.sections.map((s) => s.kind)).toEqual([
      'return-link',
      'title-date',
      'artwork',
      'markdown',
    ])
    expect(model.sections[2]).toMatchObject({
      kind: 'artwork',
      artworkKind: 'empty-frame',
    })
    expect(model.includedInIndex).toBe(true)
  })

  it('builds gift body payload with per-item covers then links', () => {
    const model = buildReleaseDetailModel({
      page: releaseDetailPage({ title: '周边系列' }),
      pkg: basePkg,
      book: giftBook(),
      messages: zhMessages,
      mainLocale: 'zh',
      releaseIndexHref: '/zh/releases/',
      resolveArtwork: () => asset('/a.webp'),
      resolveAlbumCover: () => asset('/ignored.webp'),
      resolveGiftItemCover: (path) =>
        asset(
          `/assets/content/release/first-release/${path.replace('./assets/', '')}`,
        ),
      resolvePlaceholder: () => undefined,
      releaseOptions,
      showDrafts: true,
      formatDate: (d) => d,
    })
    expect(model.sections.map((s) => s.kind)).toContain('gift-body')
    const gift = model.sections.find((s) => s.kind === 'gift-body') as {
      kind: 'gift-body'
      items: Array<{ id: string; coverOrder: 'before-links'; linksHoisted: false }>
    }
    expect(gift.items[0]).toMatchObject({
      id: 'poster',
      coverOrder: 'before-links',
      linksHoisted: false,
    })
  })

  it('shows draft badge on detail when showDrafts and page is draft', () => {
    const model = buildReleaseDetailModel({
      page: releaseDetailPage({ isDraft: true, noindex: true }),
      pkg: { ...basePkg, draft: true },
      book: undefined,
      messages: zhMessages,
      mainLocale: 'zh',
      releaseIndexHref: '/zh/releases/',
      resolveArtwork: () => asset('/a.webp'),
      resolveAlbumCover: () => asset('/c.webp'),
      resolvePlaceholder: () => undefined,
      releaseOptions,
      showDrafts: true,
      formatDate: (d) => d,
    })
    expect(model.showDraftBadge).toBe(true)
  })
})
