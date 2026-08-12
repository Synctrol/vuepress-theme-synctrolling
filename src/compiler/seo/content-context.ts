import type { AssetManifest, ResolvedAsset } from '../../shared/asset-types.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { SeoContentContext } from '../../shared/seo/types.js'
import type { CompiledContentPackage, ContentDefinitions, RouteContentPackage } from '../../shared/types.js'

function normalizedRef(ref: string): string {
  return ref.startsWith('./') ? ref : `./${ref}`
}

function assetByPublicPath(manifest: AssetManifest, publicPath: string | undefined): ResolvedAsset | undefined {
  return publicPath === undefined ? undefined : manifest.assets.find((asset) => asset.publicPath === publicPath)
}

function absoluteUrlForRef(
  ref: string,
  options: ResolvedSynctrolThemeOptions,
  manifest: AssetManifest,
  global: boolean,
  identity?: string,
): string {
  if (ref.startsWith('https://')) return ref
  if (ref.startsWith('http://')) throw new Error(`SEO asset must use HTTPS: ${ref}`)

  const publicPath = global
    ? manifest.globalPublicPaths[ref] ?? manifest.globalPublicPaths[normalizedRef(ref)]
    : identity === undefined
      ? undefined
      : manifest.contentPublicPaths[identity]?.[ref] ?? manifest.contentPublicPaths[identity]?.[normalizedRef(ref)]

  const resolved = assetByPublicPath(manifest, publicPath)
  if (resolved) return resolved.absoluteUrl
  if (publicPath) return `${options.siteUrl}${publicPath}`
  if (ref.startsWith('/')) return `${options.siteUrl}${ref}`

  throw new Error(`Missing hashed SEO asset for ${ref}`)
}

export function buildSeoContentContext(input: {
  assetManifest: AssetManifest
  packages: readonly RouteContentPackage[]
  compiledPackages: readonly CompiledContentPackage[]
  definitions: ContentDefinitions
  options: ResolvedSynctrolThemeOptions
}): SeoContentContext {
  const coverAbsoluteUrlByPackagePath = new Map<string, string>()
  const dateByPackagePath = new Map<string, string>()
  const updatedByPackagePath = new Map<string, string>()
  const bookByPackagePath = new Map(input.compiledPackages.flatMap((pkg) => (pkg.book ? [[pkg.dir, pkg.book] as const] : [])))

  for (const pkg of input.packages) {
    if (pkg.date) dateByPackagePath.set(pkg.dir, pkg.date)
    if (pkg.updated) updatedByPackagePath.set(pkg.dir, pkg.updated)
    if (pkg.cover) {
      coverAbsoluteUrlByPackagePath.set(
        pkg.dir,
        absoluteUrlForRef(pkg.cover, input.options, input.assetManifest, false, pkg.identity),
      )
    }
  }

  return {
    assets: {
      defaultImageAbsoluteUrl: absoluteUrlForRef(input.options.seo.defaultImage, input.options, input.assetManifest, true),
      organizationLogoAbsoluteUrl: absoluteUrlForRef(input.options.seo.organization.logo, input.options, input.assetManifest, true),
      coverAbsoluteUrlByPackagePath,
    },
    definitions: input.definitions,
    bookByPackagePath,
    dateByPackagePath,
    updatedByPackagePath,
  }
}
