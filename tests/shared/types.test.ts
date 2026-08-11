import { describe, expect, it } from 'vitest'
import type {
  AlbumBook,
  ContentType,
  GiftBook,
  LocaleMessages,
  Multilanguage,
} from '../../src/shared/types'
import { CONTENT_TYPES, isMultilanguageMap } from '../../src/shared/types'

describe('shared types', () => {
  it('exposes the four content types', () => {
    expect(CONTENT_TYPES).toEqual(['home', 'release', 'news', 'page'])
  })

  it('detects multilanguage maps versus scalars', () => {
    expect(isMultilanguageMap('SYNCTROL')).toBe(false)
    expect(isMultilanguageMap({ zh: '第一张专辑', en: 'First Album' })).toBe(true)
  })

  it('accepts album and gift book discriminators', () => {
    const album: AlbumBook = {
      type: 'album',
      title: 'Demo',
      album: { covers: [], links: [], discs: [] },
    }
    const gift: GiftBook = {
      type: 'gift',
      title: { zh: '周边', en: 'Gifts' },
      gift: { items: [] },
    }
    expect(album.type).toBe('album')
    expect(gift.type).toBe('gift')
  })

  it('requires locale message keys used by the shell', () => {
    const required: Array<keyof LocaleMessages> = [
      'draft',
      'translationUnavailable',
      'light',
      'dark',
      'auto',
      'menu',
      'close',
      'language',
      'themeModeAnnouncement',
      'returnToReleases',
      'published',
      'previousPage',
      'nextPage',
      'updated',
      'authors',
      'album',
      'tracklist',
      'disc',
      'track',
      'covers',
      'platformLinks',
      'gifts',
      'giftItems',
      'readMore',
      'activateEmbed',
      'embedFailed',
      'openExternal',
      'emptyReleases',
      'emptyNews',
      'paginatedTitle',
      'tagArchiveTitle',
    ]
    expect(required.length).toBe(31)
  })
})
