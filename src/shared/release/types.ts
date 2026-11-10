import type {
  AssetPath,
  Book,
  BookCredit,
  NormalizedPlatformEntry,
} from '../types.js'
import type { ResolvedAsset } from '../asset-types.js'
import type { NumberedDisc } from './numbering.js'

export type CreditMap = Partial<
  Record<
    | 'catalogNumber'
    | 'illustrator'
    | 'designer'
    | 'mastering'
    | 'mix'
    | 'webDesign'
    | 'producer'
    | 'specialThanks',
    string | string[]
  >
>

export interface CompiledTrack {
  title: import('../types.js').Multilanguage
  artists: string[]
  duration: number
  desc?: import('../types.js').Multilanguage
  copyright?: string
}

export interface CompiledDisc {
  title: import('../types.js').Multilanguage
  desc?: import('../types.js').Multilanguage
  tracks: CompiledTrack[]
}

export interface CompiledAlbumMetadata {
  title: import('../types.js').Multilanguage
  copyright?: string
  credit?: CreditMap
  covers: string[]
  discs: CompiledDisc[]
}

export interface ReleaseManifestImages {
  cover?: AssetPath
  artwork?: AssetPath
  book?: Book
}

export interface ReleaseImageRoles {
  /** Article/social sharing image; never used as index/detail artwork. */
  cover?: AssetPath
  /** Index tile and detail hero artwork. */
  artwork?: AssetPath
  /** Complete album cover surfaces from book.yml → album.covers. */
  albumCovers: AssetPath[]
}

export interface ResolvedReleaseImages {
  cover?: ResolvedAsset
  artwork?: ResolvedAsset
  albumCovers: ResolvedAsset[]
  placeholder?: ResolvedAsset
}

export type ReleaseArtworkKind = 'artwork' | 'placeholder' | 'empty-frame'

export interface ReleaseIndexTile {
  identity: `release:${string}`
  slug: string
  title: string
  /** Present for sorting/metadata; must not be rendered under the tile. */
  date: string
  href: string
  artwork?: ResolvedAsset
  artworkKind: ReleaseArtworkKind
  isDraft: boolean
  showDraftBadge: boolean
  isFallback: boolean
  /** Always false for Synctrol Release index display contract. */
  showDate: false
  /** Always false for Synctrol Release index display contract. */
  showDescription: false
  /** Accessible name / image alt source. */
  accessibleName: string
}

export interface ReleaseIndexModel {
  locale: string
  page: number
  pageCount: number
  tiles: ReleaseIndexTile[]
  empty: boolean
}

export interface ResolvedText {
  text: string
  lang?: string
}

export interface ReleaseAlbumBookData {
  type: 'album'
  title: ResolvedText
  copyright?: string
  credit?: BookCredit
  previewLinks: NormalizedPlatformEntry[]
  platformLinks: NormalizedPlatformEntry[]
  covers: ResolvedAsset[]
  discs: NumberedDisc[]
}

export interface ReleaseGiftItemData {
  id: string
  title: ResolvedText
  desc?: ResolvedText
  covers: ResolvedAsset[]
  previewLinks: NormalizedPlatformEntry[]
  platformLinks: NormalizedPlatformEntry[]
  copyright?: string
}

export interface ReleaseGiftBookData {
  type: 'gift'
  title: ResolvedText
  copyright?: string
  credit?: BookCredit
  items: ReleaseGiftItemData[]
}

export interface ReleaseDetailModel {
  showDraftBadge: boolean
  draftLabel: string
  includedInIndex: true
  date: string
  artwork: {
    kind: ReleaseArtworkKind
    artwork?: ResolvedAsset
    alt: string
  }
  locale: import('../types.js').LocaleKey
  mainLocale: import('../types.js').LocaleKey
  messages: import('../types.js').LocaleMessages
  loadStrategy: 'interaction' | 'viewport'
  albumBySrc: Record<string, CompiledAlbumMetadata>
}

/** Injected into frontmatter.synctrol.release */
export type SynctrolReleaseFrontmatter =
  | {
      kind: 'index'
      model: ReleaseIndexModel
      collectionTitle: string
      prevHref: string | null
      nextHref: string | null
    }
  | {
      kind: 'detail'
      model: ReleaseDetailModel
    }
