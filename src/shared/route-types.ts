import type { ContentType, LocaleKey } from './types.js'

export interface UrlLayers {
  /** Locale-prefixed router path without origin or VuePress base, percent-encoded. */
  routePath: string
  /**
   * File path below VuePress dest; directory routes use index.html.
   *
   * Percent-DECODED, because VuePress derives `Page.htmlFilePathRelative` with
   * `removeLeadingSlash(decodeURI(page.path) + 'index.html')`. Task 12 asserts
   * the two agree.
   */
  outputPath: string
  /** VuePress base + routePath, used by browser links. */
  publicPath: string
  /** siteUrl origin + publicPath, used by canonical/OG/RSS later. */
  absoluteUrl: string
}

export type GeneratedCollectionIdentity =
  | 'release-index'
  | `release-page:${number}`
  | 'news-index'
  | `news-page:${number}`
  | 'news-tags-index'
  | `news-tag:${string}`
  | `news-tag:${string}:page:${number}`

export type ContentIdentity =
  | 'home'
  | `release:${string}`
  | `news:${string}`
  | `page:${string}`

export type PageIdentity = ContentIdentity | GeneratedCollectionIdentity

export interface BuildUrlLayersInput {
  /**
   * Locale route segment **already** passed through
   * `encodeRouteSegment(localeKey, 'locale')`.
   *
   * This builder concatenates; it does not encode and must not be given a raw
   * configuration LocaleKey that still needs encoding. ASCII keys such as
   * `zh` / `en` are identity under encoding, so fixtures may pass them as-is.
   * Non-ASCII keys (e.g. `日本語`) must arrive percent-encoded.
   */
  locale: string
  /**
   * Type default or page-specific suffix; normalized by the builder.
   * Every segment inside the suffix must already be encodeRouteSegment'd
   * (slugs, tags, urlSegments, page-specific path parts).
   */
  pathSuffix: string
  base: string
  siteUrl: string
}

export interface CompiledPage {
  identity: PageIdentity
  locale: LocaleKey
  contentType: ContentType | 'release-collection' | 'news-collection'
  url: UrlLayers
  isFallback: boolean
  isDraft: boolean
  noindex: boolean
  /** Locale whose Markdown body is rendered. */
  bodyLocale: LocaleKey
  /** Locale used as canonical when fallback; otherwise equals `locale`. */
  canonicalLocale: LocaleKey
  /** Absolute package directory; absent for generated collection pages. */
  packagePath?: string
  slug?: string | null
  /**
   * Detail pages carry Markdown titles. Generated collection pages carry their
   * identity as a placeholder; Plan 10 resolves real titles from
   * `seo.collections` and locale messages.
   */
  title: string
  description?: string
  /** Present for collection pages. */
  collection?: {
    page: number
    pageCount: number
    itemIdentities: ContentIdentity[]
    tag?: string
  }
}
