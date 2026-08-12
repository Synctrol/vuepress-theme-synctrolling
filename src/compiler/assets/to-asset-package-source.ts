import type {
  CompiledContentPackage,
  LocaleMarkdown,
  RouteContentPackage,
} from '../../shared/types.js'
import type { AssetPackageSource } from '../../shared/asset-types.js'
import { collectPackageDeclaredPaths } from './collect-package-refs.js'

/**
 * Join Plan 02 compiled package data with Plan 03 routed locale Markdown.
 * Caller must pair packages that share the same `dir` and `identity`.
 */
export function toAssetPackageSource(
  compiled: CompiledContentPackage,
  routed: RouteContentPackage,
): AssetPackageSource {
  if (compiled.dir !== routed.dir || compiled.identity !== routed.identity) {
    throw new Error(
      `toAssetPackageSource: dir/identity mismatch ` +
        `(compiled ${compiled.identity}@${compiled.dir} vs ` +
        `routed ${routed.identity}@${routed.dir})`,
    )
  }
  // routed.locales is Partial<Record<…>> — filter undefined before filePath/body.
  const localeMarkdown = Object.values(routed.locales)
    .filter((markdown): markdown is LocaleMarkdown => markdown != null)
    .map((markdown) => ({
      filePath: markdown.filePath,
      body: markdown.body,
    }))
  return {
    packageDir: compiled.dir,
    type: routed.type,
    slug: routed.slug,
    declaredPaths: collectPackageDeclaredPaths(compiled),
    localeMarkdown,
  }
}
