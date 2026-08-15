import { encodePathSegment } from '../../shared/encode-path-segment.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'

export interface ResolveLinkHrefInput {
  href: string
  locale: string
  base: string
}

export interface ResolvedLinkHref {
  href: string
  external: boolean
}

/** A URL with a scheme (http:, mailto:, …) or a protocol-relative URL. */
function hasUrlScheme(href: string): boolean {
  return href.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(href)
}

/**
 * Prepend the locale and base to an internal leading-slash path.
 */
export function resolveInternalPath(
  href: string,
  locale: string,
  base: string,
): string {
  const encodedLocale = encodePathSegment(locale)
  const routePath = `/${encodedLocale}${href}`.replace(/\/{2,}/g, '/')
  const normalized =
    href.endsWith('/') && !routePath.endsWith('/') ? `${routePath}/` : routePath
  return joinPublicPath(normalizeBase(base), normalized)
}

/**
 * Resolve a content-level link href against the current locale:
 * - URLs with a scheme / protocol-relative URLs pass through (external = true)
 * - hash-only and relative paths pass through untouched (external = false)
 * - internal leading-slash paths get the locale + base prepended
 */
export function resolveLinkHref(input: ResolveLinkHrefInput): ResolvedLinkHref {
  const { href, locale, base } = input
  if (hasUrlScheme(href)) {
    return { href, external: true }
  }
  if (!href.startsWith('/')) {
    return { href, external: false }
  }
  return {
    href: resolveInternalPath(href, locale, base),
    external: false,
  }
}
