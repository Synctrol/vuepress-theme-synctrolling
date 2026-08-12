import { join } from 'node:path'
import type { ResolvedSynctrolThemeOptions } from '../shared/options.js'
import type {
  CompiledContentPackage,
  ContentDefinitions,
  LocaleKey,
  RouteContentPackage,
} from '../shared/types.js'
import { compileContent } from './compile-content.js'
import { compileSiteRoutes, type CompiledSite } from './compile-site-routes.js'
import type { SynctrolDiagnostic } from './diagnostics.js'
import { buildRoutePackages } from './route-packages.js'

/** Directory below the VuePress source dir that holds content packages. */
export const SYNCTROL_CONTENT_DIR = 'content'

export interface BuildSiteInput {
  sourceDir: string
  configDir: string
  options: ResolvedSynctrolThemeOptions
  base: string
  definitionsPath?: string
}

export interface BuiltSite {
  site: CompiledSite
  packages: RouteContentPackage[]
  /** Plan 02 packages retained for Plan 04 asset adapter (book/manifest refs). */
  compiledPackages: CompiledContentPackage[]
  definitions: ContentDefinitions
}

export function mergeSiteDiagnostics(
  contentWarnings: readonly SynctrolDiagnostic[],
  routeDiagnostics: readonly SynctrolDiagnostic[],
): SynctrolDiagnostic[] {
  return [...contentWarnings, ...routeDiagnostics]
}

export function buildSite(input: BuildSiteInput): BuiltSite {
  const localeKeys = Object.keys(input.options.locales) as LocaleKey[]

  const compiled = compileContent({
    contentRoot: join(input.sourceDir, SYNCTROL_CONTENT_DIR),
    sourceDir: input.sourceDir,
    configDir: input.configDir,
    mainLocale: input.options.mainLocale,
    ...(input.definitionsPath === undefined
      ? {}
      : { definitionsPath: input.definitionsPath }),
  })

  const packages = buildRoutePackages({
    packages: compiled.packages,
    localeKeys,
  })

  const site = compileSiteRoutes({
    packages,
    options: input.options,
    base: input.base,
    declaredTags: Object.keys(compiled.definitions.tags),
  })

  return {
    site: {
      ...site,
      diagnostics: mergeSiteDiagnostics(compiled.warnings, site.diagnostics),
    },
    packages,
    compiledPackages: compiled.packages,
    definitions: compiled.definitions,
  }
}
