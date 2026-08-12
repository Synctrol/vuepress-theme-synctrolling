export interface LocaleTableEntry {
  key: string
  lang: string
}

/**
 * Flattens configured locales into the array shape shared by the Node compiler
 * and the serialized root-router script. Object key order is configuration
 * order, which is the documented tie-break.
 */
export function toLocaleTable(
  locales: Record<string, { lang: string }>,
): LocaleTableEntry[] {
  return Object.entries(locales).map(([key, value]) => ({
    key,
    lang: value.lang,
  }))
}

/**
 * Serialized verbatim into the root-router inline script; keep it standalone.
 */
export function normalizeLanguageTag(tag: string): {
  full: string
  primary: string
} {
  const full = String(tag ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
  const primary = full.split('-')[0] ?? full
  return { full, primary }
}

/**
 * Serialized verbatim into the root-router inline script; it may reference
 * `normalizeLanguageTag` and nothing else from module scope.
 */
export function matchBrowserLocale(
  preferences: readonly string[],
  locales: readonly LocaleTableEntry[],
  mainLocale: string,
): string {
  for (const preference of preferences) {
    const wanted = normalizeLanguageTag(preference)
    if (wanted.full === '') continue

    for (const entry of locales) {
      if (normalizeLanguageTag(entry.key).full === wanted.full) return entry.key
    }
    for (const entry of locales) {
      if (normalizeLanguageTag(entry.lang).full === wanted.full) return entry.key
    }
    for (const entry of locales) {
      if (normalizeLanguageTag(entry.key).primary === wanted.primary) {
        return entry.key
      }
    }
    for (const entry of locales) {
      if (normalizeLanguageTag(entry.lang).primary === wanted.primary) {
        return entry.key
      }
    }
  }

  return mainLocale
}
