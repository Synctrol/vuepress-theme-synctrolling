import type { CompiledPage } from '../shared/route-types.js'
import type { SynctrolDiagnostic } from './diagnostics.js'

export function detectRouteCollisions(
  pages: readonly CompiledPage[],
): SynctrolDiagnostic[] {
  const seen = new Map<string, CompiledPage>()
  const diagnostics: SynctrolDiagnostic[] = []

  for (const page of pages) {
    const existing = seen.get(page.url.routePath)
    if (existing === undefined) {
      seen.set(page.url.routePath, page)
      continue
    }

    const diagnostic: SynctrolDiagnostic = {
      severity: 'error',
      code: 'ROUTE_COLLISION',
      message: `Duplicate final route "${page.url.routePath}" produced by "${existing.identity}" and "${page.identity}"`,
    }
    if (page.packagePath !== undefined) diagnostic.path = page.packagePath
    if (existing.packagePath !== undefined) {
      diagnostic.relatedPath = existing.packagePath
    }
    diagnostics.push(diagnostic)
  }

  return diagnostics
}
