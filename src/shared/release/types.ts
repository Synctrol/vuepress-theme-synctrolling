import type { AssetPath, Book } from '../types.js'
import type { ResolvedAsset } from '../asset-types.js'

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
