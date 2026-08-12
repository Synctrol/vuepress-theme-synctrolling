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
