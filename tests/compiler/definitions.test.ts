import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  isDiagnosticError,
  SynctrolDiagnosticError,
} from '../../src/compiler/diagnostics'
import {
  loadContentDefinitions,
  resolveDefinitionsPath,
} from '../../src/compiler/definitions'
import type {
  ContentDefinitions,
  PlatformCategory,
  PlatformDefinition,
  TagDefinition,
} from '../../src/shared/types'

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/compiler/definitions',
)

const temporaryRoots = new Set<string>()

function writeDefinitions(body: string): string {
  const root = mkdtempSync(join(tmpdir(), 'synctrol-definitions-'))
  temporaryRoots.add(root)
  const path = join(root, 'definitions.yml')
  writeFileSync(path, body, 'utf8')
  return path
}

function expectDiagnostic(
  body: string,
  code: string,
  message?: string,
): void {
  const path = writeDefinitions(body)
  expectPathDiagnostic(path, code, message)
}

function expectPathDiagnostic(
  path: string,
  code: string,
  message?: string,
): void {
  try {
    loadContentDefinitions(path, 'zh')
    expect.unreachable('should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(SynctrolDiagnosticError)
    expect(isDiagnosticError(error)).toBe(true)
    if (isDiagnosticError(error)) {
      expect(error.diagnostics).toHaveLength(1)
      expect(error.diagnostics[0]).toMatchObject({
        severity: 'error',
        code,
        path,
      })
      if (message !== undefined) {
        expect(error.diagnostics[0].message).toContain(message)
      }
    }
  }
}

function withPrototypeProperties<T>(
  properties: ReadonlyArray<readonly [string, PropertyDescriptor]>,
  action: () => T,
): T {
  const originals = properties.map(
    ([key]) =>
      [key, Object.getOwnPropertyDescriptor(Object.prototype, key)] as const,
  )

  try {
    for (const [key, descriptor] of properties) {
      Object.defineProperty(Object.prototype, key, {
        configurable: true,
        enumerable: false,
        ...descriptor,
      })
    }
    return action()
  } finally {
    for (const [key, descriptor] of originals.reverse()) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(Object.prototype, key)
      } else {
        Object.defineProperty(Object.prototype, key, descriptor)
      }
    }
  }
}

afterEach(() => {
  for (const root of temporaryRoots) {
    rmSync(root, { force: true, recursive: true })
  }
  temporaryRoots.clear()
})

describe('resolveDefinitionsPath', () => {
  it('defaults to an absolute normalized path under sourceDir', () => {
    expect(resolveDefinitionsPath('/site/./src/..', '/site/.vuepress')).toBe(
      '/site/content/definitions.yml',
    )
  })

  it('absolutizes a relative sourceDir for the default path', () => {
    expect(resolveDefinitionsPath('relative/site', 'relative/config')).toBe(
      resolve('relative/site/content/definitions.yml'),
    )
  })

  it('resolves a relative definitionsPath against an absolute configDir', () => {
    expect(
      resolveDefinitionsPath(
        '/site',
        '/site/.vuepress',
        '../content/./definitions.yml',
      ),
    ).toBe('/site/content/definitions.yml')
  })

  it('absolutizes a relative configDir before resolving definitionsPath', () => {
    expect(
      resolveDefinitionsPath(
        'relative/site',
        'relative/site/.vuepress',
        '../content/definitions.yml',
      ),
    ).toBe(resolve('relative/site/content/definitions.yml'))
  })

  it('normalizes an absolute definitionsPath', () => {
    expect(
      resolveDefinitionsPath(
        '/site',
        '/site/.vuepress',
        '/absolute/content/../definitions.yml',
      ),
    ).toBe('/absolute/definitions.yml')
  })
})

describe('loadContentDefinitions', () => {
  it('loads multilingual tags and built-in or custom platform types', () => {
    const definitions = loadContentDefinitions(
      join(fixtureRoot, 'definitions.yml'),
      'zh',
    )
    const customPath = writeDefinitions(`
tags:
  发布-tag_一:
    title: 发布
platforms:
  自定义-platform_一:
    category: digital
    type: custom_player
    name: 自定义平台
`)
    const custom = loadContentDefinitions(customPath, 'zh')

    expect(definitions.tags.release.title).toEqual({
      zh: '作品发布',
      en: 'Releases',
    })
    expect(definitions.platforms.bilibili).toEqual({
      category: 'digital',
      type: 'bilibili_player',
      name: 'Bilibili',
    })
    expect(definitions.platforms.taobao).toEqual({
      category: 'physical',
      type: 'link',
      name: { zh: '淘宝', en: 'Taobao' },
    })
    expect(custom).toEqual({
      tags: {
        '发布-tag_一': { title: '发布' },
      },
      platforms: {
        '自定义-platform_一': {
          category: 'digital',
          type: 'custom_player',
          name: '自定义平台',
        },
      },
    })
  })

  it('exposes the definitions type contract without redeclaring built-in types', () => {
    const category: PlatformCategory = 'physical'
    const tag: TagDefinition = { title: 'Release' }
    const platform: PlatformDefinition = {
      category,
      type: 'custom_player',
      name: 'Custom',
    }
    const definitions: ContentDefinitions = {
      tags: { release: tag },
      platforms: { custom: platform },
    }

    expect(definitions.platforms.custom.type).toBe('custom_player')
  })

  it('defaults missing tags and platforms to isolated safe maps', () => {
    const empty = loadContentDefinitions(writeDefinitions('{}\n'), 'zh')
    const tagsOnly = loadContentDefinitions(
      writeDefinitions('tags:\n  release:\n    title: Release\n'),
      'zh',
    )

    expect(empty).toEqual({ tags: {}, platforms: {} })
    expect(Object.getPrototypeOf(empty.tags)).toBeNull()
    expect(Object.getPrototypeOf(empty.platforms)).toBeNull()
    expect(tagsOnly.platforms).toEqual({})
    expect(Object.getPrototypeOf(tagsOnly.platforms)).toBeNull()
  })

  it.each([
    ['null', 'null\n'],
    ['sequence', '[]\n'],
    ['scalar', 'definitions\n'],
  ])('rejects a %s root', (_label, body) => {
    expectDiagnostic(body, 'INVALID_DEFINITIONS', 'plain mapping')
  })

  it.each([
    ['tags null', 'tags: null\n'],
    ['tags sequence', 'tags: []\n'],
    ['tags scalar', 'tags: release\n'],
    ['platforms null', 'platforms: null\n'],
    ['platforms sequence', 'platforms: []\n'],
    ['platforms scalar', 'platforms: youtube\n'],
  ])('rejects %s instead of defaulting it', (_label, body) => {
    expectDiagnostic(body, 'INVALID_DEFINITIONS', 'plain mapping')
  })

  it.each([
    ['tag null', 'tags:\n  release: null\n'],
    ['tag sequence', 'tags:\n  release: []\n'],
    ['tag scalar', 'tags:\n  release: Release\n'],
    ['platform null', 'platforms:\n  youtube: null\n'],
    ['platform sequence', 'platforms:\n  youtube: []\n'],
    ['platform scalar', 'platforms:\n  youtube: YouTube\n'],
  ])('rejects a %s entry', (_label, body) => {
    expectDiagnostic(body, 'INVALID_DEFINITIONS', 'plain mapping')
  })

  it.each([
    ['root', 'extra: true\n', 'definitions field "extra"'],
    [
      'tag',
      'tags:\n  release:\n    title: Release\n    extra: true\n',
      'tag field "extra"',
    ],
    [
      'platform',
      'platforms:\n  youtube:\n    category: digital\n    type: link\n    name: YouTube\n    extra: true\n',
      'platform field "extra"',
    ],
  ])('rejects an unknown %s field', (_label, body, message) => {
    expectDiagnostic(body, 'UNKNOWN_FIELD', message)
  })

  it.each([
    '__proto__',
    'prototype',
    'constructor',
    '',
    '.',
    '..',
    '../escape',
    'a/b',
    'a\\\\b',
    '%2e',
    '%252e%252e',
    'a%2fb',
  ])('rejects unsafe tag key %j with a structured diagnostic', (key) => {
    expectDiagnostic(
      `tags:\n  ${JSON.stringify(key)}:\n    title: Release\n`,
      'INVALID_DEFINITION_KEY',
      'tag key',
    )
  })

  it.each([
    '__proto__',
    'prototype',
    'constructor',
    '',
    '.',
    '..',
    '../escape',
    'a/b',
    'a\\\\b',
    '%2e',
    '%252e%252e',
    'a%2fb',
  ])('rejects unsafe platform key %j with a structured diagnostic', (key) => {
    expectDiagnostic(
      `platforms:\n  ${JSON.stringify(key)}:\n    category: digital\n    type: link\n    name: Platform\n`,
      'INVALID_DEFINITION_KEY',
      'platform key',
    )
  })

  it.each([
    ['missing', undefined],
    ['null', 'null'],
    ['wrong case', 'Digital'],
    ['custom', 'virtual'],
  ])('rejects %s platform category', (_label, category) => {
    const categoryField =
      category === undefined ? '' : `    category: ${category}\n`
    expectDiagnostic(
      `platforms:\n  custom:\n${categoryField}    type: link\n    name: Custom\n`,
      'INVALID_PLATFORM_CATEGORY',
      'digital or physical',
    )
  })

  it.each([
    ['missing', undefined],
    ['null', 'null'],
    ['empty', '""'],
    ['blank', '"   "'],
    ['path', 'player/custom'],
    ['encoded dot', '"%252e%252e"'],
    ['dangerous prototype name', 'constructor'],
  ])('rejects %s platform type', (_label, type) => {
    const typeField = type === undefined ? '' : `    type: ${type}\n`
    expectDiagnostic(
      `platforms:\n  custom:\n    category: digital\n${typeField}    name: Custom\n`,
      'INVALID_PLATFORM_TYPE',
      'safe, non-empty string segment',
    )
  })

  it('requires the main locale in tag title maps', () => {
    expectDiagnostic(
      'tags:\n  release:\n    title:\n      en: Releases\n',
      'MISSING_MAIN_LOCALE',
      'tags.release.title',
    )
  })

  it('requires the main locale in platform name maps', () => {
    expectDiagnostic(
      'platforms:\n  taobao:\n    category: physical\n    type: link\n    name:\n      en: Taobao\n',
      'MISSING_MAIN_LOCALE',
      'platforms.taobao.name',
    )
  })

  it.each([
    ['numeric tag title', 'tags:\n  release:\n    title: 1\n', 'tags.release.title'],
    ['null tag title', 'tags:\n  release:\n    title: null\n', 'tags.release.title'],
    [
      'numeric platform name',
      'platforms:\n  custom:\n    category: digital\n    type: link\n    name: 1\n',
      'platforms.custom.name',
    ],
    [
      'null platform name',
      'platforms:\n  custom:\n    category: digital\n    type: link\n    name: null\n',
      'platforms.custom.name',
    ],
  ])('rejects %s', (_label, body, field) => {
    expectDiagnostic(body, 'INVALID_MULTILANGUAGE', field)
  })

  it('does not fill missing root or entry fields from Object.prototype', () => {
    const emptyPath = writeDefinitions('{}\n')
    const tagPath = writeDefinitions('tags:\n  release: {}\n')
    const platformPath = writeDefinitions('platforms:\n  custom: {}\n')

    const empty = withPrototypeProperties(
      [
        ['tags', { value: { polluted: true }, writable: true }],
        ['platforms', { value: { polluted: true }, writable: true }],
      ],
      () => loadContentDefinitions(emptyPath, 'zh'),
    )
    expect(empty).toEqual({ tags: {}, platforms: {} })

    withPrototypeProperties(
      [
        ['title', { value: 'Polluted title', writable: true }],
        ['category', { value: 'digital', writable: true }],
        ['type', { value: 'link', writable: true }],
        ['name', { value: 'Polluted name', writable: true }],
      ],
      () => {
        expectPathDiagnostic(tagPath, 'INVALID_MULTILANGUAGE', 'title')
        expectPathDiagnostic(
          platformPath,
          'INVALID_PLATFORM_CATEGORY',
          'digital or physical',
        )
      },
    )
  })

  it('uses safe result maps without invoking Object.prototype setters', () => {
    const path = writeDefinitions(`
tags:
  release:
    title: Release
platforms:
  youtube:
    category: digital
    type: youtube_player
    name: YouTube
`)
    let tagSetterCalled = false
    let platformSetterCalled = false

    const definitions = withPrototypeProperties(
      [
        [
          'release',
          {
            set() {
              tagSetterCalled = true
            },
          },
        ],
        [
          'youtube',
          {
            set() {
              platformSetterCalled = true
            },
          },
        ],
      ],
      () => loadContentDefinitions(path, 'zh'),
    )

    expect(tagSetterCalled).toBe(false)
    expect(platformSetterCalled).toBe(false)
    expect(Object.hasOwn(definitions.tags, 'release')).toBe(true)
    expect(Object.hasOwn(definitions.platforms, 'youtube')).toBe(true)
  })

  it('returns fresh copies that are isolated from later result mutation', () => {
    const path = join(fixtureRoot, 'definitions.yml')
    const first = loadContentDefinitions(path, 'zh')
    const second = loadContentDefinitions(path, 'zh')

    first.tags.release.title = 'Mutated'
    first.platforms.bilibili.name = 'Mutated'
    first.platforms.bilibili.type = 'mutated_type'
    first.tags.added = { title: 'Added' }

    expect(second.tags.release.title).toEqual({
      zh: '作品发布',
      en: 'Releases',
    })
    expect(second.platforms.bilibili).toEqual({
      category: 'digital',
      type: 'bilibili_player',
      name: 'Bilibili',
    })
    expect(Object.hasOwn(second.tags, 'added')).toBe(false)
    expect(second.tags).not.toBe(first.tags)
    expect(second.platforms).not.toBe(first.platforms)
  })

  it('preserves INVALID_YAML for missing, unreadable, and malformed files', () => {
    const root = mkdtempSync(join(tmpdir(), 'synctrol-definitions-'))
    temporaryRoots.add(root)
    const malformed = writeDefinitions('tags: [\n')

    expectPathDiagnostic(join(root, 'missing.yml'), 'INVALID_YAML')
    expectPathDiagnostic(root, 'INVALID_YAML')
    expectPathDiagnostic(malformed, 'INVALID_YAML')
  })
})
