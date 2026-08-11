# Locale and Route Compiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compile locale-prefixed routes, draft/fallback publishing decisions, virtual collection pages, and the root language router from content packages and theme options.

**Architecture:** Pure Node compiler modules take Plan 02 `ContentPackage[]` plus Plan 01 theme options and emit a `CompiledSite` of pages with four URL layers (`routePath` / `outputPath` / `publicPath` / `absoluteUrl`). Locale negotiation is a shared pure function used by the root router script. Collection indexes, pagination, and tag archives are virtual pages derived from options (`urlSegment`, `index.enabled`, `pagination`) rather than source files. SEO meta emission, UI shell, platforms, and assets are out of scope; this plan only stamps the flags later plans consume (`isFallback`, `isDraft`, `noindex`, `canonicalLocale`, `bodyLocale`).

**Tech Stack:** TypeScript, Vitest, VuePress 2 theme package layout from Plan 01 (`vuepress-theme-synctrolling`), content package model from Plan 02.

## Global Constraints

- Package name: `vuepress-theme-synctrolling`
- VuePress 2 theme; Node compiler code lives under `src/node/`
- Shared types live under `src/shared/`; client-only root-router HTML generator may import shared locale helpers
- `mainLocale` is required; every content route includes a locale prefix; no content page is emitted without one
- `siteUrl` is required in production builds, has no trailing slash
- `urlSegment` values are scalar strings shared by every locale (never Multilanguage)
- Page-specific `path` is opaque: the theme does not inspect it for locale-like segments
- Home always uses `/{locale}/` and cannot be remapped
- `showDrafts` defaults to `false`
- Default `release.urlSegment` is `releases`; default `news.urlSegment` is `news`; default `news.tags.urlSegment` is `tags`
- Default pagination for release/news indexes is `12`; `false` means one unpaginated list
- Tests run with `pnpm exec vitest run <path>`
- Plan 01 and Plan 02 are assumed complete: shared types, option defaults, Vitest harness, content discovery, YAML schemas, diagnostics

## File Structure

| File | Responsibility |
| --- | --- |
| `src/shared/types/routes.ts` | Route/page identity types, `UrlLayers`, `CompiledPage`, `CompiledSite` |
| `src/shared/url/normalize-path.ts` | Join/normalize path segments with leading/trailing slash rules |
| `src/node/url/site-url.ts` | Validate `siteUrl` (required, no trailing slash) |
| `src/node/url/build-url-layers.ts` | Build `routePath` / `outputPath` / `publicPath` / `absoluteUrl` |
| `src/node/url/validate-segment.ts` | Validate scalar URL segments (slug, tag, urlSegment) |
| `src/node/url/resolve-path-suffix.ts` | Resolve detail path suffix from page `path` or type defaults (opaque) |
| `src/node/locale/match-browser-locale.ts` | Browser-language negotiation used by root router |
| `src/node/publishing/package-availability.ts` | Normal package draft/fallback/skip matrix |
| `src/node/publishing/home-availability.ts` | Home publishing matrix overrides |
| `src/node/routes/detail-routes.ts` | Emit locale detail/home pages including fallbacks |
| `src/node/routes/collection-routes.ts` | Emit release/news indexes, pagination, tag archives |
| `src/node/routes/detect-collisions.ts` | Fail build on duplicate final `routePath` |
| `src/node/routes/compile-site-routes.ts` | Orchestrate availability → details → collections → collisions |
| `src/node/root-router/generate-root-html.ts` | Emit `<dest>/index.html` root language router markup + inline script |
| `tests/node/url/*.test.ts` | URL layer and segment tests |
| `tests/node/locale/*.test.ts` | Locale negotiation tests |
| `tests/node/publishing/*.test.ts` | Draft/fallback/Home matrix tests |
| `tests/node/routes/*.test.ts` | Detail, collection, collision, orchestrator tests |
| `tests/node/root-router/*.test.ts` | Root router HTML/script tests |
| `tests/helpers/route-fixtures.ts` | Minimal theme options + package fixtures for this plan |

**Prerequisite types from Plan 01/02 (do not redefine; import):**

```ts
// src/shared/types.ts (Plan 01)
export type LocaleKey = string
export type ContentType = 'home' | 'release' | 'news' | 'page'
export type Multilanguage = string | Record<LocaleKey, string>
export type LocalePath = string | Partial<Record<LocaleKey, string>>

export interface LocaleMessages {
  draft: string
  translationUnavailable: string
  // … remaining keys from spec §7.1
}

export interface LocaleOptions {
  lang: string
  label: string
  dateFormat?: Intl.DateTimeFormatOptions
  messages: LocaleMessages
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

export interface NewsOptions {
  urlSegment: string
  index: {
    enabled: boolean
    pagination: number | false
  }
  tags: {
    urlSegment: string
    index: { enabled: boolean }
  }
}

export interface SynctrolThemeOptions {
  siteUrl: string
  definitionsPath?: string
  mainLocale: LocaleKey
  locales: Record<LocaleKey, LocaleOptions>
  showDrafts?: boolean
  release?: ReleaseOptions
  news?: NewsOptions
  // other fields exist but are unused by this plan
}

// src/node/content/types.ts (Plan 02)
export interface LocaleMarkdown {
  filePath: string
  title: string
  description?: string
  draft: boolean
  body: string
}

export interface ContentPackage {
  packagePath: string
  type: ContentType
  slug: string | null
  date?: string
  updated?: string
  draft: boolean
  cover?: string
  artwork?: string
  path?: LocalePath
  tags?: string[]
  locales: Partial<Record<LocaleKey, LocaleMarkdown>>
}

export interface Diagnostic {
  level: 'error' | 'warning'
  code: string
  message: string
  path?: string
}
```

---

### Task 1: Four-layer URL builder and `siteUrl` validation

**Files:**
- Create: `src/shared/types/routes.ts`
- Create: `src/shared/url/normalize-path.ts`
- Create: `src/node/url/site-url.ts`
- Create: `src/node/url/build-url-layers.ts`
- Create: `tests/helpers/route-fixtures.ts`
- Create: `tests/node/url/build-url-layers.test.ts`
- Create: `tests/node/url/site-url.test.ts`

**Interfaces:**
- Consumes: Plan 01 `SynctrolThemeOptions.siteUrl`; VuePress `base` string
- Produces: `UrlLayers`; `normalizePathSuffix(suffix: string): string`; `buildUrlLayers(input: BuildUrlLayersInput): UrlLayers`; `assertSiteUrl(siteUrl: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/url/site-url.test.ts
import { describe, expect, it } from 'vitest'
import { assertSiteUrl } from '../../../src/node/url/site-url'

describe('assertSiteUrl', () => {
  it('accepts an origin without trailing slash', () => {
    expect(assertSiteUrl('https://synctrol.com')).toBe('https://synctrol.com')
  })

  it('rejects empty siteUrl', () => {
    expect(() => assertSiteUrl('')).toThrow(/siteUrl/i)
  })

  it('rejects trailing slash', () => {
    expect(() => assertSiteUrl('https://synctrol.com/')).toThrow(/trailing slash/i)
  })

  it('rejects non-absolute http(s) origins', () => {
    expect(() => assertSiteUrl('/synctrol.com')).toThrow(/absolute/i)
    expect(() => assertSiteUrl('ftp://synctrol.com')).toThrow(/https?/i)
  })
})
```

```ts
// tests/node/url/build-url-layers.test.ts
import { describe, expect, it } from 'vitest'
import { buildUrlLayers } from '../../../src/node/url/build-url-layers'
import { normalizePathSuffix } from '../../../src/shared/url/normalize-path'

describe('normalizePathSuffix', () => {
  it('ensures leading and trailing slash', () => {
    expect(normalizePathSuffix('releases/foo')).toBe('/releases/foo/')
    expect(normalizePathSuffix('/releases/foo/')).toBe('/releases/foo/')
    expect(normalizePathSuffix('/')).toBe('/')
  })
})

describe('buildUrlLayers', () => {
  it('builds four layers for a locale-prefixed detail route with root base', () => {
    const layers = buildUrlLayers({
      locale: 'zh',
      pathSuffix: '/releases/first-release/',
      base: '/',
      siteUrl: 'https://synctrol.com',
    })
    expect(layers).toEqual({
      routePath: '/zh/releases/first-release/',
      outputPath: 'zh/releases/first-release/index.html',
      publicPath: '/zh/releases/first-release/',
      absoluteUrl: 'https://synctrol.com/zh/releases/first-release/',
    })
  })

  it('includes a non-root VuePress base in publicPath and absoluteUrl only', () => {
    const layers = buildUrlLayers({
      locale: 'en',
      pathSuffix: '/',
      base: '/docs/',
      siteUrl: 'https://example.com',
    })
    expect(layers).toEqual({
      routePath: '/en/',
      outputPath: 'en/index.html',
      publicPath: '/docs/en/',
      absoluteUrl: 'https://example.com/docs/en/',
    })
  })

  it('does not put VuePress base into routePath', () => {
    const layers = buildUrlLayers({
      locale: 'zh',
      pathSuffix: '/news/',
      base: '/site/',
      siteUrl: 'https://synctrol.com',
    })
    expect(layers.routePath).toBe('/zh/news/')
    expect(layers.publicPath).toBe('/site/zh/news/')
  })
})
```

```ts
// tests/helpers/route-fixtures.ts
import type {
  ContentPackage,
  LocaleKey,
  LocaleMarkdown,
  LocaleOptions,
  SynctrolThemeOptions,
} from '../../src/shared/types'

export function localeMarkdown(
  overrides: Partial<LocaleMarkdown> & Pick<LocaleMarkdown, 'title'> = {
    title: 'Title',
  },
): LocaleMarkdown {
  return {
    filePath: overrides.filePath ?? 'zh.md',
    title: overrides.title,
    description: overrides.description,
    draft: overrides.draft ?? false,
    body: overrides.body ?? 'Body',
  }
}

export function baseLocales(): Record<LocaleKey, LocaleOptions> {
  return {
    zh: {
      lang: 'zh-CN',
      label: '中文',
      messages: {
        draft: '草稿',
        translationUnavailable: '本文尚无中文译本，正在显示原文。',
      } as LocaleOptions['messages'],
    },
    en: {
      lang: 'en-US',
      label: 'English',
      messages: {
        draft: 'Draft',
        translationUnavailable:
          'This article is not yet available in English. Showing the original version.',
      } as LocaleOptions['messages'],
    },
  }
}

export function themeOptions(
  overrides: Partial<SynctrolThemeOptions> = {},
): SynctrolThemeOptions {
  return {
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    locales: baseLocales(),
    showDrafts: false,
    release: {
      urlSegment: 'releases',
      index: {
        enabled: true,
        pagination: 12,
        mobileGridColumns: 2,
        desktopGridColumns: 3,
      },
    },
    news: {
      urlSegment: 'news',
      index: { enabled: true, pagination: 12 },
      tags: { urlSegment: 'tags', index: { enabled: true } },
    },
    ...overrides,
    locales: overrides.locales ?? baseLocales(),
    release: overrides.release ?? {
      urlSegment: 'releases',
      index: {
        enabled: true,
        pagination: 12,
        mobileGridColumns: 2,
        desktopGridColumns: 3,
      },
    },
    news: overrides.news ?? {
      urlSegment: 'news',
      index: { enabled: true, pagination: 12 },
      tags: { urlSegment: 'tags', index: { enabled: true } },
    },
  }
}

export function releasePackage(
  overrides: Partial<ContentPackage> = {},
): ContentPackage {
  return {
    packagePath: 'content/releases/first-release',
    type: 'release',
    slug: 'first-release',
    date: '2026-08-11',
    draft: false,
    locales: {
      zh: localeMarkdown({ title: '第一张专辑', filePath: 'zh.md' }),
      en: localeMarkdown({ title: 'First Album', filePath: 'en.md' }),
    },
    ...overrides,
    locales: overrides.locales ?? {
      zh: localeMarkdown({ title: '第一张专辑', filePath: 'zh.md' }),
      en: localeMarkdown({ title: 'First Album', filePath: 'en.md' }),
    },
  }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/node/url/site-url.test.ts tests/node/url/build-url-layers.test.ts`

Expected: FAIL with module not found or `assertSiteUrl` / `buildUrlLayers` not defined

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/types/routes.ts
import type { ContentType, LocaleKey } from '../types'

export interface UrlLayers {
  /** Locale-prefixed router path without origin or VuePress base. */
  routePath: string
  /** File path below VuePress dest; directory routes use index.html. */
  outputPath: string
  /** VuePress base + routePath, used by browser links. */
  publicPath: string
  /** siteUrl origin + publicPath, used by canonical/OG/RSS later. */
  absoluteUrl: string
}

export type GeneratedCollectionIdentity =
  | 'release-index'
  | `release-page:${number}`
  | 'news-index'
  | `news-page:${number}`
  | 'news-tags-index'
  | `news-tag:${string}`
  | `news-tag:${string}:page:${number}`

export type ContentIdentity =
  | 'home'
  | `release:${string}`
  | `news:${string}`
  | `page:${string}`

export type PageIdentity = ContentIdentity | GeneratedCollectionIdentity

export interface BuildUrlLayersInput {
  locale: LocaleKey
  /** Type/default or page-specific suffix, already normalized with leading+trailing `/`. */
  pathSuffix: string
  base: string
  siteUrl: string
}

export interface CompiledPage {
  identity: PageIdentity
  locale: LocaleKey
  contentType: ContentType | 'release-collection' | 'news-collection'
  url: UrlLayers
  isFallback: boolean
  isDraft: boolean
  noindex: boolean
  /** Locale whose Markdown body is rendered. */
  bodyLocale: LocaleKey
  /** Locale used as canonical when fallback; otherwise equals `locale`. */
  canonicalLocale: LocaleKey
  packagePath?: string
  slug?: string | null
  title: string
  description?: string
  /** Present for collection pages. */
  collection?: {
    page: number
    pageCount: number
    itemIdentities: ContentIdentity[]
    tag?: string
  }
}

export interface CompiledSite {
  pages: CompiledPage[]
  diagnostics: import('../../node/content/types').Diagnostic[]
  rootRouterHtml: string
}
```

```ts
// src/shared/url/normalize-path.ts
export function normalizePathSuffix(suffix: string): string {
  if (suffix === '' || suffix === '/') return '/'
  const withLeading = suffix.startsWith('/') ? suffix : `/${suffix}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

export function normalizeBase(base: string): string {
  if (!base || base === '/') return '/'
  const withLeading = base.startsWith('/') ? base : `/${base}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

export function joinPublicPath(base: string, routePath: string): string {
  const b = normalizeBase(base)
  const r = routePath.startsWith('/') ? routePath : `/${routePath}`
  if (b === '/') return r
  return `${b.slice(0, -1)}${r}`
}
```

```ts
// src/node/url/site-url.ts
export function assertSiteUrl(siteUrl: string): string {
  if (!siteUrl) {
    throw new Error('siteUrl is required')
  }
  if (siteUrl.endsWith('/')) {
    throw new Error('siteUrl must not have a trailing slash')
  }
  let url: URL
  try {
    url = new URL(siteUrl)
  } catch {
    throw new Error('siteUrl must be an absolute URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('siteUrl must use http or https')
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('siteUrl must be an origin without path, query, or hash')
  }
  return siteUrl
}
```

```ts
// src/node/url/build-url-layers.ts
import type { BuildUrlLayersInput, UrlLayers } from '../../shared/types/routes'
import {
  joinPublicPath,
  normalizeBase,
  normalizePathSuffix,
} from '../../shared/url/normalize-path'
import { assertSiteUrl } from './site-url'

export function buildUrlLayers(input: BuildUrlLayersInput): UrlLayers {
  const siteUrl = assertSiteUrl(input.siteUrl)
  const pathSuffix = normalizePathSuffix(input.pathSuffix)
  const routePath =
    pathSuffix === '/'
      ? `/${input.locale}/`
      : `/${input.locale}${pathSuffix}`
  const outputPath = `${routePath.slice(1)}index.html`
  const publicPath = joinPublicPath(normalizeBase(input.base), routePath)
  const absoluteUrl = `${siteUrl}${publicPath}`
  return { routePath, outputPath, publicPath, absoluteUrl }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/url/site-url.test.ts tests/node/url/build-url-layers.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/routes.ts src/shared/url/normalize-path.ts src/node/url/site-url.ts src/node/url/build-url-layers.ts tests/helpers/route-fixtures.ts tests/node/url/site-url.test.ts tests/node/url/build-url-layers.test.ts
git commit -m "feat(routes): add four-layer URL builder and siteUrl validation"
```

---

### Task 2: URL segment validation and opaque path-suffix resolution

**Files:**
- Create: `src/node/url/validate-segment.ts`
- Create: `src/node/url/resolve-path-suffix.ts`
- Create: `tests/node/url/validate-segment.test.ts`
- Create: `tests/node/url/resolve-path-suffix.test.ts`

**Interfaces:**
- Consumes: `LocalePath`, `ContentPackage`, `ReleaseOptions.urlSegment`, `NewsOptions.urlSegment`, `normalizePathSuffix`
- Produces: `assertUrlSegment(segment: string, label: string): string`; `encodePathSegment(value: string): string`; `resolveDetailPathSuffix(pkg: ContentPackage, locale: LocaleKey, options: { release: ReleaseOptions; news: NewsOptions }): string`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/url/validate-segment.test.ts
import { describe, expect, it } from 'vitest'
import {
  assertUrlSegment,
  encodePathSegment,
} from '../../../src/node/url/validate-segment'

describe('assertUrlSegment', () => {
  it('accepts a simple segment', () => {
    expect(assertUrlSegment('releases', 'release.urlSegment')).toBe('releases')
  })

  it('rejects empty, slash, query, hash, dot, and dot-dot', () => {
    for (const bad of ['', 'a/b', 'a?b', 'a#b', '.', '..', 'rel/eases']) {
      expect(() => assertUrlSegment(bad, 'segment')).toThrow(/segment/i)
    }
  })
})

describe('encodePathSegment', () => {
  it('percent-encodes tag keys as a single segment', () => {
    expect(encodePathSegment('作品发布')).toBe(encodeURIComponent('作品发布'))
    expect(encodePathSegment('a/b')).toBe('a%2Fb')
  })
})
```

```ts
// tests/node/url/resolve-path-suffix.test.ts
import { describe, expect, it } from 'vitest'
import { resolveDetailPathSuffix } from '../../../src/node/url/resolve-path-suffix'
import { releasePackage, themeOptions } from '../../helpers/route-fixtures'

describe('resolveDetailPathSuffix', () => {
  const options = themeOptions()

  it('uses type default for release/news/page/home', () => {
    expect(
      resolveDetailPathSuffix(releasePackage(), 'zh', options),
    ).toBe('/releases/first-release/')
    expect(
      resolveDetailPathSuffix(
        { ...releasePackage(), type: 'news', slug: 'hello', packagePath: 'content/news/hello' },
        'en',
        options,
      ),
    ).toBe('/news/hello/')
    expect(
      resolveDetailPathSuffix(
        {
          packagePath: 'content/pages/about',
          type: 'page',
          slug: 'about',
          draft: false,
          locales: {},
        },
        'zh',
        options,
      ),
    ).toBe('/about/')
    expect(
      resolveDetailPathSuffix(
        {
          packagePath: 'content/home',
          type: 'home',
          slug: null,
          draft: false,
          locales: {},
        },
        'zh',
        options,
      ),
    ).toBe('/')
  })

  it('applies scalar path to every locale without inspecting locale-like segments', () => {
    const pkg = releasePackage({ path: '/zh/test/' })
    expect(resolveDetailPathSuffix(pkg, 'zh', options)).toBe('/zh/test/')
    expect(resolveDetailPathSuffix(pkg, 'en', options)).toBe('/zh/test/')
  })

  it('uses only the explicitly configured locale entry from a path map', () => {
    const pkg = releasePackage({
      path: { zh: '/custom/zh-only/', en: '/custom/en-only/' },
    })
    expect(resolveDetailPathSuffix(pkg, 'zh', options)).toBe('/custom/zh-only/')
    expect(resolveDetailPathSuffix(pkg, 'en', options)).toBe('/custom/en-only/')
  })

  it('falls back to type default when a locale is missing from the path map (never main locale path)', () => {
    const pkg = releasePackage({
      path: { zh: '/only-zh/' },
    })
    expect(resolveDetailPathSuffix(pkg, 'en', options)).toBe(
      '/releases/first-release/',
    )
  })

  it('rejects path values that lack leading/trailing slash, contain query/hash, or empty segments', () => {
    expect(() =>
      resolveDetailPathSuffix(releasePackage({ path: 'no-slash' }), 'zh', options),
    ).toThrow(/begin and end with \//i)
    expect(() =>
      resolveDetailPathSuffix(releasePackage({ path: '/a?x/' }), 'zh', options),
    ).toThrow(/query|hash/i)
    expect(() =>
      resolveDetailPathSuffix(releasePackage({ path: '/a//b/' }), 'zh', options),
    ).toThrow(/empty segment/i)
  })

  it('allows ordinary repeated names such as /zh/zh/test/', () => {
    expect(
      resolveDetailPathSuffix(releasePackage({ path: '/zh/zh/test/' }), 'zh', options),
    ).toBe('/zh/zh/test/')
  })

  it('forbids remapping home', () => {
    expect(() =>
      resolveDetailPathSuffix(
        {
          packagePath: 'content/home',
          type: 'home',
          slug: null,
          draft: false,
          path: '/anywhere/',
          locales: {},
        },
        'zh',
        options,
      ),
    ).toThrow(/home/i)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/node/url/validate-segment.test.ts tests/node/url/resolve-path-suffix.test.ts`

Expected: FAIL with modules not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/url/validate-segment.ts
const INVALID = new Set(['', '.', '..'])

export function assertUrlSegment(segment: string, label: string): string {
  if (
    INVALID.has(segment) ||
    segment.includes('/') ||
    segment.includes('?') ||
    segment.includes('#')
  ) {
    throw new Error(`Invalid URL ${label}: ${JSON.stringify(segment)}`)
  }
  return segment
}

/** RFC 3986 percent-encoding for a single path segment (slug or tag). */
export function encodePathSegment(value: string): string {
  return encodeURIComponent(value)
}
```

```ts
// src/node/url/resolve-path-suffix.ts
import type {
  ContentPackage,
  LocaleKey,
  LocalePath,
  NewsOptions,
  ReleaseOptions,
  SynctrolThemeOptions,
} from '../../shared/types'
import { normalizePathSuffix } from '../../shared/url/normalize-path'
import { assertUrlSegment, encodePathSegment } from './validate-segment'

function assertPathValue(path: string): string {
  if (!path.startsWith('/') || !path.endsWith('/')) {
    throw new Error('Page-specific paths must begin and end with /')
  }
  if (path.includes('?') || path.includes('#')) {
    throw new Error('Page-specific paths cannot contain query or hash')
  }
  const inner = path.slice(1, -1)
  if (inner.includes('//') || (inner === '' && path !== '/')) {
    throw new Error('Page-specific paths cannot contain empty segments')
  }
  if (inner) {
    for (const part of inner.split('/')) {
      if (!part || part === '.' || part === '..') {
        throw new Error('Page-specific paths cannot contain empty segments')
      }
    }
  }
  return path
}

function typeDefaultSuffix(
  pkg: ContentPackage,
  options: Pick<SynctrolThemeOptions, 'release' | 'news'>,
): string {
  if (pkg.type === 'home') return '/'
  const slug = pkg.slug
  if (!slug) throw new Error(`Missing slug for ${pkg.type} package ${pkg.packagePath}`)
  const encoded = encodePathSegment(assertUrlSegment(slug, 'slug'))
  if (pkg.type === 'release') {
    const segment = assertUrlSegment(
      options.release!.urlSegment,
      'release.urlSegment',
    )
    return `/${segment}/${encoded}/`
  }
  if (pkg.type === 'news') {
    const segment = assertUrlSegment(options.news!.urlSegment, 'news.urlSegment')
    return `/${segment}/${encoded}/`
  }
  return `/${encoded}/`
}

function localePathEntry(path: LocalePath, locale: LocaleKey): string | undefined {
  if (typeof path === 'string') return path
  return path[locale]
}

export function resolveDetailPathSuffix(
  pkg: ContentPackage,
  locale: LocaleKey,
  options: Pick<SynctrolThemeOptions, 'release' | 'news'>,
): string {
  if (pkg.type === 'home') {
    if (pkg.path !== undefined) {
      throw new Error('Home always uses / and cannot be remapped')
    }
    return '/'
  }

  if (pkg.path !== undefined) {
    const entry = localePathEntry(pkg.path, locale)
    if (entry !== undefined) {
      return normalizePathSuffix(assertPathValue(entry))
    }
  }

  return normalizePathSuffix(typeDefaultSuffix(pkg, options))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/url/validate-segment.test.ts tests/node/url/resolve-path-suffix.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/url/validate-segment.ts src/node/url/resolve-path-suffix.ts tests/node/url/validate-segment.test.ts tests/node/url/resolve-path-suffix.test.ts
git commit -m "feat(routes): validate URL segments and resolve opaque path suffixes"
```

---

### Task 3: Browser locale negotiation

**Files:**
- Create: `src/node/locale/match-browser-locale.ts`
- Create: `tests/node/locale/match-browser-locale.test.ts`

**Interfaces:**
- Consumes: `Record<LocaleKey, LocaleOptions>`, `mainLocale`
- Produces: `matchBrowserLocale(preferences: readonly string[], locales: Record<LocaleKey, LocaleOptions>, mainLocale: LocaleKey): LocaleKey`; `normalizeLanguageTag(tag: string): { full: string; primary: string }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/locale/match-browser-locale.test.ts
import { describe, expect, it } from 'vitest'
import { matchBrowserLocale } from '../../../src/node/locale/match-browser-locale'
import { baseLocales } from '../../helpers/route-fixtures'

describe('matchBrowserLocale', () => {
  const locales = baseLocales()

  it('matches exact locale key (case-insensitive, underscore normalized)', () => {
    expect(matchBrowserLocale(['EN'], locales, 'zh')).toBe('en')
    expect(matchBrowserLocale(['zh_CN'], locales, 'en')).toBe('zh')
  })

  it('matches exact configured lang', () => {
    expect(matchBrowserLocale(['zh-CN'], locales, 'en')).toBe('zh')
    expect(matchBrowserLocale(['en-US'], locales, 'zh')).toBe('en')
  })

  it('matches primary language subtag against locale key then lang', () => {
    expect(matchBrowserLocale(['en-GB'], locales, 'zh')).toBe('en')
    expect(matchBrowserLocale(['zh-TW'], locales, 'en')).toBe('zh')
  })

  it('walks preferences in order and uses configuration order for ties', () => {
    expect(matchBrowserLocale(['fr', 'en', 'zh'], locales, 'zh')).toBe('en')
  })

  it('falls back to mainLocale when nothing matches', () => {
    expect(matchBrowserLocale(['fr-FR', 'de'], locales, 'zh')).toBe('zh')
    expect(matchBrowserLocale([], locales, 'en')).toBe('en')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/locale/match-browser-locale.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/locale/match-browser-locale.ts
import type { LocaleKey, LocaleOptions } from '../../shared/types'

export function normalizeLanguageTag(tag: string): { full: string; primary: string } {
  const full = tag.trim().toLowerCase().replace(/_/g, '-')
  const primary = full.split('-')[0] ?? full
  return { full, primary }
}

export function matchBrowserLocale(
  preferences: readonly string[],
  locales: Record<LocaleKey, LocaleOptions>,
  mainLocale: LocaleKey,
): LocaleKey {
  const entries = Object.entries(locales) as [LocaleKey, LocaleOptions][]

  for (const preference of preferences) {
    const { full, primary } = normalizeLanguageTag(preference)

    for (const [key] of entries) {
      if (normalizeLanguageTag(key).full === full) return key
    }
    for (const [key, options] of entries) {
      if (normalizeLanguageTag(options.lang).full === full) return key
    }
    for (const [key] of entries) {
      if (normalizeLanguageTag(key).primary === primary) return key
    }
    for (const [key, options] of entries) {
      if (normalizeLanguageTag(options.lang).primary === primary) return key
    }
  }

  return mainLocale
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/locale/match-browser-locale.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/locale/match-browser-locale.ts tests/node/locale/match-browser-locale.test.ts
git commit -m "feat(locale): add browser-language negotiation matcher"
```

---

### Task 4: Normal package draft and fallback availability

**Files:**
- Create: `src/node/publishing/package-availability.ts`
- Create: `tests/node/publishing/package-availability.test.ts`

**Interfaces:**
- Consumes: `ContentPackage`, `mainLocale`, `showDrafts`, `LocaleKey`
- Produces: `PackageLocaleDecision` (`skip-package` | `skip-locale` | `publish` | `fallback`); `decidePackageAvailability(pkg, ctx): { packageDecision, locales, diagnostics }`

Rules (spec §9.1–9.2, excluding Home):

| Condition | Behavior |
| --- | --- |
| `content.yml` `draft: true` and `showDrafts: false` | Skip all locale pages without warning |
| Main-locale Markdown absent or draft (and not shown via `showDrafts`) | Warn and skip entire package |
| Non-main Markdown absent or draft (and not shown) | Emit target-locale route using main-locale body (fallback) |
| `showDrafts: true` | Generate drafts; locale draft displays its own body, not fallback |
| All locales unavailable | Warn and skip |

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/publishing/package-availability.test.ts
import { describe, expect, it } from 'vitest'
import { decidePackageAvailability } from '../../../src/node/publishing/package-availability'
import { localeMarkdown, releasePackage } from '../../helpers/route-fixtures'

describe('decidePackageAvailability', () => {
  const ctx = { mainLocale: 'zh' as const, showDrafts: false, localeKeys: ['zh', 'en'] }

  it('skips a manifest draft package without warning when showDrafts is false', () => {
    const result = decidePackageAvailability(releasePackage({ draft: true }), ctx)
    expect(result.packageDecision).toBe('skip-package')
    expect(result.diagnostics).toEqual([])
    expect(result.locales).toEqual({})
  })

  it('warns and skips when main locale markdown is missing', () => {
    const result = decidePackageAvailability(
      releasePackage({
        locales: { en: localeMarkdown({ title: 'EN', filePath: 'en.md' }) },
      }),
      ctx,
    )
    expect(result.packageDecision).toBe('skip-package')
    expect(result.diagnostics[0]?.level).toBe('warning')
  })

  it('warns and skips when main locale markdown is draft', () => {
    const result = decidePackageAvailability(
      releasePackage({
        locales: {
          zh: localeMarkdown({ title: 'ZH', draft: true }),
          en: localeMarkdown({ title: 'EN', filePath: 'en.md' }),
        },
      }),
      ctx,
    )
    expect(result.packageDecision).toBe('skip-package')
    expect(result.diagnostics.some((d) => d.level === 'warning')).toBe(true)
  })

  it('marks non-main missing locale as fallback using main body', () => {
    const result = decidePackageAvailability(
      releasePackage({
        locales: { zh: localeMarkdown({ title: 'ZH', filePath: 'zh.md' }) },
      }),
      ctx,
    )
    expect(result.packageDecision).toBe('publish')
    expect(result.locales.zh).toMatchObject({ kind: 'publish', isDraft: false })
    expect(result.locales.en).toMatchObject({
      kind: 'fallback',
      bodyLocale: 'zh',
      isDraft: false,
    })
    expect(result.diagnostics.some((d) => d.code === 'locale-fallback')).toBe(true)
  })

  it('marks non-main draft locale as fallback when showDrafts is false', () => {
    const result = decidePackageAvailability(
      releasePackage({
        locales: {
          zh: localeMarkdown({ title: 'ZH' }),
          en: localeMarkdown({ title: 'EN', draft: true, filePath: 'en.md' }),
        },
      }),
      ctx,
    )
    expect(result.locales.en?.kind).toBe('fallback')
  })

  it('publishes locale drafts as real drafts when showDrafts is true', () => {
    const result = decidePackageAvailability(
      releasePackage({
        draft: true,
        locales: {
          zh: localeMarkdown({ title: 'ZH', draft: true }),
          en: localeMarkdown({ title: 'EN', draft: true, filePath: 'en.md' }),
        },
      }),
      { ...ctx, showDrafts: true },
    )
    expect(result.packageDecision).toBe('publish')
    expect(result.locales.zh).toMatchObject({ kind: 'publish', isDraft: true })
    expect(result.locales.en).toMatchObject({ kind: 'publish', isDraft: true })
  })

  it('uses actual non-main draft body when showDrafts is true instead of fallback', () => {
    const result = decidePackageAvailability(
      releasePackage({
        locales: {
          zh: localeMarkdown({ title: 'ZH' }),
          en: localeMarkdown({ title: 'EN draft', draft: true, filePath: 'en.md' }),
        },
      }),
      { ...ctx, showDrafts: true },
    )
    expect(result.locales.en).toMatchObject({
      kind: 'publish',
      isDraft: true,
      bodyLocale: 'en',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/publishing/package-availability.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/publishing/package-availability.ts
import type { ContentPackage, LocaleKey } from '../../shared/types'
import type { Diagnostic } from '../content/types'

export type LocalePublishKind = 'publish' | 'fallback'

export interface LocaleAvailability {
  kind: LocalePublishKind
  bodyLocale: LocaleKey
  isDraft: boolean
  title: string
  description?: string
}

export interface PackageAvailabilityResult {
  packageDecision: 'publish' | 'skip-package'
  locales: Partial<Record<LocaleKey, LocaleAvailability>>
  diagnostics: Diagnostic[]
}

export interface AvailabilityContext {
  mainLocale: LocaleKey
  showDrafts: boolean
  localeKeys: LocaleKey[]
}

function isLocaleUsable(
  pkg: ContentPackage,
  locale: LocaleKey,
  showDrafts: boolean,
): boolean {
  const md = pkg.locales[locale]
  if (!md) return false
  if (md.draft && !showDrafts) return false
  return true
}

export function decidePackageAvailability(
  pkg: ContentPackage,
  ctx: AvailabilityContext,
): PackageAvailabilityResult {
  const diagnostics: Diagnostic[] = []

  if (pkg.type === 'home') {
    throw new Error('Use decideHomeAvailability for home packages')
  }

  if (pkg.draft && !ctx.showDrafts) {
    return { packageDecision: 'skip-package', locales: {}, diagnostics: [] }
  }

  const mainMd = pkg.locales[ctx.mainLocale]
  const mainUsable = isLocaleUsable(pkg, ctx.mainLocale, ctx.showDrafts)
  if (!mainUsable) {
    diagnostics.push({
      level: 'warning',
      code: 'main-locale-unavailable',
      message: `Skipping ${pkg.packagePath}: main locale (${ctx.mainLocale}) markdown is absent or draft`,
      path: pkg.packagePath,
    })
    return { packageDecision: 'skip-package', locales: {}, diagnostics }
  }

  const locales: Partial<Record<LocaleKey, LocaleAvailability>> = {}
  const manifestDraft = pkg.draft && ctx.showDrafts

  for (const locale of ctx.localeKeys) {
    const md = pkg.locales[locale]
    if (locale === ctx.mainLocale) {
      locales[locale] = {
        kind: 'publish',
        bodyLocale: locale,
        isDraft: Boolean(md!.draft || manifestDraft),
        title: md!.title,
        description: md!.description,
      }
      continue
    }

    if (isLocaleUsable(pkg, locale, ctx.showDrafts) && md) {
      locales[locale] = {
        kind: 'publish',
        bodyLocale: locale,
        isDraft: Boolean(md.draft || manifestDraft),
        title: md.title,
        description: md.description,
      }
      continue
    }

    diagnostics.push({
      level: 'warning',
      code: 'locale-fallback',
      message: `Generating fallback for ${pkg.packagePath} locale ${locale}`,
      path: pkg.packagePath,
    })
    locales[locale] = {
      kind: 'fallback',
      bodyLocale: ctx.mainLocale,
      isDraft: false,
      title: mainMd!.title,
      description: mainMd!.description,
    }
  }

  if (Object.keys(locales).length === 0) {
    diagnostics.push({
      level: 'warning',
      code: 'all-locales-unavailable',
      message: `Skipping ${pkg.packagePath}: all locales unavailable`,
      path: pkg.packagePath,
    })
    return { packageDecision: 'skip-package', locales: {}, diagnostics }
  }

  return { packageDecision: 'publish', locales, diagnostics }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/publishing/package-availability.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/publishing/package-availability.ts tests/node/publishing/package-availability.test.ts
git commit -m "feat(publishing): implement normal package draft and fallback matrix"
```

---

### Task 5: Home publishing matrix

**Files:**
- Create: `src/node/publishing/home-availability.ts`
- Create: `tests/node/publishing/home-availability.test.ts`

**Interfaces:**
- Consumes: `ContentPackage` with `type: 'home'`, `AvailabilityContext`
- Produces: `decideHomeAvailability(pkg, ctx): PackageAvailabilityResult` — errors (not warnings) when no publishable Home exists

Home matrix (spec §9.3):

| `showDrafts` | Manifest draft | Main Markdown | Result |
| --- | --- | --- | --- |
| `false` | `false` | Published | Build Home normally |
| `false` | `true` | Any | Build error: no publishable Home |
| `false` | `false` | Missing or draft | Build error: no publishable main-locale Home |
| `true` | `false` or `true` | Published or draft | Build Home; draft badge when either source is draft |
| `true` | Any | Missing | Build error: Home content is absent |

With usable main Home, missing non-main Markdown generates normal fallback Home. Present non-main draft displays its actual draft when `showDrafts` is enabled.

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/publishing/home-availability.test.ts
import { describe, expect, it } from 'vitest'
import { decideHomeAvailability } from '../../../src/node/publishing/home-availability'
import { localeMarkdown } from '../../helpers/route-fixtures'
import type { ContentPackage } from '../../../src/shared/types'

function homePackage(overrides: Partial<ContentPackage> = {}): ContentPackage {
  return {
    packagePath: 'content/home',
    type: 'home',
    slug: null,
    draft: false,
    locales: {
      zh: localeMarkdown({ title: '首页', description: '主页' }),
      en: localeMarkdown({ title: 'Home', description: 'Home', filePath: 'en.md' }),
    },
    ...overrides,
    locales: overrides.locales ?? {
      zh: localeMarkdown({ title: '首页', description: '主页' }),
      en: localeMarkdown({ title: 'Home', description: 'Home', filePath: 'en.md' }),
    },
  }
}

describe('decideHomeAvailability', () => {
  const ctx = { mainLocale: 'zh' as const, showDrafts: false, localeKeys: ['zh', 'en'] }

  it('builds home normally when published', () => {
    const result = decideHomeAvailability(homePackage(), ctx)
    expect(result.packageDecision).toBe('publish')
    expect(result.locales.zh?.kind).toBe('publish')
    expect(result.locales.en?.kind).toBe('publish')
    expect(result.diagnostics.filter((d) => d.level === 'error')).toHaveLength(0)
  })

  it('errors when manifest is draft and showDrafts is false', () => {
    const result = decideHomeAvailability(homePackage({ draft: true }), ctx)
    expect(result.packageDecision).toBe('skip-package')
    expect(result.diagnostics.some((d) => d.level === 'error' && /publishable Home/i.test(d.message))).toBe(true)
  })

  it('errors when main markdown is missing or draft and showDrafts is false', () => {
    const missing = decideHomeAvailability(
      homePackage({ locales: { en: localeMarkdown({ title: 'Home', filePath: 'en.md' }) } }),
      ctx,
    )
    expect(missing.diagnostics.some((d) => d.level === 'error')).toBe(true)

    const draftMain = decideHomeAvailability(
      homePackage({
        locales: {
          zh: localeMarkdown({ title: '首页', draft: true }),
          en: localeMarkdown({ title: 'Home', filePath: 'en.md' }),
        },
      }),
      ctx,
    )
    expect(draftMain.diagnostics.some((d) => d.level === 'error')).toBe(true)
  })

  it('builds draft home when showDrafts is true', () => {
    const result = decideHomeAvailability(
      homePackage({
        draft: true,
        locales: {
          zh: localeMarkdown({ title: '首页', draft: true }),
          en: localeMarkdown({ title: 'Home', draft: true, filePath: 'en.md' }),
        },
      }),
      { ...ctx, showDrafts: true },
    )
    expect(result.packageDecision).toBe('publish')
    expect(result.locales.zh?.isDraft).toBe(true)
    expect(result.locales.en?.isDraft).toBe(true)
  })

  it('errors when showDrafts is true but main home markdown is missing', () => {
    const result = decideHomeAvailability(
      homePackage({ locales: {} }),
      { ...ctx, showDrafts: true },
    )
    expect(result.packageDecision).toBe('skip-package')
    expect(result.diagnostics.some((d) => d.level === 'error' && /absent/i.test(d.message))).toBe(true)
  })

  it('fallback-generates missing non-main home and publishes non-main draft when showDrafts', () => {
    const fallback = decideHomeAvailability(
      homePackage({
        locales: { zh: localeMarkdown({ title: '首页', description: '主页' }) },
      }),
      ctx,
    )
    expect(fallback.locales.en?.kind).toBe('fallback')

    const draftEn = decideHomeAvailability(
      homePackage({
        locales: {
          zh: localeMarkdown({ title: '首页', description: '主页' }),
          en: localeMarkdown({ title: 'Home', draft: true, filePath: 'en.md' }),
        },
      }),
      { ...ctx, showDrafts: true },
    )
    expect(draftEn.locales.en).toMatchObject({ kind: 'publish', isDraft: true, bodyLocale: 'en' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/publishing/home-availability.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/publishing/home-availability.ts
import type { ContentPackage, LocaleKey } from '../../shared/types'
import type { Diagnostic } from '../content/types'
import type {
  AvailabilityContext,
  LocaleAvailability,
  PackageAvailabilityResult,
} from './package-availability'

export function decideHomeAvailability(
  pkg: ContentPackage,
  ctx: AvailabilityContext,
): PackageAvailabilityResult {
  if (pkg.type !== 'home') {
    throw new Error('decideHomeAvailability requires a home package')
  }

  const diagnostics: Diagnostic[] = []
  const mainMd = pkg.locales[ctx.mainLocale]

  if (!ctx.showDrafts) {
    if (pkg.draft) {
      diagnostics.push({
        level: 'error',
        code: 'home-unpublishable',
        message: 'Build error: no publishable Home (manifest draft)',
        path: pkg.packagePath,
      })
      return { packageDecision: 'skip-package', locales: {}, diagnostics }
    }
    if (!mainMd || mainMd.draft) {
      diagnostics.push({
        level: 'error',
        code: 'home-main-unpublishable',
        message: 'Build error: no publishable main-locale Home',
        path: pkg.packagePath,
      })
      return { packageDecision: 'skip-package', locales: {}, diagnostics }
    }
  } else if (!mainMd) {
    diagnostics.push({
      level: 'error',
      code: 'home-absent',
      message: 'Build error: Home content is absent',
      path: pkg.packagePath,
    })
    return { packageDecision: 'skip-package', locales: {}, diagnostics }
  }

  const locales: Partial<Record<LocaleKey, LocaleAvailability>> = {}
  const manifestDraft = Boolean(pkg.draft && ctx.showDrafts)

  for (const locale of ctx.localeKeys) {
    const md = pkg.locales[locale]
    if (locale === ctx.mainLocale) {
      locales[locale] = {
        kind: 'publish',
        bodyLocale: locale,
        isDraft: Boolean(mainMd!.draft || manifestDraft),
        title: mainMd!.title,
        description: mainMd!.description,
      }
      continue
    }

    if (md && (!md.draft || ctx.showDrafts)) {
      locales[locale] = {
        kind: 'publish',
        bodyLocale: locale,
        isDraft: Boolean(md.draft || manifestDraft),
        title: md.title,
        description: md.description,
      }
      continue
    }

    diagnostics.push({
      level: 'warning',
      code: 'locale-fallback',
      message: `Generating fallback Home for locale ${locale}`,
      path: pkg.packagePath,
    })
    locales[locale] = {
      kind: 'fallback',
      bodyLocale: ctx.mainLocale,
      isDraft: false,
      title: mainMd!.title,
      description: mainMd!.description,
    }
  }

  return { packageDecision: 'publish', locales, diagnostics }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/publishing/home-availability.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/publishing/home-availability.ts tests/node/publishing/home-availability.test.ts
git commit -m "feat(publishing): implement Home publishing matrix"
```

---

### Task 6: Detail and home route emission

**Files:**
- Create: `src/node/routes/detail-routes.ts`
- Create: `tests/node/routes/detail-routes.test.ts`

**Interfaces:**
- Consumes: `decidePackageAvailability`, `decideHomeAvailability`, `resolveDetailPathSuffix`, `buildUrlLayers`, theme options, `base`
- Produces: `compileDetailRoutes(packages, ctx): { pages: CompiledPage[]; diagnostics: Diagnostic[] }`

Fallback page flags (SEO emission deferred to Plan 10):

- `isFallback: true`
- `noindex: true`
- `canonicalLocale: mainLocale`
- `bodyLocale: mainLocale`
- title/description from main-locale Markdown

Draft pages: `isDraft: true`, `noindex: true`. Published real translations: `noindex: false`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/routes/detail-routes.test.ts
import { describe, expect, it } from 'vitest'
import { compileDetailRoutes } from '../../../src/node/routes/detail-routes'
import {
  localeMarkdown,
  releasePackage,
  themeOptions,
} from '../../helpers/route-fixtures'
import type { ContentPackage } from '../../../src/shared/types'

describe('compileDetailRoutes', () => {
  const options = themeOptions()
  const baseCtx = {
    options,
    base: '/',
    localeKeys: ['zh', 'en'] as const,
  }

  it('emits locale-prefixed detail routes for every locale', () => {
    const { pages } = compileDetailRoutes([releasePackage()], baseCtx)
    const paths = pages.map((p) => p.url.routePath).sort()
    expect(paths).toEqual([
      '/en/releases/first-release/',
      '/zh/releases/first-release/',
    ])
    expect(pages.every((p) => p.identity === 'release:first-release')).toBe(true)
  })

  it('emits opaque custom paths including locale-like segments', () => {
    const { pages } = compileDetailRoutes(
      [releasePackage({ path: { zh: '/zh/test/' } })],
      baseCtx,
    )
    const zh = pages.find((p) => p.locale === 'zh')!
    const en = pages.find((p) => p.locale === 'en')!
    expect(zh.url.routePath).toBe('/zh/zh/test/')
    expect(en.url.routePath).toBe('/en/releases/first-release/')
  })

  it('emits fallback pages with noindex and main canonical locale', () => {
    const { pages } = compileDetailRoutes(
      [
        releasePackage({
          locales: { zh: localeMarkdown({ title: 'ZH', description: 'D' }) },
        }),
      ],
      baseCtx,
    )
    const en = pages.find((p) => p.locale === 'en')!
    expect(en.isFallback).toBe(true)
    expect(en.noindex).toBe(true)
    expect(en.canonicalLocale).toBe('zh')
    expect(en.bodyLocale).toBe('zh')
    expect(en.title).toBe('ZH')
    expect(en.url.routePath).toBe('/en/releases/first-release/')
  })

  it('emits home at /{locale}/ only', () => {
    const home: ContentPackage = {
      packagePath: 'content/home',
      type: 'home',
      slug: null,
      draft: false,
      locales: {
        zh: localeMarkdown({ title: '首页', description: '主页' }),
        en: localeMarkdown({ title: 'Home', description: 'Home', filePath: 'en.md' }),
      },
    }
    const { pages } = compileDetailRoutes([home], baseCtx)
    expect(pages.map((p) => p.url.routePath).sort()).toEqual(['/en/', '/zh/'])
    expect(pages.every((p) => p.identity === 'home')).toBe(true)
  })

  it('skips manifest drafts when showDrafts is false', () => {
    const { pages } = compileDetailRoutes(
      [releasePackage({ draft: true })],
      baseCtx,
    )
    expect(pages).toEqual([])
  })

  it('includes drafts with noindex when showDrafts is true', () => {
    const { pages } = compileDetailRoutes([releasePackage({ draft: true })], {
      ...baseCtx,
      options: themeOptions({ showDrafts: true }),
    })
    expect(pages).toHaveLength(2)
    expect(pages.every((p) => p.isDraft && p.noindex)).toBe(true)
  })

  it('sets absoluteUrl from siteUrl', () => {
    const { pages } = compileDetailRoutes([releasePackage()], baseCtx)
    expect(pages[0]!.url.absoluteUrl.startsWith('https://synctrol.com/')).toBe(
      true,
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/routes/detail-routes.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/routes/detail-routes.ts
import type { ContentPackage, LocaleKey, SynctrolThemeOptions } from '../../shared/types'
import type { CompiledPage, ContentIdentity } from '../../shared/types/routes'
import type { Diagnostic } from '../content/types'
import { decideHomeAvailability } from '../publishing/home-availability'
import {
  decidePackageAvailability,
  type LocaleAvailability,
} from '../publishing/package-availability'
import { buildUrlLayers } from '../url/build-url-layers'
import { resolveDetailPathSuffix } from '../url/resolve-path-suffix'

export interface DetailCompileContext {
  options: SynctrolThemeOptions
  base: string
  localeKeys: readonly LocaleKey[]
}

function contentIdentity(pkg: ContentPackage): ContentIdentity {
  if (pkg.type === 'home') return 'home'
  if (!pkg.slug) throw new Error(`Missing slug for ${pkg.packagePath}`)
  return `${pkg.type}:${pkg.slug}` as ContentIdentity
}

function toPage(
  pkg: ContentPackage,
  locale: LocaleKey,
  availability: LocaleAvailability,
  ctx: DetailCompileContext,
): CompiledPage {
  const pathSuffix = resolveDetailPathSuffix(pkg, locale, ctx.options)
  const url = buildUrlLayers({
    locale,
    pathSuffix,
    base: ctx.base,
    siteUrl: ctx.options.siteUrl,
  })
  const isFallback = availability.kind === 'fallback'
  return {
    identity: contentIdentity(pkg),
    locale,
    contentType: pkg.type,
    url,
    isFallback,
    isDraft: availability.isDraft,
    noindex: isFallback || availability.isDraft,
    bodyLocale: availability.bodyLocale,
    canonicalLocale: isFallback ? ctx.options.mainLocale : locale,
    packagePath: pkg.packagePath,
    slug: pkg.slug,
    title: availability.title,
    description: availability.description,
  }
}

export function compileDetailRoutes(
  packages: ContentPackage[],
  ctx: DetailCompileContext,
): { pages: CompiledPage[]; diagnostics: Diagnostic[] } {
  const pages: CompiledPage[] = []
  const diagnostics: Diagnostic[] = []
  const availabilityCtx = {
    mainLocale: ctx.options.mainLocale,
    showDrafts: ctx.options.showDrafts ?? false,
    localeKeys: [...ctx.localeKeys],
  }

  for (const pkg of packages) {
    const result =
      pkg.type === 'home'
        ? decideHomeAvailability(pkg, availabilityCtx)
        : decidePackageAvailability(pkg, availabilityCtx)
    diagnostics.push(...result.diagnostics)
    if (result.packageDecision !== 'publish') continue

    for (const locale of ctx.localeKeys) {
      const availability = result.locales[locale]
      if (!availability) continue
      pages.push(toPage(pkg, locale, availability, ctx))
    }
  }

  return { pages, diagnostics }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/routes/detail-routes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/routes/detail-routes.ts tests/node/routes/detail-routes.test.ts
git commit -m "feat(routes): compile locale detail and home pages with fallback flags"
```

---

### Task 7: Virtual collection routes (indexes, pagination, tags, enabled flags)

**Files:**
- Create: `src/node/routes/collection-routes.ts`
- Create: `tests/node/routes/collection-routes.test.ts`

**Interfaces:**
- Consumes: compiled detail `CompiledPage[]` for release/news; `ReleaseOptions`; `NewsOptions`; `buildUrlLayers`; `assertUrlSegment`; `encodePathSegment`
- Produces: `compileCollectionRoutes(input): CompiledPage[]`

Rules:

- Default suffixes from spec §8
- `release.index.enabled: false` suppresses Release Index and pagination, not details
- `news.index.enabled: false` suppresses News Index and pagination, not details or tags
- `news.tags.index.enabled: false` suppresses only News Tags Index; tag archives still generate
- News tag archives use `news.index.pagination`
- `pagination: false` → one unpaginated list
- Page one uses collection/tag index route; numbered pages start at 2
- Pagination emitted only when visible entries exceed page size
- Sort release/news by date descending, then slug
- Fallback items remain visible in target-locale indexes
- Drafts count when `showDrafts` made them visible (already reflected in detail pages)
- Stable identities: `release-index`, `release-page:{page}`, `news-index`, `news-page:{page}`, `news-tags-index`, `news-tag:{tag}`, `news-tag:{tag}:page:{page}`
- Tag keys in paths use RFC 3986 percent encoding

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/routes/collection-routes.test.ts
import { describe, expect, it } from 'vitest'
import { compileCollectionRoutes } from '../../../src/node/routes/collection-routes'
import { compileDetailRoutes } from '../../../src/node/routes/detail-routes'
import {
  localeMarkdown,
  releasePackage,
  themeOptions,
} from '../../helpers/route-fixtures'
import type { ContentPackage } from '../../../src/shared/types'

function newsPackage(
  slug: string,
  date: string,
  tags: string[] = ['release'],
): ContentPackage {
  return {
    packagePath: `content/news/${slug}`,
    type: 'news',
    slug,
    date,
    draft: false,
    tags,
    locales: {
      zh: localeMarkdown({ title: slug, filePath: 'zh.md' }),
      en: localeMarkdown({ title: slug, filePath: 'en.md' }),
    },
  }
}

describe('compileCollectionRoutes', () => {
  it('emits release and news indexes with locale prefixes', () => {
    const options = themeOptions({
      release: {
        urlSegment: 'releases',
        index: {
          enabled: true,
          pagination: false,
          mobileGridColumns: 2,
          desktopGridColumns: 3,
        },
      },
      news: {
        urlSegment: 'news',
        index: { enabled: true, pagination: false },
        tags: { urlSegment: 'tags', index: { enabled: true } },
      },
    })
    const details = compileDetailRoutes(
      [releasePackage(), newsPackage('n1', '2026-08-11')],
      { options, base: '/', localeKeys: ['zh', 'en'] },
    ).pages
    const pages = compileCollectionRoutes({
      detailPages: details,
      packages: [releasePackage(), newsPackage('n1', '2026-08-11')],
      options,
      base: '/',
      localeKeys: ['zh', 'en'],
      declaredTags: ['release'],
    })
    const paths = pages.map((p) => p.url.routePath).sort()
    expect(paths).toContain('/zh/releases/')
    expect(paths).toContain('/en/releases/')
    expect(paths).toContain('/zh/news/')
    expect(paths).toContain('/zh/news/tags/')
    expect(paths).toContain('/zh/news/tags/release/')
  })

  it('respects custom urlSegment values as scalars shared by locales', () => {
    const options = themeOptions({
      release: {
        urlSegment: 'works',
        index: {
          enabled: true,
          pagination: false,
          mobileGridColumns: 2,
          desktopGridColumns: 3,
        },
      },
      news: {
        urlSegment: 'journal',
        index: { enabled: true, pagination: false },
        tags: { urlSegment: 'topics', index: { enabled: false } },
      },
    })
    const pkgs = [releasePackage(), newsPackage('n1', '2026-08-11')]
    const details = compileDetailRoutes(pkgs, {
      options,
      base: '/',
      localeKeys: ['zh'],
    }).pages
    const pages = compileCollectionRoutes({
      detailPages: details,
      packages: pkgs,
      options,
      base: '/',
      localeKeys: ['zh'],
      declaredTags: ['release'],
    })
    const paths = pages.map((p) => p.url.routePath)
    expect(paths).toContain('/zh/works/')
    expect(paths).toContain('/zh/journal/')
    expect(paths).toContain('/zh/journal/topics/release/')
    expect(paths).not.toContain('/zh/journal/topics/')
  })

  it('suppresses indexes when enabled is false but keeps tag archives for news', () => {
    const options = themeOptions({
      release: {
        urlSegment: 'releases',
        index: {
          enabled: false,
          pagination: 12,
          mobileGridColumns: 2,
          desktopGridColumns: 3,
        },
      },
      news: {
        urlSegment: 'news',
        index: { enabled: false, pagination: 12 },
        tags: { urlSegment: 'tags', index: { enabled: true } },
      },
    })
    const pkgs = [releasePackage(), newsPackage('n1', '2026-08-11')]
    const details = compileDetailRoutes(pkgs, {
      options,
      base: '/',
      localeKeys: ['zh'],
    }).pages
    const pages = compileCollectionRoutes({
      detailPages: details,
      packages: pkgs,
      options,
      base: '/',
      localeKeys: ['zh'],
      declaredTags: ['release'],
    })
    const paths = pages.map((p) => p.url.routePath)
    expect(paths).not.toContain('/zh/releases/')
    expect(paths).not.toContain('/zh/news/')
    expect(paths).toContain('/zh/news/tags/')
    expect(paths).toContain('/zh/news/tags/release/')
  })

  it('paginates from page two and includes fallback items in indexes', () => {
    const options = themeOptions({
      release: {
        urlSegment: 'releases',
        index: {
          enabled: true,
          pagination: 2,
          mobileGridColumns: 2,
          desktopGridColumns: 3,
        },
      },
    })
    const pkgs = [
      releasePackage({ slug: 'a', date: '2026-08-13', packagePath: 'content/releases/a' }),
      releasePackage({ slug: 'b', date: '2026-08-12', packagePath: 'content/releases/b' }),
      releasePackage({
        slug: 'c',
        date: '2026-08-11',
        packagePath: 'content/releases/c',
        locales: { zh: localeMarkdown({ title: 'C' }) },
      }),
    ]
    const details = compileDetailRoutes(pkgs, {
      options,
      base: '/',
      localeKeys: ['zh', 'en'],
    }).pages
    const pages = compileCollectionRoutes({
      detailPages: details,
      packages: pkgs,
      options,
      base: '/',
      localeKeys: ['zh', 'en'],
      declaredTags: [],
    })
    expect(pages.some((p) => p.identity === 'release-index' && p.locale === 'zh')).toBe(true)
    expect(pages.some((p) => p.identity === 'release-page:2' && p.locale === 'zh')).toBe(true)
    expect(pages.some((p) => p.identity === 'release-page:1')).toBe(false)
    const enIndex = pages.find((p) => p.identity === 'release-index' && p.locale === 'en')!
    expect(enIndex.collection?.itemIdentities).toHaveLength(2)
    expect(enIndex.collection?.pageCount).toBe(2)
  })

  it('uses percent-encoded tag segments', () => {
    const options = themeOptions({
      news: {
        urlSegment: 'news',
        index: { enabled: true, pagination: false },
        tags: { urlSegment: 'tags', index: { enabled: false } },
      },
    })
    const pkg = newsPackage('n1', '2026-08-11', ['作品发布'])
    const details = compileDetailRoutes([pkg], {
      options,
      base: '/',
      localeKeys: ['zh'],
    }).pages
    const pages = compileCollectionRoutes({
      detailPages: details,
      packages: [pkg],
      options,
      base: '/',
      localeKeys: ['zh'],
      declaredTags: ['作品发布'],
    })
    expect(pages.map((p) => p.url.routePath)).toContain(
      `/zh/news/tags/${encodeURIComponent('作品发布')}/`,
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/routes/collection-routes.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/routes/collection-routes.ts
import type {
  ContentPackage,
  LocaleKey,
  SynctrolThemeOptions,
} from '../../shared/types'
import type {
  CompiledPage,
  ContentIdentity,
  GeneratedCollectionIdentity,
} from '../../shared/types/routes'
import { buildUrlLayers } from '../url/build-url-layers'
import { assertUrlSegment, encodePathSegment } from '../url/validate-segment'

export interface CollectionCompileInput {
  detailPages: CompiledPage[]
  packages: ContentPackage[]
  options: SynctrolThemeOptions
  base: string
  localeKeys: readonly LocaleKey[]
  declaredTags: string[]
}

function sortPackages(packages: ContentPackage[]): ContentPackage[] {
  return [...packages].sort((a, b) => {
    const dateCmp = (b.date ?? '').localeCompare(a.date ?? '')
    if (dateCmp !== 0) return dateCmp
    return (a.slug ?? '').localeCompare(b.slug ?? '')
  })
}

function paginateIdentities(
  identities: ContentIdentity[],
  pagination: number | false,
): ContentIdentity[][] {
  if (pagination === false) return [identities]
  if (identities.length === 0) return [[]]
  const pages: ContentIdentity[][] = []
  for (let i = 0; i < identities.length; i += pagination) {
    pages.push(identities.slice(i, i + pagination))
  }
  return pages
}

function collectionPage(args: {
  identity: GeneratedCollectionIdentity
  locale: LocaleKey
  contentType: 'release-collection' | 'news-collection'
  pathSuffix: string
  options: SynctrolThemeOptions
  base: string
  page: number
  pageCount: number
  itemIdentities: ContentIdentity[]
  tag?: string
}): CompiledPage {
  return {
    identity: args.identity,
    locale: args.locale,
    contentType: args.contentType,
    url: buildUrlLayers({
      locale: args.locale,
      pathSuffix: args.pathSuffix,
      base: args.base,
      siteUrl: args.options.siteUrl,
    }),
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: args.locale,
    canonicalLocale: args.locale,
    title: String(args.identity),
    collection: {
      page: args.page,
      pageCount: args.pageCount,
      itemIdentities: args.itemIdentities,
      tag: args.tag,
    },
  }
}

function emitPagedCollection(args: {
  locale: LocaleKey
  identities: ContentIdentity[]
  pagination: number | false
  indexIdentity: GeneratedCollectionIdentity
  pageIdentity: (page: number) => GeneratedCollectionIdentity
  indexSuffix: string
  pageSuffix: (page: number) => string
  contentType: 'release-collection' | 'news-collection'
  options: SynctrolThemeOptions
  base: string
  tag?: string
}): CompiledPage[] {
  const chunks = paginateIdentities(args.identities, args.pagination)
  const pageCount = Math.max(chunks.length, 1)
  const out: CompiledPage[] = []

  out.push(
    collectionPage({
      identity: args.indexIdentity,
      locale: args.locale,
      contentType: args.contentType,
      pathSuffix: args.indexSuffix,
      options: args.options,
      base: args.base,
      page: 1,
      pageCount,
      itemIdentities: chunks[0] ?? [],
      tag: args.tag,
    }),
  )

  for (let page = 2; page <= pageCount; page++) {
    out.push(
      collectionPage({
        identity: args.pageIdentity(page),
        locale: args.locale,
        contentType: args.contentType,
        pathSuffix: args.pageSuffix(page),
        options: args.options,
        base: args.base,
        page,
        pageCount,
        itemIdentities: chunks[page - 1] ?? [],
        tag: args.tag,
      }),
    )
  }
  return out
}

export function compileCollectionRoutes(
  input: CollectionCompileInput,
): CompiledPage[] {
  const { options, base, localeKeys } = input
  const releaseSegment = assertUrlSegment(
    options.release!.urlSegment,
    'release.urlSegment',
  )
  const newsSegment = assertUrlSegment(options.news!.urlSegment, 'news.urlSegment')
  const tagsSegment = assertUrlSegment(
    options.news!.tags.urlSegment,
    'news.tags.urlSegment',
  )

  const releases = sortPackages(input.packages.filter((p) => p.type === 'release'))
  const news = sortPackages(input.packages.filter((p) => p.type === 'news'))
  const pages: CompiledPage[] = []

  for (const locale of localeKeys) {
    const visibleReleaseIds = releases
      .map((pkg) => `release:${pkg.slug}` as ContentIdentity)
      .filter((id) =>
        input.detailPages.some(
          (p) => p.locale === locale && p.identity === id,
        ),
      )

    if (options.release!.index.enabled) {
      pages.push(
        ...emitPagedCollection({
          locale,
          identities: visibleReleaseIds,
          pagination: options.release!.index.pagination,
          indexIdentity: 'release-index',
          pageIdentity: (page) => `release-page:${page}`,
          indexSuffix: `/${releaseSegment}/`,
          pageSuffix: (page) => `/${releaseSegment}/page/${page}/`,
          contentType: 'release-collection',
          options,
          base,
        }),
      )
    }

    const visibleNews = news.filter((pkg) =>
      input.detailPages.some(
        (p) => p.locale === locale && p.identity === `news:${pkg.slug}`,
      ),
    )
    const visibleNewsIds = visibleNews.map(
      (pkg) => `news:${pkg.slug}` as ContentIdentity,
    )

    if (options.news!.index.enabled) {
      pages.push(
        ...emitPagedCollection({
          locale,
          identities: visibleNewsIds,
          pagination: options.news!.index.pagination,
          indexIdentity: 'news-index',
          pageIdentity: (page) => `news-page:${page}`,
          indexSuffix: `/${newsSegment}/`,
          pageSuffix: (page) => `/${newsSegment}/page/${page}/`,
          contentType: 'news-collection',
          options,
          base,
        }),
      )
    }

    if (options.news!.tags.index.enabled) {
      pages.push(
        collectionPage({
          identity: 'news-tags-index',
          locale,
          contentType: 'news-collection',
          pathSuffix: `/${newsSegment}/${tagsSegment}/`,
          options,
          base,
          page: 1,
          pageCount: 1,
          itemIdentities: [],
        }),
      )
    }

    for (const tag of input.declaredTags) {
      const encoded = encodePathSegment(tag)
      const tagIdentities = visibleNews
        .filter((pkg) => pkg.tags?.includes(tag))
        .map((pkg) => `news:${pkg.slug}` as ContentIdentity)
      pages.push(
        ...emitPagedCollection({
          locale,
          identities: tagIdentities,
          pagination: options.news!.index.pagination,
          indexIdentity: `news-tag:${tag}`,
          pageIdentity: (page) => `news-tag:${tag}:page:${page}`,
          indexSuffix: `/${newsSegment}/${tagsSegment}/${encoded}/`,
          pageSuffix: (page) =>
            `/${newsSegment}/${tagsSegment}/${encoded}/page/${page}/`,
          contentType: 'news-collection',
          options,
          base,
          tag,
        }),
      )
    }
  }

  return pages
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/routes/collection-routes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/routes/collection-routes.ts tests/node/routes/collection-routes.test.ts
git commit -m "feat(routes): emit virtual collection indexes, pagination, and tags"
```

---

### Task 8: Route collision detection and site route orchestrator

**Files:**
- Create: `src/node/routes/detect-collisions.ts`
- Create: `src/node/routes/compile-site-routes.ts`
- Create: `tests/node/routes/detect-collisions.test.ts`
- Create: `tests/node/routes/compile-site-routes.test.ts`

**Interfaces:**
- Consumes: `compileDetailRoutes`, `compileCollectionRoutes`, `CompiledPage.url.routePath`
- Produces: `detectRouteCollisions(pages): Diagnostic[]`; `compileSiteRoutes(input): Omit<CompiledSite, 'rootRouterHtml'>` (root HTML filled in Task 9)

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/routes/detect-collisions.test.ts
import { describe, expect, it } from 'vitest'
import { detectRouteCollisions } from '../../../src/node/routes/detect-collisions'
import type { CompiledPage } from '../../../src/shared/types/routes'

function page(routePath: string, identity: string): CompiledPage {
  return {
    identity: identity as CompiledPage['identity'],
    locale: 'zh',
    contentType: 'page',
    url: {
      routePath,
      outputPath: `${routePath.slice(1)}index.html`,
      publicPath: routePath,
      absoluteUrl: `https://synctrol.com${routePath}`,
    },
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: 'zh',
    canonicalLocale: 'zh',
    title: identity,
  }
}

describe('detectRouteCollisions', () => {
  it('returns errors for duplicate routePath values', () => {
    const diagnostics = detectRouteCollisions([
      page('/zh/about/', 'page:about'),
      page('/zh/about/', 'page:about-2'),
    ])
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.level).toBe('error')
    expect(diagnostics[0]?.code).toBe('route-collision')
  })

  it('allows the same suffix under different locales', () => {
    expect(
      detectRouteCollisions([
        page('/zh/about/', 'page:about'),
        page('/en/about/', 'page:about'),
      ]),
    ).toEqual([])
  })
})
```

```ts
// tests/node/routes/compile-site-routes.test.ts
import { describe, expect, it } from 'vitest'
import { compileSiteRoutes } from '../../../src/node/routes/compile-site-routes'
import {
  localeMarkdown,
  releasePackage,
  themeOptions,
} from '../../helpers/route-fixtures'
import type { ContentPackage } from '../../../src/shared/types'

describe('compileSiteRoutes', () => {
  it('orchestrates details, collections, and collision errors', () => {
    const home: ContentPackage = {
      packagePath: 'content/home',
      type: 'home',
      slug: null,
      draft: false,
      locales: {
        zh: localeMarkdown({ title: '首页', description: '主页' }),
        en: localeMarkdown({ title: 'Home', description: 'Home', filePath: 'en.md' }),
      },
    }
    const result = compileSiteRoutes({
      packages: [home, releasePackage()],
      options: themeOptions({
        release: {
          urlSegment: 'releases',
          index: {
            enabled: true,
            pagination: false,
            mobileGridColumns: 2,
            desktopGridColumns: 3,
          },
        },
      }),
      base: '/',
      declaredTags: [],
    })
    expect(result.pages.some((p) => p.url.routePath === '/zh/')).toBe(true)
    expect(result.pages.some((p) => p.url.routePath === '/zh/releases/')).toBe(true)
    expect(result.pages.some((p) => p.url.routePath === '/zh/releases/first-release/')).toBe(true)
    expect(result.diagnostics.filter((d) => d.level === 'error')).toHaveLength(0)
  })

  it('records a collision when a page path matches a collection route', () => {
    const conflict = releasePackage({
      type: 'page',
      slug: 'releases',
      date: undefined,
      packagePath: 'content/pages/releases',
      locales: {
        zh: localeMarkdown({ title: 'Releases page' }),
        en: localeMarkdown({ title: 'Releases page', filePath: 'en.md' }),
      },
    })
    const result = compileSiteRoutes({
      packages: [conflict],
      options: themeOptions({
        release: {
          urlSegment: 'releases',
          index: {
            enabled: true,
            pagination: false,
            mobileGridColumns: 2,
            desktopGridColumns: 3,
          },
        },
      }),
      base: '/',
      declaredTags: [],
    })
    // page detail → /zh/releases/ and release-index → /zh/releases/
    expect(result.diagnostics.some((d) => d.code === 'route-collision')).toBe(true)
  })

  it('surfaces home matrix build errors', () => {
    const home: ContentPackage = {
      packagePath: 'content/home',
      type: 'home',
      slug: null,
      draft: true,
      locales: {
        zh: localeMarkdown({ title: '首页', description: '主页' }),
      },
    }
    const result = compileSiteRoutes({
      packages: [home],
      options: themeOptions({ showDrafts: false }),
      base: '/',
      declaredTags: [],
    })
    expect(result.diagnostics.some((d) => d.level === 'error')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/node/routes/detect-collisions.test.ts tests/node/routes/compile-site-routes.test.ts`

Expected: FAIL with modules not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/routes/detect-collisions.ts
import type { CompiledPage } from '../../shared/types/routes'
import type { Diagnostic } from '../content/types'

export function detectRouteCollisions(pages: CompiledPage[]): Diagnostic[] {
  const seen = new Map<string, CompiledPage>()
  const diagnostics: Diagnostic[] = []
  for (const page of pages) {
    const existing = seen.get(page.url.routePath)
    if (existing) {
      diagnostics.push({
        level: 'error',
        code: 'route-collision',
        message: `Duplicate final route ${page.url.routePath} (${existing.identity} and ${page.identity})`,
      })
    } else {
      seen.set(page.url.routePath, page)
    }
  }
  return diagnostics
}
```

```ts
// src/node/routes/compile-site-routes.ts
import type { ContentPackage, LocaleKey, SynctrolThemeOptions } from '../../shared/types'
import type { CompiledPage } from '../../shared/types/routes'
import type { Diagnostic } from '../content/types'
import { compileCollectionRoutes } from './collection-routes'
import { compileDetailRoutes } from './detail-routes'
import { detectRouteCollisions } from './detect-collisions'

export interface CompileSiteRoutesInput {
  packages: ContentPackage[]
  options: SynctrolThemeOptions
  base: string
  declaredTags: string[]
}

export interface CompileSiteRoutesResult {
  pages: CompiledPage[]
  diagnostics: Diagnostic[]
}

export function compileSiteRoutes(
  input: CompileSiteRoutesInput,
): CompileSiteRoutesResult {
  const localeKeys = Object.keys(input.options.locales) as LocaleKey[]
  const detail = compileDetailRoutes(input.packages, {
    options: input.options,
    base: input.base,
    localeKeys,
  })
  const collections = compileCollectionRoutes({
    detailPages: detail.pages,
    packages: input.packages,
    options: input.options,
    base: input.base,
    localeKeys,
    declaredTags: input.declaredTags,
  })
  const pages = [...detail.pages, ...collections]
  const diagnostics = [
    ...detail.diagnostics,
    ...detectRouteCollisions(pages),
  ]
  return { pages, diagnostics }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/routes/detect-collisions.test.ts tests/node/routes/compile-site-routes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/routes/detect-collisions.ts src/node/routes/compile-site-routes.ts tests/node/routes/detect-collisions.test.ts tests/node/routes/compile-site-routes.test.ts
git commit -m "feat(routes): detect collisions and orchestrate site route compilation"
```

---

### Task 9: Root language router

**Files:**
- Create: `src/node/root-router/generate-root-html.ts`
- Create: `src/shared/locale/root-router-script.ts`
- Create: `tests/node/root-router/generate-root-html.test.ts`
- Modify: `src/node/routes/compile-site-routes.ts` — attach `rootRouterHtml` onto the result (extend return type to full `CompiledSite` minus nothing)
- Modify: `src/shared/types/routes.ts` — ensure `CompiledSite` matches
- Modify: `tests/node/routes/compile-site-routes.test.ts` — assert root HTML present

**Interfaces:**
- Consumes: `matchBrowserLocale`, locale labels/`lang`, `mainLocale`, VuePress `base`, `joinPublicPath`
- Produces: `generateRootRouterHtml(input): string`; storage key `synctrol:locale`; redirect via `location.replace(publicPath)`; always conceptually emitted as `<dest>/index.html` (caller writes the file later)

Root router behavior (spec §7.3):

1. Last manually selected locale (localStorage)
2. First supported `navigator.languages` entry via `matchBrowserLocale`
3. `mainLocale`

Visible language links for no-JS clients. No background module. Redirect destinations use `publicPath` including non-root base.

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/root-router/generate-root-html.test.ts
import { describe, expect, it } from 'vitest'
import { generateRootRouterHtml } from '../../../src/node/root-router/generate-root-html'
import { themeOptions } from '../../helpers/route-fixtures'

describe('generateRootRouterHtml', () => {
  it('emits visible language links and an inline redirect script', () => {
    const html = generateRootRouterHtml({
      options: themeOptions(),
      base: '/',
    })
    expect(html).toContain('<a href="/zh/">中文</a>')
    expect(html).toContain('<a href="/en/">English</a>')
    expect(html).toContain('location.replace')
    expect(html).toContain('synctrol:locale')
    expect(html).toContain('"mainLocale":"zh"')
    expect(html).not.toContain('background')
  })

  it('prefixes language hrefs with VuePress base in publicPath form', () => {
    const html = generateRootRouterHtml({
      options: themeOptions(),
      base: '/docs/',
    })
    expect(html).toContain('<a href="/docs/zh/">中文</a>')
    expect(html).toContain('<a href="/docs/en/">English</a>')
    expect(html).toContain('"/docs/"')
  })

  it('embeds locale key and lang metadata for negotiation', () => {
    const html = generateRootRouterHtml({
      options: themeOptions(),
      base: '/',
    })
    expect(html).toContain('"key":"zh"')
    expect(html).toContain('"lang":"zh-CN"')
    expect(html).toContain('"key":"en"')
    expect(html).toContain('"lang":"en-US"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/root-router/generate-root-html.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/locale/root-router-script.ts
/**
 * Pure script body string. Kept free of bundler APIs so tests can assert content
 * and the Node HTML generator can inline it.
 *
 * Negotiation order:
 * 1. localStorage synctrol:locale
 * 2. matchBrowserLocale(navigator.languages)
 * 3. mainLocale
 */
export const ROOT_ROUTER_SCRIPT = `(() => {
  const cfg = window.__SYNCTROL_ROOT_ROUTER__;
  if (!cfg) return;
  const storageKey = 'synctrol:locale';
  const normalize = (tag) => {
    const full = String(tag || '').trim().toLowerCase().replace(/_/g, '-');
    const primary = full.split('-')[0] || full;
    return { full, primary };
  };
  const matchBrowserLocale = (preferences, locales, mainLocale) => {
    for (const preference of preferences) {
      const { full, primary } = normalize(preference);
      for (const entry of locales) {
        if (normalize(entry.key).full === full) return entry.key;
      }
      for (const entry of locales) {
        if (normalize(entry.lang).full === full) return entry.key;
      }
      for (const entry of locales) {
        if (normalize(entry.key).primary === primary) return entry.key;
      }
      for (const entry of locales) {
        if (normalize(entry.lang).primary === primary) return entry.key;
      }
    }
    return mainLocale;
  };
  const stored = (() => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  })();
  const known = new Set(cfg.locales.map((l) => l.key));
  let locale = stored && known.has(stored) ? stored : null;
  if (!locale) {
    const prefs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language].filter(Boolean);
    locale = matchBrowserLocale(prefs, cfg.locales, cfg.mainLocale);
  }
  const base = cfg.base === '/' ? '' : cfg.base.replace(/\\/$/, '');
  const target = base + '/' + locale + '/';
  location.replace(target);
})();`
```

```ts
// src/node/root-router/generate-root-html.ts
import type { LocaleKey, SynctrolThemeOptions } from '../../shared/types'
import { ROOT_ROUTER_SCRIPT } from '../../shared/locale/root-router-script'
import { joinPublicPath, normalizeBase } from '../../shared/url/normalize-path'

export interface RootRouterInput {
  options: SynctrolThemeOptions
  base: string
}

export function generateRootRouterHtml(input: RootRouterInput): string {
  const base = normalizeBase(input.base)
  const locales = (
    Object.entries(input.options.locales) as [
      LocaleKey,
      SynctrolThemeOptions['locales'][LocaleKey],
    ][]
  ).map(([key, value]) => ({
    key,
    lang: value.lang,
    label: value.label,
    href: joinPublicPath(base, `/${key}/`),
  }))

  const configJson = JSON.stringify({
    mainLocale: input.options.mainLocale,
    base,
    locales: locales.map(({ key, lang }) => ({ key, lang })),
  })

  const links = locales
    .map((locale) => `<a href="${locale.href}">${escapeHtml(locale.label)}</a>`)
    .join('\n    ')

  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.options.locales[input.options.mainLocale]!.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Synctrol</title>
  <script>window.__SYNCTROL_ROOT_ROUTER__ = ${configJson};</script>
  <script>${ROOT_ROUTER_SCRIPT}</script>
</head>
<body>
  <noscript>
    <p>Select a language / 选择语言</p>
  </noscript>
  <ul>
    ${links}
  </ul>
</body>
</html>
`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

Update orchestrator:

```ts
// src/node/routes/compile-site-routes.ts (full file after Task 9)
import type { ContentPackage, LocaleKey, SynctrolThemeOptions } from '../../shared/types'
import type { CompiledSite } from '../../shared/types/routes'
import { generateRootRouterHtml } from '../root-router/generate-root-html'
import { compileCollectionRoutes } from './collection-routes'
import { compileDetailRoutes } from './detail-routes'
import { detectRouteCollisions } from './detect-collisions'

export interface CompileSiteRoutesInput {
  packages: ContentPackage[]
  options: SynctrolThemeOptions
  base: string
  declaredTags: string[]
}

export function compileSiteRoutes(input: CompileSiteRoutesInput): CompiledSite {
  const localeKeys = Object.keys(input.options.locales) as LocaleKey[]
  const detail = compileDetailRoutes(input.packages, {
    options: input.options,
    base: input.base,
    localeKeys,
  })
  const collections = compileCollectionRoutes({
    detailPages: detail.pages,
    packages: input.packages,
    options: input.options,
    base: input.base,
    localeKeys,
    declaredTags: input.declaredTags,
  })
  const pages = [...detail.pages, ...collections]
  const diagnostics = [
    ...detail.diagnostics,
    ...detectRouteCollisions(pages),
  ]
  return {
    pages,
    diagnostics,
    rootRouterHtml: generateRootRouterHtml({
      options: input.options,
      base: input.base,
    }),
  }
}
```

Add assertion to existing orchestrator test:

```ts
// append inside the first compileSiteRoutes test:
expect(result.rootRouterHtml).toContain('location.replace')
expect(result.rootRouterHtml).toContain('<a href="/zh/">中文</a>')
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/root-router/generate-root-html.test.ts tests/node/routes/compile-site-routes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/locale/root-router-script.ts src/node/root-router/generate-root-html.ts src/node/routes/compile-site-routes.ts src/shared/types/routes.ts tests/node/root-router/generate-root-html.test.ts tests/node/routes/compile-site-routes.test.ts
git commit -m "feat(locale): generate root language router with negotiation script"
```

---

### Task 10: Plan verification suite

**Files:**
- Create: `tests/node/routes/locale-route-compiler.integration.test.ts`
- Modify: none required beyond the new integration test

**Interfaces:**
- Consumes: `compileSiteRoutes` and fixtures from prior tasks
- Produces: end-to-end regression coverage for this plan's acceptance slice

- [ ] **Step 1: Write the integration test**

```ts
// tests/node/routes/locale-route-compiler.integration.test.ts
import { describe, expect, it } from 'vitest'
import { compileSiteRoutes } from '../../../src/node/routes/compile-site-routes'
import {
  localeMarkdown,
  releasePackage,
  themeOptions,
} from '../../helpers/route-fixtures'
import type { ContentPackage } from '../../../src/shared/types'

describe('locale-route-compiler integration', () => {
  const home: ContentPackage = {
    packagePath: 'content/home',
    type: 'home',
    slug: null,
    draft: false,
    locales: {
      zh: localeMarkdown({ title: '首页', description: '主页 SEO' }),
      en: localeMarkdown({
        title: 'Home',
        description: 'Home SEO',
        filePath: 'en.md',
      }),
    },
  }

  const news: ContentPackage = {
    packagePath: 'content/news/launch',
    type: 'news',
    slug: 'launch',
    date: '2026-08-10',
    draft: false,
    tags: ['release'],
    locales: {
      zh: localeMarkdown({ title: '发布', filePath: 'zh.md' }),
    },
  }

  it('builds a bilingual site with prefixes, fallbacks, collections, and root router', () => {
    const result = compileSiteRoutes({
      packages: [
        home,
        releasePackage({
          path: { zh: '/zh/test/' },
        }),
        news,
      ],
      options: themeOptions({
        siteUrl: 'https://synctrol.com',
        release: {
          urlSegment: 'releases',
          index: {
            enabled: true,
            pagination: false,
            mobileGridColumns: 2,
            desktopGridColumns: 3,
          },
        },
        news: {
          urlSegment: 'news',
          index: { enabled: true, pagination: false },
          tags: { urlSegment: 'tags', index: { enabled: true } },
        },
      }),
      base: '/',
      declaredTags: ['release'],
    })

    const paths = result.pages.map((p) => p.url.routePath).sort()
    expect(paths).toEqual(
      expect.arrayContaining([
        '/zh/',
        '/en/',
        '/zh/zh/test/',
        '/en/releases/first-release/',
        '/zh/releases/',
        '/en/releases/',
        '/zh/news/launch/',
        '/en/news/launch/',
        '/zh/news/',
        '/en/news/',
        '/zh/news/tags/',
        '/zh/news/tags/release/',
        '/en/news/tags/release/',
      ]),
    )

    const enNews = result.pages.find(
      (p) => p.locale === 'en' && p.identity === 'news:launch',
    )!
    expect(enNews.isFallback).toBe(true)
    expect(enNews.noindex).toBe(true)
    expect(enNews.canonicalLocale).toBe('zh')
    expect(enNews.url.absoluteUrl).toBe('https://synctrol.com/en/news/launch/')
    expect(enNews.url.outputPath).toBe('en/news/launch/index.html')
    expect(enNews.url.publicPath).toBe('/en/news/launch/')

    expect(result.pages.every((p) => p.url.routePath.startsWith('/zh/') || p.url.routePath.startsWith('/en/'))).toBe(true)
    expect(result.rootRouterHtml).toContain('synctrol:locale')
    expect(result.diagnostics.some((d) => d.code === 'locale-fallback')).toBe(true)
    expect(result.diagnostics.filter((d) => d.level === 'error')).toHaveLength(0)
  })

  it('honors showDrafts and index.enabled switches together', () => {
    const draftRelease = releasePackage({
      slug: 'secret',
      draft: true,
      packagePath: 'content/releases/secret',
    })
    const hidden = compileSiteRoutes({
      packages: [home, draftRelease],
      options: themeOptions({
        showDrafts: false,
        release: {
          urlSegment: 'releases',
          index: {
            enabled: false,
            pagination: 12,
            mobileGridColumns: 2,
            desktopGridColumns: 3,
          },
        },
      }),
      base: '/docs/',
      declaredTags: [],
    })
    expect(hidden.pages.every((p) => p.identity === 'home')).toBe(true)
    expect(hidden.rootRouterHtml).toContain('/docs/zh/')

    const shown = compileSiteRoutes({
      packages: [home, draftRelease],
      options: themeOptions({
        showDrafts: true,
        release: {
          urlSegment: 'releases',
          index: {
            enabled: true,
            pagination: false,
            mobileGridColumns: 2,
            desktopGridColumns: 3,
          },
        },
      }),
      base: '/',
      declaredTags: [],
    })
    expect(
      shown.pages.some(
        (p) => p.identity === 'release:secret' && p.isDraft && p.noindex,
      ),
    ).toBe(true)
    expect(shown.pages.some((p) => p.identity === 'release-index')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the integration test**

Run: `pnpm exec vitest run tests/node/routes/locale-route-compiler.integration.test.ts`

Expected: PASS (depends on Tasks 1–9; if `rootRouterHtml` is missing, restore the Task 9 `compileSiteRoutes` return shape first)

- [ ] **Step 3: Run the full plan suite**

Run: `pnpm exec vitest run tests/node/url tests/node/locale tests/node/publishing tests/node/routes tests/node/root-router`

Expected: PASS (all Task 1–10 tests green)

- [ ] **Step 4: Commit**

```bash
git add tests/node/routes/locale-route-compiler.integration.test.ts
git commit -m "test(routes): add locale and route compiler integration coverage"
```

---

## Self-Review

**Spec coverage (in-scope only):**

| Spec area | Task |
| --- | --- |
| §7.1 browser-language matching | Task 3 |
| §7.3 root language router | Task 9 |
| §7.4 locale URL prefix requirement | Tasks 1, 6, 10 |
| §8 urlSegment / index.enabled / pagination / tags | Tasks 2, 7 |
| §8 four URL layers + siteUrl | Task 1 |
| §8 opaque page-specific path | Tasks 2, 6, 10 |
| §8 Home fixed `/` | Tasks 2, 5, 6 |
| §8 route collisions | Task 8 |
| §8 generated collection identities | Task 7 |
| §9.1–9.2 draft/fallback matrix | Task 4 |
| §9.2 showDrafts | Tasks 4, 6, 10 |
| §9.3 Home publishing matrix | Task 5 |
| mainLocale | Tasks 4–10 |

**Explicitly out of scope (no tasks):** UI shell, LanguageSwitcher component, platforms, SEO meta/`hreflang`/RSS/Sitemap emission, assets, Release/News visual layouts.

**Placeholder scan:** no TBD/TODO; every step includes concrete code, commands, and commits.

**Type consistency:** `CompiledPage`, `UrlLayers`, `PackageAvailabilityResult`, `compileSiteRoutes` → `CompiledSite` names are shared across tasks; fallback flags (`isFallback`, `noindex`, `canonicalLocale`, `bodyLocale`) are set in Task 6 and asserted in Task 10.
