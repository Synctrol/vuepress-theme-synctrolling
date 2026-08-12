import type { AssetManifest } from '../../shared/asset-types.js'
import type { ReleaseOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type {
  CompiledContentPackage,
  LocaleKey,
  LocaleMessages,
  RouteContentPackage,
} from '../../shared/types.js'
import type { SynctrolReleaseFrontmatter } from '../../shared/release/types.js'
import { buildReleaseIndexModel } from './list-model.js'
import { buildReleaseDetailModel } from './detail-model.js'
import {
  resolveArtworkPlaceholder,
  resolvePackageArtwork,
  resolvePackageAssetRef,
} from './resolve-release-assets.js'

export interface BuildReleaseFrontmatterInput {
  compiled: CompiledPage
  allPages: CompiledPage[]
  packages: RouteContentPackage[]
  compiledPackages: CompiledContentPackage[]
  assetManifest: AssetManifest
  releaseOptions: ReleaseOptions
  showDrafts: boolean
  mainLocale: LocaleKey
  messages: LocaleMessages
  collectionTitle: string
  formatDate: (yyyyMmDd: string, locale: LocaleKey) => string
  releaseIndexHrefForLocale: (locale: LocaleKey) => string
}

function findBook(
  compiledPackages: CompiledContentPackage[],
  pkg: RouteContentPackage,
) {
  const match =
    compiledPackages.find((c) => c.identity === pkg.identity) ??
    compiledPackages.find((c) => c.dir === pkg.dir)
  return match?.book
}

function paginationHrefs(
  compiled: CompiledPage,
  allPages: CompiledPage[],
): { prevHref: string | null; nextHref: string | null } {
  const collection = compiled.collection
  if (!collection || collection.pageCount <= 1) {
    return { prevHref: null, nextHref: null }
  }
  const siblings = allPages.filter(
    (p) =>
      p.locale === compiled.locale &&
      p.contentType === 'release-collection',
  )
  const prev = siblings.find(
    (p) => p.collection?.page === collection.page - 1,
  )
  const next = siblings.find(
    (p) => p.collection?.page === collection.page + 1,
  )
  return {
    prevHref: prev?.url.publicPath ?? null,
    nextHref: next?.url.publicPath ?? null,
  }
}

export function buildReleaseFrontmatterForPage(
  input: BuildReleaseFrontmatterInput,
): SynctrolReleaseFrontmatter | null {
  const { compiled } = input

  if (compiled.contentType === 'release-collection') {
    const model = buildReleaseIndexModel({
      collectionPage: compiled,
      detailPages: input.allPages.filter((p) => p.contentType === 'release'),
      packages: input.packages,
      releaseOptions: input.releaseOptions,
      resolveArtwork: (pkg) =>
        resolvePackageArtwork(input.assetManifest, pkg),
      resolvePlaceholder: () =>
        resolveArtworkPlaceholder(
          input.assetManifest,
          input.releaseOptions.artworkPlaceholder,
        ),
      showDrafts: input.showDrafts,
    })
    if (!model) return null
    const { prevHref, nextHref } = paginationHrefs(compiled, input.allPages)
    return {
      kind: 'index',
      model,
      collectionTitle: input.collectionTitle,
      prevHref,
      nextHref,
    }
  }

  if (compiled.contentType === 'release') {
    const pkg = input.packages.find((p) => p.identity === compiled.identity)
    if (!pkg) return null
    const book = findBook(input.compiledPackages, pkg)
    const model = buildReleaseDetailModel({
      page: compiled,
      pkg,
      book,
      messages: input.messages,
      mainLocale: input.mainLocale,
      releaseIndexHref: input.releaseIndexHrefForLocale(compiled.locale),
      resolveArtwork: (p) => resolvePackageArtwork(input.assetManifest, p),
      resolveAlbumCover: (ref) =>
        resolvePackageAssetRef(input.assetManifest, pkg.identity, ref),
      resolveGiftItemCover: (ref) =>
        resolvePackageAssetRef(input.assetManifest, pkg.identity, ref),
      resolvePlaceholder: () =>
        resolveArtworkPlaceholder(
          input.assetManifest,
          input.releaseOptions.artworkPlaceholder,
        ),
      releaseOptions: input.releaseOptions,
      showDrafts: input.showDrafts,
      formatDate: input.formatDate,
    })
    return {
      kind: 'detail',
      model,
      authorsLabel: input.messages.authors,
    }
  }

  return null
}
