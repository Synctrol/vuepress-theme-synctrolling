import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { ContentDefinitions, LocaleKey } from '../../shared/types.js'
import type { NewsListItem, NewsTagCount } from '../../shared/types/news.js'

export interface BuildNewsTagsIndexInput {
  locale: LocaleKey
  items: readonly NewsListItem[]
  definitions: ContentDefinitions
  options: ResolvedSynctrolThemeOptions
  tagArchivePages: readonly CompiledPage[]
}

export function buildNewsTagsIndex(input: BuildNewsTagsIndexInput): NewsTagCount[] {
  const counts = new Map(Object.keys(input.definitions.tags).map((key) => [key, 0]))
  for (const item of input.items) {
    for (const tag of item.tags) {
      counts.set(tag.key, (counts.get(tag.key) ?? 0) + 1)
    }
  }

  return Object.keys(input.definitions.tags).map((key) => {
    const resolved = resolveMultilanguage(
      input.definitions.tags[key]!.title,
      input.locale,
      input.options.mainLocale,
    )
    const locale = input.options.locales[resolved.locale] ?? input.options.locales[input.options.mainLocale]
    const archive = input.tagArchivePages.find(
      (page) => page.locale === input.locale && page.identity === `news-tag:${key}`,
    )
    return {
      key,
      title: resolved.text,
      titleLang: locale.lang,
      count: counts.get(key) ?? 0,
      publicPath: archive?.url.publicPath,
    }
  })
}
