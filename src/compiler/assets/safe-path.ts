import { existsSync, readdirSync, statSync } from 'node:fs'
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { fail } from '../diagnostics.js'

function assertInsideRoot(rootDir: string, absolutePath: string): void {
  const root = resolve(rootDir)
  const candidate = resolve(absolutePath)
  const rel = relative(root, candidate)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    fail({
      severity: 'error',
      code: 'ASSET_PATH_ESCAPE',
      message: `Asset path escapes owning root: ${absolutePath}`,
      path: absolutePath,
      relatedPath: root,
    })
  }
}

/**
 * Walk each path segment and require an exact case match against directory
 * entries so case-insensitive OS volumes still fail mismatched refs.
 */
function assertExactCasePath(absolutePath: string): void {
  const normalized = normalize(absolutePath)
  const parts = normalized.split(sep).filter(Boolean)
  let cursor = normalized.startsWith(sep) ? sep : ''

  for (const part of parts) {
    const parent = cursor.endsWith(sep) || cursor === '' ? cursor || sep : cursor
    if (!existsSync(parent)) {
      fail({
        severity: 'error',
        code: 'ASSET_MISSING',
        message: `Asset not found: ${absolutePath}`,
        path: absolutePath,
      })
    }
    const parentStat = statSync(parent)
    if (!parentStat.isDirectory()) {
      fail({
        severity: 'error',
        code: 'ASSET_MISSING',
        message: `Asset not found: ${absolutePath}`,
        path: absolutePath,
      })
    }
    const entries = readdirSync(parent)
    const exact = entries.find((entry) => entry === part)
    if (!exact) {
      const insensitive = entries.find(
        (entry) => entry.toLowerCase() === part.toLowerCase(),
      )
      if (insensitive) {
        fail({
          severity: 'error',
          code: 'ASSET_CASE_MISMATCH',
          message: `Asset case mismatch: requested "${part}" but found "${insensitive}" under ${parent}`,
          path: absolutePath,
        })
      }
      fail({
        severity: 'error',
        code: 'ASSET_MISSING',
        message: `Asset not found: ${absolutePath}`,
        path: absolutePath,
      })
    }
    cursor = join(parent, exact)
  }
}

export function resolveSafePath(rootDir: string, relativeRef: string): string {
  if (isAbsolute(relativeRef)) {
    fail({
      severity: 'error',
      code: 'ASSET_PATH_ESCAPE',
      message: `Absolute asset paths are not allowed: ${relativeRef}`,
      path: relativeRef,
      relatedPath: rootDir,
    })
  }

  const absolutePath = resolve(rootDir, relativeRef)
  assertInsideRoot(rootDir, absolutePath)

  if (!existsSync(absolutePath)) {
    assertExactCasePath(absolutePath)
    fail({
      severity: 'error',
      code: 'ASSET_MISSING',
      message: `Asset not found: ${absolutePath}`,
      path: absolutePath,
    })
  }

  assertExactCasePath(absolutePath)
  return absolutePath
}
