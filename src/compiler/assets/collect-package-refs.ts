import type { Book, CompiledContentPackage } from '../../shared/types.js'

function isPackageRelativeSrc(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('./')
}

function isRelativeCoverRef(value: unknown): value is string {
  return typeof value === 'string' && !/^https?:\/\//i.test(value)
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value)
}

function collectFromBook(book: Book, target: string[]): void {
  if (book.type === 'album') {
    for (const cover of book.album.covers ?? []) {
      if (isRelativeCoverRef(cover)) pushUnique(target, cover)
    }
    for (const link of book.album.links ?? []) {
      const src = (link as { src?: unknown }).src
      // audio_player (and any platform with src): only package-relative ./ refs
      if (isPackageRelativeSrc(src)) pushUnique(target, src)
    }
    return
  }

  for (const item of book.gift.items) {
    for (const cover of item.covers ?? []) {
      if (isRelativeCoverRef(cover)) pushUnique(target, cover)
    }
  }
}

export function collectPackageDeclaredPaths(
  pkg: CompiledContentPackage,
): string[] {
  const paths: string[] = []
  const { manifest } = pkg
  // Narrow ContentManifest before optional fields — Home has neither cover nor artwork.
  if ('cover' in manifest && isRelativeCoverRef(manifest.cover)) {
    pushUnique(paths, manifest.cover)
  }
  if (manifest.type === 'release' && isRelativeCoverRef(manifest.artwork)) {
    pushUnique(paths, manifest.artwork)
  }
  if (pkg.book) {
    collectFromBook(pkg.book, paths)
  }
  return paths
}
