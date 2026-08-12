import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { HreflangAlternate } from '../../shared/seo/types.js'

export function resolveLang(page: CompiledPage, options: ResolvedSynctrolThemeOptions): string {
  return options.locales[page.locale]!.lang
}

export function resolveRobots(page: CompiledPage): 'index,follow' | 'noindex,follow' {
  return page.noindex ? 'noindex,follow' : 'index,follow'
}

export function resolveCanonicalUrl(page: CompiledPage, pages: readonly CompiledPage[]): string {
  const canonical = pages.find((candidate) => candidate.identity === page.identity && candidate.locale === page.canonicalLocale)
  if (!canonical) throw new Error(`Missing canonical locale page for ${String(page.identity)} (${page.canonicalLocale})`)
  return canonical.url.absoluteUrl
}

export function resolveHreflang(
  page: CompiledPage,
  pages: readonly CompiledPage[],
  options: ResolvedSynctrolThemeOptions,
): HreflangAlternate[] {
  const localeOrder = Object.keys(options.locales)
  return localeOrder.flatMap((locale) => {
    const alternate = pages.find((candidate) => candidate.identity === page.identity && candidate.locale === locale && !candidate.isFallback)
    if (!alternate) return []
    return [{ hreflang: options.locales[alternate.locale]!.lang, href: alternate.url.absoluteUrl }]
  })
}
