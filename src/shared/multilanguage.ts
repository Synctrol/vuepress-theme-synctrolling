import type { LocaleKey, Multilanguage } from './types.js'

export interface ResolvedMultilanguage {
  text: string
  locale: LocaleKey
  fellBack: boolean
}

function isMultilanguageRecord(
  value: unknown,
): value is Record<LocaleKey, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readMainLocaleText(
  value: Record<LocaleKey, string>,
  mainLocale: LocaleKey,
): string {
  if (!Object.hasOwn(value, mainLocale)) {
    throw new Error('Multilanguage map missing mainLocale')
  }

  const mainText = value[mainLocale]
  if (typeof mainText !== 'string') {
    throw new Error('Multilanguage map mainLocale value must be a string')
  }

  return mainText
}

export function resolveMultilanguage(
  value: Multilanguage,
  locale: LocaleKey,
  mainLocale: LocaleKey,
): ResolvedMultilanguage {
  if (typeof value === 'string') {
    return { text: value, locale, fellBack: false }
  }

  if (!isMultilanguageRecord(value)) {
    throw new Error('Invalid multilanguage value')
  }

  const mainText = readMainLocaleText(value, mainLocale)

  const currentText = Object.hasOwn(value, locale) ? value[locale] : undefined

  if (typeof currentText === 'string') {
    return { text: currentText, locale, fellBack: false }
  }

  return {
    text: mainText,
    locale: mainLocale,
    fellBack: true,
  }
}
