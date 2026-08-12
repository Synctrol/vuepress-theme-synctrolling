import { formatMessage } from '../../shared/format-message.js'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { ContentDefinitions, LocaleKey } from '../../shared/types.js'

export interface CollectionCopy {
  title: string
  description: string
}

function siteCollection(
  options: ResolvedSynctrolThemeOptions,
  kind: 'release' | 'news',
  locale: LocaleKey,
): CollectionCopy {
  const block = options.seo.collections[kind]
  return {
    title: resolveMultilanguage(block.title, locale, options.mainLocale).text,
    description: resolveMultilanguage(block.description, locale, options.mainLocale).text,
  }
}

function collectionKind(identity: string): 'release' | 'news' | null {
  if (identity === 'release-index' || identity.startsWith('release-page:')) return 'release'
  if (
    identity === 'news-index' ||
    identity === 'news-tags-index' ||
    identity.startsWith('news-page:') ||
    identity.startsWith('news-tag:')
  ) return 'news'
  return null
}

export function resolveCollectionCopy(
  page: CompiledPage,
  options: ResolvedSynctrolThemeOptions,
  definitions: ContentDefinitions,
): CollectionCopy | null {
  const identity = String(page.identity)
  const kind = collectionKind(identity)
  if (kind === null) return null

  const base = siteCollection(options, kind, page.locale)
  const messages = options.locales[page.locale]!.messages
  const pageNumber = page.collection?.page ?? 1

  if (identity.startsWith('news-tag:') && page.collection?.tag) {
    const tagDef = definitions.tags[page.collection.tag]
    if (!tagDef) throw new Error(`Unknown tag in collection page: ${page.collection.tag}`)
    const tagTitle = resolveMultilanguage(tagDef.title, page.locale, options.mainLocale).text
    const archiveTitle = formatMessage(messages.tagArchiveTitle, { tag: tagTitle, title: base.title })
    return {
      title: pageNumber <= 1 ? archiveTitle : formatMessage(messages.paginatedTitle, { title: archiveTitle, page: pageNumber }),
      description: base.description,
    }
  }

  return {
    title: pageNumber <= 1 ? base.title : formatMessage(messages.paginatedTitle, { title: base.title, page: pageNumber }),
    description: base.description,
  }
}
