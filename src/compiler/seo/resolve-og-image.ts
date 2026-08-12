import type { CompiledPage } from '../../shared/route-types.js'
import type { SeoAssetContext } from '../../shared/seo/types.js'

export function resolveOgImage(page: CompiledPage, assets: SeoAssetContext): string {
  if (page.contentType === 'home') return assets.defaultImageAbsoluteUrl
  if (page.packagePath && assets.coverAbsoluteUrlByPackagePath.has(page.packagePath)) {
    return assets.coverAbsoluteUrlByPackagePath.get(page.packagePath)!
  }
  return assets.defaultImageAbsoluteUrl
}
