import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { ContentDefinitions, LocaleKey, RouteContentPackage } from '../../shared/types.js'
import type { NewsListItem, NewsTagLink } from '../../shared/types/news.js'
import { encodeRouteSegment } from '../path-suffix.js'
import { buildUrlLayers } from '../url-layers.js'

export interface BuildNewsListItemsInput {
  locale: LocaleKey
  packages: readonly RouteContentPackage[]
  detailPages: readonly CompiledPage[]
  tagArchivePages: readonly CompiledPage[]
  options: ResolvedSynctrolThemeOptions
  definitions: ContentDefinitions
  resolveCoverPublicPath: (pkg: RouteContentPackage, relativePath: string) => string | undefined
  base: string
}

function compareNews(left: RouteContentPackage, right: RouteContentPackage): number {
  const byDate = (right.date ?? '').localeCompare(left.date ?? '')
  return byDate === 0 ? (left.slug ?? '').localeCompare(right.slug ?? '') : byDate
}

function tagPublicPath(
  tag: string,
  locale: LocaleKey,
  pages: readonly CompiledPage[],
  options: ResolvedSynctrolThemeOptions,
  base: string,
): string {
  const compiled = pages.find(
    (page) =>
      page.locale === locale &&
      page.contentType === 'news-collection' &&
      page.identity === `news-tag:${tag}` &&
      page.collection?.page === 1,
  )
  if (compiled) return compiled.url.publicPath
  return buildUrlLayers({
    locale: encodeRouteSegment(locale, 'locale'),
    pathSuffix: `/${encodeRouteSegment(options.news.urlSegment, 'options.news.urlSegment')}/${encodeRouteSegment(options.news.tags.urlSegment, 'options.news.tags.urlSegment')}/${encodeRouteSegment(tag, 'tag')}/`,
    base,
    siteUrl: options.siteUrl,
  }).publicPath
}

function truncateDescription(
  description: string,
  lang: string | undefined,
): string {
  const limit = lang === 'zh-CN' ? 80 : 100
  if (description.length <= limit) return description
  return `${description.slice(0, limit)}…`
}

export function buildNewsListItems(input: BuildNewsListItemsInput): NewsListItem[] {
  const detailByIdentity = new Map(
    input.detailPages
      .filter((page) => page.locale === input.locale && page.contentType === 'news')
      .map((page) => [page.identity, page]),
  )

  return input.packages
    .filter(
      (pkg): pkg is RouteContentPackage & { slug: string; type: 'news' } =>
        pkg.type === 'news' && pkg.slug !== null,
    )
    .filter((pkg) => detailByIdentity.has(`news:${pkg.slug}`))
    .sort(compareNews)
    .map((pkg) => {
      const page = detailByIdentity.get(`news:${pkg.slug}`)!
      const body = pkg.locales[page.bodyLocale]
      if (body === undefined) {
        throw new Error(`Missing ${page.bodyLocale} markdown for ${pkg.identity}`)
      }
      const bodyLocale = input.options.locales[page.bodyLocale] ?? input.options.locales[input.options.mainLocale]
      const tags: NewsTagLink[] = pkg.tags.map((key) => {
        const resolved = resolveMultilanguage(
          input.definitions.tags[key]!.title,
          input.locale,
          input.options.mainLocale,
        )
        return {
          key,
          title: resolved.text,
          publicPath: tagPublicPath(key, input.locale, input.tagArchivePages, input.options, input.base),
        }
      })
      return {
        identity: `news:${pkg.slug}` as const,
        slug: pkg.slug,
        publicPath: page.url.publicPath,
        title: body.title,
        titleLang: bodyLocale.lang,
        description:
          body.description === undefined
            ? undefined
            : truncateDescription(body.description, bodyLocale.lang),
        descriptionLang: body.description === undefined ? undefined : bodyLocale.lang,
        date: pkg.date!,
        updated: pkg.updated,
        coverPublicPath: pkg.cover ? input.resolveCoverPublicPath(pkg, pkg.cover) : undefined,
        tags,
        isFallback: page.isFallback,
        isDraft: page.isDraft,
        excludeFromRss: page.isFallback || page.isDraft,
      }
    })
}
