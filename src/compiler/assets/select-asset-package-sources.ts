import type { AssetPackageSource } from '../../shared/asset-types.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type {
  CompiledContentPackage,
  LocaleKey,
  LocaleMarkdown,
  RouteContentPackage,
} from '../../shared/types.js'
import { collectPackageDeclaredPaths } from './collect-package-refs.js'

/**
 * Build asset package sources only for packages that contribute published
 * pages (Plan 03 availability). Skipped drafts never enter hash/write/raw-HTML
 * checks. Locale Markdown is limited to body locales actually rendered.
 */
export function selectAssetPackageSources(input: {
  compiledPackages: readonly CompiledContentPackage[]
  packages: readonly RouteContentPackage[]
  pages: readonly CompiledPage[]
}): AssetPackageSource[] {
  const bodyLocalesByIdentity = new Map<string, Set<LocaleKey>>()

  for (const page of input.pages) {
    if (page.packagePath === undefined) continue
    let locales = bodyLocalesByIdentity.get(page.identity)
    if (locales === undefined) {
      locales = new Set()
      bodyLocalesByIdentity.set(page.identity, locales)
    }
    locales.add(page.bodyLocale)
  }

  const routedByIdentity = new Map(
    input.packages.map((pkg) => [pkg.identity, pkg]),
  )

  const sources: AssetPackageSource[] = []
  for (const compiled of input.compiledPackages) {
    const bodyLocales = bodyLocalesByIdentity.get(compiled.identity)
    if (bodyLocales === undefined) continue

    const routed = routedByIdentity.get(compiled.identity)
    if (
      routed === undefined ||
      routed.dir !== compiled.dir ||
      routed.identity !== compiled.identity
    ) {
      throw new Error(`Missing routed package for ${compiled.identity}`)
    }

    const localeMarkdown: AssetPackageSource['localeMarkdown'] = []
    for (const locale of bodyLocales) {
      const markdown: LocaleMarkdown | undefined = routed.locales[locale]
      if (markdown === undefined) continue
      localeMarkdown.push({
        filePath: markdown.filePath,
        body: markdown.body,
      })
    }

    sources.push({
      packageDir: compiled.dir,
      type: routed.type,
      slug: routed.slug,
      declaredPaths: collectPackageDeclaredPaths(compiled),
      localeMarkdown,
    })
  }

  return sources
}
