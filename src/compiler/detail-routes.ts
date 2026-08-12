import type { ResolvedSynctrolThemeOptions } from '../shared/options.js'
import type { CompiledPage, ContentIdentity } from '../shared/route-types.js'
import type { LocaleKey, RouteContentPackage } from '../shared/types.js'
import type { SynctrolDiagnostic } from './diagnostics.js'
import { fail } from './diagnostics.js'
import { decideHomeAvailability } from './home-availability.js'
import {
  decidePackageAvailability,
  type LocaleAvailability,
} from './package-availability.js'
import { encodeRouteSegment, resolveDetailPathSuffix } from './path-suffix.js'
import { buildUrlLayers } from './url-layers.js'

export interface DetailCompileContext {
  options: ResolvedSynctrolThemeOptions
  base: string
  localeKeys: readonly LocaleKey[]
}

export function contentIdentity(pkg: RouteContentPackage): ContentIdentity {
  if (pkg.type === 'home') return 'home'
  if (pkg.slug === null) {
    fail({
      severity: 'error',
      code: 'MISSING_SLUG',
      message: `Missing slug for ${pkg.type} package`,
      path: pkg.dir,
    })
  }
  return `${pkg.type}:${pkg.slug}`
}

function toPage(
  pkg: RouteContentPackage,
  locale: LocaleKey,
  availability: LocaleAvailability,
  ctx: DetailCompileContext,
): CompiledPage {
  const isFallback = availability.kind === 'fallback'
  const page: CompiledPage = {
    identity: contentIdentity(pkg),
    locale,
    contentType: pkg.type,
    url: buildUrlLayers({
      locale: encodeRouteSegment(locale, 'locale'),
      pathSuffix: resolveDetailPathSuffix(pkg, locale, ctx.options),
      base: ctx.base,
      siteUrl: ctx.options.siteUrl,
    }),
    isFallback,
    isDraft: availability.isDraft,
    noindex: isFallback || availability.isDraft,
    bodyLocale: availability.bodyLocale,
    canonicalLocale: isFallback ? ctx.options.mainLocale : locale,
    packagePath: pkg.dir,
    slug: pkg.slug,
    title: availability.title,
  }

  if (availability.description !== undefined) {
    page.description = availability.description
  }

  return page
}

export function compileDetailRoutes(
  packages: readonly RouteContentPackage[],
  ctx: DetailCompileContext,
): { pages: CompiledPage[]; diagnostics: SynctrolDiagnostic[] } {
  const pages: CompiledPage[] = []
  const diagnostics: SynctrolDiagnostic[] = []
  const availabilityCtx = {
    mainLocale: ctx.options.mainLocale,
    showDrafts: ctx.options.showDrafts,
    localeKeys: ctx.localeKeys,
  }

  for (const pkg of packages) {
    const result =
      pkg.type === 'home'
        ? decideHomeAvailability(pkg, availabilityCtx)
        : decidePackageAvailability(pkg, availabilityCtx)

    diagnostics.push(...result.diagnostics)
    if (result.packageDecision !== 'publish') continue

    for (const locale of ctx.localeKeys) {
      const availability = result.locales[locale]
      if (availability === undefined) continue
      pages.push(toPage(pkg, locale, availability, ctx))
    }
  }

  return { pages, diagnostics }
}
