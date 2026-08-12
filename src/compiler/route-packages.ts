import type {
  CompiledContentPackage,
  LocaleKey,
  LocaleMarkdown,
  RouteContentPackage,
} from '../shared/types.js'
import { readPackageLocaleMarkdown } from './locale-markdown.js'

export interface BuildRoutePackagesInput {
  packages: readonly CompiledContentPackage[]
  localeKeys: readonly LocaleKey[]
}

export function toRoutePackage(
  pkg: CompiledContentPackage,
  locales: Partial<Record<LocaleKey, LocaleMarkdown>>,
): RouteContentPackage {
  const manifest = pkg.manifest
  const routePackage: RouteContentPackage = {
    dir: pkg.dir,
    identity: pkg.identity,
    type: manifest.type,
    slug: manifest.type === 'home' ? null : manifest.slug,
    draft: manifest.draft,
    tags: manifest.type === 'news' ? [...manifest.tags] : [],
    locales,
  }

  if (manifest.type === 'release' || manifest.type === 'news') {
    routePackage.date = manifest.date
  }
  if (manifest.type === 'news' && manifest.updated !== undefined) {
    routePackage.updated = manifest.updated
  }
  if (manifest.type !== 'home') {
    if (manifest.path !== undefined) routePackage.path = manifest.path
    if (manifest.cover !== undefined) routePackage.cover = manifest.cover
  }
  if (manifest.type === 'release' && manifest.artwork !== undefined) {
    routePackage.artwork = manifest.artwork
  }

  return routePackage
}

export function buildRoutePackages(
  input: BuildRoutePackagesInput,
): RouteContentPackage[] {
  return input.packages.map((pkg) =>
    toRoutePackage(
      pkg,
      readPackageLocaleMarkdown(pkg.dir, pkg.manifest.type, input.localeKeys),
    ),
  )
}
