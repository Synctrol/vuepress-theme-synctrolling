import { resolve } from 'node:path'
import { assertRouteSegment } from '../shared/options-validation.js'
import type {
  ContentDefinitions,
  LocaleKey,
  PlatformCategory,
  PlatformDefinition,
  TagDefinition,
} from '../shared/types.js'
import { fail } from './diagnostics.js'
import { assertMultilanguage } from './multilanguage.js'
import { loadYamlFile } from './yaml.js'

type PlainObject = Record<string, unknown>

const ROOT_FIELDS = ['tags', 'platforms'] as const
const TAG_FIELDS = ['title'] as const
const PLATFORM_FIELDS = ['category', 'type', 'name'] as const
const PLATFORM_CATEGORIES = ['digital', 'physical'] as const

function invalid(code: string, message: string, path: string): never {
  fail({
    severity: 'error',
    code,
    message,
    path,
  })
}

function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function copyOwnDataFields(
  value: unknown,
  field: string,
  path: string,
): PlainObject {
  if (!isPlainObject(value)) {
    invalid(
      'INVALID_DEFINITIONS',
      `${field} must be a plain mapping`,
      path,
    )
  }

  const copy = Object.create(null) as PlainObject
  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !('value' in descriptor)) {
      invalid(
        'INVALID_DEFINITIONS',
        `${field} fields must be own data properties`,
        path,
      )
    }

    Object.defineProperty(copy, key, {
      configurable: true,
      enumerable: true,
      value: descriptor.value,
      writable: true,
    })
  }
  return copy
}

function rejectUnknownFields(
  value: PlainObject,
  allowed: readonly string[],
  field: 'definitions' | 'tag' | 'platform',
  path: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      invalid(
        'UNKNOWN_FIELD',
        `Unknown ${field} field "${key}"`,
        path,
      )
    }
  }
}

function assertDefinitionKey(
  key: string,
  kind: 'tag' | 'platform',
  path: string,
): void {
  try {
    assertRouteSegment(key, `${kind} key`)
  } catch {
    invalid(
      'INVALID_DEFINITION_KEY',
      `${kind} key "${key}" must be a safe, non-empty string segment`,
      path,
    )
  }
}

function parseCategory(
  value: unknown,
  platformKey: string,
  path: string,
): PlatformCategory {
  if (
    typeof value !== 'string' ||
    !(PLATFORM_CATEGORIES as readonly string[]).includes(value)
  ) {
    invalid(
      'INVALID_PLATFORM_CATEGORY',
      `platform "${platformKey}" category must be digital or physical`,
      path,
    )
  }
  return value as PlatformCategory
}

function parsePlatformType(
  value: unknown,
  platformKey: string,
  path: string,
): string {
  if (typeof value !== 'string') {
    invalid(
      'INVALID_PLATFORM_TYPE',
      `platform "${platformKey}" type must be a safe, non-empty string segment`,
      path,
    )
  }

  try {
    assertRouteSegment(value, `platforms.${platformKey}.type`)
  } catch {
    invalid(
      'INVALID_PLATFORM_TYPE',
      `platform "${platformKey}" type must be a safe, non-empty string segment`,
      path,
    )
  }
  return value
}

function parseTags(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
): Record<string, TagDefinition> {
  const rawTags = copyOwnDataFields(value, 'tags', path)
  const tags = Object.create(null) as Record<string, TagDefinition>

  for (const key of Object.keys(rawTags)) {
    assertDefinitionKey(key, 'tag', path)
    const rawTag = copyOwnDataFields(rawTags[key], `tag "${key}"`, path)
    rejectUnknownFields(rawTag, TAG_FIELDS, 'tag', path)

    Object.defineProperty(tags, key, {
      configurable: true,
      enumerable: true,
      value: {
        title: assertMultilanguage(
          rawTag.title,
          mainLocale,
          path,
          `tags.${key}.title`,
        ),
      },
      writable: true,
    })
  }
  return tags
}

function parsePlatforms(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
): Record<string, PlatformDefinition> {
  const rawPlatforms = copyOwnDataFields(value, 'platforms', path)
  const platforms = Object.create(null) as Record<string, PlatformDefinition>

  for (const key of Object.keys(rawPlatforms)) {
    assertDefinitionKey(key, 'platform', path)
    const rawPlatform = copyOwnDataFields(
      rawPlatforms[key],
      `platform "${key}"`,
      path,
    )
    rejectUnknownFields(rawPlatform, PLATFORM_FIELDS, 'platform', path)

    Object.defineProperty(platforms, key, {
      configurable: true,
      enumerable: true,
      value: {
        category: parseCategory(rawPlatform.category, key, path),
        type: parsePlatformType(rawPlatform.type, key, path),
        name: assertMultilanguage(
          rawPlatform.name,
          mainLocale,
          path,
          `platforms.${key}.name`,
        ),
      },
      writable: true,
    })
  }
  return platforms
}

export function resolveDefinitionsPath(
  sourceDir: string,
  configDir: string,
  definitionsPath?: string,
): string {
  if (definitionsPath === undefined) {
    return resolve(sourceDir, 'content/definitions.yml')
  }
  return resolve(configDir, definitionsPath)
}

export function loadContentDefinitions(
  absolutePath: string,
  mainLocale: LocaleKey,
): ContentDefinitions {
  const raw = copyOwnDataFields(
    loadYamlFile(absolutePath),
    'definitions file',
    absolutePath,
  )
  rejectUnknownFields(raw, ROOT_FIELDS, 'definitions', absolutePath)

  const tags = Object.hasOwn(raw, 'tags')
    ? parseTags(raw.tags, mainLocale, absolutePath)
    : (Object.create(null) as Record<string, TagDefinition>)
  const platforms = Object.hasOwn(raw, 'platforms')
    ? parsePlatforms(raw.platforms, mainLocale, absolutePath)
    : (Object.create(null) as Record<string, PlatformDefinition>)

  return { tags, platforms }
}
