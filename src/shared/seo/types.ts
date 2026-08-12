import type { Book, ContentDefinitions } from '../types.js'

export interface SeoAssetContext {
  defaultImageAbsoluteUrl: string
  organizationLogoAbsoluteUrl: string
  coverAbsoluteUrlByPackagePath: ReadonlyMap<string, string>
}

export interface SeoContentContext {
  assets: SeoAssetContext
  definitions: ContentDefinitions
  bookByPackagePath: ReadonlyMap<string, Book>
  dateByPackagePath: ReadonlyMap<string, string>
  updatedByPackagePath: ReadonlyMap<string, string>
}

export interface HreflangAlternate {
  hreflang: string
  href: string
}

export interface OpenGraphData {
  type: 'website' | 'article'
  title: string
  description: string
  url: string
  image: string
  locale: string
}

export interface JsonLdNode {
  '@context'?: 'https://schema.org'
  '@type': string
  [key: string]: unknown
}

export interface PageSeo {
  title: string
  description: string
  canonicalUrl: string
  lang: string
  robots: 'index,follow' | 'noindex,follow'
  openGraph: OpenGraphData
  hreflang: HreflangAlternate[]
  jsonLd: JsonLdNode[]
}

export interface HeadTag {
  tag: 'title' | 'meta' | 'link' | 'script'
  attrs?: Record<string, string>
  text?: string
}

export interface RssItem {
  title: string
  description: string
  link: string
  guid: string
  pubDate: string
}
