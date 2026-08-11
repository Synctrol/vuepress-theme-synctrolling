# SEO and Feeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit per-page SEO metadata (title, description, canonical, Open Graph, `lang`, real-translation-only `hreflang`, JSON-LD) and locale RSS / site Sitemap artifacts from compiled Synctrol pages and theme `seo` / `feeds` options.

**Architecture:** Pure Node modules under `src/node/seo/` and `src/node/feeds/` compute a `PageSeo` record and XML strings from Plan 03 `CompiledPage` data plus Plan 01 `ResolvedSynctrolThemeOptions`. Collection titles are resolved here from `seo.collections` and locale `messages` (Plan 03 left placeholder identity strings). Feed writers honor `feeds.rss` / `feeds.sitemap` toggles without affecting head meta. A thin emit orchestrator serializes head tags and writes `/{locale}/rss.xml` plus `/sitemap.xml` under the VuePress destination.

**Tech Stack:** TypeScript, Vitest, VuePress 2 theme package `vuepress-theme-synctrolling`, Plan 01 options/messages, Plan 02 Book/definitions types, Plan 03 `CompiledPage` / `UrlLayers`, Plan 04 absolute asset URLs (consumed via an injected `SeoAssetContext`).

## Global Constraints

- Package name: `vuepress-theme-synctrolling`
- `siteUrl` is required in production builds and has no trailing slash; absolute URLs are `siteUrl` + public path
- `seo` is required theme config: `name`, `description`, `defaultImage`, `organization`, `collections.release`, `collections.news`
- `seo.organization.url` is always `siteUrl` (not a separate config field)
- `feeds.rss` and `feeds.sitemap` default to `true`; `false` suppresses only that artifact
- Description fallback: page locale description when present, otherwise site locale `seo.description`
- Open Graph image uses `cover` when configured, otherwise `seo.defaultImage`; never substitutes `artwork`
- Home has no `cover`; Home OG image is always `seo.defaultImage`
- `hreflang` lists real translations only; fallback pages emit no false translation alternate
- Fallback pages: `noindex`, canonical points at main-locale page URL
- Drafts remain `noindex` and stay out of Sitemap and RSS
- JSON-LD: News → `Article`; Album Book → `MusicAlbum` + `MusicRecording`; Gift → no `Product`; locale Home → `WebSite` + `Organization`
- RSS path is `/{locale}/rss.xml` (locale-prefixed route path; VuePress `base` applies to public/output paths)
- RSS includes News and Release detail items only; excludes drafts, fallback pages, collections, Home, and Page
- Sitemap is a single `/sitemap.xml` containing locale-specific absolute URL entries; excludes drafts and fallback
- Collection index titles/descriptions come from `seo.collections`; paginated titles use `messages.paginatedTitle`; tag archives use `messages.tagArchiveTitle` with localized tag title + News collection title; pagination/tag descriptions remain the collection description
- Tests run with `pnpm exec vitest run <path>`
- Plans 01–09 are assumed complete for types, content, routes, assets, Release Book, and News pages; this plan does not reimplement discovery, routing, or layouts

## File Structure

| File | Responsibility |
| --- | --- |
| `src/shared/seo/types.ts` | `PageSeo`, `HeadTag`, `SeoAssetContext`, `JsonLdNode`, feed item types |
| `src/shared/seo/format-message.ts` | Substitute `{title}`, `{page}`, `{tag}` in locale message templates |
| `src/node/seo/collection-copy.ts` | Resolve collection / paginated / tag-archive title + description |
| `src/node/seo/resolve-description.ts` | Page description with site-locale fallback |
| `src/node/seo/resolve-og-image.ts` | Cover-or-default OG image; never artwork |
| `src/node/seo/resolve-alternates.ts` | Canonical URL, `lang`, robots, real-translation `hreflang` |
| `src/node/seo/open-graph.ts` | Build Open Graph fields from resolved SEO pieces |
| `src/node/seo/json-ld.ts` | `WebSite`, `Organization`, `Article`, `MusicAlbum`, `MusicRecording` builders |
| `src/node/seo/build-page-seo.ts` | Orchestrate one `PageSeo` per `CompiledPage` |
| `src/node/seo/serialize-head.ts` | Turn `PageSeo` into ordered `HeadTag[]` |
| `src/node/feeds/rss.ts` | Locale RSS 2.0 XML for News + Release |
| `src/node/feeds/sitemap.ts` | Single sitemap XML of locale page absolute URLs |
| `src/node/seo/emit-seo-and-feeds.ts` | Build all page SEO + write feed files when toggles allow |
| `tests/helpers/seo-fixtures.ts` | Minimal options, pages, assets, books for SEO/feed tests |
| `tests/shared/seo/*.test.ts` | `formatMessage` unit tests |
| `tests/node/seo/*.test.ts` | SEO resolver unit tests |
| `tests/node/feeds/*.test.ts` | RSS / Sitemap unit tests |
| `tests/node/seo/emit-seo-and-feeds.test.ts` | Toggle + integration coverage |

**Prerequisite types (import; do not redefine):**

```ts
// Plan 01
export type LocaleKey = string
export type Multilanguage = string | Record<LocaleKey, string>
export type ContentType = 'home' | 'release' | 'news' | 'page'
export interface LocaleMessages {
  paginatedTitle: string // {title}, {page}
  tagArchiveTitle: string // {tag}, {title}
  // … remaining keys exist but are unused by this plan
}
export interface SeoCollectionCopy {
  title: Multilanguage
  description: Multilanguage
}
export interface SeoOptions {
  name: Multilanguage
  description: Multilanguage
  defaultImage: string
  organization: { name: string; logo: string }
  collections: { release: SeoCollectionCopy; news: SeoCollectionCopy }
}
export interface ResolvedSynctrolThemeOptions {
  siteUrl: string
  mainLocale: LocaleKey
  locales: Record<LocaleKey, { lang: string; label: string; messages: LocaleMessages }>
  showDrafts: boolean
  feeds: { rss: boolean; sitemap: boolean }
  seo: SeoOptions
  // … other fields unused here
}
export function resolveMultilanguage(
  value: Multilanguage,
  locale: LocaleKey,
  mainLocale: LocaleKey,
): { text: string; locale: LocaleKey; fellBack: boolean }

// Plan 02
export type Book = AlbumBook | GiftBook
export interface AlbumBook {
  type: 'album'
  title: Multilanguage
  desc?: Multilanguage
  authors?: string[]
  copyright?: string
  album: { discs?: Disc[]; covers?: string[]; links?: unknown[] }
}
export interface GiftBook {
  type: 'gift'
  title: Multilanguage
  gift: { items: unknown[] }
}
export interface Disc {
  title: Multilanguage
  tracks: Track[]
}
export interface Track {
  title: Multilanguage
  artists: string[]
  duration: number
}
export interface ContentDefinitions {
  tags: Record<string, { title: Multilanguage }>
}

// Plan 03
export interface UrlLayers {
  routePath: string
  outputPath: string
  publicPath: string
  absoluteUrl: string
}
export interface CompiledPage {
  identity: string
  locale: LocaleKey
  contentType: ContentType | 'release-collection' | 'news-collection'
  url: UrlLayers
  isFallback: boolean
  isDraft: boolean
  noindex: boolean
  bodyLocale: LocaleKey
  canonicalLocale: LocaleKey
  packagePath?: string
  slug?: string | null
  title: string
  description?: string
  collection?: {
    page: number
    pageCount: number
    itemIdentities: string[]
    tag?: string
  }
}
export interface CompiledSite {
  pages: CompiledPage[]
  diagnostics: unknown[]
  rootRouterHtml: string
}
```

**Asset contract from Plan 04 (injected; this plan does not hash assets):**

```ts
export interface SeoAssetContext {
  defaultImageAbsoluteUrl: string
  organizationLogoAbsoluteUrl: string
  /** Absolute HTTPS URL for a package cover when the package declares `cover`. */
  coverAbsoluteUrlByPackagePath: ReadonlyMap<string, string>
}
```

**Release Book lookup contract from Plan 08 (injected):**

```ts
export interface SeoContentContext {
  assets: SeoAssetContext
  definitions: ContentDefinitions
  /** Package path → validated Book when `book.yml` exists. */
  bookByPackagePath: ReadonlyMap<string, Book>
  /** Package path → `YYYY-MM-DD` date for News/Release detail items. */
  dateByPackagePath: ReadonlyMap<string, string>
  /** Package path → optional `YYYY-MM-DD` updated date for News. */
  updatedByPackagePath: ReadonlyMap<string, string>
}
```

---

### Task 1: SEO shared types and `formatMessage`

**Files:**
- Create: `src/shared/seo/types.ts`
- Create: `src/shared/seo/format-message.ts`
- Create: `tests/shared/seo/format-message.test.ts`
- Create: `tests/helpers/seo-fixtures.ts`

**Interfaces:**
- Consumes: Plan 01 `LocaleKey`, `Multilanguage`, `SeoOptions`; Plan 03 `CompiledPage`
- Produces: `PageSeo`, `HeadTag`, `HreflangAlternate`, `OpenGraphData`, `SeoAssetContext`, `SeoContentContext`, `formatMessage(template, vars)`

- [ ] **Step 1: Write the failing test**

```ts
// tests/shared/seo/format-message.test.ts
import { describe, expect, it } from 'vitest'
import { formatMessage } from '../../../src/shared/seo/format-message'

describe('formatMessage', () => {
  it('substitutes named placeholders from locale message templates', () => {
    expect(
      formatMessage('{title} · Page {page}', { title: 'News', page: 2 }),
    ).toBe('News · Page 2')
    expect(
      formatMessage('{tag} · {title}', { tag: 'Releases', title: 'News' }),
    ).toBe('Releases · News')
    expect(
      formatMessage('{title} · 第 {page} 页', { title: '作品', page: 3 }),
    ).toBe('作品 · 第 3 页')
  })

  it('leaves unknown placeholders intact', () => {
    expect(formatMessage('{title} · {missing}', { title: 'X' })).toBe(
      'X · {missing}',
    )
  })
})
```

```ts
// tests/helpers/seo-fixtures.ts
import type {
  CompiledPage,
  LocaleKey,
  ResolvedSynctrolThemeOptions,
} from '../../src/shared/types'
import type { SeoContentContext } from '../../src/shared/seo/types'
import { enMessages, zhMessages } from '../../src/shared/messages'

export function resolvedOptions(
  overrides: Partial<ResolvedSynctrolThemeOptions> = {},
): ResolvedSynctrolThemeOptions {
  const base: ResolvedSynctrolThemeOptions = {
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    locales: {
      zh: {
        lang: 'zh-CN',
        label: '中文',
        dateFormat: { dateStyle: 'long' },
        messages: zhMessages,
      },
      en: {
        lang: 'en-US',
        label: 'English',
        dateFormat: { dateStyle: 'long' },
        messages: enMessages,
      },
    },
    showDrafts: false,
    defaultColorMode: 'auto',
    copyright: 'SYNCTROL © 2026',
    feeds: { rss: true, sitemap: true },
    navigation: { externalTarget: '_blank', items: [] },
    socialLinks: { items: [] },
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
    platforms: { loadStrategy: 'interaction', types: {} },
    backgrounds: {},
    seo: {
      name: { zh: 'Synctrol', en: 'Synctrol' },
      description: {
        zh: 'Synctrol 音乐团队官方网站',
        en: 'Official website of the Synctrol music team',
      },
      defaultImage: './assets/social-default.webp',
      organization: { name: 'Synctrol', logo: './assets/logo.svg' },
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
  }
  return {
    ...base,
    ...overrides,
    locales: overrides.locales ?? base.locales,
    feeds: overrides.feeds ?? base.feeds,
    seo: overrides.seo ?? base.seo,
  }
}

export function page(
  overrides: Partial<CompiledPage> &
    Pick<CompiledPage, 'identity' | 'locale' | 'contentType' | 'url'>,
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

export function url(
  absoluteUrl: string,
  routePath?: string,
): CompiledPage['url'] {
  const path =
    routePath ??
    absoluteUrl.replace('https://synctrol.com', '')
  return {
    routePath: path,
    outputPath: `${path.slice(1)}index.html`.replace(/\/index\.html$/, '/index.html'),
    publicPath: path,
    absoluteUrl,
  }
}

export function seoContentContext(
  overrides: Partial<SeoContentContext> = {},
): SeoContentContext {
  return {
    assets: {
      defaultImageAbsoluteUrl:
        'https://synctrol.com/assets/global/social-default.hash.webp',
      organizationLogoAbsoluteUrl:
        'https://synctrol.com/assets/global/logo.hash.svg',
      coverAbsoluteUrlByPackagePath: new Map(),
      ...overrides.assets,
    },
    definitions: { tags: {}, ...overrides.definitions },
    bookByPackagePath: overrides.bookByPackagePath ?? new Map(),
    dateByPackagePath: overrides.dateByPackagePath ?? new Map(),
    updatedByPackagePath: overrides.updatedByPackagePath ?? new Map(),
  }
}

export const localeKeys = ['zh', 'en'] as LocaleKey[]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/shared/seo/format-message.test.ts`

Expected: FAIL with module not found for `../../../src/shared/seo/format-message`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/seo/types.ts
import type { Book, ContentDefinitions, LocaleKey } from '../types'

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
  /** BCP 47 language tag from locale `lang`, or `x-default` is not used. */
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
export function formatMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return String(vars[key])
    }
    return match
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/shared/seo/format-message.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/seo/types.ts src/shared/seo/format-message.ts tests/shared/seo/format-message.test.ts tests/helpers/seo-fixtures.ts
git commit -m "feat(seo): add shared SEO types and message formatter"
```

---

### Task 2: Collection SEO titles and descriptions

**Files:**
- Create: `src/node/seo/collection-copy.ts`
- Create: `tests/node/seo/collection-copy.test.ts`

**Interfaces:**
- Consumes: `formatMessage`; `resolveMultilanguage`; `ResolvedSynctrolThemeOptions.seo.collections` and `locales.*.messages`; `CompiledPage.collection` / identity
- Produces: `resolveCollectionCopy(page, options): { title: string; description: string } | null` — `null` when the page is not a collection page

Rules:

- Release/News index (`release-index`, `news-index`): `seo.collections.*.title` / `.description`
- Paginated (`release-page:N`, `news-page:N`, `news-tag:…:page:N`): `messages.paginatedTitle` with `{title}` = collection title and `{page}` = page number; description stays collection description
- Tag archive index (`news-tag:{tag}`): `messages.tagArchiveTitle` with `{tag}` = localized tag title from definitions and `{title}` = News collection title; description = News collection description
- Tags index (`news-tags-index`): News collection title + description
- Non-collection pages return `null`

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/seo/collection-copy.test.ts
import { describe, expect, it } from 'vitest'
import { resolveCollectionCopy } from '../../../src/node/seo/collection-copy'
import { page, resolvedOptions, url } from '../../helpers/seo-fixtures'

const options = resolvedOptions()

describe('resolveCollectionCopy', () => {
  it('returns null for detail pages', () => {
    expect(
      resolveCollectionCopy(
        page({
          identity: 'release:first',
          locale: 'en',
          contentType: 'release',
          url: url('https://synctrol.com/en/releases/first/'),
          title: 'First',
        }),
        options,
        { tags: {} },
      ),
    ).toBeNull()
  })

  it('uses seo.collections for release and news indexes', () => {
    expect(
      resolveCollectionCopy(
        page({
          identity: 'release-index',
          locale: 'zh',
          contentType: 'release-collection',
          url: url('https://synctrol.com/zh/releases/'),
          collection: { page: 1, pageCount: 1, itemIdentities: [] },
        }),
        options,
        { tags: {} },
      ),
    ).toEqual({
      title: '作品',
      description: 'Synctrol 作品列表',
    })

    expect(
      resolveCollectionCopy(
        page({
          identity: 'news-index',
          locale: 'en',
          contentType: 'news-collection',
          url: url('https://synctrol.com/en/news/'),
          collection: { page: 1, pageCount: 1, itemIdentities: [] },
        }),
        options,
        { tags: {} },
      ),
    ).toEqual({
      title: 'News',
      description: 'Synctrol news',
    })
  })

  it('formats paginatedTitle for page 2+', () => {
    expect(
      resolveCollectionCopy(
        page({
          identity: 'news-page:2',
          locale: 'en',
          contentType: 'news-collection',
          url: url('https://synctrol.com/en/news/page/2/'),
          collection: { page: 2, pageCount: 3, itemIdentities: [] },
        }),
        options,
        { tags: {} },
      ),
    ).toEqual({
      title: 'News · Page 2',
      description: 'Synctrol news',
    })

    expect(
      resolveCollectionCopy(
        page({
          identity: 'release-page:3',
          locale: 'zh',
          contentType: 'release-collection',
          url: url('https://synctrol.com/zh/releases/page/3/'),
          collection: { page: 3, pageCount: 4, itemIdentities: [] },
        }),
        options,
        { tags: {} },
      ),
    ).toEqual({
      title: '作品 · 第 3 页',
      description: 'Synctrol 作品列表',
    })
  })

  it('formats tagArchiveTitle with localized tag and news collection title', () => {
    expect(
      resolveCollectionCopy(
        page({
          identity: 'news-tag:release',
          locale: 'en',
          contentType: 'news-collection',
          url: url('https://synctrol.com/en/news/tags/release/'),
          collection: {
            page: 1,
            pageCount: 1,
            itemIdentities: [],
            tag: 'release',
          },
        }),
        options,
        {
          tags: {
            release: {
              title: { zh: '作品发布', en: 'Releases' },
            },
          },
        },
      ),
    ).toEqual({
      title: 'Releases · News',
      description: 'Synctrol news',
    })
  })

  it('paginates tag archives with paginatedTitle around the tag archive title', () => {
    const copy = resolveCollectionCopy(
      page({
        identity: 'news-tag:release:page:2',
        locale: 'zh',
        contentType: 'news-collection',
        url: url('https://synctrol.com/zh/news/tags/release/page/2/'),
        collection: {
          page: 2,
          pageCount: 2,
          itemIdentities: [],
          tag: 'release',
        },
      }),
      options,
      {
        tags: {
          release: {
            title: { zh: '作品发布', en: 'Releases' },
          },
        },
      },
    )
    expect(copy).toEqual({
      title: '作品发布 · 新闻 · 第 2 页',
      description: 'Synctrol 新闻',
    })
  })

  it('uses news collection copy for news-tags-index', () => {
    expect(
      resolveCollectionCopy(
        page({
          identity: 'news-tags-index',
          locale: 'en',
          contentType: 'news-collection',
          url: url('https://synctrol.com/en/news/tags/'),
          collection: { page: 1, pageCount: 1, itemIdentities: [] },
        }),
        options,
        { tags: {} },
      ),
    ).toEqual({ title: 'News', description: 'Synctrol news' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/seo/collection-copy.test.ts`

Expected: FAIL with module not found for `collection-copy`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/seo/collection-copy.ts
import { formatMessage } from '../../shared/seo/format-message'
import type { ContentDefinitions, LocaleKey } from '../../shared/types'
import type { CompiledPage } from '../../shared/types/routes'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options'
import { resolveMultilanguage } from '../../shared/multilanguage'

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
    description: resolveMultilanguage(
      block.description,
      locale,
      options.mainLocale,
    ).text,
  }
}

function isReleaseCollection(identity: string): boolean {
  return identity === 'release-index' || identity.startsWith('release-page:')
}

function isNewsCollection(identity: string): boolean {
  return (
    identity === 'news-index' ||
    identity === 'news-tags-index' ||
    identity.startsWith('news-page:') ||
    identity.startsWith('news-tag:')
  )
}

export function resolveCollectionCopy(
  page: CompiledPage,
  options: ResolvedSynctrolThemeOptions,
  definitions: ContentDefinitions,
): CollectionCopy | null {
  const identity = String(page.identity)
  if (!isReleaseCollection(identity) && !isNewsCollection(identity)) {
    return null
  }

  const kind: 'release' | 'news' = isReleaseCollection(identity)
    ? 'release'
    : 'news'
  const base = siteCollection(options, kind, page.locale)
  const messages = options.locales[page.locale]!.messages

  if (identity === 'release-index' || identity === 'news-index') {
    return base
  }

  if (identity === 'news-tags-index') {
    return base
  }

  const tagKey = page.collection?.tag
  if (tagKey && identity.startsWith('news-tag:')) {
    const tagDef = definitions.tags[tagKey]
    if (!tagDef) {
      throw new Error(`Unknown tag in collection page: ${tagKey}`)
    }
    const tagTitle = resolveMultilanguage(
      tagDef.title,
      page.locale,
      options.mainLocale,
    ).text
    const archiveTitle = formatMessage(messages.tagArchiveTitle, {
      tag: tagTitle,
      title: base.title,
    })
    const pageNumber = page.collection?.page ?? 1
    if (pageNumber <= 1) {
      return { title: archiveTitle, description: base.description }
    }
    return {
      title: formatMessage(messages.paginatedTitle, {
        title: archiveTitle,
        page: pageNumber,
      }),
      description: base.description,
    }
  }

  const pageNumber = page.collection?.page ?? 1
  if (pageNumber <= 1) {
    return base
  }
  return {
    title: formatMessage(messages.paginatedTitle, {
      title: base.title,
      page: pageNumber,
    }),
    description: base.description,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/seo/collection-copy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/seo/collection-copy.ts tests/node/seo/collection-copy.test.ts
git commit -m "feat(seo): resolve collection, pagination, and tag archive titles"
```

---

### Task 3: Description fallback and Open Graph image

**Files:**
- Create: `src/node/seo/resolve-description.ts`
- Create: `src/node/seo/resolve-og-image.ts`
- Create: `tests/node/seo/resolve-description.test.ts`
- Create: `tests/node/seo/resolve-og-image.test.ts`

**Interfaces:**
- Consumes: `resolveMultilanguage`; `SeoOptions.description`; `CompiledPage.description` / `packagePath` / `contentType`; `SeoAssetContext`
- Produces: `resolvePageDescription(page, options, collectionCopy): string`; `resolveOgImage(page, assets): string`

Rules:

- Collection pages use `collectionCopy.description`
- Detail/Home/Page: `page.description` when defined and non-empty; otherwise site locale `seo.description`
- OG image: if `contentType === 'home'` → `defaultImageAbsoluteUrl`; else if package has a cover URL in the map → that URL; else `defaultImageAbsoluteUrl`
- Artwork is never consulted (no artwork map parameter exists)

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/seo/resolve-description.test.ts
import { describe, expect, it } from 'vitest'
import { resolvePageDescription } from '../../../src/node/seo/resolve-description'
import { page, resolvedOptions, url } from '../../helpers/seo-fixtures'

const options = resolvedOptions()

describe('resolvePageDescription', () => {
  it('prefers the page locale description', () => {
    expect(
      resolvePageDescription(
        page({
          identity: 'news:launch',
          locale: 'en',
          contentType: 'news',
          url: url('https://synctrol.com/en/news/launch/'),
          description: 'Launch summary',
        }),
        options,
        null,
      ),
    ).toBe('Launch summary')
  })

  it('falls back to site locale seo.description', () => {
    expect(
      resolvePageDescription(
        page({
          identity: 'page:about',
          locale: 'zh',
          contentType: 'page',
          url: url('https://synctrol.com/zh/about/'),
        }),
        options,
        null,
      ),
    ).toBe('Synctrol 音乐团队官方网站')

    expect(
      resolvePageDescription(
        page({
          identity: 'release:first',
          locale: 'en',
          contentType: 'release',
          url: url('https://synctrol.com/en/releases/first/'),
          description: undefined,
        }),
        options,
        null,
      ),
    ).toBe('Official website of the Synctrol music team')
  })

  it('uses collection copy description when provided', () => {
    expect(
      resolvePageDescription(
        page({
          identity: 'news-index',
          locale: 'en',
          contentType: 'news-collection',
          url: url('https://synctrol.com/en/news/'),
          description: 'ignored',
        }),
        options,
        { title: 'News', description: 'Synctrol news' },
      ),
    ).toBe('Synctrol news')
  })
})
```

```ts
// tests/node/seo/resolve-og-image.test.ts
import { describe, expect, it } from 'vitest'
import { resolveOgImage } from '../../../src/node/seo/resolve-og-image'
import { page, seoContentContext, url } from '../../helpers/seo-fixtures'

describe('resolveOgImage', () => {
  const assets = seoContentContext({
    assets: {
      defaultImageAbsoluteUrl:
        'https://synctrol.com/assets/global/social-default.hash.webp',
      organizationLogoAbsoluteUrl:
        'https://synctrol.com/assets/global/logo.hash.svg',
      coverAbsoluteUrlByPackagePath: new Map([
        [
          'content/releases/first',
          'https://synctrol.com/assets/content/release/first/cover.hash.webp',
        ],
        [
          'content/news/launch',
          'https://synctrol.com/assets/content/news/launch/cover.hash.webp',
        ],
      ]),
    },
  }).assets

  it('uses cover when present for news and release', () => {
    expect(
      resolveOgImage(
        page({
          identity: 'release:first',
          locale: 'zh',
          contentType: 'release',
          packagePath: 'content/releases/first',
          url: url('https://synctrol.com/zh/releases/first/'),
        }),
        assets,
      ),
    ).toBe(
      'https://synctrol.com/assets/content/release/first/cover.hash.webp',
    )
  })

  it('never receives artwork and falls back to defaultImage when cover absent', () => {
    expect(
      resolveOgImage(
        page({
          identity: 'release:no-cover',
          locale: 'en',
          contentType: 'release',
          packagePath: 'content/releases/no-cover',
          url: url('https://synctrol.com/en/releases/no-cover/'),
        }),
        assets,
      ),
    ).toBe('https://synctrol.com/assets/global/social-default.hash.webp')
  })

  it('always uses defaultImage for Home', () => {
    expect(
      resolveOgImage(
        page({
          identity: 'home',
          locale: 'zh',
          contentType: 'home',
          packagePath: 'content/home',
          url: url('https://synctrol.com/zh/'),
        }),
        assets,
      ),
    ).toBe('https://synctrol.com/assets/global/social-default.hash.webp')
  })

  it('uses defaultImage for collection pages', () => {
    expect(
      resolveOgImage(
        page({
          identity: 'news-index',
          locale: 'en',
          contentType: 'news-collection',
          url: url('https://synctrol.com/en/news/'),
        }),
        assets,
      ),
    ).toBe('https://synctrol.com/assets/global/social-default.hash.webp')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/node/seo/resolve-description.test.ts tests/node/seo/resolve-og-image.test.ts`

Expected: FAIL with modules not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/seo/resolve-description.ts
import type { CollectionCopy } from './collection-copy'
import type { CompiledPage } from '../../shared/types/routes'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options'
import { resolveMultilanguage } from '../../shared/multilanguage'

export function resolvePageDescription(
  page: CompiledPage,
  options: ResolvedSynctrolThemeOptions,
  collectionCopy: CollectionCopy | null,
): string {
  if (collectionCopy) {
    return collectionCopy.description
  }
  if (page.description && page.description.length > 0) {
    return page.description
  }
  return resolveMultilanguage(
    options.seo.description,
    page.locale,
    options.mainLocale,
  ).text
}
```

```ts
// src/node/seo/resolve-og-image.ts
import type { SeoAssetContext } from '../../shared/seo/types'
import type { CompiledPage } from '../../shared/types/routes'

export function resolveOgImage(
  page: CompiledPage,
  assets: SeoAssetContext,
): string {
  if (page.contentType === 'home') {
    return assets.defaultImageAbsoluteUrl
  }
  if (
    page.packagePath &&
    assets.coverAbsoluteUrlByPackagePath.has(page.packagePath)
  ) {
    return assets.coverAbsoluteUrlByPackagePath.get(page.packagePath)!
  }
  return assets.defaultImageAbsoluteUrl
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/seo/resolve-description.test.ts tests/node/seo/resolve-og-image.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/seo/resolve-description.ts src/node/seo/resolve-og-image.ts tests/node/seo/resolve-description.test.ts tests/node/seo/resolve-og-image.test.ts
git commit -m "feat(seo): resolve descriptions and OG images without artwork fallback"
```

---

### Task 4: Canonical, lang, robots, and real-translation hreflang

**Files:**
- Create: `src/node/seo/resolve-alternates.ts`
- Create: `tests/node/seo/resolve-alternates.test.ts`

**Interfaces:**
- Consumes: `CompiledPage[]` for the same content identity; locale `lang`; `canonicalLocale`; `isFallback`; `noindex`
- Produces: `resolveCanonicalUrl(page, pages): string`; `resolveLang(page, options): string`; `resolveRobots(page): 'index,follow' | 'noindex,follow'`; `resolveHreflang(page, pages, options): HreflangAlternate[]`

Rules:

- Canonical: absolute URL of the page whose `locale === page.canonicalLocale` and same `identity`; for normal pages that is self
- `lang`: `options.locales[page.locale].lang`
- Robots: `noindex,follow` when `page.noindex` (draft or fallback); otherwise `index,follow`
- Hreflang: among pages with the same `identity`, include only those with `isFallback === false`; each entry uses that alternate's locale `lang` and `absoluteUrl`
- Fallback pages still emit hreflang pointing only at real translations (including the main locale), never listing the fallback URL as a translation of itself under a false claim — exclude `isFallback` pages from the alternate set entirely
- Do not emit `x-default`

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/seo/resolve-alternates.test.ts
import { describe, expect, it } from 'vitest'
import {
  resolveCanonicalUrl,
  resolveHreflang,
  resolveLang,
  resolveRobots,
} from '../../../src/node/seo/resolve-alternates'
import { page, resolvedOptions, url } from '../../helpers/seo-fixtures'

const options = resolvedOptions()

const zhReal = page({
  identity: 'release:first',
  locale: 'zh',
  contentType: 'release',
  url: url('https://synctrol.com/zh/releases/first/'),
  title: '第一张',
})

const enFallback = page({
  identity: 'release:first',
  locale: 'en',
  contentType: 'release',
  url: url('https://synctrol.com/en/releases/first/'),
  title: '第一张',
  isFallback: true,
  noindex: true,
  bodyLocale: 'zh',
  canonicalLocale: 'zh',
})

const enReal = page({
  identity: 'news:launch',
  locale: 'en',
  contentType: 'news',
  url: url('https://synctrol.com/en/news/launch/'),
  title: 'Launch',
})

const zhNews = page({
  identity: 'news:launch',
  locale: 'zh',
  contentType: 'news',
  url: url('https://synctrol.com/zh/news/launch/'),
  title: '发布',
})

describe('resolveAlternates', () => {
  it('uses locale lang from options', () => {
    expect(resolveLang(zhReal, options)).toBe('zh-CN')
    expect(resolveLang(enReal, options)).toBe('en-US')
  })

  it('marks drafts and fallbacks noindex', () => {
    expect(resolveRobots(zhReal)).toBe('index,follow')
    expect(resolveRobots(enFallback)).toBe('noindex,follow')
    expect(
      resolveRobots(
        page({
          identity: 'news:draft',
          locale: 'zh',
          contentType: 'news',
          url: url('https://synctrol.com/zh/news/draft/'),
          isDraft: true,
          noindex: true,
        }),
      ),
    ).toBe('noindex,follow')
  })

  it('points fallback canonical at the main-locale page', () => {
    expect(resolveCanonicalUrl(enFallback, [zhReal, enFallback])).toBe(
      'https://synctrol.com/zh/releases/first/',
    )
    expect(resolveCanonicalUrl(zhReal, [zhReal, enFallback])).toBe(
      'https://synctrol.com/zh/releases/first/',
    )
  })

  it('emits hreflang for real translations only', () => {
    expect(resolveHreflang(zhReal, [zhReal, enFallback], options)).toEqual([
      {
        hreflang: 'zh-CN',
        href: 'https://synctrol.com/zh/releases/first/',
      },
    ])

    expect(resolveHreflang(zhNews, [zhNews, enReal], options)).toEqual([
      {
        hreflang: 'zh-CN',
        href: 'https://synctrol.com/zh/news/launch/',
      },
      {
        hreflang: 'en-US',
        href: 'https://synctrol.com/en/news/launch/',
      },
    ])

    // Fallback page still lists only real translations (zh), never itself
    expect(resolveHreflang(enFallback, [zhReal, enFallback], options)).toEqual([
      {
        hreflang: 'zh-CN',
        href: 'https://synctrol.com/zh/releases/first/',
      },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/seo/resolve-alternates.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/seo/resolve-alternates.ts
import type { HreflangAlternate } from '../../shared/seo/types'
import type { CompiledPage } from '../../shared/types/routes'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options'

export function resolveLang(
  page: CompiledPage,
  options: ResolvedSynctrolThemeOptions,
): string {
  return options.locales[page.locale]!.lang
}

export function resolveRobots(
  page: CompiledPage,
): 'index,follow' | 'noindex,follow' {
  return page.noindex ? 'noindex,follow' : 'index,follow'
}

export function resolveCanonicalUrl(
  page: CompiledPage,
  pages: CompiledPage[],
): string {
  const canonical = pages.find(
    (candidate) =>
      candidate.identity === page.identity &&
      candidate.locale === page.canonicalLocale,
  )
  if (!canonical) {
    throw new Error(
      `Missing canonical locale page for ${String(page.identity)} (${page.canonicalLocale})`,
    )
  }
  return canonical.url.absoluteUrl
}

export function resolveHreflang(
  page: CompiledPage,
  pages: CompiledPage[],
  options: ResolvedSynctrolThemeOptions,
): HreflangAlternate[] {
  return pages
    .filter(
      (candidate) =>
        candidate.identity === page.identity && candidate.isFallback === false,
    )
    .map((candidate) => ({
      hreflang: options.locales[candidate.locale]!.lang,
      href: candidate.url.absoluteUrl,
    }))
    .sort((a, b) => a.hreflang.localeCompare(b.hreflang))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/seo/resolve-alternates.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/seo/resolve-alternates.ts tests/node/seo/resolve-alternates.test.ts
git commit -m "feat(seo): resolve canonical, lang, robots, and real-translation hreflang"
```

---

### Task 5: Open Graph fields and head tag serialization

**Files:**
- Create: `src/node/seo/open-graph.ts`
- Create: `src/node/seo/serialize-head.ts`
- Create: `tests/node/seo/open-graph.test.ts`
- Create: `tests/node/seo/serialize-head.test.ts`

**Interfaces:**
- Consumes: title, description, canonical, lang, image, page content type
- Produces: `buildOpenGraph(input): OpenGraphData`; `serializeHeadTags(seo: PageSeo): HeadTag[]`

Open Graph rules:

- `og:type` is `article` for News detail (`contentType === 'news'`); otherwise `website`
- `og:title` / `og:description` / `og:url` / `og:image` / `og:locale` mirror resolved SEO title, description, canonical URL, OG image, and `lang`

Head tag order:

1. `<title>`
2. `meta name="description"`
3. `meta name="robots"`
4. `link rel="canonical"`
5. `meta property="og:*"`
6. `link rel="alternate" hreflang`
7. `script type="application/ld+json"` per JSON-LD node (empty array allowed)

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/seo/open-graph.test.ts
import { describe, expect, it } from 'vitest'
import { buildOpenGraph } from '../../../src/node/seo/open-graph'

describe('buildOpenGraph', () => {
  it('uses article type for news details and website otherwise', () => {
    expect(
      buildOpenGraph({
        contentType: 'news',
        title: 'Launch',
        description: 'Summary',
        canonicalUrl: 'https://synctrol.com/en/news/launch/',
        image: 'https://synctrol.com/assets/global/social-default.hash.webp',
        lang: 'en-US',
      }),
    ).toEqual({
      type: 'article',
      title: 'Launch',
      description: 'Summary',
      url: 'https://synctrol.com/en/news/launch/',
      image: 'https://synctrol.com/assets/global/social-default.hash.webp',
      locale: 'en-US',
    })

    expect(
      buildOpenGraph({
        contentType: 'release',
        title: 'Album',
        description: 'Desc',
        canonicalUrl: 'https://synctrol.com/zh/releases/first/',
        image: 'https://synctrol.com/cover.webp',
        lang: 'zh-CN',
      }).type,
    ).toBe('website')
  })
})
```

```ts
// tests/node/seo/serialize-head.test.ts
import { describe, expect, it } from 'vitest'
import { serializeHeadTags } from '../../../src/node/seo/serialize-head'
import type { PageSeo } from '../../../src/shared/seo/types'

const seo: PageSeo = {
  title: 'Launch',
  description: 'Summary',
  canonicalUrl: 'https://synctrol.com/en/news/launch/',
  lang: 'en-US',
  robots: 'index,follow',
  openGraph: {
    type: 'article',
    title: 'Launch',
    description: 'Summary',
    url: 'https://synctrol.com/en/news/launch/',
    image: 'https://synctrol.com/cover.webp',
    locale: 'en-US',
  },
  hreflang: [
    { hreflang: 'en-US', href: 'https://synctrol.com/en/news/launch/' },
    { hreflang: 'zh-CN', href: 'https://synctrol.com/zh/news/launch/' },
  ],
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Launch',
    },
  ],
}

describe('serializeHeadTags', () => {
  it('emits title, description, robots, canonical, og, hreflang, and json-ld', () => {
    const tags = serializeHeadTags(seo)
    expect(tags[0]).toEqual({ tag: 'title', text: 'Launch' })
    expect(tags).toContainEqual({
      tag: 'meta',
      attrs: { name: 'description', content: 'Summary' },
    })
    expect(tags).toContainEqual({
      tag: 'meta',
      attrs: { name: 'robots', content: 'index,follow' },
    })
    expect(tags).toContainEqual({
      tag: 'link',
      attrs: { rel: 'canonical', href: 'https://synctrol.com/en/news/launch/' },
    })
    expect(tags).toContainEqual({
      tag: 'meta',
      attrs: { property: 'og:type', content: 'article' },
    })
    expect(tags).toContainEqual({
      tag: 'meta',
      attrs: { property: 'og:image', content: 'https://synctrol.com/cover.webp' },
    })
    expect(tags).toContainEqual({
      tag: 'link',
      attrs: {
        rel: 'alternate',
        hreflang: 'zh-CN',
        href: 'https://synctrol.com/zh/news/launch/',
      },
    })
    expect(tags.at(-1)).toEqual({
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      text: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Launch',
      }),
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/node/seo/open-graph.test.ts tests/node/seo/serialize-head.test.ts`

Expected: FAIL with modules not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/seo/open-graph.ts
import type { OpenGraphData } from '../../shared/seo/types'
import type { CompiledPage } from '../../shared/types/routes'

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
// src/node/seo/serialize-head.ts
import type { HeadTag, PageSeo } from '../../shared/seo/types'

export function serializeHeadTags(seo: PageSeo): HeadTag[] {
  const tags: HeadTag[] = [
    { tag: 'title', text: seo.title },
    {
      tag: 'meta',
      attrs: { name: 'description', content: seo.description },
    },
    {
      tag: 'meta',
      attrs: { name: 'robots', content: seo.robots },
    },
    {
      tag: 'link',
      attrs: { rel: 'canonical', href: seo.canonicalUrl },
    },
    {
      tag: 'meta',
      attrs: { property: 'og:type', content: seo.openGraph.type },
    },
    {
      tag: 'meta',
      attrs: { property: 'og:title', content: seo.openGraph.title },
    },
    {
      tag: 'meta',
      attrs: {
        property: 'og:description',
        content: seo.openGraph.description,
      },
    },
    {
      tag: 'meta',
      attrs: { property: 'og:url', content: seo.openGraph.url },
    },
    {
      tag: 'meta',
      attrs: { property: 'og:image', content: seo.openGraph.image },
    },
    {
      tag: 'meta',
      attrs: { property: 'og:locale', content: seo.openGraph.locale },
    },
  ]

  for (const alt of seo.hreflang) {
    tags.push({
      tag: 'link',
      attrs: {
        rel: 'alternate',
        hreflang: alt.hreflang,
        href: alt.href,
      },
    })
  }

  for (const node of seo.jsonLd) {
    tags.push({
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      text: JSON.stringify(node),
    })
  }

  return tags
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/seo/open-graph.test.ts tests/node/seo/serialize-head.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/seo/open-graph.ts src/node/seo/serialize-head.ts tests/node/seo/open-graph.test.ts tests/node/seo/serialize-head.test.ts
git commit -m "feat(seo): build Open Graph data and serialize head tags"
```

---

### Task 6: JSON-LD builders (WebSite, Organization, Article, MusicAlbum, MusicRecording; no Product)

**Files:**
- Create: `src/node/seo/json-ld.ts`
- Create: `tests/node/seo/json-ld.test.ts`

**Interfaces:**
- Consumes: `SeoOptions.organization`, `siteUrl`, page fields, `Book`, `resolveMultilanguage`, OG image URL
- Produces: `buildOrganizationJsonLd(options, assets): JsonLdNode`; `buildWebSiteJsonLd(page, options, organization): JsonLdNode`; `buildArticleJsonLd(input): JsonLdNode`; `buildAlbumJsonLd(input): JsonLdNode[]`; `buildPageJsonLd(page, options, content, meta): JsonLdNode[]`

Rules:

- Locale Home (`identity === 'home'`): emit `Organization` then `WebSite` (WebSite references organization name/url)
- News detail: emit `Article` with `headline`, `datePublished`, optional `dateModified`, `image`, `mainEntityOfPage`, `author` as Organization name
- Release with `AlbumBook`: emit one `MusicAlbum` and one `MusicRecording` per track (stable disc/track order); durations as ISO-8601 `PT#H#M#S` from integer seconds
- Release with `GiftBook` or no book: emit **no** `Product`, `MusicAlbum`, or `MusicRecording`
- Collection / Page types: no content JSON-LD beyond Home’s site graph

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/seo/json-ld.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildAlbumJsonLd,
  buildArticleJsonLd,
  buildPageJsonLd,
  secondsToIsoDuration,
} from '../../../src/node/seo/json-ld'
import {
  page,
  resolvedOptions,
  seoContentContext,
  url,
} from '../../helpers/seo-fixtures'
import type { AlbumBook, GiftBook } from '../../../src/shared/types'

const options = resolvedOptions()
const assets = seoContentContext().assets

const album: AlbumBook = {
  type: 'album',
  title: { zh: '第一张专辑', en: 'First Album' },
  authors: ['Synctrol'],
  album: {
    discs: [
      {
        title: { zh: '第一碟', en: 'Disc One' },
        tracks: [
          {
            title: { zh: '第一曲', en: 'Track One' },
            artists: ['Synctrol'],
            duration: 272,
          },
          {
            title: { zh: '第二曲', en: 'Track Two' },
            artists: ['Synctrol', 'Guest'],
            duration: 65,
          },
        ],
      },
    ],
  },
}

const gift: GiftBook = {
  type: 'gift',
  title: { zh: '周边', en: 'Gifts' },
  gift: { items: [{ id: 'poster', title: 'Poster' }] },
}

describe('secondsToIsoDuration', () => {
  it('encodes hours minutes seconds', () => {
    expect(secondsToIsoDuration(272)).toBe('PT4M32S')
    expect(secondsToIsoDuration(65)).toBe('PT1M5S')
    expect(secondsToIsoDuration(3600)).toBe('PT1H')
    expect(secondsToIsoDuration(0)).toBe('PT0S')
  })
})

describe('buildArticleJsonLd', () => {
  it('builds Article for news', () => {
    expect(
      buildArticleJsonLd({
        headline: 'Launch',
        description: 'Summary',
        canonicalUrl: 'https://synctrol.com/en/news/launch/',
        image: assets.defaultImageAbsoluteUrl,
        datePublished: '2026-08-11',
        dateModified: '2026-08-12',
        organizationName: 'Synctrol',
      }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Launch',
      description: 'Summary',
      image: assets.defaultImageAbsoluteUrl,
      datePublished: '2026-08-11',
      dateModified: '2026-08-12',
      author: { '@type': 'Organization', name: 'Synctrol' },
      mainEntityOfPage: 'https://synctrol.com/en/news/launch/',
    })
  })
})

describe('buildAlbumJsonLd', () => {
  it('emits MusicAlbum and MusicRecording for album books', () => {
    const nodes = buildAlbumJsonLd({
      book: album,
      locale: 'en',
      mainLocale: 'zh',
      pageUrl: 'https://synctrol.com/en/releases/first/',
    })
    expect(nodes[0]).toMatchObject({
      '@type': 'MusicAlbum',
      name: 'First Album',
      numTracks: 2,
    })
    expect(nodes.slice(1)).toEqual([
      {
        '@context': 'https://schema.org',
        '@type': 'MusicRecording',
        name: 'Track One',
        byArtist: [{ '@type': 'MusicGroup', name: 'Synctrol' }],
        duration: 'PT4M32S',
        position: 1,
        url: 'https://synctrol.com/en/releases/first/#disc-1-track-1',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'MusicRecording',
        name: 'Track Two',
        byArtist: [
          { '@type': 'MusicGroup', name: 'Synctrol' },
          { '@type': 'MusicGroup', name: 'Guest' },
        ],
        duration: 'PT1M5S',
        position: 2,
        url: 'https://synctrol.com/en/releases/first/#disc-1-track-2',
      },
    ])
  })
})

describe('buildPageJsonLd', () => {
  it('emits WebSite and Organization on locale Home', () => {
    const nodes = buildPageJsonLd(
      page({
        identity: 'home',
        locale: 'en',
        contentType: 'home',
        url: url('https://synctrol.com/en/'),
        title: 'Home',
        description: 'Official website of the Synctrol music team',
      }),
      options,
      seoContentContext(),
      {
        title: 'Home',
        description: 'Official website of the Synctrol music team',
        canonicalUrl: 'https://synctrol.com/en/',
        image: assets.defaultImageAbsoluteUrl,
      },
    )
    expect(nodes.map((n) => n['@type'])).toEqual([
      'Organization',
      'WebSite',
    ])
    expect(nodes[0]).toMatchObject({
      '@type': 'Organization',
      name: 'Synctrol',
      url: 'https://synctrol.com',
      logo: assets.organizationLogoAbsoluteUrl,
    })
    expect(nodes[1]).toMatchObject({
      '@type': 'WebSite',
      name: 'Synctrol',
      url: 'https://synctrol.com/en/',
    })
  })

  it('emits Article for news and album schemas for album releases', () => {
    const newsNodes = buildPageJsonLd(
      page({
        identity: 'news:launch',
        locale: 'en',
        contentType: 'news',
        packagePath: 'content/news/launch',
        url: url('https://synctrol.com/en/news/launch/'),
        title: 'Launch',
        description: 'Summary',
      }),
      options,
      seoContentContext({
        dateByPackagePath: new Map([['content/news/launch', '2026-08-11']]),
        updatedByPackagePath: new Map([['content/news/launch', '2026-08-12']]),
      }),
      {
        title: 'Launch',
        description: 'Summary',
        canonicalUrl: 'https://synctrol.com/en/news/launch/',
        image: assets.defaultImageAbsoluteUrl,
      },
    )
    expect(newsNodes).toHaveLength(1)
    expect(newsNodes[0]!['@type']).toBe('Article')

    const albumNodes = buildPageJsonLd(
      page({
        identity: 'release:first',
        locale: 'en',
        contentType: 'release',
        packagePath: 'content/releases/first',
        url: url('https://synctrol.com/en/releases/first/'),
        title: 'First Album',
      }),
      options,
      seoContentContext({
        bookByPackagePath: new Map([['content/releases/first', album]]),
      }),
      {
        title: 'First Album',
        description: 'Official website of the Synctrol music team',
        canonicalUrl: 'https://synctrol.com/en/releases/first/',
        image: assets.defaultImageAbsoluteUrl,
      },
    )
    expect(albumNodes.map((n) => n['@type'])).toEqual([
      'MusicAlbum',
      'MusicRecording',
      'MusicRecording',
    ])
  })

  it('emits no Product (and no music schema) for gift releases', () => {
    const nodes = buildPageJsonLd(
      page({
        identity: 'release:poster',
        locale: 'zh',
        contentType: 'release',
        packagePath: 'content/releases/poster',
        url: url('https://synctrol.com/zh/releases/poster/'),
        title: '周边',
      }),
      options,
      seoContentContext({
        bookByPackagePath: new Map([['content/releases/poster', gift]]),
      }),
      {
        title: '周边',
        description: 'Synctrol 音乐团队官方网站',
        canonicalUrl: 'https://synctrol.com/zh/releases/poster/',
        image: assets.defaultImageAbsoluteUrl,
      },
    )
    expect(nodes).toEqual([])
    expect(JSON.stringify(nodes)).not.toMatch(/Product/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/seo/json-ld.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/seo/json-ld.ts
import type { JsonLdNode, SeoContentContext } from '../../shared/seo/types'
import type {
  AlbumBook,
  LocaleKey,
} from '../../shared/types'
import type { CompiledPage } from '../../shared/types/routes'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options'
import { resolveMultilanguage } from '../../shared/multilanguage'

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

export function buildOrganizationJsonLd(
  options: ResolvedSynctrolThemeOptions,
  logoAbsoluteUrl: string,
): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: options.seo.organization.name,
    url: options.siteUrl,
    logo: logoAbsoluteUrl,
  }
}

export function buildWebSiteJsonLd(input: {
  name: string
  url: string
  organizationName: string
  organizationUrl: string
}): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
    publisher: {
      '@type': 'Organization',
      name: input.organizationName,
      url: input.organizationUrl,
    },
  }
}

export function buildArticleJsonLd(input: {
  headline: string
  description: string
  canonicalUrl: string
  image: string
  datePublished: string
  dateModified?: string
  organizationName: string
}): JsonLdNode {
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    image: input.image,
    datePublished: input.datePublished,
    author: { '@type': 'Organization', name: input.organizationName },
    mainEntityOfPage: input.canonicalUrl,
  }
  if (input.dateModified) {
    node.dateModified = input.dateModified
  }
  return node
}

export function buildAlbumJsonLd(input: {
  book: AlbumBook
  locale: LocaleKey
  mainLocale: LocaleKey
  pageUrl: string
}): JsonLdNode[] {
  const name = resolveMultilanguage(
    input.book.title,
    input.locale,
    input.mainLocale,
  ).text
  const tracks = []
  const recordings: JsonLdNode[] = []
  let position = 0
  const discs = input.book.album.discs ?? []
  for (let d = 0; d < discs.length; d++) {
    const disc = discs[d]!
    for (let t = 0; t < disc.tracks.length; t++) {
      const track = disc.tracks[t]!
      position += 1
      const trackName = resolveMultilanguage(
        track.title,
        input.locale,
        input.mainLocale,
      ).text
      tracks.push({
        '@type': 'MusicRecording',
        name: trackName,
        position,
      })
      recordings.push({
        '@context': 'https://schema.org',
        '@type': 'MusicRecording',
        name: trackName,
        byArtist: track.artists.map((artist) => ({
          '@type': 'MusicGroup',
          name: artist,
        })),
        duration: secondsToIsoDuration(track.duration),
        position,
        url: `${input.pageUrl}#disc-${d + 1}-track-${t + 1}`,
      })
    }
  }

  const albumNode: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name,
    numTracks: position,
    track: tracks,
    url: input.pageUrl,
  }
  if (input.book.authors?.length) {
    albumNode.byArtist = input.book.authors.map((artist) => ({
      '@type': 'MusicGroup',
      name: artist,
    }))
  }
  return [albumNode, ...recordings]
}

export function buildPageJsonLd(
  page: CompiledPage,
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
  meta: {
    title: string
    description: string
    canonicalUrl: string
    image: string
  },
): JsonLdNode[] {
  if (page.identity === 'home') {
    const organization = buildOrganizationJsonLd(
      options,
      content.assets.organizationLogoAbsoluteUrl,
    )
    const siteName = resolveMultilanguage(
      options.seo.name,
      page.locale,
      options.mainLocale,
    ).text
    return [
      organization,
      buildWebSiteJsonLd({
        name: siteName,
        url: meta.canonicalUrl,
        organizationName: options.seo.organization.name,
        organizationUrl: options.siteUrl,
      }),
    ]
  }

  if (page.contentType === 'news' && page.packagePath) {
    const datePublished = content.dateByPackagePath.get(page.packagePath)
    if (!datePublished) {
      throw new Error(`Missing news date for ${page.packagePath}`)
    }
    return [
      buildArticleJsonLd({
        headline: meta.title,
        description: meta.description,
        canonicalUrl: meta.canonicalUrl,
        image: meta.image,
        datePublished,
        dateModified: content.updatedByPackagePath.get(page.packagePath),
        organizationName: options.seo.organization.name,
      }),
    ]
  }

  if (page.contentType === 'release' && page.packagePath) {
    const book = content.bookByPackagePath.get(page.packagePath)
    if (book?.type === 'album') {
      return buildAlbumJsonLd({
        book,
        locale: page.locale,
        mainLocale: options.mainLocale,
        pageUrl: meta.canonicalUrl,
      })
    }
    // Gift books intentionally emit no Product schema.
    return []
  }

  return []
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/seo/json-ld.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/seo/json-ld.ts tests/node/seo/json-ld.test.ts
git commit -m "feat(seo): add JSON-LD for Article, MusicAlbum, WebSite, Organization"
```

---

### Task 7: `buildPageSeo` orchestrator

**Files:**
- Create: `src/node/seo/build-page-seo.ts`
- Create: `tests/node/seo/build-page-seo.test.ts`

**Interfaces:**
- Consumes: all Task 2–6 resolvers; `CompiledSite.pages`; `ResolvedSynctrolThemeOptions`; `SeoContentContext`
- Produces: `buildPageSeo(page, pages, options, content): PageSeo`; `buildSiteSeo(site, options, content): Map<string, PageSeo>` keyed by `${locale}:${routePath}`

Title resolution:

- Collection copy title when present
- Otherwise `page.title` (detail/Home/Page from Plan 03)

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/seo/build-page-seo.test.ts
import { describe, expect, it } from 'vitest'
import { buildPageSeo } from '../../../src/node/seo/build-page-seo'
import {
  page,
  resolvedOptions,
  seoContentContext,
  url,
} from '../../helpers/seo-fixtures'

const options = resolvedOptions()

describe('buildPageSeo', () => {
  it('assembles full SEO for a translated news page', () => {
    const zh = page({
      identity: 'news:launch',
      locale: 'zh',
      contentType: 'news',
      packagePath: 'content/news/launch',
      url: url('https://synctrol.com/zh/news/launch/'),
      title: '发布',
      description: '中文摘要',
    })
    const en = page({
      identity: 'news:launch',
      locale: 'en',
      contentType: 'news',
      packagePath: 'content/news/launch',
      url: url('https://synctrol.com/en/news/launch/'),
      title: 'Launch',
      description: 'English summary',
    })
    const seo = buildPageSeo(
      en,
      [zh, en],
      options,
      seoContentContext({
        assets: {
          defaultImageAbsoluteUrl:
            'https://synctrol.com/assets/global/social-default.hash.webp',
          organizationLogoAbsoluteUrl:
            'https://synctrol.com/assets/global/logo.hash.svg',
          coverAbsoluteUrlByPackagePath: new Map([
            [
              'content/news/launch',
              'https://synctrol.com/assets/content/news/launch/cover.hash.webp',
            ],
          ]),
        },
        dateByPackagePath: new Map([['content/news/launch', '2026-08-11']]),
      }),
    )

    expect(seo.title).toBe('Launch')
    expect(seo.description).toBe('English summary')
    expect(seo.canonicalUrl).toBe('https://synctrol.com/en/news/launch/')
    expect(seo.lang).toBe('en-US')
    expect(seo.robots).toBe('index,follow')
    expect(seo.openGraph.image).toBe(
      'https://synctrol.com/assets/content/news/launch/cover.hash.webp',
    )
    expect(seo.hreflang).toHaveLength(2)
    expect(seo.jsonLd[0]!['@type']).toBe('Article')
  })

  it('falls back description and default OG image; keeps collection titles', () => {
    const index = page({
      identity: 'release-index',
      locale: 'zh',
      contentType: 'release-collection',
      url: url('https://synctrol.com/zh/releases/'),
      title: 'release-index',
      collection: { page: 1, pageCount: 1, itemIdentities: [] },
    })
    const seo = buildPageSeo(
      index,
      [index],
      options,
      seoContentContext(),
    )
    expect(seo.title).toBe('作品')
    expect(seo.description).toBe('Synctrol 作品列表')
    expect(seo.openGraph.image).toBe(
      'https://synctrol.com/assets/global/social-default.hash.webp',
    )
  })

  it('uses site description and noindex on fallback pages', () => {
    const zh = page({
      identity: 'release:first',
      locale: 'zh',
      contentType: 'release',
      packagePath: 'content/releases/first',
      url: url('https://synctrol.com/zh/releases/first/'),
      title: '第一张',
    })
    const en = page({
      identity: 'release:first',
      locale: 'en',
      contentType: 'release',
      packagePath: 'content/releases/first',
      url: url('https://synctrol.com/en/releases/first/'),
      title: '第一张',
      isFallback: true,
      noindex: true,
      canonicalLocale: 'zh',
      bodyLocale: 'zh',
    })
    const seo = buildPageSeo(en, [zh, en], options, seoContentContext())
    expect(seo.description).toBe(
      'Official website of the Synctrol music team',
    )
    expect(seo.canonicalUrl).toBe('https://synctrol.com/zh/releases/first/')
    expect(seo.robots).toBe('noindex,follow')
    expect(seo.hreflang).toEqual([
      {
        hreflang: 'zh-CN',
        href: 'https://synctrol.com/zh/releases/first/',
      },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/seo/build-page-seo.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/seo/build-page-seo.ts
import type { PageSeo, SeoContentContext } from '../../shared/seo/types'
import type { CompiledPage, CompiledSite } from '../../shared/types/routes'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options'
import { resolveCollectionCopy } from './collection-copy'
import { resolvePageDescription } from './resolve-description'
import { resolveOgImage } from './resolve-og-image'
import {
  resolveCanonicalUrl,
  resolveHreflang,
  resolveLang,
  resolveRobots,
} from './resolve-alternates'
import { buildOpenGraph } from './open-graph'
import { buildPageJsonLd } from './json-ld'

export function buildPageSeo(
  page: CompiledPage,
  pages: CompiledPage[],
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
): PageSeo {
  const collectionCopy = resolveCollectionCopy(
    page,
    options,
    content.definitions,
  )
  const title = collectionCopy?.title ?? page.title
  const description = resolvePageDescription(page, options, collectionCopy)
  const canonicalUrl = resolveCanonicalUrl(page, pages)
  const lang = resolveLang(page, options)
  const image = resolveOgImage(page, content.assets)
  const robots = resolveRobots(page)
  const hreflang = resolveHreflang(page, pages, options)
  const openGraph = buildOpenGraph({
    contentType: page.contentType,
    title,
    description,
    canonicalUrl,
    image,
    lang,
  })
  const jsonLd = buildPageJsonLd(page, options, content, {
    title,
    description,
    canonicalUrl,
    image,
  })

  return {
    title,
    description,
    canonicalUrl,
    lang,
    robots,
    openGraph,
    hreflang,
    jsonLd,
  }
}

export function buildSiteSeo(
  site: CompiledSite,
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
): Map<string, PageSeo> {
  const map = new Map<string, PageSeo>()
  for (const page of site.pages) {
    const key = `${page.locale}:${page.url.routePath}`
    map.set(key, buildPageSeo(page, site.pages, options, content))
  }
  return map
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/seo/build-page-seo.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/seo/build-page-seo.ts tests/node/seo/build-page-seo.test.ts
git commit -m "feat(seo): orchestrate per-page SEO metadata"
```

---

### Task 8: Locale RSS feed (`/{locale}/rss.xml`)

**Files:**
- Create: `src/node/feeds/rss.ts`
- Create: `tests/node/feeds/rss.test.ts`

**Interfaces:**
- Consumes: `CompiledPage[]`; `ResolvedSynctrolThemeOptions.seo` name/description; `dateByPackagePath`; `feeds.rss`
- Produces: `selectRssItems(pages, content): RssItem[]`; `generateLocaleRssXml(input): string`; `rssOutputPath(locale, base): { routePath: string; outputPath: string; publicPath: string }`

Rules:

- Include only `contentType === 'news' | 'release'` detail pages for that locale
- Exclude `isDraft` and `isFallback`
- Sort by package date descending, then identity ascending for stability
- Channel title/description: locale `seo.name` / `seo.description`
- Channel link: locale Home absolute URL `siteUrl` + base + `/{locale}/`
- Item `pubDate`: RFC 1123 from calendar `YYYY-MM-DD` at `00:00:00 GMT`
- Item description: page description or site locale description
- `generateLocaleRssXml` returns XML string; caller skips writing when `feeds.rss === false`

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/feeds/rss.test.ts
import { describe, expect, it } from 'vitest'
import {
  generateLocaleRssXml,
  rssOutputPath,
  selectRssItems,
} from '../../../src/node/feeds/rss'
import {
  page,
  resolvedOptions,
  seoContentContext,
  url,
} from '../../helpers/seo-fixtures'

const options = resolvedOptions()

describe('rssOutputPath', () => {
  it('places rss under the locale prefix', () => {
    expect(rssOutputPath('zh', '/')).toEqual({
      routePath: '/zh/rss.xml',
      outputPath: 'zh/rss.xml',
      publicPath: '/zh/rss.xml',
    })
    expect(rssOutputPath('en', '/docs/')).toEqual({
      routePath: '/en/rss.xml',
      outputPath: 'en/rss.xml',
      publicPath: '/docs/en/rss.xml',
    })
  })
})

describe('selectRssItems', () => {
  const pages = [
    page({
      identity: 'news:older',
      locale: 'en',
      contentType: 'news',
      packagePath: 'content/news/older',
      url: url('https://synctrol.com/en/news/older/'),
      title: 'Older',
      description: 'Old news',
    }),
    page({
      identity: 'release:first',
      locale: 'en',
      contentType: 'release',
      packagePath: 'content/releases/first',
      url: url('https://synctrol.com/en/releases/first/'),
      title: 'First',
    }),
    page({
      identity: 'news:draft',
      locale: 'en',
      contentType: 'news',
      packagePath: 'content/news/draft',
      url: url('https://synctrol.com/en/news/draft/'),
      title: 'Draft',
      isDraft: true,
      noindex: true,
    }),
    page({
      identity: 'news:fallback',
      locale: 'en',
      contentType: 'news',
      packagePath: 'content/news/fallback',
      url: url('https://synctrol.com/en/news/fallback/'),
      title: 'Fallback',
      isFallback: true,
      noindex: true,
      canonicalLocale: 'zh',
    }),
    page({
      identity: 'home',
      locale: 'en',
      contentType: 'home',
      url: url('https://synctrol.com/en/'),
      title: 'Home',
    }),
    page({
      identity: 'news-index',
      locale: 'en',
      contentType: 'news-collection',
      url: url('https://synctrol.com/en/news/'),
      title: 'News',
      collection: { page: 1, pageCount: 1, itemIdentities: [] },
    }),
    page({
      identity: 'news:newer',
      locale: 'en',
      contentType: 'news',
      packagePath: 'content/news/newer',
      url: url('https://synctrol.com/en/news/newer/'),
      title: 'Newer',
      description: 'New news',
    }),
  ]

  const content = seoContentContext({
    dateByPackagePath: new Map([
      ['content/news/older', '2026-08-01'],
      ['content/news/newer', '2026-08-11'],
      ['content/news/draft', '2026-08-10'],
      ['content/news/fallback', '2026-08-09'],
      ['content/releases/first', '2026-08-05'],
    ]),
  })

  it('includes only non-draft non-fallback news and release, newest first', () => {
    const items = selectRssItems(pages, 'en', options, content)
    expect(items.map((i) => i.title)).toEqual(['Newer', 'First', 'Older'])
    expect(items[0]).toMatchObject({
      link: 'https://synctrol.com/en/news/newer/',
      description: 'New news',
      guid: 'https://synctrol.com/en/news/newer/',
      pubDate: 'Tue, 11 Aug 2026 00:00:00 GMT',
    })
    expect(items[1]!.description).toBe(
      'Official website of the Synctrol music team',
    )
  })
})

describe('generateLocaleRssXml', () => {
  it('renders RSS 2.0 channel metadata from seo locale values', () => {
    const xml = generateLocaleRssXml({
      locale: 'en',
      options,
      channelLink: 'https://synctrol.com/en/',
      items: [
        {
          title: 'Launch',
          description: 'Summary',
          link: 'https://synctrol.com/en/news/launch/',
          guid: 'https://synctrol.com/en/news/launch/',
          pubDate: 'Tue, 11 Aug 2026 00:00:00 GMT',
        },
      ],
    })
    expect(xml).toContain('<rss version="2.0">')
    expect(xml).toContain('<title>Synctrol</title>')
    expect(xml).toContain(
      '<description>Official website of the Synctrol music team</description>',
    )
    expect(xml).toContain('<link>https://synctrol.com/en/</link>')
    expect(xml).toContain('<item>')
    expect(xml).toContain('<title>Launch</title>')
    expect(xml).toContain('<guid>https://synctrol.com/en/news/launch/</guid>')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/feeds/rss.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/feeds/rss.ts
import type { RssItem, SeoContentContext } from '../../shared/seo/types'
import type { LocaleKey } from '../../shared/types'
import type { CompiledPage } from '../../shared/types/routes'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options'
import { resolveMultilanguage } from '../../shared/multilanguage'
import { joinPublicPath, normalizeBase } from '../../shared/url/normalize-path'
import { resolvePageDescription } from '../seo/resolve-description'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function calendarDateToRfc1123(date: string): string {
  // date is YYYY-MM-DD interpreted as UTC midnight without timezone shift
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0))
  return dt.toUTCString()
}

export function rssOutputPath(
  locale: LocaleKey,
  base: string,
): { routePath: string; outputPath: string; publicPath: string } {
  const routePath = `/${locale}/rss.xml`
  return {
    routePath,
    outputPath: `${locale}/rss.xml`,
    publicPath: joinPublicPath(normalizeBase(base), routePath),
  }
}

export function selectRssItems(
  pages: CompiledPage[],
  locale: LocaleKey,
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
): RssItem[] {
  const items = pages.filter(
    (page) =>
      page.locale === locale &&
      (page.contentType === 'news' || page.contentType === 'release') &&
      !page.isDraft &&
      !page.isFallback &&
      page.packagePath,
  )

  items.sort((a, b) => {
    const da = content.dateByPackagePath.get(a.packagePath!) ?? ''
    const db = content.dateByPackagePath.get(b.packagePath!) ?? ''
    if (da !== db) return db.localeCompare(da)
    return String(a.identity).localeCompare(String(b.identity))
  })

  return items.map((page) => {
    const date = content.dateByPackagePath.get(page.packagePath!)
    if (!date) {
      throw new Error(`Missing date for RSS item ${page.packagePath}`)
    }
    const description = resolvePageDescription(page, options, null)
    return {
      title: page.title,
      description,
      link: page.url.absoluteUrl,
      guid: page.url.absoluteUrl,
      pubDate: calendarDateToRfc1123(date),
    }
  })
}

export function generateLocaleRssXml(input: {
  locale: LocaleKey
  options: ResolvedSynctrolThemeOptions
  channelLink: string
  items: RssItem[]
}): string {
  const title = resolveMultilanguage(
    input.options.seo.name,
    input.locale,
    input.options.mainLocale,
  ).text
  const description = resolveMultilanguage(
    input.options.seo.description,
    input.locale,
    input.options.mainLocale,
  ).text

  const itemXml = input.items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid>${escapeXml(item.guid)}</guid>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`,
    )
    .join('\n')

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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/feeds/rss.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/feeds/rss.ts tests/node/feeds/rss.test.ts
git commit -m "feat(feeds): generate per-locale RSS for news and releases"
```

---

### Task 9: Sitemap generation

**Files:**
- Create: `src/node/feeds/sitemap.ts`
- Create: `tests/node/feeds/sitemap.test.ts`

**Interfaces:**
- Consumes: `CompiledPage[]`; `feeds.sitemap`
- Produces: `selectSitemapUrls(pages): string[]`; `generateSitemapXml(urls): string`; `sitemapOutputPath(base)`

Rules:

- Include every page where `!isDraft && !isFallback` (equivalently indexable content routes)
- Use `absoluteUrl` values (already locale-specific)
- Exclude the root language router (it is not a `CompiledPage`)
- Single file `sitemap.xml` at site dest root (`outputPath: 'sitemap.xml'`)
- Sorted ascending by URL for stability

- [ ] **Step 1: Write the failing test**

```ts
// tests/node/feeds/sitemap.test.ts
import { describe, expect, it } from 'vitest'
import {
  generateSitemapXml,
  selectSitemapUrls,
  sitemapOutputPath,
} from '../../../src/node/feeds/sitemap'
import { page, url } from '../../helpers/seo-fixtures'

describe('sitemapOutputPath', () => {
  it('writes sitemap.xml at destination root with base-aware public path', () => {
    expect(sitemapOutputPath('/')).toEqual({
      routePath: '/sitemap.xml',
      outputPath: 'sitemap.xml',
      publicPath: '/sitemap.xml',
    })
    expect(sitemapOutputPath('/docs/')).toEqual({
      routePath: '/sitemap.xml',
      outputPath: 'sitemap.xml',
      publicPath: '/docs/sitemap.xml',
    })
  })
})

describe('selectSitemapUrls', () => {
  it('excludes drafts and fallbacks and keeps locale URLs', () => {
    const urls = selectSitemapUrls([
      page({
        identity: 'home',
        locale: 'zh',
        contentType: 'home',
        url: url('https://synctrol.com/zh/'),
        title: '首页',
      }),
      page({
        identity: 'home',
        locale: 'en',
        contentType: 'home',
        url: url('https://synctrol.com/en/'),
        title: 'Home',
      }),
      page({
        identity: 'news:draft',
        locale: 'zh',
        contentType: 'news',
        url: url('https://synctrol.com/zh/news/draft/'),
        title: 'Draft',
        isDraft: true,
        noindex: true,
      }),
      page({
        identity: 'news:only-zh',
        locale: 'en',
        contentType: 'news',
        url: url('https://synctrol.com/en/news/only-zh/'),
        title: 'Only',
        isFallback: true,
        noindex: true,
        canonicalLocale: 'zh',
      }),
      page({
        identity: 'release-index',
        locale: 'zh',
        contentType: 'release-collection',
        url: url('https://synctrol.com/zh/releases/'),
        title: '作品',
        collection: { page: 1, pageCount: 1, itemIdentities: [] },
      }),
    ])
    expect(urls).toEqual([
      'https://synctrol.com/en/',
      'https://synctrol.com/zh/',
      'https://synctrol.com/zh/releases/',
    ])
  })
})

describe('generateSitemapXml', () => {
  it('emits urlset entries', () => {
    const xml = generateSitemapXml([
      'https://synctrol.com/en/',
      'https://synctrol.com/zh/',
    ])
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain(
      'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    )
    expect(xml).toContain('<loc>https://synctrol.com/en/</loc>')
    expect(xml).toContain('<loc>https://synctrol.com/zh/</loc>')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/feeds/sitemap.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/feeds/sitemap.ts
import type { CompiledPage } from '../../shared/types/routes'
import { joinPublicPath, normalizeBase } from '../../shared/url/normalize-path'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function sitemapOutputPath(base: string): {
  routePath: string
  outputPath: string
  publicPath: string
} {
  const routePath = '/sitemap.xml'
  return {
    routePath,
    outputPath: 'sitemap.xml',
    publicPath: joinPublicPath(normalizeBase(base), routePath),
  }
}

export function selectSitemapUrls(pages: CompiledPage[]): string[] {
  return pages
    .filter((page) => !page.isDraft && !page.isFallback)
    .map((page) => page.url.absoluteUrl)
    .sort((a, b) => a.localeCompare(b))
}

export function generateSitemapXml(urls: string[]): string {
  const body = urls
    .map(
      (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/feeds/sitemap.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/feeds/sitemap.ts tests/node/feeds/sitemap.test.ts
git commit -m "feat(feeds): generate sitemap excluding drafts and fallbacks"
```

---

### Task 10: Emit orchestrator, feed toggles, and integration verification

**Files:**
- Create: `src/node/seo/emit-seo-and-feeds.ts`
- Create: `src/node/seo/index.ts`
- Create: `tests/node/seo/emit-seo-and-feeds.test.ts`
- Modify: `src/index.ts` (re-export SEO/feed entrypoints)

**Interfaces:**
- Consumes: `buildSiteSeo`, `serializeHeadTags`, RSS + Sitemap generators, `ResolvedSynctrolThemeOptions.feeds`
- Produces: `emitSeoAndFeeds(input): EmitSeoAndFeedsResult` where result includes `pageSeo`, `headTagsByRoute`, and `filesToWrite` (path + contents); `feeds.rss: false` / `feeds.sitemap: false` omit those files without changing head tags

`filesToWrite` paths are destination-relative `outputPath` values. Channel link for each locale RSS is the Home page absolute URL for that locale (required to exist in `site.pages`).

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/node/seo/emit-seo-and-feeds.test.ts
import { describe, expect, it } from 'vitest'
import { emitSeoAndFeeds } from '../../../src/node/seo/emit-seo-and-feeds'
import type { CompiledSite } from '../../../src/shared/types/routes'
import type { AlbumBook } from '../../../src/shared/types'
import {
  page,
  resolvedOptions,
  seoContentContext,
  url,
} from '../../helpers/seo-fixtures'

const album: AlbumBook = {
  type: 'album',
  title: { zh: '第一张专辑', en: 'First Album' },
  authors: ['Synctrol'],
  album: {
    discs: [
      {
        title: 'Disc',
        tracks: [
          { title: { zh: '曲', en: 'Track' }, artists: ['Synctrol'], duration: 120 },
        ],
      },
    ],
  },
}

function siteFixture(): CompiledSite {
  return {
    diagnostics: [],
    rootRouterHtml: '<!doctype html><html></html>',
    pages: [
      page({
        identity: 'home',
        locale: 'zh',
        contentType: 'home',
        url: url('https://synctrol.com/zh/'),
        title: '首页',
        description: '主页说明',
      }),
      page({
        identity: 'home',
        locale: 'en',
        contentType: 'home',
        url: url('https://synctrol.com/en/'),
        title: 'Home',
        description: 'Home blurb',
      }),
      page({
        identity: 'release:first',
        locale: 'zh',
        contentType: 'release',
        packagePath: 'content/releases/first',
        url: url('https://synctrol.com/zh/releases/first/'),
        title: '第一张专辑',
        description: '专辑说明',
      }),
      page({
        identity: 'release:first',
        locale: 'en',
        contentType: 'release',
        packagePath: 'content/releases/first',
        url: url('https://synctrol.com/en/releases/first/'),
        title: '第一张专辑',
        isFallback: true,
        noindex: true,
        canonicalLocale: 'zh',
        bodyLocale: 'zh',
      }),
      page({
        identity: 'news:launch',
        locale: 'zh',
        contentType: 'news',
        packagePath: 'content/news/launch',
        url: url('https://synctrol.com/zh/news/launch/'),
        title: '发布',
        description: '新闻说明',
      }),
      page({
        identity: 'news:launch',
        locale: 'en',
        contentType: 'news',
        packagePath: 'content/news/launch',
        url: url('https://synctrol.com/en/news/launch/'),
        title: 'Launch',
        description: 'News blurb',
      }),
      page({
        identity: 'news:secret',
        locale: 'zh',
        contentType: 'news',
        packagePath: 'content/news/secret',
        url: url('https://synctrol.com/zh/news/secret/'),
        title: '秘密',
        isDraft: true,
        noindex: true,
      }),
      page({
        identity: 'release-index',
        locale: 'zh',
        contentType: 'release-collection',
        url: url('https://synctrol.com/zh/releases/'),
        title: 'release-index',
        collection: { page: 1, pageCount: 1, itemIdentities: ['release:first'] },
      }),
      page({
        identity: 'news-tag:release:page:2',
        locale: 'en',
        contentType: 'news-collection',
        url: url('https://synctrol.com/en/news/tags/release/page/2/'),
        title: 'news-tag:release:page:2',
        collection: {
          page: 2,
          pageCount: 2,
          itemIdentities: [],
          tag: 'release',
        },
      }),
    ],
  }
}

const content = seoContentContext({
  assets: {
    defaultImageAbsoluteUrl:
      'https://synctrol.com/assets/global/social-default.hash.webp',
    organizationLogoAbsoluteUrl:
      'https://synctrol.com/assets/global/logo.hash.svg',
    coverAbsoluteUrlByPackagePath: new Map([
      [
        'content/releases/first',
        'https://synctrol.com/assets/content/release/first/cover.hash.webp',
      ],
    ]),
  },
  definitions: {
    tags: {
      release: { title: { zh: '作品发布', en: 'Releases' } },
    },
  },
  bookByPackagePath: new Map([['content/releases/first', album]]),
  dateByPackagePath: new Map([
    ['content/releases/first', '2026-08-05'],
    ['content/news/launch', '2026-08-11'],
    ['content/news/secret', '2026-08-10'],
  ]),
})

describe('emitSeoAndFeeds', () => {
  it('builds head tags, rss for each locale, and sitemap while honoring exclusions', () => {
    const result = emitSeoAndFeeds({
      site: siteFixture(),
      options: resolvedOptions(),
      content,
      base: '/',
    })

    const enLaunch = result.headTagsByRoute.get('en:/en/news/launch/')!
    expect(enLaunch.some((t) => t.tag === 'title' && t.text === 'Launch')).toBe(
      true,
    )
    expect(
      enLaunch.some(
        (t) =>
          t.tag === 'link' &&
          t.attrs?.rel === 'alternate' &&
          t.attrs.hreflang === 'zh-CN',
      ),
    ).toBe(true)

    const releaseSeo = result.pageSeo.get('zh:/zh/releases/first/')!
    expect(releaseSeo.openGraph.image).toBe(
      'https://synctrol.com/assets/content/release/first/cover.hash.webp',
    )
    expect(releaseSeo.jsonLd.map((n) => n['@type'])).toEqual([
      'MusicAlbum',
      'MusicRecording',
    ])

    const tagPage = result.pageSeo.get('en:/en/news/tags/release/page/2/')!
    expect(tagPage.title).toBe('Releases · News · Page 2')
    expect(tagPage.description).toBe('Synctrol news')

    const fallback = result.pageSeo.get('en:/en/releases/first/')!
    expect(fallback.robots).toBe('noindex,follow')
    expect(fallback.canonicalUrl).toBe(
      'https://synctrol.com/zh/releases/first/',
    )

    const filePaths = result.filesToWrite.map((f) => f.outputPath).sort()
    expect(filePaths).toEqual(['en/rss.xml', 'sitemap.xml', 'zh/rss.xml'])

    const zhRss = result.filesToWrite.find((f) => f.outputPath === 'zh/rss.xml')!
    expect(zhRss.contents).toContain('<title>第一张专辑</title>')
    expect(zhRss.contents).toContain('<title>发布</title>')
    expect(zhRss.contents).not.toContain('秘密')
    expect(zhRss.contents).not.toContain('/en/releases/first/')

    const sitemap = result.filesToWrite.find(
      (f) => f.outputPath === 'sitemap.xml',
    )!
    expect(sitemap.contents).toContain('https://synctrol.com/zh/news/launch/')
    expect(sitemap.contents).not.toContain('https://synctrol.com/zh/news/secret/')
    expect(sitemap.contents).not.toContain(
      'https://synctrol.com/en/releases/first/',
    )
  })

  it('suppresses rss and/or sitemap when feeds toggles are false without changing head SEO', () => {
    const full = emitSeoAndFeeds({
      site: siteFixture(),
      options: resolvedOptions({ feeds: { rss: true, sitemap: true } }),
      content,
      base: '/',
    })
    const noRss = emitSeoAndFeeds({
      site: siteFixture(),
      options: resolvedOptions({ feeds: { rss: false, sitemap: true } }),
      content,
      base: '/',
    })
    const noSitemap = emitSeoAndFeeds({
      site: siteFixture(),
      options: resolvedOptions({ feeds: { rss: true, sitemap: false } }),
      content,
      base: '/',
    })
    const neither = emitSeoAndFeeds({
      site: siteFixture(),
      options: resolvedOptions({ feeds: { rss: false, sitemap: false } }),
      content,
      base: '/',
    })

    expect(noRss.filesToWrite.map((f) => f.outputPath)).toEqual([
      'sitemap.xml',
    ])
    expect(noSitemap.filesToWrite.map((f) => f.outputPath).sort()).toEqual([
      'en/rss.xml',
      'zh/rss.xml',
    ])
    expect(neither.filesToWrite).toEqual([])

    expect(noRss.pageSeo.get('en:/en/news/launch/')!.canonicalUrl).toBe(
      full.pageSeo.get('en:/en/news/launch/')!.canonicalUrl,
    )
    expect(noRss.headTagsByRoute.get('en:/en/news/launch/')).toEqual(
      full.headTagsByRoute.get('en:/en/news/launch/'),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/seo/emit-seo-and-feeds.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/seo/emit-seo-and-feeds.ts
import type { HeadTag, PageSeo, SeoContentContext } from '../../shared/seo/types'
import type { CompiledSite } from '../../shared/types/routes'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options'
import { buildSiteSeo } from './build-page-seo'
import { serializeHeadTags } from './serialize-head'
import {
  generateLocaleRssXml,
  rssOutputPath,
  selectRssItems,
} from '../feeds/rss'
import {
  generateSitemapXml,
  selectSitemapUrls,
  sitemapOutputPath,
} from '../feeds/sitemap'

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
  const headTagsByRoute = new Map<string, HeadTag[]>()
  for (const [key, seo] of pageSeo) {
    headTagsByRoute.set(key, serializeHeadTags(seo))
  }

  const filesToWrite: FeedFileToWrite[] = []

  if (input.options.feeds.rss) {
    const locales = Object.keys(input.options.locales)
    for (const locale of locales) {
      const home = input.site.pages.find(
        (page) => page.locale === locale && page.identity === 'home',
      )
      if (!home) {
        throw new Error(`Missing home page for locale RSS channel: ${locale}`)
      }
      const items = selectRssItems(
        input.site.pages,
        locale,
        input.options,
        input.content,
      )
      const paths = rssOutputPath(locale, input.base)
      filesToWrite.push({
        outputPath: paths.outputPath,
        publicPath: paths.publicPath,
        contents: generateLocaleRssXml({
          locale,
          options: input.options,
          channelLink: home.url.absoluteUrl,
          items,
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
// src/node/seo/index.ts
export { buildPageSeo, buildSiteSeo } from './build-page-seo'
export { emitSeoAndFeeds } from './emit-seo-and-feeds'
export { serializeHeadTags } from './serialize-head'
export { resolveCollectionCopy } from './collection-copy'
export * from '../feeds/rss'
export * from '../feeds/sitemap'
```

Update `src/index.ts` to re-export:

```ts
export { emitSeoAndFeeds, buildPageSeo, buildSiteSeo } from './node/seo/index.js'
export type {
  PageSeo,
  HeadTag,
  SeoAssetContext,
  SeoContentContext,
} from './shared/seo/types.js'
```

- [ ] **Step 4: Run all SEO/feed tests**

Run:

```bash
pnpm exec vitest run tests/shared/seo tests/node/seo tests/node/feeds
```

Expected: PASS (all tasks in this plan)

- [ ] **Step 5: Commit**

```bash
git add src/node/seo src/node/feeds src/shared/seo src/index.ts tests/helpers/seo-fixtures.ts tests/shared/seo tests/node/seo tests/node/feeds
git commit -m "feat(seo): emit page SEO head tags with optional RSS and sitemap"
```

---

## Self-Review

**1. Spec coverage (§28 + related publishing rules, SEO/feeds slice only):**

| Requirement | Task |
| --- | --- |
| Required `siteUrl` + `seo` (`name` / `description` / `defaultImage` / `organization` / `collections`) | Fixtures + Tasks 2, 3, 6, 7, 8 (consumed from Plan 01 options) |
| Localized title/description/canonical/OG/`lang`/real-translation `hreflang` | Tasks 2–5, 7 |
| Description fallback to site locale description | Task 3, 7 |
| OG image: cover else `seo.defaultImage`; never artwork; Home uses default | Task 3, 7, 10 |
| JSON-LD Article / MusicAlbum+MusicRecording / WebSite+Organization; no Product for gifts | Task 6, 10 |
| `feeds.rss` / `feeds.sitemap` toggles default true; false suppresses only feeds | Task 10 |
| `/{locale}/rss.xml` with News+Release; exclude drafts + fallback | Task 8, 10 |
| Sitemap exclude drafts + fallback | Task 9, 10 |
| Collection titles + `paginatedTitle` + `tagArchiveTitle` | Task 2, 7, 10 |
| Fallback `noindex` + main-locale canonical + no false hreflang | Task 4, 7, 10 |
| Drafts outside Sitemap/RSS and `noindex` | Tasks 4, 8, 9, 10 |

**Explicitly out of scope (no tasks):** shell UI, LanguageSwitcher, platform embeds, asset hashing implementation, root language router HTML, Release/News visual layouts, npm package publish.

**2. Placeholder scan:** No TBD/TODO/`implement later`/`similar to Task N` wording; every code step includes full implementations and exact commands.

**3. Type consistency:** `PageSeo`, `SeoContentContext`, `SeoAssetContext`, `HeadTag`, `RssItem`, `CollectionCopy`, `emitSeoAndFeeds` / `buildPageSeo` names are shared across tasks; RSS exclusion uses `isDraft`/`isFallback` matching Sitemap; OG image resolver never accepts artwork; Gift JSON-LD path returns `[]` with no `Product`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-11-10-seo-and-feeds.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration (`superpowers:subagent-driven-development`)

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints

Which approach?
