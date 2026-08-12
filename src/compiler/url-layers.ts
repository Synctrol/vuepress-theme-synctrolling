import { joinPublicPath, normalizePathSuffix } from '../shared/route-path.js'
import type { BuildUrlLayersInput, UrlLayers } from '../shared/route-types.js'
import { assertSiteUrl } from './site-url.js'

export function buildUrlLayers(input: BuildUrlLayersInput): UrlLayers {
  const siteUrl = assertSiteUrl(input.siteUrl)
  const pathSuffix = normalizePathSuffix(input.pathSuffix)
  // `input.locale` is the encoded locale segment — see BuildUrlLayersInput.
  const routePath =
    pathSuffix === '/' ? `/${input.locale}/` : `/${input.locale}${pathSuffix}`
  const publicPath = joinPublicPath(input.base, routePath)
  // VuePress computes htmlFilePathRelative from decodeURI(page.path), so the
  // output layer must be decoded or encoded slugs would write to the wrong file.
  const decodedRoutePath = decodeURI(routePath)

  return {
    routePath,
    outputPath: `${decodedRoutePath.slice(1)}index.html`,
    publicPath,
    absoluteUrl: `${siteUrl}${publicPath}`,
  }
}
