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
  if (prototype !== Object.prototype && prototype !== null) {
    return false
  }

  return Object.getOwnPropertyNames(value).every(
    (key) => typeof (value as Record<string, unknown>)[key] === 'string',
  )
}

export interface LocaleMessages {
  draft: string
  translationUnavailable: string
  light: string
  dark: string
  auto: string
  menu: string
  close: string
  home: string
  language: string
  themeModeAnnouncement: string
  published: string
  previousPage: string
  nextPage: string
  updated: string
  album: string
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
  previewSectionTitle: string
  credits: string
  creditCopyright: string
  creditReleaseDate: string
  creditCatalogNumber: string
  creditIllustrator: string
  creditDesigner: string
  creditMastering: string
  creditMix: string
  creditWebDesign: string
  creditProducer: string
  creditSpecialThanks: string
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

export type PlatformCategory = 'digital' | 'physical'

export interface TagDefinition {
  title: Multilanguage
}

export interface PlatformDefinition {
  category: PlatformCategory
  type: string
  name: Multilanguage
}

export interface ContentDefinitions {
  tags: Record<string, TagDefinition>
  platforms: Record<string, PlatformDefinition>
}

export type AssetPath = string

export interface DiscoveredPackage {
  /** Absolute path to the package directory (directory that contains content.yml). */
  dir: string
  /** Absolute path to content.yml. */
  contentYmlPath: string
  /** Absolute path to book.yml when present. */
  bookYmlPath?: string
}

export type LocalePath = string | Partial<Record<LocaleKey, string>>

export interface ContentManifestBase {
  type: ContentType
  draft: boolean
  path?: LocalePath
}

export interface HomeManifest extends ContentManifestBase {
  type: 'home'
}

export interface ReleaseManifest extends ContentManifestBase {
  type: 'release'
  slug: string
  date: string
  cover?: string
  artwork?: string
}

export interface NewsManifest extends ContentManifestBase {
  type: 'news'
  slug: string
  date: string
  updated?: string
  tags: string[]
  cover?: string
}

export interface PageManifest extends ContentManifestBase {
  type: 'page'
  slug: string
  cover?: string
}

export type ContentManifest =
  | HomeManifest
  | ReleaseManifest
  | NewsManifest
  | PageManifest

export interface PlatformEntryBase {
  platform: string
  label?: Multilanguage
}

export type NormalizedPlatformEntry = PlatformEntryBase &
  Record<string, unknown>

export type LinkEntry = PlatformEntryBase & {
  url: string
}

export type AudioPlayerEntry = PlatformEntryBase & {
  src: string
  mime?: string
  autoplay?: boolean
}

export type YouTubePlayerEntry = PlatformEntryBase & {
  videoId: string
  start?: number
  autoplay?: boolean
}

export type BilibiliPlayerEntry = PlatformEntryBase & {
  bvid: string
  page?: number
  autoplay?: boolean
}

export type AppleMusicPlayerEntry = PlatformEntryBase & {
  url: string
}

export type SpotifyPlayerEntry = PlatformEntryBase & {
  uri: string
}

export type SoundCloudPlayerEntry = PlatformEntryBase & {
  url: string
}

export type NeteasePlayerEntry = PlatformEntryBase & {
  id: string
  resourceType: 'song' | 'album' | 'playlist'
}

export type BuiltInPlatformEntry =
  | LinkEntry
  | AudioPlayerEntry
  | YouTubePlayerEntry
  | BilibiliPlayerEntry
  | AppleMusicPlayerEntry
  | SpotifyPlayerEntry
  | SoundCloudPlayerEntry
  | NeteasePlayerEntry

export const BOOK_CREDIT_KEYS = [
  'catalogNumber',
  'illustrator',
  'designer',
  'mastering',
  'mix',
  'webDesign',
  'producer',
  'specialThanks',
] as const

export type BookCreditKey = (typeof BOOK_CREDIT_KEYS)[number]

export type BookCredit = Partial<Record<BookCreditKey, string | string[]>>

export interface BookBase {
  title: Multilanguage
  copyright?: string
  credit?: BookCredit
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
    links?: NormalizedPlatformEntry[]
    discs?: Disc[]
  }
}

export interface GiftItem {
  id: string
  title: Multilanguage
  desc?: Multilanguage
  covers?: AssetPath[]
  links?: NormalizedPlatformEntry[]
  copyright?: string
}

export interface GiftBook extends BookBase {
  type: 'gift'
  gift: {
    items: GiftItem[]
  }
}

export type Book = AlbumBook | GiftBook

export interface CompiledContentPackage {
  dir: string
  identity: string
  manifest: ContentManifest
  book?: Book
}

export interface LocaleMarkdown {
  /** Absolute path to the locale Markdown file. */
  filePath: string
  title: string
  description?: string
  draft: boolean
  /** Markdown body after the frontmatter block. */
  body: string
}

/** Flattened package shape consumed by the route compiler. */
export interface RouteContentPackage {
  /** Absolute package directory. */
  dir: string
  /** Plan 02 identity: `home` or `${type}:${slug}`. */
  identity: string
  type: ContentType
  /** `null` for Home only. */
  slug: string | null
  date?: string
  updated?: string
  draft: boolean
  path?: LocalePath
  /** Empty for every type except News. */
  tags: string[]
  cover?: string
  artwork?: string
  locales: Partial<Record<LocaleKey, LocaleMarkdown>>
}
