# Asset Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Synctrol theme asset pipeline that hashes content, global, and theme assets into locale-free public URLs, resolves Markdown and config-relative references, rejects unsafe relative HTML attributes, and exposes `resolveContentAsset` for Vue components.

**Architecture:** Pure Node modules under `src/node/assets/` take Plan 02 packages (manifest/book paths + locale Markdown) plus theme options and VuePress `base`/`siteUrl`/`configDir`, then emit a deterministic `AssetManifest` of content-hashed files. Content assets land at `/assets/content/{type}/{slug}/…` (Home omits slug). Config-relative social/SEO/placeholder icons and `.vuepress/assets` files land at `/assets/global/…`. Theme static files land at `/assets/theme/…`; Background module resource imports remain bundler-owned theme assets. A small client helper reads the per-package public-path map injected into page data. Plans 05+ consume the manifest; this plan does not build UI.

**Tech Stack:** TypeScript 5.x, Node `fs`/`path`/`crypto`, Vitest, package `vuepress-theme-synctrolling` from Plan 01; diagnostics from Plan 02 (`SynctrolDiagnosticError`); URL `base`/`siteUrl` conventions from Plan 03.

## Global Constraints

- Package name is `vuepress-theme-synctrolling`.
- Content types are only `home | release | news | page`.
- Asset URLs have no locale prefix.
- Normal assets always use content hashes; there is no stable-URL option.
- Nested asset paths are retained under their pipeline root.
- Paths cannot escape their owning package (content) or `configDir`/`themeAssetsRoot` (global/theme).
- Missing files and case mismatches fail the build.
- VuePress `base` is applied to emitted public URLs.
- Absolute asset URLs use required `siteUrl` plus their public URL; `siteUrl` has no trailing slash.
- Markdown `![…](./assets/…)` and download links resolve relative to the locale Markdown file and enter the package asset pipeline.
- Raw HTML relative asset attributes are rejected.
- Social icons, `release.artworkPlaceholder`, `seo.defaultImage`, and `seo.organization.logo` resolve relative to the VuePress configuration file and enter the global hashed pipeline.
- Background TypeScript modules import resources with normal TypeScript imports; the VuePress bundler hashes those as theme assets (not copied by this compiler).
- `.vuepress/public` is reserved for fixed-name files such as `CNAME` and `robots.txt` and is never hashed by this pipeline.
- Plans 01–03 are assumed complete: shared types, options, Vitest, content compiler, diagnostics, four-layer URL conventions.
- Tests run with `npm test -- <path>`.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/shared/types/assets.ts` | `ResolvedAsset`, `AssetKind`, `AssetManifest`, compile input types |
| `src/node/assets/hash.ts` | Content hash from file bytes |
| `src/node/assets/emit-url.ts` | Public path + absolute URL with VuePress `base` and `siteUrl` |
| `src/node/assets/safe-path.ts` | Resolve relative refs inside a root; reject escapes; case-sensitive existence |
| `src/node/assets/content-path.ts` | Build `/assets/content/{type}/[slug/]…name.[hash].ext` |
| `src/node/assets/collect-package-refs.ts` | Gather cover/artwork/book covers/`audio_player.src` refs |
| `src/node/assets/markdown-assets.ts` | Extract Markdown image/download refs; reject raw HTML relative attrs |
| `src/node/assets/global-pipeline.ts` | Config-relative global refs → `/assets/global/…` |
| `src/node/assets/theme-pipeline.ts` | Explicit theme static files → `/assets/theme/…` |
| `src/node/assets/registry.ts` | In-memory source→`ResolvedAsset` map + lookup helpers |
| `src/node/assets/compile-assets.ts` | Orchestrate collect → resolve → hash → write → manifest |
| `src/node/assets/index.ts` | Public Node asset exports |
| `src/client/assets/resolve-content-asset.ts` | Client `resolveContentAsset('./assets/x')` against injected map |
| `src/client/assets/index.ts` | Client asset exports |
| `tests/node/assets/*.test.ts` | Unit tests for each Node module |
| `tests/client/assets/*.test.ts` | Client helper tests |
| `tests/helpers/asset-fixtures.ts` | Theme options + package builders for this plan |
| `tests/fixtures/assets/**` | On-disk binary/text fixtures for hash/write/integration tests |

**Prerequisite types from Plans 01–03 (do not redefine; import):**

```ts
// Plan 01
export type ContentType = 'home' | 'release' | 'news' | 'page'
export type LocaleKey = string
export type AssetPath = string

export interface SocialLink {
  label: Multilanguage
  icon: string
  url: string
}

export interface SocialLinksOptions {
  items: SocialLink[]
}

export interface ReleaseOptions {
  urlSegment: string
  index: {
    enabled: boolean
    pagination: number | false
    mobileGridColumns: number
    desktopGridColumns: number
  }
  artworkPlaceholder?: string
}

export interface SeoOptions {
  name: Multilanguage
  description: Multilanguage
  defaultImage: string
  organization: {
    name: string
    logo: string
  }
  collections: {
    release: SeoCollectionCopy
    news: SeoCollectionCopy
  }
}

export interface SynctrolThemeOptions {
  siteUrl: string
  release?: ReleaseOptions
  socialLinks?: SocialLinksOptions
  seo: SeoOptions
  // remaining fields unused by this plan
}

// Plan 02
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
}

export function fail(diagnostic: SynctrolDiagnostic): never
export function isDiagnosticError(error: unknown): error is SynctrolDiagnosticError

export interface ContentManifest {
  type: ContentType
  slug?: string
  date?: string
  draft: boolean
  cover?: string
  artwork?: string
  path?: LocalePath
  updated?: string
  tags?: string[]
}

export interface AlbumBook {
  type: 'album'
  title: Multilanguage
  album: {
    covers?: AssetPath[]
    links?: PlatformEntry[]
    discs?: Disc[]
  }
}

export interface GiftBook {
  type: 'gift'
  title: Multilanguage
  gift: { items: GiftItem[] }
}

export type Book = AlbumBook | GiftBook

export interface CompiledContentPackage {
  dir: string
  identity: string
  manifest: ContentManifest
  book?: Book
}

// Plan 03 locale markdown shape used for Markdown asset scanning
export interface LocaleMarkdown {
  filePath: string
  title: string
  description?: string
  draft: boolean
  body: string
}
```

**Out of scope:** UI shell, Background runtime lifecycle, platform embed renderers, SEO meta tags/RSS/Sitemap emission, Release/News visual layouts, writing into `.vuepress/public`.

---

### Task 1: Asset types, content hashing, and public/absolute URL builders

**Files:**
- Create: `src/shared/types/assets.ts`
- Create: `src/node/assets/hash.ts`
- Create: `src/node/assets/emit-url.ts`
- Create: `tests/node/assets/hash.test.ts`
- Create: `tests/node/assets/emit-url.test.ts`
- Create: `tests/helpers/asset-fixtures.ts`

**Interfaces:**
- Consumes: Plan 03 `siteUrl` / VuePress `base` conventions
- Produces: `AssetKind`, `ResolvedAsset`, `AssetManifest`, `hashFileContents(buffer: Buffer): string`, `insertContentHash(filename: string, hash: string): string`, `buildAssetPublicPath(assetPath: string, base: string): string`, `buildAssetAbsoluteUrl(publicPath: string, siteUrl: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/assets/hash.test.ts
import { describe, expect, it } from 'vitest'
import { hashFileContents, insertContentHash } from '../../../src/node/assets/hash'

describe('hashFileContents', () => {
  it('returns a stable 8-character lowercase hex digest for the same bytes', () => {
    const a = hashFileContents(Buffer.from('synctrol-cover'))
    const b = hashFileContents(Buffer.from('synctrol-cover'))
    expect(a).toMatch(/^[0-9a-f]{8}$/)
    expect(a).toBe(b)
  })

  it('changes when file contents change', () => {
    const a = hashFileContents(Buffer.from('cover-a'))
    const b = hashFileContents(Buffer.from('cover-b'))
    expect(a).not.toBe(b)
  })
})

describe('insertContentHash', () => {
  it('inserts the hash before the final extension', () => {
    expect(insertContentHash('cover.webp', 'abcd1234')).toBe('cover.abcd1234.webp')
    expect(insertContentHash('logo.svg', 'deadbeef')).toBe('logo.deadbeef.svg')
  })

  it('retains nested relative directories', () => {
    expect(insertContentHash('covers/front.webp', 'abcd1234')).toBe(
      'covers/front.abcd1234.webp',
    )
  })

  it('handles multi-dot basenames by hashing only before the final extension', () => {
    expect(insertContentHash('archive.tar.gz', 'abcd1234')).toBe(
      'archive.tar.abcd1234.gz',
    )
  })
})
```

```ts
// tests/node/assets/emit-url.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildAssetAbsoluteUrl,
  buildAssetPublicPath,
} from '../../../src/node/assets/emit-url'

describe('buildAssetPublicPath', () => {
  it('applies root VuePress base', () => {
    expect(
      buildAssetPublicPath('/assets/content/release/first/cover.abcd1234.webp', '/'),
    ).toBe('/assets/content/release/first/cover.abcd1234.webp')
  })

  it('applies a non-root VuePress base', () => {
    expect(
      buildAssetPublicPath(
        '/assets/content/home/logo.abcd1234.svg',
        '/docs/',
      ),
    ).toBe('/docs/assets/content/home/logo.abcd1234.svg')
  })

  it('never inserts a locale segment', () => {
    const publicPath = buildAssetPublicPath(
      '/assets/global/social-default.abcd1234.webp',
      '/site/',
    )
    expect(publicPath).toBe('/site/assets/global/social-default.abcd1234.webp')
    expect(publicPath).not.toMatch(/\/zh\//)
    expect(publicPath).not.toMatch(/\/en\//)
  })
})

describe('buildAssetAbsoluteUrl', () => {
  it('joins siteUrl origin with the public path', () => {
    expect(
      buildAssetAbsoluteUrl(
        '/assets/theme/grid.abcd1234.svg',
        'https://synctrol.com',
      ),
    ).toBe('https://synctrol.com/assets/theme/grid.abcd1234.svg')
  })

  it('keeps a non-root base inside the absolute URL', () => {
    expect(
      buildAssetAbsoluteUrl(
        '/docs/assets/global/logo.abcd1234.svg',
        'https://example.com',
      ),
    ).toBe('https://example.com/docs/assets/global/logo.abcd1234.svg')
  })
})
```

```ts
// tests/helpers/asset-fixtures.ts
import type { ContentType, SynctrolThemeOptions } from '../../src/shared/types'
import type { AssetPackageSource } from '../../src/shared/types/assets'

export function themeOptions(
  overrides: Partial<SynctrolThemeOptions> = {},
): SynctrolThemeOptions {
  return {
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    locales: {
      zh: {
        lang: 'zh-CN',
        label: '中文',
        messages: {} as SynctrolThemeOptions['locales'][string]['messages'],
      },
      en: {
        lang: 'en-US',
        label: 'English',
        messages: {} as SynctrolThemeOptions['locales'][string]['messages'],
      },
    },
    copyright: '© Synctrol',
    seo: {
      name: { zh: 'Synctrol', en: 'Synctrol' },
      description: {
        zh: 'Synctrol 音乐团队官方网站',
        en: 'Official website of the Synctrol music team',
      },
      defaultImage: './assets/social-default.webp',
      organization: {
        name: 'Synctrol',
        logo: './assets/logo.svg',
      },
      collections: {
        release: {
          title: { zh: '作品', en: 'Releases' },
          description: { zh: 'Synctrol 作品列表', en: 'Synctrol releases' },
        },
        news: {
          title: { zh: '新闻', en: 'News' },
          description: { zh: 'Synctrol 新闻', en: 'Synctrol news' },
        },
      },
    },
    socialLinks: {
      items: [
        {
          label: 'GitHub',
          icon: './assets/github.svg',
          url: 'https://github.com/synctrol',
        },
      ],
    },
    release: {
      urlSegment: 'releases',
      index: {
        enabled: true,
        pagination: 12,
        mobileGridColumns: 2,
        desktopGridColumns: 3,
      },
      artworkPlaceholder: './assets/artwork-placeholder.svg',
    },
    ...overrides,
  }
}

export function packageSource(
  partial: Partial<AssetPackageSource> &
    Pick<AssetPackageSource, 'packageDir' | 'type'>,
): AssetPackageSource {
  return {
    slug: partial.type === 'home' ? null : (partial.slug ?? 'sample'),
    declaredPaths: [],
    localeMarkdown: [],
    ...partial,
  }
}

export function typedSlug(
  type: Exclude<ContentType, 'home'>,
  slug: string,
): { type: ContentType; slug: string } {
  return { type, slug }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/node/assets/hash.test.ts tests/node/assets/emit-url.test.ts`

Expected: FAIL because the modules do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/types/assets.ts
import type { ContentType } from '../types'

export type AssetKind = 'content' | 'global' | 'theme'

export interface ResolvedAsset {
  kind: AssetKind
  /** Absolute filesystem path of the source file */
  sourcePath: string
  /** Locale-free logical path beginning with /assets/… including content hash */
  assetPath: string
  /** VuePress-base-prefixed browser path */
  publicPath: string
  /** siteUrl + publicPath */
  absoluteUrl: string
  /** SHA-256 truncated content hash used in the filename */
  contentHash: string
}

export interface AssetManifest {
  assets: ResolvedAsset[]
  /** Absolute source path → ResolvedAsset */
  bySourcePath: Record<string, ResolvedAsset>
  /**
   * Per content package identity → original relative ref → publicPath.
   * Identity uses Plan 02 rules: `home` or `{type}:{slug}`.
   */
  contentPublicPaths: Record<string, Record<string, string>>
  /** Config-relative original ref → publicPath for global option assets */
  globalPublicPaths: Record<string, string>
}

export interface AssetLocaleMarkdown {
  filePath: string
  body: string
}

export interface AssetPackageSource {
  /** Absolute package directory (contains content.yml) */
  packageDir: string
  type: ContentType
  /** null for Home — emits /assets/content/home/… */
  slug: string | null
  /** Package-relative refs already known from manifest/book (./assets/…) */
  declaredPaths: string[]
  localeMarkdown: AssetLocaleMarkdown[]
}

export interface CompileAssetsOptions {
  packages: AssetPackageSource[]
  themeOptions: {
    siteUrl: string
    socialLinks?: { items: Array<{ icon: string }> }
    release?: { artworkPlaceholder?: string }
    seo: {
      defaultImage: string
      organization: { logo: string }
    }
  }
  /** Absolute directory containing the VuePress config file */
  configDir: string
  /** Absolute directory of explicit theme static assets (package theme/assets) */
  themeAssetsRoot: string
  /** Explicit theme-relative paths under themeAssetsRoot to hash (may be empty) */
  themeAssetPaths: string[]
  /** VuePress base, e.g. `/` or `/docs/` */
  base: string
  /** Absolute build destination root; hashed files are written here */
  destDir: string
}
```

```ts
// src/node/assets/hash.ts
import { createHash } from 'node:crypto'

export function hashFileContents(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 8)
}

export function insertContentHash(filename: string, hash: string): string {
  const slash = filename.lastIndexOf('/')
  const dir = slash === -1 ? '' : filename.slice(0, slash + 1)
  const base = slash === -1 ? filename : filename.slice(slash + 1)
  const dot = base.lastIndexOf('.')
  if (dot <= 0) {
    return `${dir}${base}.${hash}`
  }
  return `${dir}${base.slice(0, dot)}.${hash}${base.slice(dot)}`
}
```

```ts
// src/node/assets/emit-url.ts
function normalizeBase(base: string): string {
  if (!base || base === '/') return '/'
  const withLead = base.startsWith('/') ? base : `/${base}`
  return withLead.endsWith('/') ? withLead : `${withLead}/`
}

export function buildAssetPublicPath(assetPath: string, base: string): string {
  const normalizedAsset = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  const normalizedBase = normalizeBase(base)
  if (normalizedBase === '/') return normalizedAsset
  return `${normalizedBase.slice(0, -1)}${normalizedAsset}`
}

export function buildAssetAbsoluteUrl(
  publicPath: string,
  siteUrl: string,
): string {
  const origin = siteUrl.replace(/\/$/, '')
  const path = publicPath.startsWith('/') ? publicPath : `/${publicPath}`
  return `${origin}${path}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/node/assets/hash.test.ts tests/node/assets/emit-url.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/assets.ts src/node/assets/hash.ts src/node/assets/emit-url.ts tests/node/assets/hash.test.ts tests/node/assets/emit-url.test.ts tests/helpers/asset-fixtures.ts
git commit -m "feat(assets): add content hashing and base-aware asset URL builders"
```

---

### Task 2: Safe path resolution with escape prevention and case-sensitive existence

**Files:**
- Create: `src/node/assets/safe-path.ts`
- Create: `tests/node/assets/safe-path.test.ts`
- Create fixtures under `tests/fixtures/assets/safe-path/`

**Interfaces:**
- Consumes: Plan 02 `fail` / `SynctrolDiagnosticError`
- Produces: `resolveSafePath(rootDir: string, relativeRef: string): string` — returns absolute real path or throws diagnostic `ASSET_PATH_ESCAPE` / `ASSET_MISSING` / `ASSET_CASE_MISMATCH`

- [ ] **Step 1: Create fixtures and write the failing tests**

Fixture layout:

```text
tests/fixtures/assets/safe-path/package/
  assets/
    Cover.webp
    nested/
      art.webp
```

```ts
// tests/node/assets/safe-path.test.ts
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
import { resolveSafePath } from '../../../src/node/assets/safe-path'

const packageRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/assets/safe-path/package',
)

describe('resolveSafePath', () => {
  it('resolves a package-relative asset inside the root', () => {
    const resolved = resolveSafePath(packageRoot, './assets/Cover.webp')
    expect(resolved).toBe(join(packageRoot, 'assets/Cover.webp'))
  })

  it('resolves nested relative paths and retains nesting', () => {
    const resolved = resolveSafePath(packageRoot, './assets/nested/art.webp')
    expect(resolved).toBe(join(packageRoot, 'assets/nested/art.webp'))
  })

  it('rejects path escape with .. segments', () => {
    try {
      resolveSafePath(packageRoot, './assets/../../outside.webp')
      expect.unreachable('expected escape failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_PATH_ESCAPE')
      }
    }
  })

  it('rejects absolute filesystem refs', () => {
    try {
      resolveSafePath(packageRoot, '/etc/passwd')
      expect.unreachable('expected escape failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_PATH_ESCAPE')
      }
    }
  })

  it('fails when the file is missing', () => {
    try {
      resolveSafePath(packageRoot, './assets/missing.webp')
      expect.unreachable('expected missing failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_MISSING')
        expect(error.diagnostics[0]?.path).toContain('missing.webp')
      }
    }
  })

  it('fails on case mismatch even when the OS filesystem is case-insensitive', () => {
    try {
      resolveSafePath(packageRoot, './assets/cover.webp')
      expect.unreachable('expected case mismatch failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_CASE_MISMATCH')
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/node/assets/safe-path.test.ts`

Expected: FAIL because `resolveSafePath` is not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/assets/safe-path.ts
import { existsSync, readdirSync, statSync } from 'node:fs'
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { fail } from '../../compiler/diagnostics'

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
    // Still check case against the deepest existing parent when possible
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
```

Create the fixture files (any small binary/text content is fine):

```bash
mkdir -p tests/fixtures/assets/safe-path/package/assets/nested
printf 'cover' > tests/fixtures/assets/safe-path/package/assets/Cover.webp
printf 'art' > tests/fixtures/assets/safe-path/package/assets/nested/art.webp
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/node/assets/safe-path.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/assets/safe-path.ts tests/node/assets/safe-path.test.ts tests/fixtures/assets/safe-path
git commit -m "feat(assets): reject escaping, missing, and case-mismatched asset paths"
```

---

### Task 3: Content asset emit-path builder (typed slug and Home)

**Files:**
- Create: `src/node/assets/content-path.ts`
- Create: `tests/node/assets/content-path.test.ts`

**Interfaces:**
- Consumes: `insertContentHash`, `ContentType`
- Produces: `buildContentAssetPath(input: BuildContentAssetPathInput): string` where Home emits `/assets/content/home/…` and non-Home emits `/assets/content/{type}/{slug}/…`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/assets/content-path.test.ts
import { describe, expect, it } from 'vitest'
import { buildContentAssetPath } from '../../../src/node/assets/content-path'

describe('buildContentAssetPath', () => {
  it('emits typed content paths with slug and content hash', () => {
    expect(
      buildContentAssetPath({
        type: 'release',
        slug: 'first-release',
        packageRelativeAsset: 'assets/cover.webp',
        contentHash: 'abcd1234',
      }),
    ).toBe('/assets/content/release/first-release/cover.abcd1234.webp')
  })

  it('emits Home paths without a slug segment', () => {
    expect(
      buildContentAssetPath({
        type: 'home',
        slug: null,
        packageRelativeAsset: 'assets/logo.svg',
        contentHash: 'deadbeef',
      }),
    ).toBe('/assets/content/home/logo.deadbeef.svg')
  })

  it('retains nested paths under the package assets directory', () => {
    expect(
      buildContentAssetPath({
        type: 'news',
        slug: 'hello',
        packageRelativeAsset: 'assets/covers/front.webp',
        contentHash: 'aabbccdd',
      }),
    ).toBe('/assets/content/news/hello/covers/front.aabbccdd.webp')
  })

  it('accepts refs that already omit a leading ./', () => {
    expect(
      buildContentAssetPath({
        type: 'page',
        slug: 'team',
        packageRelativeAsset: './assets/banner.webp',
        contentHash: '11223344',
      }),
    ).toBe('/assets/content/page/team/banner.11223344.webp')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/node/assets/content-path.test.ts`

Expected: FAIL because `buildContentAssetPath` is not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/assets/content-path.ts
import type { ContentType } from '../../shared/types'
import { insertContentHash } from './hash'

export interface BuildContentAssetPathInput {
  type: ContentType
  slug: string | null
  /** Package-relative path such as ./assets/cover.webp or assets/covers/a.webp */
  packageRelativeAsset: string
  contentHash: string
}

function stripDotSlash(path: string): string {
  return path.replace(/^\.\//, '')
}

/**
 * Maps a package-relative file under `assets/` to the retained relative key
 * used in the public URL (without the `assets/` prefix).
 */
export function contentAssetKey(packageRelativeAsset: string): string {
  const normalized = stripDotSlash(packageRelativeAsset).replace(/\\/g, '/')
  if (normalized === 'assets' || normalized.startsWith('assets/')) {
    return normalized.slice('assets/'.length)
  }
  // Non-assets-directory package files still emit under their relative path
  return normalized
}

export function buildContentAssetPath(
  input: BuildContentAssetPathInput,
): string {
  const key = contentAssetKey(input.packageRelativeAsset)
  const hashed = insertContentHash(key, input.contentHash)
  if (input.type === 'home') {
    return `/assets/content/home/${hashed}`
  }
  if (!input.slug) {
    throw new Error(`Content type ${input.type} requires a slug for assets`)
  }
  return `/assets/content/${input.type}/${input.slug}/${hashed}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/node/assets/content-path.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/assets/content-path.ts tests/node/assets/content-path.test.ts
git commit -m "feat(assets): build hashed content asset paths for typed and home packages"
```

---

### Task 4: Collect package asset references from manifest, Book, and audio entries

**Files:**
- Create: `src/node/assets/collect-package-refs.ts`
- Create: `tests/node/assets/collect-package-refs.test.ts`

**Interfaces:**
- Consumes: Plan 02 `CompiledContentPackage` / `Book` / platform entries with `src`
- Produces: `collectPackageDeclaredPaths(pkg: CompiledContentPackage): string[]` — unique package-relative refs from `cover`, `artwork`, album/gift covers, and `audio_player.src` when relative

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/assets/collect-package-refs.test.ts
import { describe, expect, it } from 'vitest'
import type { Book, CompiledContentPackage } from '../../../src/shared/types'
import { collectPackageDeclaredPaths } from '../../../src/node/assets/collect-package-refs'

function releasePackage(): CompiledContentPackage {
  const book = {
    type: 'album',
    title: 'SYNCTROL',
    album: {
      covers: ['./assets/front.webp', './assets/back.webp'],
      links: [
        {
          platform: 'local-audio',
          src: './assets/preview.mp3',
        },
        {
          platform: 'remote-audio',
          src: 'https://cdn.example.com/a.mp3',
        },
        {
          platform: 'bilibili',
          bvid: 'BV1xxxxxxxxx',
        },
      ],
    },
  } as Book

  return {
    dir: '/content/releases/first-release',
    identity: 'release:first-release',
    manifest: {
      type: 'release',
      slug: 'first-release',
      date: '2026-08-11',
      draft: false,
      cover: './assets/article-cover.webp',
      artwork: './assets/album-entry.webp',
    },
    book,
  }
}

describe('collectPackageDeclaredPaths', () => {
  it('collects cover, artwork, album covers, and relative audio_player src', () => {
    const paths = collectPackageDeclaredPaths(releasePackage())
    expect(paths).toEqual([
      './assets/article-cover.webp',
      './assets/album-entry.webp',
      './assets/front.webp',
      './assets/back.webp',
      './assets/preview.mp3',
    ])
  })

  it('collects gift item covers', () => {
    const pkg: CompiledContentPackage = {
      dir: '/content/releases/merch',
      identity: 'release:merch',
      manifest: {
        type: 'release',
        slug: 'merch',
        date: '2026-08-11',
        draft: false,
      },
      book: {
        type: 'gift',
        title: 'Merch',
        gift: {
          items: [
            {
              id: 'poster',
              title: 'Poster',
              covers: ['./assets/poster-front.webp'],
            },
          ],
        },
      },
    }
    expect(collectPackageDeclaredPaths(pkg)).toEqual([
      './assets/poster-front.webp',
    ])
  })

  it('returns an empty list when no asset fields are present', () => {
    const pkg: CompiledContentPackage = {
      dir: '/content/pages/about',
      identity: 'page:about',
      manifest: {
        type: 'page',
        slug: 'about',
        draft: false,
      },
    }
    expect(collectPackageDeclaredPaths(pkg)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/node/assets/collect-package-refs.test.ts`

Expected: FAIL because `collectPackageDeclaredPaths` is not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/assets/collect-package-refs.ts
import type { Book, CompiledContentPackage } from '../../shared/types'

function isRelativeAssetRef(value: unknown): value is string {
  return typeof value === 'string' && !/^https?:\/\//i.test(value)
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value)
}

function collectFromBook(book: Book, target: string[]): void {
  if (book.type === 'album') {
    for (const cover of book.album.covers ?? []) {
      if (isRelativeAssetRef(cover)) pushUnique(target, cover)
    }
    for (const link of book.album.links ?? []) {
      const src = (link as { src?: unknown }).src
      if (isRelativeAssetRef(src)) pushUnique(target, src)
    }
    return
  }

  for (const item of book.gift.items) {
    for (const cover of item.covers ?? []) {
      if (isRelativeAssetRef(cover)) pushUnique(target, cover)
    }
  }
}

export function collectPackageDeclaredPaths(
  pkg: CompiledContentPackage,
): string[] {
  const paths: string[] = []
  if (isRelativeAssetRef(pkg.manifest.cover)) {
    pushUnique(paths, pkg.manifest.cover)
  }
  if (isRelativeAssetRef(pkg.manifest.artwork)) {
    pushUnique(paths, pkg.manifest.artwork)
  }
  if (pkg.book) {
    collectFromBook(pkg.book, paths)
  }
  return paths
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/node/assets/collect-package-refs.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/assets/collect-package-refs.ts tests/node/assets/collect-package-refs.test.ts
git commit -m "feat(assets): collect package-relative refs from manifests and books"
```

---

### Task 5: Markdown image/download extraction and raw HTML relative-attribute rejection

**Files:**
- Create: `src/node/assets/markdown-assets.ts`
- Create: `tests/node/assets/markdown-assets.test.ts`

**Interfaces:**
- Consumes: Plan 02 diagnostics; locale Markdown `filePath` + `body`
- Produces: `extractMarkdownAssetRefs(body: string): string[]`, `assertNoRawHtmlRelativeAssets(body: string, markdownPath: string): void`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/assets/markdown-assets.test.ts
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
import {
  assertNoRawHtmlRelativeAssets,
  extractMarkdownAssetRefs,
} from '../../../src/node/assets/markdown-assets'

describe('extractMarkdownAssetRefs', () => {
  it('extracts Markdown image refs', () => {
    const body = 'Hello ![Alt](./assets/image.webp) and text'
    expect(extractMarkdownAssetRefs(body)).toEqual(['./assets/image.webp'])
  })

  it('extracts Markdown download/link refs to relative assets', () => {
    const body = 'Get the [sheet](./assets/notes.pdf) please'
    expect(extractMarkdownAssetRefs(body)).toEqual(['./assets/notes.pdf'])
  })

  it('ignores absolute http(s) links and in-page anchors', () => {
    const body = [
      '[site](https://synctrol.com)',
      '[top](#section)',
      '![remote](https://cdn.example.com/a.webp)',
    ].join('\n')
    expect(extractMarkdownAssetRefs(body)).toEqual([])
  })

  it('deduplicates repeated refs', () => {
    const body = '![A](./assets/a.webp) ![B](./assets/a.webp)'
    expect(extractMarkdownAssetRefs(body)).toEqual(['./assets/a.webp'])
  })
})

describe('assertNoRawHtmlRelativeAssets', () => {
  it('allows Markdown-only relative assets', () => {
    expect(() =>
      assertNoRawHtmlRelativeAssets(
        '![Ok](./assets/ok.webp)',
        '/content/home/zh.md',
      ),
    ).not.toThrow()
  })

  it('rejects raw HTML img src relative attributes', () => {
    try {
      assertNoRawHtmlRelativeAssets(
        '<img src="./assets/bad.webp" alt="x">',
        '/content/home/zh.md',
      )
      expect.unreachable('expected raw html rejection')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_RAW_HTML_RELATIVE')
        expect(error.diagnostics[0]?.path).toBe('/content/home/zh.md')
      }
    }
  })

  it('rejects raw HTML source/href/poster relative attributes', () => {
    const samples = [
      '<audio src="./assets/a.mp3"></audio>',
      '<a href="./assets/file.pdf">x</a>',
      '<video poster="./assets/still.webp"></video>',
      '<source src="./assets/clip.mp4">',
    ]
    for (const html of samples) {
      expect(() =>
        assertNoRawHtmlRelativeAssets(html, '/content/news/x/en.md'),
      ).toThrow(/ASSET_RAW_HTML_RELATIVE|raw HTML/i)
    }
  })

  it('allows absolute https attributes in raw HTML', () => {
    expect(() =>
      assertNoRawHtmlRelativeAssets(
        '<img src="https://cdn.example.com/a.webp" alt="x">',
        '/content/home/zh.md',
      ),
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/node/assets/markdown-assets.test.ts`

Expected: FAIL because the Markdown asset helpers are not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/assets/markdown-assets.ts
import { fail } from '../../compiler/diagnostics'

const MARKDOWN_LINK_RE =
  /!?\[(?:[^\]]*)\]\((?<target><[^>]+>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g

const RAW_HTML_RELATIVE_ATTR_RE =
  /\b(?:src|href|poster)\s*=\s*(["'])(?<value>(?:\.\.?\/|\/)[^"']*)\1/gi

function normalizeTarget(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function isRelativeAssetTarget(target: string): boolean {
  if (!target) return false
  if (target.startsWith('#')) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return false
  return true
}

export function extractMarkdownAssetRefs(body: string): string[] {
  const refs: string[] = []
  for (const match of body.matchAll(MARKDOWN_LINK_RE)) {
    const target = normalizeTarget(match.groups?.target ?? '')
    if (!isRelativeAssetTarget(target)) continue
    if (!refs.includes(target)) refs.push(target)
  }
  return refs
}

export function assertNoRawHtmlRelativeAssets(
  body: string,
  markdownPath: string,
): void {
  RAW_HTML_RELATIVE_ATTR_RE.lastIndex = 0
  const match = RAW_HTML_RELATIVE_ATTR_RE.exec(body)
  if (!match) return
  const value = match.groups?.value ?? match[2] ?? ''
  fail({
    severity: 'error',
    code: 'ASSET_RAW_HTML_RELATIVE',
    message: `Raw HTML relative asset attributes are not allowed (${value}). Use Markdown image/link syntax so assets enter the package pipeline.`,
    path: markdownPath,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/node/assets/markdown-assets.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/assets/markdown-assets.ts tests/node/assets/markdown-assets.test.ts
git commit -m "feat(assets): extract Markdown asset refs and reject raw HTML relatives"
```

---

### Task 6: Global asset pipeline for config-relative options and `.vuepress/assets`

**Files:**
- Create: `src/node/assets/global-pipeline.ts`
- Create: `tests/node/assets/global-pipeline.test.ts`
- Create fixtures under `tests/fixtures/assets/global/`

**Interfaces:**
- Consumes: `resolveSafePath`, `hashFileContents`, `insertContentHash`, `buildAssetPublicPath`, `buildAssetAbsoluteUrl`
- Produces: `collectGlobalOptionRefs(options): string[]`, `buildGlobalAssetPath(relativeUnderAssets: string, hash: string): string`, `resolveGlobalAsset(…): ResolvedAsset`

- [ ] **Step 1: Create fixtures and write the failing tests**

```text
tests/fixtures/assets/global/.vuepress/
  config.ts          # placeholder text file (path only matters)
  assets/
    social-default.webp
    logo.svg
    github.svg
    artwork-placeholder.svg
    icons/
      nested.svg
```

```ts
// tests/node/assets/global-pipeline.test.ts
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { themeOptions } from '../../helpers/asset-fixtures'
import {
  buildGlobalAssetPath,
  collectGlobalOptionRefs,
  resolveGlobalAsset,
} from '../../../src/node/assets/global-pipeline'
import { hashFileContents } from '../../../src/node/assets/hash'

const configDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/assets/global/.vuepress',
)

describe('collectGlobalOptionRefs', () => {
  it('collects social icons, artworkPlaceholder, defaultImage, and organization logo', () => {
    expect(collectGlobalOptionRefs(themeOptions())).toEqual([
      './assets/github.svg',
      './assets/artwork-placeholder.svg',
      './assets/social-default.webp',
      './assets/logo.svg',
    ])
  })
})

describe('buildGlobalAssetPath', () => {
  it('emits /assets/global with retained nested path and hash', () => {
    expect(buildGlobalAssetPath('icons/nested.svg', 'abcd1234')).toBe(
      '/assets/global/icons/nested.abcd1234.svg',
    )
  })
})

describe('resolveGlobalAsset', () => {
  it('resolves config-relative refs into hashed global assets with base and siteUrl', () => {
    const sourcePath = join(configDir, 'assets/logo.svg')
    const buffer = readFileSync(sourcePath)
    const hash = hashFileContents(buffer)
    const resolved = resolveGlobalAsset({
      configDir,
      relativeRef: './assets/logo.svg',
      base: '/docs/',
      siteUrl: 'https://synctrol.com',
    })
    expect(resolved.kind).toBe('global')
    expect(resolved.sourcePath).toBe(sourcePath)
    expect(resolved.contentHash).toBe(hash)
    expect(resolved.assetPath).toBe(`/assets/global/logo.${hash}.svg`)
    expect(resolved.publicPath).toBe(`/docs/assets/global/logo.${hash}.svg`)
    expect(resolved.absoluteUrl).toBe(
      `https://synctrol.com/docs/assets/global/logo.${hash}.svg`,
    )
  })

  it('retains nesting under .vuepress/assets', () => {
    const resolved = resolveGlobalAsset({
      configDir,
      relativeRef: './assets/icons/nested.svg',
      base: '/',
      siteUrl: 'https://synctrol.com',
    })
    expect(resolved.assetPath).toMatch(
      /^\/assets\/global\/icons\/nested\.[0-9a-f]{8}\.svg$/,
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/node/assets/global-pipeline.test.ts`

Expected: FAIL because global pipeline modules are missing.

- [ ] **Step 3: Write minimal implementation and fixtures**

```bash
mkdir -p tests/fixtures/assets/global/.vuepress/assets/icons
printf 'config' > tests/fixtures/assets/global/.vuepress/config.ts
printf 'social' > tests/fixtures/assets/global/.vuepress/assets/social-default.webp
printf 'logo' > tests/fixtures/assets/global/.vuepress/assets/logo.svg
printf 'github' > tests/fixtures/assets/global/.vuepress/assets/github.svg
printf 'ph' > tests/fixtures/assets/global/.vuepress/assets/artwork-placeholder.svg
printf 'nested' > tests/fixtures/assets/global/.vuepress/assets/icons/nested.svg
```

```ts
// src/node/assets/global-pipeline.ts
import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import type { ResolvedAsset } from '../../shared/types/assets'
import {
  buildAssetAbsoluteUrl,
  buildAssetPublicPath,
} from './emit-url'
import { hashFileContents, insertContentHash } from './hash'
import { resolveSafePath } from './safe-path'

export function collectGlobalOptionRefs(options: {
  socialLinks?: { items: Array<{ icon: string }> }
  release?: { artworkPlaceholder?: string }
  seo: {
    defaultImage: string
    organization: { logo: string }
  }
}): string[] {
  const refs: string[] = []
  for (const item of options.socialLinks?.items ?? []) {
    if (!refs.includes(item.icon)) refs.push(item.icon)
  }
  if (options.release?.artworkPlaceholder) {
    refs.push(options.release.artworkPlaceholder)
  }
  refs.push(options.seo.defaultImage)
  refs.push(options.seo.organization.logo)
  return refs
}

export function globalAssetKey(
  configDir: string,
  absoluteSourcePath: string,
): string {
  const assetsRoot = resolve(configDir, 'assets')
  const rel = relative(assetsRoot, absoluteSourcePath).replace(/\\/g, '/')
  if (rel.startsWith('..')) {
    // Outside .vuepress/assets: use basename only
    const parts = absoluteSourcePath.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] ?? absoluteSourcePath
  }
  return rel
}

export function buildGlobalAssetPath(
  relativeUnderAssets: string,
  hash: string,
): string {
  return `/assets/global/${insertContentHash(relativeUnderAssets, hash)}`
}

export function resolveGlobalAsset(input: {
  configDir: string
  relativeRef: string
  base: string
  siteUrl: string
}): ResolvedAsset {
  const sourcePath = resolveSafePath(input.configDir, input.relativeRef)
  const buffer = readFileSync(sourcePath)
  const contentHash = hashFileContents(buffer)
  const key = globalAssetKey(input.configDir, sourcePath)
  const assetPath = buildGlobalAssetPath(key, contentHash)
  const publicPath = buildAssetPublicPath(assetPath, input.base)
  return {
    kind: 'global',
    sourcePath,
    assetPath,
    publicPath,
    absoluteUrl: buildAssetAbsoluteUrl(publicPath, input.siteUrl),
    contentHash,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/node/assets/global-pipeline.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/assets/global-pipeline.ts tests/node/assets/global-pipeline.test.ts tests/fixtures/assets/global
git commit -m "feat(assets): hash config-relative social and SEO files into /assets/global"
```

---

### Task 7: Theme asset path builder and bundler-import convention

**Files:**
- Create: `src/node/assets/theme-pipeline.ts`
- Create: `tests/node/assets/theme-pipeline.test.ts`
- Create fixtures under `tests/fixtures/assets/theme-assets/`

**Interfaces:**
- Consumes: hash + emit-url + safe-path helpers
- Produces: `buildThemeAssetPath(relativePath: string, hash: string): string`, `resolveThemeAsset(…): ResolvedAsset`
- Documents: Background module `import logoUrl from './logo.svg'` remains a VuePress/bundler theme asset; this compiler only hashes explicitly listed static theme files under `themeAssetsRoot`

- [ ] **Step 1: Create fixtures and write the failing tests**

```text
tests/fixtures/assets/theme-assets/
  grid.svg
  textures/
    noise.png
```

```ts
// tests/node/assets/theme-pipeline.test.ts
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { hashFileContents } from '../../../src/node/assets/hash'
import {
  buildThemeAssetPath,
  resolveThemeAsset,
} from '../../../src/node/assets/theme-pipeline'

const themeAssetsRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/assets/theme-assets',
)

describe('buildThemeAssetPath', () => {
  it('emits /assets/theme with hash and retained nesting', () => {
    expect(buildThemeAssetPath('textures/noise.png', 'abcd1234')).toBe(
      '/assets/theme/textures/noise.abcd1234.png',
    )
  })
})

describe('resolveThemeAsset', () => {
  it('resolves an explicit theme static file', () => {
    const sourcePath = join(themeAssetsRoot, 'grid.svg')
    const hash = hashFileContents(readFileSync(sourcePath))
    const resolved = resolveThemeAsset({
      themeAssetsRoot,
      relativeRef: './grid.svg',
      base: '/',
      siteUrl: 'https://synctrol.com',
    })
    expect(resolved).toEqual({
      kind: 'theme',
      sourcePath,
      contentHash: hash,
      assetPath: `/assets/theme/grid.${hash}.svg`,
      publicPath: `/assets/theme/grid.${hash}.svg`,
      absoluteUrl: `https://synctrol.com/assets/theme/grid.${hash}.svg`,
    })
  })

  it('applies VuePress base to theme public URLs', () => {
    const resolved = resolveThemeAsset({
      themeAssetsRoot,
      relativeRef: './textures/noise.png',
      base: '/site/',
      siteUrl: 'https://example.com',
    })
    expect(resolved.publicPath.startsWith('/site/assets/theme/textures/')).toBe(
      true,
    )
    expect(resolved.absoluteUrl.startsWith('https://example.com/site/assets/theme/')).toBe(
      true,
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/node/assets/theme-pipeline.test.ts`

Expected: FAIL because theme pipeline helpers are missing.

- [ ] **Step 3: Write minimal implementation and fixtures**

```bash
mkdir -p tests/fixtures/assets/theme-assets/textures
printf 'grid' > tests/fixtures/assets/theme-assets/grid.svg
printf 'noise' > tests/fixtures/assets/theme-assets/textures/noise.png
```

```ts
// src/node/assets/theme-pipeline.ts
import { readFileSync } from 'node:fs'
import { relative } from 'node:path'
import type { ResolvedAsset } from '../../shared/types/assets'
import {
  buildAssetAbsoluteUrl,
  buildAssetPublicPath,
} from './emit-url'
import { hashFileContents, insertContentHash } from './hash'
import { resolveSafePath } from './safe-path'

/**
 * Explicit theme static files are hashed here.
 *
 * Background modules must import their own images/fonts/wasm with normal
 * TypeScript/ESM imports (for example `import noise from './noise.png'`).
 * Those imports are emitted by the VuePress bundler as theme assets and are
 * intentionally outside `compileAssets()`.
 */
export function buildThemeAssetPath(
  relativePath: string,
  hash: string,
): string {
  return `/assets/theme/${insertContentHash(relativePath, hash)}`
}

export function resolveThemeAsset(input: {
  themeAssetsRoot: string
  relativeRef: string
  base: string
  siteUrl: string
}): ResolvedAsset {
  const sourcePath = resolveSafePath(input.themeAssetsRoot, input.relativeRef)
  const buffer = readFileSync(sourcePath)
  const contentHash = hashFileContents(buffer)
  const key = relative(input.themeAssetsRoot, sourcePath).replace(/\\/g, '/')
  const assetPath = buildThemeAssetPath(key, contentHash)
  const publicPath = buildAssetPublicPath(assetPath, input.base)
  return {
    kind: 'theme',
    sourcePath,
    assetPath,
    publicPath,
    absoluteUrl: buildAssetAbsoluteUrl(publicPath, input.siteUrl),
    contentHash,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/node/assets/theme-pipeline.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/assets/theme-pipeline.ts tests/node/assets/theme-pipeline.test.ts tests/fixtures/assets/theme-assets
git commit -m "feat(assets): hash explicit theme static files under /assets/theme"
```

---

### Task 8: Asset registry and `resolveContentAsset` helper

**Files:**
- Create: `src/node/assets/registry.ts`
- Create: `src/client/assets/resolve-content-asset.ts`
- Create: `src/client/assets/index.ts`
- Create: `tests/node/assets/registry.test.ts`
- Create: `tests/client/assets/resolve-content-asset.test.ts`

**Interfaces:**
- Consumes: `ResolvedAsset`
- Produces:
  - Node: `AssetRegistry` with `register`, `getBySource`, `getContentPublicPath(identity, relativeRef)`
  - Client: `resolveContentAsset(relativeRef: string): string` reading an injected `ContentAssetMap`
  - Client: `createResolveContentAsset(map: Record<string, string>): (ref: string) => string` for tests and SSR-less unit use

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/assets/registry.test.ts
import { describe, expect, it } from 'vitest'
import { AssetRegistry } from '../../../src/node/assets/registry'
import type { ResolvedAsset } from '../../../src/shared/types/assets'

function asset(partial: Partial<ResolvedAsset> & Pick<ResolvedAsset, 'sourcePath' | 'publicPath'>): ResolvedAsset {
  return {
    kind: 'content',
    assetPath: partial.publicPath,
    absoluteUrl: `https://synctrol.com${partial.publicPath}`,
    contentHash: 'abcd1234',
    ...partial,
  }
}

describe('AssetRegistry', () => {
  it('registers by source path and package-relative ref', () => {
    const registry = new AssetRegistry()
    registry.registerContent('release:first-release', './assets/cover.webp', asset({
      sourcePath: '/content/releases/first-release/assets/cover.webp',
      publicPath: '/assets/content/release/first-release/cover.abcd1234.webp',
    }))
    expect(
      registry.getContentPublicPath('release:first-release', './assets/cover.webp'),
    ).toBe('/assets/content/release/first-release/cover.abcd1234.webp')
    expect(
      registry.getBySource('/content/releases/first-release/assets/cover.webp')
        ?.publicPath,
    ).toBe('/assets/content/release/first-release/cover.abcd1234.webp')
  })

  it('normalizes ./ prefix when looking up content refs', () => {
    const registry = new AssetRegistry()
    registry.registerContent('home', 'assets/logo.svg', asset({
      kind: 'content',
      sourcePath: '/content/home/assets/logo.svg',
      publicPath: '/assets/content/home/logo.abcd1234.svg',
    }))
    expect(registry.getContentPublicPath('home', './assets/logo.svg')).toBe(
      '/assets/content/home/logo.abcd1234.svg',
    )
  })
})
```

```ts
// tests/client/assets/resolve-content-asset.test.ts
import { describe, expect, it } from 'vitest'
import {
  createResolveContentAsset,
  normalizeContentAssetRef,
} from '../../../src/client/assets/resolve-content-asset'

describe('resolveContentAsset', () => {
  it('returns the public path for a registered package-relative ref', () => {
    const resolveContentAsset = createResolveContentAsset({
      './assets/name.ext': '/assets/content/release/first/name.abcd1234.ext',
      'assets/name.ext': '/assets/content/release/first/name.abcd1234.ext',
    })
    expect(resolveContentAsset('./assets/name.ext')).toBe(
      '/assets/content/release/first/name.abcd1234.ext',
    )
  })

  it('throws when the ref is unknown', () => {
    const resolveContentAsset = createResolveContentAsset({})
    expect(() => resolveContentAsset('./assets/missing.webp')).toThrow(
      /resolveContentAsset/i,
    )
  })

  it('normalizes refs for map lookup', () => {
    expect(normalizeContentAssetRef('assets/a.webp')).toBe('./assets/a.webp')
    expect(normalizeContentAssetRef('./assets/a.webp')).toBe('./assets/a.webp')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/node/assets/registry.test.ts tests/client/assets/resolve-content-asset.test.ts`

Expected: FAIL because registry/client helpers are missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/assets/registry.ts
import type { ResolvedAsset } from '../../shared/types/assets'

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
```

```ts
// src/client/assets/resolve-content-asset.ts
export type ContentAssetMap = Record<string, string>

export function normalizeContentAssetRef(ref: string): string {
  const normalized = ref.replace(/\\/g, '/')
  return normalized.startsWith('./') ? normalized : `./${normalized}`
}

/**
 * Factory used by unit tests and by the theme runtime when page data
 * provides the current package's public-path map.
 *
 * Vue components call:
 *   resolveContentAsset('./assets/name.ext')
 */
export function createResolveContentAsset(
  map: ContentAssetMap,
): (relativeRef: string) => string {
  return function resolveContentAsset(relativeRef: string): string {
    const normalized = normalizeContentAssetRef(relativeRef)
    const direct = map[relativeRef] ?? map[normalized] ?? map[normalized.slice(2)]
    if (!direct) {
      throw new Error(
        `resolveContentAsset: unknown package asset "${relativeRef}". ` +
          'Only files hashed into the current content package map can be resolved.',
      )
    }
    return direct
  }
}

let activeMap: ContentAssetMap = {}

export function setContentAssetMap(map: ContentAssetMap): void {
  activeMap = map
}

export function resolveContentAsset(relativeRef: string): string {
  return createResolveContentAsset(activeMap)(relativeRef)
}
```

```ts
// src/client/assets/index.ts
export {
  createResolveContentAsset,
  normalizeContentAssetRef,
  resolveContentAsset,
  setContentAssetMap,
  type ContentAssetMap,
} from './resolve-content-asset'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/node/assets/registry.test.ts tests/client/assets/resolve-content-asset.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/assets/registry.ts src/client/assets/resolve-content-asset.ts src/client/assets/index.ts tests/node/assets/registry.test.ts tests/client/assets/resolve-content-asset.test.ts
git commit -m "feat(assets): add asset registry and resolveContentAsset helper"
```

---

### Task 9: `compileAssets` orchestrator with write-out and public reservation rules

**Files:**
- Create: `src/node/assets/compile-assets.ts`
- Create: `src/node/assets/index.ts`
- Create: `tests/node/assets/compile-assets.test.ts`
- Create fixtures under `tests/fixtures/assets/compile/`
- Modify: `src/index.ts` (re-export Node asset API and client helper path note only — no shell)

**Interfaces:**
- Consumes: Tasks 1–8
- Produces: `compileAssets(options: CompileAssetsOptions): AssetManifest`
  - Resolves content + Markdown refs per package
  - Resolves global option refs relative to `configDir`
  - Resolves explicit `themeAssetPaths`
  - Writes hashed files under `destDir` mirroring `assetPath` (without leading slash)
  - Never reads or writes `.vuepress/public`
  - Deduplicates by absolute `sourcePath`
  - Fails on escape / missing / case mismatch / raw HTML relatives

- [ ] **Step 1: Create fixtures and write the failing tests**

```text
tests/fixtures/assets/compile/
  .vuepress/
    config.ts
    assets/
      social-default.webp
      logo.svg
      github.svg
      artwork-placeholder.svg
    public/
      CNAME
      robots.txt
  content/
    home/
      content.yml
      zh.md
      assets/
        logo.svg
        body.webp
    releases/
      first-release/
        content.yml
        zh.md
        assets/
          cover.webp
          nested/
            art.webp
  theme-assets/
    grid.svg
```

`content/home/zh.md`:

```md
# Home

![Body](./assets/body.webp)
```

`content/releases/first-release/zh.md`:

```md
See ![Art](./assets/nested/art.webp)
```

`content/home/content.yml`:

```yaml
type: home
draft: false
```

`content/releases/first-release/content.yml`:

```yaml
type: release
slug: first-release
date: 2026-08-11
draft: false
cover: ./assets/cover.webp
```

```ts
// tests/node/assets/compile-assets.test.ts
import { existsSync, readFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
import { compileAssets } from '../../../src/node/assets/compile-assets'
import { themeOptions } from '../../helpers/asset-fixtures'
import type { AssetPackageSource } from '../../../src/shared/types/assets'

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/assets/compile',
)

function packages(): AssetPackageSource[] {
  const homeDir = join(fixtureRoot, 'content/home')
  const releaseDir = join(fixtureRoot, 'content/releases/first-release')
  return [
    {
      packageDir: homeDir,
      type: 'home',
      slug: null,
      declaredPaths: [],
      localeMarkdown: [
        {
          filePath: join(homeDir, 'zh.md'),
          body: readFileSync(join(homeDir, 'zh.md'), 'utf8'),
        },
      ],
    },
    {
      packageDir: releaseDir,
      type: 'release',
      slug: 'first-release',
      declaredPaths: ['./assets/cover.webp'],
      localeMarkdown: [
        {
          filePath: join(releaseDir, 'zh.md'),
          body: readFileSync(join(releaseDir, 'zh.md'), 'utf8'),
        },
      ],
    },
  ]
}

describe('compileAssets', () => {
  it('hashes content, global, and theme assets and writes them under dest', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-'))
    const manifest = compileAssets({
      packages: packages(),
      themeOptions: themeOptions(),
      configDir: join(fixtureRoot, '.vuepress'),
      themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
      themeAssetPaths: ['./grid.svg'],
      base: '/docs/',
      destDir,
    })

    const releaseCover = manifest.assets.find((asset) =>
      asset.sourcePath.endsWith('first-release/assets/cover.webp'),
    )
    expect(releaseCover?.kind).toBe('content')
    expect(releaseCover?.assetPath).toMatch(
      /^\/assets\/content\/release\/first-release\/cover\.[0-9a-f]{8}\.webp$/,
    )
    expect(releaseCover?.publicPath.startsWith('/docs/assets/content/')).toBe(
      true,
    )
    expect(releaseCover?.absoluteUrl.startsWith('https://synctrol.com/docs/')).toBe(
      true,
    )
    expect(
      existsSync(join(destDir, releaseCover!.assetPath.slice(1))),
    ).toBe(true)

    const homeBody = manifest.contentPublicPaths.home['./assets/body.webp']
    expect(homeBody).toMatch(/^\/docs\/assets\/content\/home\/body\.[0-9a-f]{8}\.webp$/)

    expect(manifest.globalPublicPaths['./assets/logo.svg']).toMatch(
      /^\/docs\/assets\/global\/logo\.[0-9a-f]{8}\.svg$/,
    )

    const themeGrid = manifest.assets.find((asset) =>
      asset.sourcePath.endsWith('theme-assets/grid.svg'),
    )
    expect(themeGrid?.assetPath).toMatch(/^\/assets\/theme\/grid\.[0-9a-f]{8}\.svg$/)

    // .vuepress/public fixed-name files are not hashed or copied by this pipeline
    expect(
      manifest.assets.some((asset) =>
        asset.sourcePath.includes(`${join('.vuepress', 'public')}`),
      ),
    ).toBe(false)
    expect(existsSync(join(destDir, 'CNAME'))).toBe(false)
  })

  it('fails when Markdown contains raw HTML relative assets', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-bad-'))
    const homeDir = join(fixtureRoot, 'content/home')
    try {
      compileAssets({
        packages: [
          {
            packageDir: homeDir,
            type: 'home',
            slug: null,
            declaredPaths: [],
            localeMarkdown: [
              {
                filePath: join(homeDir, 'zh.md'),
                body: '<img src="./assets/body.webp" alt="x">',
              },
            ],
          },
        ],
        themeOptions: themeOptions(),
        configDir: join(fixtureRoot, '.vuepress'),
        themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
        themeAssetPaths: [],
        base: '/',
        destDir,
      })
      expect.unreachable('expected raw html failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_RAW_HTML_RELATIVE')
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/node/assets/compile-assets.test.ts`

Expected: FAIL because `compileAssets` is not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/assets/compile-assets.ts
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import type {
  AssetManifest,
  AssetPackageSource,
  CompileAssetsOptions,
  ResolvedAsset,
} from '../../shared/types/assets'
import { buildContentAssetPath, contentAssetKey } from './content-path'
import {
  buildAssetAbsoluteUrl,
  buildAssetPublicPath,
} from './emit-url'
import { resolveGlobalAsset, collectGlobalOptionRefs } from './global-pipeline'
import { hashFileContents } from './hash'
import {
  assertNoRawHtmlRelativeAssets,
  extractMarkdownAssetRefs,
} from './markdown-assets'
import { AssetRegistry } from './registry'
import { resolveSafePath } from './safe-path'
import { resolveThemeAsset } from './theme-pipeline'

function packageIdentity(pkg: AssetPackageSource): string {
  if (pkg.type === 'home') return 'home'
  if (!pkg.slug) {
    throw new Error(`Package type ${pkg.type} requires slug for asset identity`)
  }
  return `${pkg.type}:${pkg.slug}`
}

function resolveContentAssetFile(input: {
  pkg: AssetPackageSource
  relativeRef: string
  base: string
  siteUrl: string
}): ResolvedAsset {
  // Markdown refs are relative to the locale Markdown file; declared refs are
  // package-relative. For Synctrol packages, locale Markdown lives in the
  // package root, so both resolve against packageDir.
  const sourcePath = resolveSafePath(input.pkg.packageDir, input.relativeRef)
  const buffer = readFileSync(sourcePath)
  const contentHash = hashFileContents(buffer)
  const packageRelativeAsset = relative(
    input.pkg.packageDir,
    sourcePath,
  ).replace(/\\/g, '/')
  const assetPath = buildContentAssetPath({
    type: input.pkg.type,
    slug: input.pkg.slug,
    packageRelativeAsset,
    contentHash,
  })
  const publicPath = buildAssetPublicPath(assetPath, input.base)
  return {
    kind: 'content',
    sourcePath,
    assetPath,
    publicPath,
    absoluteUrl: buildAssetAbsoluteUrl(publicPath, input.siteUrl),
    contentHash,
  }
}

function writeAsset(destDir: string, asset: ResolvedAsset): void {
  const outputPath = join(destDir, asset.assetPath.replace(/^\//, ''))
  mkdirSync(dirname(outputPath), { recursive: true })
  copyFileSync(asset.sourcePath, outputPath)
}

export function compileAssets(
  options: CompileAssetsOptions,
): AssetManifest {
  const registry = new AssetRegistry()
  const siteUrl = options.themeOptions.siteUrl
  const seenSources = new Set<string>()

  const registerUnique = (asset: ResolvedAsset): ResolvedAsset => {
    const existing = registry.getBySource(asset.sourcePath)
    if (existing) return existing
    if (seenSources.has(asset.sourcePath)) return asset
    seenSources.add(asset.sourcePath)
    registry.register(asset)
    writeAsset(options.destDir, asset)
    return asset
  }

  for (const pkg of options.packages) {
    const identity = packageIdentity(pkg)
    const refs = new Set<string>(pkg.declaredPaths)

    for (const markdown of pkg.localeMarkdown) {
      assertNoRawHtmlRelativeAssets(markdown.body, markdown.filePath)
      for (const ref of extractMarkdownAssetRefs(markdown.body)) {
        refs.add(ref)
      }
    }

    for (const ref of refs) {
      const resolved = resolveContentAssetFile({
        pkg,
        relativeRef: ref,
        base: options.base,
        siteUrl,
      })
      const unique = registerUnique(resolved)
      registry.registerContent(identity, ref, unique)
      // Also index by package-relative key under assets/
      const key = contentAssetKey(
        relative(pkg.packageDir, unique.sourcePath).replace(/\\/g, '/'),
      )
      registry.registerContent(identity, `./assets/${key}`, unique)
    }
  }

  for (const ref of collectGlobalOptionRefs(options.themeOptions)) {
    const resolved = resolveGlobalAsset({
      configDir: options.configDir,
      relativeRef: ref,
      base: options.base,
      siteUrl,
    })
    const unique = registerUnique(resolved)
    registry.registerGlobal(ref, unique)
  }

  for (const ref of options.themeAssetPaths) {
    const resolved = resolveThemeAsset({
      themeAssetsRoot: options.themeAssetsRoot,
      relativeRef: ref,
      base: options.base,
      siteUrl,
    })
    registerUnique(resolved)
  }

  // Explicit guarantee: never scan or copy options.configDir/public
  const publicDir = resolve(options.configDir, 'public')
  for (const asset of registry.toManifest().assets) {
    if (asset.sourcePath === publicDir || asset.sourcePath.startsWith(`${publicDir}/`)) {
      throw new Error(
        '.vuepress/public files must not enter the hashed asset pipeline',
      )
    }
  }

  return registry.toManifest()
}
```

Update `CompileAssetsOptions` in `src/shared/types/assets.ts` so `themeOptions` includes required `siteUrl`:

```ts
export interface CompileAssetsOptions {
  packages: AssetPackageSource[]
  themeOptions: {
    siteUrl: string
    socialLinks?: { items: Array<{ icon: string }> }
    release?: { artworkPlaceholder?: string }
    seo: {
      defaultImage: string
      organization: { logo: string }
    }
  }
  configDir: string
  themeAssetsRoot: string
  themeAssetPaths: string[]
  base: string
  destDir: string
}
```

```ts
// src/node/assets/index.ts
export { hashFileContents, insertContentHash } from './hash'
export {
  buildAssetAbsoluteUrl,
  buildAssetPublicPath,
} from './emit-url'
export { resolveSafePath } from './safe-path'
export {
  buildContentAssetPath,
  contentAssetKey,
} from './content-path'
export { collectPackageDeclaredPaths } from './collect-package-refs'
export {
  assertNoRawHtmlRelativeAssets,
  extractMarkdownAssetRefs,
} from './markdown-assets'
export {
  buildGlobalAssetPath,
  collectGlobalOptionRefs,
  resolveGlobalAsset,
} from './global-pipeline'
export {
  buildThemeAssetPath,
  resolveThemeAsset,
} from './theme-pipeline'
export { AssetRegistry } from './registry'
export { compileAssets } from './compile-assets'
```

In `src/index.ts`, append:

```ts
export * from './node/assets/index'
```

Create fixture files with the tree above (small text payloads are fine for `webp`/`svg` names in tests).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/node/assets/compile-assets.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/assets.ts src/node/assets/compile-assets.ts src/node/assets/index.ts src/index.ts tests/node/assets/compile-assets.test.ts tests/fixtures/assets/compile
git commit -m "feat(assets): compile and write hashed content, global, and theme assets"
```

---

### Task 10: Integration coverage for base, failures, Home paths, and helper wiring

**Files:**
- Create: `tests/node/assets/asset-pipeline.integration.test.ts`
- Modify: `tests/helpers/asset-fixtures.ts` (add `compiledPackageToAssetSource` helper if needed)

**Interfaces:**
- Consumes: full Task 1–9 API
- Produces: integration confidence that Plan 04 acceptance rules hold together

- [ ] **Step 1: Write the failing integration tests**

```ts
// tests/node/assets/asset-pipeline.integration.test.ts
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
import { collectPackageDeclaredPaths } from '../../../src/node/assets/collect-package-refs'
import { compileAssets } from '../../../src/node/assets/compile-assets'
import { createResolveContentAsset } from '../../../src/client/assets/resolve-content-asset'
import { themeOptions } from '../../helpers/asset-fixtures'
import type { CompiledContentPackage } from '../../../src/shared/types'
import type { AssetPackageSource } from '../../../src/shared/types/assets'

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/assets/compile',
)

function toAssetSource(
  pkg: CompiledContentPackage,
  localeBody: string,
  localeFile: string,
): AssetPackageSource {
  return {
    packageDir: pkg.dir,
    type: pkg.manifest.type,
    slug: pkg.manifest.type === 'home' ? null : (pkg.manifest.slug ?? null),
    declaredPaths: collectPackageDeclaredPaths(pkg),
    localeMarkdown: [{ filePath: localeFile, body: localeBody }],
  }
}

describe('asset pipeline integration', () => {
  it('keeps assets locale-free while applying base and siteUrl', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-int-'))
    const homeDir = join(fixtureRoot, 'content/home')
    const releaseDir = join(fixtureRoot, 'content/releases/first-release')

    const homePkg: CompiledContentPackage = {
      dir: homeDir,
      identity: 'home',
      manifest: { type: 'home', draft: false },
    }
    const releasePkg: CompiledContentPackage = {
      dir: releaseDir,
      identity: 'release:first-release',
      manifest: {
        type: 'release',
        slug: 'first-release',
        date: '2026-08-11',
        draft: false,
        cover: './assets/cover.webp',
      },
    }

    const manifest = compileAssets({
      packages: [
        toAssetSource(
          homePkg,
          readFileSync(join(homeDir, 'zh.md'), 'utf8'),
          join(homeDir, 'zh.md'),
        ),
        toAssetSource(
          releasePkg,
          readFileSync(join(releaseDir, 'zh.md'), 'utf8'),
          join(releaseDir, 'zh.md'),
        ),
      ],
      themeOptions: themeOptions(),
      configDir: join(fixtureRoot, '.vuepress'),
      themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
      themeAssetPaths: ['./grid.svg'],
      base: '/docs/',
      destDir,
    })

    for (const asset of manifest.assets) {
      expect(asset.assetPath.startsWith('/assets/')).toBe(true)
      expect(asset.assetPath).not.toMatch(/\/zh\//)
      expect(asset.assetPath).not.toMatch(/\/en\//)
      expect(asset.publicPath.startsWith('/docs/assets/')).toBe(true)
      expect(asset.absoluteUrl.startsWith('https://synctrol.com/docs/assets/')).toBe(
        true,
      )
      expect(asset.assetPath).toMatch(/\.[0-9a-f]{8}\.[a-z0-9]+$/i)
    }

    const homeMap = manifest.contentPublicPaths.home
    const resolveContentAsset = createResolveContentAsset(homeMap)
    expect(resolveContentAsset('./assets/body.webp')).toMatch(
      /^\/docs\/assets\/content\/home\/body\.[0-9a-f]{8}\.webp$/,
    )

    expect(
      manifest.assets.some((asset) =>
        asset.assetPath.startsWith('/assets/content/home/'),
      ),
    ).toBe(true)
    expect(
      manifest.assets.some((asset) =>
        asset.assetPath.startsWith(
          '/assets/content/release/first-release/',
        ),
      ),
    ).toBe(true)
  })

  it('fails the build on missing content assets', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-missing-'))
    const homeDir = join(fixtureRoot, 'content/home')
    try {
      compileAssets({
        packages: [
          {
            packageDir: homeDir,
            type: 'home',
            slug: null,
            declaredPaths: ['./assets/does-not-exist.webp'],
            localeMarkdown: [],
          },
        ],
        themeOptions: themeOptions(),
        configDir: join(fixtureRoot, '.vuepress'),
        themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
        themeAssetPaths: [],
        base: '/',
        destDir,
      })
      expect.unreachable('expected missing asset failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(
          ['ASSET_MISSING', 'ASSET_CASE_MISMATCH'].includes(
            error.diagnostics[0]?.code ?? '',
          ),
        ).toBe(true)
      }
    }
  })

  it('fails the build on package path escape attempts', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-escape-'))
    const homeDir = join(fixtureRoot, 'content/home')
    try {
      compileAssets({
        packages: [
          {
            packageDir: homeDir,
            type: 'home',
            slug: null,
            declaredPaths: ['./assets/../../.vuepress/assets/logo.svg'],
            localeMarkdown: [],
          },
        ],
        themeOptions: themeOptions(),
        configDir: join(fixtureRoot, '.vuepress'),
        themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
        themeAssetPaths: [],
        base: '/',
        destDir,
      })
      expect.unreachable('expected escape failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_PATH_ESCAPE')
      }
    }
  })

  it('does not provide a stable-URL mode and always content-hashes', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-hash-'))
    const releaseDir = join(fixtureRoot, 'content/releases/first-release')
    const manifest = compileAssets({
      packages: [
        {
          packageDir: releaseDir,
          type: 'release',
          slug: 'first-release',
          declaredPaths: ['./assets/cover.webp'],
          localeMarkdown: [],
        },
      ],
      themeOptions: themeOptions(),
      configDir: join(fixtureRoot, '.vuepress'),
      themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
      themeAssetPaths: [],
      base: '/',
      destDir,
    })
    const cover = manifest.assets.find((asset) =>
      asset.sourcePath.endsWith('cover.webp'),
    )
    expect(cover?.assetPath).toMatch(
      /\/assets\/content\/release\/first-release\/cover\.[0-9a-f]{8}\.webp$/,
    )
    expect(cover?.assetPath).not.toBe(
      '/assets/content/release/first-release/cover.webp',
    )
  })
})
```

- [ ] **Step 2: Run the integration test**

Run: `npm test -- tests/node/assets/asset-pipeline.integration.test.ts`

Expected: PASS (depends on Tasks 1–9)

- [ ] **Step 3: Run the full Plan 04 suite**

Run: `npm test -- tests/node/assets tests/client/assets`

Expected: PASS for all Task 1–10 asset tests

- [ ] **Step 4: Commit**

```bash
git add tests/node/assets/asset-pipeline.integration.test.ts tests/helpers/asset-fixtures.ts
git commit -m "test(assets): add asset pipeline integration coverage for base and failures"
```

---

## Self-Review

**Spec coverage (Plan 04 Asset Pipeline only):**

| Spec area | Task |
| --- | --- |
| §12.1 content package → `/assets/content/{type}/{slug}/name.[hash].ext` | Tasks 3, 9, 10 |
| §12.1 Home → `/assets/content/home/…` (no slug) | Tasks 3, 9, 10 |
| §12.1 Markdown `![…](./assets/…)` relative to locale md | Tasks 5, 9, 10 |
| §12.1 reject raw HTML relative asset attributes | Tasks 5, 9, 10 |
| §12.1 `resolveContentAsset('./assets/x')` for Vue components | Tasks 8, 10 |
| §12.2 `.vuepress/assets` → `/assets/global/…` | Tasks 6, 9 |
| §12.2 theme assets → `/assets/theme/…` | Tasks 7, 9 |
| §12.2 social icons / `artworkPlaceholder` / `seo.defaultImage` / `seo.organization.logo` resolve relative to VuePress config into global hashed pipeline | Tasks 6, 9, 10 |
| §12.2 Background module imports are bundler theme assets | Task 7 (documented + excluded from `compileAssets`) |
| §12 rules: no locale prefix; always content hashes; no stable-URL option | Tasks 1, 9, 10 |
| §12 nested paths retained | Tasks 3, 6, 7 |
| §12 path escape prevention; missing/case-mismatch fail build | Tasks 2, 9, 10 |
| §12 VuePress `base` on public URLs; absolute URLs use `siteUrl` | Tasks 1, 6, 7, 9, 10 |
| §12 `.vuepress/public` only for fixed-name files | Task 9 |
| §11 `audio_player.src` package-relative audio enters content pipeline | Task 4 |
| §21/§24 cover/artwork/book covers collected as package refs | Task 4 |
| §31 missing referenced asset / path escaping build errors | Tasks 2, 10 |
| §32.1 asset path and emitted URL resolution unit tests | Tasks 1–8 |
| §32.2 missing assets fail (integration) | Task 10 |

**Explicitly out of scope (no tasks):** UI shell, Background `update`/`dispose` runtime, platform embed components/CSP JSON, SEO meta/`hreflang`/RSS/Sitemap writers, Release/News page components, root language router (Plan 03).

**Placeholder scan:** no TBD/TODO; every task includes concrete test code, implementation code, commands, expected results, and commits.

**Type consistency:** `ResolvedAsset`, `AssetManifest`, `AssetPackageSource`, `CompileAssetsOptions`, `AssetRegistry`, `compileAssets`, `resolveContentAsset` / `createResolveContentAsset`, and diagnostic codes `ASSET_PATH_ESCAPE` / `ASSET_MISSING` / `ASSET_CASE_MISMATCH` / `ASSET_RAW_HTML_RELATIVE` are shared across tasks without rename drift. Home identity is `home`; other packages use `{type}:{slug}` matching Plan 02.
