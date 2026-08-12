import { readFileSync, realpathSync } from 'node:fs'
import { relative } from 'node:path'
import type { ResolvedAsset } from '../../shared/asset-types.js'
import {
  buildAssetAbsoluteUrl,
  buildAssetPublicPath,
} from './emit-url.js'
import { hashFileContents, insertContentHash } from './hash.js'
import { resolveSafePath } from './safe-path.js'

/**
 * Explicit theme static files are hashed here.
 *
 * Background modules must import their own images/fonts/wasm with normal
 * TypeScript/ESM imports (for example `import noise from './noise.png'`).
 * Those imports are emitted by the VuePress bundler as theme assets and are
 * intentionally outside `compileAssets()`.
 */
export function buildThemeAssetPath(
  relativePath: string,
  hash: string,
): string {
  return `/assets/theme/${insertContentHash(relativePath, hash)}`
}

export function resolveThemeAsset(input: {
  themeAssetsRoot: string
  relativeRef: string
  base: string
  siteUrl: string
}): ResolvedAsset {
  const sourcePath = resolveSafePath(input.themeAssetsRoot, input.relativeRef)
  const buffer = readFileSync(sourcePath)
  const contentHash = hashFileContents(buffer)
  // resolveSafePath returns real paths; compare against the real root so a
  // symlink themeAssetsRoot does not yield keys like `../../actual/...`.
  const rootReal = realpathSync(input.themeAssetsRoot)
  const key = relative(rootReal, sourcePath).replace(/\\/g, '/')
  const assetPath = buildThemeAssetPath(key, contentHash)
  const publicPath = buildAssetPublicPath(assetPath, input.base)
  return {
    kind: 'theme',
    sourcePath,
    assetPath,
    publicPath,
    absoluteUrl: buildAssetAbsoluteUrl(publicPath, input.siteUrl),
    contentHash,
  }
}
