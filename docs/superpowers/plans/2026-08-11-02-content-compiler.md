# Content Compiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Synctrol theme content compiler that discovers colocated content packages, validates `content.yml` / `definitions.yml` / `book.yml` against the design schemas, and reports structured diagnostics — without locale routing, shell, or UI work.

**Architecture:** A Node-side compiler under `src/compiler/` scans a content root for directories that contain `content.yml`, rejects nested packages, parses YAML with the `yaml` package, and validates manifests, global definitions, and Release Books through pure functions that return typed results or throw `SynctrolDiagnosticError`. Plan 01 already provides `ContentType`, `Multilanguage`, `ReleaseOptions`, `definitionsPath`, and Vitest; this plan extends shared types with Book/manifest/definitions shapes and wires a single `compileContent()` entry that later locale/route work can consume.

**Tech Stack:** TypeScript, Node `fs`/`path`, `yaml` parser, Vitest (from Plan 01), package name `vuepress-theme-synctrolling`.

## Global Constraints

- This is not a general-purpose documentation theme. Configuration exists to operate the Synctrol website without allowing arbitrary visual changes that dilute the brand.
- Member pages use `page` in the first version. There is no `member` type and no per-page layout selector.
- There is no `contentDir`, full route-template, visual-token, breakpoint, SocialLinks icon-size, or Release artwork-loading option.
- The default source root is `content/`. The default global definitions file is `content/definitions.yml`.
- `definitionsPath` accepts an absolute path or a path relative to the VuePress configuration file.
- It defaults to `<sourceDir>/content/definitions.yml`.
- The file does not need to be inside the content root.
- A missing, unreadable, or invalid configured definitions file is a build error.
- A directory containing `content.yml` is a content package.
- The scanner recursively searches ordinary directories.
- A content package cannot contain another content package.
- A nested `content.yml` produces a build error naming both package paths.
- Source directory hierarchy does not determine type or URL.
- `config.yml` and other YAML files have no implicit behavior.
- `book.yml` is allowed only in a `release` package.
- `background` is not a legal field. Its presence is a build error.
- Unknown manifest fields are build errors.
- `date` and `updated` use the exact `YYYY-MM-DD` form. Dates are interpreted as calendar dates without timezone conversion.
- `updated` cannot precede `date`.
- Empty values, path separators, `.` and `..` are invalid.
- A map must define `mainLocale`; otherwise validation fails.
- Referencing an undeclared tag or platform is a build error.
- Unused definitions are allowed.
- No standalone top-level `links` field exists in `content.yml`.
- YAML content cannot provide arbitrary HTML, scripts, or iframe templates.
- Unknown fields anywhere in `book.yml` are build errors.
- Links require digital platforms. (Album)
- Item links require physical platforms. (Gift)

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/compiler/diagnostics.ts` | `DiagnosticSeverity`, `SynctrolDiagnostic`, `SynctrolDiagnosticError`, helpers |
| `src/compiler/yaml.ts` | Load and parse a YAML file into `unknown` |
| `src/compiler/multilanguage.ts` | Validate/normalize `Multilanguage` against `mainLocale` |
| `src/compiler/discovery.ts` | Recursively discover packages; reject nesting |
| `src/compiler/manifest.ts` | Validate `content.yml` per `ContentType` |
| `src/compiler/definitions.ts` | Load/validate definitions file; resolve path via `definitionsPath` |
| `src/compiler/platform-entry.ts` | Validate flat platform entries against definition `type` + category |
| `src/compiler/book.ts` | Validate `AlbumBook` / `GiftBook` discriminated union |
| `src/compiler/compile-content.ts` | Orchestrate discovery → definitions → manifests → books |
| `src/compiler/index.ts` | Public compiler exports |
| `src/shared/types.ts` | Extend with compiler result / Book / definitions types (Plan 01 base) |
| `src/shared/options.ts` | Already exposes `definitionsPath` / `ReleaseOptions` (Plan 01; no locale/UI changes) |
| `tests/compiler/*.test.ts` | Vitest coverage for each module |
| `tests/fixtures/compiler/**` | On-disk YAML fixtures for discovery/compile tests |

**Out of scope for this plan:** locale negotiation, routePath/publicPath, draft/fallback publishing matrices, assets hashing, shell, backgrounds, platform renderers/CSP, Release/News UI.

**Assumed from Plan 01:** `package.json` name `vuepress-theme-synctrolling`; `src/index.ts`; `src/shared/types.ts` exports at least `ContentType`, `Multilanguage`, `LocaleKey`, `LocalePath`, `ReleaseOptions`; `src/shared/options.ts` includes `definitionsPath?: string`; Vitest configured and runnable via `npm test`.

---

### Task 1: Diagnostics primitives

**Files:**
- Create: `src/compiler/diagnostics.ts`
- Test: `tests/compiler/diagnostics.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `DiagnosticSeverity`, `SynctrolDiagnostic`, `SynctrolDiagnosticError`, `createDiagnostic()`, `fail()`, `isDiagnosticError()`

- [ ] **Step 1: Write the failing test**

```ts
// tests/compiler/diagnostics.test.ts
import { describe, expect, it } from 'vitest'
import {
  createDiagnostic,
  fail,
  isDiagnosticError,
  SynctrolDiagnosticError,
} from '../../src/compiler/diagnostics'

describe('diagnostics', () => {
  it('creates an error diagnostic with path and message', () => {
    const d = createDiagnostic({
      severity: 'error',
      code: 'NESTED_PACKAGE',
      message: 'Nested content package',
      path: '/content/releases/a',
      relatedPath: '/content/releases/a/nested',
    })
    expect(d.severity).toBe('error')
    expect(d.code).toBe('NESTED_PACKAGE')
    expect(d.path).toBe('/content/releases/a')
    expect(d.relatedPath).toBe('/content/releases/a/nested')
  })

  it('fail throws SynctrolDiagnosticError wrapping one diagnostic', () => {
    expect(() =>
      fail({
        severity: 'error',
        code: 'INVALID_YAML',
        message: 'bad yaml',
        path: '/content/definitions.yml',
      }),
    ).toThrow(SynctrolDiagnosticError)

    try {
      fail({
        severity: 'error',
        code: 'INVALID_YAML',
        message: 'bad yaml',
        path: '/content/definitions.yml',
      })
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics).toHaveLength(1)
        expect(error.diagnostics[0].code).toBe('INVALID_YAML')
        expect(error.message).toContain('bad yaml')
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/diagnostics.test.ts`

Expected: FAIL with module not found or export missing for `../../src/compiler/diagnostics`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/diagnostics.ts
export type DiagnosticSeverity = 'error' | 'warning'

export interface SynctrolDiagnostic {
  severity: DiagnosticSeverity
  code: string
  message: string
  path?: string
  relatedPath?: string
}

export class SynctrolDiagnosticError extends Error {
  readonly diagnostics: SynctrolDiagnostic[]

  constructor(diagnostics: SynctrolDiagnostic[]) {
    const first = diagnostics[0]
    super(first ? `${first.code}: ${first.message}` : 'Synctrol diagnostic error')
    this.name = 'SynctrolDiagnosticError'
    this.diagnostics = diagnostics
  }
}

export function createDiagnostic(
  diagnostic: SynctrolDiagnostic,
): SynctrolDiagnostic {
  return { ...diagnostic }
}

export function fail(diagnostic: SynctrolDiagnostic): never {
  throw new SynctrolDiagnosticError([createDiagnostic(diagnostic)])
}

export function isDiagnosticError(
  error: unknown,
): error is SynctrolDiagnosticError {
  return error instanceof SynctrolDiagnosticError
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/diagnostics.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/diagnostics.ts tests/compiler/diagnostics.test.ts
git commit -m "feat(compiler): add Synctrol diagnostic primitives"
```

---

### Task 2: YAML loader

**Files:**
- Create: `src/compiler/yaml.ts`
- Modify: `package.json` (add dependency `yaml`)
- Test: `tests/compiler/yaml.test.ts`
- Create: `tests/fixtures/compiler/yaml/valid.yml`
- Create: `tests/fixtures/compiler/yaml/invalid.yml`

**Interfaces:**
- Consumes: `fail()` from `src/compiler/diagnostics.ts`
- Produces: `loadYamlFile(absolutePath: string): unknown`

- [ ] **Step 1: Install yaml and write fixtures plus failing test**

```bash
npm install yaml
```

```yaml
# tests/fixtures/compiler/yaml/valid.yml
type: release
slug: first-release
```

```yaml
# tests/fixtures/compiler/yaml/invalid.yml
type: [unterminated
```

```ts
// tests/compiler/yaml.test.ts
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { loadYamlFile } from '../../src/compiler/yaml'

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/compiler/yaml',
)

describe('loadYamlFile', () => {
  it('parses a valid YAML file into a plain object', () => {
    const data = loadYamlFile(join(fixtureRoot, 'valid.yml'))
    expect(data).toEqual({ type: 'release', slug: 'first-release' })
  })

  it('throws INVALID_YAML for malformed YAML', () => {
    try {
      loadYamlFile(join(fixtureRoot, 'invalid.yml'))
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_YAML')
        expect(error.diagnostics[0].path).toContain('invalid.yml')
      }
    }
  })

  it('throws INVALID_YAML for a missing file', () => {
    try {
      loadYamlFile(join(fixtureRoot, 'missing.yml'))
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_YAML')
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/yaml.test.ts`

Expected: FAIL with module not found for `../../src/compiler/yaml`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/yaml.ts
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { fail } from './diagnostics'

export function loadYamlFile(absolutePath: string): unknown {
  let raw: string
  try {
    raw = readFileSync(absolutePath, 'utf8')
  } catch (error) {
    fail({
      severity: 'error',
      code: 'INVALID_YAML',
      message: `Unable to read YAML file: ${
        error instanceof Error ? error.message : String(error)
      }`,
      path: absolutePath,
    })
  }

  try {
    return parse(raw)
  } catch (error) {
    fail({
      severity: 'error',
      code: 'INVALID_YAML',
      message: `Invalid YAML: ${
        error instanceof Error ? error.message : String(error)
      }`,
      path: absolutePath,
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/yaml.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/compiler/yaml.ts tests/compiler/yaml.test.ts tests/fixtures/compiler/yaml
git commit -m "feat(compiler): add YAML file loader with INVALID_YAML diagnostics"
```

---

### Task 3: Multilanguage validation

**Files:**
- Create: `src/compiler/multilanguage.ts`
- Modify: `src/shared/types.ts` (ensure `Multilanguage` / `LocaleKey` match the spec; add only if Plan 01 omitted them)
- Test: `tests/compiler/multilanguage.test.ts`

**Interfaces:**
- Consumes: `Multilanguage`, `LocaleKey` from `src/shared/types.ts`; `fail()` from diagnostics
- Produces: `assertMultilanguage(value: unknown, mainLocale: LocaleKey, path: string, field: string): Multilanguage`

- [ ] **Step 1: Ensure shared types exist, then write the failing test**

If Plan 01 already exports these exact types, do not redefine them. If missing, append to `src/shared/types.ts`:

```ts
export type LocaleKey = string

export type Multilanguage = string | Record<LocaleKey, string>
```

```ts
// tests/compiler/multilanguage.test.ts
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { assertMultilanguage } from '../../src/compiler/multilanguage'

describe('assertMultilanguage', () => {
  it('accepts a scalar string', () => {
    expect(assertMultilanguage('SYNCTROL', 'zh', '/x.yml', 'title')).toBe(
      'SYNCTROL',
    )
  })

  it('accepts a map that defines mainLocale', () => {
    expect(
      assertMultilanguage(
        { zh: '第一张专辑', en: 'First Album' },
        'zh',
        '/x.yml',
        'title',
      ),
    ).toEqual({ zh: '第一张专辑', en: 'First Album' })
  })

  it('rejects a map missing mainLocale', () => {
    try {
      assertMultilanguage({ en: 'First Album' }, 'zh', '/x.yml', 'title')
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('MISSING_MAIN_LOCALE')
        expect(error.diagnostics[0].path).toBe('/x.yml')
        expect(error.diagnostics[0].message).toContain('title')
      }
    }
  })

  it('rejects non-string map values and non-string/non-object inputs', () => {
    expect(() =>
      assertMultilanguage({ zh: 1 }, 'zh', '/x.yml', 'title'),
    ).toThrow()
    expect(() => assertMultilanguage(1, 'zh', '/x.yml', 'title')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/multilanguage.test.ts`

Expected: FAIL with module not found for `../../src/compiler/multilanguage`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/multilanguage.ts
import type { LocaleKey, Multilanguage } from '../shared/types'
import { fail } from './diagnostics'

export function assertMultilanguage(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
  field: string,
): Multilanguage {
  if (typeof value === 'string') {
    return value
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record: Record<string, string> = {}
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry !== 'string') {
        fail({
          severity: 'error',
          code: 'INVALID_MULTILANGUAGE',
          message: `${field} map values must be strings`,
          path,
        })
      }
      record[key] = entry
    }

    if (!(mainLocale in record)) {
      fail({
        severity: 'error',
        code: 'MISSING_MAIN_LOCALE',
        message: `${field} map must define mainLocale "${mainLocale}"`,
        path,
      })
    }

    return record
  }

  fail({
    severity: 'error',
    code: 'INVALID_MULTILANGUAGE',
    message: `${field} must be a string or locale map`,
    path,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/multilanguage.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/multilanguage.ts src/shared/types.ts tests/compiler/multilanguage.test.ts
git commit -m "feat(compiler): validate Multilanguage scalars and mainLocale maps"
```

---

### Task 4: Package discovery and nesting rejection

**Files:**
- Create: `src/compiler/discovery.ts`
- Modify: `src/shared/types.ts` (add `DiscoveredPackage`)
- Test: `tests/compiler/discovery.test.ts`
- Create fixtures under `tests/fixtures/compiler/discovery/`

**Interfaces:**
- Consumes: `fail()` from diagnostics
- Produces: `DiscoveredPackage`, `discoverContentPackages(contentRoot: string): DiscoveredPackage[]`

- [ ] **Step 1: Add type, fixtures, and failing test**

Append to `src/shared/types.ts`:

```ts
export interface DiscoveredPackage {
  /** Absolute path to the package directory (directory that contains content.yml). */
  dir: string
  /** Absolute path to content.yml */
  contentYmlPath: string
  /** Absolute path to book.yml when present */
  bookYmlPath?: string
}
```

Create this fixture tree:

```text
tests/fixtures/compiler/discovery/ok/
  home/content.yml
  releases/first-release/content.yml
  releases/first-release/book.yml
  ignored/notes.md
  ignored/config.yml

tests/fixtures/compiler/discovery/nested/
  releases/parent/content.yml
  releases/parent/child/content.yml
```

Each `content.yml` may be empty object `{}` for discovery-only tests. `book.yml` may be `type: album`.

```ts
// tests/compiler/discovery.test.ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { discoverContentPackages } from '../../src/compiler/discovery'

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/compiler/discovery',
)

describe('discoverContentPackages', () => {
  it('finds every directory that contains content.yml and records book.yml', () => {
    const packages = discoverContentPackages(join(fixtureRoot, 'ok'))
    const dirs = packages.map((p) => p.dir).sort()
    expect(dirs).toEqual(
      [
        join(fixtureRoot, 'ok/home'),
        join(fixtureRoot, 'ok/releases/first-release'),
      ].sort(),
    )

    const release = packages.find((p) => p.dir.endsWith('first-release'))
    expect(release?.bookYmlPath).toBe(
      join(fixtureRoot, 'ok/releases/first-release/book.yml'),
    )
    expect(packages.find((p) => p.dir.endsWith('home'))?.bookYmlPath).toBe(
      undefined,
    )
  })

  it('ignores config.yml and ordinary files without treating them as packages', () => {
    const packages = discoverContentPackages(join(fixtureRoot, 'ok'))
    expect(packages.every((p) => p.contentYmlPath.endsWith('content.yml'))).toBe(
      true,
    )
    expect(packages).toHaveLength(2)
  })

  it('errors on nested content packages and names both paths', () => {
    try {
      discoverContentPackages(join(fixtureRoot, 'nested'))
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('NESTED_PACKAGE')
        expect(error.diagnostics[0].path).toContain('parent')
        expect(error.diagnostics[0].relatedPath).toContain('child')
        expect(error.diagnostics[0].message).toContain('parent')
        expect(error.diagnostics[0].message).toContain('child')
      }
    }
  })

  it('returns an empty array for an empty content root', () => {
    const empty = mkdtempSync(join(tmpdir(), 'synctrol-empty-'))
    mkdirSync(empty, { recursive: true })
    expect(discoverContentPackages(empty)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/discovery.test.ts`

Expected: FAIL with module not found for `../../src/compiler/discovery`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/discovery.ts
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { DiscoveredPackage } from '../shared/types'
import { fail } from './diagnostics'

export function discoverContentPackages(contentRoot: string): DiscoveredPackage[] {
  const packages: DiscoveredPackage[] = []

  function walk(dir: string, enclosingPackage: string | undefined): void {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    const hasContentYml = entries.some(
      (entry) => entry.isFile() && entry.name === 'content.yml',
    )

    if (hasContentYml) {
      if (enclosingPackage) {
        fail({
          severity: 'error',
          code: 'NESTED_PACKAGE',
          message: `Content package "${dir}" is nested inside content package "${enclosingPackage}"`,
          path: enclosingPackage,
          relatedPath: dir,
        })
      }

      const bookPath = join(dir, 'book.yml')
      let bookYmlPath: string | undefined
      try {
        if (statSync(bookPath).isFile()) {
          bookYmlPath = bookPath
        }
      } catch {
        bookYmlPath = undefined
      }

      packages.push({
        dir,
        contentYmlPath: join(dir, 'content.yml'),
        bookYmlPath,
      })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          walk(join(dir, entry.name), dir)
        }
      }
      return
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), enclosingPackage)
      }
    }
  }

  walk(contentRoot, undefined)
  return packages
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/discovery.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/discovery.ts src/shared/types.ts tests/compiler/discovery.test.ts tests/fixtures/compiler/discovery
git commit -m "feat(compiler): discover content packages and reject nesting"
```

---

### Task 5: Manifest schema (`content.yml`)

**Files:**
- Create: `src/compiler/manifest.ts`
- Modify: `src/shared/types.ts` (add `ContentManifest`, `ParsedContentPackage` field types used by manifest)
- Test: `tests/compiler/manifest.test.ts`

**Interfaces:**
- Consumes: `ContentType`, `LocalePath`, `Multilanguage` from shared types; `loadYamlFile`; `fail`
- Produces: `parseContentManifest(contentYmlPath: string, packageDir: string): ContentManifest`

- [ ] **Step 1: Add types and failing tests**

Append to `src/shared/types.ts` (keep names exact):

```ts
export type LocalePath = string | Partial<Record<LocaleKey, string>>

export interface ContentManifestBase {
  type: ContentType
  draft: boolean
  path?: LocalePath
}

export interface HomeManifest extends ContentManifestBase {
  type: 'home'
}

export interface ReleaseManifest extends ContentManifestBase {
  type: 'release'
  slug: string
  date: string
  cover?: string
  artwork?: string
}

export interface NewsManifest extends ContentManifestBase {
  type: 'news'
  slug: string
  date: string
  updated?: string
  tags: string[]
  cover?: string
}

export interface PageManifest extends ContentManifestBase {
  type: 'page'
  slug: string
  cover?: string
}

export type ContentManifest =
  | HomeManifest
  | ReleaseManifest
  | NewsManifest
  | PageManifest
```

```ts
// tests/compiler/manifest.test.ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { parseContentManifest } from '../../src/compiler/manifest'

function writeManifest(body: string): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), 'synctrol-manifest-'))
  const path = join(dir, 'content.yml')
  writeFileSync(path, body, 'utf8')
  return { dir, path }
}

describe('parseContentManifest', () => {
  it('parses a release manifest and defaults slug to the directory name', () => {
    const dir = mkdtempSync(join(tmpdir(), 'synctrol-release-'))
    const packageDir = join(dir, 'first-release')
    mkdirSync(packageDir)
    const path = join(packageDir, 'content.yml')
    writeFileSync(
      path,
      `
type: release
date: 2026-08-11
draft: false
cover: ./assets/article-cover.webp
artwork: ./assets/album-entry.webp
`,
      'utf8',
    )

    const manifest = parseContentManifest(path, packageDir)
    expect(manifest).toEqual({
      type: 'release',
      slug: 'first-release',
      date: '2026-08-11',
      draft: false,
      cover: './assets/article-cover.webp',
      artwork: './assets/album-entry.webp',
    })
  })

  it('parses home without slug and rejects home cover', () => {
    const { dir, path } = writeManifest(`
type: home
draft: false
`)
    expect(parseContentManifest(path, dir)).toEqual({
      type: 'home',
      draft: false,
    })

    const bad = writeManifest(`
type: home
cover: ./assets/x.webp
`)
    expect(() => parseContentManifest(bad.path, bad.dir)).toThrow()
  })

  it('requires news date/tags and rejects updated before date', () => {
    const ok = writeManifest(`
type: news
date: 2026-08-11
updated: 2026-08-12
tags:
  - release
`)
    expect(parseContentManifest(ok.path, ok.dir)).toMatchObject({
      type: 'news',
      date: '2026-08-11',
      updated: '2026-08-12',
      tags: ['release'],
    })

    const badDate = writeManifest(`
type: news
date: 08-11-2026
tags: []
`)
    expect(() => parseContentManifest(badDate.path, badDate.dir)).toThrow()

    const badUpdated = writeManifest(`
type: news
date: 2026-08-11
updated: 2026-08-10
tags: []
`)
    try {
      parseContentManifest(badUpdated.path, badUpdated.dir)
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_DATE_ORDER')
      }
    }
  })

  it('rejects background, unknown fields, top-level links, and illegal artwork on non-release', () => {
    for (const body of [
      `type: page\nbackground: ./x.ts\n`,
      `type: page\nextra: true\n`,
      `type: page\nlinks: []\n`,
      `type: page\nartwork: ./a.webp\n`,
    ]) {
      const file = writeManifest(body)
      expect(() => parseContentManifest(file.path, file.dir)).toThrow()
    }
  })

  it('rejects invalid slugs', () => {
    const file = writeManifest(`
type: page
slug: ../escape
`)
    try {
      parseContentManifest(file.path, file.dir)
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_SLUG')
      }
    }
  })

  it('accepts LocalePath scalar and map without Multilanguage fallback rules', () => {
    const file = writeManifest(`
type: page
path:
  zh: /custom/path/
  en: /custom/path/
`)
    expect(parseContentManifest(file.path, file.dir)).toMatchObject({
      type: 'page',
      path: { zh: '/custom/path/', en: '/custom/path/' },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/manifest.test.ts`

Expected: FAIL with module not found for `../../src/compiler/manifest`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/manifest.ts
import { basename } from 'node:path'
import type {
  ContentManifest,
  ContentType,
  LocalePath,
} from '../shared/types'
import { fail } from './diagnostics'
import { loadYamlFile } from './yaml'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const CONTENT_TYPES: ContentType[] = ['home', 'release', 'news', 'page']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertDate(value: unknown, path: string, field: string): string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    fail({
      severity: 'error',
      code: 'INVALID_DATE',
      message: `${field} must use exact YYYY-MM-DD form`,
      path,
    })
  }
  return value
}

function assertSlug(value: string, path: string): string {
  if (
    value.length === 0 ||
    value.includes('/') ||
    value.includes('\\') ||
    value === '.' ||
    value === '..'
  ) {
    fail({
      severity: 'error',
      code: 'INVALID_SLUG',
      message: `Invalid slug "${value}"`,
      path,
    })
  }
  return value
}

function parseLocalePath(value: unknown, path: string): LocalePath {
  if (typeof value === 'string') {
    return value
  }
  if (!isPlainObject(value)) {
    fail({
      severity: 'error',
      code: 'INVALID_PATH',
      message: 'path must be a string or locale map',
      path,
    })
  }
  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') {
      fail({
        severity: 'error',
        code: 'INVALID_PATH',
        message: 'path map values must be strings',
        path,
      })
    }
    result[key] = entry
  }
  return result
}

function rejectUnknown(
  raw: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      if (key === 'background') {
        fail({
          severity: 'error',
          code: 'ILLEGAL_BACKGROUND',
          message: 'background is not a legal field',
          path,
        })
      }
      if (key === 'links') {
        fail({
          severity: 'error',
          code: 'ILLEGAL_LINKS',
          message: 'No standalone top-level links field exists in content.yml',
          path,
        })
      }
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown manifest field "${key}"`,
        path,
      })
    }
  }
}

export function parseContentManifest(
  contentYmlPath: string,
  packageDir: string,
): ContentManifest {
  const rawValue = loadYamlFile(contentYmlPath)
  if (!isPlainObject(rawValue)) {
    fail({
      severity: 'error',
      code: 'INVALID_MANIFEST',
      message: 'content.yml must be a mapping',
      path: contentYmlPath,
    })
  }
  const raw = rawValue

  if (typeof raw.type !== 'string' || !CONTENT_TYPES.includes(raw.type as ContentType)) {
    fail({
      severity: 'error',
      code: 'UNKNOWN_CONTENT_TYPE',
      message: `Unknown content type "${String(raw.type)}"`,
      path: contentYmlPath,
    })
  }
  const type = raw.type as ContentType
  const draft = raw.draft === undefined ? false : raw.draft
  if (typeof draft !== 'boolean') {
    fail({
      severity: 'error',
      code: 'INVALID_DRAFT',
      message: 'draft must be a boolean',
      path: contentYmlPath,
    })
  }

  const pathField =
    raw.path === undefined ? undefined : parseLocalePath(raw.path, contentYmlPath)

  if (type === 'home') {
    rejectUnknown(raw, new Set(['type', 'draft', 'path']), contentYmlPath)
    if (pathField !== undefined) {
      fail({
        severity: 'error',
        code: 'HOME_PATH_FORBIDDEN',
        message: 'Home always uses / and cannot be remapped',
        path: contentYmlPath,
      })
    }
    return { type: 'home', draft }
  }

  const directoryName = basename(packageDir)
  const slug =
    raw.slug === undefined
      ? assertSlug(directoryName, contentYmlPath)
      : assertSlug(String(raw.slug), contentYmlPath)

  if (type === 'release') {
    rejectUnknown(
      raw,
      new Set(['type', 'slug', 'date', 'draft', 'cover', 'artwork', 'path']),
      contentYmlPath,
    )
    const date = assertDate(raw.date, contentYmlPath, 'date')
    if (raw.cover !== undefined && typeof raw.cover !== 'string') {
      fail({
        severity: 'error',
        code: 'INVALID_COVER',
        message: 'cover must be an asset path string',
        path: contentYmlPath,
      })
    }
    if (raw.artwork !== undefined && typeof raw.artwork !== 'string') {
      fail({
        severity: 'error',
        code: 'INVALID_ARTWORK',
        message: 'artwork must be an asset path string',
        path: contentYmlPath,
      })
    }
    return {
      type: 'release',
      slug,
      date,
      draft,
      cover: raw.cover as string | undefined,
      artwork: raw.artwork as string | undefined,
      path: pathField,
    }
  }

  if (type === 'news') {
    rejectUnknown(
      raw,
      new Set(['type', 'slug', 'date', 'updated', 'draft', 'cover', 'tags', 'path']),
      contentYmlPath,
    )
    const date = assertDate(raw.date, contentYmlPath, 'date')
    const updated =
      raw.updated === undefined
        ? undefined
        : assertDate(raw.updated, contentYmlPath, 'updated')
    if (updated !== undefined && updated < date) {
      fail({
        severity: 'error',
        code: 'INVALID_DATE_ORDER',
        message: 'updated cannot precede date',
        path: contentYmlPath,
      })
    }
    if (!Array.isArray(raw.tags) || raw.tags.some((t) => typeof t !== 'string')) {
      fail({
        severity: 'error',
        code: 'INVALID_TAGS',
        message: 'tags is required and must be a string array (may be empty)',
        path: contentYmlPath,
      })
    }
    if (raw.cover !== undefined && typeof raw.cover !== 'string') {
      fail({
        severity: 'error',
        code: 'INVALID_COVER',
        message: 'cover must be an asset path string',
        path: contentYmlPath,
      })
    }
    return {
      type: 'news',
      slug,
      date,
      updated,
      draft,
      tags: raw.tags as string[],
      cover: raw.cover as string | undefined,
      path: pathField,
    }
  }

  // page
  rejectUnknown(
    raw,
    new Set(['type', 'slug', 'draft', 'cover', 'path']),
    contentYmlPath,
  )
  if (raw.cover !== undefined && typeof raw.cover !== 'string') {
    fail({
      severity: 'error',
      code: 'INVALID_COVER',
      message: 'cover must be an asset path string',
      path: contentYmlPath,
    })
  }
  return {
    type: 'page',
    slug,
    draft,
    cover: raw.cover as string | undefined,
    path: pathField,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/manifest.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/manifest.ts src/shared/types.ts tests/compiler/manifest.test.ts
git commit -m "feat(compiler): validate content.yml manifests per ContentType"
```

---

### Task 6: Definitions loader (`definitionsPath`)

**Files:**
- Create: `src/compiler/definitions.ts`
- Modify: `src/shared/types.ts` (add `TagDefinition`, `PlatformDefinition`, `ContentDefinitions`)
- Test: `tests/compiler/definitions.test.ts`
- Create: `tests/fixtures/compiler/definitions/definitions.yml`

**Interfaces:**
- Consumes: `assertMultilanguage`; `loadYamlFile`; `fail`; `definitionsPath` semantics from options
- Produces: `resolveDefinitionsPath(sourceDir: string, configDir: string, definitionsPath?: string): string`, `loadContentDefinitions(absolutePath: string, mainLocale: LocaleKey): ContentDefinitions`

- [ ] **Step 1: Add types, fixture, and failing test**

Append to `src/shared/types.ts`:

```ts
export type PlatformCategory = 'digital' | 'physical'

export type BuiltInPlatformType =
  | 'link'
  | 'audio_player'
  | 'youtube_player'
  | 'bilibili_player'
  | 'apple_music_player'
  | 'spotify_player'
  | 'soundcloud_player'
  | 'netease_player'

export interface TagDefinition {
  title: Multilanguage
}

export interface PlatformDefinition {
  category: PlatformCategory
  type: string
  name: Multilanguage
}

export interface ContentDefinitions {
  tags: Record<string, TagDefinition>
  platforms: Record<string, PlatformDefinition>
}
```

```yaml
# tests/fixtures/compiler/definitions/definitions.yml
tags:
  release:
    title:
      zh: 作品发布
      en: Releases

platforms:
  bilibili:
    category: digital
    type: bilibili_player
    name: Bilibili

  youtube:
    category: digital
    type: youtube_player
    name: YouTube

  taobao:
    category: physical
    type: link
    name:
      zh: 淘宝
      en: Taobao

  taobao-digital:
    category: digital
    type: link
    name:
      zh: 淘宝数字商品
      en: Taobao Digital
```

```ts
// tests/compiler/definitions.test.ts
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import {
  loadContentDefinitions,
  resolveDefinitionsPath,
} from '../../src/compiler/definitions'

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/compiler/definitions',
)

describe('resolveDefinitionsPath', () => {
  it('defaults to <sourceDir>/content/definitions.yml', () => {
    expect(resolveDefinitionsPath('/site', '/site/.vuepress')).toBe(
      join('/site', 'content/definitions.yml'),
    )
  })

  it('resolves relative definitionsPath against the VuePress config directory', () => {
    expect(
      resolveDefinitionsPath(
        '/site',
        '/site/.vuepress',
        '../content/definitions.yml',
      ),
    ).toBe(join('/site/.vuepress', '../content/definitions.yml'))
  })

  it('keeps an absolute definitionsPath', () => {
    expect(
      resolveDefinitionsPath('/site', '/site/.vuepress', '/abs/definitions.yml'),
    ).toBe('/abs/definitions.yml')
  })
})

describe('loadContentDefinitions', () => {
  it('loads tags and platforms and requires mainLocale on multilingual maps', () => {
    const defs = loadContentDefinitions(
      join(fixtureRoot, 'definitions.yml'),
      'zh',
    )
    expect(defs.tags.release.title).toEqual({
      zh: '作品发布',
      en: 'Releases',
    })
    expect(defs.platforms.bilibili).toMatchObject({
      category: 'digital',
      type: 'bilibili_player',
      name: 'Bilibili',
    })
    expect(defs.platforms.taobao.category).toBe('physical')
  })

  it('errors when the configured definitions file is missing', () => {
    try {
      loadContentDefinitions(join(fixtureRoot, 'missing.yml'), 'zh')
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_YAML')
      }
    }
  })

  it('errors when a platform name map omits mainLocale', () => {
    const dir = mkdtempSync(join(tmpdir(), 'synctrol-defs-'))
    const path = join(dir, 'definitions.yml')
    writeFileSync(
      path,
      `
platforms:
  taobao:
    category: physical
    type: link
    name:
      en: Taobao
`,
      'utf8',
    )
    try {
      loadContentDefinitions(path, 'zh')
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('MISSING_MAIN_LOCALE')
      }
    }
  })
})
```


- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/definitions.test.ts`

Expected: FAIL with module not found for `../../src/compiler/definitions`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/definitions.ts
import { isAbsolute, join } from 'node:path'
import type {
  ContentDefinitions,
  LocaleKey,
  PlatformCategory,
  PlatformDefinition,
  TagDefinition,
} from '../shared/types'
import { fail } from './diagnostics'
import { assertMultilanguage } from './multilanguage'
import { loadYamlFile } from './yaml'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function resolveDefinitionsPath(
  sourceDir: string,
  configDir: string,
  definitionsPath?: string,
): string {
  if (definitionsPath === undefined) {
    return join(sourceDir, 'content/definitions.yml')
  }
  if (isAbsolute(definitionsPath)) {
    return definitionsPath
  }
  return join(configDir, definitionsPath)
}

export function loadContentDefinitions(
  absolutePath: string,
  mainLocale: LocaleKey,
): ContentDefinitions {
  const rawValue = loadYamlFile(absolutePath)
  if (!isPlainObject(rawValue)) {
    fail({
      severity: 'error',
      code: 'INVALID_DEFINITIONS',
      message: 'definitions file must be a mapping',
      path: absolutePath,
    })
  }

  const tagsRaw = rawValue.tags ?? {}
  const platformsRaw = rawValue.platforms ?? {}
  if (!isPlainObject(tagsRaw) || !isPlainObject(platformsRaw)) {
    fail({
      severity: 'error',
      code: 'INVALID_DEFINITIONS',
      message: 'tags and platforms must be mappings when present',
      path: absolutePath,
    })
  }

  const allowedRoot = new Set(['tags', 'platforms'])
  for (const key of Object.keys(rawValue)) {
    if (!allowedRoot.has(key)) {
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown definitions field "${key}"`,
        path: absolutePath,
      })
    }
  }

  const tags: Record<string, TagDefinition> = {}
  for (const [key, value] of Object.entries(tagsRaw)) {
    if (!isPlainObject(value)) {
      fail({
        severity: 'error',
        code: 'INVALID_DEFINITIONS',
        message: `tag "${key}" must be a mapping`,
        path: absolutePath,
      })
    }
    for (const field of Object.keys(value)) {
      if (field !== 'title') {
        fail({
          severity: 'error',
          code: 'UNKNOWN_FIELD',
          message: `Unknown tag field "${field}"`,
          path: absolutePath,
        })
      }
    }
    tags[key] = {
      title: assertMultilanguage(value.title, mainLocale, absolutePath, `tags.${key}.title`),
    }
  }

  const PLATFORM_CATEGORIES: PlatformCategory[] = ['digital', 'physical']
  const platforms: Record<string, PlatformDefinition> = {}
  for (const [key, value] of Object.entries(platformsRaw)) {
    if (!isPlainObject(value)) {
      fail({
        severity: 'error',
        code: 'INVALID_DEFINITIONS',
        message: `platform "${key}" must be a mapping`,
        path: absolutePath,
      })
    }
    for (const field of Object.keys(value)) {
      if (!['category', 'type', 'name'].includes(field)) {
        fail({
          severity: 'error',
          code: 'UNKNOWN_FIELD',
          message: `Unknown platform field "${field}"`,
          path: absolutePath,
        })
      }
    }
    if (
      typeof value.category !== 'string' ||
      !PLATFORM_CATEGORIES.includes(value.category as PlatformCategory)
    ) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_CATEGORY',
        message: `platform "${key}" category must be digital or physical`,
        path: absolutePath,
      })
    }
    if (typeof value.type !== 'string' || value.type.length === 0) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_TYPE',
        message: `platform "${key}" type is required`,
        path: absolutePath,
      })
    }
    platforms[key] = {
      category: value.category as PlatformCategory,
      type: value.type,
      name: assertMultilanguage(
        value.name,
        mainLocale,
        absolutePath,
        `platforms.${key}.name`,
      ),
    }
  }

  return { tags, platforms }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/definitions.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/definitions.ts src/shared/types.ts tests/compiler/definitions.test.ts tests/fixtures/compiler/definitions
git commit -m "feat(compiler): resolve definitionsPath and validate definitions.yml"
```

---

### Task 7: Platform entry validation (Book link schemas)

**Files:**
- Create: `src/compiler/platform-entry.ts`
- Modify: `src/shared/types.ts` (add `PlatformEntryBase` and built-in entry result types used by Book)
- Test: `tests/compiler/platform-entry.test.ts`

**Interfaces:**
- Consumes: `ContentDefinitions`, `PlatformEntryBase`, built-in type names from shared types; `assertMultilanguage`; `fail`
- Produces: `validatePlatformEntry(entry: unknown, defs: ContentDefinitions, mainLocale: LocaleKey, path: string, requiredCategory: PlatformCategory): NormalizedPlatformEntry`

**Note:** Custom `platforms.types` registration and CSP/renderers belong to Plan 07. This task only validates built-in type field constraints required for Book `album.links` / `gift.items[].links`.

- [ ] **Step 1: Add types and failing test**

Append to `src/shared/types.ts`:

```ts
export interface PlatformEntryBase {
  platform: string
  label?: Multilanguage
}

export type NormalizedPlatformEntry = PlatformEntryBase & Record<string, unknown>
```

```ts
// tests/compiler/platform-entry.test.ts
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { validatePlatformEntry } from '../../src/compiler/platform-entry'
import type { ContentDefinitions } from '../../src/shared/types'

const defs: ContentDefinitions = {
  tags: {},
  platforms: {
    bilibili: {
      category: 'digital',
      type: 'bilibili_player',
      name: 'Bilibili',
    },
    youtube: {
      category: 'digital',
      type: 'youtube_player',
      name: 'YouTube',
    },
    taobao: {
      category: 'physical',
      type: 'link',
      name: { zh: '淘宝', en: 'Taobao' },
    },
  },
}

describe('validatePlatformEntry', () => {
  it('validates bilibili_player digital entries', () => {
    const entry = validatePlatformEntry(
      {
        platform: 'bilibili',
        bvid: 'BV1xxxxxxxxx',
        page: 1,
        autoplay: false,
      },
      defs,
      'zh',
      '/book.yml',
      'digital',
    )
    expect(entry).toMatchObject({
      platform: 'bilibili',
      bvid: 'BV1xxxxxxxxx',
      page: 1,
      autoplay: false,
    })
  })

  it('rejects undeclared platforms', () => {
    try {
      validatePlatformEntry(
        { platform: 'missing', url: 'https://example.com' },
        defs,
        'zh',
        '/book.yml',
        'digital',
      )
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('UNKNOWN_PLATFORM')
      }
    }
  })

  it('rejects physical platforms in album (digital) link lists', () => {
    try {
      validatePlatformEntry(
        { platform: 'taobao', url: 'https://item.taobao.com/example' },
        defs,
        'zh',
        '/book.yml',
        'digital',
      )
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('PLATFORM_CATEGORY_MISMATCH')
      }
    }
  })

  it('validates link HTTPS URLs and youtube videoId length', () => {
    expect(
      validatePlatformEntry(
        { platform: 'taobao', url: 'https://item.taobao.com/example' },
        defs,
        'zh',
        '/book.yml',
        'physical',
      ),
    ).toMatchObject({ platform: 'taobao' })

    expect(() =>
      validatePlatformEntry(
        { platform: 'youtube', videoId: 'short' },
        defs,
        'zh',
        '/book.yml',
        'digital',
      ),
    ).toThrow()
  })

  it('rejects unknown entry fields', () => {
    expect(() =>
      validatePlatformEntry(
        {
          platform: 'bilibili',
          bvid: 'BV1xxxxxxxxx',
          evil: true,
        },
        defs,
        'zh',
        '/book.yml',
        'digital',
      ),
    ).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/platform-entry.test.ts`

Expected: FAIL with module not found for `../../src/compiler/platform-entry`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/platform-entry.ts
import type {
  ContentDefinitions,
  LocaleKey,
  NormalizedPlatformEntry,
  PlatformCategory,
} from '../shared/types'
import { fail } from './diagnostics'
import { assertMultilanguage } from './multilanguage'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertHttpsUrl(value: unknown, path: string, field: string): string {
  if (typeof value !== 'string' || !/^https:\/\//.test(value)) {
    fail({
      severity: 'error',
      code: 'INVALID_PLATFORM_ENTRY',
      message: `${field} must be an absolute HTTPS URL`,
      path,
    })
  }
  return value
}

function rejectUnknown(
  raw: Record<string, unknown>,
  allowed: string[],
  path: string,
): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) {
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown platform entry field "${key}"`,
        path,
      })
    }
  }
}

export function validatePlatformEntry(
  entry: unknown,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
  requiredCategory: PlatformCategory,
): NormalizedPlatformEntry {
  if (!isPlainObject(entry)) {
    fail({
      severity: 'error',
      code: 'INVALID_PLATFORM_ENTRY',
      message: 'platform entry must be a mapping',
      path,
    })
  }

  if (typeof entry.platform !== 'string') {
    fail({
      severity: 'error',
      code: 'INVALID_PLATFORM_ENTRY',
      message: 'platform key is required',
      path,
    })
  }

  const definition = defs.platforms[entry.platform]
  if (!definition) {
    fail({
      severity: 'error',
      code: 'UNKNOWN_PLATFORM',
      message: `Referencing undeclared platform "${entry.platform}"`,
      path,
    })
  }

  if (definition.category !== requiredCategory) {
    fail({
      severity: 'error',
      code: 'PLATFORM_CATEGORY_MISMATCH',
      message: `platform "${entry.platform}" is ${definition.category} but ${requiredCategory} is required`,
      path,
    })
  }

  const label =
    entry.label === undefined
      ? undefined
      : assertMultilanguage(entry.label, mainLocale, path, 'label')

  const base = { platform: entry.platform, ...(label ? { label } : {}) }

  switch (definition.type) {
    case 'link': {
      rejectUnknown(entry, ['platform', 'label', 'url'], path)
      return { ...base, url: assertHttpsUrl(entry.url, path, 'url') }
    }
    case 'audio_player': {
      rejectUnknown(entry, ['platform', 'label', 'src', 'mime', 'autoplay'], path)
      if (typeof entry.src !== 'string' || entry.src.length === 0) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'audio_player.src is required',
          path,
        })
      }
      if (
        entry.mime !== undefined &&
        (typeof entry.mime !== 'string' || !entry.mime.startsWith('audio/'))
      ) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'audio_player.mime must start with audio/',
          path,
        })
      }
      const autoplay = entry.autoplay === undefined ? false : entry.autoplay
      if (typeof autoplay !== 'boolean') {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'autoplay must be boolean',
          path,
        })
      }
      return {
        ...base,
        src: entry.src,
        ...(entry.mime !== undefined ? { mime: entry.mime } : {}),
        autoplay,
      }
    }
    case 'youtube_player': {
      rejectUnknown(entry, ['platform', 'label', 'videoId', 'start', 'autoplay'], path)
      if (
        typeof entry.videoId !== 'string' ||
        !/^[A-Za-z0-9_-]{11}$/.test(entry.videoId)
      ) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'youtube_player.videoId must be exactly 11 [A-Za-z0-9_-] characters',
          path,
        })
      }
      if (
        entry.start !== undefined &&
        (typeof entry.start !== 'number' ||
          !Number.isInteger(entry.start) ||
          entry.start < 0)
      ) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'youtube_player.start must be a non-negative integer',
          path,
        })
      }
      const autoplay = entry.autoplay === undefined ? false : entry.autoplay
      if (typeof autoplay !== 'boolean') {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'autoplay must be boolean',
          path,
        })
      }
      return {
        ...base,
        videoId: entry.videoId,
        ...(entry.start !== undefined ? { start: entry.start } : {}),
        autoplay,
      }
    }
    case 'bilibili_player': {
      rejectUnknown(entry, ['platform', 'label', 'bvid', 'page', 'autoplay'], path)
      if (typeof entry.bvid !== 'string' || !/^BV[A-Za-z0-9]{10}$/.test(entry.bvid)) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'bilibili_player.bvid must be BV followed by ten ASCII letters or digits',
          path,
        })
      }
      if (
        entry.page !== undefined &&
        (typeof entry.page !== 'number' ||
          !Number.isInteger(entry.page) ||
          entry.page < 1)
      ) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'bilibili_player.page must be an integer >= 1',
          path,
        })
      }
      const autoplay = entry.autoplay === undefined ? false : entry.autoplay
      if (typeof autoplay !== 'boolean') {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'autoplay must be boolean',
          path,
        })
      }
      return {
        ...base,
        bvid: entry.bvid,
        ...(entry.page !== undefined ? { page: entry.page } : {}),
        autoplay,
      }
    }
    case 'apple_music_player': {
      rejectUnknown(entry, ['platform', 'label', 'url'], path)
      const url = assertHttpsUrl(entry.url, path, 'url')
      if (!/^https:\/\/music\.apple\.com\//.test(url)) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'apple_music_player.url must be HTTPS on music.apple.com',
          path,
        })
      }
      return { ...base, url }
    }
    case 'spotify_player': {
      rejectUnknown(entry, ['platform', 'label', 'uri'], path)
      if (
        typeof entry.uri !== 'string' ||
        !/^spotify:(album|track|playlist):/.test(entry.uri)
      ) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'spotify_player.uri must be spotify:album|track|playlist:…',
          path,
        })
      }
      return { ...base, uri: entry.uri }
    }
    case 'soundcloud_player': {
      rejectUnknown(entry, ['platform', 'label', 'url'], path)
      const url = assertHttpsUrl(entry.url, path, 'url')
      if (!/^https:\/\/soundcloud\.com\//.test(url)) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'soundcloud_player.url must be HTTPS on soundcloud.com',
          path,
        })
      }
      return { ...base, url }
    }
    case 'netease_player': {
      rejectUnknown(entry, ['platform', 'label', 'id', 'resourceType'], path)
      if (typeof entry.id !== 'string' || !/^\d+$/.test(entry.id)) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'netease_player.id must be a non-empty decimal digit string',
          path,
        })
      }
      if (
        entry.resourceType !== 'song' &&
        entry.resourceType !== 'album' &&
        entry.resourceType !== 'playlist'
      ) {
        fail({
          severity: 'error',
          code: 'INVALID_PLATFORM_ENTRY',
          message: 'netease_player.resourceType must be song|album|playlist',
          path,
        })
      }
      return { ...base, id: entry.id, resourceType: entry.resourceType }
    }
    default:
      fail({
        severity: 'error',
        code: 'UNKNOWN_PLATFORM_TYPE',
        message: `Unknown platform type "${definition.type}"`,
        path,
      })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/platform-entry.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/platform-entry.ts src/shared/types.ts tests/compiler/platform-entry.test.ts
git commit -m "feat(compiler): validate built-in platform entries for Book links"
```

---

### Task 8: Album Book validation

**Files:**
- Create: `src/compiler/book.ts` (Album path first; Gift added in Task 9)
- Modify: `src/shared/types.ts` (add `Book`, `AlbumBook`, `GiftBook`, `BookBase`, `Disc`, `Track`, `GiftItem`)
- Test: `tests/compiler/book-album.test.ts`

**Interfaces:**
- Consumes: `assertMultilanguage`, `validatePlatformEntry`, `loadYamlFile`, `ContentDefinitions`
- Produces: `parseAlbumBook(raw: Record<string, unknown>, defs: ContentDefinitions, mainLocale: LocaleKey, path: string): AlbumBook` and `parseBook(...)` that dispatches `type: 'album'` (Gift dispatch lands in Task 9)

- [ ] **Step 1: Add Book types and failing Album tests**

Append to `src/shared/types.ts` exactly:

```ts
export type AssetPath = string

export interface BookBase {
  title: Multilanguage
  desc?: Multilanguage
  authors?: string[]
  copyright?: string
}

export interface Track {
  title: Multilanguage
  artists: string[]
  duration: number
  desc?: Multilanguage
  copyright?: string
}

export interface Disc {
  title: Multilanguage
  desc?: Multilanguage
  tracks: Track[]
}

export interface AlbumBook extends BookBase {
  type: 'album'
  album: {
    covers?: AssetPath[]
    links?: NormalizedPlatformEntry[]
    discs?: Disc[]
  }
}

export interface GiftItem {
  id: string
  title: Multilanguage
  desc?: Multilanguage
  covers?: AssetPath[]
  links?: NormalizedPlatformEntry[]
  copyright?: string
}

export interface GiftBook extends BookBase {
  type: 'gift'
  gift: {
    items: GiftItem[]
  }
}

export type Book = AlbumBook | GiftBook
```

```ts
// tests/compiler/book-album.test.ts
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseBook } from '../../src/compiler/book'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import type { ContentDefinitions } from '../../src/shared/types'

const defs: ContentDefinitions = {
  tags: {},
  platforms: {
    bilibili: {
      category: 'digital',
      type: 'bilibili_player',
      name: 'Bilibili',
    },
    taobao: {
      category: 'physical',
      type: 'link',
      name: { zh: '淘宝', en: 'Taobao' },
    },
  },
}

function writeBook(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'synctrol-book-'))
  const path = join(dir, 'book.yml')
  writeFileSync(path, body, 'utf8')
  return path
}

describe('parseBook album', () => {
  it('parses a valid AlbumBook', () => {
    const path = writeBook(`
type: album
title:
  zh: 第一张专辑
  en: First Album
desc: SYNCTROL First Release
authors:
  - Synctrol
copyright: © 2026 Synctrol
album:
  covers:
    - ./assets/front.webp
  links:
    - platform: bilibili
      bvid: BV1xxxxxxxxx
      page: 1
      autoplay: false
  discs:
    - title:
        zh: 第一碟
        en: Disc One
      tracks:
        - title:
            zh: 第一曲
            en: Track One
          artists:
            - Synctrol
          duration: 272
`)
    const book = parseBook(path, defs, 'zh')
    expect(book.type).toBe('album')
    if (book.type === 'album') {
      expect(book.album.links?.[0]).toMatchObject({ platform: 'bilibili' })
      expect(book.album.discs?.[0].tracks[0].duration).toBe(272)
    }
  })

  it('forbids gift branch on album and requires album branch', () => {
    const path = writeBook(`
type: album
title: X
gift:
  items: []
`)
    try {
      parseBook(path, defs, 'zh')
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_BOOK_BRANCH')
      }
    }
  })

  it('rejects physical platforms in album.links', () => {
    const path = writeBook(`
type: album
title: X
album:
  links:
    - platform: taobao
      url: https://item.taobao.com/example
`)
    expect(() => parseBook(path, defs, 'zh')).toThrow()
  })

  it('rejects unknown fields and negative durations', () => {
    const unknown = writeBook(`
type: album
title: X
album: {}
extra: true
`)
    expect(() => parseBook(unknown, defs, 'zh')).toThrow()

    const duration = writeBook(`
type: album
title: X
album:
  discs:
    - title: Disc
      tracks:
        - title: T
          artists: [A]
          duration: -1
`)
    expect(() => parseBook(duration, defs, 'zh')).toThrow()
  })

  it('rejects non-album Book type values until Gift lands in Task 9', () => {
    const path = writeBook(`
type: gift
title: X
gift:
  items: []
`)
    try {
      parseBook(path, defs, 'zh')
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_BOOK_BRANCH')
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/book-album.test.ts`

Expected: FAIL with module not found for `../../src/compiler/book`

- [ ] **Step 3: Write Album implementation**

In Task 8, `parseBook` accepts only `type: 'album'`. Any other `type` value (including `gift`) fails with `INVALID_BOOK_BRANCH`. Task 9 adds the Gift dispatcher without changing Album behavior.

```ts
// src/compiler/book.ts
import type {
  AlbumBook,
  Book,
  ContentDefinitions,
  Disc,
  LocaleKey,
  Track,
} from '../shared/types'
import { fail } from './diagnostics'
import { assertMultilanguage } from './multilanguage'
import { validatePlatformEntry } from './platform-entry'
import { loadYamlFile } from './yaml'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseAuthors(value: unknown, path: string): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'authors must be a string array',
      path,
    })
  }
  return value as string[]
}

function parseCovers(value: unknown, path: string): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'covers must be an array of asset path strings',
      path,
    })
  }
  return value as string[]
}

function parseTrack(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
): Track {
  if (!isPlainObject(value)) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'track must be a mapping',
      path,
    })
  }
  for (const key of Object.keys(value)) {
    if (!['title', 'artists', 'duration', 'desc', 'copyright'].includes(key)) {
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown track field "${key}"`,
        path,
      })
    }
  }
  if (
    !Array.isArray(value.artists) ||
    value.artists.length === 0 ||
    value.artists.some((a) => typeof a !== 'string')
  ) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'track.artists must be a non-empty string array',
      path,
    })
  }
  if (
    typeof value.duration !== 'number' ||
    !Number.isInteger(value.duration) ||
    value.duration < 0
  ) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'track.duration must be a non-negative integer seconds',
      path,
    })
  }
  if (value.copyright !== undefined && typeof value.copyright !== 'string') {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'track.copyright must be a string',
      path,
    })
  }
  return {
    title: assertMultilanguage(value.title, mainLocale, path, 'title'),
    artists: value.artists as string[],
    duration: value.duration,
    ...(value.desc !== undefined
      ? { desc: assertMultilanguage(value.desc, mainLocale, path, 'desc') }
      : {}),
    ...(value.copyright !== undefined
      ? { copyright: value.copyright as string }
      : {}),
  }
}

function parseDisc(
  value: unknown,
  mainLocale: LocaleKey,
  path: string,
): Disc {
  if (!isPlainObject(value)) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'disc must be a mapping',
      path,
    })
  }
  for (const key of Object.keys(value)) {
    if (!['title', 'desc', 'tracks'].includes(key)) {
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown disc field "${key}"`,
        path,
      })
    }
  }
  if (!Array.isArray(value.tracks)) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'disc.tracks is required and may be empty',
      path,
    })
  }
  return {
    title: assertMultilanguage(value.title, mainLocale, path, 'title'),
    ...(value.desc !== undefined
      ? { desc: assertMultilanguage(value.desc, mainLocale, path, 'desc') }
      : {}),
    tracks: value.tracks.map((track) => parseTrack(track, mainLocale, path)),
  }
}

export function parseAlbumBook(
  raw: Record<string, unknown>,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
): AlbumBook {
  if ('gift' in raw) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK_BRANCH',
      message: 'album book forbids the gift branch',
      path,
    })
  }
  if (!isPlainObject(raw.album)) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK_BRANCH',
      message: 'album book requires the album branch',
      path,
    })
  }

  for (const key of Object.keys(raw)) {
    if (
      !['type', 'title', 'desc', 'authors', 'copyright', 'album'].includes(key)
    ) {
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown field "${key}" in book.yml`,
        path,
      })
    }
  }

  for (const key of Object.keys(raw.album)) {
    if (!['covers', 'links', 'discs'].includes(key)) {
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown album field "${key}"`,
        path,
      })
    }
  }

  if (raw.copyright !== undefined && typeof raw.copyright !== 'string') {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'copyright must be a string',
      path,
    })
  }

  const links =
    raw.album.links === undefined
      ? undefined
      : (() => {
          if (!Array.isArray(raw.album.links)) {
            fail({
              severity: 'error',
              code: 'INVALID_BOOK',
              message: 'album.links must be an array',
              path,
            })
          }
          return raw.album.links.map((entry) =>
            validatePlatformEntry(entry, defs, mainLocale, path, 'digital'),
          )
        })()

  const discs =
    raw.album.discs === undefined
      ? undefined
      : (() => {
          if (!Array.isArray(raw.album.discs)) {
            fail({
              severity: 'error',
              code: 'INVALID_BOOK',
              message: 'album.discs must be an array',
              path,
            })
          }
          return raw.album.discs.map((disc) =>
            parseDisc(disc, mainLocale, path),
          )
        })()

  return {
    type: 'album',
    title: assertMultilanguage(raw.title, mainLocale, path, 'title'),
    ...(raw.desc !== undefined
      ? { desc: assertMultilanguage(raw.desc, mainLocale, path, 'desc') }
      : {}),
    authors: parseAuthors(raw.authors, path),
    ...(raw.copyright !== undefined
      ? { copyright: raw.copyright as string }
      : {}),
    album: {
      covers: parseCovers(raw.album.covers, path),
      links,
      discs,
    },
  }
}

export function parseBook(
  bookYmlPath: string,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
): Book {
  const rawValue = loadYamlFile(bookYmlPath)
  if (!isPlainObject(rawValue)) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'book.yml must be a mapping',
      path: bookYmlPath,
    })
  }

  if (rawValue.type === 'album') {
    return parseAlbumBook(rawValue, defs, mainLocale, bookYmlPath)
  }

  fail({
    severity: 'error',
    code: 'INVALID_BOOK_BRANCH',
    message: `Invalid Book type "${String(rawValue.type)}"`,
    path: bookYmlPath,
  })
}
```


- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/book-album.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/book.ts src/shared/types.ts tests/compiler/book-album.test.ts
git commit -m "feat(compiler): validate AlbumBook YAML schemas"
```

---

### Task 9: Gift Book validation

**Files:**
- Modify: `src/compiler/book.ts`
- Test: `tests/compiler/book-gift.test.ts`

**Interfaces:**
- Consumes: same as Task 8
- Produces: complete `parseBook()` supporting `GiftBook`; `Book = AlbumBook | GiftBook`

- [ ] **Step 1: Write failing Gift tests**

```ts
// tests/compiler/book-gift.test.ts
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseBook } from '../../src/compiler/book'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import type { ContentDefinitions } from '../../src/shared/types'

const defs: ContentDefinitions = {
  tags: {},
  platforms: {
    bilibili: {
      category: 'digital',
      type: 'bilibili_player',
      name: 'Bilibili',
    },
    taobao: {
      category: 'physical',
      type: 'link',
      name: { zh: '淘宝', en: 'Taobao' },
    },
  },
}

function writeBook(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'synctrol-gift-'))
  const path = join(dir, 'book.yml')
  writeFileSync(path, body, 'utf8')
  return path
}

describe('parseBook gift', () => {
  it('parses a valid GiftBook with unique item ids', () => {
    const path = writeBook(`
type: gift
title:
  zh: 周边系列
  en: Merchandise
desc:
  zh: 周边介绍
  en: Merchandise description
gift:
  items:
    - id: poster
      title:
        zh: 纪念海报
        en: Commemorative Poster
      desc: Limited Edition
      covers:
        - ./assets/poster-front.webp
      links:
        - platform: taobao
          url: https://item.taobao.com/example
      copyright: © 2026 Synctrol
`)
    const book = parseBook(path, defs, 'zh')
    expect(book.type).toBe('gift')
    if (book.type === 'gift') {
      expect(book.gift.items).toHaveLength(1)
      expect(book.gift.items[0].id).toBe('poster')
      expect(book.gift.items[0].links?.[0]).toMatchObject({ platform: 'taobao' })
    }
  })

  it('allows empty gift.items and forbids album branch', () => {
    const ok = writeBook(`
type: gift
title: Gifts
gift:
  items: []
`)
    expect(parseBook(ok, defs, 'zh')).toMatchObject({
      type: 'gift',
      gift: { items: [] },
    })

    const bad = writeBook(`
type: gift
title: Gifts
album: {}
gift:
  items: []
`)
    try {
      parseBook(bad, defs, 'zh')
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_BOOK_BRANCH')
      }
    }
  })

  it('rejects duplicate item ids and digital platforms on gift links', () => {
    const dup = writeBook(`
type: gift
title: Gifts
gift:
  items:
    - id: poster
      title: A
    - id: poster
      title: B
`)
    expect(() => parseBook(dup, defs, 'zh')).toThrow()

    const digital = writeBook(`
type: gift
title: Gifts
gift:
  items:
    - id: poster
      title: A
      links:
        - platform: bilibili
          bvid: BV1xxxxxxxxx
`)
    expect(() => parseBook(digital, defs, 'zh')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/book-gift.test.ts`

Expected: FAIL with `INVALID_BOOK_BRANCH` for `type: gift` (Task 8 only dispatched `album`)

- [ ] **Step 3: Implement Gift branch in `parseBook`**

Add the following helpers to `src/compiler/book.ts` and extend the `parseBook` dispatcher:

```ts
import type {
  AlbumBook,
  Book,
  ContentDefinitions,
  Disc,
  GiftBook,
  GiftItem,
  LocaleKey,
  Track,
} from '../shared/types'

function parseGiftItem(
  value: unknown,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
): GiftItem {
  if (!isPlainObject(value)) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'gift item must be a mapping',
      path,
    })
  }
  for (const key of Object.keys(value)) {
    if (
      !['id', 'title', 'desc', 'covers', 'links', 'copyright'].includes(key)
    ) {
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown gift item field "${key}"`,
        path,
      })
    }
  }
  if (typeof value.id !== 'string' || value.id.length === 0) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'gift item id is required',
      path,
    })
  }
  if (value.copyright !== undefined && typeof value.copyright !== 'string') {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'gift item copyright must be a string',
      path,
    })
  }
  const links =
    value.links === undefined
      ? undefined
      : (() => {
          if (!Array.isArray(value.links)) {
            fail({
              severity: 'error',
              code: 'INVALID_BOOK',
              message: 'gift item links must be an array',
              path,
            })
          }
          return value.links.map((entry) =>
            validatePlatformEntry(entry, defs, mainLocale, path, 'physical'),
          )
        })()

  return {
    id: value.id,
    title: assertMultilanguage(value.title, mainLocale, path, 'title'),
    ...(value.desc !== undefined
      ? { desc: assertMultilanguage(value.desc, mainLocale, path, 'desc') }
      : {}),
    covers: parseCovers(value.covers, path),
    links,
    ...(value.copyright !== undefined
      ? { copyright: value.copyright as string }
      : {}),
  }
}

function parseGiftBook(
  raw: Record<string, unknown>,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
): GiftBook {
  if ('album' in raw) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK_BRANCH',
      message: 'gift book forbids the album branch',
      path,
    })
  }
  if (!isPlainObject(raw.gift)) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK_BRANCH',
      message: 'gift book requires the gift branch',
      path,
    })
  }
  for (const key of Object.keys(raw)) {
    if (
      !['type', 'title', 'desc', 'authors', 'copyright', 'gift'].includes(key)
    ) {
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown field "${key}" in book.yml`,
        path,
      })
    }
  }
  for (const key of Object.keys(raw.gift)) {
    if (key !== 'items') {
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown gift field "${key}"`,
        path,
      })
    }
  }
  if (!Array.isArray(raw.gift.items)) {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'gift.items is required and may be empty',
      path,
    })
  }
  if (raw.copyright !== undefined && typeof raw.copyright !== 'string') {
    fail({
      severity: 'error',
      code: 'INVALID_BOOK',
      message: 'copyright must be a string',
      path,
    })
  }

  const items = raw.gift.items.map((item) =>
    parseGiftItem(item, defs, mainLocale, path),
  )
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) {
      fail({
        severity: 'error',
        code: 'DUPLICATE_GIFT_ITEM_ID',
        message: `Duplicate gift item id "${item.id}"`,
        path,
      })
    }
    seen.add(item.id)
  }

  return {
    type: 'gift',
    title: assertMultilanguage(raw.title, mainLocale, path, 'title'),
    ...(raw.desc !== undefined
      ? { desc: assertMultilanguage(raw.desc, mainLocale, path, 'desc') }
      : {}),
    authors: parseAuthors(raw.authors, path),
    ...(raw.copyright !== undefined
      ? { copyright: raw.copyright as string }
      : {}),
    gift: { items },
  }
}
```

And change the `parseBook` type switch to:

```ts
  if (rawValue.type === 'album') {
    return parseAlbumBook(rawValue, defs, mainLocale, bookYmlPath)
  }
  if (rawValue.type === 'gift') {
    return parseGiftBook(rawValue, defs, mainLocale, bookYmlPath)
  }
  fail({
    severity: 'error',
    code: 'INVALID_BOOK_BRANCH',
    message: `Invalid Book type "${String(rawValue.type)}"`,
    path: bookYmlPath,
  })
```

Also delete the temporary Album-suite case named `rejects non-album Book type values until Gift lands in Task 9` from `tests/compiler/book-album.test.ts` so Gift packages are no longer expected to fail there.

- [ ] **Step 4: Run Album and Gift tests**

Run: `npm test -- tests/compiler/book-album.test.ts tests/compiler/book-gift.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/book.ts tests/compiler/book-gift.test.ts
git commit -m "feat(compiler): validate GiftBook YAML schemas"
```

---

### Task 10: Compile orchestration, identity checks, diagnostics export

**Files:**
- Create: `src/compiler/compile-content.ts`
- Create: `src/compiler/index.ts`
- Modify: `src/shared/types.ts` (add `CompiledContentPackage`, `CompileContentResult`)
- Modify: `src/index.ts` (re-export compiler public API only — no shell/UI)
- Test: `tests/compiler/compile-content.test.ts`
- Create fixtures under `tests/fixtures/compiler/compile/`

**Interfaces:**
- Consumes: discovery, definitions, manifest, book, diagnostics
- Produces:
  - `compileContent(options: CompileContentOptions): CompileContentResult`
  - `{type}:{slug}` identity uniqueness within the same `ContentType`
  - exactly one `home` package
  - `book.yml` only allowed when manifest `type === 'release'`
  - news tags must exist in definitions
  - unused definitions allowed

```ts
export interface CompileContentOptions {
  contentRoot: string
  sourceDir: string
  configDir: string
  mainLocale: LocaleKey
  definitionsPath?: string
}

export interface CompiledContentPackage {
  dir: string
  identity: string // `${type}:${slug}` except home uses `home`
  manifest: ContentManifest
  book?: Book
}

export interface CompileContentResult {
  definitions: ContentDefinitions
  packages: CompiledContentPackage[]
  warnings: SynctrolDiagnostic[]
}
```

- [ ] **Step 1: Build fixtures and failing tests**

Fixture tree `tests/fixtures/compiler/compile/ok/`:

```text
content/
  definitions.yml   # copy from Task 6 fixture (include release tag + platforms)
  home/
    content.yml     # type: home
  releases/
    first-release/
      content.yml   # type: release, date: 2026-08-11
      book.yml      # type: album, title: SYNCTROL, album: {}
  news/
    hello/
      content.yml   # type: news, date: 2026-08-11, tags: [release]
```

Also prepare negative fixtures or temp dirs in-test for: duplicate release slugs; `book.yml` on a page; unknown news tag; two home packages.

```ts
// tests/compiler/compile-content.test.ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compileContent } from '../../src/compiler/compile-content'
import { isDiagnosticError } from '../../src/compiler/diagnostics'

const okRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/compiler/compile/ok',
)

describe('compileContent', () => {
  it('compiles packages with definitions, manifests, and release books', () => {
    const result = compileContent({
      contentRoot: join(okRoot, 'content'),
      sourceDir: okRoot,
      configDir: join(okRoot, '.vuepress'),
      mainLocale: 'zh',
    })
    expect(result.definitions.platforms.bilibili.type).toBe('bilibili_player')
    expect(result.packages.map((p) => p.identity).sort()).toEqual(
      ['home', 'news:hello', 'release:first-release'].sort(),
    )
    const release = result.packages.find((p) => p.identity === 'release:first-release')
    expect(release?.book?.type).toBe('album')
  })

  it('defaults definitionsPath to <sourceDir>/content/definitions.yml', () => {
    const result = compileContent({
      contentRoot: join(okRoot, 'content'),
      sourceDir: okRoot,
      configDir: join(okRoot, '.vuepress'),
      mainLocale: 'zh',
    })
    expect(result.definitions.tags.release).toBeTruthy()
  })

  it('rejects duplicate same-type slugs', () => {
    const site = mkdtempSync(join(tmpdir(), 'synctrol-dup-'))
    const content = join(site, 'content')
    mkdirSync(join(content, 'a'), { recursive: true })
    mkdirSync(join(content, 'b'), { recursive: true })
    writeFileSync(join(site, 'content/definitions.yml'), 'tags: {}\nplatforms: {}\n')
    writeFileSync(join(content, 'a/content.yml'), 'type: page\nslug: same\n')
    writeFileSync(join(content, 'b/content.yml'), 'type: page\nslug: same\n')
    try {
      compileContent({
        contentRoot: content,
        sourceDir: site,
        configDir: join(site, '.vuepress'),
        mainLocale: 'zh',
      })
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('DUPLICATE_SLUG')
      }
    }
  })

  it('allows the same slug across different ContentType values', () => {
    const site = mkdtempSync(join(tmpdir(), 'synctrol-cross-'))
    const content = join(site, 'content')
    mkdirSync(join(content, 'page-pkg'), { recursive: true })
    mkdirSync(join(content, 'news-pkg'), { recursive: true })
    writeFileSync(
      join(site, 'content/definitions.yml'),
      'tags:\n  release:\n    title: Releases\nplatforms: {}\n',
    )
    writeFileSync(join(content, 'page-pkg/content.yml'), 'type: page\nslug: shared\n')
    writeFileSync(
      join(content, 'news-pkg/content.yml'),
      'type: news\nslug: shared\ndate: 2026-08-11\ntags: [release]\n',
    )
    const result = compileContent({
      contentRoot: content,
      sourceDir: site,
      configDir: join(site, '.vuepress'),
      mainLocale: 'zh',
    })
    expect(result.packages.map((p) => p.identity).sort()).toEqual(
      ['news:shared', 'page:shared'].sort(),
    )
  })

  it('errors when book.yml appears on a non-release package', () => {
    const site = mkdtempSync(join(tmpdir(), 'synctrol-book-page-'))
    const content = join(site, 'content')
    const dir = join(content, 'about')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(site, 'content/definitions.yml'), 'tags: {}\nplatforms: {}\n')
    writeFileSync(join(dir, 'content.yml'), 'type: page\n')
    writeFileSync(join(dir, 'book.yml'), 'type: album\ntitle: X\nalbum: {}\n')
    try {
      compileContent({
        contentRoot: content,
        sourceDir: site,
        configDir: join(site, '.vuepress'),
        mainLocale: 'zh',
      })
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('BOOK_NOT_ALLOWED')
      }
    }
  })

  it('errors on unknown news tags and on missing/duplicate home', () => {
    const site = mkdtempSync(join(tmpdir(), 'synctrol-tag-'))
    const content = join(site, 'content')
    mkdirSync(join(content, 'n'), { recursive: true })
    writeFileSync(join(site, 'content/definitions.yml'), 'tags: {}\nplatforms: {}\n')
    writeFileSync(
      join(content, 'n/content.yml'),
      'type: news\ndate: 2026-08-11\ntags: [missing]\n',
    )
    try {
      compileContent({
        contentRoot: content,
        sourceDir: site,
        configDir: join(site, '.vuepress'),
        mainLocale: 'zh',
      })
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('UNKNOWN_TAG')
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/compile-content.test.ts`

Expected: FAIL with module not found for `../../src/compiler/compile-content`

- [ ] **Step 3: Implement compile orchestration and public exports**

```ts
// src/compiler/compile-content.ts
import type {
  Book,
  CompiledContentPackage,
  ContentDefinitions,
  ContentManifest,
  LocaleKey,
} from '../shared/types'
import { parseBook } from './book'
import { fail, type SynctrolDiagnostic } from './diagnostics'
import {
  loadContentDefinitions,
  resolveDefinitionsPath,
} from './definitions'
import { discoverContentPackages } from './discovery'
import { parseContentManifest } from './manifest'

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

function identityFor(manifest: ContentManifest): string {
  if (manifest.type === 'home') {
    return 'home'
  }
  return `${manifest.type}:${manifest.slug}`
}

export function compileContent(
  options: CompileContentOptions,
): CompileContentResult {
  const warnings: SynctrolDiagnostic[] = []
  const definitionsFile = resolveDefinitionsPath(
    options.sourceDir,
    options.configDir,
    options.definitionsPath,
  )
  const definitions = loadContentDefinitions(
    definitionsFile,
    options.mainLocale,
  )

  const discovered = discoverContentPackages(options.contentRoot)
  const packages: CompiledContentPackage[] = []
  const seen = new Map<string, string>()
  let homeCount = 0

  for (const item of discovered) {
    const manifest = parseContentManifest(item.contentYmlPath, item.dir)

    if (manifest.type === 'home') {
      homeCount += 1
    }

    if (manifest.type === 'news') {
      for (const tag of manifest.tags) {
        if (!(tag in definitions.tags)) {
          fail({
            severity: 'error',
            code: 'UNKNOWN_TAG',
            message: `Referencing undeclared tag "${tag}"`,
            path: item.contentYmlPath,
          })
        }
      }
    }

    if (item.bookYmlPath && manifest.type !== 'release') {
      fail({
        severity: 'error',
        code: 'BOOK_NOT_ALLOWED',
        message: 'book.yml is allowed only in a release package',
        path: item.bookYmlPath,
        relatedPath: item.contentYmlPath,
      })
    }

    let book: Book | undefined
    if (item.bookYmlPath) {
      book = parseBook(item.bookYmlPath, definitions, options.mainLocale)
    }

    const identity = identityFor(manifest)
    const previous = seen.get(identity)
    if (previous) {
      fail({
        severity: 'error',
        code: 'DUPLICATE_SLUG',
        message: `Duplicate content identity "${identity}"`,
        path: item.dir,
        relatedPath: previous,
      })
    }
    seen.set(identity, item.dir)

    packages.push({
      dir: item.dir,
      identity,
      manifest,
      book,
    })
  }

  if (homeCount > 1) {
    fail({
      severity: 'error',
      code: 'DUPLICATE_HOME',
      message: 'Exactly one home package is required; found multiple',
      path: options.contentRoot,
    })
  }

  // Missing home is allowed at compile-content layer; Plan 03 locale publishing
  // enforces the Home publishing matrix. Emit no warning here.

  return { definitions, packages, warnings }
}
```


```ts
// src/compiler/index.ts
export {
  createDiagnostic,
  fail,
  isDiagnosticError,
  SynctrolDiagnosticError,
  type DiagnosticSeverity,
  type SynctrolDiagnostic,
} from './diagnostics'
export { discoverContentPackages } from './discovery'
export {
  loadContentDefinitions,
  resolveDefinitionsPath,
} from './definitions'
export { parseContentManifest } from './manifest'
export { parseBook } from './book'
export { validatePlatformEntry } from './platform-entry'
export {
  compileContent,
  type CompileContentOptions,
  type CompileContentResult,
} from './compile-content'
```

Append to `src/shared/types.ts`:

```ts
export interface CompiledContentPackage {
  dir: string
  identity: string
  manifest: ContentManifest
  book?: Book
}
```

In `src/index.ts`, add:

```ts
export * from './compiler/index'
```

without removing Plan 01 theme exports.

- [ ] **Step 4: Run compile tests and the full compiler suite**

Run: `npm test -- tests/compiler`

Expected: PASS for all compiler tests added in Tasks 1–10

- [ ] **Step 5: Commit**

```bash
git add src/compiler/compile-content.ts src/compiler/index.ts src/index.ts src/shared/types.ts tests/compiler/compile-content.test.ts tests/fixtures/compiler/compile
git commit -m "feat(compiler): orchestrate content discovery, definitions, and Book validation"
```

---

## Self-Review

**Spec coverage (Content Compiler slice only):**
- §5 discovery / nesting / `book.yml` only on release / `definitionsPath` → Tasks 4, 6, 10
- §6 manifest fields, illegal `background`, dates, slug identity → Tasks 5, 10
- §7.2 Multilanguage map/`mainLocale` → Task 3 (used by definitions + Book)
- §10 definitions tags/platforms → Task 6
- §11 built-in entry constraints + digital/physical locations → Tasks 7–9
- §24 Album/Gift Books → Tasks 8–9
- §31 relevant build errors → diagnostics codes in Tasks 1–10

**Deferred intentionally to later plans:** locale routes, draft/fallback matrices, assets existence/hashing, shell/UI, platform renderers/CSP, SEO/feeds.

**Placeholder scan:** no TBD/TODO remaining in executable steps.

**Type consistency:** `ContentType`, `Multilanguage`, `ReleaseOptions` (Plan 01), `definitionsPath`, `AlbumBook`/`GiftBook`/`Book`, `PlatformEntryBase`, and identity `{type}:{slug}` match the spec naming.
