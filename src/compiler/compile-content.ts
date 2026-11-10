import { readFileSync, readdirSync } from 'node:fs'
import {
  isAbsolute,
  posix,
  relative,
  resolve,
} from 'node:path'
import type {
  CompiledContentPackage,
  ContentDefinitions,
  ContentManifest,
  LocaleKey,
} from '../shared/types.js'
import type { PlatformTypeRegistration } from '../shared/options.js'
import { resolvePlatformTypes } from '../platforms/registry.js'
import type { CompiledAlbumMetadata } from '../shared/release/types.js'
import { parseAlbumMetadata } from './album-metadata.js'
import { fail, type SynctrolDiagnostic } from './diagnostics.js'
import {
  loadContentDefinitions,
  resolveDefinitionsPath,
} from './definitions.js'
import { discoverContentPackages } from './discovery.js'
import { parseContentManifest } from './manifest.js'
import { validatePlayerUsage } from './player-entry.js'
import { scanReleaseMarkdown } from './scan-release-markdown.js'
import { loadYamlFile } from './yaml.js'

export interface CompileContentOptions {
  contentRoot: string
  sourceDir: string
  configDir: string
  mainLocale: LocaleKey
  definitionsPath?: string
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

  return {
    contentRoot: requiredString(raw, 'contentRoot'),
    sourceDir: requiredString(raw, 'sourceDir'),
    configDir: requiredString(raw, 'configDir'),
    mainLocale: requiredString(raw, 'mainLocale'),
    ...(definitionsPath === undefined ? {} : { definitionsPath }),
  }
}

function identityFor(manifest: Exclude<ContentManifest, { type: 'home' }>) {
  return `${manifest.type}:${manifest.slug}`
}

function normalizedAlbumSrc(src: string): string {
  const normalized = posix.normalize(src.replace(/\\/g, '/'))
  return normalized.startsWith('./') ? normalized : `./${normalized}`
}

function compileReleaseMarkdown(
  packageDir: string,
  mainLocale: LocaleKey,
  platformTypes: Record<string, PlatformTypeRegistration>,
): Pick<CompiledContentPackage, 'albumBySrc' | 'players'> {
  const albumBySrc: Record<string, CompiledAlbumMetadata> = Object.create(null)
  const players: CompiledContentPackage['players'] = []
  const markdownPaths = readdirSync(packageDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => resolve(packageDir, entry.name))
    .sort()

  for (const markdownPath of markdownPaths) {
    const source = readFileSync(markdownPath, 'utf8')
    const scanned = scanReleaseMarkdown(source, markdownPath)
    for (const rawSrc of scanned.albumSrcPaths) {
      const src = normalizedAlbumSrc(rawSrc)
      if (Object.hasOwn(albumBySrc, src)) continue
      const absolutePath = resolve(packageDir, rawSrc)
      const packageRelative = relative(packageDir, absolutePath)
      if (
        packageRelative === '' ||
        packageRelative === '..' ||
        packageRelative.startsWith('..\\') ||
        packageRelative.startsWith('../') ||
        isAbsolute(packageRelative)
      ) {
        fail({
          severity: 'error',
          code: 'INVALID_ALBUM_SRC',
          message: `Album src "${rawSrc}" resolves outside the content package`,
          path: markdownPath,
        })
      }
      albumBySrc[src] = parseAlbumMetadata(
        loadYamlFile(absolutePath),
        absolutePath,
        mainLocale,
      )
    }
    players.push(
      ...scanned.players.map((usage) =>
        validatePlayerUsage(usage, platformTypes),
      ),
    )
  }

  return { albumBySrc, players }
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
  const platformTypes = resolvePlatformTypes()

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

    if (item.bookYmlPath !== undefined) {
      fail({
        severity: 'error',
        code: 'BOOK_NOT_SUPPORTED',
        message: 'book.yml is no longer supported',
        path: item.bookYmlPath,
        relatedPath: item.contentYmlPath,
      })
    }

    const releaseData =
      manifest.type === 'release'
        ? compileReleaseMarkdown(
          item.dir,
          validated.mainLocale,
          platformTypes,
        )
        : undefined

    packages.push({
      dir: item.dir,
      identity,
      manifest,
      ...(releaseData === undefined ? {} : releaseData),
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
