import type { ResolvedAsset } from '../../shared/asset-types.js'

function normalizeRef(ref: string): string {
  return ref.replace(/^\.\//, '').replace(/\\/g, '/')
}

export class AssetRegistry {
  private readonly bySource = new Map<string, ResolvedAsset>()
  private readonly contentMaps = new Map<string, Map<string, string>>()
  private readonly globalMap = new Map<string, string>()

  register(asset: ResolvedAsset): void {
    this.bySource.set(asset.sourcePath, asset)
  }

  registerContent(
    packageIdentity: string,
    relativeRef: string,
    asset: ResolvedAsset,
  ): void {
    this.register(asset)
    let map = this.contentMaps.get(packageIdentity)
    if (!map) {
      map = new Map()
      this.contentMaps.set(packageIdentity, map)
    }
    const key = normalizeRef(relativeRef)
    map.set(key, asset.publicPath)
    map.set(`./${key}`, asset.publicPath)
  }

  registerGlobal(relativeRef: string, asset: ResolvedAsset): void {
    this.register(asset)
    const key = normalizeRef(relativeRef)
    this.globalMap.set(key, asset.publicPath)
    this.globalMap.set(`./${key}`, asset.publicPath)
  }

  getBySource(sourcePath: string): ResolvedAsset | undefined {
    return this.bySource.get(sourcePath)
  }

  getContentPublicPath(
    packageIdentity: string,
    relativeRef: string,
  ): string | undefined {
    const map = this.contentMaps.get(packageIdentity)
    if (!map) return undefined
    return (
      map.get(relativeRef) ??
      map.get(normalizeRef(relativeRef)) ??
      map.get(`./${normalizeRef(relativeRef)}`)
    )
  }

  toManifest(): {
    assets: ResolvedAsset[]
    bySourcePath: Record<string, ResolvedAsset>
    contentPublicPaths: Record<string, Record<string, string>>
    globalPublicPaths: Record<string, string>
  } {
    const bySourcePath: Record<string, ResolvedAsset> = {}
    for (const [key, value] of this.bySource) {
      bySourcePath[key] = value
    }
    const contentPublicPaths: Record<string, Record<string, string>> = {}
    for (const [identity, map] of this.contentMaps) {
      contentPublicPaths[identity] = Object.fromEntries(map.entries())
    }
    return {
      assets: [...this.bySource.values()],
      bySourcePath,
      contentPublicPaths,
      globalPublicPaths: Object.fromEntries(this.globalMap.entries()),
    }
  }
}
