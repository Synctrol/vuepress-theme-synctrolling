import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import type { ResolvedAsset } from '../../shared/asset-types.js'
import type { CompileAssetsThemeOptions } from '../../shared/asset-types.js'
import {
  buildAssetAbsoluteUrl,
  buildAssetPublicPath,
} from './emit-url.js'
import { hashFileContents, insertContentHash } from './hash.js'
import { resolveSafePath } from './safe-path.js'

/** Config-relative = no leading `/` and not an http(s) scheme prefix. */
export function isConfigRelativeAssetRef(value: string): boolean {
  if (!value) return false
  if (value.startsWith('/')) return false
  if (/^https?:/i.test(value)) return false
  return true
}

export function collectGlobalOptionRefs(
  options: CompileAssetsThemeOptions,
): string[] {
  const refs: string[] = []
  const push = (value: string | undefined): void => {
    if (!value) return
    if (!isConfigRelativeAssetRef(value)) return
    if (!refs.includes(value)) refs.push(value)
  }
  for (const item of options.socialLinks.items) {
    push(item.icon)
  }
  push(options.release.artworkPlaceholder)
  push(options.seo.defaultImage)
  push(options.seo.organization.logo)
  return refs
}

export function globalAssetKey(
  configDir: string,
  absoluteSourcePath: string,
): string {
  const assetsRoot = resolve(configDir, 'assets')
  const rel = relative(assetsRoot, absoluteSourcePath).replace(/\\/g, '/')
  if (rel.startsWith('..')) {
    const parts = absoluteSourcePath.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] ?? absoluteSourcePath
  }
  return rel
}

export function buildGlobalAssetPath(
  relativeUnderAssets: string,
  hash: string,
): string {
  return `/assets/global/${insertContentHash(relativeUnderAssets, hash)}`
}

export function resolveGlobalAsset(input: {
  configDir: string
  relativeRef: string
  base: string
  siteUrl: string
}): ResolvedAsset {
  const sourcePath = resolveSafePath(input.configDir, input.relativeRef)
  const buffer = readFileSync(sourcePath)
  const contentHash = hashFileContents(buffer)
  const key = globalAssetKey(input.configDir, sourcePath)
  const assetPath = buildGlobalAssetPath(key, contentHash)
  const publicPath = buildAssetPublicPath(assetPath, input.base)
  return {
    kind: 'global',
    sourcePath,
    assetPath,
    publicPath,
    absoluteUrl: buildAssetAbsoluteUrl(publicPath, input.siteUrl),
    contentHash,
  }
}
