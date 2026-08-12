import { joinPublicPath } from '../../shared/route-path.js'
import { assertSiteUrl } from '../site-url.js'

export function buildAssetPublicPath(assetPath: string, base: string): string {
  const normalizedAsset = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  return joinPublicPath(base, normalizedAsset)
}

export function buildAssetAbsoluteUrl(
  publicPath: string,
  siteUrl: string,
): string {
  const origin = assertSiteUrl(siteUrl)
  const path = publicPath.startsWith('/') ? publicPath : `/${publicPath}`
  return `${origin}${path}`
}
