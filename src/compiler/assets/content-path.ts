import type { ContentType } from '../../shared/types.js'
import { insertContentHash } from './hash.js'

export interface BuildContentAssetPathInput {
  type: ContentType
  slug: string | null
  /** Package-relative path such as ./assets/cover.webp or assets/covers/a.webp */
  packageRelativeAsset: string
  contentHash: string
}

function stripDotSlash(path: string): string {
  return path.replace(/^\.\//, '')
}

/**
 * Maps a package-relative file under `assets/` to the retained relative key
 * used in the public URL (without the `assets/` prefix).
 */
export function contentAssetKey(packageRelativeAsset: string): string {
  const normalized = stripDotSlash(packageRelativeAsset).replace(/\\/g, '/')
  if (normalized === 'assets' || normalized.startsWith('assets/')) {
    return normalized.slice('assets/'.length)
  }
  // Non-assets-directory package files still emit under their relative path
  return normalized
}

export function buildContentAssetPath(
  input: BuildContentAssetPathInput,
): string {
  const key = contentAssetKey(input.packageRelativeAsset)
  const hashed = insertContentHash(key, input.contentHash)
  if (input.type === 'home') {
    return `/assets/content/home/${hashed}`
  }
  if (!input.slug) {
    throw new Error(`Content type ${input.type} requires a slug for assets`)
  }
  return `/assets/content/${input.type}/${input.slug}/${hashed}`
}
