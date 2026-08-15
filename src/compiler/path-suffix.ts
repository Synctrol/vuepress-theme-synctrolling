import { encodePathSegment } from '../shared/encode-path-segment.js'
import type { ResolvedSynctrolThemeOptions } from '../shared/options.js'
import { assertRouteSegment } from '../shared/options-validation.js'
import { normalizePathSuffix } from '../shared/route-path.js'
import type {
  LocaleKey,
  LocalePath,
  RouteContentPackage,
} from '../shared/types.js'
import { fail, type SynctrolDiagnostic } from './diagnostics.js'

export { encodePathSegment }

export type PathSuffixOptions = Pick<
  ResolvedSynctrolThemeOptions,
  'release' | 'news'
>

/**
 * Characters where strict RFC 3986 encoding disagrees with the path VuePress
 * produces via `encodeURI(segment.map(sanitizeFileName))`. Swept against every
 * ASCII code point in vuepress@2.0.0-rc.24; Task 12 re-checks the equivalence.
 */
const UNROUTABLE_SEGMENT_CHAR =
  /[\u0000-\u001F\u007F!"#$%&'()*+,:;<=>?@[\]^`{|}]/

/**
 * Rejects segments VuePress would rewrite, so `routePath` always equals the
 * route VuePress finally serves.
 */
export function assertRoutableSegment(
  value: string,
  field: string,
  dir?: string,
): string {
  if (UNROUTABLE_SEGMENT_CHAR.test(value) || value.startsWith('_')) {
    const diagnostic: SynctrolDiagnostic = {
      severity: 'error',
      code: 'UNROUTABLE_SEGMENT',
      message: `${field} "${value}" contains characters VuePress would rewrite in a route; use letters, digits, spaces, "-", ".", "_", "~", or non-ASCII text`,
    }
    if (dir !== undefined) diagnostic.path = dir
    fail(diagnostic)
  }
  return value
}

export function encodeRouteSegment(
  value: string,
  field: string,
  dir?: string,
): string {
  return encodePathSegment(assertRoutableSegment(value, field, dir))
}

function invalidPath(message: string, dir: string): never {
  fail({ severity: 'error', code: 'INVALID_PATH', message, path: dir })
}

function encodePageSpecificPath(value: string, dir: string): string {
  if (!value.startsWith('/') || !value.endsWith('/')) {
    invalidPath(
      `Page-specific paths must begin and end with /: ${value}`,
      dir,
    )
  }
  if (value.includes('?') || value.includes('#')) {
    invalidPath(
      `Page-specific paths cannot contain a query or hash: ${value}`,
      dir,
    )
  }

  const inner = value.slice(1, -1)
  if (inner.length === 0) {
    invalidPath('Page-specific paths cannot target the locale root', dir)
  }

  const encoded = inner.split('/').map((segment) => {
    try {
      assertRouteSegment(segment, 'path segment')
    } catch {
      invalidPath(
        `Page-specific path contains an invalid segment "${segment}": ${value}`,
        dir,
      )
    }
    return encodeRouteSegment(segment, 'path segment', dir)
  })

  return `/${encoded.join('/')}/`
}

function localePathEntry(
  path: LocalePath,
  locale: LocaleKey,
): string | undefined {
  if (typeof path === 'string') return path
  return Object.hasOwn(path, locale) ? path[locale] : undefined
}

function typeDefaultSuffix(
  pkg: RouteContentPackage,
  options: PathSuffixOptions,
): string {
  if (pkg.type === 'home') return '/'

  if (pkg.slug === null) {
    fail({
      severity: 'error',
      code: 'MISSING_SLUG',
      message: `Missing slug for ${pkg.type} package`,
      path: pkg.dir,
    })
  }

  // Plan 01 validated these with assertRouteSegment only; re-gate + encode
  // so VuePress cannot rewrite them under our feet.
  const slug = encodeRouteSegment(pkg.slug, 'slug', pkg.dir)
  if (pkg.type === 'release') {
    const segment = encodeRouteSegment(
      options.release.urlSegment,
      'options.release.urlSegment',
    )
    return `/${segment}/${slug}/`
  }
  if (pkg.type === 'news') {
    const segment = encodeRouteSegment(
      options.news.articleUrlSegment,
      'options.news.articleUrlSegment',
    )
    return `/${segment}/${slug}/`
  }
  return `/${slug}/`
}

export function resolveDetailPathSuffix(
  pkg: RouteContentPackage,
  locale: LocaleKey,
  options: PathSuffixOptions,
): string {
  if (pkg.type === 'home') {
    if (pkg.path !== undefined) {
      fail({
        severity: 'error',
        code: 'HOME_PATH_REMAP',
        message: 'Home always uses / and cannot be remapped',
        path: pkg.dir,
      })
    }
    return '/'
  }

  if (pkg.path !== undefined) {
    const entry = localePathEntry(pkg.path, locale)
    if (entry !== undefined) {
      return normalizePathSuffix(encodePageSpecificPath(entry, pkg.dir))
    }
  }

  return normalizePathSuffix(typeDefaultSuffix(pkg, options))
}
