# SEO and Feeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Revision Notes (executable against Plans 01-09 @ HEAD `cursor/synctrol-theme-design-ee11`)

Revised after Plan 10 preflight against branch tip `071dd0a3d1a04007058ec229546d72ef514818cb`. Binding decisions (do not re-litigate):

1. **NodeNext imports are mandatory.**
   - Every sample that imports from `src/**` uses `.js` on relative module specifiers.
   - Keep Vitest projects unchanged and keep the repository's NodeNext TypeScript configuration.

2. **Use current HEAD module ownership.**
   - `ResolvedSynctrolThemeOptions` and option types come from `src/shared/options.ts`.
   - `CompiledPage` and `ContentIdentity` come from `src/shared/route-types.ts`.
   - `CompiledSite` comes from `src/compiler/compile-site-routes.ts` unless this plan explicitly re-exports it later.
   - `joinPublicPath` and `normalizeBase` come from `src/shared/route-path.ts`.
   - `ContentDefinitions` always includes both `tags` and `platforms`.

3. **Reuse existing formatter behavior.**
   - `src/shared/format-message.ts` is the canonical formatter.
   - `src/shared/seo/format-message.ts`, if created, is a thin re-export only.

4. **Build an explicit SEO content context.**
   - Add `buildSeoContentContext` as a pure compiler helper that maps `RouteContentPackage[]`, `CompiledContentPackage[]`, `ContentDefinitions`, and `AssetManifest` into `SeoContentContext`.
   - It resolves package covers, `book`, `date`, `updated`, `seo.defaultImage`, and organization logo into absolute HTTPS URLs where applicable.

5. **Patch `src/compiler/theme.ts` additively.**
   - During `createPage`, attach VuePress-compatible `head` for the matching compiled route.
   - During `onGenerated`, write RSS/Sitemap `filesToWrite` under `app.dir.dest()` while preserving root-router and CSP writes.
   - SEO/feed modules must not import VuePress; `theme.ts` owns the `HeadTag` to VuePress head conversion.

6. **Hreflang order is deterministic.**
   - Use `Object.keys(options.locales)` order for `hreflang`.
   - Do not sort with `localeCompare`; the `zh-CN` / `en-US` fixture order must stay aligned with the options object.

7. **Public exports use real paths.**
   - Export from `./compiler/seo/index.js` and `./shared/seo/types.js`.
   - Do not introduce exports through a nonexistent node subtree.

8. **Plan 09 RSS relationship.**
   - `NewsListItem.excludeFromRss` is UI/list metadata.
   - RSS generation intentionally excludes from `CompiledPage.isDraft` and `CompiledPage.isFallback`, not from list item frontmatter.

9. **Preserve Plans 03-09 production contracts.**
   - Keep nested `frontmatter.synctrol.*`, single `Layout`, content assets, platforms, releases, news, page, home, root router, backgrounds, and CSP behavior intact.
   - Plan 10 is additive and must not reimplement discovery, routing, assets, platform embeds, release rendering, or news/page/home rendering.

**Goal:** Emit per-page SEO metadata (title, description, canonical, Open Graph, `lang`, real-translation-only `hreflang`, JSON-LD) and locale RSS / site Sitemap artifacts from compiled Synctrol pages and resolved theme options.

**Architecture:** Pure Node modules under `src/compiler/seo/` and `src/compiler/feeds/` compute `PageSeo`, `HeadTag[]`, RSS XML, and Sitemap XML from current compiled route/content/asset contracts. A pure context adapter maps Plan 04 assets and Plans 02/08 content package data into SEO inputs. `src/compiler/theme.ts` is the only VuePress integration point: it converts `HeadTag[]` to VuePress head tuples during `createPage` and writes feed files during `onGenerated`.

**Tech Stack:** TypeScript, Vitest, VuePress 2 theme package `vuepress-theme-synctrolling`, NodeNext ESM imports, Plan 01 options/messages, Plan 02 content definitions/books, Plan 03 compiled routes, Plan 04 asset manifest, Plans 08/09 release/news/page/home frontmatter.

## Global Constraints

- Package name: `vuepress-theme-synctrolling`
- `siteUrl` is required in production builds and has no trailing slash; absolute URLs are `siteUrl` plus public path unless an input is already HTTPS.
- `seo` is required theme config: `name`, `description`, `defaultImage`, `organization`, `collections.release`, `collections.news`.
- `seo.organization.url` is always `siteUrl`.
- `feeds.rss` and `feeds.sitemap` default to `true`; `false` suppresses only that artifact.
- Description fallback: page locale description when present, otherwise site locale `seo.description`.
- Open Graph image uses `cover` when configured, otherwise `seo.defaultImage`; never substitutes `artwork`.
- Home has no `cover`; Home OG image is always `seo.defaultImage`.
- `hreflang` lists real translations only; fallback pages emit no false translation alternate.
- Fallback pages: `noindex`, canonical points at canonical-locale page URL.
- Drafts remain `noindex` and stay out of Sitemap and RSS.
- JSON-LD: News -> `Article`; Album Book -> `MusicAlbum` + `MusicRecording`; Gift -> no `Product`; locale Home -> `Organization` + `WebSite`.
- RSS path is `/{locale}/rss.xml` as route path; VuePress `base` applies to public path only, while output path remains destination-relative.
- RSS includes News and Release detail items only; excludes drafts, fallback pages, collections, Home, and Page.
- Sitemap is a single `/sitemap.xml` containing locale-specific absolute URL entries; excludes drafts and fallback pages.
- Collection index titles/descriptions come from `seo.collections`; paginated titles use `messages.paginatedTitle`; tag archives use `messages.tagArchiveTitle` with localized tag title + News collection title.
- Tests run with `npm test -- <path>`.
- Before integration testing in an implementation pass, commit and push the implementation branch per Cloud Agent requirements.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/shared/seo/types.ts` | `PageSeo`, `HeadTag`, `SeoAssetContext`, `SeoContentContext`, `JsonLdNode`, feed item types |
| `src/shared/seo/format-message.ts` | Thin re-export of existing `src/shared/format-message.ts` |
| `src/compiler/seo/collection-copy.ts` | Resolve SEO-only collection / paginated / tag-archive title + description |
| `src/compiler/seo/resolve-description.ts` | Page description with site-locale fallback |
| `src/compiler/seo/resolve-og-image.ts` | Cover-or-default OG image |
| `src/compiler/seo/resolve-alternates.ts` | Canonical URL, `lang`, robots, real-translation `hreflang` |
| `src/compiler/seo/open-graph.ts` | Build Open Graph fields |
| `src/compiler/seo/serialize-head.ts` | Turn `PageSeo` into ordered `HeadTag[]` |
| `src/compiler/seo/json-ld.ts` | `WebSite`, `Organization`, `Article`, `MusicAlbum`, `MusicRecording` builders |
| `src/compiler/seo/content-context.ts` | Pure adapter from packages + asset manifest to `SeoContentContext` |
| `src/compiler/seo/build-page-seo.ts` | Orchestrate one `PageSeo` per `CompiledPage` |
| `src/compiler/feeds/rss.ts` | Locale RSS 2.0 XML for News + Release |
| `src/compiler/feeds/sitemap.ts` | Single sitemap XML of locale page absolute URLs |
| `src/compiler/seo/emit-seo-and-feeds.ts` | Build site SEO + feed files respecting toggles |
| `src/compiler/seo/index.ts` | Public compiler SEO/feed barrel |
| `src/compiler/theme.ts` | Additive VuePress integration for head and feed file writes |
| `src/index.ts` | Root public exports from real paths |
| `tests/helpers/seo-fixtures.ts` | Minimal options, pages, assets, books, definitions for SEO/feed tests |
| `tests/shared/seo/*.test.ts` | Shared SEO unit tests |
| `tests/compiler/seo/*.test.ts` | SEO resolver/context/orchestrator tests |
| `tests/compiler/feeds/*.test.ts` | RSS / Sitemap tests |
| `tests/compiler/theme.integration.test.ts` | Production VuePress integration assertions |
| `tests/public-exports.test.ts` | Root and compiler barrel export assertions |

---

### Task 1: Shared SEO types, formatter re-export, and fixtures

**Files:**
- Create: `src/shared/seo/types.ts`
- Create: `src/shared/seo/format-message.ts`
- Create: `tests/shared/seo/format-message.test.ts`
- Create: `tests/helpers/seo-fixtures.ts`

**Interfaces:**
- Consumes: `Book`, `ContentDefinitions`, `LocaleKey` from `src/shared/types.ts`; `CompiledPage` from `src/shared/route-types.ts`; `ResolvedSynctrolThemeOptions` from `src/shared/options.ts`; `CompiledSite` from `src/compiler/compile-site-routes.ts`.
- Produces: `PageSeo`, `HeadTag`, `HreflangAlternate`, `OpenGraphData`, `SeoAssetContext`, `SeoContentContext`, `RssItem`; `formatMessage` re-export.

- [ ] **Step 1: Write the failing tests and fixture**

```ts
// tests/shared/seo/format-message.test.ts
import { describe, expect, it } from 'vitest'
import { formatMessage } from '../../../src/shared/seo/format-message.js'

describe('SEO formatMessage re-export', () => {
  it('reuses the shared named-placeholder formatter', () => {
    expect(formatMessage('{title} · Page {page}', { title: 'News', page: 2 })).toBe('News · Page 2')
    expect(formatMessage('{title} · {missing}', { title: 'X' })).toBe('X · {missing}')
  })
})
```

```ts
// tests/helpers/seo-fixtures.ts
import type { CompiledSite } from '../../src/compiler/compile-site-routes.js'
import type { ResolvedSynctrolThemeOptions } from '../../src/shared/options.js'
import type { CompiledPage } from '../../src/shared/route-types.js'
import type { ContentDefinitions, LocaleKey } from '../../src/shared/types.js'
import { enMessages, zhMessages } from '../../src/shared/messages.js'
import type { SeoContentContext } from '../../src/shared/seo/types.js'

export function definitions(
  overrides: Partial<ContentDefinitions> = {},
): ContentDefinitions {
  return {
    tags: {},
    platforms: {},
    ...overrides,
  }
}

export function resolvedOptions(
  overrides: Partial<ResolvedSynctrolThemeOptions> = {},
): ResolvedSynctrolThemeOptions {
  const base: ResolvedSynctrolThemeOptions = {
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    locales: {
      zh: { lang: 'zh-CN', label: '中文', dateFormat: { dateStyle: 'long' }, messages: zhMessages },
      en: { lang: 'en-US', label: 'English', dateFormat: { dateStyle: 'long' }, messages: enMessages },
    },
    showDrafts: false,
    defaultColorMode: 'auto',
    copyright: 'SYNCTROL (C) 2026',
    feeds: { rss: true, sitemap: true },
    navigation: { externalTarget: '_blank', items: [] },
    socialLinks: { items: [] },
    release: {
      urlSegment: 'releases',
      index: { enabled: true, pagination: 12, mobileGridColumns: 2, desktopGridColumns: 3 },
    },
    news: {
      urlSegment: 'news',
      index: { enabled: true, pagination: 12 },
      tags: { urlSegment: 'tags', index: { enabled: true } },
    },
    platforms: { loadStrategy: 'interaction', types: {} },
    backgrounds: {},
    seo: {
      name: { zh: 'Synctrol', en: 'Synctrol' },
      description: { zh: 'Synctrol 音乐团队官方网站', en: 'Official website of the Synctrol music team' },
      defaultImage: './assets/social-default.webp',
      organization: { name: 'Synctrol', logo: './assets/logo.svg' },
      collections: {
        release: { title: { zh: '作品', en: 'Releases' }, description: { zh: 'Synctrol 作品列表', en: 'Synctrol releases' } },
        news: { title: { zh: '新闻', en: 'News' }, description: { zh: 'Synctrol 新闻', en: 'Synctrol news' } },
      },
    },
  }

  return {
    ...base,
    ...overrides,
    locales: overrides.locales ?? base.locales,
    feeds: overrides.feeds ?? base.feeds,
    seo: overrides.seo ?? base.seo,
  }
}

export function url(absoluteUrl: string, routePath?: string): CompiledPage['url'] {
  const path = routePath ?? absoluteUrl.replace('https://synctrol.com', '')
  return {
    routePath: path,
    outputPath: `${path.slice(1)}index.html`.replace(/\/index\.html$/, '/index.html'),
    publicPath: path,
    absoluteUrl,
  }
}

export function page(
  overrides: Partial<CompiledPage> & Pick<CompiledPage, 'identity' | 'locale' | 'contentType' | 'url'>,
): CompiledPage {
  return {
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: overrides.locale,
    canonicalLocale: overrides.locale,
    title: overrides.title ?? String(overrides.identity),
    description: overrides.description,
    ...overrides,
  }
}

export function seoContentContext(
  overrides: Partial<SeoContentContext> = {},
): SeoContentContext {
  return {
    assets: {
      defaultImageAbsoluteUrl: 'https://synctrol.com/assets/global/social-default.hash.webp',
      organizationLogoAbsoluteUrl: 'https://synctrol.com/assets/global/logo.hash.svg',
      coverAbsoluteUrlByPackagePath: new Map(),
      ...overrides.assets,
    },
    definitions: definitions(overrides.definitions),
    bookByPackagePath: overrides.bookByPackagePath ?? new Map(),
    dateByPackagePath: overrides.dateByPackagePath ?? new Map(),
    updatedByPackagePath: overrides.updatedByPackagePath ?? new Map(),
  }
}

export function siteFixture(pages: CompiledPage[]): CompiledSite {
  return { pages, diagnostics: [], rootRouterHtml: '<!doctype html><html></html>' }
}

export const localeKeys = ['zh', 'en'] as LocaleKey[]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/shared/seo/format-message.test.ts`

Expected: FAIL with module not found for `src/shared/seo/format-message.js` or `src/shared/seo/types.js`.

- [ ] **Step 3: Implement shared SEO files**

```ts
// src/shared/seo/types.ts
import type { Book, ContentDefinitions } from '../types.js'

export interface SeoAssetContext {
  defaultImageAbsoluteUrl: string
  organizationLogoAbsoluteUrl: string
  coverAbsoluteUrlByPackagePath: ReadonlyMap<string, string>
}

export interface SeoContentContext {
  assets: SeoAssetContext
  definitions: ContentDefinitions
  bookByPackagePath: ReadonlyMap<string, Book>
  dateByPackagePath: ReadonlyMap<string, string>
  updatedByPackagePath: ReadonlyMap<string, string>
}

export interface HreflangAlternate {
  hreflang: string
  href: string
}

export interface OpenGraphData {
  type: 'website' | 'article'
  title: string
  description: string
  url: string
  image: string
  locale: string
}

export interface JsonLdNode {
  '@context'?: 'https://schema.org'
  '@type': string
  [key: string]: unknown
}

export interface PageSeo {
  title: string
  description: string
  canonicalUrl: string
  lang: string
  robots: 'index,follow' | 'noindex,follow'
  openGraph: OpenGraphData
  hreflang: HreflangAlternate[]
  jsonLd: JsonLdNode[]
}

export interface HeadTag {
  tag: 'title' | 'meta' | 'link' | 'script'
  attrs?: Record<string, string>
  text?: string
}

export interface RssItem {
  title: string
  description: string
  link: string
  guid: string
  pubDate: string
}
```

```ts
// src/shared/seo/format-message.ts
export { formatMessage } from '../format-message.js'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/shared/seo/format-message.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/seo/types.ts src/shared/seo/format-message.ts tests/shared/seo/format-message.test.ts tests/helpers/seo-fixtures.ts
git commit -m "feat(seo): add shared SEO types"
```

---

### Task 2: Collection SEO titles and descriptions

**Files:**
- Create: `src/compiler/seo/collection-copy.ts`
- Create: `tests/compiler/seo/collection-copy.test.ts`

**Interfaces:**
- Consumes: existing `formatMessage`, `resolveMultilanguage`, `ResolvedSynctrolThemeOptions`, `CompiledPage`, `ContentDefinitions`.
- Produces: `resolveCollectionCopy(page, options, definitions): CollectionCopy | null`.

Rules:
- Detail/Home/Page return `null`.
- `release-index` / `news-index` / `news-tags-index` use `seo.collections`.
- `release-page:N` / `news-page:N` use `messages.paginatedTitle`.
- `news-tag:{tag}` uses `messages.tagArchiveTitle`.
- `news-tag:{tag}:page:N` first builds the tag archive title, then paginates it.
- This is SEO metadata only and must not alter Plan 09 frontmatter/UI collection data.

- [ ] **Step 1: Write the failing test**

```ts
// tests/compiler/seo/collection-copy.test.ts
import { describe, expect, it } from 'vitest'
import { resolveCollectionCopy } from '../../../src/compiler/seo/collection-copy.js'
import { definitions, page, resolvedOptions, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()

describe('resolveCollectionCopy', () => {
  it('returns null for detail pages', () => {
    expect(
      resolveCollectionCopy(
        page({ identity: 'release:first', locale: 'en', contentType: 'release', url: url('https://synctrol.com/en/releases/first/'), title: 'First' }),
        options,
        definitions(),
      ),
    ).toBeNull()
  })

  it('resolves indexes, pagination, and tag archives', () => {
    expect(
      resolveCollectionCopy(
        page({ identity: 'release-index', locale: 'zh', contentType: 'release-collection', url: url('https://synctrol.com/zh/releases/'), collection: { page: 1, pageCount: 1, itemIdentities: [] } }),
        options,
        definitions(),
      ),
    ).toEqual({ title: '作品', description: 'Synctrol 作品列表' })

    expect(
      resolveCollectionCopy(
        page({ identity: 'news-page:2', locale: 'en', contentType: 'news-collection', url: url('https://synctrol.com/en/news/page/2/'), collection: { page: 2, pageCount: 3, itemIdentities: [] } }),
        options,
        definitions(),
      ),
    ).toEqual({ title: 'News · Page 2', description: 'Synctrol news' })

    expect(
      resolveCollectionCopy(
        page({ identity: 'news-tag:release:page:2', locale: 'zh', contentType: 'news-collection', url: url('https://synctrol.com/zh/news/tags/release/page/2/'), collection: { page: 2, pageCount: 2, itemIdentities: [], tag: 'release' } }),
        options,
        definitions({ tags: { release: { title: { zh: '作品发布', en: 'Releases' } } } }),
      ),
    ).toEqual({ title: '作品发布 · 新闻 · 第 2 页', description: 'Synctrol 新闻' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/seo/collection-copy.test.ts`

Expected: FAIL with module not found for `collection-copy.js`.

- [ ] **Step 3: Implement collection copy**

```ts
// src/compiler/seo/collection-copy.ts
import { formatMessage } from '../../shared/format-message.js'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { ContentDefinitions, LocaleKey } from '../../shared/types.js'

export interface CollectionCopy {
  title: string
  description: string
}

function siteCollection(
  options: ResolvedSynctrolThemeOptions,
  kind: 'release' | 'news',
  locale: LocaleKey,
): CollectionCopy {
  const block = options.seo.collections[kind]
  return {
    title: resolveMultilanguage(block.title, locale, options.mainLocale).text,
    description: resolveMultilanguage(block.description, locale, options.mainLocale).text,
  }
}

function collectionKind(identity: string): 'release' | 'news' | null {
  if (identity === 'release-index' || identity.startsWith('release-page:')) return 'release'
  if (
    identity === 'news-index' ||
    identity === 'news-tags-index' ||
    identity.startsWith('news-page:') ||
    identity.startsWith('news-tag:')
  ) return 'news'
  return null
}

export function resolveCollectionCopy(
  page: CompiledPage,
  options: ResolvedSynctrolThemeOptions,
  definitions: ContentDefinitions,
): CollectionCopy | null {
  const identity = String(page.identity)
  const kind = collectionKind(identity)
  if (kind === null) return null

  const base = siteCollection(options, kind, page.locale)
  const messages = options.locales[page.locale]!.messages
  const pageNumber = page.collection?.page ?? 1

  if (identity.startsWith('news-tag:') && page.collection?.tag) {
    const tagDef = definitions.tags[page.collection.tag]
    if (!tagDef) throw new Error(`Unknown tag in collection page: ${page.collection.tag}`)
    const tagTitle = resolveMultilanguage(tagDef.title, page.locale, options.mainLocale).text
    const archiveTitle = formatMessage(messages.tagArchiveTitle, { tag: tagTitle, title: base.title })
    return {
      title: pageNumber <= 1 ? archiveTitle : formatMessage(messages.paginatedTitle, { title: archiveTitle, page: pageNumber }),
      description: base.description,
    }
  }

  return {
    title: pageNumber <= 1 ? base.title : formatMessage(messages.paginatedTitle, { title: base.title, page: pageNumber }),
    description: base.description,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/seo/collection-copy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/seo/collection-copy.ts tests/compiler/seo/collection-copy.test.ts
git commit -m "feat(seo): resolve collection metadata"
```

---

### Task 3: Description fallback and Open Graph image

**Files:**
- Create: `src/compiler/seo/resolve-description.ts`
- Create: `src/compiler/seo/resolve-og-image.ts`
- Create: `tests/compiler/seo/resolve-description.test.ts`
- Create: `tests/compiler/seo/resolve-og-image.test.ts`

**Interfaces:**
- Produces: `resolvePageDescription(page, options, collectionCopy): string`; `resolveOgImage(page, assets): string`.

- [ ] **Step 1: Write failing tests**

```ts
// tests/compiler/seo/resolve-description.test.ts
import { describe, expect, it } from 'vitest'
import { resolvePageDescription } from '../../../src/compiler/seo/resolve-description.js'
import { page, resolvedOptions, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()

describe('resolvePageDescription', () => {
  it('prefers page description, then collection copy, then site locale description', () => {
    expect(resolvePageDescription(page({ identity: 'news:launch', locale: 'en', contentType: 'news', url: url('https://synctrol.com/en/news/launch/'), description: 'Launch summary' }), options, null)).toBe('Launch summary')
    expect(resolvePageDescription(page({ identity: 'news-index', locale: 'en', contentType: 'news-collection', url: url('https://synctrol.com/en/news/') }), options, { title: 'News', description: 'Synctrol news' })).toBe('Synctrol news')
    expect(resolvePageDescription(page({ identity: 'page:about', locale: 'zh', contentType: 'page', url: url('https://synctrol.com/zh/about/') }), options, null)).toBe('Synctrol 音乐团队官方网站')
  })
})
```

```ts
// tests/compiler/seo/resolve-og-image.test.ts
import { describe, expect, it } from 'vitest'
import { resolveOgImage } from '../../../src/compiler/seo/resolve-og-image.js'
import { page, seoContentContext, url } from '../../helpers/seo-fixtures.js'

const assets = seoContentContext({
  assets: {
    defaultImageAbsoluteUrl: 'https://synctrol.com/assets/global/social-default.hash.webp',
    organizationLogoAbsoluteUrl: 'https://synctrol.com/assets/global/logo.hash.svg',
    coverAbsoluteUrlByPackagePath: new Map([['/site/content/releases/first', 'https://synctrol.com/assets/content/release/first/cover.hash.webp']]),
  },
}).assets

describe('resolveOgImage', () => {
  it('uses cover for content detail pages, default image otherwise, and never uses artwork', () => {
    expect(resolveOgImage(page({ identity: 'release:first', locale: 'zh', contentType: 'release', packagePath: '/site/content/releases/first', url: url('https://synctrol.com/zh/releases/first/') }), assets)).toBe('https://synctrol.com/assets/content/release/first/cover.hash.webp')
    expect(resolveOgImage(page({ identity: 'home', locale: 'zh', contentType: 'home', packagePath: '/site/content/home', url: url('https://synctrol.com/zh/') }), assets)).toBe('https://synctrol.com/assets/global/social-default.hash.webp')
    expect(resolveOgImage(page({ identity: 'release:no-cover', locale: 'en', contentType: 'release', packagePath: '/site/content/releases/no-cover', url: url('https://synctrol.com/en/releases/no-cover/') }), assets)).toBe('https://synctrol.com/assets/global/social-default.hash.webp')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/seo/resolve-description.test.ts tests/compiler/seo/resolve-og-image.test.ts`

Expected: FAIL with modules not found.

- [ ] **Step 3: Implement resolvers**

```ts
// src/compiler/seo/resolve-description.ts
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { CollectionCopy } from './collection-copy.js'

export function resolvePageDescription(
  page: CompiledPage,
  options: ResolvedSynctrolThemeOptions,
  collectionCopy: CollectionCopy | null,
): string {
  if (collectionCopy) return collectionCopy.description
  if (page.description && page.description.length > 0) return page.description
  return resolveMultilanguage(options.seo.description, page.locale, options.mainLocale).text
}
```

```ts
// src/compiler/seo/resolve-og-image.ts
import type { CompiledPage } from '../../shared/route-types.js'
import type { SeoAssetContext } from '../../shared/seo/types.js'

export function resolveOgImage(page: CompiledPage, assets: SeoAssetContext): string {
  if (page.contentType === 'home') return assets.defaultImageAbsoluteUrl
  if (page.packagePath && assets.coverAbsoluteUrlByPackagePath.has(page.packagePath)) {
    return assets.coverAbsoluteUrlByPackagePath.get(page.packagePath)!
  }
  return assets.defaultImageAbsoluteUrl
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/seo/resolve-description.test.ts tests/compiler/seo/resolve-og-image.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/seo/resolve-description.ts src/compiler/seo/resolve-og-image.ts tests/compiler/seo/resolve-description.test.ts tests/compiler/seo/resolve-og-image.test.ts
git commit -m "feat(seo): resolve descriptions and og images"
```

---

### Task 4: Canonical, lang, robots, and real-translation hreflang

**Files:**
- Create: `src/compiler/seo/resolve-alternates.ts`
- Create: `tests/compiler/seo/resolve-alternates.test.ts`

**Interfaces:**
- Produces: `resolveCanonicalUrl`, `resolveLang`, `resolveRobots`, `resolveHreflang`.

Rules:
- Canonical uses the same-identity page whose `locale === page.canonicalLocale`.
- `lang` comes from `options.locales[page.locale].lang`.
- Robots uses `page.noindex`.
- `hreflang` includes only `!isFallback` same-identity pages.
- Hreflang order follows `Object.keys(options.locales)`.
- Do not emit `x-default`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/compiler/seo/resolve-alternates.test.ts
import { describe, expect, it } from 'vitest'
import { resolveCanonicalUrl, resolveHreflang, resolveLang, resolveRobots } from '../../../src/compiler/seo/resolve-alternates.js'
import { page, resolvedOptions, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()
const zhReal = page({ identity: 'release:first', locale: 'zh', contentType: 'release', url: url('https://synctrol.com/zh/releases/first/'), title: '第一张' })
const enFallback = page({ identity: 'release:first', locale: 'en', contentType: 'release', url: url('https://synctrol.com/en/releases/first/'), title: '第一张', isFallback: true, noindex: true, bodyLocale: 'zh', canonicalLocale: 'zh' })
const zhNews = page({ identity: 'news:launch', locale: 'zh', contentType: 'news', url: url('https://synctrol.com/zh/news/launch/'), title: '发布' })
const enNews = page({ identity: 'news:launch', locale: 'en', contentType: 'news', url: url('https://synctrol.com/en/news/launch/'), title: 'Launch' })

describe('resolveAlternates', () => {
  it('resolves lang, robots, canonical, and hreflang in options.locales order', () => {
    expect(resolveLang(zhReal, options)).toBe('zh-CN')
    expect(resolveRobots(enFallback)).toBe('noindex,follow')
    expect(resolveCanonicalUrl(enFallback, [zhReal, enFallback])).toBe('https://synctrol.com/zh/releases/first/')
    expect(resolveHreflang(zhNews, [enNews, zhNews], options)).toEqual([
      { hreflang: 'zh-CN', href: 'https://synctrol.com/zh/news/launch/' },
      { hreflang: 'en-US', href: 'https://synctrol.com/en/news/launch/' },
    ])
    expect(resolveHreflang(enFallback, [zhReal, enFallback], options)).toEqual([
      { hreflang: 'zh-CN', href: 'https://synctrol.com/zh/releases/first/' },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/seo/resolve-alternates.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement alternates**

```ts
// src/compiler/seo/resolve-alternates.ts
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { HreflangAlternate } from '../../shared/seo/types.js'

export function resolveLang(page: CompiledPage, options: ResolvedSynctrolThemeOptions): string {
  return options.locales[page.locale]!.lang
}

export function resolveRobots(page: CompiledPage): 'index,follow' | 'noindex,follow' {
  return page.noindex ? 'noindex,follow' : 'index,follow'
}

export function resolveCanonicalUrl(page: CompiledPage, pages: readonly CompiledPage[]): string {
  const canonical = pages.find((candidate) => candidate.identity === page.identity && candidate.locale === page.canonicalLocale)
  if (!canonical) throw new Error(`Missing canonical locale page for ${String(page.identity)} (${page.canonicalLocale})`)
  return canonical.url.absoluteUrl
}

export function resolveHreflang(
  page: CompiledPage,
  pages: readonly CompiledPage[],
  options: ResolvedSynctrolThemeOptions,
): HreflangAlternate[] {
  const localeOrder = Object.keys(options.locales)
  return localeOrder.flatMap((locale) => {
    const alternate = pages.find((candidate) => candidate.identity === page.identity && candidate.locale === locale && !candidate.isFallback)
    if (!alternate) return []
    return [{ hreflang: options.locales[alternate.locale]!.lang, href: alternate.url.absoluteUrl }]
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/seo/resolve-alternates.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/seo/resolve-alternates.ts tests/compiler/seo/resolve-alternates.test.ts
git commit -m "feat(seo): resolve canonical and hreflang"
```

---

### Task 5: Open Graph fields and head tag serialization

**Files:**
- Create: `src/compiler/seo/open-graph.ts`
- Create: `src/compiler/seo/serialize-head.ts`
- Create: `tests/compiler/seo/open-graph.test.ts`
- Create: `tests/compiler/seo/serialize-head.test.ts`

**Interfaces:**
- Produces: `buildOpenGraph(input): OpenGraphData`; `serializeHeadTags(seo): HeadTag[]`.

- [ ] **Step 1: Write failing tests**

```ts
// tests/compiler/seo/open-graph.test.ts
import { describe, expect, it } from 'vitest'
import { buildOpenGraph } from '../../../src/compiler/seo/open-graph.js'

describe('buildOpenGraph', () => {
  it('uses article for news details and website otherwise', () => {
    expect(buildOpenGraph({ contentType: 'news', title: 'Launch', description: 'Summary', canonicalUrl: 'https://synctrol.com/en/news/launch/', image: 'https://synctrol.com/cover.webp', lang: 'en-US' })).toEqual({
      type: 'article',
      title: 'Launch',
      description: 'Summary',
      url: 'https://synctrol.com/en/news/launch/',
      image: 'https://synctrol.com/cover.webp',
      locale: 'en-US',
    })
    expect(buildOpenGraph({ contentType: 'release', title: 'Album', description: 'Desc', canonicalUrl: 'https://synctrol.com/zh/releases/first/', image: 'https://synctrol.com/cover.webp', lang: 'zh-CN' }).type).toBe('website')
  })
})
```

```ts
// tests/compiler/seo/serialize-head.test.ts
import { describe, expect, it } from 'vitest'
import { serializeHeadTags } from '../../../src/compiler/seo/serialize-head.js'
import type { PageSeo } from '../../../src/shared/seo/types.js'

const seo: PageSeo = {
  title: 'Launch',
  description: 'Summary',
  canonicalUrl: 'https://synctrol.com/en/news/launch/',
  lang: 'en-US',
  robots: 'index,follow',
  openGraph: { type: 'article', title: 'Launch', description: 'Summary', url: 'https://synctrol.com/en/news/launch/', image: 'https://synctrol.com/cover.webp', locale: 'en-US' },
  hreflang: [{ hreflang: 'zh-CN', href: 'https://synctrol.com/zh/news/launch/' }],
  jsonLd: [{ '@context': 'https://schema.org', '@type': 'Article', headline: 'Launch' }],
}

describe('serializeHeadTags', () => {
  it('emits deterministic title, meta, canonical, hreflang, and json-ld tags', () => {
    const tags = serializeHeadTags(seo)
    expect(tags[0]).toEqual({ tag: 'title', text: 'Launch' })
    expect(tags).toContainEqual({ tag: 'meta', attrs: { name: 'description', content: 'Summary' } })
    expect(tags).toContainEqual({ tag: 'link', attrs: { rel: 'canonical', href: 'https://synctrol.com/en/news/launch/' } })
    expect(tags).toContainEqual({ tag: 'link', attrs: { rel: 'alternate', hreflang: 'zh-CN', href: 'https://synctrol.com/zh/news/launch/' } })
    expect(tags.at(-1)).toEqual({ tag: 'script', attrs: { type: 'application/ld+json' }, text: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Launch' }) })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/seo/open-graph.test.ts tests/compiler/seo/serialize-head.test.ts`

Expected: FAIL with modules not found.

- [ ] **Step 3: Implement Open Graph and serializer**

```ts
// src/compiler/seo/open-graph.ts
import type { CompiledPage } from '../../shared/route-types.js'
import type { OpenGraphData } from '../../shared/seo/types.js'

export function buildOpenGraph(input: {
  contentType: CompiledPage['contentType']
  title: string
  description: string
  canonicalUrl: string
  image: string
  lang: string
}): OpenGraphData {
  return {
    type: input.contentType === 'news' ? 'article' : 'website',
    title: input.title,
    description: input.description,
    url: input.canonicalUrl,
    image: input.image,
    locale: input.lang,
  }
}
```

```ts
// src/compiler/seo/serialize-head.ts
import type { HeadTag, PageSeo } from '../../shared/seo/types.js'

export function serializeHeadTags(seo: PageSeo): HeadTag[] {
  const tags: HeadTag[] = [
    { tag: 'title', text: seo.title },
    { tag: 'meta', attrs: { name: 'description', content: seo.description } },
    { tag: 'meta', attrs: { name: 'robots', content: seo.robots } },
    { tag: 'link', attrs: { rel: 'canonical', href: seo.canonicalUrl } },
    { tag: 'meta', attrs: { property: 'og:type', content: seo.openGraph.type } },
    { tag: 'meta', attrs: { property: 'og:title', content: seo.openGraph.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: seo.openGraph.description } },
    { tag: 'meta', attrs: { property: 'og:url', content: seo.openGraph.url } },
    { tag: 'meta', attrs: { property: 'og:image', content: seo.openGraph.image } },
    { tag: 'meta', attrs: { property: 'og:locale', content: seo.openGraph.locale } },
  ]
  for (const alt of seo.hreflang) {
    tags.push({ tag: 'link', attrs: { rel: 'alternate', hreflang: alt.hreflang, href: alt.href } })
  }
  for (const node of seo.jsonLd) {
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, text: JSON.stringify(node) })
  }
  return tags
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/seo/open-graph.test.ts tests/compiler/seo/serialize-head.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/seo/open-graph.ts src/compiler/seo/serialize-head.ts tests/compiler/seo/open-graph.test.ts tests/compiler/seo/serialize-head.test.ts
git commit -m "feat(seo): serialize page head metadata"
```

---

### Task 6: JSON-LD builders

**Files:**
- Create: `src/compiler/seo/json-ld.ts`
- Create: `tests/compiler/seo/json-ld.test.ts`

**Interfaces:**
- Produces: `secondsToIsoDuration`, `buildOrganizationJsonLd`, `buildWebSiteJsonLd`, `buildArticleJsonLd`, `buildAlbumJsonLd`, `buildPageJsonLd`.

Rules:
- Home emits `Organization` then `WebSite`.
- News emits `Article`.
- Album releases emit `MusicAlbum` plus one `MusicRecording` per track.
- Gift releases emit no `Product` and no music schema.

- [ ] **Step 1: Write the failing test**

```ts
// tests/compiler/seo/json-ld.test.ts
import { describe, expect, it } from 'vitest'
import { buildAlbumJsonLd, buildArticleJsonLd, buildPageJsonLd, secondsToIsoDuration } from '../../../src/compiler/seo/json-ld.js'
import type { AlbumBook, GiftBook } from '../../../src/shared/types.js'
import { page, resolvedOptions, seoContentContext, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()
const album: AlbumBook = { type: 'album', title: { zh: '第一张专辑', en: 'First Album' }, authors: ['Synctrol'], album: { discs: [{ title: 'Disc', tracks: [{ title: { zh: '曲', en: 'Track' }, artists: ['Synctrol'], duration: 120 }] }] } }
const gift: GiftBook = { type: 'gift', title: { zh: '周边', en: 'Gifts' }, gift: { items: [{ id: 'poster', title: 'Poster' }] } }

describe('json-ld builders', () => {
  it('formats durations and article schema', () => {
    expect(secondsToIsoDuration(120)).toBe('PT2M')
    expect(buildArticleJsonLd({ headline: 'Launch', description: 'Summary', canonicalUrl: 'https://synctrol.com/en/news/launch/', image: 'https://synctrol.com/og.webp', datePublished: '2026-08-11', dateModified: '2026-08-12', organizationName: 'Synctrol' })).toMatchObject({ '@type': 'Article', headline: 'Launch', dateModified: '2026-08-12' })
  })

  it('builds album recordings and omits Product for gifts', () => {
    expect(buildAlbumJsonLd({ book: album, locale: 'en', mainLocale: 'zh', pageUrl: 'https://synctrol.com/en/releases/first/' }).map((node) => node['@type'])).toEqual(['MusicAlbum', 'MusicRecording'])
    const giftNodes = buildPageJsonLd(page({ identity: 'release:gift', locale: 'en', contentType: 'release', packagePath: '/site/content/releases/gift', url: url('https://synctrol.com/en/releases/gift/') }), options, seoContentContext({ bookByPackagePath: new Map([['/site/content/releases/gift', gift]]) }), { title: 'Gift', description: 'Desc', canonicalUrl: 'https://synctrol.com/en/releases/gift/', image: 'https://synctrol.com/og.webp' })
    expect(giftNodes).toEqual([])
    expect(JSON.stringify(giftNodes)).not.toMatch(/Product/)
  })

  it('builds home site graph and news article graph', () => {
    const homeNodes = buildPageJsonLd(page({ identity: 'home', locale: 'en', contentType: 'home', url: url('https://synctrol.com/en/'), title: 'Home' }), options, seoContentContext(), { title: 'Home', description: 'Home desc', canonicalUrl: 'https://synctrol.com/en/', image: 'https://synctrol.com/og.webp' })
    expect(homeNodes.map((node) => node['@type'])).toEqual(['Organization', 'WebSite'])

    const newsNodes = buildPageJsonLd(page({ identity: 'news:launch', locale: 'en', contentType: 'news', packagePath: '/site/content/news/launch', url: url('https://synctrol.com/en/news/launch/'), title: 'Launch' }), options, seoContentContext({ dateByPackagePath: new Map([['/site/content/news/launch', '2026-08-11']]) }), { title: 'Launch', description: 'Summary', canonicalUrl: 'https://synctrol.com/en/news/launch/', image: 'https://synctrol.com/og.webp' })
    expect(newsNodes.map((node) => node['@type'])).toEqual(['Article'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/seo/json-ld.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement JSON-LD**

```ts
// src/compiler/seo/json-ld.ts
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { JsonLdNode, SeoContentContext } from '../../shared/seo/types.js'
import type { AlbumBook, LocaleKey } from '../../shared/types.js'

export function secondsToIsoDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  let out = 'PT'
  if (hours > 0) out += `${hours}H`
  if (minutes > 0) out += `${minutes}M`
  if (seconds > 0 || (hours === 0 && minutes === 0)) out += `${seconds}S`
  return out
}

export function buildOrganizationJsonLd(options: ResolvedSynctrolThemeOptions, logoAbsoluteUrl: string): JsonLdNode {
  return { '@context': 'https://schema.org', '@type': 'Organization', name: options.seo.organization.name, url: options.siteUrl, logo: logoAbsoluteUrl }
}

export function buildWebSiteJsonLd(input: { name: string; url: string; organizationName: string; organizationUrl: string }): JsonLdNode {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: input.name, url: input.url, publisher: { '@type': 'Organization', name: input.organizationName, url: input.organizationUrl } }
}

export function buildArticleJsonLd(input: { headline: string; description: string; canonicalUrl: string; image: string; datePublished: string; dateModified?: string; organizationName: string }): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    image: input.image,
    datePublished: input.datePublished,
    ...(input.dateModified === undefined ? {} : { dateModified: input.dateModified }),
    author: { '@type': 'Organization', name: input.organizationName },
    mainEntityOfPage: input.canonicalUrl,
  }
}

export function buildAlbumJsonLd(input: { book: AlbumBook; locale: LocaleKey; mainLocale: LocaleKey; pageUrl: string }): JsonLdNode[] {
  const name = resolveMultilanguage(input.book.title, input.locale, input.mainLocale).text
  const recordings: JsonLdNode[] = []
  const tracks: JsonLdNode[] = []
  let position = 0
  for (const [discIndex, disc] of (input.book.album.discs ?? []).entries()) {
    for (const [trackIndex, track] of disc.tracks.entries()) {
      position += 1
      const trackName = resolveMultilanguage(track.title, input.locale, input.mainLocale).text
      tracks.push({ '@type': 'MusicRecording', name: trackName, position })
      recordings.push({
        '@context': 'https://schema.org',
        '@type': 'MusicRecording',
        name: trackName,
        byArtist: track.artists.map((artist) => ({ '@type': 'MusicGroup', name: artist })),
        duration: secondsToIsoDuration(track.duration),
        position,
        url: `${input.pageUrl}#disc-${discIndex + 1}-track-${trackIndex + 1}`,
      })
    }
  }
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'MusicAlbum',
      name,
      numTracks: position,
      track: tracks,
      url: input.pageUrl,
      ...(input.book.authors?.length ? { byArtist: input.book.authors.map((artist) => ({ '@type': 'MusicGroup', name: artist })) } : {}),
    },
    ...recordings,
  ]
}

export function buildPageJsonLd(
  page: CompiledPage,
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
  meta: { title: string; description: string; canonicalUrl: string; image: string },
): JsonLdNode[] {
  if (page.identity === 'home') {
    return [
      buildOrganizationJsonLd(options, content.assets.organizationLogoAbsoluteUrl),
      buildWebSiteJsonLd({
        name: resolveMultilanguage(options.seo.name, page.locale, options.mainLocale).text,
        url: meta.canonicalUrl,
        organizationName: options.seo.organization.name,
        organizationUrl: options.siteUrl,
      }),
    ]
  }
  if (page.contentType === 'news' && page.packagePath) {
    const datePublished = content.dateByPackagePath.get(page.packagePath)
    if (!datePublished) throw new Error(`Missing news date for ${page.packagePath}`)
    return [buildArticleJsonLd({ headline: meta.title, description: meta.description, canonicalUrl: meta.canonicalUrl, image: meta.image, datePublished, dateModified: content.updatedByPackagePath.get(page.packagePath), organizationName: options.seo.organization.name })]
  }
  if (page.contentType === 'release' && page.packagePath) {
    const book = content.bookByPackagePath.get(page.packagePath)
    return book?.type === 'album' ? buildAlbumJsonLd({ book, locale: page.locale, mainLocale: options.mainLocale, pageUrl: meta.canonicalUrl }) : []
  }
  return []
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/seo/json-ld.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/seo/json-ld.ts tests/compiler/seo/json-ld.test.ts
git commit -m "feat(seo): add json-ld builders"
```

---

### Task 7: SEO content context adapter

**Files:**
- Create: `src/compiler/seo/content-context.ts`
- Create: `tests/compiler/seo/content-context.test.ts`

**Interfaces:**
- Consumes: `AssetManifest`, `ResolvedSynctrolThemeOptions`, `RouteContentPackage[]`, `CompiledContentPackage[]`, `ContentDefinitions`.
- Produces: `buildSeoContentContext(input): SeoContentContext`.

Rules:
- `bookByPackagePath` is keyed by absolute package `dir`.
- `dateByPackagePath` and `updatedByPackagePath` are keyed by absolute package `dir`.
- Cover map is keyed by absolute package `dir` because `CompiledPage.packagePath` uses the absolute package directory.
- Hashed global and content asset refs use `assetManifest.globalPublicPaths` / `assetManifest.contentPublicPaths` and then `ResolvedAsset.absoluteUrl`.
- Root-absolute refs become `options.siteUrl + ref`.
- HTTPS refs are preserved unchanged.
- HTTP refs are rejected so emitted SEO image URLs are HTTPS.

- [ ] **Step 1: Write the failing test**

```ts
// tests/compiler/seo/content-context.test.ts
import { describe, expect, it } from 'vitest'
import { buildSeoContentContext } from '../../../src/compiler/seo/content-context.js'
import type { AssetManifest } from '../../../src/shared/asset-types.js'
import type { AlbumBook, CompiledContentPackage, RouteContentPackage } from '../../../src/shared/types.js'
import { definitions, resolvedOptions } from '../../helpers/seo-fixtures.js'

const album: AlbumBook = { type: 'album', title: 'Album', album: { discs: [] } }

const assetManifest: AssetManifest = {
  assets: [
    { kind: 'global', sourcePath: '/site/.vuepress/assets/social.webp', assetPath: '/assets/global/social.11111111.webp', publicPath: '/assets/global/social.11111111.webp', absoluteUrl: 'https://synctrol.com/assets/global/social.11111111.webp', contentHash: '11111111' },
    { kind: 'global', sourcePath: '/site/.vuepress/assets/logo.svg', assetPath: '/assets/global/logo.22222222.svg', publicPath: '/assets/global/logo.22222222.svg', absoluteUrl: 'https://synctrol.com/assets/global/logo.22222222.svg', contentHash: '22222222' },
    { kind: 'content', sourcePath: '/site/content/releases/first/assets/cover.webp', assetPath: '/assets/content/release/first/cover.33333333.webp', publicPath: '/assets/content/release/first/cover.33333333.webp', absoluteUrl: 'https://synctrol.com/assets/content/release/first/cover.33333333.webp', contentHash: '33333333' },
  ],
  bySourcePath: {},
  globalPublicPaths: {
    './assets/social-default.webp': '/assets/global/social.11111111.webp',
    './assets/logo.svg': '/assets/global/logo.22222222.svg',
  },
  contentPublicPaths: {
    'release:first': {
      './assets/cover.webp': '/assets/content/release/first/cover.33333333.webp',
    },
  },
}

const packages: RouteContentPackage[] = [
  { dir: '/site/content/releases/first', identity: 'release:first', type: 'release', slug: 'first', date: '2026-08-05', draft: false, tags: [], cover: './assets/cover.webp', locales: {} },
  { dir: '/site/content/news/launch', identity: 'news:launch', type: 'news', slug: 'launch', date: '2026-08-11', updated: '2026-08-12', draft: false, tags: ['release'], cover: 'https://cdn.synctrol.com/news.webp', locales: {} },
]

const compiledPackages: CompiledContentPackage[] = [
  { dir: '/site/content/releases/first', identity: 'release:first', manifest: { type: 'release', draft: false, slug: 'first', date: '2026-08-05', cover: './assets/cover.webp' }, book: album },
]

describe('buildSeoContentContext', () => {
  it('maps packages, books, dates, updated dates, covers, default image, and org logo', () => {
    const context = buildSeoContentContext({ assetManifest, packages, compiledPackages, definitions: definitions(), options: resolvedOptions() })
    expect(context.assets.defaultImageAbsoluteUrl).toBe('https://synctrol.com/assets/global/social.11111111.webp')
    expect(context.assets.organizationLogoAbsoluteUrl).toBe('https://synctrol.com/assets/global/logo.22222222.svg')
    expect(context.assets.coverAbsoluteUrlByPackagePath.get('/site/content/releases/first')).toBe('https://synctrol.com/assets/content/release/first/cover.33333333.webp')
    expect(context.assets.coverAbsoluteUrlByPackagePath.get('/site/content/news/launch')).toBe('https://cdn.synctrol.com/news.webp')
    expect(context.bookByPackagePath.get('/site/content/releases/first')).toBe(album)
    expect(context.dateByPackagePath.get('/site/content/news/launch')).toBe('2026-08-11')
    expect(context.updatedByPackagePath.get('/site/content/news/launch')).toBe('2026-08-12')
    expect(context.definitions.platforms).toEqual({})
  })

  it('converts root-absolute default assets using siteUrl', () => {
    const context = buildSeoContentContext({
      assetManifest: { ...assetManifest, globalPublicPaths: {} },
      packages: [],
      compiledPackages: [],
      definitions: definitions(),
      options: resolvedOptions({ seo: { ...resolvedOptions().seo, defaultImage: '/images/og.png', organization: { name: 'Synctrol', logo: '/images/logo.png' } } }),
    })
    expect(context.assets.defaultImageAbsoluteUrl).toBe('https://synctrol.com/images/og.png')
    expect(context.assets.organizationLogoAbsoluteUrl).toBe('https://synctrol.com/images/logo.png')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/seo/content-context.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement context adapter**

```ts
// src/compiler/seo/content-context.ts
import type { AssetManifest, ResolvedAsset } from '../../shared/asset-types.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { SeoContentContext } from '../../shared/seo/types.js'
import type { CompiledContentPackage, ContentDefinitions, RouteContentPackage } from '../../shared/types.js'

function normalizedRef(ref: string): string {
  return ref.startsWith('./') ? ref : `./${ref}`
}

function assetByPublicPath(manifest: AssetManifest, publicPath: string | undefined): ResolvedAsset | undefined {
  return publicPath === undefined ? undefined : manifest.assets.find((asset) => asset.publicPath === publicPath)
}

function absoluteUrlForRef(
  ref: string,
  options: ResolvedSynctrolThemeOptions,
  manifest: AssetManifest,
  global: boolean,
  identity?: string,
): string {
  if (ref.startsWith('https://')) return ref
  if (ref.startsWith('http://')) throw new Error(`SEO asset must use HTTPS: ${ref}`)

  const publicPath = global
    ? manifest.globalPublicPaths[ref] ?? manifest.globalPublicPaths[normalizedRef(ref)]
    : identity === undefined
      ? undefined
      : manifest.contentPublicPaths[identity]?.[ref] ?? manifest.contentPublicPaths[identity]?.[normalizedRef(ref)]

  const resolved = assetByPublicPath(manifest, publicPath)
  if (resolved) return resolved.absoluteUrl
  if (publicPath) return `${options.siteUrl}${publicPath}`
  if (ref.startsWith('/')) return `${options.siteUrl}${ref}`

  throw new Error(`Missing hashed SEO asset for ${ref}`)
}

export function buildSeoContentContext(input: {
  assetManifest: AssetManifest
  packages: readonly RouteContentPackage[]
  compiledPackages: readonly CompiledContentPackage[]
  definitions: ContentDefinitions
  options: ResolvedSynctrolThemeOptions
}): SeoContentContext {
  const coverAbsoluteUrlByPackagePath = new Map<string, string>()
  const dateByPackagePath = new Map<string, string>()
  const updatedByPackagePath = new Map<string, string>()
  const bookByPackagePath = new Map(input.compiledPackages.flatMap((pkg) => (pkg.book ? [[pkg.dir, pkg.book] as const] : [])))

  for (const pkg of input.packages) {
    if (pkg.date) dateByPackagePath.set(pkg.dir, pkg.date)
    if (pkg.updated) updatedByPackagePath.set(pkg.dir, pkg.updated)
    if (pkg.cover) {
      coverAbsoluteUrlByPackagePath.set(
        pkg.dir,
        absoluteUrlForRef(pkg.cover, input.options, input.assetManifest, false, pkg.identity),
      )
    }
  }

  return {
    assets: {
      defaultImageAbsoluteUrl: absoluteUrlForRef(input.options.seo.defaultImage, input.options, input.assetManifest, true),
      organizationLogoAbsoluteUrl: absoluteUrlForRef(input.options.seo.organization.logo, input.options, input.assetManifest, true),
      coverAbsoluteUrlByPackagePath,
    },
    definitions: input.definitions,
    bookByPackagePath,
    dateByPackagePath,
    updatedByPackagePath,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/seo/content-context.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/seo/content-context.ts tests/compiler/seo/content-context.test.ts
git commit -m "feat(seo): build seo content context"
```

---

### Task 8: `buildPageSeo` orchestrator

**Files:**
- Create: `src/compiler/seo/build-page-seo.ts`
- Create: `tests/compiler/seo/build-page-seo.test.ts`

**Interfaces:**
- Consumes: Task 2-7 helpers, `CompiledPage`, `CompiledSite`, `ResolvedSynctrolThemeOptions`, `SeoContentContext`.
- Produces: `buildPageSeo(page, pages, options, content): PageSeo`; `buildSiteSeo(site, options, content): Map<string, PageSeo>` keyed by `${locale}:${routePath}`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/compiler/seo/build-page-seo.test.ts
import { describe, expect, it } from 'vitest'
import { buildPageSeo } from '../../../src/compiler/seo/build-page-seo.js'
import { page, resolvedOptions, seoContentContext, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()

describe('buildPageSeo', () => {
  it('assembles SEO for translated news, collections, and fallback pages', () => {
    const zhNews = page({ identity: 'news:launch', locale: 'zh', contentType: 'news', packagePath: '/site/content/news/launch', url: url('https://synctrol.com/zh/news/launch/'), title: '发布', description: '中文摘要' })
    const enNews = page({ identity: 'news:launch', locale: 'en', contentType: 'news', packagePath: '/site/content/news/launch', url: url('https://synctrol.com/en/news/launch/'), title: 'Launch', description: 'English summary' })
    const newsSeo = buildPageSeo(enNews, [enNews, zhNews], options, seoContentContext({ dateByPackagePath: new Map([['/site/content/news/launch', '2026-08-11']]) }))
    expect(newsSeo.title).toBe('Launch')
    expect(newsSeo.hreflang).toEqual([
      { hreflang: 'zh-CN', href: 'https://synctrol.com/zh/news/launch/' },
      { hreflang: 'en-US', href: 'https://synctrol.com/en/news/launch/' },
    ])
    expect(newsSeo.jsonLd[0]!['@type']).toBe('Article')

    const collection = page({ identity: 'release-index', locale: 'zh', contentType: 'release-collection', url: url('https://synctrol.com/zh/releases/'), collection: { page: 1, pageCount: 1, itemIdentities: [] } })
    expect(buildPageSeo(collection, [collection], options, seoContentContext()).title).toBe('作品')

    const zhRelease = page({ identity: 'release:first', locale: 'zh', contentType: 'release', url: url('https://synctrol.com/zh/releases/first/'), title: '第一张' })
    const enFallback = page({ identity: 'release:first', locale: 'en', contentType: 'release', url: url('https://synctrol.com/en/releases/first/'), title: '第一张', isFallback: true, noindex: true, canonicalLocale: 'zh', bodyLocale: 'zh' })
    const fallbackSeo = buildPageSeo(enFallback, [zhRelease, enFallback], options, seoContentContext())
    expect(fallbackSeo.canonicalUrl).toBe('https://synctrol.com/zh/releases/first/')
    expect(fallbackSeo.robots).toBe('noindex,follow')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compiler/seo/build-page-seo.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement orchestrator**

```ts
// src/compiler/seo/build-page-seo.ts
import type { CompiledSite } from '../compile-site-routes.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { PageSeo, SeoContentContext } from '../../shared/seo/types.js'
import { buildPageJsonLd } from './json-ld.js'
import { buildOpenGraph } from './open-graph.js'
import { resolveCollectionCopy } from './collection-copy.js'
import { resolveCanonicalUrl, resolveHreflang, resolveLang, resolveRobots } from './resolve-alternates.js'
import { resolvePageDescription } from './resolve-description.js'
import { resolveOgImage } from './resolve-og-image.js'

export function buildPageSeo(
  page: CompiledPage,
  pages: readonly CompiledPage[],
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
): PageSeo {
  const collectionCopy = resolveCollectionCopy(page, options, content.definitions)
  const title = collectionCopy?.title ?? page.title
  const description = resolvePageDescription(page, options, collectionCopy)
  const canonicalUrl = resolveCanonicalUrl(page, pages)
  const lang = resolveLang(page, options)
  const image = resolveOgImage(page, content.assets)
  const robots = resolveRobots(page)
  const hreflang = resolveHreflang(page, pages, options)
  const openGraph = buildOpenGraph({ contentType: page.contentType, title, description, canonicalUrl, image, lang })
  const jsonLd = buildPageJsonLd(page, options, content, { title, description, canonicalUrl, image })
  return { title, description, canonicalUrl, lang, robots, openGraph, hreflang, jsonLd }
}

export function buildSiteSeo(
  site: CompiledSite,
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
): Map<string, PageSeo> {
  const map = new Map<string, PageSeo>()
  for (const page of site.pages) {
    map.set(`${page.locale}:${page.url.routePath}`, buildPageSeo(page, site.pages, options, content))
  }
  return map
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compiler/seo/build-page-seo.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/seo/build-page-seo.ts tests/compiler/seo/build-page-seo.test.ts
git commit -m "feat(seo): build page seo metadata"
```

---

### Task 9: RSS and Sitemap generation

**Files:**
- Create: `src/compiler/feeds/rss.ts`
- Create: `src/compiler/feeds/sitemap.ts`
- Create: `tests/compiler/feeds/rss.test.ts`
- Create: `tests/compiler/feeds/sitemap.test.ts`

**Interfaces:**
- Produces: `selectRssItems`, `generateLocaleRssXml`, `rssOutputPath`, `selectSitemapUrls`, `generateSitemapXml`, `sitemapOutputPath`.

Rules:
- RSS uses `CompiledPage.isDraft` / `isFallback` exclusion intentionally; `NewsListItem.excludeFromRss` remains UI metadata.
- RSS sort: package date descending, then identity ascending.
- Sitemap includes every `!isDraft && !isFallback` compiled page URL and excludes the root language router.

- [ ] **Step 1: Write failing tests**

```ts
// tests/compiler/feeds/rss.test.ts
import { describe, expect, it } from 'vitest'
import { generateLocaleRssXml, rssOutputPath, selectRssItems } from '../../../src/compiler/feeds/rss.js'
import { page, resolvedOptions, seoContentContext, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()

describe('rss', () => {
  it('places rss under locale route path and public base', () => {
    expect(rssOutputPath('en', '/docs/')).toEqual({ routePath: '/en/rss.xml', outputPath: 'en/rss.xml', publicPath: '/docs/en/rss.xml' })
  })

  it('selects non-draft non-fallback news and release pages newest first', () => {
    const pages = [
      page({ identity: 'news:older', locale: 'en', contentType: 'news', packagePath: '/site/content/news/older', url: url('https://synctrol.com/en/news/older/'), title: 'Older', description: 'Old news' }),
      page({ identity: 'release:first', locale: 'en', contentType: 'release', packagePath: '/site/content/releases/first', url: url('https://synctrol.com/en/releases/first/'), title: 'First' }),
      page({ identity: 'news:draft', locale: 'en', contentType: 'news', packagePath: '/site/content/news/draft', url: url('https://synctrol.com/en/news/draft/'), title: 'Draft', isDraft: true, noindex: true }),
      page({ identity: 'news:fallback', locale: 'en', contentType: 'news', packagePath: '/site/content/news/fallback', url: url('https://synctrol.com/en/news/fallback/'), title: 'Fallback', isFallback: true, noindex: true, canonicalLocale: 'zh' }),
      page({ identity: 'home', locale: 'en', contentType: 'home', url: url('https://synctrol.com/en/'), title: 'Home' }),
    ]
    const items = selectRssItems(pages, 'en', options, seoContentContext({ dateByPackagePath: new Map([['/site/content/news/older', '2026-08-01'], ['/site/content/releases/first', '2026-08-05'], ['/site/content/news/draft', '2026-08-10'], ['/site/content/news/fallback', '2026-08-09']]) }))
    expect(items.map((item) => item.title)).toEqual(['First', 'Older'])
    expect(items[0]!.pubDate).toBe('Wed, 05 Aug 2026 00:00:00 GMT')
  })

  it('renders RSS XML metadata', () => {
    const xml = generateLocaleRssXml({ locale: 'en', options, channelLink: 'https://synctrol.com/en/', items: [{ title: 'Launch', description: 'Summary', link: 'https://synctrol.com/en/news/launch/', guid: 'https://synctrol.com/en/news/launch/', pubDate: 'Tue, 11 Aug 2026 00:00:00 GMT' }] })
    expect(xml).toContain('<rss version="2.0">')
    expect(xml).toContain('<title>Synctrol</title>')
    expect(xml).toContain('<guid>https://synctrol.com/en/news/launch/</guid>')
  })
})
```

```ts
// tests/compiler/feeds/sitemap.test.ts
import { describe, expect, it } from 'vitest'
import { generateSitemapXml, selectSitemapUrls, sitemapOutputPath } from '../../../src/compiler/feeds/sitemap.js'
import { page, url } from '../../helpers/seo-fixtures.js'

describe('sitemap', () => {
  it('writes sitemap.xml at destination root with base-aware public path', () => {
    expect(sitemapOutputPath('/docs/')).toEqual({ routePath: '/sitemap.xml', outputPath: 'sitemap.xml', publicPath: '/docs/sitemap.xml' })
  })

  it('excludes drafts and fallbacks and keeps locale URLs', () => {
    const urls = selectSitemapUrls([
      page({ identity: 'home', locale: 'zh', contentType: 'home', url: url('https://synctrol.com/zh/'), title: '首页' }),
      page({ identity: 'home', locale: 'en', contentType: 'home', url: url('https://synctrol.com/en/'), title: 'Home' }),
      page({ identity: 'news:draft', locale: 'zh', contentType: 'news', url: url('https://synctrol.com/zh/news/draft/'), title: 'Draft', isDraft: true, noindex: true }),
      page({ identity: 'news:only-zh', locale: 'en', contentType: 'news', url: url('https://synctrol.com/en/news/only-zh/'), title: 'Only', isFallback: true, noindex: true, canonicalLocale: 'zh' }),
    ])
    expect(urls).toEqual(['https://synctrol.com/en/', 'https://synctrol.com/zh/'])
    expect(generateSitemapXml(urls)).toContain('<loc>https://synctrol.com/en/</loc>')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/feeds/rss.test.ts tests/compiler/feeds/sitemap.test.ts`

Expected: FAIL with modules not found.

- [ ] **Step 3: Implement feeds**

```ts
// src/compiler/feeds/rss.ts
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { RssItem, SeoContentContext } from '../../shared/seo/types.js'
import type { LocaleKey } from '../../shared/types.js'
import { resolvePageDescription } from '../seo/resolve-description.js'

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

export function calendarDateToRfc1123(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!, 0, 0, 0)).toUTCString()
}

export function rssOutputPath(locale: LocaleKey, base: string): { routePath: string; outputPath: string; publicPath: string } {
  const routePath = `/${locale}/rss.xml`
  return { routePath, outputPath: `${locale}/rss.xml`, publicPath: joinPublicPath(normalizeBase(base), routePath) }
}

export function selectRssItems(
  pages: readonly CompiledPage[],
  locale: LocaleKey,
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
): RssItem[] {
  return pages
    .filter((page) => page.locale === locale && (page.contentType === 'news' || page.contentType === 'release') && !page.isDraft && !page.isFallback && page.packagePath)
    .sort((a, b) => {
      const da = content.dateByPackagePath.get(a.packagePath!) ?? ''
      const db = content.dateByPackagePath.get(b.packagePath!) ?? ''
      if (da !== db) return db < da ? -1 : 1
      const ai = String(a.identity)
      const bi = String(b.identity)
      return ai < bi ? -1 : ai > bi ? 1 : 0
    })
    .map((page) => {
      const date = content.dateByPackagePath.get(page.packagePath!)
      if (!date) throw new Error(`Missing date for RSS item ${page.packagePath}`)
      return {
        title: page.title,
        description: resolvePageDescription(page, options, null),
        link: page.url.absoluteUrl,
        guid: page.url.absoluteUrl,
        pubDate: calendarDateToRfc1123(date),
      }
    })
}

export function generateLocaleRssXml(input: { locale: LocaleKey; options: ResolvedSynctrolThemeOptions; channelLink: string; items: readonly RssItem[] }): string {
  const title = resolveMultilanguage(input.options.seo.name, input.locale, input.options.mainLocale).text
  const description = resolveMultilanguage(input.options.seo.description, input.locale, input.options.mainLocale).text
  const itemXml = input.items.map((item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid>${escapeXml(item.guid)}</guid>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(input.channelLink)}</link>
    <description>${escapeXml(description)}</description>
    <language>${escapeXml(input.options.locales[input.locale]!.lang)}</language>
${itemXml}
  </channel>
</rss>
`
}
```

```ts
// src/compiler/feeds/sitemap.ts
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'
import type { CompiledPage } from '../../shared/route-types.js'

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

export function sitemapOutputPath(base: string): { routePath: string; outputPath: string; publicPath: string } {
  const routePath = '/sitemap.xml'
  return { routePath, outputPath: 'sitemap.xml', publicPath: joinPublicPath(normalizeBase(base), routePath) }
}

export function selectSitemapUrls(pages: readonly CompiledPage[]): string[] {
  return pages.filter((page) => !page.isDraft && !page.isFallback).map((page) => page.url.absoluteUrl).sort()
}

export function generateSitemapXml(urls: readonly string[]): string {
  const body = urls.map((loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
  </url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/feeds/rss.test.ts tests/compiler/feeds/sitemap.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/feeds/rss.ts src/compiler/feeds/sitemap.ts tests/compiler/feeds/rss.test.ts tests/compiler/feeds/sitemap.test.ts
git commit -m "feat(feeds): generate rss and sitemap"
```

---

### Task 10: Emit orchestrator, public exports, and VuePress integration

**Files:**
- Create: `src/compiler/seo/emit-seo-and-feeds.ts`
- Create: `src/compiler/seo/index.ts`
- Create: `tests/compiler/seo/emit-seo-and-feeds.test.ts`
- Modify: `src/compiler/theme.ts`
- Modify: `src/index.ts`
- Modify: `tests/compiler/theme.integration.test.ts`
- Modify: `tests/public-exports.test.ts`

**Interfaces:**
- Produces: `emitSeoAndFeeds(input): EmitSeoAndFeedsResult`.
- Public exports: `export * from './compiler/seo/index.js'` and SEO type exports from `./shared/seo/types.js`.
- Theme integration: convert `HeadTag[]` to VuePress-compatible head tuples locally in `theme.ts`; write `filesToWrite` under `app.dir.dest()`.

- [ ] **Step 1: Write failing unit and integration tests**

```ts
// tests/compiler/seo/emit-seo-and-feeds.test.ts
import { describe, expect, it } from 'vitest'
import { emitSeoAndFeeds } from '../../../src/compiler/seo/emit-seo-and-feeds.js'
import { page, resolvedOptions, seoContentContext, siteFixture, url } from '../../helpers/seo-fixtures.js'

function site() {
  return siteFixture([
    page({ identity: 'home', locale: 'zh', contentType: 'home', url: url('https://synctrol.com/zh/'), title: '首页' }),
    page({ identity: 'home', locale: 'en', contentType: 'home', url: url('https://synctrol.com/en/'), title: 'Home' }),
    page({ identity: 'news:launch', locale: 'zh', contentType: 'news', packagePath: '/site/content/news/launch', url: url('https://synctrol.com/zh/news/launch/'), title: '发布', description: '新闻说明' }),
    page({ identity: 'news:launch', locale: 'en', contentType: 'news', packagePath: '/site/content/news/launch', url: url('https://synctrol.com/en/news/launch/'), title: 'Launch', description: 'News blurb' }),
    page({ identity: 'news:secret', locale: 'zh', contentType: 'news', packagePath: '/site/content/news/secret', url: url('https://synctrol.com/zh/news/secret/'), title: '秘密', isDraft: true, noindex: true }),
  ])
}

const content = seoContentContext({
  dateByPackagePath: new Map([
    ['/site/content/news/launch', '2026-08-11'],
    ['/site/content/news/secret', '2026-08-10'],
  ]),
})

describe('emitSeoAndFeeds', () => {
  it('builds head tags, rss for each locale, and sitemap while honoring exclusions', () => {
    const result = emitSeoAndFeeds({ site: site(), options: resolvedOptions(), content, base: '/' })
    expect(result.headTagsByRoute.get('en:/en/news/launch/')!.some((tag) => tag.tag === 'title' && tag.text === 'Launch')).toBe(true)
    expect(result.filesToWrite.map((file) => file.outputPath).sort()).toEqual(['en/rss.xml', 'sitemap.xml', 'zh/rss.xml'])
    expect(result.filesToWrite.find((file) => file.outputPath === 'zh/rss.xml')!.contents).not.toContain('秘密')
    expect(result.filesToWrite.find((file) => file.outputPath === 'sitemap.xml')!.contents).not.toContain('/zh/news/secret/')
  })

  it('suppresses rss and sitemap without changing page head SEO', () => {
    const full = emitSeoAndFeeds({ site: site(), options: resolvedOptions(), content, base: '/' })
    const neither = emitSeoAndFeeds({ site: site(), options: resolvedOptions({ feeds: { rss: false, sitemap: false } }), content, base: '/' })
    expect(neither.filesToWrite).toEqual([])
    expect(neither.headTagsByRoute.get('en:/en/news/launch/')).toEqual(full.headTagsByRoute.get('en:/en/news/launch/'))
  })
})
```

Add assertions to `tests/compiler/theme.integration.test.ts`:

```ts
it('attaches SEO head tags and writes rss/sitemap while preserving root router and CSP', async () => {
  write('content/news/alpha/content.yml', 'type: news\nslug: alpha\ndate: 2026-08-11\ntags: [release]\n')
  write('content/news/alpha/zh.md', '---\ntitle: Alpha\ndescription: Alpha desc\n---\n正文\n')
  write('content/news/alpha/en.md', '---\ntitle: Alpha EN\ndescription: Alpha EN desc\n---\nBody\n')

  const app = await runBuild()
  const page = app.pages.find((candidate: Page) => candidate.path === '/en/news/alpha/')
  expect(page).toBeDefined()
  expect(page!.frontmatter.title).toBe('Alpha EN')
  expect(page!.frontmatter.head).toEqual(
    expect.arrayContaining([
      ['link', { rel: 'canonical', href: 'https://synctrol.com/en/news/alpha/' }],
      ['meta', { property: 'og:type', content: 'article' }],
    ]),
  )

  const dest = app.dir.dest()
  expect(existsSync(join(dest, 'en/rss.xml'))).toBe(true)
  expect(existsSync(join(dest, 'zh/rss.xml'))).toBe(true)
  expect(existsSync(join(dest, 'sitemap.xml'))).toBe(true)
  expect(existsSync(join(dest, 'index.html'))).toBe(true)
  expect(existsSync(join(dest, 'synctrol-csp.json'))).toBe(true)
})
```

Add export assertions to `tests/public-exports.test.ts`:

```ts
import { buildPageSeo, buildSeoContentContext, emitSeoAndFeeds } from '../src/index.js'

expect(typeof buildPageSeo).toBe('function')
expect(typeof buildSeoContentContext).toBe('function')
expect(typeof emitSeoAndFeeds).toBe('function')
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/compiler/seo/emit-seo-and-feeds.test.ts tests/compiler/theme.integration.test.ts tests/public-exports.test.ts
```

Expected: FAIL with missing emit module/export and missing production feed/head integration.

- [ ] **Step 3: Implement emit orchestrator and barrel**

```ts
// src/compiler/seo/emit-seo-and-feeds.ts
import type { CompiledSite } from '../compile-site-routes.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { HeadTag, PageSeo, SeoContentContext } from '../../shared/seo/types.js'
import { generateLocaleRssXml, rssOutputPath, selectRssItems } from '../feeds/rss.js'
import { generateSitemapXml, selectSitemapUrls, sitemapOutputPath } from '../feeds/sitemap.js'
import { buildSiteSeo } from './build-page-seo.js'
import { serializeHeadTags } from './serialize-head.js'

export interface FeedFileToWrite {
  outputPath: string
  publicPath: string
  contents: string
}

export interface EmitSeoAndFeedsResult {
  pageSeo: Map<string, PageSeo>
  headTagsByRoute: Map<string, HeadTag[]>
  filesToWrite: FeedFileToWrite[]
}

export function emitSeoAndFeeds(input: {
  site: CompiledSite
  options: ResolvedSynctrolThemeOptions
  content: SeoContentContext
  base: string
}): EmitSeoAndFeedsResult {
  const pageSeo = buildSiteSeo(input.site, input.options, input.content)
  const headTagsByRoute = new Map([...pageSeo].map(([key, seo]) => [key, serializeHeadTags(seo)] as const))
  const filesToWrite: FeedFileToWrite[] = []

  if (input.options.feeds.rss) {
    for (const locale of Object.keys(input.options.locales)) {
      const home = input.site.pages.find((page) => page.locale === locale && page.identity === 'home')
      if (!home) throw new Error(`Missing home page for locale RSS channel: ${locale}`)
      const paths = rssOutputPath(locale, input.base)
      filesToWrite.push({
        outputPath: paths.outputPath,
        publicPath: paths.publicPath,
        contents: generateLocaleRssXml({
          locale,
          options: input.options,
          channelLink: home.url.absoluteUrl,
          items: selectRssItems(input.site.pages, locale, input.options, input.content),
        }),
      })
    }
  }

  if (input.options.feeds.sitemap) {
    const paths = sitemapOutputPath(input.base)
    filesToWrite.push({
      outputPath: paths.outputPath,
      publicPath: paths.publicPath,
      contents: generateSitemapXml(selectSitemapUrls(input.site.pages)),
    })
  }

  return { pageSeo, headTagsByRoute, filesToWrite }
}
```

```ts
// src/compiler/seo/index.ts
export { buildPageSeo, buildSiteSeo } from './build-page-seo.js'
export { buildSeoContentContext } from './content-context.js'
export { emitSeoAndFeeds } from './emit-seo-and-feeds.js'
export { serializeHeadTags } from './serialize-head.js'
export { resolveCollectionCopy } from './collection-copy.js'
export * from '../feeds/rss.js'
export * from '../feeds/sitemap.js'
```

Patch `src/index.ts`:

```ts
export * from './compiler/seo/index.js'
export type {
  HeadTag,
  HreflangAlternate,
  JsonLdNode,
  OpenGraphData,
  PageSeo,
  RssItem,
  SeoAssetContext,
  SeoContentContext,
} from './shared/seo/types.js'
```

- [ ] **Step 4: Patch `theme.ts` additively**

Add imports:

```ts
import type { HeadTag } from '../shared/seo/types.js'
import { buildSeoContentContext, emitSeoAndFeeds, type EmitSeoAndFeedsResult } from './seo/index.js'
```

Add local adapter and state:

```ts
type VuePressHeadTag = [string, Record<string, string>] | [string, Record<string, string>, string]

function toVuePressHead(tags: readonly HeadTag[]): VuePressHeadTag[] {
  return tags.map((tag) =>
    tag.text === undefined
      ? [tag.tag, tag.attrs ?? {}]
      : [tag.tag, tag.attrs ?? {}, tag.text],
  )
}
```

Inside `synctrolTheme`, next to `let built`:

```ts
let seoAndFeeds: EmitSeoAndFeedsResult | undefined
```

After `compileAssets(...)`, before the page loop:

```ts
const seoContent = buildSeoContentContext({
  assetManifest,
  packages: built.packages,
  compiledPackages: built.compiledPackages,
  definitions: built.definitions,
  options: resolved,
})
seoAndFeeds = emitSeoAndFeeds({
  site: built.site,
  options: resolved,
  content: seoContent,
  base: app.options.base,
})
```

During `createPage`, before calling `createPage`:

```ts
const seoKey = `${compiled.locale}:${compiled.url.routePath}`
const seoForPage = seoAndFeeds.pageSeo.get(seoKey)
const headForPage = seoAndFeeds.headTagsByRoute.get(seoKey) ?? []
```

Then update frontmatter without changing nested `synctrol` shape:

```ts
frontmatter: {
  lang: seoForPage?.lang ?? resolved.locales[compiled.locale]?.lang ?? compiled.locale,
  title: seoForPage?.title ?? compiled.title,
  ...(seoForPage?.description === undefined
    ? compiled.description === undefined
      ? {}
      : { description: compiled.description }
    : { description: seoForPage.description }),
  head: toVuePressHead(headForPage),
  synctrol: {
    // keep the existing nested fields exactly as Plans 03-09 require
  },
},
```

During `onGenerated`, after the root router write and before/after CSP (order does not matter), write feed files while preserving both existing artifacts:

```ts
for (const file of seoAndFeeds?.filesToWrite ?? []) {
  const target = app.dir.dest(file.outputPath)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, file.contents, 'utf8')
}
```

- [ ] **Step 5: Run integration and public export tests**

Run:

```bash
npm test -- tests/compiler/seo/emit-seo-and-feeds.test.ts tests/compiler/theme.integration.test.ts tests/public-exports.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run all SEO/feed tests**

Run:

```bash
npm test -- tests/shared/seo tests/compiler/seo tests/compiler/feeds
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/compiler/seo src/compiler/feeds src/shared/seo src/compiler/theme.ts src/index.ts tests/helpers/seo-fixtures.ts tests/shared/seo tests/compiler/seo tests/compiler/feeds tests/compiler/theme.integration.test.ts tests/public-exports.test.ts
git commit -m "feat(seo): integrate page seo rss and sitemap"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
| --- | --- |
| Current HEAD type ownership and NodeNext `.js` imports | Revision Notes, Tasks 1-10 |
| Existing `formatMessage` reuse | Task 1, Task 2 |
| `ContentDefinitions` with `tags` and `platforms` | Task 1 fixtures, Tasks 2/7 tests |
| Collection SEO copy | Task 2 |
| Description fallback and OG image cover/default behavior | Task 3 |
| Canonical, `lang`, robots, real-only `hreflang` with deterministic order | Task 4 |
| Open Graph and HeadTag serialization | Task 5 |
| JSON-LD Article / MusicAlbum / MusicRecording / WebSite / Organization; no Product | Task 6 |
| Explicit package/assets -> SEO content context | Task 7 |
| Page SEO orchestration | Task 8 |
| RSS and Sitemap generation; Plan 09 `excludeFromRss` relationship | Task 9 |
| Feed toggles, public exports, and additive `theme.ts` production integration | Task 10 |
| Preserve Plans 03-09 frontmatter/Layout/assets/platforms/release/news/page/home/root-router/CSP | Revision Notes, Task 10 |

**Placeholder scan:** No task contains a deferred implementation step; implementation snippets bind exact files, imports, commands, and expected outcomes.

**Type consistency:** `ResolvedSynctrolThemeOptions`, `CompiledPage`, `ContentIdentity`, `CompiledSite`, `ContentDefinitions`, `joinPublicPath`, `normalizeBase`, `SeoContentContext`, `SeoAssetContext`, `PageSeo`, `HeadTag`, and RSS/Sitemap outputs use current HEAD modules and stable names across tasks.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-11-10-seo-and-feeds.md`.

Implementation options:

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration (`superpowers:subagent-driven-development`).

**2. Inline Execution** - execute tasks in one session using `superpowers:executing-plans`, batching with checkpoints.
