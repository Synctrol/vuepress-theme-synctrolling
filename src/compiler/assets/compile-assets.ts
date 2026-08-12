import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import type {
  AssetManifest,
  AssetPackageSource,
  CompileAssetsOptions,
  ResolvedAsset,
} from '../../shared/asset-types.js'
import { buildContentAssetPath, contentAssetKey } from './content-path.js'
import {
  buildAssetAbsoluteUrl,
  buildAssetPublicPath,
} from './emit-url.js'
import { resolveGlobalAsset, collectGlobalOptionRefs } from './global-pipeline.js'
import { hashFileContents } from './hash.js'
import {
  assertNoRawHtmlRelativeAssets,
  extractMarkdownAssetRefs,
} from './markdown-assets.js'
import { AssetRegistry } from './registry.js'
import { resolveSafePath } from './safe-path.js'
import { resolveThemeAsset } from './theme-pipeline.js'

function packageIdentity(pkg: AssetPackageSource): string {
  if (pkg.type === 'home') return 'home'
  if (!pkg.slug) {
    throw new Error(`Package type ${pkg.type} requires slug for asset identity`)
  }
  return `${pkg.type}:${pkg.slug}`
}

function resolveContentAssetFile(input: {
  resolveRoot: string
  packageDir: string
  type: AssetPackageSource['type']
  slug: string | null
  relativeRef: string
  base: string
  siteUrl: string
}): ResolvedAsset {
  const sourcePath = resolveSafePath(input.resolveRoot, input.relativeRef)
  const buffer = readFileSync(sourcePath)
  const contentHash = hashFileContents(buffer)
  const packageRelativeAsset = relative(input.packageDir, sourcePath).replace(
    /\\/g,
    '/',
  )
  const assetPath = buildContentAssetPath({
    type: input.type,
    slug: input.slug,
    packageRelativeAsset,
    contentHash,
  })
  const publicPath = buildAssetPublicPath(assetPath, input.base)
  return {
    kind: 'content',
    sourcePath,
    assetPath,
    publicPath,
    absoluteUrl: buildAssetAbsoluteUrl(publicPath, input.siteUrl),
    contentHash,
  }
}

function writeAsset(destDir: string, asset: ResolvedAsset): void {
  const outputPath = join(destDir, asset.assetPath.replace(/^\//, ''))
  mkdirSync(dirname(outputPath), { recursive: true })
  copyFileSync(asset.sourcePath, outputPath)
}

export function compileAssets(
  options: CompileAssetsOptions,
): AssetManifest {
  const registry = new AssetRegistry()
  const siteUrl = options.themeOptions.siteUrl
  const seenSources = new Set<string>()

  const registerUnique = (asset: ResolvedAsset): ResolvedAsset => {
    const existing = registry.getBySource(asset.sourcePath)
    if (existing) return existing
    if (seenSources.has(asset.sourcePath)) return asset
    seenSources.add(asset.sourcePath)
    registry.register(asset)
    writeAsset(options.destDir, asset)
    return asset
  }

  for (const pkg of options.packages) {
    const identity = packageIdentity(pkg)
    const declared = new Set<string>(pkg.declaredPaths)

    for (const ref of declared) {
      const resolved = resolveContentAssetFile({
        resolveRoot: pkg.packageDir,
        packageDir: pkg.packageDir,
        type: pkg.type,
        slug: pkg.slug,
        relativeRef: ref,
        base: options.base,
        siteUrl,
      })
      const unique = registerUnique(resolved)
      registry.registerContent(identity, ref, unique)
      const key = contentAssetKey(
        relative(pkg.packageDir, unique.sourcePath).replace(/\\/g, '/'),
      )
      registry.registerContent(identity, `./assets/${key}`, unique)
    }

    for (const markdown of pkg.localeMarkdown) {
      assertNoRawHtmlRelativeAssets(markdown.body, markdown.filePath)
      const markdownRoot = dirname(markdown.filePath)
      for (const ref of extractMarkdownAssetRefs(markdown.body)) {
        const resolved = resolveContentAssetFile({
          resolveRoot: markdownRoot,
          packageDir: pkg.packageDir,
          type: pkg.type,
          slug: pkg.slug,
          relativeRef: ref,
          base: options.base,
          siteUrl,
        })
        const unique = registerUnique(resolved)
        registry.registerContent(identity, ref, unique)
        const key = contentAssetKey(
          relative(pkg.packageDir, unique.sourcePath).replace(/\\/g, '/'),
        )
        registry.registerContent(identity, `./assets/${key}`, unique)
      }
    }
  }

  for (const ref of collectGlobalOptionRefs(options.themeOptions)) {
    const resolved = resolveGlobalAsset({
      configDir: options.configDir,
      relativeRef: ref,
      base: options.base,
      siteUrl,
    })
    const unique = registerUnique(resolved)
    registry.registerGlobal(ref, unique)
  }

  for (const ref of options.themeAssetPaths) {
    const resolved = resolveThemeAsset({
      themeAssetsRoot: options.themeAssetsRoot,
      relativeRef: ref,
      base: options.base,
      siteUrl,
    })
    registerUnique(resolved)
  }

  const publicDir = resolve(options.configDir, 'public')
  for (const asset of registry.toManifest().assets) {
    if (
      asset.sourcePath === publicDir ||
      asset.sourcePath.startsWith(`${publicDir}/`) ||
      asset.sourcePath.startsWith(`${publicDir}\\`)
    ) {
      throw new Error(
        '.vuepress/public files must not enter the hashed asset pipeline',
      )
    }
  }

  return registry.toManifest()
}
