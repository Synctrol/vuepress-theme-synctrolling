import type {
  AssetPath,
  Book,
  BookCredit,
  NormalizedPlatformEntry,
} from '../types.js'
import type { ResolvedAsset } from '../asset-types.js'
import type { NumberedDisc } from './numbering.js'

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
  mobileGridColumns: number
  desktopGridColumns: number
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
  artwork: {
    kind: ReleaseArtworkKind
    artwork?: ResolvedAsset
    alt: string
  }
  book?: ReleaseAlbumBookData | ReleaseGiftBookData
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
