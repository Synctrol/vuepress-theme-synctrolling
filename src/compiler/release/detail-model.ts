import type {
  LocaleKey,
  LocaleMessages,
  RouteContentPackage,
} from '../../shared/types.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { ResolvedAsset } from '../../shared/asset-types.js'
import type {
  CompiledAlbumMetadata,
  ReleaseDetailModel,
} from '../../shared/release/types.js'
import { selectReleaseArtwork } from '../../shared/release/image-roles.js'

export interface BuildReleaseDetailModelInput {
  page: CompiledPage
  pkg: RouteContentPackage
  albumBySrc: Record<string, CompiledAlbumMetadata>
  messages: LocaleMessages
  mainLocale: LocaleKey
  loadStrategy: 'interaction' | 'viewport'
  resolveArtwork: (pkg: RouteContentPackage) => ResolvedAsset | undefined
  resolveAlbumCover: (relativePath: string) => ResolvedAsset
  resolvePlaceholder: () => ResolvedAsset | undefined
  showDrafts: boolean
}

export function buildReleaseDetailModel(
  input: BuildReleaseDetailModelInput,
): ReleaseDetailModel {
  const { page, pkg, messages } = input

  const artworkPath = selectReleaseArtwork({
    cover: pkg.cover,
    artwork: pkg.artwork,
  })
  const resolvedArtwork = artworkPath ? input.resolveArtwork(pkg) : undefined
  const placeholder = !resolvedArtwork ? input.resolvePlaceholder() : undefined

  const albumBySrc = Object.fromEntries(
    Object.entries(input.albumBySrc).map(([src, album]) => [
      src,
      {
        ...album,
        ...(album.credit === undefined ? {} : { credit: { ...album.credit } }),
        covers: album.covers.map(
          (cover) => input.resolveAlbumCover(cover).publicPath,
        ),
        discs: album.discs.map((disc) => ({
          ...disc,
          tracks: disc.tracks.map((track) => ({
            ...track,
            artists: [...track.artists],
          })),
        })),
      },
    ]),
  )

  return {
    showDraftBadge: page.isDraft && input.showDrafts,
    draftLabel: messages.draft,
    includedInIndex: true,
    date: pkg.date ?? '',
    artwork: {
      kind: resolvedArtwork
        ? 'artwork'
        : placeholder
          ? 'placeholder'
          : 'empty-frame',
      artwork: resolvedArtwork ?? placeholder,
      alt: page.title,
    },
    locale: page.locale,
    mainLocale: input.mainLocale,
    messages,
    loadStrategy: input.loadStrategy,
    albumBySrc,
  }
}
