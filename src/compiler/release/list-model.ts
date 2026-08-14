import type { RouteContentPackage } from '../../shared/types.js'
import type { ReleaseOptions } from '../../shared/options.js'
import type { CompiledPage, ContentIdentity } from '../../shared/route-types.js'
import type { ResolvedAsset } from '../../shared/asset-types.js'
import type {
  ReleaseArtworkKind,
  ReleaseIndexModel,
  ReleaseIndexTile,
} from '../../shared/release/types.js'
import { selectReleaseArtwork } from '../../shared/release/image-roles.js'

export interface BuildReleaseIndexModelInput {
  collectionPage: CompiledPage
  detailPages: CompiledPage[]
  packages: RouteContentPackage[]
  releaseOptions: ReleaseOptions
  resolveArtwork: (pkg: RouteContentPackage) => ResolvedAsset | undefined
  resolvePlaceholder: () => ResolvedAsset | undefined
  showDrafts: boolean
}

function packageByIdentity(
  packages: RouteContentPackage[],
  identity: ContentIdentity,
): RouteContentPackage | undefined {
  return packages.find((p) => p.identity === identity && p.type === 'release')
}

/**
 * Builds the Release Index view model.
 * Ordering: trusts Plan 03 `collection.itemIdentities` (already date-desc).
 * Do not re-sort by package date here.
 */
export function buildReleaseIndexModel(
  input: BuildReleaseIndexModelInput,
): ReleaseIndexModel | null {
  if (!input.releaseOptions.index.enabled) return null
  if (input.collectionPage.contentType !== 'release-collection') {
    throw new Error('buildReleaseIndexModel requires a release-collection page')
  }
  const collection = input.collectionPage.collection
  if (!collection) {
    throw new Error('release-collection page missing collection metadata')
  }

  // Defense in depth: only same-locale detail pages may populate tiles.
  const locale = input.collectionPage.locale
  const detailByIdentity = new Map(
    input.detailPages
      .filter((p) => p.locale === locale)
      .map((p) => [p.identity, p] as const),
  )

  const tiles: ReleaseIndexTile[] = []
  for (const identity of collection.itemIdentities) {
    const detail = detailByIdentity.get(identity)
    const pkg = packageByIdentity(input.packages, identity)
    if (!detail || !pkg || pkg.type !== 'release' || !pkg.slug || !pkg.date) {
      continue
    }

    const artworkPath = selectReleaseArtwork({
      cover: pkg.cover,
      artwork: pkg.artwork,
    })
    const resolvedArtwork = artworkPath
      ? input.resolveArtwork(pkg)
      : undefined
    const placeholder = !resolvedArtwork
      ? input.releaseOptions.artworkPlaceholder
        ? input.resolvePlaceholder()
        : undefined
      : undefined

    let artworkKind: ReleaseArtworkKind
    let artwork: ResolvedAsset | undefined
    if (resolvedArtwork) {
      artworkKind = 'artwork'
      artwork = resolvedArtwork
    } else if (placeholder) {
      artworkKind = 'placeholder'
      artwork = placeholder
    } else {
      artworkKind = 'empty-frame'
      artwork = undefined
    }

    tiles.push({
      identity: identity as `release:${string}`,
      slug: pkg.slug,
      title: detail.title,
      date: pkg.date,
      href: detail.url.publicPath,
      artwork,
      artworkKind,
      isDraft: detail.isDraft,
      showDraftBadge: Boolean(input.showDrafts && detail.isDraft),
      isFallback: detail.isFallback,
      showDate: false,
      showDescription: false,
      accessibleName: detail.title,
    })
  }

  return {
    locale: input.collectionPage.locale,
    page: collection.page,
    pageCount: collection.pageCount,
    tiles,
    empty: tiles.length === 0,
  }
}
