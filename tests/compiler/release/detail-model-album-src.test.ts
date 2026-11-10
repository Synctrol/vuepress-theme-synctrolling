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

describe('buildReleaseDetailModel albumBySrc', () => {
  it('injects the narrowed release context and resolves album covers', () => {
    const model = buildReleaseDetailModel({
      page: releaseDetailPage({ identity: 'release:demo', slug: 'demo' }),
      pkg,
      albumBySrc: {
        './album.yml': {
          title: { zh: '专辑', en: 'Album' },
          covers: ['./front.webp'],
          discs: [],
        },
      },
      messages: zhMessages,
      mainLocale: 'zh',
      loadStrategy: 'viewport',
      resolveArtwork: () => asset('/assets/artwork.hash.webp'),
      resolveAlbumCover: (path) => asset(`/assets/${path.slice(2)}.hash.webp`),
      resolvePlaceholder: () => undefined,
      showDrafts: false,
    })

    expect(model).toMatchObject({
      locale: 'zh',
      mainLocale: 'zh',
      messages: zhMessages,
      loadStrategy: 'viewport',
      albumBySrc: {
        './album.yml': {
          title: { zh: '专辑', en: 'Album' },
          covers: ['/assets/front.webp.hash.webp'],
          discs: [],
        },
      },
    })
    expect('book' in model).toBe(false)
  })
})
