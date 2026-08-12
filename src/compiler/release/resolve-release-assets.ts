import type { AssetManifest, ResolvedAsset } from '../../shared/asset-types.js'
import type { RouteContentPackage } from '../../shared/types.js'

export function resolvedFromPublicPath(
  manifest: AssetManifest,
  publicPath: string | undefined,
): ResolvedAsset | undefined {
  if (!publicPath) return undefined
  return (
    manifest.assets.find((a) => a.publicPath === publicPath) ?? {
      kind: 'content',
      sourcePath: publicPath,
      assetPath: publicPath,
      publicPath,
      absoluteUrl: publicPath,
      contentHash: '',
    }
  )
}

export function resolvePackageArtwork(
  manifest: AssetManifest,
  pkg: RouteContentPackage,
): ResolvedAsset | undefined {
  if (!pkg.artwork) return undefined
  const publicPath =
    manifest.contentPublicPaths[pkg.identity]?.[pkg.artwork] ??
    manifest.contentPublicPaths[pkg.identity]?.[
      pkg.artwork.startsWith('./') ? pkg.artwork : `./${pkg.artwork}`
    ]
  return resolvedFromPublicPath(manifest, publicPath)
}

export function resolvePackageAssetRef(
  manifest: AssetManifest,
  identity: string,
  relativeRef: string,
): ResolvedAsset {
  const normalized = relativeRef.startsWith('./')
    ? relativeRef
    : `./${relativeRef}`
  const publicPath =
    manifest.contentPublicPaths[identity]?.[relativeRef] ??
    manifest.contentPublicPaths[identity]?.[normalized]
  const resolved = resolvedFromPublicPath(manifest, publicPath)
  if (!resolved) {
    throw new Error(
      `Missing hashed asset for ${identity} ref ${relativeRef}`,
    )
  }
  return resolved
}

export function resolveArtworkPlaceholder(
  manifest: AssetManifest,
  artworkPlaceholder: string | undefined,
): ResolvedAsset | undefined {
  if (!artworkPlaceholder) return undefined
  const publicPath =
    manifest.globalPublicPaths[artworkPlaceholder] ??
    manifest.globalPublicPaths[
      artworkPlaceholder.startsWith('./')
        ? artworkPlaceholder
        : `./${artworkPlaceholder}`
    ]
  return resolvedFromPublicPath(manifest, publicPath)
}
