# News and Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render News indexes, tag archives, News detail articles, and general Pages through the Synctrol shell with correct list fallback badges, pagination, draft badges, and Home markdown formatters that feed the Footer slot.

**Architecture:** Pure Node view-model builders turn Plan 03 `CompiledPage` collection data plus Plan 02 packages/definitions into typed News list items and tag counts. Vue client layouts consume those models inside Plan 05’s shell and Plan 01’s `--syn-content-width: 760px` column. Home `home-logo` / `home-footer` markdown-it containers register at theme boot so Home Main and Footer receive formatter content without a layout field. RSS exclusion of fallback items is stamped on list models here and enforced later by Plan 10.

**Tech Stack:** TypeScript, Vitest, Vue 3, `@vue/test-utils`, happy-dom (from Plan 05), VuePress 2 markdown-it containers, package layout from Plan 01 (`vuepress-theme-synctrolling`).

## Global Constraints

- Package name: `vuepress-theme-synctrolling`
- Content types remain only `home | release | news | page`; there is no `member` type and no per-page `layout` field
- News uses `date` (required), optional `updated`, required `tags` (may be empty), optional `cover`
- `updated` cannot precede `date`; dates are `YYYY-MM-DD` calendar dates without timezone conversion
- Default `news.urlSegment` is `news`; default `news.tags.urlSegment` is `tags`; both are scalar strings shared by every locale
- `news.index.pagination` defaults to `12`, accepts a positive integer or `false`; tag archives reuse the same pagination setting
- `news.index.enabled: false` suppresses News Index and its pagination only; details and tag pages still generate
- `news.tags.index.enabled: false` suppresses only the News Tags Index; individual tag archives still generate
- News Tags Index lists declared tags with visible article counts and is never paginated
- News sorts by date descending, then slug for stability
- Fallback list items keep target-locale URL/shell, use main-locale title/description with local `lang`, show translation-unavailable badge, set `excludeFromRss: true`
- Draft list/detail surfaces show localized draft badges when `showDrafts` made them visible
- News detail and Page Main body max width is `760px`; no search UI and no table of contents
- Page has no automatic listing and optional `cover` only
- Brand tokens fixed: black/white, `3px` strong border, `0` radius, Archivo Black display
- Tests run with `npm test -- <path>` (or `npm test -- <path>` if the package uses npm scripts equivalently)
- Plans 01–05 and 08 are assumed complete for shared types, content compiler, routes, assets, shell, and Release pagination/date helpers reused here

## File Structure

| File | Responsibility |
| --- | --- |
| `src/shared/types/news.ts` | `NewsListItem`, `NewsTagCount`, `NewsCollectionPageData` view-model types |
| `src/shared/format-message.ts` | Interpolate `{title}`, `{page}`, `{tag}` message templates |
| `src/compiler/news/build-news-list-items.ts` | Build per-locale list items from packages + detail pages (fallback/draft flags) |
| `src/compiler/news/build-news-tags-index.ts` | Declared tags + visible counts for News Tags Index |
| `src/compiler/news/attach-news-page-data.ts` | Attach list/tag/detail page data onto compiled news-collection pages |
| `src/compiler/markdown/home-formatters.ts` | Register `home-logo` (required) and `home-footer` (optional) containers |
| `src/compiler/markdown/assert-home-formatters.ts` | Build-time assert Home packages include `home-logo` |
| `src/client/components/DraftBadge.vue` | Localized draft badge |
| `src/client/components/TranslationUnavailableBadge.vue` | Localized translation-unavailable badge |
| `src/client/components/ContentCover.vue` | Optional cover image for News/Page detail and News list |
| `src/client/components/news/NewsListItem.vue` | Cover or text-only list row |
| `src/client/components/news/NewsList.vue` | List + empty state |
| `src/client/components/news/NewsTagsList.vue` | Unpaginated tags + counts |
| `src/client/components/ArticleMeta.vue` | Published / updated / tags meta row |
| `src/client/layouts/NewsIndexLayout.vue` | News index + pagination |
| `src/client/layouts/NewsTagsIndexLayout.vue` | Tags index |
| `src/client/layouts/NewsTagArchiveLayout.vue` | Tag archive + pagination |
| `src/client/layouts/NewsDetailLayout.vue` | News article 760px, no TOC/search |
| `src/client/layouts/PageDetailLayout.vue` | General page 760px, optional cover |
| `src/client/components/home/HomeLogoSlot.vue` | Renders `home-logo` formatter output in Main |
| `src/client/components/home/HomeFooterSlot.vue` | Renders `home-footer` into shell Footer |
| `tests/compiler/news/*.test.ts` | View-model and page-data attachment tests |
| `tests/shared/format-message.test.ts` | Message interpolation tests |
| `tests/compiler/markdown/home-formatters.test.ts` | Formatter registration / Home assert tests |
| `tests/client/components/*.test.ts` | Badge, list item, meta, cover component tests |
| `tests/client/layouts/*.test.ts` | Layout composition tests |
| `tests/integration/news-page-fixtures.test.ts` | Fixture build assertions for routes + list models |

**Prerequisite interfaces (import; do not redefine):**

```ts
// Plan 01 — src/shared/types.ts / messages.ts
export type ContentType = 'home' | 'release' | 'news' | 'page'
export type LocaleKey = string
export type Multilanguage = string | Record<LocaleKey, string>
export interface LocaleMessages {
  draft: string
  translationUnavailable: string
  published: string
  updated: string
  emptyNews: string
  previousPage: string
  nextPage: string
  paginatedTitle: string // {title}, {page}
  tagArchiveTitle: string // {tag}, {title}
  // … remaining keys
}
export interface NewsOptions {
  urlSegment: string
  index: { enabled: boolean; pagination: number | false }
  tags: { urlSegment: string; index: { enabled: boolean } }
}
export interface SynctrolThemeOptions {
  mainLocale: LocaleKey
  locales: Record<LocaleKey, { lang: string; label: string; messages: LocaleMessages; dateFormat?: Intl.DateTimeFormatOptions }>
  showDrafts?: boolean
  news: NewsOptions
  seo: {
    collections: {
      news: { title: Multilanguage; description: Multilanguage }
    }
  }
  // …
}

// Plan 03 — LocaleMarkdown / RouteContentPackage live in src/shared/types.ts
// (Plan 03 Task 1). Do not redeclare them here. Canonical shape:
//   RouteContentPackage {
//     dir, identity, type, slug, date?, updated?, draft, path?, tags,
//     cover?, artwork?, locales
//   }
//   LocaleMarkdown { filePath, title, description?, draft, body }
// Plan 03 still stamps CompiledPage's packagePath field from pkg.dir.
import type { LocaleMarkdown, RouteContentPackage } from '../types'
export interface TagDefinition {
  title: Multilanguage
}
export interface DefinitionsFile {
  tags: Record<string, TagDefinition>
  platforms: Record<string, unknown>
}

// Plan 03 — CompiledPage
export interface CompiledPage {
  identity: import('../route-types').PageIdentity
  locale: LocaleKey
  contentType: ContentType | 'release-collection' | 'news-collection'
  url: import('../route-types').UrlLayers
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
    itemIdentities: import('../route-types').ContentIdentity[]
    tag?: string
  }
}

// Plan 04 — resolved cover public URL helper (assumed)
export function resolveContentAssetPublicUrl(
  pkg: RouteContentPackage,
  relativePath: string,
): string

// Plan 05 — shell / locale composables (assumed)
// SynctrolShell.vue provides Header/Main/Nav/Footer/Social/LanguageSwitcher
// useLocaleMessages(): LocaleMessages
// useLocaleOptions(): { lang: string; label: string; dateFormat?: Intl.DateTimeFormatOptions }
// ContentColumn.vue wraps Main article children with max-width: var(--syn-content-width)

// Plan 08 — shared helpers (assumed)
export function formatCalendarDate(
  date: string,
  localeLang: string,
  dateFormat?: Intl.DateTimeFormatOptions,
): string
// PaginationNav.vue props: { prevHref?: string; nextHref?: string; prevLabel: string; nextLabel: string }
```

---

### Task 1: Shared News view-model types and message interpolation

**Files:**
- Create: `src/shared/types/news.ts`
- Create: `src/shared/format-message.ts`
- Create: `tests/shared/format-message.test.ts`
- Create: `tests/shared/news-types.test.ts`
- Modify: `src/index.ts` (re-export news types)

**Interfaces:**
- Consumes: `LocaleKey`, `ContentIdentity` from Plans 01/03
- Produces: `NewsListItem`, `NewsTagLink`, `NewsTagCount`, `NewsCollectionPageData`, `formatMessage(template, vars)`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/shared/format-message.test.ts
import { describe, expect, it } from 'vitest'
import { formatMessage } from '../../src/shared/format-message'

describe('formatMessage', () => {
  it('replaces named placeholders', () => {
    expect(
      formatMessage('{tag} · {title}', { tag: 'Releases', title: 'News' }),
    ).toBe('Releases · News')
    expect(
      formatMessage('{title} · Page {page}', { title: 'News', page: '2' }),
    ).toBe('News · Page 2')
  })

  it('leaves unknown placeholders intact', () => {
    expect(formatMessage('Hello {name}', {})).toBe('Hello {name}')
  })
})
```

```ts
// tests/shared/news-types.test.ts
import { describe, expect, it } from 'vitest'
import type { NewsListItem, NewsTagCount } from '../../src/shared/types/news'

describe('news view-model types', () => {
  it('requires excludeFromRss on every list item', () => {
    const item: NewsListItem = {
      identity: 'news:launch',
      slug: 'launch',
      publicPath: '/en/news/launch/',
      title: '发布',
      titleLang: 'zh-CN',
      description: '摘要',
      descriptionLang: 'zh-CN',
      date: '2026-08-11',
      updated: '2026-08-12',
      coverPublicUrl: undefined,
      tags: [{ key: 'release', title: 'Releases', publicPath: '/en/news/tags/release/' }],
      isFallback: true,
      isDraft: false,
      excludeFromRss: true,
    }
    expect(item.excludeFromRss).toBe(true)
    expect(item.isFallback).toBe(true)
  })

  it('models unpaginated tag counts', () => {
    const row: NewsTagCount = {
      key: 'release',
      title: '作品发布',
      titleLang: 'zh-CN',
      count: 3,
      publicPath: '/zh/news/tags/release/',
    }
    expect(row.count).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/shared/format-message.test.ts tests/shared/news-types.test.ts`

Expected: FAIL with module not found for `format-message` / `types/news`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/format-message.ts
export function formatMessage(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : match
  })
}
```

```ts
// src/shared/types/news.ts
import type { LocaleKey } from '../types.js'
import type { ContentIdentity } from './routes.js'

export interface NewsTagLink {
  key: string
  title: string
  publicPath: string
}

export interface NewsListItem {
  identity: ContentIdentity
  slug: string
  publicPath: string
  title: string
  /** BCP 47 lang of the title text (main lang when fallback). */
  titleLang: string
  description?: string
  descriptionLang?: string
  date: string
  updated?: string
  coverPublicUrl?: string
  tags: NewsTagLink[]
  isFallback: boolean
  isDraft: boolean
  /**
   * Plan 10 must exclude this item from locale RSS when true.
   * Always true for fallback list items; also true for drafts.
   */
  excludeFromRss: boolean
}

export interface NewsTagCount {
  key: string
  title: string
  titleLang: string
  count: number
  publicPath: string
}

export interface NewsCollectionPageData {
  kind: 'news-index' | 'news-tag' | 'news-tags-index'
  heading: string
  description: string
  items: NewsListItem[]
  tags?: NewsTagCount[]
  tagKey?: string
  pagination: {
    page: number
    pageCount: number
    prevPublicPath?: string
    nextPublicPath?: string
  } | null
}

export interface NewsDetailPageData {
  kind: 'news-detail'
  slug: string
  title: string
  titleLang: string
  date: string
  updated?: string
  coverPublicUrl?: string
  tags: NewsTagLink[]
  isFallback: boolean
  isDraft: boolean
  translationUnavailableMessage?: string
  bodyLang: string
}

export interface PageDetailPageData {
  kind: 'page-detail'
  slug: string
  title: string
  titleLang: string
  coverPublicUrl?: string
  isFallback: boolean
  isDraft: boolean
  translationUnavailableMessage?: string
  bodyLang: string
}

export type LocaleLangLookup = Record<LocaleKey, string>
```

Re-export from `src/index.ts`:

```ts
export type {
  NewsListItem,
  NewsTagCount,
  NewsTagLink,
  NewsCollectionPageData,
  NewsDetailPageData,
  PageDetailPageData,
} from './shared/types/news.js'
export { formatMessage } from './shared/format-message.js'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/shared/format-message.test.ts tests/shared/news-types.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/format-message.ts src/shared/types/news.ts src/index.ts tests/shared/format-message.test.ts tests/shared/news-types.test.ts
git commit -m "feat(news): add news view-model types and message interpolation"
```

---

### Task 2: Build News list items with fallback and draft badges metadata

**Files:**
- Create: `src/compiler/news/build-news-list-items.ts`
- Create: `tests/compiler/news/build-news-list-items.test.ts`
- Create: `tests/helpers/news-fixtures.ts`

**Interfaces:**
- Consumes: `RouteContentPackage`, `CompiledPage`, `DefinitionsFile`, `NewsOptions`, `resolveMultilanguage`, `resolveContentAssetPublicUrl`, `encodePathSegment`
- Produces: `buildNewsListItems(input): NewsListItem[]`

Rules encoded in tests:
- Sort by `date` descending, then `slug` ascending
- Title/description from the locale Markdown that backs the detail page (`bodyLocale`)
- When `isFallback`, annotate `titleLang` / `descriptionLang` with main locale’s `lang`, set `excludeFromRss: true`
- When not fallback, langs equal current locale `lang`, `excludeFromRss: false` unless `isDraft`
- Drafts always `excludeFromRss: true`
- Text-only when `cover` absent (`coverPublicUrl` undefined)
- Tag links use `/{locale}/{news.urlSegment}/{tags.urlSegment}/{encodedTag}/`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/helpers/news-fixtures.ts
import type { RouteContentPackage, LocaleMarkdown, SynctrolThemeOptions } from '../../src/shared/types'
import type { CompiledPage } from '../../src/shared/route-types'
import { themeOptions as baseThemeOptions } from './route-fixtures'

export function md(
  partial: Partial<LocaleMarkdown> & { title: string },
): LocaleMarkdown {
  return {
    filePath: partial.filePath ?? 'zh.md',
    title: partial.title,
    description: partial.description,
    draft: partial.draft ?? false,
    body: partial.body ?? '# body',
  }
}

export function newsPkg(overrides: Partial<RouteContentPackage> & { slug: string }): RouteContentPackage {
  const defaults: RouteContentPackage = {
    dir: `/content/news/${overrides.slug}`,
    identity: `news:${overrides.slug}`,
    type: 'news',
    slug: overrides.slug,
    date: '2026-08-11',
    draft: false,
    tags: ['release'],
    locales: {
      zh: md({ title: `中文-${overrides.slug}`, description: '中文摘要', filePath: 'zh.md' }),
      en: md({ title: `EN-${overrides.slug}`, description: 'EN summary', filePath: 'en.md' }),
    },
  }
  return {
    ...defaults,
    ...overrides,
    type: 'news',
    slug: overrides.slug,
    dir: overrides.dir ?? defaults.dir,
    identity: overrides.identity ?? defaults.identity,
  }
}

export function newsDetailPage(
  pkg: RouteContentPackage,
  locale: string,
  flags: Partial<Pick<CompiledPage, 'isFallback' | 'isDraft' | 'bodyLocale'>> = {},
): CompiledPage {
  const bodyLocale = flags.bodyLocale ?? (flags.isFallback ? 'zh' : locale)
  const body = pkg.locales[bodyLocale]!
  return {
    identity: `news:${pkg.slug}`,
    locale,
    contentType: 'news',
    url: {
      routePath: `/${locale}/news/${pkg.slug}/`,
      outputPath: `${locale}/news/${pkg.slug}/index.html`,
      publicPath: `/${locale}/news/${pkg.slug}/`,
      absoluteUrl: `https://synctrol.com/${locale}/news/${pkg.slug}/`,
    },
    isFallback: flags.isFallback ?? false,
    isDraft: flags.isDraft ?? false,
    noindex: Boolean(flags.isFallback || flags.isDraft),
    bodyLocale,
    canonicalLocale: flags.isFallback ? 'zh' : locale,
    packagePath: pkg.dir,
    slug: pkg.slug,
    title: body.title,
    description: body.description,
  }
}

export function newsTheme(
  partial: Partial<SynctrolThemeOptions> = {},
): SynctrolThemeOptions {
  return baseThemeOptions({
    news: {
      urlSegment: 'news',
      index: { enabled: true, pagination: 12 },
      tags: { urlSegment: 'tags', index: { enabled: true } },
    },
    ...partial,
  })
}
```

```ts
// tests/compiler/news/build-news-list-items.test.ts
import { describe, expect, it } from 'vitest'
import { buildNewsListItems } from '../../../src/compiler/news/build-news-list-items'
import {
  newsDetailPage,
  newsPkg,
  newsTheme,
} from '../../helpers/news-fixtures'

const definitions = {
  tags: {
    release: { title: { zh: '作品发布', en: 'Releases' } },
  },
  platforms: {},
}

describe('buildNewsListItems', () => {
  it('sorts by date descending then slug and maps cover/title/description/date/tags', () => {
    const a = newsPkg({ slug: 'a', date: '2026-08-10' })
    const b = newsPkg({ slug: 'b', date: '2026-08-11', cover: './assets/c.webp' })
    const c = newsPkg({ slug: 'c', date: '2026-08-11' })
    const options = newsTheme()
    const details = [
      newsDetailPage(a, 'zh'),
      newsDetailPage(b, 'zh'),
      newsDetailPage(c, 'zh'),
    ]
    const items = buildNewsListItems({
      locale: 'zh',
      packages: [a, b, c],
      detailPages: details,
      options,
      definitions,
      resolveCoverUrl: (pkg, rel) =>
        `/assets/content/news/${pkg.slug}/${rel.replace(/^\.\//, '')}`,
    })
    expect(items.map((i) => i.slug)).toEqual(['b', 'c', 'a'])
    expect(items[0]).toMatchObject({
      title: '中文-b',
      description: '中文摘要',
      date: '2026-08-11',
      coverPublicUrl: '/assets/content/news/b/assets/c.webp',
      titleLang: 'zh-CN',
      isFallback: false,
      excludeFromRss: false,
    })
    expect(items[0]!.tags[0]).toEqual({
      key: 'release',
      title: '作品发布',
      publicPath: '/zh/news/tags/release/',
    })
    expect(items[1]!.coverPublicUrl).toBeUndefined()
  })

  it('uses main-locale title/description with main lang and excludeFromRss for fallbacks', () => {
    const pkg = newsPkg({
      slug: 'launch',
      locales: {
        zh: {
          filePath: 'zh.md',
          title: '发布',
          description: '中文说明',
          draft: false,
          body: '正文',
        },
      },
    })
    const enFallback = newsDetailPage(pkg, 'en', {
      isFallback: true,
      bodyLocale: 'zh',
    })
    const items = buildNewsListItems({
      locale: 'en',
      packages: [pkg],
      detailPages: [enFallback],
      options: newsTheme(),
      definitions,
      resolveCoverUrl: () => {
        throw new Error('no cover')
      },
    })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      title: '发布',
      titleLang: 'zh-CN',
      description: '中文说明',
      descriptionLang: 'zh-CN',
      isFallback: true,
      excludeFromRss: true,
      publicPath: '/en/news/launch/',
    })
  })

  it('marks drafts excludeFromRss and isDraft', () => {
    const pkg = newsPkg({ slug: 'drafty', draft: true })
    const page = newsDetailPage(pkg, 'zh', { isDraft: true })
    const items = buildNewsListItems({
      locale: 'zh',
      packages: [pkg],
      detailPages: [page],
      options: newsTheme({ showDrafts: true }),
      definitions,
      resolveCoverUrl: () => undefined as never,
    })
    expect(items[0]).toMatchObject({
      isDraft: true,
      excludeFromRss: true,
    })
  })

  it('only includes packages present as detail pages for that locale', () => {
    const shown = newsPkg({ slug: 'shown' })
    const hidden = newsPkg({ slug: 'hidden' })
    const items = buildNewsListItems({
      locale: 'zh',
      packages: [shown, hidden],
      detailPages: [newsDetailPage(shown, 'zh')],
      options: newsTheme(),
      definitions,
      resolveCoverUrl: () => undefined as never,
    })
    expect(items.map((i) => i.slug)).toEqual(['shown'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/news/build-news-list-items.test.ts`

Expected: FAIL with `buildNewsListItems` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/news/build-news-list-items.ts
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { RouteContentPackage, DefinitionsFile, LocaleKey, SynctrolThemeOptions } from '../../shared/types.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { NewsListItem, NewsTagLink } from '../../shared/types/news.js'
import { encodePathSegment } from '../url/validate-segment.js'

export interface BuildNewsListItemsInput {
  locale: LocaleKey
  packages: RouteContentPackage[]
  detailPages: CompiledPage[]
  options: SynctrolThemeOptions
  definitions: DefinitionsFile
  resolveCoverUrl: (pkg: RouteContentPackage, relativePath: string) => string
}

function tagPublicPath(
  locale: LocaleKey,
  newsSegment: string,
  tagsSegment: string,
  tagKey: string,
): string {
  return `/${locale}/${newsSegment}/${tagsSegment}/${encodePathSegment(tagKey)}/`
}

function buildTagLinks(
  keys: string[],
  locale: LocaleKey,
  options: SynctrolThemeOptions,
  definitions: DefinitionsFile,
): NewsTagLink[] {
  const newsSegment = options.news.urlSegment
  const tagsSegment = options.news.tags.urlSegment
  return keys.map((key) => {
    const def = definitions.tags[key]
    if (!def) {
      throw new Error(`Unknown news tag "${key}"`)
    }
    const resolved = resolveMultilanguage(def.title, locale, options.mainLocale)
    return {
      key,
      title: resolved.text,
      publicPath: tagPublicPath(locale, newsSegment, tagsSegment, key),
    }
  })
}

export function buildNewsListItems(input: BuildNewsListItemsInput): NewsListItem[] {
  const { locale, packages, detailPages, options, definitions, resolveCoverUrl } =
    input
  const byIdentity = new Map(
    detailPages
      .filter((p) => p.locale === locale && p.contentType === 'news')
      .map((p) => [p.identity, p]),
  )

  const items: NewsListItem[] = []
  for (const pkg of packages) {
    if (pkg.type !== 'news' || !pkg.slug) continue
    const identity = `news:${pkg.slug}` as const
    const page = byIdentity.get(identity)
    if (!page) continue

    const bodyMd = pkg.locales[page.bodyLocale]
    if (!bodyMd) {
      throw new Error(`Missing body locale ${page.bodyLocale} for ${pkg.dir}`)
    }

    const titleLang = options.locales[page.bodyLocale]!.lang
    const descriptionLang = bodyMd.description
      ? options.locales[page.bodyLocale]!.lang
      : undefined

    items.push({
      identity,
      slug: pkg.slug,
      publicPath: page.url.publicPath,
      title: bodyMd.title,
      titleLang,
      description: bodyMd.description,
      descriptionLang,
      date: pkg.date!,
      updated: pkg.updated,
      coverPublicUrl: pkg.cover ? resolveCoverUrl(pkg, pkg.cover) : undefined,
      tags: buildTagLinks(pkg.tags ?? [], locale, options, definitions),
      isFallback: page.isFallback,
      isDraft: page.isDraft,
      excludeFromRss: page.isFallback || page.isDraft,
    })
  }

  items.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0
  })
  return items
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/news/build-news-list-items.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/news/build-news-list-items.ts tests/compiler/news/build-news-list-items.test.ts tests/helpers/news-fixtures.ts
git commit -m "feat(news): build list items with fallback lang and RSS exclusion flags"
```

---

### Task 3: News Tags Index counts (unpaginated)

**Files:**
- Create: `src/compiler/news/build-news-tags-index.ts`
- Create: `tests/compiler/news/build-news-tags-index.test.ts`

**Interfaces:**
- Consumes: `buildNewsListItems` output or equivalent visible packages; `DefinitionsFile.tags`; `NewsOptions`
- Produces: `buildNewsTagsIndex(input): NewsTagCount[]`

Rules:
- Include every **declared** tag from definitions (unused tags allowed with count `0`)
- Count is number of visible News list items in this locale that include the tag
- Not paginated; order is definitions key insertion order
- Titles resolve with Multilanguage fallback; `titleLang` reflects resolved locale

- [ ] **Step 1: Write the failing tests**

```ts
// tests/compiler/news/build-news-tags-index.test.ts
import { describe, expect, it } from 'vitest'
import { buildNewsListItems } from '../../../src/compiler/news/build-news-list-items'
import { buildNewsTagsIndex } from '../../../src/compiler/news/build-news-tags-index'
import {
  newsDetailPage,
  newsPkg,
  newsTheme,
} from '../../helpers/news-fixtures'

const definitions = {
  tags: {
    release: { title: { zh: '作品发布', en: 'Releases' } },
    tour: { title: { zh: '巡演', en: 'Tour' } },
  },
  platforms: {},
}

describe('buildNewsTagsIndex', () => {
  it('lists all declared tags with visible counts and is not paginated', () => {
    const a = newsPkg({ slug: 'a', tags: ['release'] })
    const b = newsPkg({ slug: 'b', tags: ['release', 'tour'] })
    const items = buildNewsListItems({
      locale: 'zh',
      packages: [a, b],
      detailPages: [newsDetailPage(a, 'zh'), newsDetailPage(b, 'zh')],
      options: newsTheme(),
      definitions,
      resolveCoverUrl: () => '/x.webp',
    })
    const rows = buildNewsTagsIndex({
      locale: 'zh',
      items,
      definitions,
      options: newsTheme(),
    })
    expect(rows).toEqual([
      {
        key: 'release',
        title: '作品发布',
        titleLang: 'zh-CN',
        count: 2,
        publicPath: '/zh/news/tags/release/',
      },
      {
        key: 'tour',
        title: '巡演',
        titleLang: 'zh-CN',
        count: 1,
        publicPath: '/zh/news/tags/tour/',
      },
    ])
  })

  it('keeps unused declared tags at count 0', () => {
    const rows = buildNewsTagsIndex({
      locale: 'en',
      items: [],
      definitions,
      options: newsTheme(),
    })
    expect(rows.find((r) => r.key === 'tour')).toMatchObject({
      count: 0,
      title: 'Tour',
      titleLang: 'en-US',
    })
  })

  it('falls back tag title lang to mainLocale when missing', () => {
    const defs = {
      tags: {
        release: { title: { zh: '作品发布' } },
      },
      platforms: {},
    }
    const rows = buildNewsTagsIndex({
      locale: 'en',
      items: [],
      definitions: defs,
      options: newsTheme(),
    })
    expect(rows[0]).toMatchObject({
      title: '作品发布',
      titleLang: 'zh-CN',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/news/build-news-tags-index.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/news/build-news-tags-index.ts
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { DefinitionsFile, LocaleKey, SynctrolThemeOptions } from '../../shared/types.js'
import type { NewsListItem, NewsTagCount } from '../../shared/types/news.js'
import { encodePathSegment } from '../url/validate-segment.js'

export interface BuildNewsTagsIndexInput {
  locale: LocaleKey
  items: NewsListItem[]
  definitions: DefinitionsFile
  options: SynctrolThemeOptions
}

export function buildNewsTagsIndex(input: BuildNewsTagsIndexInput): NewsTagCount[] {
  const { locale, items, definitions, options } = input
  const newsSegment = options.news.urlSegment
  const tagsSegment = options.news.tags.urlSegment
  const counts = new Map<string, number>()
  for (const key of Object.keys(definitions.tags)) {
    counts.set(key, 0)
  }
  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag.key, (counts.get(tag.key) ?? 0) + 1)
    }
  }

  return Object.keys(definitions.tags).map((key) => {
    const resolved = resolveMultilanguage(
      definitions.tags[key]!.title,
      locale,
      options.mainLocale,
    )
    return {
      key,
      title: resolved.text,
      titleLang: options.locales[resolved.locale]!.lang,
      count: counts.get(key) ?? 0,
      publicPath: `/${locale}/${newsSegment}/${tagsSegment}/${encodePathSegment(key)}/`,
    }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/news/build-news-tags-index.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/news/build-news-tags-index.ts tests/compiler/news/build-news-tags-index.test.ts
git commit -m "feat(news): build unpaginated tags index with visible counts"
```

---

### Task 4: Attach News collection and detail page data

**Files:**
- Create: `src/compiler/news/attach-news-page-data.ts`
- Create: `tests/compiler/news/attach-news-page-data.test.ts`

**Interfaces:**
- Consumes: `CompiledSite` / `CompiledPage[]`, `buildNewsListItems`, `buildNewsTagsIndex`, `formatMessage`, `resolveMultilanguage` for `seo.collections.news`
- Produces: `attachNewsPageData(input): Map<string, NewsCollectionPageData | NewsDetailPageData>` keyed by `routePath`; slices items by `collection.itemIdentities`

Rules:
- News index / tag archive headings use `seo.collections.news` + `paginatedTitle` / `tagArchiveTitle`
- Pagination links: page 1 = index/tag route; page ≥2 = `.../page/{n}/`
- When `pagination: false`, `pagination` field is `null` and all items included
- Detail data includes optional `updated`, cover, tags, fallback message from `messages.translationUnavailable`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/compiler/news/attach-news-page-data.test.ts
import { describe, expect, it } from 'vitest'
import { attachNewsPageData } from '../../../src/compiler/news/attach-news-page-data'
import {
  newsDetailPage,
  newsPkg,
  newsTheme,
} from '../../helpers/news-fixtures'
import type { CompiledPage } from '../../../src/shared/route-types'

const definitions = {
  tags: {
    release: { title: { zh: '作品发布', en: 'Releases' } },
  },
  platforms: {},
}

function collectionPage(
  partial: Partial<CompiledPage> & Pick<CompiledPage, 'identity' | 'url' | 'collection'>,
): CompiledPage {
  return {
    locale: 'zh',
    contentType: 'news-collection',
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: 'zh',
    canonicalLocale: 'zh',
    title: String(partial.identity),
    ...partial,
  }
}

describe('attachNewsPageData', () => {
  it('slices news index pages and builds paginated titles', () => {
    const pkgs = [
      newsPkg({ slug: 'a', date: '2026-08-11' }),
      newsPkg({ slug: 'b', date: '2026-08-10' }),
      newsPkg({ slug: 'c', date: '2026-08-09' }),
    ]
    const details = pkgs.map((p) => newsDetailPage(p, 'zh'))
    const index: CompiledPage = collectionPage({
      identity: 'news-index',
      url: {
        routePath: '/zh/news/',
        outputPath: 'zh/news/index.html',
        publicPath: '/zh/news/',
        absoluteUrl: 'https://synctrol.com/zh/news/',
      },
      collection: {
        page: 1,
        pageCount: 2,
        itemIdentities: ['news:a', 'news:b'],
      },
    })
    const page2: CompiledPage = collectionPage({
      identity: 'news-page:2',
      url: {
        routePath: '/zh/news/page/2/',
        outputPath: 'zh/news/page/2/index.html',
        publicPath: '/zh/news/page/2/',
        absoluteUrl: 'https://synctrol.com/zh/news/page/2/',
      },
      collection: {
        page: 2,
        pageCount: 2,
        itemIdentities: ['news:c'],
      },
    })
    const options = newsTheme({
      seo: {
        name: { zh: 'Synctrol', en: 'Synctrol' },
        description: { zh: 'd', en: 'd' },
        defaultImage: './assets/social-default.webp',
        organization: { name: 'Synctrol', logo: './assets/logo.svg' },
        collections: {
          release: {
            title: { zh: '作品', en: 'Releases' },
            description: { zh: 'r', en: 'r' },
          },
          news: {
            title: { zh: '新闻', en: 'News' },
            description: { zh: 'Synctrol 新闻', en: 'Synctrol news' },
          },
        },
      },
      news: {
        urlSegment: 'news',
        index: { enabled: true, pagination: 2 },
        tags: { urlSegment: 'tags', index: { enabled: true } },
      },
    })

    const map = attachNewsPageData({
      pages: [...details, index, page2],
      packages: pkgs,
      options,
      definitions,
      resolveCoverUrl: () => '/cover.webp',
    })

    const indexData = map.get('/zh/news/')
    expect(indexData).toMatchObject({
      kind: 'news-index',
      heading: '新闻',
      description: 'Synctrol 新闻',
    })
    expect(indexData && 'items' in indexData && indexData.items.map((i) => i.slug)).toEqual([
      'a',
      'b',
    ])
    expect(indexData && 'pagination' in indexData && indexData.pagination).toEqual({
      page: 1,
      pageCount: 2,
      prevPublicPath: undefined,
      nextPublicPath: '/zh/news/page/2/',
    })

    const p2 = map.get('/zh/news/page/2/')
    expect(p2).toMatchObject({
      kind: 'news-index',
      heading: '新闻 · 第 2 页',
    })
    expect(p2 && 'pagination' in p2 && p2.pagination).toEqual({
      page: 2,
      pageCount: 2,
      prevPublicPath: '/zh/news/',
      nextPublicPath: undefined,
    })
  })

  it('builds tags index data without pagination', () => {
    const pkg = newsPkg({ slug: 'a' })
    const tagsIndex = collectionPage({
      identity: 'news-tags-index',
      url: {
        routePath: '/zh/news/tags/',
        outputPath: 'zh/news/tags/index.html',
        publicPath: '/zh/news/tags/',
        absoluteUrl: 'https://synctrol.com/zh/news/tags/',
      },
      collection: { page: 1, pageCount: 1, itemIdentities: [] },
    })
    const options = newsTheme({
      seo: {
        name: { zh: 'Synctrol', en: 'Synctrol' },
        description: { zh: 'd', en: 'd' },
        defaultImage: './a.webp',
        organization: { name: 'Synctrol', logo: './l.svg' },
        collections: {
          release: { title: '作品', description: 'r' },
          news: { title: { zh: '新闻', en: 'News' }, description: { zh: 'n', en: 'n' } },
        },
      },
    })
    const map = attachNewsPageData({
      pages: [newsDetailPage(pkg, 'zh'), tagsIndex],
      packages: [pkg],
      options,
      definitions,
      resolveCoverUrl: () => '/c.webp',
    })
    const data = map.get('/zh/news/tags/')
    expect(data).toMatchObject({ kind: 'news-tags-index', pagination: null })
    expect(data && 'tags' in data && data.tags?.[0]).toMatchObject({
      key: 'release',
      count: 1,
    })
  })

  it('builds tag archive heading with tagArchiveTitle and filters items', () => {
    const a = newsPkg({ slug: 'a', tags: ['release'] })
    const archive = collectionPage({
      identity: 'news-tag:release',
      url: {
        routePath: '/zh/news/tags/release/',
        outputPath: 'zh/news/tags/release/index.html',
        publicPath: '/zh/news/tags/release/',
        absoluteUrl: 'https://synctrol.com/zh/news/tags/release/',
      },
      collection: {
        page: 1,
        pageCount: 1,
        itemIdentities: ['news:a'],
        tag: 'release',
      },
    })
    const options = newsTheme({
      seo: {
        name: 'Synctrol',
        description: 'd',
        defaultImage: './a.webp',
        organization: { name: 'Synctrol', logo: './l.svg' },
        collections: {
          release: { title: '作品', description: 'r' },
          news: { title: { zh: '新闻', en: 'News' }, description: { zh: 'n', en: 'n' } },
        },
      },
    })
    const map = attachNewsPageData({
      pages: [newsDetailPage(a, 'zh'), archive],
      packages: [a],
      options,
      definitions,
      resolveCoverUrl: () => '/c.webp',
    })
    expect(map.get('/zh/news/tags/release/')).toMatchObject({
      kind: 'news-tag',
      heading: '作品发布 · 新闻',
      tagKey: 'release',
    })
  })

  it('builds news detail page data with fallback message', () => {
    const pkg = newsPkg({
      slug: 'launch',
      updated: '2026-08-12',
      cover: './assets/n.webp',
      locales: {
        zh: {
          filePath: 'zh.md',
          title: '发布',
          description: '摘要',
          draft: false,
          body: '正文',
        },
      },
    })
    const page = newsDetailPage(pkg, 'en', { isFallback: true, bodyLocale: 'zh' })
    const options = newsTheme()
    const map = attachNewsPageData({
      pages: [page],
      packages: [pkg],
      options,
      definitions,
      resolveCoverUrl: (_p, rel) => `/hashed/${rel}`,
    })
    expect(map.get('/en/news/launch/')).toEqual({
      kind: 'news-detail',
      slug: 'launch',
      title: '发布',
      titleLang: 'zh-CN',
      date: '2026-08-11',
      updated: '2026-08-12',
      coverPublicUrl: '/hashed/./assets/n.webp',
      tags: [
        {
          key: 'release',
          title: 'Releases',
          publicPath: '/en/news/tags/release/',
        },
      ],
      isFallback: true,
      isDraft: false,
      translationUnavailableMessage:
        'This article is not yet available in English. Showing the original version.',
      bodyLang: 'zh-CN',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/news/attach-news-page-data.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/news/attach-news-page-data.ts
import { formatMessage } from '../../shared/format-message.js'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { RouteContentPackage, DefinitionsFile, SynctrolThemeOptions } from '../../shared/types.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type {
  NewsCollectionPageData,
  NewsDetailPageData,
  NewsListItem,
} from '../../shared/types/news.js'
import { buildNewsListItems } from './build-news-list-items.js'
import { buildNewsTagsIndex } from './build-news-tags-index.js'

export interface AttachNewsPageDataInput {
  pages: CompiledPage[]
  packages: RouteContentPackage[]
  options: SynctrolThemeOptions
  definitions: DefinitionsFile
  resolveCoverUrl: (pkg: RouteContentPackage, relativePath: string) => string
}

export type AttachedNewsData = NewsCollectionPageData | NewsDetailPageData

function newsCollectionTitle(options: SynctrolThemeOptions, locale: string): string {
  return resolveMultilanguage(
    options.seo.collections.news.title,
    locale,
    options.mainLocale,
  ).text
}

function newsCollectionDescription(options: SynctrolThemeOptions, locale: string): string {
  return resolveMultilanguage(
    options.seo.collections.news.description,
    locale,
    options.mainLocale,
  ).text
}

function paginationPaths(
  page: CompiledPage,
  allPages: CompiledPage[],
): NewsCollectionPageData['pagination'] {
  const c = page.collection
  if (!c || c.pageCount <= 1) {
    return c ? { page: c.page, pageCount: c.pageCount } : null
  }
  const locale = page.locale
  const sameFamily = allPages.filter((p) => {
    if (p.locale !== locale || p.contentType !== 'news-collection') return false
    if (page.collection?.tag) {
      return p.collection?.tag === page.collection.tag
    }
    return (
      p.identity === 'news-index' ||
      (typeof p.identity === 'string' && p.identity.startsWith('news-page:'))
    )
  })
  const prev = sameFamily.find((p) => p.collection?.page === c.page - 1)
  const next = sameFamily.find((p) => p.collection?.page === c.page + 1)
  return {
    page: c.page,
    pageCount: c.pageCount,
    prevPublicPath: prev?.url.publicPath,
    nextPublicPath: next?.url.publicPath,
  }
}

function sliceItems(
  all: NewsListItem[],
  identities: CompiledPage['collection'],
): NewsListItem[] {
  if (!identities) return all
  const set = new Set(identities.itemIdentities)
  return all.filter((i) => set.has(i.identity))
}

export function attachNewsPageData(
  input: AttachNewsPageDataInput,
): Map<string, AttachedNewsData> {
  const { pages, packages, options, definitions, resolveCoverUrl } = input
  const out = new Map<string, AttachedNewsData>()
  const locales = [...new Set(pages.map((p) => p.locale))]

  const itemsByLocale = new Map<string, NewsListItem[]>()
  for (const locale of locales) {
    itemsByLocale.set(
      locale,
      buildNewsListItems({
        locale,
        packages,
        detailPages: pages,
        options,
        definitions,
        resolveCoverUrl,
      }),
    )
  }

  for (const page of pages) {
    const messages = options.locales[page.locale]!.messages
    const allItems = itemsByLocale.get(page.locale) ?? []

    if (page.contentType === 'news' && typeof page.identity === 'string') {
      const pkg = packages.find(
        (p) => p.type === 'news' && `news:${p.slug}` === page.identity,
      )
      if (!pkg || !pkg.slug) continue
      const bodyMd = pkg.locales[page.bodyLocale]!
      const listItem = allItems.find((i) => i.identity === page.identity)
      out.set(page.url.routePath, {
        kind: 'news-detail',
        slug: pkg.slug,
        title: bodyMd.title,
        titleLang: options.locales[page.bodyLocale]!.lang,
        date: pkg.date!,
        updated: pkg.updated,
        coverPublicUrl: listItem?.coverPublicUrl,
        tags: listItem?.tags ?? [],
        isFallback: page.isFallback,
        isDraft: page.isDraft,
        translationUnavailableMessage: page.isFallback
          ? messages.translationUnavailable
          : undefined,
        bodyLang: options.locales[page.bodyLocale]!.lang,
      })
      continue
    }

    if (page.contentType !== 'news-collection') continue

    if (page.identity === 'news-tags-index') {
      out.set(page.url.routePath, {
        kind: 'news-tags-index',
        heading: newsCollectionTitle(options, page.locale),
        description: newsCollectionDescription(options, page.locale),
        items: [],
        tags: buildNewsTagsIndex({
          locale: page.locale,
          items: allItems,
          definitions,
          options,
        }),
        pagination: null,
      })
      continue
    }

    const baseTitle = newsCollectionTitle(options, page.locale)
    const description = newsCollectionDescription(options, page.locale)
    const pageNum = page.collection?.page ?? 1
    let heading = baseTitle
    let kind: NewsCollectionPageData['kind'] = 'news-index'
    let tagKey: string | undefined

    if (page.collection?.tag) {
      kind = 'news-tag'
      tagKey = page.collection.tag
      const tagTitle = resolveMultilanguage(
        definitions.tags[tagKey]!.title,
        page.locale,
        options.mainLocale,
      ).text
      heading = formatMessage(messages.tagArchiveTitle, {
        tag: tagTitle,
        title: baseTitle,
      })
    }

    if (pageNum >= 2) {
      heading = formatMessage(messages.paginatedTitle, {
        title: heading,
        page: String(pageNum),
      })
    }

    out.set(page.url.routePath, {
      kind,
      heading,
      description,
      items: sliceItems(allItems, page.collection),
      tagKey,
      pagination: paginationPaths(page, pages),
    })
  }

  return out
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/news/attach-news-page-data.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/news/attach-news-page-data.ts tests/compiler/news/attach-news-page-data.test.ts
git commit -m "feat(news): attach collection and detail page data models"
```

---

### Task 5: DraftBadge and TranslationUnavailableBadge components

**Files:**
- Create: `src/client/components/DraftBadge.vue`
- Create: `src/client/components/TranslationUnavailableBadge.vue`
- Create: `tests/client/components/badges.test.ts`

**Interfaces:**
- Consumes: Plan 05 `useLocaleMessages()` (or explicit `label` prop for unit tests)
- Produces: presentational badge components with `data-testid` hooks

- [ ] **Step 1: Write the failing tests**

```ts
// tests/client/components/badges.test.ts
/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DraftBadge from '../../../src/client/components/DraftBadge.vue'
import TranslationUnavailableBadge from '../../../src/client/components/TranslationUnavailableBadge.vue'

describe('badges', () => {
  it('renders the draft label', () => {
    const wrapper = mount(DraftBadge, { props: { label: 'Draft' } })
    expect(wrapper.attributes('data-testid')).toBe('draft-badge')
    expect(wrapper.text()).toBe('Draft')
  })

  it('renders the translation-unavailable label', () => {
    const wrapper = mount(TranslationUnavailableBadge, {
      props: { label: 'This article is not yet available in English. Showing the original version.' },
    })
    expect(wrapper.attributes('data-testid')).toBe('translation-unavailable-badge')
    expect(wrapper.text()).toContain('not yet available')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/client/components/badges.test.ts`

Expected: FAIL with component module not found.

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- src/client/components/DraftBadge.vue -->
<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <span class="syn-badge syn-badge--draft" data-testid="draft-badge">{{ label }}</span>
</template>

<style scoped>
.syn-badge {
  display: inline-block;
  border: var(--syn-border-strong);
  border-radius: var(--syn-radius);
  padding: 0.15em 0.4em;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
```

```vue
<!-- src/client/components/TranslationUnavailableBadge.vue -->
<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <p
    class="syn-badge syn-badge--translation"
    data-testid="translation-unavailable-badge"
    role="status"
  >
    {{ label }}
  </p>
</template>

<style scoped>
.syn-badge--translation {
  border: var(--syn-border-subtle);
  border-radius: var(--syn-radius);
  padding: 0.75rem 1rem;
  margin: 0 0 1.25rem;
}
</style>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/client/components/badges.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/DraftBadge.vue src/client/components/TranslationUnavailableBadge.vue tests/client/components/badges.test.ts
git commit -m "feat(ui): add draft and translation-unavailable badges"
```

---

### Task 6: NewsListItem and NewsList (cover vs text-only)

**Files:**
- Create: `src/client/components/ContentCover.vue`
- Create: `src/client/components/news/NewsListItem.vue`
- Create: `src/client/components/news/NewsList.vue`
- Create: `tests/client/components/news-list.test.ts`

**Interfaces:**
- Consumes: `NewsListItem`, `DraftBadge`, `TranslationUnavailableBadge`, Plan 08 `formatCalendarDate` (inject via props `formattedDate` in unit tests)
- Produces: list UI with `data-layout="cover" | "text"` 

- [ ] **Step 1: Write the failing tests**

```ts
// tests/client/components/news-list.test.ts
/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NewsList from '../../../src/client/components/news/NewsList.vue'
import NewsListItem from '../../../src/client/components/news/NewsListItem.vue'
import type { NewsListItem as Item } from '../../../src/shared/types/news'

function item(partial: Partial<Item> & Pick<Item, 'slug' | 'title'>): Item {
  return {
    identity: `news:${partial.slug}`,
    slug: partial.slug,
    publicPath: `/zh/news/${partial.slug}/`,
    title: partial.title,
    titleLang: partial.titleLang ?? 'zh-CN',
    description: partial.description,
    descriptionLang: partial.descriptionLang,
    date: partial.date ?? '2026-08-11',
    updated: partial.updated,
    coverPublicUrl: partial.coverPublicUrl,
    tags: partial.tags ?? [
      { key: 'release', title: '作品发布', publicPath: '/zh/news/tags/release/' },
    ],
    isFallback: partial.isFallback ?? false,
    isDraft: partial.isDraft ?? false,
    excludeFromRss: partial.excludeFromRss ?? false,
  }
}

describe('NewsListItem', () => {
  it('uses cover layout when coverPublicUrl is set', () => {
    const wrapper = mount(NewsListItem, {
      props: {
        item: item({
          slug: 'with-cover',
          title: '有封面',
          coverPublicUrl: '/assets/c.webp',
          description: '摘要',
        }),
        formattedDate: '2026年8月11日',
        draftLabel: '未发布',
        translationUnavailableLabel: '暂无翻译',
      },
    })
    expect(wrapper.attributes('data-layout')).toBe('cover')
    expect(wrapper.find('img').attributes('src')).toBe('/assets/c.webp')
    expect(wrapper.find('img').attributes('alt')).toBe('有封面')
  })

  it('uses text-only layout when cover is absent', () => {
    const wrapper = mount(NewsListItem, {
      props: {
        item: item({ slug: 'text', title: '纯文字', description: '说明' }),
        formattedDate: '2026年8月11日',
        draftLabel: '未发布',
        translationUnavailableLabel: '暂无翻译',
      },
    })
    expect(wrapper.attributes('data-layout')).toBe('text')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('annotates fallback title with lang and shows both badges when needed', () => {
    const wrapper = mount(NewsListItem, {
      props: {
        item: item({
          slug: 'fb',
          title: '发布',
          titleLang: 'zh-CN',
          description: '中文说明',
          descriptionLang: 'zh-CN',
          isFallback: true,
          isDraft: true,
          excludeFromRss: true,
        }),
        formattedDate: 'August 11, 2026',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
      },
    })
    expect(wrapper.find('[data-testid="item-title"]').attributes('lang')).toBe('zh-CN')
    expect(wrapper.find('[data-testid="item-description"]').attributes('lang')).toBe(
      'zh-CN',
    )
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="translation-unavailable-badge"]').exists()).toBe(
      true,
    )
  })
})

describe('NewsList', () => {
  it('renders emptyNews when there are no items', () => {
    const wrapper = mount(NewsList, {
      props: {
        items: [],
        emptyLabel: '暂无新闻',
        draftLabel: '未发布',
        translationUnavailableLabel: 'x',
        formatDate: () => 'd',
      },
    })
    expect(wrapper.find('[data-testid="empty-news"]').text()).toBe('暂无新闻')
  })

  it('renders one row per item', () => {
    const wrapper = mount(NewsList, {
      props: {
        items: [
          item({ slug: 'a', title: 'A' }),
          item({ slug: 'b', title: 'B', coverPublicUrl: '/b.webp' }),
        ],
        emptyLabel: '暂无新闻',
        draftLabel: '未发布',
        translationUnavailableLabel: 'x',
        formatDate: (d) => d,
      },
    })
    expect(wrapper.findAllComponents(NewsListItem)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/client/components/news-list.test.ts`

Expected: FAIL with modules not found.

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- src/client/components/ContentCover.vue -->
<script setup lang="ts">
defineProps<{ src: string; alt: string; eager?: boolean }>()
</script>

<template>
  <img
    class="syn-cover"
    data-testid="content-cover"
    :src="src"
    :alt="alt"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
  />
</template>

<style scoped>
.syn-cover {
  display: block;
  width: 100%;
  height: auto;
  border: var(--syn-border-strong);
  border-radius: var(--syn-radius);
}
</style>
```

```vue
<!-- src/client/components/news/NewsListItem.vue -->
<script setup lang="ts">
import type { NewsListItem } from '../../../shared/types/news.js'
import ContentCover from '../ContentCover.vue'
import DraftBadge from '../DraftBadge.vue'
import TranslationUnavailableBadge from '../TranslationUnavailableBadge.vue'

defineProps<{
  item: NewsListItem
  formattedDate: string
  draftLabel: string
  translationUnavailableLabel: string
}>()
</script>

<template>
  <article
    class="syn-news-item"
    :data-layout="item.coverPublicUrl ? 'cover' : 'text'"
  >
    <a class="syn-news-item__link" :href="item.publicPath">
      <ContentCover
        v-if="item.coverPublicUrl"
        :src="item.coverPublicUrl"
        :alt="item.title"
      />
      <h2 data-testid="item-title" :lang="item.titleLang">{{ item.title }}</h2>
    </a>
    <p
      v-if="item.description"
      data-testid="item-description"
      class="syn-news-item__desc"
      :lang="item.descriptionLang"
    >
      {{ item.description }}
    </p>
    <p class="syn-news-item__date">
      <time :datetime="item.date">{{ formattedDate }}</time>
    </p>
    <ul v-if="item.tags.length" class="syn-news-item__tags">
      <li v-for="tag in item.tags" :key="tag.key">
        <a :href="tag.publicPath">{{ tag.title }}</a>
      </li>
    </ul>
    <DraftBadge v-if="item.isDraft" :label="draftLabel" />
    <TranslationUnavailableBadge
      v-if="item.isFallback"
      :label="translationUnavailableLabel"
    />
  </article>
</template>

<style scoped>
.syn-news-item {
  border-bottom: var(--syn-border-strong);
  padding: 1.25rem 0;
  border-radius: var(--syn-radius);
}
.syn-news-item__link {
  color: inherit;
  text-decoration: none;
}
.syn-news-item__link:focus-visible {
  outline: var(--syn-border-strong);
}
.syn-news-item__tags {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
```

```vue
<!-- src/client/components/news/NewsList.vue -->
<script setup lang="ts">
import type { NewsListItem } from '../../../shared/types/news.js'
import NewsListItemRow from './NewsListItem.vue'

defineProps<{
  items: NewsListItem[]
  emptyLabel: string
  draftLabel: string
  translationUnavailableLabel: string
  formatDate: (date: string) => string
}>()
</script>

<template>
  <div class="syn-news-list">
    <p v-if="items.length === 0" data-testid="empty-news">{{ emptyLabel }}</p>
    <NewsListItemRow
      v-for="item in items"
      :key="item.identity"
      :item="item"
      :formatted-date="formatDate(item.date)"
      :draft-label="draftLabel"
      :translation-unavailable-label="translationUnavailableLabel"
    />
  </div>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/client/components/news-list.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/ContentCover.vue src/client/components/news/NewsListItem.vue src/client/components/news/NewsList.vue tests/client/components/news-list.test.ts
git commit -m "feat(news): add cover and text-only news list components"
```

---

### Task 7: NewsTagsList and collection layouts (index, tags index, tag archive)

**Files:**
- Create: `src/client/components/news/NewsTagsList.vue`
- Create: `src/client/layouts/NewsIndexLayout.vue`
- Create: `src/client/layouts/NewsTagsIndexLayout.vue`
- Create: `src/client/layouts/NewsTagArchiveLayout.vue`
- Create: `tests/client/layouts/news-collections.test.ts`
- Modify: theme client layout registry from Plan 05 to map `news-collection` identities to these layouts

**Interfaces:**
- Consumes: `NewsCollectionPageData`, `NewsList`, Plan 08 `PaginationNav`
- Produces: three layouts; Tags Index never renders `PaginationNav`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/client/layouts/news-collections.test.ts
/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NewsIndexLayout from '../../../src/client/layouts/NewsIndexLayout.vue'
import NewsTagsIndexLayout from '../../../src/client/layouts/NewsTagsIndexLayout.vue'
import NewsTagArchiveLayout from '../../../src/client/layouts/NewsTagArchiveLayout.vue'
import type { NewsCollectionPageData } from '../../../src/shared/types/news'

const listItem = {
  identity: 'news:a' as const,
  slug: 'a',
  publicPath: '/zh/news/a/',
  title: 'A',
  titleLang: 'zh-CN',
  date: '2026-08-11',
  tags: [] as [],
  isFallback: false,
  isDraft: false,
  excludeFromRss: false,
}

describe('News collection layouts', () => {
  it('NewsIndexLayout renders heading, list, and pagination', () => {
    const data: NewsCollectionPageData = {
      kind: 'news-index',
      heading: '新闻',
      description: 'Synctrol 新闻',
      items: [listItem],
      pagination: {
        page: 1,
        pageCount: 2,
        nextPublicPath: '/zh/news/page/2/',
      },
    }
    const wrapper = mount(NewsIndexLayout, {
      props: {
        data,
        emptyLabel: '暂无新闻',
        draftLabel: '未发布',
        translationUnavailableLabel: 'x',
        previousPageLabel: '上一页',
        nextPageLabel: '下一页',
        formatDate: (d: string) => d,
      },
      global: {
        stubs: {
          PaginationNav: {
            props: ['prevHref', 'nextHref', 'prevLabel', 'nextLabel'],
            template:
              '<nav data-testid="pagination"><a v-if="nextHref" :href="nextHref">{{ nextLabel }}</a></nav>',
          },
          ContentColumn: { template: '<div class="col"><slot /></div>' },
        },
      },
    })
    expect(wrapper.find('h1').text()).toBe('新闻')
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(true)
  })

  it('NewsTagsIndexLayout lists tags with counts and has no pagination', () => {
    const data: NewsCollectionPageData = {
      kind: 'news-tags-index',
      heading: '新闻',
      description: 'n',
      items: [],
      tags: [
        {
          key: 'release',
          title: '作品发布',
          titleLang: 'zh-CN',
          count: 2,
          publicPath: '/zh/news/tags/release/',
        },
      ],
      pagination: null,
    }
    const wrapper = mount(NewsTagsIndexLayout, {
      props: { data },
      global: {
        stubs: { ContentColumn: { template: '<div><slot /></div>' } },
      },
    })
    expect(wrapper.find('[data-testid="news-tags-list"]').text()).toContain('作品发布')
    expect(wrapper.find('[data-testid="news-tags-list"]').text()).toContain('2')
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(false)
  })

  it('NewsTagArchiveLayout filters heading and list for a tag', () => {
    const data: NewsCollectionPageData = {
      kind: 'news-tag',
      heading: '作品发布 · 新闻',
      description: 'n',
      tagKey: 'release',
      items: [listItem],
      pagination: { page: 1, pageCount: 1 },
    }
    const wrapper = mount(NewsTagArchiveLayout, {
      props: {
        data,
        emptyLabel: '暂无新闻',
        draftLabel: '未发布',
        translationUnavailableLabel: 'x',
        previousPageLabel: '上一页',
        nextPageLabel: '下一页',
        formatDate: (d: string) => d,
      },
      global: {
        stubs: {
          PaginationNav: true,
          ContentColumn: { template: '<div><slot /></div>' },
        },
      },
    })
    expect(wrapper.find('h1').text()).toBe('作品发布 · 新闻')
    expect(wrapper.attributes('data-tag')).toBe('release')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/client/layouts/news-collections.test.ts`

Expected: FAIL with layout modules not found.

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- src/client/components/news/NewsTagsList.vue -->
<script setup lang="ts">
import type { NewsTagCount } from '../../../shared/types/news.js'

defineProps<{ tags: NewsTagCount[] }>()
</script>

<template>
  <ul class="syn-news-tags" data-testid="news-tags-list">
    <li v-for="tag in tags" :key="tag.key">
      <a :href="tag.publicPath" :lang="tag.titleLang">{{ tag.title }}</a>
      <span data-testid="tag-count">{{ tag.count }}</span>
    </li>
  </ul>
</template>

<style scoped>
.syn-news-tags {
  list-style: none;
  padding: 0;
  margin: 0;
}
.syn-news-tags li {
  display: flex;
  justify-content: space-between;
  border-bottom: var(--syn-border-subtle);
  padding: 0.75rem 0;
}
</style>
```

```vue
<!-- src/client/layouts/NewsIndexLayout.vue -->
<script setup lang="ts">
import type { NewsCollectionPageData } from '../../shared/types/news.js'
import NewsList from '../components/news/NewsList.vue'
import PaginationNav from '../components/PaginationNav.vue'
import ContentColumn from '../components/ContentColumn.vue'

defineProps<{
  data: NewsCollectionPageData
  emptyLabel: string
  draftLabel: string
  translationUnavailableLabel: string
  previousPageLabel: string
  nextPageLabel: string
  formatDate: (date: string) => string
}>()
</script>

<template>
  <ContentColumn>
    <header>
      <h1>{{ data.heading }}</h1>
      <p>{{ data.description }}</p>
    </header>
    <NewsList
      :items="data.items"
      :empty-label="emptyLabel"
      :draft-label="draftLabel"
      :translation-unavailable-label="translationUnavailableLabel"
      :format-date="formatDate"
    />
    <PaginationNav
      v-if="data.pagination && data.pagination.pageCount > 1"
      :prev-href="data.pagination.prevPublicPath"
      :next-href="data.pagination.nextPublicPath"
      :prev-label="previousPageLabel"
      :next-label="nextPageLabel"
    />
  </ContentColumn>
</template>
```

```vue
<!-- src/client/layouts/NewsTagsIndexLayout.vue -->
<script setup lang="ts">
import type { NewsCollectionPageData } from '../../shared/types/news.js'
import NewsTagsList from '../components/news/NewsTagsList.vue'
import ContentColumn from '../components/ContentColumn.vue'

defineProps<{ data: NewsCollectionPageData }>()
</script>

<template>
  <ContentColumn>
    <header>
      <h1>{{ data.heading }}</h1>
      <p>{{ data.description }}</p>
    </header>
    <NewsTagsList :tags="data.tags ?? []" />
  </ContentColumn>
</template>
```

```vue
<!-- src/client/layouts/NewsTagArchiveLayout.vue -->
<script setup lang="ts">
import type { NewsCollectionPageData } from '../../shared/types/news.js'
import NewsList from '../components/news/NewsList.vue'
import PaginationNav from '../components/PaginationNav.vue'
import ContentColumn from '../components/ContentColumn.vue'

defineProps<{
  data: NewsCollectionPageData
  emptyLabel: string
  draftLabel: string
  translationUnavailableLabel: string
  previousPageLabel: string
  nextPageLabel: string
  formatDate: (date: string) => string
}>()
</script>

<template>
  <div class="syn-news-tag-archive" :data-tag="data.tagKey">
    <ContentColumn>
      <header>
        <h1>{{ data.heading }}</h1>
        <p>{{ data.description }}</p>
      </header>
      <NewsList
        :items="data.items"
        :empty-label="emptyLabel"
        :draft-label="draftLabel"
        :translation-unavailable-label="translationUnavailableLabel"
        :format-date="formatDate"
      />
      <PaginationNav
        v-if="data.pagination && data.pagination.pageCount > 1"
        :prev-href="data.pagination.prevPublicPath"
        :next-href="data.pagination.nextPublicPath"
        :prev-label="previousPageLabel"
        :next-label="nextPageLabel"
      />
    </ContentColumn>
  </div>
</template>
```

Wire layouts in the Plan 05 client app resolver (exact file from Plan 05, typically `src/client/layouts/resolve-layout.ts`):

```ts
import NewsIndexLayout from './NewsIndexLayout.vue'
import NewsTagsIndexLayout from './NewsTagsIndexLayout.vue'
import NewsTagArchiveLayout from './NewsTagArchiveLayout.vue'

export function resolveNewsCollectionLayout(identity: string) {
  if (identity === 'news-tags-index') return NewsTagsIndexLayout
  if (identity === 'news-index' || identity.startsWith('news-page:')) {
    return NewsIndexLayout
  }
  if (identity.startsWith('news-tag:')) return NewsTagArchiveLayout
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/client/layouts/news-collections.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/news/NewsTagsList.vue src/client/layouts/NewsIndexLayout.vue src/client/layouts/NewsTagsIndexLayout.vue src/client/layouts/NewsTagArchiveLayout.vue src/client/layouts/resolve-layout.ts tests/client/layouts/news-collections.test.ts
git commit -m "feat(news): add index, tags index, and tag archive layouts"
```

---

### Task 8: News detail layout (760px, meta, no TOC/search)

**Files:**
- Create: `src/client/components/ArticleMeta.vue`
- Create: `src/client/layouts/NewsDetailLayout.vue`
- Create: `tests/client/layouts/news-detail.test.ts`
- Modify: `src/client/layouts/resolve-layout.ts`

**Interfaces:**
- Consumes: `NewsDetailPageData`, badges, `ContentCover`, `ContentColumn` (`max-width: var(--syn-content-width)` → 760px)
- Produces: detail layout that never mounts TOC or search components

- [ ] **Step 1: Write the failing tests**

```ts
// tests/client/layouts/news-detail.test.ts
/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NewsDetailLayout from '../../../src/client/layouts/NewsDetailLayout.vue'
import type { NewsDetailPageData } from '../../../src/shared/types/news'

const data: NewsDetailPageData = {
  kind: 'news-detail',
  slug: 'launch',
  title: '发布',
  titleLang: 'zh-CN',
  date: '2026-08-11',
  updated: '2026-08-12',
  coverPublicUrl: '/assets/n.webp',
  tags: [
    { key: 'release', title: 'Releases', publicPath: '/en/news/tags/release/' },
  ],
  isFallback: true,
  isDraft: true,
  translationUnavailableMessage:
    'This article is not yet available in English. Showing the original version.',
  bodyLang: 'zh-CN',
}

describe('NewsDetailLayout', () => {
  it('renders title, dates, tags, cover, badges, and body lang', () => {
    const wrapper = mount(NewsDetailLayout, {
      props: {
        data,
        publishedLabel: 'Published',
        updatedLabel: 'Updated',
        draftLabel: 'Draft',
        formatDate: (d: string) => `fmt:${d}`,
      },
      slots: {
        default: '<p>Main locale body</p>',
      },
      global: {
        stubs: {
          ContentColumn: {
            template: '<div data-testid="content-column" class="syn-content-column"><slot /></div>',
          },
        },
      },
    })
    expect(wrapper.find('[data-testid="content-column"]').exists()).toBe(true)
    expect(wrapper.find('h1').attributes('lang')).toBe('zh-CN')
    expect(wrapper.find('[data-testid="content-cover"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="translation-unavailable-badge"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-testid="article-body"]').attributes('lang')).toBe('zh-CN')
    expect(wrapper.find('[data-testid="updated-date"]').text()).toContain('fmt:2026-08-12')
    expect(wrapper.findComponent({ name: 'TableOfContents' }).exists()).toBe(false)
    expect(wrapper.find('[data-testid="search"]').exists()).toBe(false)
  })

  it('omits cover and updated when absent', () => {
    const wrapper = mount(NewsDetailLayout, {
      props: {
        data: {
          ...data,
          coverPublicUrl: undefined,
          updated: undefined,
          isFallback: false,
          isDraft: false,
          translationUnavailableMessage: undefined,
        },
        publishedLabel: 'Published',
        updatedLabel: 'Updated',
        draftLabel: 'Draft',
        formatDate: (d: string) => d,
      },
      global: {
        stubs: { ContentColumn: { template: '<div><slot /></div>' } },
      },
    })
    expect(wrapper.find('[data-testid="content-cover"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="updated-date"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/client/layouts/news-detail.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- src/client/components/ArticleMeta.vue -->
<script setup lang="ts">
import type { NewsTagLink } from '../../shared/types/news.js'

defineProps<{
  date: string
  updated?: string
  publishedLabel: string
  updatedLabel: string
  formatDate: (date: string) => string
  tags: NewsTagLink[]
}>()
</script>

<template>
  <div class="syn-article-meta" data-testid="article-meta">
    <p>
      <span>{{ publishedLabel }}</span>
      <time data-testid="published-date" :datetime="date">{{ formatDate(date) }}</time>
    </p>
    <p v-if="updated">
      <span>{{ updatedLabel }}</span>
      <time data-testid="updated-date" :datetime="updated">{{ formatDate(updated) }}</time>
    </p>
    <ul v-if="tags.length" class="syn-article-meta__tags">
      <li v-for="tag in tags" :key="tag.key">
        <a :href="tag.publicPath">{{ tag.title }}</a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.syn-article-meta__tags {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
```

```vue
<!-- src/client/layouts/NewsDetailLayout.vue -->
<script setup lang="ts">
import type { NewsDetailPageData } from '../../shared/types/news.js'
import ArticleMeta from '../components/ArticleMeta.vue'
import ContentColumn from '../components/ContentColumn.vue'
import ContentCover from '../components/ContentCover.vue'
import DraftBadge from '../components/DraftBadge.vue'
import TranslationUnavailableBadge from '../components/TranslationUnavailableBadge.vue'

defineProps<{
  data: NewsDetailPageData
  publishedLabel: string
  updatedLabel: string
  draftLabel: string
  formatDate: (date: string) => string
}>()
</script>

<template>
  <ContentColumn class="syn-news-detail" data-testid="news-detail">
    <DraftBadge v-if="data.isDraft" :label="draftLabel" />
    <TranslationUnavailableBadge
      v-if="data.translationUnavailableMessage"
      :label="data.translationUnavailableMessage"
    />
    <h1 :lang="data.titleLang">{{ data.title }}</h1>
    <ArticleMeta
      :date="data.date"
      :updated="data.updated"
      :published-label="publishedLabel"
      :updated-label="updatedLabel"
      :format-date="formatDate"
      :tags="data.tags"
    />
    <ContentCover
      v-if="data.coverPublicUrl"
      :src="data.coverPublicUrl"
      :alt="data.title"
      eager
    />
    <div data-testid="article-body" class="syn-article-body" :lang="data.bodyLang">
      <slot />
    </div>
  </ContentColumn>
</template>
```

Assert `ContentColumn` CSS (from Plan 05 / tokens) includes:

```css
.syn-content-column {
  max-width: var(--syn-content-width); /* 760px */
  margin-inline: auto;
}
```

Add a regression test in this task’s file or extend tokens test:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('content width token', () => {
  it('keeps syn-content-width at 760px', () => {
    const css = readFileSync(resolve('src/client/styles/tokens.css'), 'utf8')
    expect(css).toContain('--syn-content-width: 760px;')
  })
})
```

Update `resolve-layout.ts` so `contentType === 'news'` maps to `NewsDetailLayout`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/client/layouts/news-detail.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/ArticleMeta.vue src/client/layouts/NewsDetailLayout.vue src/client/layouts/resolve-layout.ts tests/client/layouts/news-detail.test.ts
git commit -m "feat(news): add 760px news detail layout without TOC or search"
```

---

### Task 9: Page detail layout (unified 760px, optional cover, no listing)

**Files:**
- Create: `src/compiler/page/attach-page-page-data.ts`
- Create: `src/client/layouts/PageDetailLayout.vue`
- Create: `tests/compiler/page/attach-page-page-data.test.ts`
- Create: `tests/client/layouts/page-detail.test.ts`
- Modify: `src/client/layouts/resolve-layout.ts`

**Interfaces:**
- Consumes: `RouteContentPackage` type `page`, `CompiledPage`, badges, `ContentCover`, `ContentColumn`
- Produces: `PageDetailPageData`; layout with no auto listing and no `layout` prop API

- [ ] **Step 1: Write the failing tests**

```ts
// tests/compiler/page/attach-page-page-data.test.ts
import { describe, expect, it } from 'vitest'
import { attachPagePageData } from '../../../src/compiler/page/attach-page-page-data'
import { newsTheme } from '../../helpers/news-fixtures'
import type { RouteContentPackage } from '../../../src/shared/types'
import type { CompiledPage } from '../../../src/shared/route-types'

describe('attachPagePageData', () => {
  it('builds page detail data with optional cover and fallback message', () => {
    const pkg: RouteContentPackage = {
      dir: '/content/pages/team',
      identity: 'page:team',
      type: 'page',
      slug: 'team',
      draft: false,
      tags: [],
      cover: './assets/team.webp',
      locales: {
        zh: {
          filePath: 'zh.md',
          title: '团队',
          draft: false,
          body: '介绍',
        },
      },
    }
    const page: CompiledPage = {
      identity: 'page:team',
      locale: 'en',
      contentType: 'page',
      url: {
        routePath: '/en/team/',
        outputPath: 'en/team/index.html',
        publicPath: '/en/team/',
        absoluteUrl: 'https://synctrol.com/en/team/',
      },
      isFallback: true,
      isDraft: false,
      noindex: true,
      bodyLocale: 'zh',
      canonicalLocale: 'zh',
      packagePath: pkg.dir,
      slug: 'team',
      title: '团队',
    }
    const map = attachPagePageData({
      pages: [page],
      packages: [pkg],
      options: newsTheme(),
      resolveCoverUrl: () => '/assets/team.hash.webp',
    })
    expect(map.get('/en/team/')).toEqual({
      kind: 'page-detail',
      slug: 'team',
      title: '团队',
      titleLang: 'zh-CN',
      coverPublicUrl: '/assets/team.hash.webp',
      isFallback: true,
      isDraft: false,
      translationUnavailableMessage:
        'This article is not yet available in English. Showing the original version.',
      bodyLang: 'zh-CN',
    })
  })

  it('omits cover when not configured', () => {
    const pkg: RouteContentPackage = {
      dir: '/content/pages/about',
      identity: 'page:about',
      type: 'page',
      slug: 'about',
      draft: false,
      tags: [],
      locales: {
        zh: { filePath: 'zh.md', title: '关于', draft: false, body: 'x' },
      },
    }
    const page: CompiledPage = {
      identity: 'page:about',
      locale: 'zh',
      contentType: 'page',
      url: {
        routePath: '/zh/about/',
        outputPath: 'zh/about/index.html',
        publicPath: '/zh/about/',
        absoluteUrl: 'https://synctrol.com/zh/about/',
      },
      isFallback: false,
      isDraft: false,
      noindex: false,
      bodyLocale: 'zh',
      canonicalLocale: 'zh',
      slug: 'about',
      title: '关于',
    }
    const map = attachPagePageData({
      pages: [page],
      packages: [pkg],
      options: newsTheme(),
      resolveCoverUrl: () => {
        throw new Error('should not resolve')
      },
    })
    expect(map.get('/zh/about/')).toMatchObject({
      coverPublicUrl: undefined,
      translationUnavailableMessage: undefined,
    })
  })
})
```

```ts
// tests/client/layouts/page-detail.test.ts
/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PageDetailLayout from '../../../src/client/layouts/PageDetailLayout.vue'
import type { PageDetailPageData } from '../../../src/shared/types/news'

describe('PageDetailLayout', () => {
  it('renders unified 760px column with optional cover and no listing', () => {
    const data: PageDetailPageData = {
      kind: 'page-detail',
      slug: 'team',
      title: 'Team',
      titleLang: 'en-US',
      coverPublicUrl: '/c.webp',
      isFallback: false,
      isDraft: false,
      bodyLang: 'en-US',
    }
    const wrapper = mount(PageDetailLayout, {
      props: { data, draftLabel: 'Draft' },
      slots: { default: '<p>Member bios via markdown</p>' },
      global: {
        stubs: {
          ContentColumn: {
            template:
              '<div data-testid="content-column" class="syn-content-column"><slot /></div>',
          },
        },
      },
    })
    expect(wrapper.find('[data-testid="content-column"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="content-cover"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="page-listing"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="search"]').exists()).toBe(false)
    // no layout selector prop surface
    expect((wrapper.props() as { layout?: unknown }).layout).toBeUndefined()
  })

  it('shows draft and translation badges when flagged', () => {
    const data: PageDetailPageData = {
      kind: 'page-detail',
      slug: 'team',
      title: '团队',
      titleLang: 'zh-CN',
      isFallback: true,
      isDraft: true,
      translationUnavailableMessage: 'Unavailable',
      bodyLang: 'zh-CN',
    }
    const wrapper = mount(PageDetailLayout, {
      props: { data, draftLabel: 'Draft' },
      global: {
        stubs: { ContentColumn: { template: '<div><slot /></div>' } },
      },
    })
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="translation-unavailable-badge"]').exists()).toBe(
      true,
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/page/attach-page-page-data.test.ts tests/client/layouts/page-detail.test.ts`

Expected: FAIL with modules not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/page/attach-page-page-data.ts
import type { RouteContentPackage, SynctrolThemeOptions } from '../../shared/types.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { PageDetailPageData } from '../../shared/types/news.js'

export interface AttachPagePageDataInput {
  pages: CompiledPage[]
  packages: RouteContentPackage[]
  options: SynctrolThemeOptions
  resolveCoverUrl: (pkg: RouteContentPackage, relativePath: string) => string
}

export function attachPagePageData(
  input: AttachPagePageDataInput,
): Map<string, PageDetailPageData> {
  const { pages, packages, options, resolveCoverUrl } = input
  const out = new Map<string, PageDetailPageData>()

  for (const page of pages) {
    if (page.contentType !== 'page') continue
    const pkg = packages.find(
      (p) => p.type === 'page' && `page:${p.slug}` === page.identity,
    )
    if (!pkg || !pkg.slug) continue
    const bodyMd = pkg.locales[page.bodyLocale]
    if (!bodyMd) {
      throw new Error(`Missing body for page ${pkg.dir}`)
    }
    out.set(page.url.routePath, {
      kind: 'page-detail',
      slug: pkg.slug,
      title: bodyMd.title,
      titleLang: options.locales[page.bodyLocale]!.lang,
      coverPublicUrl: pkg.cover ? resolveCoverUrl(pkg, pkg.cover) : undefined,
      isFallback: page.isFallback,
      isDraft: page.isDraft,
      translationUnavailableMessage: page.isFallback
        ? options.locales[page.locale]!.messages.translationUnavailable
        : undefined,
      bodyLang: options.locales[page.bodyLocale]!.lang,
    })
  }

  return out
}
```

```vue
<!-- src/client/layouts/PageDetailLayout.vue -->
<script setup lang="ts">
import type { PageDetailPageData } from '../../shared/types/news.js'
import ContentColumn from '../components/ContentColumn.vue'
import ContentCover from '../components/ContentCover.vue'
import DraftBadge from '../components/DraftBadge.vue'
import TranslationUnavailableBadge from '../components/TranslationUnavailableBadge.vue'

defineProps<{
  data: PageDetailPageData
  draftLabel: string
}>()
</script>

<template>
  <ContentColumn class="syn-page-detail" data-testid="page-detail">
    <DraftBadge v-if="data.isDraft" :label="draftLabel" />
    <TranslationUnavailableBadge
      v-if="data.translationUnavailableMessage"
      :label="data.translationUnavailableMessage"
    />
    <h1 :lang="data.titleLang">{{ data.title }}</h1>
    <ContentCover
      v-if="data.coverPublicUrl"
      :src="data.coverPublicUrl"
      :alt="data.title"
      eager
    />
    <div data-testid="article-body" class="syn-article-body" :lang="data.bodyLang">
      <slot />
    </div>
  </ContentColumn>
</template>
```

Map `contentType === 'page'` → `PageDetailLayout` in `resolve-layout.ts`. Do not add any Page index route, Page collection compiler, or `layout` frontmatter/manifest field.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/page/attach-page-page-data.test.ts tests/client/layouts/page-detail.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/page/attach-page-page-data.ts src/client/layouts/PageDetailLayout.vue src/client/layouts/resolve-layout.ts tests/compiler/page/attach-page-page-data.test.ts tests/client/layouts/page-detail.test.ts
git commit -m "feat(page): add unified 760px page detail without auto listing"
```

---

### Task 10: Home `home-logo` and `home-footer` markdown formatters

**Files:**
- Create: `src/compiler/markdown/home-formatters.ts`
- Create: `src/compiler/markdown/assert-home-formatters.ts`
- Create: `src/client/components/home/HomeLogoSlot.vue`
- Create: `src/client/components/home/HomeFooterSlot.vue`
- Create: `tests/compiler/markdown/home-formatters.test.ts`
- Create: `tests/client/components/home-formatters.test.ts`
- Modify: theme markdown setup from Plan 01/05 to call `registerHomeFormatters(md)`
- Modify: Home layout / shell Footer slot to render formatter outputs

**Interfaces:**
- Consumes: markdown-it, Plan 05 Footer region
- Produces: `registerHomeFormatters(md)`, `assertHomeHasLogo(markdownSource, packagePath)`, Vue slots for logo/footer HTML

Rules from spec §20.2:
- `home-logo` is required
- `home-footer` is optional; when absent, Footer renders empty
- Formatters use `::: home-logo` / `::: home-footer` container syntax
- Home frontmatter title remains SEO-only and is not rendered as the logo

- [ ] **Step 1: Write the failing tests**

```ts
// tests/compiler/markdown/home-formatters.test.ts
import MarkdownIt from 'markdown-it'
import { describe, expect, it } from 'vitest'
import {
  assertHomeHasLogo,
  registerHomeFormatters,
} from '../../../src/compiler/markdown/home-formatters'

describe('home formatters', () => {
  it('renders home-logo and home-footer containers as marked blocks', () => {
    const md = new MarkdownIt()
    registerHomeFormatters(md)
    const html = md.render(`::: home-logo
# SYNCTROL

WE SHAPE WAVE
:::

::: home-footer
Contact
:::
`)
    expect(html).toContain('data-syn-formatter="home-logo"')
    expect(html).toContain('SYNCTROL')
    expect(html).toContain('data-syn-formatter="home-footer"')
    expect(html).toContain('Contact')
  })

  it('assertHomeHasLogo passes when logo container exists', () => {
    expect(() =>
      assertHomeHasLogo(
        '::: home-logo\n# SYNCTROL\n:::\n',
        'content/home',
      ),
    ).not.toThrow()
  })

  it('assertHomeHasLogo throws when logo container is missing', () => {
    expect(() => assertHomeHasLogo('Just text', 'content/home')).toThrow(
      /home-logo/,
    )
  })
})
```

```ts
// tests/client/components/home-formatters.test.ts
/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeLogoSlot from '../../../src/client/components/home/HomeLogoSlot.vue'
import HomeFooterSlot from '../../../src/client/components/home/HomeFooterSlot.vue'

describe('Home formatter slots', () => {
  it('HomeLogoSlot renders provided logo html and is not the SEO title', () => {
    const wrapper = mount(HomeLogoSlot, {
      props: {
        html: '<div data-syn-formatter="home-logo"><h1>SYNCTROL</h1></div>',
        seoTitle: 'Synctrol Home SEO',
      },
    })
    expect(wrapper.find('[data-testid="home-logo"]').html()).toContain('SYNCTROL')
    expect(wrapper.text()).not.toContain('Synctrol Home SEO')
  })

  it('HomeFooterSlot renders empty when html is absent', () => {
    const empty = mount(HomeFooterSlot, { props: { html: undefined } })
    expect(empty.find('[data-testid="home-footer"]').text()).toBe('')
    const filled = mount(HomeFooterSlot, {
      props: { html: '<p>Footer note</p>' },
    })
    expect(filled.text()).toContain('Footer note')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/markdown/home-formatters.test.ts tests/client/components/home-formatters.test.ts`

Expected: FAIL with modules not found. If `markdown-it` is not a dependency yet, add it as a `devDependency`/`dependency` matching VuePress’s markdown-it major before re-running.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compiler/markdown/home-formatters.ts
import type MarkdownIt from 'markdown-it'
import container from 'markdown-it-container'

export function registerHomeFormatters(md: MarkdownIt): void {
  for (const name of ['home-logo', 'home-footer'] as const) {
    md.use(container, name, {
      render(tokens: { info: string; nesting: number }[], idx: number) {
        if (tokens[idx]!.nesting === 1) {
          return `<div class="syn-formatter syn-formatter--${name}" data-syn-formatter="${name}">\n`
        }
        return '</div>\n'
      },
    })
  }
}

export function assertHomeHasLogo(markdownSource: string, packagePath: string): void {
  if (!/(^|\n):::\s*home-logo\s*(\n|$)/.test(markdownSource)) {
    throw new Error(
      `Home package ${packagePath} must include a ::: home-logo formatter block`,
    )
  }
}

// re-export assert under dedicated path for discoverability
export { assertHomeHasLogo as assertHomeFormatters }
```

```ts
// src/compiler/markdown/assert-home-formatters.ts
export { assertHomeHasLogo } from './home-formatters.js'
```

```vue
<!-- src/client/components/home/HomeLogoSlot.vue -->
<script setup lang="ts">
defineProps<{
  html: string
  /** SEO-only frontmatter title; must not be rendered as the logo. */
  seoTitle: string
}>()
</script>

<template>
  <div
    data-testid="home-logo"
    class="syn-home-logo"
    v-html="html"
  />
</template>

<style scoped>
.syn-home-logo {
  font-family: 'Archivo Black', sans-serif;
}
</style>
```

```vue
<!-- src/client/components/home/HomeFooterSlot.vue -->
<script setup lang="ts">
defineProps<{ html?: string }>()
</script>

<template>
  <div data-testid="home-footer" class="syn-home-footer">
    <div v-if="html" v-html="html" />
  </div>
</template>
```

During Home package compile (hook beside Plan 02/03 Home availability), call `assertHomeHasLogo(mainLocaleMarkdownSource, packagePath)` for every locale Markdown that is published or used as fallback body.

In the Home layout (Plan 05 immersive Home Main), render:

```vue
<HomeLogoSlot :html="homeLogoHtml" :seo-title="frontmatterTitle" />
```

In `SynctrolShell` Footer slot for Home routes only:

```vue
<HomeFooterSlot :html="homeFooterHtml" />
```

Non-Home routes keep Footer empty (Plan 05 contract). Extract `homeLogoHtml` / `homeFooterHtml` by selecting nodes with `data-syn-formatter` from the rendered Markdown HTML in the Home page data attach step:

```ts
// src/compiler/home/extract-home-formatter-html.ts
export function extractHomeFormatterHtml(renderedHtml: string): {
  logoHtml: string
  footerHtml?: string
} {
  const logoMatch = renderedHtml.match(
    /<div class="syn-formatter syn-formatter--home-logo" data-syn-formatter="home-logo">([\s\S]*?)<\/div>/,
  )
  if (!logoMatch) {
    throw new Error('Rendered Home HTML missing home-logo formatter')
  }
  const footerMatch = renderedHtml.match(
    /<div class="syn-formatter syn-formatter--home-footer" data-syn-formatter="home-footer">([\s\S]*?)<\/div>/,
  )
  return {
    logoHtml: logoMatch[0],
    footerHtml: footerMatch?.[0],
  }
}
```

Add unit coverage inside the same markdown test file:

```ts
import { extractHomeFormatterHtml } from '../../../src/compiler/home/extract-home-formatter-html'

it('extracts logo and optional footer html', () => {
  const md = new MarkdownIt()
  registerHomeFormatters(md)
  const html = md.render('::: home-logo\n# SYNCTROL\n:::\n')
  const extracted = extractHomeFormatterHtml(html)
  expect(extracted.logoHtml).toContain('SYNCTROL')
  expect(extracted.footerHtml).toBeUndefined()
})
```

Create `src/compiler/home/extract-home-formatter-html.ts` with the function above when implementing this step.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/markdown/home-formatters.test.ts tests/client/components/home-formatters.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/markdown/home-formatters.ts src/compiler/markdown/assert-home-formatters.ts src/compiler/home/extract-home-formatter-html.ts src/client/components/home/HomeLogoSlot.vue src/client/components/home/HomeFooterSlot.vue tests/compiler/markdown/home-formatters.test.ts tests/client/components/home-formatters.test.ts
git commit -m "feat(home): add home-logo and home-footer markdown formatters"
```

---

### Task 11: urlSegment / enabled-flag client wiring and integration fixtures

**Files:**
- Create: `tests/integration/news-page-fixtures.test.ts`
- Create: `tests/fixtures/news-page-site/` (minimal content tree)
- Modify: `src/compiler/compile-site-routes.ts` orchestration (or theme data plugin) to call `attachNewsPageData` / `attachPagePageData` and expose results on page data

**Interfaces:**
- Consumes: Plan 03 `compileSiteRoutes`, Plan 02 compile content, Tasks 2–4 & 9 attachers
- Produces: end-to-end assertions for default and custom segments, enabled flags, fallback list presence, draft badges metadata, Page isolation

Fixture tree:

```text
tests/fixtures/news-page-site/
├── .vuepress/config.ts
└── content/
    ├── definitions.yml
    ├── home/
    │   ├── content.yml
    │   ├── zh.md          # contains ::: home-logo
    │   └── en.md
    ├── news/
    │   ├── alpha/
    │   │   ├── content.yml  # date, tags, cover
    │   │   ├── zh.md
    │   │   └── en.md
    │   └── beta/
    │       ├── content.yml  # date, tags, no cover; zh only
    │       └── zh.md
    └── pages/
        └── team/
            ├── content.yml  # type: page, optional cover
            ├── zh.md
            └── en.md
```

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/integration/news-page-fixtures.test.ts
import { describe, expect, it } from 'vitest'
import { compileContent } from '../../src/compiler/compile-content'
import { compileSiteRoutes } from '../../src/compiler/compile-site-routes'
import { attachNewsPageData } from '../../src/compiler/news/attach-news-page-data'
import { attachPagePageData } from '../../src/compiler/page/attach-page-page-data'
import { resolve } from 'node:path'
import { newsTheme } from '../helpers/news-fixtures'

const fixtureRoot = resolve('tests/fixtures/news-page-site')

describe('news + page fixtures', () => {
  it('emits default news/tags segments, list covers, fallback items, and page details', async () => {
    const options = newsTheme({
      siteUrl: 'https://synctrol.com',
      mainLocale: 'zh',
      seo: {
        name: { zh: 'Synctrol', en: 'Synctrol' },
        description: { zh: 'd', en: 'd' },
        defaultImage: './assets/social-default.webp',
        organization: { name: 'Synctrol', logo: './assets/logo.svg' },
        collections: {
          release: { title: '作品', description: 'r' },
          news: {
            title: { zh: '新闻', en: 'News' },
            description: { zh: 'Synctrol 新闻', en: 'Synctrol news' },
          },
        },
      },
    })
    const compiled = await compileContent({
      sourceDir: resolve(fixtureRoot),
      options,
    })
    const site = compileSiteRoutes({
      packages: compiled.packages,
      options,
      base: '/',
      localeKeys: ['zh', 'en'],
    })

    const paths = site.pages.map((p) => p.url.routePath)
    expect(paths).toContain('/zh/news/')
    expect(paths).toContain('/zh/news/tags/')
    expect(paths).toContain('/zh/news/tags/release/')
    expect(paths).toContain('/zh/news/alpha/')
    expect(paths).toContain('/en/news/beta/') // fallback detail
    expect(paths).toContain('/zh/team/')
    expect(paths).not.toContain('/zh/pages/') // no auto page listing

    const newsData = attachNewsPageData({
      pages: site.pages,
      packages: compiled.packages,
      options,
      definitions: compiled.definitions,
      resolveCoverUrl: (pkg, rel) => `/assets/content/news/${pkg.slug}/${rel}`,
    })
    const zhIndex = newsData.get('/zh/news/')
    expect(zhIndex && 'items' in zhIndex && zhIndex.items.length).toBeGreaterThan(0)
    const enIndex = newsData.get('/en/news/')
    const beta = enIndex && 'items' in enIndex
      ? enIndex.items.find((i) => i.slug === 'beta')
      : undefined
    expect(beta).toMatchObject({
      isFallback: true,
      excludeFromRss: true,
      titleLang: 'zh-CN',
    })
    const alphaZh = zhIndex && 'items' in zhIndex
      ? zhIndex.items.find((i) => i.slug === 'alpha')
      : undefined
    expect(alphaZh?.coverPublicUrl).toBeTruthy()
    const betaZh = zhIndex && 'items' in zhIndex
      ? zhIndex.items.find((i) => i.slug === 'beta')
      : undefined
    expect(betaZh?.coverPublicUrl).toBeUndefined()

    const tagsIndex = newsData.get('/zh/news/tags/')
    expect(tagsIndex).toMatchObject({ kind: 'news-tags-index', pagination: null })

    const pagesData = attachPagePageData({
      pages: site.pages,
      packages: compiled.packages,
      options,
      resolveCoverUrl: () => '/assets/team.webp',
    })
    expect(pagesData.get('/zh/team/')?.kind).toBe('page-detail')
  })

  it('honors custom urlSegments and enabled flags', async () => {
    const options = newsTheme({
      siteUrl: 'https://synctrol.com',
      news: {
        urlSegment: 'journal',
        index: { enabled: false, pagination: 12 },
        tags: { urlSegment: 'topics', index: { enabled: false } },
      },
    })
    const compiled = await compileContent({
      sourceDir: resolve(fixtureRoot),
      options,
    })
    const site = compileSiteRoutes({
      packages: compiled.packages,
      options,
      base: '/',
      localeKeys: ['zh'],
    })
    const paths = site.pages.map((p) => p.url.routePath)
    expect(paths).not.toContain('/zh/journal/')
    expect(paths).not.toContain('/zh/journal/topics/')
    expect(paths).toContain('/zh/journal/alpha/')
    expect(paths).toContain('/zh/journal/topics/release/')
  })
})
```

Create the fixture files with the YAML/Markdown described above (alpha with cover+both locales, beta zh-only no cover, team page, home with `home-logo`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/integration/news-page-fixtures.test.ts`

Expected: FAIL until fixtures exist and attach wiring matches (or FAIL on missing fixture files).

- [ ] **Step 3: Add fixtures and wire page data into the theme data plugin**

Minimal `content/definitions.yml`:

```yaml
tags:
  release:
    title:
      zh: 作品发布
      en: Releases
platforms: {}
```

`content/news/alpha/content.yml`:

```yaml
type: news
slug: alpha
date: 2026-08-11
updated: 2026-08-12
cover: ./assets/alpha-cover.webp
tags:
  - release
```

`content/news/beta/content.yml`:

```yaml
type: news
slug: beta
date: 2026-08-10
tags:
  - release
```

`content/pages/team/content.yml`:

```yaml
type: page
slug: team
cover: ./assets/team.webp
```

`content/home/content.yml`:

```yaml
type: home
draft: false
```

`content/home/zh.md`:

```md
---
title: Synctrol
description: Synctrol 音乐团队官方网站
---

::: home-logo
# SYNCTROL

WE SHAPE WAVE  
AND DESCRIBE SOUND
:::
```

Provide a 1×1 webp placeholder at `content/news/alpha/assets/alpha-cover.webp` and `content/pages/team/assets/team.webp` (or point `resolveCoverUrl` in the test at stable fake URLs without requiring real binaries when the Plan 04 pipeline is stubbed).

In the theme Node plugin that already receives `CompiledSite`, merge:

```ts
const newsPageData = attachNewsPageData({ ... })
const pagePageData = attachPagePageData({ ... })
for (const page of site.pages) {
  const data = newsPageData.get(page.url.routePath) ?? pagePageData.get(page.url.routePath)
  if (data) {
    pageDataByRoute.set(page.url.routePath, data)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/integration/news-page-fixtures.test.ts`

Expected: PASS

Also run the full News/Page suite:

```bash
npm test -- tests/shared/format-message.test.ts tests/shared/news-types.test.ts tests/compiler/news tests/compiler/page tests/compiler/markdown/home-formatters.test.ts tests/client/components/badges.test.ts tests/client/components/news-list.test.ts tests/client/components/home-formatters.test.ts tests/client/layouts tests/integration/news-page-fixtures.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/news-page-site tests/integration/news-page-fixtures.test.ts src/compiler/news src/compiler/page src/client
git commit -m "test(news): add news and page integration fixtures for segments and fallbacks"
```

---

## Self-Review

### Spec coverage (§25 News, §26 Page, related)

| Spec requirement | Task |
| --- | --- |
| News manifest `date` / `updated` / `cover` / `tags` consumed in models | Tasks 2, 4 (validation already Plan 02) |
| Index shows cover, title, description, date, tags; text-only without cover | Tasks 2, 6 |
| `news.index.enabled` / pagination; tag archives share pagination | Tasks 4, 7, 11 (routes Plan 03) |
| Tags index enabled flag; archives still generate | Task 11 |
| News Tags Index: declared tags + counts, unpaginated | Tasks 3, 7 |
| `urlSegment` news/tags (defaults + custom) | Tasks 2, 3, 11 |
| Fallback list: main title/description + `lang` + translation-unavailable badge; `excludeFromRss` | Tasks 2, 5, 6 |
| News detail 760px; title/date/updated/tags/cover/markdown; no TOC/search | Task 8 |
| Page unified 760px; optional cover; no layout field; no auto listing | Task 9 |
| Home `home-logo` required / `home-footer` optional → Footer | Task 10 |
| Draft badges on list + detail | Tasks 5, 6, 8, 9 |
| Sort date desc then slug | Task 2 |

### Placeholder scan

No TBD/TODO/`implement later`/`similar to Task N` left in steps. Every code step includes concrete TypeScript/Vue.

### Type consistency

- `NewsListItem.excludeFromRss` is set in Task 2 and documented for Plan 10 RSS filtering
- `NewsCollectionPageData.kind` discriminates index / tag / tags-index across Tasks 4 and 7
- `attachNewsPageData` / `attachPagePageData` key by `routePath` matching Plan 03 `UrlLayers.routePath`
- Badge `data-testid` values are shared by list and detail layouts
- Home formatter `data-syn-formatter` attributes match extract + slot rendering

### Intentionally deferred

- RSS/Sitemap emission and `excludeFromRss` enforcement → Plan 10
- JSON-LD `Article` for News → Plan 10
- Background module selection for `news` / `page` → Plan 06 (already type-keyed)
- Release-specific UI → Plan 08
