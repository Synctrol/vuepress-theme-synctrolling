import type { LocaleKey, RouteContentPackage } from '../shared/types.js'
import type { SynctrolDiagnostic } from './diagnostics.js'

export type LocalePublishKind = 'publish' | 'fallback'

export interface LocaleAvailability {
  kind: LocalePublishKind
  bodyLocale: LocaleKey
  isDraft: boolean
  title: string
  description?: string
}

export interface PackageAvailabilityResult {
  packageDecision: 'publish' | 'skip-package'
  locales: Partial<Record<LocaleKey, LocaleAvailability>>
  diagnostics: SynctrolDiagnostic[]
}

export interface AvailabilityContext {
  mainLocale: LocaleKey
  showDrafts: boolean
  localeKeys: readonly LocaleKey[]
}

export function publishedAvailability(
  locale: LocaleKey,
  markdown: { title: string; description?: string; draft: boolean },
  manifestDraft: boolean,
): LocaleAvailability {
  const availability: LocaleAvailability = {
    kind: 'publish',
    bodyLocale: locale,
    isDraft: markdown.draft || manifestDraft,
    title: markdown.title,
  }
  if (markdown.description !== undefined) {
    availability.description = markdown.description
  }
  return availability
}

export function fallbackAvailability(
  mainLocale: LocaleKey,
  main: { title: string; description?: string },
  isDraft: boolean,
): LocaleAvailability {
  const availability: LocaleAvailability = {
    kind: 'fallback',
    bodyLocale: mainLocale,
    // A fallback renders the main-locale body, so it inherits that body's
    // draft state; otherwise showDrafts would publish an indexable fallback
    // of a draft source.
    isDraft,
    title: main.title,
  }
  if (main.description !== undefined) {
    availability.description = main.description
  }
  return availability
}

export function isLocaleUsable(
  pkg: RouteContentPackage,
  locale: LocaleKey,
  showDrafts: boolean,
): boolean {
  const markdown = pkg.locales[locale]
  if (markdown === undefined) return false
  return !markdown.draft || showDrafts
}

export function decidePackageAvailability(
  pkg: RouteContentPackage,
  ctx: AvailabilityContext,
): PackageAvailabilityResult {
  if (pkg.type === 'home') {
    throw new Error('Use decideHomeAvailability for home packages')
  }

  if (pkg.draft && !ctx.showDrafts) {
    return { packageDecision: 'skip-package', locales: {}, diagnostics: [] }
  }

  const mainMarkdown = pkg.locales[ctx.mainLocale]
  if (
    mainMarkdown === undefined ||
    !isLocaleUsable(pkg, ctx.mainLocale, ctx.showDrafts)
  ) {
    return {
      packageDecision: 'skip-package',
      locales: {},
      diagnostics: [
        {
          severity: 'warning',
          code: 'MAIN_LOCALE_UNAVAILABLE',
          message: `Skipping package: main locale "${ctx.mainLocale}" Markdown is absent or draft`,
          path: pkg.dir,
        },
      ],
    }
  }

  const diagnostics: SynctrolDiagnostic[] = []
  const locales: Partial<Record<LocaleKey, LocaleAvailability>> = {}
  const manifestDraft = pkg.draft && ctx.showDrafts

  for (const locale of ctx.localeKeys) {
    const markdown = pkg.locales[locale]

    if (locale === ctx.mainLocale) {
      locales[locale] = publishedAvailability(locale, mainMarkdown, manifestDraft)
      continue
    }

    if (markdown !== undefined && isLocaleUsable(pkg, locale, ctx.showDrafts)) {
      locales[locale] = publishedAvailability(locale, markdown, manifestDraft)
      continue
    }

    diagnostics.push({
      severity: 'warning',
      code: 'LOCALE_FALLBACK',
      message: `Generating fallback page for locale "${locale}" from "${ctx.mainLocale}"`,
      path: pkg.dir,
    })
    locales[locale] = fallbackAvailability(
      ctx.mainLocale,
      mainMarkdown,
      manifestDraft || mainMarkdown.draft,
    )
  }

  return { packageDecision: 'publish', locales, diagnostics }
}
