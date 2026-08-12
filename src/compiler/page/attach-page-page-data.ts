import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { RouteContentPackage } from '../../shared/types.js'
import type { SynctrolPageFrontmatter } from '../../shared/types/news.js'

export interface BuildPageFrontmatterInput {
  compiled: CompiledPage
  packages: readonly RouteContentPackage[]
  options: ResolvedSynctrolThemeOptions
  resolveCoverPublicPath: (
    pkg: RouteContentPackage,
    relativePath: string,
  ) => string | undefined
}

function localeOptions(
  options: ResolvedSynctrolThemeOptions,
  locale: string,
) {
  return options.locales[locale] ?? options.locales[options.mainLocale]
}

function findPagePackage(
  compiled: CompiledPage,
  packages: readonly RouteContentPackage[],
): RouteContentPackage | undefined {
  return packages.find(
    (pkg) =>
      pkg.type === 'page' &&
      (pkg.identity === compiled.identity ||
        (compiled.packagePath !== undefined && pkg.dir === compiled.packagePath)),
  )
}

export function buildPageFrontmatterForPage(
  input: BuildPageFrontmatterInput,
): SynctrolPageFrontmatter | null {
  const { compiled, packages, options } = input

  if (compiled.contentType !== 'page') {
    return null
  }

  const pkg = findPagePackage(compiled, packages)
  if (pkg === undefined) {
    return null
  }

  const body = pkg.locales[compiled.bodyLocale]
  if (body === undefined) {
    throw new Error(`Missing ${compiled.bodyLocale} markdown for ${pkg.identity}`)
  }

  const bodyLocale = localeOptions(options, compiled.bodyLocale)
  const shellMessages = localeOptions(options, compiled.locale).messages

  return {
    kind: 'detail',
    data: {
      kind: 'page-detail',
      slug: pkg.slug ?? compiled.slug ?? '',
      title: body.title,
      titleLang: bodyLocale.lang,
      coverPublicPath: pkg.cover
        ? input.resolveCoverPublicPath(pkg, pkg.cover)
        : undefined,
      isFallback: compiled.isFallback,
      isDraft: compiled.isDraft,
      translationUnavailableMessage: compiled.isFallback
        ? shellMessages.translationUnavailable
        : undefined,
      bodyLang: bodyLocale.lang,
    },
  }
}
