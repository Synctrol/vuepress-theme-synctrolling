import type { LocaleKey, Multilanguage, NormalizedPlatformEntry } from '../../../shared/types.js'
import { resolveMultilanguage } from '../../../shared/multilanguage.js'

export function resolvePlatformLabel(input: {
  entry: NormalizedPlatformEntry
  definitionName: Multilanguage
  locale: LocaleKey
  mainLocale: LocaleKey
}): { text: string; fellBack: boolean } {
  const value = input.entry.label ?? input.definitionName
  const resolved = resolveMultilanguage(value, input.locale, input.mainLocale)
  return { text: resolved.text, fellBack: resolved.fellBack }
}
