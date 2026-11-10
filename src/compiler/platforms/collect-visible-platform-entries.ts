import type { CompiledPage } from '../../shared/route-types.js'
import type { CompiledContentPackage } from '../../shared/types.js'
import type { CspCollectable } from '../../platforms/collect-csp.js'

export function collectVisiblePlatformEntries(input: {
  compiledPackages: readonly CompiledContentPackage[]
  pages: readonly CompiledPage[]
}): CspCollectable[] {
  const visibleIdentities = new Set<string>()
  for (const page of input.pages) {
    if (page.packagePath === undefined) continue
    visibleIdentities.add(page.identity)
  }

  const items: CspCollectable[] = []
  for (const compiled of input.compiledPackages) {
    if (!visibleIdentities.has(compiled.identity)) continue
    for (const player of compiled.players ?? []) {
      items.push({
        type: player.platform,
        entry: { ...player },
      })
    }
  }
  return items
}
