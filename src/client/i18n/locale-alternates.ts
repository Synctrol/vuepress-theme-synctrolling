import { LOCALE_STORAGE_KEY } from '../../shared/locale-storage.js'
import type { LocaleKey } from '../../shared/types.js'
import type { LocaleAlternateLink } from '../composables/keys.js'

export interface AlternatePageRef {
  identity: string
  locale: LocaleKey
  publicPath: string
}

export function buildLocaleAlternates(input: {
  identity: string
  localeOptions: Record<string, { label: string }>
  pages: AlternatePageRef[]
}): LocaleAlternateLink[] {
  const links: LocaleAlternateLink[] = []
  for (const [locale, option] of Object.entries(input.localeOptions)) {
    const page = input.pages.find(
      (p) => p.identity === input.identity && p.locale === locale,
    )
    if (!page) continue
    links.push({
      locale,
      label: option.label,
      href: page.publicPath,
    })
  }
  return links
}

export function persistLocalePreference(
  storage: { setItem(key: string, value: string): void },
  locale: LocaleKey,
): void {
  storage.setItem(LOCALE_STORAGE_KEY, locale)
}
