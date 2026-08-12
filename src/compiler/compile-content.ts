import { resolve } from 'node:path'
import type {
  Book,
  CompiledContentPackage,
  ContentDefinitions,
  ContentManifest,
  LocaleKey,
} from '../shared/types.js'
import type { PlatformTypeRegistration } from '../shared/options.js'
import { parseBook } from './book.js'
import { fail, type SynctrolDiagnostic } from './diagnostics.js'
import {
  loadContentDefinitions,
  resolveDefinitionsPath,
} from './definitions.js'
import { discoverContentPackages } from './discovery.js'
import { parseContentManifest } from './manifest.js'

export interface CompileContentOptions {
  contentRoot: string
  sourceDir: string
  configDir: string
  mainLocale: LocaleKey
  definitionsPath?: string
  /** Resolved built-in + custom platform type registry from theme options. */
  platformTypes?: Record<string, PlatformTypeRegistration>
}

export interface CompileContentResult {
  definitions: ContentDefinitions
  packages: CompiledContentPackage[]
  warnings: SynctrolDiagnostic[]
}

function invalidOptions(message: string): never {
  fail({
    severity: 'error',
    code: 'INVALID_COMPILE_OPTIONS',
    message,
  })
}

function requiredString(
  options: Record<string, unknown>,
  field: 'contentRoot' | 'sourceDir' | 'configDir' | 'mainLocale',
): string {
  const value = options[field]
  if (typeof value !== 'string' || value.trim().length === 0) {
    invalidOptions(`${field} must be a non-empty string`)
  }
  return value
}

function validateOptions(
  options: CompileContentOptions,
): CompileContentOptions {
  if (
    typeof options !== 'object' ||
    options === null ||
    Array.isArray(options)
  ) {
    invalidOptions('compileContent options must be an object')
  }

  const raw = options as unknown as Record<string, unknown>
  const definitionsPath = raw.definitionsPath
  if (
    definitionsPath !== undefined &&
    (typeof definitionsPath !== 'string' ||
      definitionsPath.trim().length === 0)
  ) {
    invalidOptions('definitionsPath must be a non-empty string when provided')
  }

  const platformTypes = raw.platformTypes
  if (
    platformTypes !== undefined &&
    (typeof platformTypes !== 'object' ||
      platformTypes === null ||
      Array.isArray(platformTypes))
  ) {
    invalidOptions('platformTypes must be an object when provided')
  }

  return {
    contentRoot: requiredString(raw, 'contentRoot'),
    sourceDir: requiredString(raw, 'sourceDir'),
    configDir: requiredString(raw, 'configDir'),
    mainLocale: requiredString(raw, 'mainLocale'),
    ...(definitionsPath === undefined ? {} : { definitionsPath }),
    ...(platformTypes === undefined
      ? {}
      : {
          platformTypes:
            platformTypes as Record<string, PlatformTypeRegistration>,
        }),
  }
}

function identityFor(manifest: Exclude<ContentManifest, { type: 'home' }>) {
  return `${manifest.type}:${manifest.slug}`
}

export function compileContent(
  options: CompileContentOptions,
): CompileContentResult {
  const validated = validateOptions(options)
  const definitionsFile = resolveDefinitionsPath(
    validated.sourceDir,
    validated.configDir,
    validated.definitionsPath,
  )
  const definitions = loadContentDefinitions(
    definitionsFile,
    validated.mainLocale,
  )
  const discovered = discoverContentPackages(validated.contentRoot)
  const packages: CompiledContentPackage[] = []
  const seenIdentities = new Map<string, string>()
  let homeDir: string | undefined

  for (const item of discovered) {
    const manifest = parseContentManifest(item.contentYmlPath, item.dir)
    let identity: string

    if (manifest.type === 'home') {
      if (homeDir !== undefined) {
        fail({
          severity: 'error',
          code: 'DUPLICATE_HOME',
          message: 'Exactly one Home package is required; found multiple',
          path: item.dir,
          relatedPath: homeDir,
        })
      }
      homeDir = item.dir
      identity = 'home'
    } else {
      identity = identityFor(manifest)
      const previousDir = seenIdentities.get(identity)
      if (previousDir !== undefined) {
        fail({
          severity: 'error',
          code: 'DUPLICATE_SLUG',
          message: `Duplicate content identity "${identity}"`,
          path: item.dir,
          relatedPath: previousDir,
        })
      }
      seenIdentities.set(identity, item.dir)
    }

    if (manifest.type === 'news') {
      for (const tag of manifest.tags) {
        if (!Object.hasOwn(definitions.tags, tag)) {
          fail({
            severity: 'error',
            code: 'UNKNOWN_TAG',
            message: `Referencing undeclared tag "${tag}"`,
            path: item.contentYmlPath,
          })
        }
      }
    }

    if (item.bookYmlPath !== undefined && manifest.type !== 'release') {
      fail({
        severity: 'error',
        code: 'BOOK_NOT_ALLOWED',
        message: 'book.yml is allowed only in a release package',
        path: item.bookYmlPath,
        relatedPath: item.contentYmlPath,
      })
    }

    let book: Book | undefined
    if (item.bookYmlPath !== undefined) {
      book = parseBook(
        item.bookYmlPath,
        definitions,
        validated.mainLocale,
        validated.platformTypes,
      )
    }

    packages.push({
      dir: item.dir,
      identity,
      manifest,
      ...(book === undefined ? {} : { book }),
    })
  }

  if (homeDir === undefined) {
    fail({
      severity: 'error',
      code: 'MISSING_HOME',
      message: 'Exactly one Home package is required; found none',
      path: resolve(validated.contentRoot),
    })
  }

  return {
    definitions,
    packages,
    warnings: [],
  }
}
