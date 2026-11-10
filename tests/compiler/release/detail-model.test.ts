import { describe, expect, it } from 'vitest'
import { buildReleaseDetailModel } from '../../../src/compiler/release/detail-model'
import { asset, releaseDetailPage, zhMessages } from '../../helpers/release-fixtures'
import type { RouteContentPackage } from '../../../src/shared/types'

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

function build(overrides: Partial<Parameters<typeof buildReleaseDetailModel>[0]> = {}) {
  return buildReleaseDetailModel({
    page: releaseDetailPage({ identity: 'release:demo', slug: 'demo' }),
    pkg,
    albumBySrc: {},
    messages: zhMessages,
    mainLocale: 'zh',
    loadStrategy: 'interaction',
    resolveArtwork: () => asset('/artwork.webp'),
    resolveAlbumCover: (path) => asset(`/resolved/${path.slice(2)}`),
    resolvePlaceholder: () => undefined,
    showDrafts: false,
    ...overrides,
  })
}

describe('buildReleaseDetailModel', () => {
  it('builds the minimal context without legacy book data', () => {
    const model = build()
    expect(model).toMatchObject({
      locale: 'zh',
      mainLocale: 'zh',
      messages: zhMessages,
      loadStrategy: 'interaction',
      albumBySrc: {},
      artwork: { kind: 'artwork' },
    })
    expect('book' in model).toBe(false)
  })

  it('resolves album covers and keeps draft and placeholder behavior', () => {
    const model = build({
      page: releaseDetailPage({
        identity: 'release:demo',
        slug: 'demo',
        isDraft: true,
      }),
      pkg: { ...pkg, artwork: undefined },
      albumBySrc: {
        './album.yml': {
          title: 'Demo',
          covers: ['./cover.webp'],
          discs: [],
        },
      },
      resolveArtwork: () => undefined,
      resolvePlaceholder: () => asset('/placeholder.webp'),
      showDrafts: true,
    })

    expect(model.showDraftBadge).toBe(true)
    expect(model.artwork.kind).toBe('placeholder')
    expect(model.albumBySrc['./album.yml'].covers).toEqual([
      '/resolved/cover.webp',
    ])
  })
})
