import { formatMessage } from '../../shared/format-message.js'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage, ContentIdentity } from '../../shared/route-types.js'
import type { ContentDefinitions, RouteContentPackage } from '../../shared/types.js'
import type {
  NewsCollectionPageData,
  NewsListItem,
  NewsPagination,
  SynctrolNewsFrontmatter,
} from '../../shared/types/news.js'
import { buildNewsListItems } from './build-news-list-items.js'
import { buildNewsTagsIndex } from './build-news-tags-index.js'

export interface BuildNewsFrontmatterInput {
  compiled: CompiledPage
  allPages: readonly CompiledPage[]
  packages: readonly RouteContentPackage[]
  options: ResolvedSynctrolThemeOptions
  definitions: ContentDefinitions
  resolveCoverPublicPath: (
    pkg: RouteContentPackage,
    relativePath: string,
  ) => string | undefined
  base: string
}

function localeOptions(
  options: ResolvedSynctrolThemeOptions,
  locale: string,
) {
  return options.locales[locale] ?? options.locales[options.mainLocale]
}

function selectDetailPages(
  allPages: readonly CompiledPage[],
  locale: string,
): CompiledPage[] {
  return allPages.filter(
    (page) => page.contentType === 'news' && page.locale === locale,
  )
}

function selectTagArchivePages(
  allPages: readonly CompiledPage[],
): CompiledPage[] {
  return allPages.filter(
    (page) =>
      page.contentType === 'news-collection' &&
      String(page.identity).startsWith('news-tag:') &&
      !String(page.identity).includes(':page:'),
  )
}

function sliceItemsByIdentities(
  items: readonly NewsListItem[],
  identities: readonly ContentIdentity[],
): NewsListItem[] {
  const byIdentity = new Map(items.map((item) => [item.identity, item]))
  const sliced: NewsListItem[] = []
  for (const identity of identities) {
    const item = byIdentity.get(identity as NewsListItem['identity'])
    if (item !== undefined) sliced.push(item)
  }
  return sliced
}

function paginationForCollection(
  compiled: CompiledPage,
  allPages: readonly CompiledPage[],
): NewsPagination {
  const collection = compiled.collection!
  const siblings = allPages.filter(
    (page) =>
      page.contentType === compiled.contentType &&
      page.locale === compiled.locale &&
      page.collection !== undefined &&
      page.collection.tag === collection.tag &&
      String(page.identity) !== 'news-tags-index',
  )
  const prev = siblings.find(
    (page) => page.collection?.page === collection.page - 1,
  )
  const next = siblings.find(
    (page) => page.collection?.page === collection.page + 1,
  )
  return {
    page: collection.page,
    pageCount: collection.pageCount,
    prevPublicPath: prev?.url.publicPath,
    nextPublicPath: next?.url.publicPath,
  }
}

function collectionHeading(
  kind: NewsCollectionPageData['kind'],
  compiled: CompiledPage,
  title: string,
  options: ResolvedSynctrolThemeOptions,
  definitions: ContentDefinitions,
): string {
  const messages = localeOptions(options, compiled.locale).messages
  if (kind === 'news-index' && compiled.collection && compiled.collection.page > 1) {
    return formatMessage(messages.paginatedTitle, {
      title,
      page: compiled.collection.page,
    })
  }
  if (kind === 'news-tag' && compiled.collection?.tag !== undefined) {
    const tagKey = compiled.collection.tag
    const tagTitle = resolveMultilanguage(
      definitions.tags[tagKey]!.title,
      compiled.locale,
      options.mainLocale,
    ).text
    return formatMessage(messages.tagArchiveTitle, { tag: tagTitle, title })
  }
  return title
}

function buildCollectionFrontmatter(
  compiled: CompiledPage,
  allPages: readonly CompiledPage[],
  items: readonly NewsListItem[],
  tagArchivePages: readonly CompiledPage[],
  options: ResolvedSynctrolThemeOptions,
  definitions: ContentDefinitions,
): SynctrolNewsFrontmatter | null {
  const identity = String(compiled.identity)
  const collectionCopy = options.seo.collections.news
  const title = resolveMultilanguage(
    collectionCopy.title,
    compiled.locale,
    options.mainLocale,
  ).text
  const description = resolveMultilanguage(
    collectionCopy.description,
    compiled.locale,
    options.mainLocale,
  ).text

  const pageItems = sliceItemsByIdentities(
    items,
    compiled.collection?.itemIdentities ?? [],
  )

  if (identity === 'news-tags-index') {
    return {
      kind: 'tags-index',
      data: {
        kind: 'news-tags-index',
        heading: title,
        description,
        items: pageItems,
        tags: buildNewsTagsIndex({
          locale: compiled.locale,
          items,
          definitions,
          options,
          tagArchivePages,
        }),
        pagination: null,
      },
    }
  }

  if (identity === 'news-index' || identity.startsWith('news-page:')) {
    return {
      kind: 'index',
      data: {
        kind: 'news-index',
        heading: collectionHeading(
          'news-index',
          compiled,
          title,
          options,
          definitions,
        ),
        description,
        items: pageItems,
        pagination: paginationForCollection(compiled, allPages),
      },
    }
  }

  if (identity.startsWith('news-tag:')) {
    const tagKey = compiled.collection?.tag
    if (tagKey === undefined) return null
    return {
      kind: 'tag',
      data: {
        kind: 'news-tag',
        heading: collectionHeading(
          'news-tag',
          compiled,
          title,
          options,
          definitions,
        ),
        description,
        items: pageItems,
        tagKey,
        pagination: paginationForCollection(compiled, allPages),
      },
    }
  }

  return null
}

function buildDetailFrontmatter(
  compiled: CompiledPage,
  items: readonly NewsListItem[],
  options: ResolvedSynctrolThemeOptions,
): SynctrolNewsFrontmatter | null {
  const item = items.find((entry) => entry.identity === compiled.identity)
  if (item === undefined) return null

  const bodyLocale = localeOptions(options, compiled.bodyLocale)
  const shellMessages = localeOptions(options, compiled.locale).messages

  return {
    kind: 'detail',
    data: {
      kind: 'news-detail',
      slug: item.slug,
      title: item.title,
      titleLang: item.titleLang,
      date: item.date,
      updated: item.updated,
      coverPublicPath: item.coverPublicPath,
      tags: item.tags,
      isFallback: item.isFallback,
      isDraft: item.isDraft,
      translationUnavailableMessage: item.isFallback
        ? shellMessages.translationUnavailable
        : undefined,
      bodyLang: bodyLocale.lang,
    },
  }
}

export function buildNewsFrontmatterForPage(
  input: BuildNewsFrontmatterInput,
): SynctrolNewsFrontmatter | null {
  const { compiled, allPages, packages, options, definitions, base } = input

  if (compiled.contentType !== 'news' && compiled.contentType !== 'news-collection') {
    return null
  }

  const detailPages = selectDetailPages(allPages, compiled.locale)
  const tagArchivePages = selectTagArchivePages(allPages)
  const items = buildNewsListItems({
    locale: compiled.locale,
    packages,
    detailPages,
    tagArchivePages,
    options,
    definitions,
    resolveCoverPublicPath: input.resolveCoverPublicPath,
    base,
  })

  if (compiled.contentType === 'news-collection') {
    return buildCollectionFrontmatter(
      compiled,
      allPages,
      items,
      tagArchivePages,
      options,
      definitions,
    )
  }

  return buildDetailFrontmatter(compiled, items, options)
}
