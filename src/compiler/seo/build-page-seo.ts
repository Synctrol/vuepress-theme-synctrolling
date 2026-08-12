import type { CompiledSite } from '../compile-site-routes.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { PageSeo, SeoContentContext } from '../../shared/seo/types.js'
import { buildPageJsonLd } from './json-ld.js'
import { buildOpenGraph } from './open-graph.js'
import { resolveCollectionCopy } from './collection-copy.js'
import { resolveCanonicalUrl, resolveHreflang, resolveLang, resolveRobots } from './resolve-alternates.js'
import { resolvePageDescription } from './resolve-description.js'
import { resolveOgImage } from './resolve-og-image.js'

export function buildPageSeo(
  page: CompiledPage,
  pages: readonly CompiledPage[],
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
): PageSeo {
  const collectionCopy = resolveCollectionCopy(page, options, content.definitions)
  const title = collectionCopy?.title ?? page.title
  const description = resolvePageDescription(page, options, collectionCopy)
  const canonicalUrl = resolveCanonicalUrl(page, pages)
  const lang = resolveLang(page, options)
  const image = resolveOgImage(page, content.assets)
  const robots = resolveRobots(page)
  const hreflang = resolveHreflang(page, pages, options)
  const openGraph = buildOpenGraph({ contentType: page.contentType, title, description, canonicalUrl, image, lang })
  const jsonLd = buildPageJsonLd(page, options, content, { title, description, canonicalUrl, image })
  return { title, description, canonicalUrl, lang, robots, openGraph, hreflang, jsonLd }
}

export function buildSiteSeo(
  site: CompiledSite,
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
): Map<string, PageSeo> {
  const map = new Map<string, PageSeo>()
  for (const page of site.pages) {
    map.set(`${page.locale}:${page.url.routePath}`, buildPageSeo(page, site.pages, options, content))
  }
  return map
}
