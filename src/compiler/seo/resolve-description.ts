import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { CollectionCopy } from './collection-copy.js'

export function resolvePageDescription(
  page: CompiledPage,
  options: ResolvedSynctrolThemeOptions,
  collectionCopy: CollectionCopy | null,
): string {
  if (collectionCopy) return collectionCopy.description
  if (page.description && page.description.length > 0) return page.description
  return resolveMultilanguage(options.seo.description, page.locale, options.mainLocale).text
}
