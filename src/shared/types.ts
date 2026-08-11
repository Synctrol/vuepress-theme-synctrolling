export const CONTENT_TYPES = ['home', 'release', 'news', 'page'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]
export type LocaleKey = string

export type Multilanguage =
  | string
  | Record<LocaleKey, string>

export function isMultilanguageMap(
  value: unknown,
): value is Record<LocaleKey, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export interface LocaleMessages {
  draft: string
  translationUnavailable: string
  light: string
  dark: string
  auto: string
  menu: string
  close: string
  language: string
  themeModeAnnouncement: string
  returnToReleases: string
  published: string
  previousPage: string
  nextPage: string
  updated: string
  authors: string
  album: string
  tracklist: string
  disc: string
  track: string
  covers: string
  platformLinks: string
  gifts: string
  giftItems: string
  readMore: string
  activateEmbed: string
  embedFailed: string
  openExternal: string
  emptyReleases: string
  emptyNews: string
  paginatedTitle: string
  tagArchiveTitle: string
}

export interface LocaleOptions {
  lang: string
  label: string
  dateFormat?: Intl.DateTimeFormatOptions
  messages?: Partial<LocaleMessages>
}

export type BuiltInPlatformType =
  | 'link'
  | 'audio_player'
  | 'youtube_player'
  | 'bilibili_player'
  | 'apple_music_player'
  | 'spotify_player'
  | 'soundcloud_player'
  | 'netease_player'

export type AssetPath = string

export interface PlatformEntryBase {
  platform: string
  label?: Multilanguage
}

export interface BookBase {
  title: Multilanguage
  desc?: Multilanguage
  authors?: string[]
  copyright?: string
}

export interface Track {
  title: Multilanguage
  artists: string[]
  duration: number
  desc?: Multilanguage
  copyright?: string
}

export interface Disc {
  title: Multilanguage
  desc?: Multilanguage
  tracks: Track[]
}

export interface AlbumBook extends BookBase {
  type: 'album'
  album: {
    covers?: AssetPath[]
    links?: PlatformEntryBase[]
    discs?: Disc[]
  }
}

export interface GiftItem {
  id: string
  title: Multilanguage
  desc?: Multilanguage
  covers?: AssetPath[]
  links?: PlatformEntryBase[]
  copyright?: string
}

export interface GiftBook extends BookBase {
  type: 'gift'
  gift: {
    items: GiftItem[]
  }
}

export type Book = AlbumBook | GiftBook
