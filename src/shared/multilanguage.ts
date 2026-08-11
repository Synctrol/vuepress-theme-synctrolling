import type { LocaleKey, Multilanguage } from './types.js'
import { isMultilanguageMap } from './types.js'

export interface ResolvedMultilanguage {
  text: string
  locale: LocaleKey
  fellBack: boolean
}

export function resolveMultilanguage(
  value: Multilanguage,
  locale: LocaleKey,
  mainLocale: LocaleKey,
): ResolvedMultilanguage {
  if (!isMultilanguageMap(value)) {
    return { text: value, locale, fellBack: false }
  }

  if (!(mainLocale in value)) {
    throw new Error('Multilanguage map missing mainLocale')
  }

  if (typeof value[locale] === 'string') {
    return { text: value[locale], locale, fellBack: false }
  }

  return {
    text: value[mainLocale],
    locale: mainLocale,
    fellBack: true,
  }
}
