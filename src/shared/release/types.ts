import type { AssetPath, Book, NormalizedPlatformEntry } from '../types.js'
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

export type ReleaseDetailSection =
  | { kind: 'return-link'; href: string; label: string }
  | {
      kind: 'title-date'
      title: string
      date: string
      dateLabel: string
      titleLang?: string
    }
  | {
      kind: 'artwork'
      artworkKind: ReleaseArtworkKind
      artwork?: ResolvedAsset
      alt: string
    }
  | {
      kind: 'book-identity'
      bookType: 'album' | 'gift'
      title: ResolvedText
      desc?: ResolvedText
      authors?: string[]
      copyright?: string
    }
  | {
      kind: 'album-body'
      order: ['links', 'covers', 'discs']
      links: NormalizedPlatformEntry[]
      covers: ResolvedAsset[]
      discs: NumberedDisc[]
      labels: {
        platformLinks: string
        covers: string
        tracklist: string
        disc: string
        track: string
      }
    }
  | {
      kind: 'gift-body'
      items: Array<{
        id: string
        title: ResolvedText
        desc?: ResolvedText
        covers: ResolvedAsset[]
        links: NormalizedPlatformEntry[]
        copyright?: string
        coverOrder: 'before-links'
        linksHoisted: false
      }>
      labels: { giftItems: string; covers: string; platformLinks: string }
    }
  | { kind: 'markdown'; bodyLang: string }

export interface ReleaseDetailModel {
  sections: ReleaseDetailSection[]
  showDraftBadge: boolean
  draftLabel: string
  includedInIndex: true
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
      authorsLabel: string
    }
