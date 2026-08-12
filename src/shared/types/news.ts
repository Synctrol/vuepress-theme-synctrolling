import type { ContentIdentity } from '../route-types.js'

export interface NewsTagLink {
  key: string
  title: string
  publicPath: string
}

export interface NewsListItem {
  identity: Extract<ContentIdentity, `news:${string}`>
  slug: string
  publicPath: string
  title: string
  titleLang: string
  description?: string
  descriptionLang?: string
  date: string
  updated?: string
  coverPublicPath?: string
  tags: NewsTagLink[]
  isFallback: boolean
  isDraft: boolean
  excludeFromRss: boolean
}

export interface NewsTagCount {
  key: string
  title: string
  titleLang: string
  count: number
  /** Present only when a tag archive page exists. */
  publicPath?: string
}

export interface NewsPagination {
  page: number
  pageCount: number
  prevPublicPath?: string
  nextPublicPath?: string
}

export type NewsCollectionKind = 'news-index' | 'news-tags-index' | 'news-tag'

export interface NewsCollectionPageData {
  kind: NewsCollectionKind
  heading: string
  description: string
  items: NewsListItem[]
  tags?: NewsTagCount[]
  tagKey?: string
  pagination: NewsPagination | null
}

export interface NewsDetailPageData {
  kind: 'news-detail'
  slug: string
  title: string
  titleLang: string
  date: string
  updated?: string
  coverPublicPath?: string
  tags: NewsTagLink[]
  isFallback: boolean
  isDraft: boolean
  translationUnavailableMessage?: string
  bodyLang: string
}

export interface PageDetailPageData {
  kind: 'page-detail'
  slug: string
  title: string
  titleLang: string
  coverPublicPath?: string
  isFallback: boolean
  isDraft: boolean
  translationUnavailableMessage?: string
  bodyLang: string
}

export type SynctrolNewsFrontmatter =
  | { kind: 'index'; data: NewsCollectionPageData }
  | { kind: 'tags-index'; data: NewsCollectionPageData }
  | { kind: 'tag'; data: NewsCollectionPageData }
  | { kind: 'detail'; data: NewsDetailPageData }

export interface SynctrolPageFrontmatter {
  kind: 'detail'
  data: PageDetailPageData
}

export interface SynctrolHomeFrontmatter {
  kind: 'home'
  logoHtml: string
  footerHtml?: string
}
