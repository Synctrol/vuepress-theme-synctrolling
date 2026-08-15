import { describe, expect, it } from 'vitest'
import type {
  AlbumBook,
  ContentType,
  GiftBook,
  LocaleMessages,
  Multilanguage,
} from '../../src/shared/types'
import { CONTENT_TYPES, isMultilanguageMap } from '../../src/shared/types'

const LOCALE_MESSAGE_KEYS = [
  'draft',
  'translationUnavailable',
  'light',
  'dark',
  'auto',
  'menu',
  'close',
  'home',
  'language',
  'themeModeAnnouncement',
  'published',
  'previousPage',
  'nextPage',
  'updated',
  'album',
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
  'notFoundTitle',
  'notFoundDescription',
  'notFoundBackHome',
  'paginatedTitle',
  'tagArchiveTitle',
  'previewSectionTitle',
  'credits',
  'creditCopyright',
  'creditReleaseDate',
  'creditCatalogNumber',
  'creditIllustrator',
  'creditDesigner',
  'creditMastering',
  'creditMix',
  'creditWebDesign',
  'creditProducer',
  'creditSpecialThanks',
] as const satisfies readonly (keyof LocaleMessages)[]

type ListedLocaleMessageKey = (typeof LOCALE_MESSAGE_KEYS)[number]
type MissingLocaleMessageKey = Exclude<keyof LocaleMessages, ListedLocaleMessageKey>
type ExtraLocaleMessageKey = Exclude<ListedLocaleMessageKey, keyof LocaleMessages>
type AssertLocaleMessagesContract =
  MissingLocaleMessageKey extends never
    ? ExtraLocaleMessageKey extends never
      ? true
      : ['unexpected locale message keys', ExtraLocaleMessageKey]
    : ['missing locale message keys', MissingLocaleMessageKey]

const _localeMessagesContract: AssertLocaleMessagesContract = true

describe('shared types', () => {
  it('exposes the four content types', () => {
    expect(CONTENT_TYPES).toEqual(['home', 'release', 'news', 'page'])
  })

  it('detects multilanguage maps versus scalars', () => {
    expect(isMultilanguageMap('SYNCTROL')).toBe(false)
    expect(isMultilanguageMap({ zh: '第一张专辑', en: 'First Album' })).toBe(true)
    expect(isMultilanguageMap(Object.create(null))).toBe(true)
    expect(isMultilanguageMap({ zh: 42 })).toBe(false)
    expect(isMultilanguageMap({ zh: '中文', en: undefined })).toBe(false)
    expect(isMultilanguageMap(null)).toBe(false)
    expect(isMultilanguageMap(['第一张专辑'])).toBe(false)
    expect(isMultilanguageMap(new Date())).toBe(false)
  })

  it('accepts album and gift book discriminators', () => {
    const album: AlbumBook = {
      type: 'album',
      title: 'Demo',
      album: {
        covers: ['/covers/front.jpg'],
        links: [{ platform: 'spotify', label: 'Spotify' }],
        discs: [
          {
            title: 'Disc 1',
            tracks: [{ title: 'Track 1', artists: ['Artist'], duration: 180 }],
          },
        ],
      },
    }
    const gift: GiftBook = {
      type: 'gift',
      title: { zh: '周边', en: 'Gifts' },
      gift: {
        items: [{ id: 'poster-1', title: { zh: '海报', en: 'Poster' } }],
      },
    }

    expect(album.type).toBe('album')
    expect(album.album.covers).toEqual(['/covers/front.jpg'])
    expect(album.album.links?.[0]?.platform).toBe('spotify')
    expect(album.album.discs?.[0]?.tracks[0]?.duration).toBe(180)

    expect(gift.type).toBe('gift')
    expect(gift.gift.items).toHaveLength(1)
    expect(gift.gift.items[0]?.id).toBe('poster-1')
    expect(gift.gift.items[0]?.title).toEqual({ zh: '海报', en: 'Poster' })
  })

  it('requires locale message keys used by the shell', () => {
    const messages = Object.fromEntries(
      LOCALE_MESSAGE_KEYS.map((key) => [key, key]),
    ) as Record<(typeof LOCALE_MESSAGE_KEYS)[number], string>

    const _messagesCoverContract: LocaleMessages = messages

    for (const key of LOCALE_MESSAGE_KEYS) {
      expect(typeof messages[key]).toBe('string')
    }
    expect(_messagesCoverContract).toBeDefined()
  })
})
