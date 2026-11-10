import { describe, expect, it } from 'vitest'
import { buildReleaseDetailModel } from '../../../src/compiler/release/detail-model'
import { asset, releaseDetailPage, zhMessages } from '../../helpers/release-fixtures'
import type { RouteContentPackage } from '../../../src/shared/types'

describe('release detail acceptance', () => {
  it('uses src-keyed album metadata and excludes legacy book/platform catalogs', () => {
    const pkg: RouteContentPackage = {
      dir: '/content/releases/demo',
      identity: 'release:demo',
      type: 'release',
      slug: 'demo',
      date: '2026-11-11',
      draft: false,
      tags: [],
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
          covers: [],
          discs: [],
        },
      },
      messages: zhMessages,
      mainLocale: 'zh',
      loadStrategy: 'interaction',
      resolveArtwork: () => undefined,
      resolveAlbumCover: (path) => asset(path),
      resolvePlaceholder: () => undefined,
      showDrafts: false,
    })

    expect(model.albumBySrc['./album.yml']).toMatchObject({
      title: 'Demo',
      credit: { producer: 'Synctrol' },
    })
    expect('book' in model).toBe(false)
    expect('definitions' in model).toBe(false)
    expect('platformTypes' in model).toBe(false)
  })
})
