import type { CompiledPage } from '../../shared/route-types.js'
import type {
  Book,
  CompiledContentPackage,
  NormalizedPlatformEntry,
  RouteContentPackage,
} from '../../shared/types.js'
import type { CspCollectable } from '../../platforms/collect-csp.js'

/**
 * Collect platform entries only from packages that contribute published pages
 * (Plan 03 availability / same visibility as Plan 04 selectAssetPackageSources).
 */
export function collectVisiblePlatformEntries(input: {
  compiledPackages: readonly CompiledContentPackage[]
  packages: readonly RouteContentPackage[]
  pages: readonly CompiledPage[]
  /** Map of platform key → definition.type */
  platformTypes: Record<string, string>
}): CspCollectable[] {
  const visibleIdentities = new Set<string>()
  for (const page of input.pages) {
    if (page.packagePath === undefined) continue
    visibleIdentities.add(page.identity)
  }

  const routedByIdentity = new Map(
    input.packages.map((pkg) => [pkg.identity, pkg]),
  )

  const items: CspCollectable[] = []
  for (const compiled of input.compiledPackages) {
    if (!visibleIdentities.has(compiled.identity)) continue
    const routed = routedByIdentity.get(compiled.identity)
    if (
      routed === undefined ||
      routed.dir !== compiled.dir ||
      routed.identity !== compiled.identity
    ) {
      throw new Error(`Missing routed package for ${compiled.identity}`)
    }
    if (compiled.book === undefined) continue
    collectFromBook(items, compiled.book, input.platformTypes)
  }
  return items
}

function collectFromBook(
  items: CspCollectable[],
  book: Book,
  platformTypes: Record<string, string>,
): void {
  if (book.type === 'album') {
    for (const entry of book.album.links ?? []) {
      push(items, entry, platformTypes)
    }
    return
  }
  for (const giftItem of book.gift.items) {
    for (const entry of giftItem.links ?? []) {
      push(items, entry, platformTypes)
    }
  }
}

function push(
  items: CspCollectable[],
  entry: NormalizedPlatformEntry,
  platformTypes: Record<string, string>,
): void {
  const type = platformTypes[entry.platform]
  if (!type) return
  items.push({ type, entry: entry as Record<string, unknown> })
}
