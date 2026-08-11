import { lstatSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { DiscoveredPackage } from '../shared/types.js'
import { fail } from './diagnostics.js'

function compareNames(left: string, right: string): number {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isMissingPath(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT'
}

function discoveryFailed(path: string, error: unknown): never {
  fail({
    severity: 'error',
    code: 'CONTENT_DISCOVERY_FAILED',
    message: `Unable to discover content packages at "${path}": ${errorDetail(error)}`,
    path,
  })
}

function findBookYml(dir: string): string | undefined {
  const bookYmlPath = join(dir, 'book.yml')

  try {
    return lstatSync(bookYmlPath).isFile() ? bookYmlPath : undefined
  } catch (error) {
    if (isMissingPath(error)) {
      return undefined
    }
    discoveryFailed(bookYmlPath, error)
  }
}

export function discoverContentPackages(
  contentRoot: string,
): DiscoveredPackage[] {
  const absoluteRoot = resolve(contentRoot)
  const packages: DiscoveredPackage[] = []

  function walk(dir: string, enclosingPackage?: string): void {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch (error) {
      discoveryFailed(dir, error)
    }

    entries.sort((left, right) => compareNames(left.name, right.name))

    const isPackage = entries.some(
      (entry) => entry.name === 'content.yml' && entry.isFile(),
    )

    if (isPackage && enclosingPackage) {
      fail({
        severity: 'error',
        code: 'NESTED_PACKAGE',
        message: `Content package "${dir}" is nested inside content package "${enclosingPackage}"`,
        path: enclosingPackage,
        relatedPath: dir,
      })
    }

    let childEnclosingPackage = enclosingPackage
    if (isPackage) {
      const discoveredPackage: DiscoveredPackage = {
        dir,
        contentYmlPath: join(dir, 'content.yml'),
      }
      const bookYmlPath = findBookYml(dir)
      if (bookYmlPath) {
        discoveredPackage.bookYmlPath = bookYmlPath
      }
      packages.push(discoveredPackage)
      childEnclosingPackage = dir
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), childEnclosingPackage)
      }
    }
  }

  walk(absoluteRoot)
  packages.sort((left, right) => compareNames(left.dir, right.dir))
  return packages
}
