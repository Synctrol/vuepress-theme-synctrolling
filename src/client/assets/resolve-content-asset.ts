export type ContentAssetMap = Record<string, string>

export function normalizeContentAssetRef(ref: string): string {
  const normalized = ref.replace(/\\/g, '/')
  return normalized.startsWith('./') ? normalized : `./${normalized}`
}

/**
 * Factory used by unit tests and by the theme runtime when page data
 * provides the current package's public-path map (`frontmatter.synctrol.contentAssets`).
 *
 * Vue components call:
 *   resolveContentAsset('./assets/name.ext')
 *
 * Plan 05 Layout/client enhance must call `setContentAssetMap` from page
 * frontmatter; this plan only exports the helper and injects the map field.
 */
export function createResolveContentAsset(
  map: ContentAssetMap,
): (relativeRef: string) => string {
  return function resolveContentAsset(relativeRef: string): string {
    const normalized = normalizeContentAssetRef(relativeRef)
    const direct = map[relativeRef] ?? map[normalized] ?? map[normalized.slice(2)]
    if (!direct) {
      throw new Error(
        `resolveContentAsset: unknown package asset "${relativeRef}". ` +
          'Only files hashed into the current content package map can be resolved.',
      )
    }
    return direct
  }
}

let activeMap: ContentAssetMap = {}

export function setContentAssetMap(map: ContentAssetMap): void {
  activeMap = map
}

export function resolveContentAsset(relativeRef: string): string {
  return createResolveContentAsset(activeMap)(relativeRef)
}
