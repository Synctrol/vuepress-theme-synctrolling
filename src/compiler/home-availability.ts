import type { LocaleKey, RouteContentPackage } from '../shared/types.js'
import type { SynctrolDiagnostic } from './diagnostics.js'
import {
  fallbackAvailability,
  publishedAvailability,
  type AvailabilityContext,
  type LocaleAvailability,
  type PackageAvailabilityResult,
} from './package-availability.js'

function unpublishable(
  code: string,
  message: string,
  dir: string,
): PackageAvailabilityResult {
  const diagnostic: SynctrolDiagnostic = {
    severity: 'error',
    code,
    message,
    path: dir,
  }
  return { packageDecision: 'skip-package', locales: {}, diagnostics: [diagnostic] }
}

export function decideHomeAvailability(
  pkg: RouteContentPackage,
  ctx: AvailabilityContext,
): PackageAvailabilityResult {
  if (pkg.type !== 'home') {
    throw new Error('decideHomeAvailability requires a home package')
  }

  const mainMarkdown = pkg.locales[ctx.mainLocale]

  if (!ctx.showDrafts) {
    if (pkg.draft) {
      return unpublishable(
        'HOME_UNPUBLISHABLE',
        'No publishable Home: the Home manifest is a draft and showDrafts is false',
        pkg.dir,
      )
    }
    if (mainMarkdown === undefined || mainMarkdown.draft) {
      return unpublishable(
        'HOME_MAIN_UNPUBLISHABLE',
        `No publishable main-locale Home: "${ctx.mainLocale}" Markdown is absent or draft`,
        pkg.dir,
      )
    }
  } else if (mainMarkdown === undefined) {
    return unpublishable(
      'HOME_ABSENT',
      `Home content is absent: no "${ctx.mainLocale}" Markdown`,
      pkg.dir,
    )
  }

  const main = mainMarkdown as NonNullable<typeof mainMarkdown>
  const diagnostics: SynctrolDiagnostic[] = []
  const locales: Partial<Record<LocaleKey, LocaleAvailability>> = {}
  const manifestDraft = pkg.draft && ctx.showDrafts

  for (const locale of ctx.localeKeys) {
    const markdown = pkg.locales[locale]

    if (locale === ctx.mainLocale) {
      locales[locale] = publishedAvailability(locale, main, manifestDraft)
      continue
    }

    if (markdown !== undefined && (!markdown.draft || ctx.showDrafts)) {
      locales[locale] = publishedAvailability(locale, markdown, manifestDraft)
      continue
    }

    diagnostics.push({
      severity: 'warning',
      code: 'LOCALE_FALLBACK',
      message: `Generating fallback Home for locale "${locale}" from "${ctx.mainLocale}"`,
      path: pkg.dir,
    })
    locales[locale] = fallbackAvailability(
      ctx.mainLocale,
      main,
      manifestDraft || main.draft,
    )
  }

  return { packageDecision: 'publish', locales, diagnostics }
}
