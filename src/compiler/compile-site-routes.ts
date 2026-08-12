import type { ResolvedSynctrolThemeOptions } from '../shared/options.js'
import type { CompiledPage } from '../shared/route-types.js'
import type { LocaleKey, RouteContentPackage } from '../shared/types.js'
import { compileCollectionRoutes } from './collection-routes.js'
import { compileDetailRoutes } from './detail-routes.js'
import { detectRouteCollisions } from './detect-collisions.js'
import { SynctrolDiagnosticError, type SynctrolDiagnostic } from './diagnostics.js'
import { generateRootRouterHtml } from './root-router-html.js'

export interface CompileSiteRoutesInput {
  packages: readonly RouteContentPackage[]
  options: ResolvedSynctrolThemeOptions
  base: string
  /** Definition tag keys from Plan 02 `ContentDefinitions.tags`. */
  declaredTags: readonly string[]
}

export interface CompiledSite {
  pages: CompiledPage[]
  /** Warnings only; error-severity diagnostics are thrown. */
  diagnostics: SynctrolDiagnostic[]
  rootRouterHtml: string
}

export function compileSiteRoutes(
  input: CompileSiteRoutesInput,
): CompiledSite {
  const localeKeys = Object.keys(input.options.locales) as LocaleKey[]

  const detail = compileDetailRoutes(input.packages, {
    options: input.options,
    base: input.base,
    localeKeys,
  })
  const collections = compileCollectionRoutes({
    detailPages: detail.pages,
    packages: input.packages,
    options: input.options,
    base: input.base,
    localeKeys,
    declaredTags: input.declaredTags,
  })

  const pages = [...detail.pages, ...collections]
  const diagnostics = [
    ...detail.diagnostics,
    ...detectRouteCollisions(pages),
  ]

  const errors = diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  )
  if (errors.length > 0) {
    throw new SynctrolDiagnosticError(errors)
  }

  return {
    pages,
    diagnostics,
    rootRouterHtml: generateRootRouterHtml({
      options: input.options,
      base: input.base,
    }),
  }
}
