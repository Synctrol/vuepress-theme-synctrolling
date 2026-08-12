import { encodePathSegment } from '../../shared/encode-path-segment.js'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'
import type { LocaleKey, Multilanguage } from '../../shared/types.js'
import { isExternalHref } from './is-external-href.js'

export interface ResolveNavHrefInput {
  href: Multilanguage
  locale: LocaleKey
  base: string
  mainLocale: LocaleKey
}

export interface ResolvedNavHref {
  href: string
  external: boolean
}

/** True when any `/`-separated segment is exactly `.` or `..` (including bare/trailing). */
function hasRelativePathSegments(href: string): boolean {
  const pathOnly = href.split(/[?#]/, 1)[0] ?? href
  return pathOnly.split('/').some((segment) => segment === '.' || segment === '..')
}

export function resolveNavHref(input: ResolveNavHrefInput): ResolvedNavHref {
  const { text } = resolveMultilanguage(
    input.href,
    input.locale,
    input.mainLocale,
  )

  if (hasRelativePathSegments(text)) {
    throw new Error(
      `Invalid navigation href (relative segments forbidden): ${text}`,
    )
  }

  if (isExternalHref(text)) {
    return { href: text, external: true }
  }

  if (!text.startsWith('/')) {
    throw new Error(
      `Invalid navigation href (must be leading-slash or absolute URL): ${text}`,
    )
  }

  const encodedLocale = encodePathSegment(input.locale)
  const routePath = `/${encodedLocale}${text}`.replace(/\/{2,}/g, '/')
  const normalized =
    text.endsWith('/') && !routePath.endsWith('/') ? `${routePath}/` : routePath

  return {
    href: joinPublicPath(normalizeBase(input.base), normalized),
    external: false,
  }
}
