import type { ResolvedSynctrolThemeOptions } from '../shared/options.js'
import type {
  CompiledPage,
  ContentIdentity,
  GeneratedCollectionIdentity,
} from '../shared/route-types.js'
import type { LocaleKey, RouteContentPackage } from '../shared/types.js'
import { encodeRouteSegment } from './path-suffix.js'
import { buildUrlLayers } from './url-layers.js'

export interface CollectionCompileInput {
  detailPages: readonly CompiledPage[]
  packages: readonly RouteContentPackage[]
  options: ResolvedSynctrolThemeOptions
  base: string
  localeKeys: readonly LocaleKey[]
  declaredTags: readonly string[]
}

type CollectionContentType = 'release-collection' | 'news-collection'

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function sortPackages(
  packages: readonly RouteContentPackage[],
): RouteContentPackage[] {
  return [...packages].sort((left, right) => {
    const byDate = compareText(right.date ?? '', left.date ?? '')
    if (byDate !== 0) return byDate
    return compareText(left.slug ?? '', right.slug ?? '')
  })
}

function chunk(
  identities: readonly ContentIdentity[],
  pagination: number | false,
): ContentIdentity[][] {
  if (pagination === false || identities.length === 0) return [[...identities]]

  const chunks: ContentIdentity[][] = []
  for (let index = 0; index < identities.length; index += pagination) {
    chunks.push(identities.slice(index, index + pagination))
  }
  return chunks
}

function collectionPage(args: {
  identity: GeneratedCollectionIdentity
  locale: LocaleKey
  contentType: CollectionContentType
  pathSuffix: string
  options: ResolvedSynctrolThemeOptions
  base: string
  page: number
  pageCount: number
  itemIdentities: ContentIdentity[]
  tag?: string
}): CompiledPage {
  const page: CompiledPage = {
    identity: args.identity,
    locale: args.locale,
    contentType: args.contentType,
    url: buildUrlLayers({
      locale: encodeRouteSegment(args.locale, 'locale'),
      pathSuffix: args.pathSuffix,
      base: args.base,
      siteUrl: args.options.siteUrl,
    }),
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: args.locale,
    canonicalLocale: args.locale,
    // Placeholder; Plan 10 resolves real titles from seo.collections + messages.
    title: args.identity,
    collection: {
      page: args.page,
      pageCount: args.pageCount,
      itemIdentities: args.itemIdentities,
    },
  }

  if (args.tag !== undefined && page.collection !== undefined) {
    page.collection.tag = args.tag
  }

  return page
}

function emitPaged(args: {
  locale: LocaleKey
  identities: ContentIdentity[]
  pagination: number | false
  indexIdentity: GeneratedCollectionIdentity
  pageIdentity: (page: number) => GeneratedCollectionIdentity
  indexSuffix: string
  pageSuffix: (page: number) => string
  contentType: CollectionContentType
  options: ResolvedSynctrolThemeOptions
  base: string
  tag?: string
}): CompiledPage[] {
  const chunks = chunk(args.identities, args.pagination)
  const pageCount = chunks.length
  const pages: CompiledPage[] = [
    collectionPage({
      identity: args.indexIdentity,
      locale: args.locale,
      contentType: args.contentType,
      pathSuffix: args.indexSuffix,
      options: args.options,
      base: args.base,
      page: 1,
      pageCount,
      itemIdentities: chunks[0] ?? [],
      ...(args.tag === undefined ? {} : { tag: args.tag }),
    }),
  ]

  for (let page = 2; page <= pageCount; page += 1) {
    pages.push(
      collectionPage({
        identity: args.pageIdentity(page),
        locale: args.locale,
        contentType: args.contentType,
        pathSuffix: args.pageSuffix(page),
        options: args.options,
        base: args.base,
        page,
        pageCount,
        itemIdentities: chunks[page - 1] ?? [],
        ...(args.tag === undefined ? {} : { tag: args.tag }),
      }),
    )
  }

  return pages
}

export function compileCollectionRoutes(
  input: CollectionCompileInput,
): CompiledPage[] {
  const { options, base, localeKeys } = input
  // Plan 01 assertRouteSegment alone is not VuePress-safe; gate + encode here.
  const releaseSegment = encodeRouteSegment(
    options.release.urlSegment,
    'options.release.urlSegment',
  )
  const newsSegment = encodeRouteSegment(
    options.news.urlSegment,
    'options.news.urlSegment',
  )
  const tagsSegment = encodeRouteSegment(
    options.news.tags.urlSegment,
    'options.news.tags.urlSegment',
  )

  const releases = sortPackages(
    input.packages.filter((pkg) => pkg.type === 'release'),
  )
  const news = sortPackages(input.packages.filter((pkg) => pkg.type === 'news'))
  const pages: CompiledPage[] = []

  for (const locale of localeKeys) {
    const visible = new Set(
      input.detailPages
        .filter((page) => page.locale === locale)
        .map((page) => page.identity as string),
    )

    if (options.release.index.enabled) {
      const identities = releases
        .map((pkg) => `release:${pkg.slug}` as ContentIdentity)
        .filter((identity) => visible.has(identity))

      pages.push(
        ...emitPaged({
          locale,
          identities,
          pagination: options.release.index.pagination,
          indexIdentity: 'release-index',
          pageIdentity: (page) => `release-page:${page}`,
          indexSuffix: `/${releaseSegment}/`,
          pageSuffix: (page) => `/${releaseSegment}/page/${page}/`,
          contentType: 'release-collection',
          options,
          base,
        }),
      )
    }

    const visibleNews = news.filter((pkg) => visible.has(`news:${pkg.slug}`))

    if (options.news.index.enabled) {
      pages.push(
        ...emitPaged({
          locale,
          identities: visibleNews.map(
            (pkg) => `news:${pkg.slug}` as ContentIdentity,
          ),
          pagination: options.news.index.pagination,
          indexIdentity: 'news-index',
          pageIdentity: (page) => `news-page:${page}`,
          indexSuffix: `/${newsSegment}/`,
          pageSuffix: (page) => `/${newsSegment}/page/${page}/`,
          contentType: 'news-collection',
          options,
          base,
        }),
      )
    }

    if (options.news.tags.index.enabled) {
      pages.push(
        collectionPage({
          identity: 'news-tags-index',
          locale,
          contentType: 'news-collection',
          pathSuffix: `/${newsSegment}/${tagsSegment}/`,
          options,
          base,
          page: 1,
          pageCount: 1,
          itemIdentities: [],
        }),
      )
    }

    for (const tag of input.declaredTags) {
      const identities = visibleNews
        .filter((pkg) => pkg.tags.includes(tag))
        .map((pkg) => `news:${pkg.slug}` as ContentIdentity)
      if (identities.length === 0) continue

      const encoded = encodeRouteSegment(tag, 'tag')
      pages.push(
        ...emitPaged({
          locale,
          identities,
          pagination: options.news.index.pagination,
          indexIdentity: `news-tag:${tag}`,
          pageIdentity: (page) => `news-tag:${tag}:page:${page}`,
          indexSuffix: `/${newsSegment}/${tagsSegment}/${encoded}/`,
          pageSuffix: (page) =>
            `/${newsSegment}/${tagsSegment}/${encoded}/page/${page}/`,
          contentType: 'news-collection',
          options,
          base,
          tag,
        }),
      )
    }
  }

  return pages
}
