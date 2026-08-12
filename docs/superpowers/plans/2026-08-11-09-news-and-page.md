# News and Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Revision Notes (executable against Plans 01-08 @ HEAD `cursor/synctrol-theme-design-ee11`)

Revised after Plan 09 preflight against HEAD on branch `cursor/synctrol-theme-design-ee11`. Binding decisions (do not re-litigate):

1. **Frontmatter bridge follows Release.**
   - Add typed `SynctrolNewsFrontmatter`, `SynctrolPageFrontmatter`, and `SynctrolHomeFrontmatter` under shared types.
   - Stamp runtime data in `src/compiler/theme.ts` as `frontmatter.synctrol.news`, `frontmatter.synctrol.page`, and `frontmatter.synctrol.home`.
   - Do not introduce `pageDataByRoute` or a theme data store.

2. **Patch single `Layout.vue`.**
   - HEAD registers only `Layout` from `src/client/config.ts`.
   - Do **not** create `src/client/layouts/resolve-layout.ts` or any layout registry.
   - In `src/client/layouts/Layout.vue`, keep Release handling first, then switch on `synctrol.news`, `synctrol.page`, and `synctrol.home`, and keep the final `<Content v-else />` fallback.

3. **Shared column and pagination are Plan 09 work.**
   - Create `src/client/components/ContentColumn.vue`.
   - Create `src/client/components/PaginationNav.vue`.
   - `PaginationNav` mirrors the existing `ReleaseIndex.vue` pagination UX and accessibility (`<nav aria-label="Pagination">`, previous/next links).

4. **Use current module names and route helpers.**
   - `ContentIdentity` comes from `src/shared/route-types.ts`.
   - Theme option types come from `src/shared/options.ts`.
   - Definitions are `ContentDefinitions` from `src/shared/types.ts`, not `DefinitionsFile`.
   - Use `encodeRouteSegment` from `src/compiler/path-suffix.ts`, `buildUrlLayers` from `src/compiler/url-layers.ts`, and prefer `CompiledPage.url.publicPath` for browser links.

5. **Base-aware links are mandatory.**
   - News detail links must come from matching detail `CompiledPage.url.publicPath`.
   - Pagination links must come from sibling collection `CompiledPage.url.publicPath`.
   - Tag links must come from matching tag archive `CompiledPage.url.publicPath` whenever that page exists; only construct fallback public paths with `buildUrlLayers` and the current `base`.

6. **Home formatters bind to the actual VuePress hook.**
   - `src/compiler/theme.ts` adds `extendsMarkdown: (md, app) => { registerHomeFormatters(md) }`.
   - Home logo assertion runs during locale Markdown parsing for Home content.
   - Rendered formatter HTML is stored under `frontmatter.synctrol.home.logoHtml` and `frontmatter.synctrol.home.footerHtml`.

7. **Existing files are extended or reused.**
   - `src/shared/format-message.ts` already exists; Task 1 verifies its `{string | number}` behavior and only extends exports/types.
   - `src/client/components/DraftBadge.vue` already exists; Task 5 extends styling/contract in place.
   - Leave `src/index.ts` exporting `formatMessage` through `src/platforms/format-message.ts` unless a test proves it must change.

8. **Compiler integration tests use HEAD signatures.**
   - `compileContent({ contentRoot, sourceDir, configDir, mainLocale, platformTypes? })`.
   - `buildRoutePackages({ packages, localeKeys })` from `src/compiler/route-packages.ts`.
   - `compileSiteRoutes({ packages, options, base, declaredTags })`.
   - Prefer existing helpers from `tests/helpers/route-fixtures.ts`.

9. **Calendar date formatting is a small shared helper.**
   - Create `src/shared/format-calendar-date.ts`.
   - Use it consistently from News collection/detail and Page/News tests via injected `formatDate`.

10. **Markdown dependencies are direct when imported.**
    - Task 10 adds `markdown-it`, `markdown-it-container`, `@types/markdown-it`, and `@types/markdown-it-container` directly if they are not already direct dependencies.

11. **Shell footer target is `ShellLayout`.**
    - Home footer formatter output is passed through `<ShellLayout><template #footer>...</template></ShellLayout>`.
    - There is no `SynctrolShell.vue` target at HEAD.

12. **Preserve Plans 03-08 contracts.**
    - NodeNext `.js` suffixes on all relative imports under `src/**`.
    - Vitest `projects` stay unchanged.
    - Only `src/compiler/theme.ts` imports `vuepress/*`.
    - `theme.ts` patches are additive and preserve `contentAssets`, `release`, `platformDefinitions`, backgrounds Vite plugin, CSP generation, root router writing, and asset compilation.

**Goal:** Render News indexes, News tag indexes/archives, News detail articles, general Pages, and Home formatter slots through the existing Synctrol shell with base-aware links, localized fallback/draft badges, 760px content columns, and Release-style `frontmatter.synctrol` data.

**Architecture:** Compiler helpers assemble News/Page/Home frontmatter models from Plan 03 routes, Plan 02 packages, Plan 04 asset manifests, and resolved theme options. `src/compiler/theme.ts` injects those models into nested frontmatter while preserving Plans 03-08 data. The single client `Layout.vue` chooses Release, News, Page, Home, or default `<Content />` rendering without a registry.

**Tech Stack:** TypeScript (NodeNext), Vitest `projects` from HEAD, Vue 3 SFCs, `@vue/test-utils`, happy-dom, VuePress 2 `extendsMarkdown`, markdown-it containers, package `vuepress-theme-synctrolling`.

## Global Constraints

- Package name: `vuepress-theme-synctrolling`
- Content types remain only `home | release | news | page`; generated collection routes remain `release-collection` / `news-collection`
- No per-page `layout` field and no Page automatic listing
- News uses `date` (required), optional `updated`, required `tags` (may be empty), optional `cover`
- `updated` cannot precede `date`; dates are `YYYY-MM-DD` calendar dates and must render without timezone off-by-one conversion
- Default `news.urlSegment` is `news`; default `news.tags.urlSegment` is `tags`; both are scalar strings shared by every locale
- `news.index.pagination` defaults to `12`, accepts a positive integer or `false`; tag archives reuse the same pagination setting
- `news.index.enabled: false` suppresses News Index and its pagination only; News details and tag archives still generate
- `news.tags.index.enabled: false` suppresses only the News Tags Index; individual tag archives still generate when they have visible items
- News Tags Index lists declared tags with visible article counts and is never paginated
- News sorts by date descending, then slug for stability; route compiler already emits collection slices in that order
- Fallback list items keep target-locale URL/shell, use body-locale title/description with body-locale `lang`, show translation-unavailable badge, set `excludeFromRss: true`
- Draft list/detail surfaces show localized draft badges when `showDrafts` made them visible; drafts set `excludeFromRss: true`
- News detail and Page Main body max width is `760px`; no search UI and no table of contents
- Page has optional `cover` only; no list/index route
- Brand tokens fixed: black/white, `3px` strong border, `0` radius, Archivo Black display, `--syn-content-width: 760px`
- Browser links in models use `CompiledPage.url.publicPath` whenever possible and are VuePress `base` aware
- Tests run with `npm test -- <path>`
- Plans 01-08 are assumed complete at HEAD: shared types/options, content compiler, locale routes/collections, assets, shell, backgrounds, platforms, CSP, root router, and Release frontmatter bridge
- All later tasks inherit these constraints and the Revision Notes

## File Structure

| File | Responsibility |
| --- | --- |
| `src/shared/types/news.ts` | News/Page/Home view-model and frontmatter types |
| `src/shared/format-message.ts` | **Existing:** verify/extend named placeholder interpolation |
| `src/shared/format-calendar-date.ts` | Shared UTC-safe `YYYY-MM-DD` calendar formatter |
| `src/compiler/news/build-news-list-items.ts` | Build per-locale News list items from route packages + detail pages; base-aware detail/tag links |
| `src/compiler/news/build-news-tags-index.ts` | Declared tag counts for News Tags Index; tag links from archive pages when present |
| `src/compiler/news/attach-news-page-data.ts` | Build `SynctrolNewsFrontmatter` for News collection/detail pages |
| `src/compiler/page/attach-page-page-data.ts` | Build `SynctrolPageFrontmatter` for Page detail pages |
| `src/compiler/markdown/home-formatters.ts` | Register `home-logo` / `home-footer` markdown-it containers and assert Home logo |
| `src/compiler/home/extract-home-formatter-html.ts` | Render/extract Home formatter HTML for frontmatter |
| `src/compiler/home/build-home-frontmatter.ts` | Build `SynctrolHomeFrontmatter` for Home pages |
| `src/compiler/locale-markdown.ts` | **Modify:** assert `home-logo` while parsing Home locale Markdown |
| `src/compiler/theme.ts` | **Modify:** `extendsMarkdown`; inject `synctrol.news/page/home` additively |
| `src/client/components/DraftBadge.vue` | **Existing:** extend presentational draft badge |
| `src/client/components/TranslationUnavailableBadge.vue` | Translation-unavailable status badge |
| `src/client/components/ContentColumn.vue` | 760px shared content column using `--syn-content-width` |
| `src/client/components/PaginationNav.vue` | Shared previous/next pagination nav mirroring ReleaseIndex UX/a11y |
| `src/client/components/ContentCover.vue` | Optional cover image component for News/Page |
| `src/client/components/ArticleMeta.vue` | Published/updated dates and tag links for News detail |
| `src/client/components/news/NewsListItem.vue` | Cover/text-only News list row with fallback/draft badges |
| `src/client/components/news/NewsList.vue` | News list and empty state |
| `src/client/components/news/NewsTagsList.vue` | Unpaginated tag-count list |
| `src/client/components/home/HomeLogoSlot.vue` | Render `frontmatter.synctrol.home.logoHtml` in Home main |
| `src/client/components/home/HomeFooterSlot.vue` | Render `frontmatter.synctrol.home.footerHtml` in `ShellLayout` footer slot |
| `src/client/layouts/NewsIndexLayout.vue` | News index collection layout |
| `src/client/layouts/NewsTagsIndexLayout.vue` | News tags index layout |
| `src/client/layouts/NewsTagArchiveLayout.vue` | News tag archive layout |
| `src/client/layouts/NewsDetailLayout.vue` | News detail layout wrapping `<Content />` body |
| `src/client/layouts/PageDetailLayout.vue` | Page detail layout wrapping `<Content />` body |
| `src/client/layouts/Layout.vue` | **Modify:** single switch after Release handling; pass `ShellLayout` footer slot |
| `tests/helpers/news-fixtures.ts` | News/Page fixtures reusing `tests/helpers/route-fixtures.ts` |
| `tests/shared/*.test.ts` | Format message, calendar date, News type tests |
| `tests/compiler/news/*.test.ts` | News list/tag/frontmatter builder tests |
| `tests/compiler/page/*.test.ts` | Page frontmatter builder tests |
| `tests/compiler/markdown/*.test.ts` | Home formatter registration/assert/extraction tests |
| `tests/client/components/*.test.ts` | Shared client primitive and News component tests |
| `tests/client/layouts/*.test.ts` | News/Page/Home layout composition tests |
| `tests/compiler/theme.integration.test.ts` | **Extend:** frontmatter injection smoke for News/Page/Home |
| `tests/integration/news-page-fixtures.test.ts` | End-to-end route + model assertions with HEAD compiler signatures |
| `package.json` / `package-lock.json` | **Modify in Task 10 only if needed:** direct markdown dependencies |

**Out of scope:** RSS/Sitemap/JSON-LD/OG emission (Plan 10), npm publishing (Plan 11), Release UI changes (Plan 08 complete), shell redesign, layout registry, search, table of contents.

**Prerequisite interfaces (import; do not redeclare):**

```ts
// src/shared/options.ts
export interface NewsOptions {
  urlSegment: string
  index: { enabled: boolean; pagination: number | false }
  tags: { urlSegment: string; index: { enabled: boolean } }
}
export interface ResolvedSynctrolThemeOptions {
  mainLocale: string
  locales: Record<string, { lang: string; label: string; dateFormat: Intl.DateTimeFormatOptions; messages: LocaleMessages }>
  showDrafts: boolean
  news: NewsOptions
  seo: { collections: { news: { title: Multilanguage; description: Multilanguage } } }
}

// src/shared/route-types.ts
export type ContentIdentity = 'home' | `release:${string}` | `news:${string}` | `page:${string}`
export interface CompiledPage {
  identity: ContentIdentity | 'news-index' | `news-page:${number}` | 'news-tags-index' | `news-tag:${string}` | `news-tag:${string}:page:${number}` | 'release-index' | `release-page:${number}`
  locale: string
  contentType: 'home' | 'release' | 'news' | 'page' | 'release-collection' | 'news-collection'
  url: { routePath: string; outputPath: string; publicPath: string; absoluteUrl: string }
  isFallback: boolean
  isDraft: boolean
  noindex: boolean
  bodyLocale: string
  canonicalLocale: string
  packagePath?: string
  slug?: string | null
  title: string
  description?: string
  collection?: { page: number; pageCount: number; itemIdentities: ContentIdentity[]; tag?: string }
}
```

---

### Task 1: Shared News/Page/Home types and message interpolation verification

**Files:**
- Create: `src/shared/types/news.ts`
- Create: `tests/shared/news-types.test.ts`
- Modify: `tests/shared/format-message.test.ts`
- Modify: `src/index.ts` only to export News/Page/Home types; keep `formatMessage` platform re-export unchanged

**Interfaces:**
- Consumes: `LocaleKey`, `ContentDefinitions`, `LocaleMessages`, `RouteContentPackage` from `src/shared/types.ts`; `ContentIdentity` from `src/shared/route-types.ts`; existing `formatMessage(template, vars)` from `src/shared/format-message.ts`
- Produces: `NewsListItem`, `NewsTagLink`, `NewsTagCount`, `NewsCollectionPageData`, `NewsDetailPageData`, `PageDetailPageData`, `SynctrolNewsFrontmatter`, `SynctrolPageFrontmatter`, `SynctrolHomeFrontmatter`

- [ ] **Step 1: Extend format-message coverage for HEAD behavior**

```ts
// tests/shared/format-message.test.ts
import { describe, expect, it } from 'vitest'
import { formatMessage } from '../../src/shared/format-message'

describe('formatMessage', () => {
  it('replaces string and number placeholders and leaves unknown placeholders intact', () => {
    expect(formatMessage('{tag} · {title}', { tag: 'Releases', title: 'News' })).toBe(
      'Releases · News',
    )
    expect(formatMessage('{title} · Page {page}', { title: 'News', page: 2 })).toBe(
      'News · Page 2',
    )
    expect(formatMessage('Hello {name}', {})).toBe('Hello {name}')
  })
})
```

- [ ] **Step 2: Add News/Page/Home type tests**

```ts
// tests/shared/news-types.test.ts
import { describe, expect, it } from 'vitest'
import type {
  NewsListItem,
  NewsTagCount,
  SynctrolHomeFrontmatter,
  SynctrolNewsFrontmatter,
  SynctrolPageFrontmatter,
} from '../../src/shared/types/news'

describe('Plan 09 frontmatter types', () => {
  it('models news collection, page detail, and home formatter payloads', () => {
    const item: NewsListItem = {
      identity: 'news:launch',
      slug: 'launch',
      publicPath: '/base/en/news/launch/',
      title: '发布',
      titleLang: 'zh-CN',
      description: '摘要',
      descriptionLang: 'zh-CN',
      date: '2026-08-11',
      updated: '2026-08-12',
      coverPublicPath: undefined,
      tags: [{ key: 'release', title: 'Releases', publicPath: '/base/en/news/tags/release/' }],
      isFallback: true,
      isDraft: false,
      excludeFromRss: true,
    }
    const tag: NewsTagCount = {
      key: 'release',
      title: 'Releases',
      titleLang: 'en-US',
      count: 1,
      publicPath: '/base/en/news/tags/release/',
    }
    const news: SynctrolNewsFrontmatter = {
      kind: 'index',
      data: {
        kind: 'news-index',
        heading: 'News',
        description: 'All news',
        items: [item],
        pagination: null,
      },
    }
    const page: SynctrolPageFrontmatter = {
      kind: 'detail',
      data: {
        kind: 'page-detail',
        slug: 'team',
        title: 'Team',
        titleLang: 'en-US',
        isFallback: false,
        isDraft: false,
        bodyLang: 'en-US',
      },
    }
    const home: SynctrolHomeFrontmatter = {
      kind: 'home',
      logoHtml: '<div data-syn-formatter="home-logo">SYNCTROL</div>',
    }
    expect(news.data.items[0]).toBe(item)
    expect(tag.count).toBe(1)
    expect(page.data.kind).toBe('page-detail')
    expect(home.logoHtml).toContain('home-logo')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail only for missing News types**

Run: `npm test -- tests/shared/format-message.test.ts tests/shared/news-types.test.ts`

Expected: `format-message` assertions pass or remain compatible; `news-types` fails because `src/shared/types/news.ts` is missing.

- [ ] **Step 4: Add shared types**

```ts
// src/shared/types/news.ts
import type { ContentIdentity } from '../route-types.js'

export interface NewsTagLink {
  key: string
  title: string
  publicPath: string
}

export interface NewsListItem {
  identity: Extract<ContentIdentity, `news:${string}`>
  slug: string
  publicPath: string
  title: string
  titleLang: string
  description?: string
  descriptionLang?: string
  date: string
  updated?: string
  coverPublicPath?: string
  tags: NewsTagLink[]
  isFallback: boolean
  isDraft: boolean
  excludeFromRss: boolean
}

export interface NewsTagCount {
  key: string
  title: string
  titleLang: string
  count: number
  /** Present only when a tag archive page exists. */
  publicPath?: string
}

export interface NewsPagination {
  page: number
  pageCount: number
  prevPublicPath?: string
  nextPublicPath?: string
}

export type NewsCollectionKind = 'news-index' | 'news-tags-index' | 'news-tag'

export interface NewsCollectionPageData {
  kind: NewsCollectionKind
  heading: string
  description: string
  items: NewsListItem[]
  tags?: NewsTagCount[]
  tagKey?: string
  pagination: NewsPagination | null
}

export interface NewsDetailPageData {
  kind: 'news-detail'
  slug: string
  title: string
  titleLang: string
  date: string
  updated?: string
  coverPublicPath?: string
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
  coverPublicPath?: string
  isFallback: boolean
  isDraft: boolean
  translationUnavailableMessage?: string
  bodyLang: string
}

export type SynctrolNewsFrontmatter =
  | { kind: 'index'; data: NewsCollectionPageData }
  | { kind: 'tags-index'; data: NewsCollectionPageData }
  | { kind: 'tag'; data: NewsCollectionPageData }
  | { kind: 'detail'; data: NewsDetailPageData }

export interface SynctrolPageFrontmatter {
  kind: 'detail'
  data: PageDetailPageData
}

export interface SynctrolHomeFrontmatter {
  kind: 'home'
  logoHtml: string
  footerHtml?: string
}
```

Add only type exports at the package root:

```ts
// src/index.ts
export type {
  NewsCollectionPageData,
  NewsDetailPageData,
  NewsListItem,
  NewsTagCount,
  NewsTagLink,
  PageDetailPageData,
  SynctrolHomeFrontmatter,
  SynctrolNewsFrontmatter,
  SynctrolPageFrontmatter,
} from './shared/types/news.js'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/shared/format-message.test.ts tests/shared/news-types.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types/news.ts src/index.ts tests/shared/format-message.test.ts tests/shared/news-types.test.ts
git commit -m "feat(news): add news page and home frontmatter types"
```

---

### Task 2: Build base-aware News list items

**Files:**
- Create: `src/compiler/news/build-news-list-items.ts`
- Create: `tests/compiler/news/build-news-list-items.test.ts`
- Create: `tests/helpers/news-fixtures.ts`

**Interfaces:**
- Consumes: `RouteContentPackage`, `ContentDefinitions`, `LocaleKey` from `src/shared/types.ts`; `ResolvedSynctrolThemeOptions` from `src/shared/options.ts`; `CompiledPage` from `src/shared/route-types.ts`; `resolveMultilanguage`; detail/tag archive `CompiledPage.url.publicPath`; Plan 04 cover `publicPath`
- Produces: `buildNewsListItems(input): NewsListItem[]`

- [ ] **Step 1: Add fixtures reusing HEAD helpers**

```ts
// tests/helpers/news-fixtures.ts
import type { CompiledPage } from '../../src/shared/route-types'
import type { ContentDefinitions, RouteContentPackage } from '../../src/shared/types'
import { newsPackage, themeOptions } from './route-fixtures'

export { newsPackage, pagePackage, homePackage, themeOptions } from './route-fixtures'

export const newsDefinitions: ContentDefinitions = {
  tags: {
    release: { title: { zh: '作品发布', en: 'Releases' } },
    tour: { title: { zh: '巡演', en: 'Tour' } },
  },
  platforms: {},
}

export function newsDetailPage(
  pkg: RouteContentPackage,
  locale: string,
  overrides: Partial<CompiledPage> = {},
): CompiledPage {
  const bodyLocale = overrides.bodyLocale ?? (overrides.isFallback ? 'zh' : locale)
  const body = pkg.locales[bodyLocale]!
  return {
    identity: `news:${pkg.slug}`,
    locale,
    contentType: 'news',
    url: {
      routePath: `/${locale}/news/${pkg.slug}/`,
      outputPath: `${locale}/news/${pkg.slug}/index.html`,
      publicPath: `/base/${locale}/news/${pkg.slug}/`,
      absoluteUrl: `https://synctrol.com/base/${locale}/news/${pkg.slug}/`,
    },
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale,
    canonicalLocale: bodyLocale,
    packagePath: pkg.dir,
    slug: pkg.slug,
    title: body.title,
    description: body.description,
    ...overrides,
  }
}

export function tagArchivePage(tag: string, locale = 'en'): CompiledPage {
  return {
    identity: `news-tag:${tag}`,
    locale,
    contentType: 'news-collection',
    url: {
      routePath: `/${locale}/news/tags/${tag}/`,
      outputPath: `${locale}/news/tags/${tag}/index.html`,
      publicPath: `/base/${locale}/news/tags/${tag}/`,
      absoluteUrl: `https://synctrol.com/base/${locale}/news/tags/${tag}/`,
    },
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: locale,
    canonicalLocale: locale,
    title: `news-tag:${tag}`,
    collection: { page: 1, pageCount: 1, itemIdentities: [], tag },
  }
}
```

- [ ] **Step 2: Write failing list-item tests**

```ts
// tests/compiler/news/build-news-list-items.test.ts
import { describe, expect, it } from 'vitest'
import { buildNewsListItems } from '../../../src/compiler/news/build-news-list-items'
import {
  newsDefinitions,
  newsDetailPage,
  newsPackage,
  tagArchivePage,
  themeOptions,
} from '../../helpers/news-fixtures'

describe('buildNewsListItems', () => {
  it('sorts by date desc then slug and uses detail/tag publicPath links', () => {
    const a = newsPackage({ slug: 'a', date: '2026-08-10', tags: ['release'] })
    const b = newsPackage({
      slug: 'b',
      date: '2026-08-11',
      cover: './assets/b.webp',
      tags: ['release', 'tour'],
    })
    const c = newsPackage({ slug: 'c', date: '2026-08-11', tags: ['tour'] })
    const items = buildNewsListItems({
      locale: 'en',
      packages: [a, b, c],
      detailPages: [newsDetailPage(a, 'en'), newsDetailPage(b, 'en'), newsDetailPage(c, 'en')],
      tagArchivePages: [tagArchivePage('release'), tagArchivePage('tour')],
      options: themeOptions(),
      definitions: newsDefinitions,
      resolveCoverPublicPath: (pkg, rel) => `/base/assets/${pkg.slug}/${rel.replace(/^\.\//, '')}`,
      base: '/base/',
    })
    expect(items.map((item) => item.slug)).toEqual(['b', 'c', 'a'])
    expect(items[0]).toMatchObject({
      publicPath: '/base/en/news/b/',
      coverPublicPath: '/base/assets/b/assets/b.webp',
      title: 'Launch',
      titleLang: 'en-US',
      excludeFromRss: false,
    })
    expect(items[0]!.tags.map((tag) => tag.publicPath)).toEqual([
      '/base/en/news/tags/release/',
      '/base/en/news/tags/tour/',
    ])
  })

  it('uses body-locale text/lang and excludes fallback or draft items from RSS', () => {
    const pkg = newsPackage({
      slug: 'fallback',
      draft: true,
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
    const items = buildNewsListItems({
      locale: 'en',
      packages: [pkg],
      detailPages: [
        newsDetailPage(pkg, 'en', {
          isFallback: true,
          isDraft: true,
          noindex: true,
          bodyLocale: 'zh',
          canonicalLocale: 'zh',
        }),
      ],
      tagArchivePages: [tagArchivePage('release')],
      options: themeOptions({ showDrafts: true }),
      definitions: newsDefinitions,
      resolveCoverPublicPath: () => undefined,
      base: '/base/',
    })
    expect(items[0]).toMatchObject({
      title: '发布',
      titleLang: 'zh-CN',
      description: '中文说明',
      descriptionLang: 'zh-CN',
      isFallback: true,
      isDraft: true,
      excludeFromRss: true,
      publicPath: '/base/en/news/fallback/',
    })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/compiler/news/build-news-list-items.test.ts`

Expected: FAIL with `buildNewsListItems` module not found.

- [ ] **Step 4: Implement with compiled publicPath links**

```ts
// src/compiler/news/build-news-list-items.ts
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { ContentDefinitions, LocaleKey, RouteContentPackage } from '../../shared/types.js'
import type { NewsListItem, NewsTagLink } from '../../shared/types/news.js'
import { encodeRouteSegment } from '../path-suffix.js'
import { buildUrlLayers } from '../url-layers.js'

export interface BuildNewsListItemsInput {
  locale: LocaleKey
  packages: readonly RouteContentPackage[]
  detailPages: readonly CompiledPage[]
  tagArchivePages: readonly CompiledPage[]
  options: ResolvedSynctrolThemeOptions
  definitions: ContentDefinitions
  resolveCoverPublicPath: (pkg: RouteContentPackage, relativePath: string) => string | undefined
  base: string
}

function compareNews(left: RouteContentPackage, right: RouteContentPackage): number {
  const byDate = (right.date ?? '').localeCompare(left.date ?? '')
  return byDate === 0 ? (left.slug ?? '').localeCompare(right.slug ?? '') : byDate
}

function tagPublicPath(
  tag: string,
  locale: LocaleKey,
  pages: readonly CompiledPage[],
  options: ResolvedSynctrolThemeOptions,
  base: string,
): string {
  const compiled = pages.find(
    (page) =>
      page.locale === locale &&
      page.contentType === 'news-collection' &&
      page.identity === `news-tag:${tag}` &&
      page.collection?.page === 1,
  )
  if (compiled) return compiled.url.publicPath
  return buildUrlLayers({
    locale: encodeRouteSegment(locale, 'locale'),
    pathSuffix: `/${encodeRouteSegment(options.news.urlSegment, 'options.news.urlSegment')}/${encodeRouteSegment(options.news.tags.urlSegment, 'options.news.tags.urlSegment')}/${encodeRouteSegment(tag, 'tag')}/`,
    base,
    siteUrl: options.siteUrl,
  }).publicPath
}

export function buildNewsListItems(input: BuildNewsListItemsInput): NewsListItem[] {
  const detailByIdentity = new Map(
    input.detailPages
      .filter((page) => page.locale === input.locale && page.contentType === 'news')
      .map((page) => [page.identity, page]),
  )

  return input.packages
    .filter((pkg) => pkg.type === 'news' && pkg.slug !== null)
    .filter((pkg) => detailByIdentity.has(`news:${pkg.slug}`))
    .sort(compareNews)
    .map((pkg) => {
      const page = detailByIdentity.get(`news:${pkg.slug}`)!
      const body = pkg.locales[page.bodyLocale]
      if (body === undefined) {
        throw new Error(`Missing ${page.bodyLocale} markdown for ${pkg.identity}`)
      }
      const bodyLocale = input.options.locales[page.bodyLocale] ?? input.options.locales[input.options.mainLocale]
      const tags: NewsTagLink[] = pkg.tags.map((key) => {
        const resolved = resolveMultilanguage(
          input.definitions.tags[key]!.title,
          input.locale,
          input.options.mainLocale,
        )
        return {
          key,
          title: resolved.text,
          publicPath: tagPublicPath(key, input.locale, input.tagArchivePages, input.options, input.base),
        }
      })
      return {
        identity: `news:${pkg.slug}`,
        slug: pkg.slug,
        publicPath: page.url.publicPath,
        title: body.title,
        titleLang: bodyLocale.lang,
        description: body.description,
        descriptionLang: body.description === undefined ? undefined : bodyLocale.lang,
        date: pkg.date!,
        updated: pkg.updated,
        coverPublicPath: pkg.cover ? input.resolveCoverPublicPath(pkg, pkg.cover) : undefined,
        tags,
        isFallback: page.isFallback,
        isDraft: page.isDraft,
        excludeFromRss: page.isFallback || page.isDraft,
      }
    })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/compiler/news/build-news-list-items.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/compiler/news/build-news-list-items.ts tests/compiler/news/build-news-list-items.test.ts tests/helpers/news-fixtures.ts
git commit -m "feat(news): build base-aware news list items"
```

---

### Task 3: Build News Tags Index counts

**Files:**
- Create: `src/compiler/news/build-news-tags-index.ts`
- Create: `tests/compiler/news/build-news-tags-index.test.ts`

**Interfaces:**
- Consumes: `NewsListItem[]`, `ContentDefinitions`, `ResolvedSynctrolThemeOptions`, tag archive `CompiledPage.url.publicPath`
- Produces: `buildNewsTagsIndex(input): NewsTagCount[]`

- [ ] **Step 1: Write failing tests**

```ts
// tests/compiler/news/build-news-tags-index.test.ts
import { describe, expect, it } from 'vitest'
import { buildNewsListItems } from '../../../src/compiler/news/build-news-list-items'
import { buildNewsTagsIndex } from '../../../src/compiler/news/build-news-tags-index'
import {
  newsDefinitions,
  newsDetailPage,
  newsPackage,
  tagArchivePage,
  themeOptions,
} from '../../helpers/news-fixtures'

describe('buildNewsTagsIndex', () => {
  it('lists all declared tags with visible counts and compiled archive links', () => {
    const a = newsPackage({ slug: 'a', tags: ['release'] })
    const b = newsPackage({ slug: 'b', tags: ['release', 'tour'] })
    const options = themeOptions()
    const tagPages = [tagArchivePage('release'), tagArchivePage('tour')]
    const items = buildNewsListItems({
      locale: 'en',
      packages: [a, b],
      detailPages: [newsDetailPage(a, 'en'), newsDetailPage(b, 'en')],
      tagArchivePages: tagPages,
      options,
      definitions: newsDefinitions,
      resolveCoverPublicPath: () => undefined,
      base: '/base/',
    })
    expect(
      buildNewsTagsIndex({
        locale: 'en',
        items,
        definitions: newsDefinitions,
        options,
        tagArchivePages: tagPages,
      }),
    ).toEqual([
      {
        key: 'release',
        title: 'Releases',
        titleLang: 'en-US',
        count: 2,
        publicPath: '/base/en/news/tags/release/',
      },
      {
        key: 'tour',
        title: 'Tour',
        titleLang: 'en-US',
        count: 1,
        publicPath: '/base/en/news/tags/tour/',
      },
    ])
  })

  it('keeps unused declared tags at count 0 without fabricating a missing archive link', () => {
    const rows = buildNewsTagsIndex({
      locale: 'zh',
      items: [],
      definitions: newsDefinitions,
      options: themeOptions(),
      tagArchivePages: [],
    })
    expect(rows.find((row) => row.key === 'tour')).toMatchObject({
      title: '巡演',
      titleLang: 'zh-CN',
      count: 0,
      publicPath: undefined,
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/news/build-news-tags-index.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement counts**

```ts
// src/compiler/news/build-news-tags-index.ts
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { ContentDefinitions, LocaleKey } from '../../shared/types.js'
import type { NewsListItem, NewsTagCount } from '../../shared/types/news.js'

export interface BuildNewsTagsIndexInput {
  locale: LocaleKey
  items: readonly NewsListItem[]
  definitions: ContentDefinitions
  options: ResolvedSynctrolThemeOptions
  tagArchivePages: readonly CompiledPage[]
}

export function buildNewsTagsIndex(input: BuildNewsTagsIndexInput): NewsTagCount[] {
  const counts = new Map(Object.keys(input.definitions.tags).map((key) => [key, 0]))
  for (const item of input.items) {
    for (const tag of item.tags) {
      counts.set(tag.key, (counts.get(tag.key) ?? 0) + 1)
    }
  }

  return Object.keys(input.definitions.tags).map((key) => {
    const resolved = resolveMultilanguage(
      input.definitions.tags[key]!.title,
      input.locale,
      input.options.mainLocale,
    )
    const locale = input.options.locales[resolved.locale] ?? input.options.locales[input.options.mainLocale]
    const archive = input.tagArchivePages.find(
      (page) => page.locale === input.locale && page.identity === `news-tag:${key}`,
    )
    return {
      key,
      title: resolved.text,
      titleLang: locale.lang,
      count: counts.get(key) ?? 0,
      publicPath: archive?.url.publicPath,
    }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/news/build-news-tags-index.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/news/build-news-tags-index.ts tests/compiler/news/build-news-tags-index.test.ts
git commit -m "feat(news): build unpaginated tag counts"
```

---

### Task 4: Build News frontmatter data

**Files:**
- Create: `src/compiler/news/attach-news-page-data.ts`
- Create: `tests/compiler/news/attach-news-page-data.test.ts`

**Interfaces:**
- Consumes: Tasks 2-3 builders, `formatMessage`, `resolveMultilanguage`, `CompiledPage[]`, `RouteContentPackage[]`, `ResolvedSynctrolThemeOptions`, `ContentDefinitions`
- Produces: `buildNewsFrontmatterForPage(input): SynctrolNewsFrontmatter | null`

- [ ] **Step 1: Write failing tests for collection, tag, and detail data**

```ts
// tests/compiler/news/attach-news-page-data.test.ts
import { describe, expect, it } from 'vitest'
import { buildNewsFrontmatterForPage } from '../../../src/compiler/news/attach-news-page-data'
import {
  newsDefinitions,
  newsDetailPage,
  newsPackage,
  tagArchivePage,
  themeOptions,
} from '../../helpers/news-fixtures'
import type { CompiledPage } from '../../../src/shared/route-types'

function collectionPage(partial: Partial<CompiledPage> & Pick<CompiledPage, 'identity' | 'url' | 'collection'>): CompiledPage {
  return {
    locale: 'en',
    contentType: 'news-collection',
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: 'en',
    canonicalLocale: 'en',
    title: String(partial.identity),
    ...partial,
  }
}

describe('buildNewsFrontmatterForPage', () => {
  it('builds index data with paginated title and sibling publicPath pagination', () => {
    const a = newsPackage({ slug: 'a', date: '2026-08-11' })
    const b = newsPackage({ slug: 'b', date: '2026-08-10' })
    const index = collectionPage({
      identity: 'news-index',
      url: { routePath: '/en/news/', outputPath: 'en/news/index.html', publicPath: '/base/en/news/', absoluteUrl: 'https://synctrol.com/base/en/news/' },
      collection: { page: 1, pageCount: 2, itemIdentities: ['news:a'] },
    })
    const page2 = collectionPage({
      identity: 'news-page:2',
      url: { routePath: '/en/news/page/2/', outputPath: 'en/news/page/2/index.html', publicPath: '/base/en/news/page/2/', absoluteUrl: 'https://synctrol.com/base/en/news/page/2/' },
      collection: { page: 2, pageCount: 2, itemIdentities: ['news:b'] },
    })
    const frontmatter = buildNewsFrontmatterForPage({
      compiled: page2,
      allPages: [newsDetailPage(a, 'en'), newsDetailPage(b, 'en'), index, page2, tagArchivePage('release')],
      packages: [a, b],
      options: themeOptions(),
      definitions: newsDefinitions,
      resolveCoverPublicPath: () => undefined,
      base: '/base/',
    })
    expect(frontmatter).toMatchObject({
      kind: 'index',
      data: {
        kind: 'news-index',
        heading: 'News · Page 2',
        pagination: {
          page: 2,
          pageCount: 2,
          prevPublicPath: '/base/en/news/',
          nextPublicPath: undefined,
        },
      },
    })
    expect(frontmatter?.data.items.map((item) => item.slug)).toEqual(['b'])
  })

  it('builds tags index and tag archive frontmatter', () => {
    const pkg = newsPackage({ slug: 'a', tags: ['release'] })
    const tagsIndex = collectionPage({
      identity: 'news-tags-index',
      url: { routePath: '/en/news/tags/', outputPath: 'en/news/tags/index.html', publicPath: '/base/en/news/tags/', absoluteUrl: 'https://synctrol.com/base/en/news/tags/' },
      collection: { page: 1, pageCount: 1, itemIdentities: [] },
    })
    const archive = tagArchivePage('release')
    const allPages = [newsDetailPage(pkg, 'en'), tagsIndex, archive]
    expect(
      buildNewsFrontmatterForPage({
        compiled: tagsIndex,
        allPages,
        packages: [pkg],
        options: themeOptions(),
        definitions: newsDefinitions,
        resolveCoverPublicPath: () => undefined,
        base: '/base/',
      }),
    ).toMatchObject({ kind: 'tags-index', data: { kind: 'news-tags-index', pagination: null } })
    expect(
      buildNewsFrontmatterForPage({
        compiled: archive,
        allPages,
        packages: [pkg],
        options: themeOptions(),
        definitions: newsDefinitions,
        resolveCoverPublicPath: () => undefined,
        base: '/base/',
      }),
    ).toMatchObject({ kind: 'tag', data: { kind: 'news-tag', heading: 'Releases · News', tagKey: 'release' } })
  })

  it('builds detail data with fallback message and cover publicPath', () => {
    const pkg = newsPackage({ slug: 'launch', updated: '2026-08-12', cover: './assets/n.webp' })
    const page = newsDetailPage(pkg, 'en', { isFallback: true, bodyLocale: 'zh', canonicalLocale: 'zh' })
    const frontmatter = buildNewsFrontmatterForPage({
      compiled: page,
      allPages: [page, tagArchivePage('release')],
      packages: [pkg],
      options: themeOptions(),
      definitions: newsDefinitions,
      resolveCoverPublicPath: (_pkg, ref) => `/base/assets/${ref}`,
      base: '/base/',
    })
    expect(frontmatter).toMatchObject({
      kind: 'detail',
      data: {
        slug: 'launch',
        titleLang: 'zh-CN',
        updated: '2026-08-12',
        coverPublicPath: '/base/assets/./assets/n.webp',
        translationUnavailableMessage: 'This article is not yet available in English. Showing the original version.',
      },
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/news/attach-news-page-data.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement frontmatter builder**

Implementation requirements:
- Select `detailPages = allPages.filter((page) => page.contentType === 'news' && page.locale === compiled.locale)`.
- Select `tagArchivePages = allPages.filter((page) => page.contentType === 'news-collection' && String(page.identity).startsWith('news-tag:') && !String(page.identity).includes(':page:'))`.
- Use `buildNewsListItems` once per `compiled.locale`, then slice/reorder collection items by `compiled.collection.itemIdentities`.
- Resolve collection title/description from `options.seo.collections.news` with `resolveMultilanguage`.
- Use `formatMessage(messages.paginatedTitle, { title, page })` for News index pages after page 1.
- Use `formatMessage(messages.tagArchiveTitle, { tag, title })` for tag archives.
- Pagination prev/next is found from sibling collection pages with matching `contentType`, `locale`, same `collection.tag`, and adjacent page numbers; values are `page.url.publicPath`.
- Return `null` for non-News pages.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/news/attach-news-page-data.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/news/attach-news-page-data.ts tests/compiler/news/attach-news-page-data.test.ts
git commit -m "feat(news): build news frontmatter data"
```

---

### Task 5: Shared badges, content column, pagination, and cover primitives

**Files:**
- Modify: `src/client/components/DraftBadge.vue`
- Create: `src/client/components/TranslationUnavailableBadge.vue`
- Create: `src/client/components/ContentColumn.vue`
- Create: `src/client/components/PaginationNav.vue`
- Create: `src/client/components/ContentCover.vue`
- Create: `tests/client/components/shared-content-components.test.ts`

**Interfaces:**
- Consumes: existing shell tokens (`--syn-content-width`, borders)
- Produces: shared presentational components used by News/Page layouts

- [ ] **Step 1: Write failing component tests**

```ts
// tests/client/components/shared-content-components.test.ts
/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContentColumn from '../../../src/client/components/ContentColumn.vue'
import ContentCover from '../../../src/client/components/ContentCover.vue'
import DraftBadge from '../../../src/client/components/DraftBadge.vue'
import PaginationNav from '../../../src/client/components/PaginationNav.vue'
import TranslationUnavailableBadge from '../../../src/client/components/TranslationUnavailableBadge.vue'

describe('Plan 09 shared content components', () => {
  it('extends DraftBadge and adds translation status badge', () => {
    expect(mount(DraftBadge, { props: { label: 'Draft' } }).find('[data-testid="draft-badge"]').text()).toBe('Draft')
    const translation = mount(TranslationUnavailableBadge, { props: { label: 'Unavailable' } })
    expect(translation.find('[data-testid="translation-unavailable-badge"]').attributes('role')).toBe('status')
    expect(translation.text()).toBe('Unavailable')
  })

  it('renders a 760px content column wrapper', () => {
    const wrapper = mount(ContentColumn, { slots: { default: '<p>Body</p>' } })
    expect(wrapper.find('[data-testid="content-column"]').classes()).toContain('syn-content-column')
    expect(wrapper.text()).toBe('Body')
  })

  it('mirrors ReleaseIndex pagination nav accessibility and links', () => {
    const wrapper = mount(PaginationNav, {
      props: {
        prevHref: '/base/en/news/',
        nextHref: '/base/en/news/page/3/',
        prevLabel: 'Previous',
        nextLabel: 'Next',
      },
    })
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Pagination')
    expect(wrapper.find('[data-testid="pagination-prev"]').attributes('href')).toBe('/base/en/news/')
    expect(wrapper.find('[data-testid="pagination-next"]').attributes('href')).toBe('/base/en/news/page/3/')
  })

  it('renders optional covers with lazy/eager loading', () => {
    const wrapper = mount(ContentCover, { props: { src: '/cover.webp', alt: 'Cover', eager: true } })
    expect(wrapper.find('[data-testid="content-cover"]').attributes()).toMatchObject({
      src: '/cover.webp',
      alt: 'Cover',
      loading: 'eager',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/client/components/shared-content-components.test.ts`

Expected: FAIL for missing new components; existing `DraftBadge` may pass before styling is extended.

- [ ] **Step 3: Implement components**

```vue
<!-- src/client/components/ContentColumn.vue -->
<template>
  <div class="syn-content-column" data-testid="content-column">
    <slot />
  </div>
</template>

<style scoped>
.syn-content-column {
  max-width: var(--syn-content-width);
  margin-inline: auto;
}
</style>
```

```vue
<!-- src/client/components/PaginationNav.vue -->
<script setup lang="ts">
defineProps<{
  prevHref?: string
  nextHref?: string
  prevLabel: string
  nextLabel: string
}>()
</script>

<template>
  <nav
    v-if="prevHref || nextHref"
    class="syn-pagination"
    aria-label="Pagination"
    data-testid="pagination"
  >
    <a v-if="prevHref" data-testid="pagination-prev" :href="prevHref">{{ prevLabel }}</a>
    <a v-if="nextHref" data-testid="pagination-next" :href="nextHref">{{ nextLabel }}</a>
  </nav>
</template>
```

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
```

Extend `DraftBadge.vue` without changing its prop:

```vue
<!-- src/client/components/DraftBadge.vue -->
<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <span class="syn-badge syn-draft-badge" data-testid="draft-badge">{{ label }}</span>
</template>
```

```vue
<!-- src/client/components/TranslationUnavailableBadge.vue -->
<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <p class="syn-badge syn-translation-badge" data-testid="translation-unavailable-badge" role="status">
    {{ label }}
  </p>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/client/components/shared-content-components.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/DraftBadge.vue src/client/components/TranslationUnavailableBadge.vue src/client/components/ContentColumn.vue src/client/components/PaginationNav.vue src/client/components/ContentCover.vue tests/client/components/shared-content-components.test.ts
git commit -m "feat(ui): add shared content primitives"
```

---

### Task 6: Calendar date helper and News list components

**Files:**
- Create: `src/shared/format-calendar-date.ts`
- Create: `src/client/components/news/NewsListItem.vue`
- Create: `src/client/components/news/NewsList.vue`
- Create: `tests/shared/format-calendar-date.test.ts`
- Create: `tests/client/components/news-list.test.ts`

**Interfaces:**
- Consumes: `NewsListItem`, Task 5 primitives
- Produces: UTC-safe `formatCalendarDate`; list UI with `data-layout="cover" | "text"`

- [ ] **Step 1: Write date-helper tests**

```ts
// tests/shared/format-calendar-date.test.ts
import { describe, expect, it } from 'vitest'
import { formatCalendarDate } from '../../src/shared/format-calendar-date'

describe('formatCalendarDate', () => {
  it('formats YYYY-MM-DD in UTC without shifting calendar day', () => {
    expect(formatCalendarDate('2026-08-11', 'en-US', { dateStyle: 'medium' })).toBe(
      'Aug 11, 2026',
    )
  })

  it('returns input for invalid calendar strings', () => {
    expect(formatCalendarDate('not-a-date', 'en-US')).toBe('not-a-date')
  })
})
```

- [ ] **Step 2: Write News list component tests**

```ts
// tests/client/components/news-list.test.ts
/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NewsList from '../../../../src/client/components/news/NewsList.vue'
import NewsListItem from '../../../../src/client/components/news/NewsListItem.vue'
import type { NewsListItem as Item } from '../../../../src/shared/types/news'

function item(partial: Partial<Item> & Pick<Item, 'slug' | 'title'>): Item {
  return {
    identity: `news:${partial.slug}`,
    slug: partial.slug,
    publicPath: partial.publicPath ?? `/base/en/news/${partial.slug}/`,
    title: partial.title,
    titleLang: partial.titleLang ?? 'en-US',
    description: partial.description,
    descriptionLang: partial.descriptionLang,
    date: partial.date ?? '2026-08-11',
    updated: partial.updated,
    coverPublicPath: partial.coverPublicPath,
    tags: partial.tags ?? [{ key: 'release', title: 'Releases', publicPath: '/base/en/news/tags/release/' }],
    isFallback: partial.isFallback ?? false,
    isDraft: partial.isDraft ?? false,
    excludeFromRss: partial.excludeFromRss ?? false,
  }
}

describe('NewsListItem', () => {
  it('uses cover layout when coverPublicPath exists', () => {
    const wrapper = mount(NewsListItem, {
      props: {
        item: item({ slug: 'cover', title: 'Cover', coverPublicPath: '/cover.webp' }),
        formattedDate: 'Aug 11, 2026',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
      },
    })
    expect(wrapper.attributes('data-layout')).toBe('cover')
    expect(wrapper.find('[data-testid="content-cover"]').attributes('src')).toBe('/cover.webp')
  })

  it('uses text layout and fallback/draft badges when needed', () => {
    const wrapper = mount(NewsListItem, {
      props: {
        item: item({
          slug: 'fallback',
          title: '发布',
          titleLang: 'zh-CN',
          description: '中文说明',
          descriptionLang: 'zh-CN',
          isFallback: true,
          isDraft: true,
        }),
        formattedDate: 'Aug 11, 2026',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
      },
    })
    expect(wrapper.attributes('data-layout')).toBe('text')
    expect(wrapper.find('[data-testid="item-title"]').attributes('lang')).toBe('zh-CN')
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="translation-unavailable-badge"]').exists()).toBe(true)
  })
})

describe('NewsList', () => {
  it('renders empty state or one row per item', () => {
    const empty = mount(NewsList, {
      props: {
        items: [],
        emptyLabel: 'No news',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
        formatDate: (date: string) => date,
      },
    })
    expect(empty.find('[data-testid="empty-news"]').text()).toBe('No news')

    const filled = mount(NewsList, {
      props: {
        items: [item({ slug: 'a', title: 'A' }), item({ slug: 'b', title: 'B' })],
        emptyLabel: 'No news',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
        formatDate: (date: string) => date,
      },
    })
    expect(filled.findAllComponents(NewsListItem)).toHaveLength(2)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/shared/format-calendar-date.test.ts tests/client/components/news-list.test.ts`

Expected: FAIL with missing helper/components.

- [ ] **Step 4: Implement helper and components**

```ts
// src/shared/format-calendar-date.ts
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatCalendarDate(
  date: string,
  localeLang: string,
  dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  const match = DATE_PATTERN.exec(date)
  if (match === null) return date
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const value = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat(localeLang, {
    timeZone: 'UTC',
    ...dateFormat,
  }).format(value)
}
```

Implement `NewsListItem.vue` and `NewsList.vue` with Task 5 primitives:
- `NewsListItem` root is `<article data-layout="cover|text">`.
- Main title link uses `item.publicPath`.
- Cover uses `item.coverPublicPath`.
- Date receives already formatted text from prop `formattedDate`.
- Tags use each tag `publicPath`.
- Fallback and draft badges render from props.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/shared/format-calendar-date.test.ts tests/client/components/news-list.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/format-calendar-date.ts src/client/components/news/NewsListItem.vue src/client/components/news/NewsList.vue tests/shared/format-calendar-date.test.ts tests/client/components/news-list.test.ts
git commit -m "feat(news): add calendar formatter and news list components"
```

---

### Task 7: News tag list and collection layouts

**Files:**
- Create: `src/client/components/news/NewsTagsList.vue`
- Create: `src/client/layouts/NewsIndexLayout.vue`
- Create: `src/client/layouts/NewsTagsIndexLayout.vue`
- Create: `src/client/layouts/NewsTagArchiveLayout.vue`
- Create: `tests/client/layouts/news-collections.test.ts`

**Interfaces:**
- Consumes: `NewsCollectionPageData`, `NewsList`, `NewsTagsList`, `ContentColumn`, `PaginationNav`
- Produces: three collection layouts; Tags Index never renders pagination

- [ ] **Step 1: Write failing layout tests**

```ts
// tests/client/layouts/news-collections.test.ts
/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NewsIndexLayout from '../../../src/client/layouts/NewsIndexLayout.vue'
import NewsTagArchiveLayout from '../../../src/client/layouts/NewsTagArchiveLayout.vue'
import NewsTagsIndexLayout from '../../../src/client/layouts/NewsTagsIndexLayout.vue'
import type { NewsCollectionPageData, NewsListItem } from '../../../src/shared/types/news'

const listItem: NewsListItem = {
  identity: 'news:a',
  slug: 'a',
  publicPath: '/base/en/news/a/',
  title: 'A',
  titleLang: 'en-US',
  date: '2026-08-11',
  tags: [],
  isFallback: false,
  isDraft: false,
  excludeFromRss: false,
}

describe('News collection layouts', () => {
  it('renders News index with shared pagination', () => {
    const data: NewsCollectionPageData = {
      kind: 'news-index',
      heading: 'News',
      description: 'All news',
      items: [listItem],
      pagination: { page: 1, pageCount: 2, nextPublicPath: '/base/en/news/page/2/' },
    }
    const wrapper = mount(NewsIndexLayout, {
      props: {
        data,
        emptyLabel: 'No news',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
        previousPageLabel: 'Previous',
        nextPageLabel: 'Next',
        formatDate: (date: string) => date,
      },
    })
    expect(wrapper.find('[data-testid="content-column"]').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('News')
    expect(wrapper.find('[data-testid="pagination-next"]').attributes('href')).toBe('/base/en/news/page/2/')
  })

  it('renders Tags Index with counts and no pagination', () => {
    const data: NewsCollectionPageData = {
      kind: 'news-tags-index',
      heading: 'News tags',
      description: 'Browse tags',
      items: [],
      tags: [{ key: 'release', title: 'Releases', titleLang: 'en-US', count: 2, publicPath: '/base/en/news/tags/release/' }],
      pagination: null,
    }
    const wrapper = mount(NewsTagsIndexLayout, { props: { data } })
    expect(wrapper.find('[data-testid="news-tags-list"]').text()).toContain('Releases')
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(false)
  })

  it('renders Tag Archive with data-tag and optional pagination', () => {
    const data: NewsCollectionPageData = {
      kind: 'news-tag',
      heading: 'Releases · News',
      description: 'All news',
      tagKey: 'release',
      items: [listItem],
      pagination: { page: 1, pageCount: 1 },
    }
    const wrapper = mount(NewsTagArchiveLayout, {
      props: {
        data,
        emptyLabel: 'No news',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
        previousPageLabel: 'Previous',
        nextPageLabel: 'Next',
        formatDate: (date: string) => date,
      },
    })
    expect(wrapper.attributes('data-tag')).toBe('release')
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/client/layouts/news-collections.test.ts`

Expected: FAIL with layout modules not found.

- [ ] **Step 3: Implement collection layouts**

Implementation requirements:
- `NewsTagsList.vue` renders `<a>` only when `tag.publicPath` exists; otherwise render a `<span>` for zero-count tags.
- Each layout wraps content in `ContentColumn`.
- `NewsIndexLayout` and `NewsTagArchiveLayout` render `PaginationNav` only when `data.pagination?.pageCount > 1`.
- No `resolve-layout.ts` changes in this task.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/client/layouts/news-collections.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/news/NewsTagsList.vue src/client/layouts/NewsIndexLayout.vue src/client/layouts/NewsTagsIndexLayout.vue src/client/layouts/NewsTagArchiveLayout.vue tests/client/layouts/news-collections.test.ts
git commit -m "feat(news): add news collection layouts"
```

---

### Task 8: News detail layout

**Files:**
- Create: `src/client/components/ArticleMeta.vue`
- Create: `src/client/layouts/NewsDetailLayout.vue`
- Create: `tests/client/layouts/news-detail.test.ts`

**Interfaces:**
- Consumes: `NewsDetailPageData`, `ArticleMeta`, badges, `ContentCover`, `ContentColumn`
- Produces: News article layout with 760px column, no search, no table of contents, and slot for VuePress `<Content />`

- [ ] **Step 1: Write failing tests**

```ts
// tests/client/layouts/news-detail.test.ts
/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NewsDetailLayout from '../../../src/client/layouts/NewsDetailLayout.vue'
import type { NewsDetailPageData } from '../../../src/shared/types/news'

const data: NewsDetailPageData = {
  kind: 'news-detail',
  slug: 'launch',
  title: '发布',
  titleLang: 'zh-CN',
  date: '2026-08-11',
  updated: '2026-08-12',
  coverPublicPath: '/base/assets/news.webp',
  tags: [{ key: 'release', title: 'Releases', publicPath: '/base/en/news/tags/release/' }],
  isFallback: true,
  isDraft: true,
  translationUnavailableMessage: 'Unavailable',
  bodyLang: 'zh-CN',
}

describe('NewsDetailLayout', () => {
  it('renders metadata, badges, cover, and slotted markdown body', () => {
    const wrapper = mount(NewsDetailLayout, {
      props: {
        data,
        publishedLabel: 'Published',
        updatedLabel: 'Updated',
        draftLabel: 'Draft',
        formatDate: (date: string) => `fmt:${date}`,
      },
      slots: { default: '<p>Markdown body</p>' },
    })
    expect(wrapper.find('[data-testid="content-column"]').exists()).toBe(true)
    expect(wrapper.find('h1').attributes('lang')).toBe('zh-CN')
    expect(wrapper.find('[data-testid="content-cover"]').attributes('src')).toBe('/base/assets/news.webp')
    expect(wrapper.find('[data-testid="updated-date"]').text()).toContain('fmt:2026-08-12')
    expect(wrapper.find('[data-testid="article-body"]').attributes('lang')).toBe('zh-CN')
    expect(wrapper.find('[data-testid="article-body"]').text()).toContain('Markdown body')
    expect(wrapper.find('[data-testid="search"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'TableOfContents' }).exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/client/layouts/news-detail.test.ts`

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement News detail components**

Implementation requirements:
- `ArticleMeta.vue` renders published/updated `<time>` elements with `data-testid="published-date"` and `data-testid="updated-date"`.
- Tag links use `tag.publicPath`.
- `NewsDetailLayout.vue` wraps its default slot in `<div data-testid="article-body" :lang="data.bodyLang">`.
- Cover uses `data.coverPublicPath`.
- No registry or `Layout.vue` changes in this task.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/client/layouts/news-detail.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/ArticleMeta.vue src/client/layouts/NewsDetailLayout.vue tests/client/layouts/news-detail.test.ts
git commit -m "feat(news): add news detail layout"
```

---

### Task 9: Page detail frontmatter and layout

**Files:**
- Create: `src/compiler/page/attach-page-page-data.ts`
- Create: `src/client/layouts/PageDetailLayout.vue`
- Create: `tests/compiler/page/attach-page-page-data.test.ts`
- Create: `tests/client/layouts/page-detail.test.ts`

**Interfaces:**
- Consumes: `RouteContentPackage` type `page`, `CompiledPage`, `ResolvedSynctrolThemeOptions`, cover `publicPath`
- Produces: `buildPageFrontmatterForPage(input): SynctrolPageFrontmatter | null`; Page detail layout with no listing and no `layout` prop API

- [ ] **Step 1: Write failing compiler test**

```ts
// tests/compiler/page/attach-page-page-data.test.ts
import { describe, expect, it } from 'vitest'
import { buildPageFrontmatterForPage } from '../../../src/compiler/page/attach-page-page-data'
import { pagePackage, themeOptions } from '../../helpers/news-fixtures'
import type { CompiledPage } from '../../../src/shared/route-types'

describe('buildPageFrontmatterForPage', () => {
  it('builds page detail data with optional cover and fallback message', () => {
    const pkg = pagePackage({ slug: 'team', cover: './assets/team.webp' })
    const page: CompiledPage = {
      identity: 'page:team',
      locale: 'en',
      contentType: 'page',
      url: { routePath: '/en/team/', outputPath: 'en/team/index.html', publicPath: '/base/en/team/', absoluteUrl: 'https://synctrol.com/base/en/team/' },
      isFallback: true,
      isDraft: false,
      noindex: true,
      bodyLocale: 'zh',
      canonicalLocale: 'zh',
      packagePath: pkg.dir,
      slug: 'team',
      title: '团队',
    }
    expect(
      buildPageFrontmatterForPage({
        compiled: page,
        packages: [pkg],
        options: themeOptions(),
        resolveCoverPublicPath: () => '/base/assets/team.webp',
      }),
    ).toEqual({
      kind: 'detail',
      data: {
        kind: 'page-detail',
        slug: 'team',
        title: '关于',
        titleLang: 'zh-CN',
        coverPublicPath: '/base/assets/team.webp',
        isFallback: true,
        isDraft: false,
        translationUnavailableMessage:
          'This article is not yet available in English. Showing the original version.',
        bodyLang: 'zh-CN',
      },
    })
  })
})
```

- [ ] **Step 2: Write failing client layout test**

```ts
// tests/client/layouts/page-detail.test.ts
/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PageDetailLayout from '../../../src/client/layouts/PageDetailLayout.vue'
import type { PageDetailPageData } from '../../../src/shared/types/news'

describe('PageDetailLayout', () => {
  it('renders 760px page body with optional cover and no listing', () => {
    const data: PageDetailPageData = {
      kind: 'page-detail',
      slug: 'team',
      title: 'Team',
      titleLang: 'en-US',
      coverPublicPath: '/base/team.webp',
      isFallback: false,
      isDraft: false,
      bodyLang: 'en-US',
    }
    const wrapper = mount(PageDetailLayout, {
      props: { data, draftLabel: 'Draft' },
      slots: { default: '<p>Team body</p>' },
    })
    expect(wrapper.find('[data-testid="content-column"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="content-cover"]').attributes('src')).toBe('/base/team.webp')
    expect(wrapper.find('[data-testid="page-listing"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="search"]').exists()).toBe(false)
    expect((wrapper.props() as { layout?: unknown }).layout).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/compiler/page/attach-page-page-data.test.ts tests/client/layouts/page-detail.test.ts`

Expected: FAIL with missing modules.

- [ ] **Step 4: Implement Page builder and layout**

Implementation requirements:
- `buildPageFrontmatterForPage` returns `null` unless `compiled.contentType === 'page'`.
- Find package by `compiled.identity` or `compiled.packagePath`.
- Use `pkg.locales[compiled.bodyLocale]` for title and body lang.
- Cover uses `pkg.cover ? resolveCoverPublicPath(pkg, pkg.cover) : undefined`.
- Translation message comes from `options.locales[compiled.locale].messages.translationUnavailable` only when `compiled.isFallback`.
- `PageDetailLayout.vue` mirrors the News detail body/cover/badges without ArticleMeta and without any listing.
- No registry or `Layout.vue` changes in this task.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/compiler/page/attach-page-page-data.test.ts tests/client/layouts/page-detail.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/compiler/page/attach-page-page-data.ts src/client/layouts/PageDetailLayout.vue tests/compiler/page/attach-page-page-data.test.ts tests/client/layouts/page-detail.test.ts
git commit -m "feat(page): add page detail frontmatter and layout"
```

---

### Task 10: Home markdown formatters and footer slots

**Files:**
- Create: `src/compiler/markdown/home-formatters.ts`
- Create: `src/compiler/home/extract-home-formatter-html.ts`
- Create: `src/compiler/home/build-home-frontmatter.ts`
- Create: `src/client/components/home/HomeLogoSlot.vue`
- Create: `src/client/components/home/HomeFooterSlot.vue`
- Create: `tests/compiler/markdown/home-formatters.test.ts`
- Create: `tests/client/components/home-formatters.test.ts`
- Modify: `src/compiler/locale-markdown.ts`
- Modify: `src/compiler/theme.ts` only to add `extendsMarkdown`
- Modify: `package.json` / `package-lock.json` if direct markdown dependencies are absent

**Interfaces:**
- Consumes: VuePress 2 theme hook `extendsMarkdown: (md, app) => void | Promise<void>`, markdown-it, `markdown-it-container`, Home `LocaleMarkdown.body`
- Produces: `registerHomeFormatters(md)`, `assertHomeHasLogo(markdownSource, filePath)`, `buildHomeFrontmatterForPage(input): SynctrolHomeFrontmatter | null`

- [ ] **Step 1: Add direct markdown dependencies if needed**

Inspect `package.json`. If `markdown-it` or `markdown-it-container` are absent from direct dependencies, run:

```bash
npm install markdown-it markdown-it-container
npm install --save-dev @types/markdown-it @types/markdown-it-container
```

Keep versions selected by npm; do not pin invented versions.

- [ ] **Step 2: Write formatter tests**

```ts
// tests/compiler/markdown/home-formatters.test.ts
import MarkdownIt from 'markdown-it'
import { describe, expect, it } from 'vitest'
import { buildHomeFrontmatterForPage } from '../../../src/compiler/home/build-home-frontmatter'
import { extractHomeFormatterHtml } from '../../../src/compiler/home/extract-home-formatter-html'
import { assertHomeHasLogo, registerHomeFormatters } from '../../../src/compiler/markdown/home-formatters'
import { homePackage } from '../../helpers/news-fixtures'
import type { CompiledPage } from '../../../src/shared/route-types'

describe('home formatters', () => {
  it('registers home-logo and home-footer markdown-it containers', () => {
    const md = new MarkdownIt()
    registerHomeFormatters(md)
    const html = md.render('::: home-logo\n# SYNCTROL\n:::\n\n::: home-footer\nContact\n:::\n')
    expect(html).toContain('data-syn-formatter="home-logo"')
    expect(html).toContain('SYNCTROL')
    expect(html).toContain('data-syn-formatter="home-footer"')
  })

  it('asserts home-logo exists in Home markdown source', () => {
    expect(() => assertHomeHasLogo('::: home-logo\n# SYNCTROL\n:::\n', '/content/home/zh.md')).not.toThrow()
    expect(() => assertHomeHasLogo('# Missing', '/content/home/zh.md')).toThrow(/home-logo/)
  })

  it('extracts formatter HTML and builds Home frontmatter', () => {
    const md = new MarkdownIt()
    registerHomeFormatters(md)
    const extracted = extractHomeFormatterHtml(md.render('::: home-logo\n# SYNCTROL\n:::\n'))
    expect(extracted.logoHtml).toContain('SYNCTROL')
    expect(extracted.footerHtml).toBeUndefined()

    const pkg = homePackage({
      locales: {
        en: {
          filePath: 'en.md',
          title: 'Home SEO',
          description: 'SEO only',
          draft: false,
          body: '::: home-logo\n# SYNCTROL\n:::\n',
        },
      },
    })
    const page: CompiledPage = {
      identity: 'home',
      locale: 'en',
      contentType: 'home',
      url: { routePath: '/en/', outputPath: 'en/index.html', publicPath: '/base/en/', absoluteUrl: 'https://synctrol.com/base/en/' },
      isFallback: false,
      isDraft: false,
      noindex: false,
      bodyLocale: 'en',
      canonicalLocale: 'en',
      packagePath: pkg.dir,
      slug: null,
      title: 'Home SEO',
    }
    expect(buildHomeFrontmatterForPage({ compiled: page, packages: [pkg] })).toMatchObject({
      kind: 'home',
      logoHtml: expect.stringContaining('SYNCTROL'),
    })
  })
})
```

- [ ] **Step 3: Write Home slot component tests**

```ts
// tests/client/components/home-formatters.test.ts
/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HomeFooterSlot from '../../../../src/client/components/home/HomeFooterSlot.vue'
import HomeLogoSlot from '../../../../src/client/components/home/HomeLogoSlot.vue'

describe('Home formatter slots', () => {
  it('renders logo HTML and ignores SEO title', () => {
    const wrapper = mount(HomeLogoSlot, {
      props: {
        html: '<div data-syn-formatter="home-logo"><h1>SYNCTROL</h1></div>',
        seoTitle: 'Home SEO',
      },
    })
    expect(wrapper.find('[data-testid="home-logo"]').html()).toContain('SYNCTROL')
    expect(wrapper.text()).not.toContain('Home SEO')
  })

  it('renders optional footer HTML or empty content', () => {
    expect(mount(HomeFooterSlot, { props: { html: undefined } }).find('[data-testid="home-footer"]').text()).toBe('')
    expect(mount(HomeFooterSlot, { props: { html: '<p>Contact</p>' } }).text()).toContain('Contact')
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- tests/compiler/markdown/home-formatters.test.ts tests/client/components/home-formatters.test.ts`

Expected: FAIL with missing modules or dependencies.

- [ ] **Step 5: Implement formatter helpers and assertion**

Implementation requirements:
- `registerHomeFormatters(md)` uses `markdown-it-container` for names `home-logo` and `home-footer`, returning wrappers:
  - opening: `<div class="syn-formatter syn-formatter--${name}" data-syn-formatter="${name}">\n`
  - closing: `</div>\n`
- `assertHomeHasLogo(source, filePath)` accepts both `:::` and longer marker fences; use a regex anchored to line start such as `/^:{3,}\s*home-logo\s*$/m`.
- In `src/compiler/locale-markdown.ts`, after `type === 'home'` body extraction and description validation, call `assertHomeHasLogo(markdown.body, filePath)` before returning Home markdown.
- `extractHomeFormatterHtml(renderedHtml)` extracts the complete generated wrapper for `home-logo` and optional `home-footer`; throw if logo is absent.
- `buildHomeFrontmatterForPage` renders the Home body with an internal `MarkdownIt` instance using `registerHomeFormatters`, extracts HTML, and returns `null` for non-Home compiled pages.

- [ ] **Step 6: Add exact VuePress hook in theme**

Patch only `src/compiler/theme.ts`:

```ts
import { registerHomeFormatters } from './markdown/home-formatters.js'

// inside returned ThemeObject
extendsMarkdown: (md): void => {
  registerHomeFormatters(md)
},
```

Keep `onInitialized`, `extendsBundlerOptions`, and `onGenerated` behavior intact.

- [ ] **Step 7: Implement Home slot components**

`HomeLogoSlot.vue` renders `html` with `v-html` inside `data-testid="home-logo"` and does not render `seoTitle`. `HomeFooterSlot.vue` renders an empty `data-testid="home-footer"` wrapper when `html` is absent.

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- tests/compiler/markdown/home-formatters.test.ts tests/client/components/home-formatters.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/compiler/markdown/home-formatters.ts src/compiler/home/extract-home-formatter-html.ts src/compiler/home/build-home-frontmatter.ts src/compiler/locale-markdown.ts src/compiler/theme.ts src/client/components/home/HomeLogoSlot.vue src/client/components/home/HomeFooterSlot.vue tests/compiler/markdown/home-formatters.test.ts tests/client/components/home-formatters.test.ts
git commit -m "feat(home): add home markdown formatters"
```

---

### Task 11: Theme/Layout wiring and integration fixtures

**Files:**
- Modify: `src/compiler/theme.ts`
- Modify: `src/client/layouts/Layout.vue`
- Extend: `tests/compiler/theme.integration.test.ts`
- Create: `tests/integration/news-page-fixtures.test.ts`
- Create: `tests/fixtures/news-page-site/**`

**Interfaces:**
- Consumes: Tasks 1-10 frontmatter builders/layouts/components
- Produces: additive runtime wiring for `frontmatter.synctrol.news/page/home`; single `Layout.vue` switch; integration coverage using HEAD compiler signatures

- [ ] **Step 1: Extend theme integration smoke**

Add coverage to `tests/compiler/theme.integration.test.ts` by reusing the existing `runBuild` helper style:
- Assert a generated News detail page has `frontmatter.synctrol.news.kind === 'detail'`.
- Assert a generated News index page has `frontmatter.synctrol.news.kind === 'index'`.
- Assert a generated Page detail has `frontmatter.synctrol.page.kind === 'detail'`.
- Assert the Home page has `frontmatter.synctrol.home.logoHtml`.
- Assert existing `frontmatter.synctrol.contentAssets`, `release`, `platformDefinitions`, and `alternates` tests still pass unchanged.

- [ ] **Step 2: Write integration fixture test with HEAD compiler signatures**

```ts
// tests/integration/news-page-fixtures.test.ts
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileContent } from '../../src/compiler/compile-content'
import { compileSiteRoutes } from '../../src/compiler/compile-site-routes'
import { buildRoutePackages } from '../../src/compiler/route-packages'
import { buildNewsFrontmatterForPage } from '../../src/compiler/news/attach-news-page-data'
import { buildPageFrontmatterForPage } from '../../src/compiler/page/attach-page-page-data'
import { themeOptions } from '../helpers/route-fixtures'

const fixtureRoot = resolve('tests/fixtures/news-page-site')

function compileFixture(overrides = {}, base = '/base/') {
  const options = themeOptions(overrides)
  const content = compileContent({
    contentRoot: join(fixtureRoot, 'content'),
    sourceDir: fixtureRoot,
    configDir: join(fixtureRoot, '.vuepress'),
    mainLocale: options.mainLocale,
  })
  const packages = buildRoutePackages({
    packages: content.packages,
    localeKeys: Object.keys(options.locales),
  })
  const site = compileSiteRoutes({
    packages,
    options,
    base,
    declaredTags: Object.keys(content.definitions.tags),
  })
  return { options, content, packages, site }
}

describe('news and page integration fixture', () => {
  it('emits default routes, fallback list data, tag counts, and page frontmatter', () => {
    const { options, content, packages, site } = compileFixture()
    const paths = site.pages.map((page) => page.url.publicPath)
    expect(paths).toContain('/base/zh/news/')
    expect(paths).toContain('/base/zh/news/tags/')
    expect(paths).toContain('/base/zh/news/tags/release/')
    expect(paths).toContain('/base/en/news/beta/')
    expect(paths).toContain('/base/zh/team/')
    expect(paths).not.toContain('/base/zh/pages/')

    const enIndex = site.pages.find((page) => page.url.publicPath === '/base/en/news/')
    const enIndexData = buildNewsFrontmatterForPage({
      compiled: enIndex!,
      allPages: site.pages,
      packages,
      options,
      definitions: content.definitions,
      resolveCoverPublicPath: (pkg, rel) => `/base/assets/${pkg.slug}/${rel}`,
      base: '/base/',
    })
    const beta = enIndexData?.data.items.find((item) => item.slug === 'beta')
    expect(beta).toMatchObject({ isFallback: true, excludeFromRss: true, titleLang: 'zh-CN' })

    const team = site.pages.find((page) => page.url.publicPath === '/base/zh/team/')
    expect(
      buildPageFrontmatterForPage({
        compiled: team!,
        packages,
        options,
        resolveCoverPublicPath: () => '/base/assets/team.webp',
      }),
    ).toMatchObject({ kind: 'detail', data: { kind: 'page-detail' } })
  })

  it('honors custom urlSegments and enabled flags', () => {
    const { site } = compileFixture({
      news: {
        urlSegment: 'journal',
        index: { enabled: false, pagination: 12 },
        tags: { urlSegment: 'topics', index: { enabled: false } },
      },
    })
    const paths = site.pages.map((page) => page.url.publicPath)
    expect(paths).not.toContain('/base/zh/journal/')
    expect(paths).not.toContain('/base/zh/journal/topics/')
    expect(paths).toContain('/base/zh/journal/alpha/')
    expect(paths).toContain('/base/zh/journal/topics/release/')
  })
})
```

- [ ] **Step 3: Add fixture tree**

Create `tests/fixtures/news-page-site/`:

```text
tests/fixtures/news-page-site/
├── .vuepress/
│   └── config.ts
└── content/
    ├── definitions.yml
    ├── home/
    │   ├── content.yml
    │   ├── zh.md
    │   └── en.md
    ├── news/
    │   ├── alpha/
    │   │   ├── content.yml
    │   │   ├── zh.md
    │   │   └── en.md
    │   └── beta/
    │       ├── content.yml
    │       └── zh.md
    └── pages/
        └── team/
            ├── content.yml
            ├── zh.md
            └── en.md
```

Minimal `content/definitions.yml`:

```yaml
tags:
  release:
    title:
      zh: 作品发布
      en: Releases
platforms: {}
```

Home Markdown files must include `::: home-logo`; `home-footer` may be present in only one locale to prove it is optional.

- [ ] **Step 4: Patch `theme.ts` additively**

Inside the existing `for (const compiled of allPages)` loop:
- Keep existing `contentAssets`, `alternates`, `platformDefinitions`, and `release` calculation.
- Add:
  - `const news = buildNewsFrontmatterForPage({ compiled, allPages, packages, options: resolved, definitions: built.definitions, resolveCoverPublicPath: ..., base: app.options.base })`
  - `const pageFrontmatter = buildPageFrontmatterForPage({ compiled, packages, options: resolved, resolveCoverPublicPath: ... })`
  - `const home = buildHomeFrontmatterForPage({ compiled, packages })`
- Resolve covers through Plan 04 `assetManifest.contentPublicPaths[pkg.identity]?.[relativePath]`; return the `publicPath`.
- Stamp:

```ts
synctrol: {
  identity: compiled.identity,
  locale: compiled.locale,
  contentType: compiled.contentType,
  isFallback: compiled.isFallback,
  isDraft: compiled.isDraft,
  noindex: compiled.noindex,
  bodyLocale: compiled.bodyLocale,
  canonicalLocale: compiled.canonicalLocale,
  routePath: compiled.url.routePath,
  contentAssets,
  alternates,
  platformDefinitions,
  ...(release === null ? {} : { release }),
  ...(news === null ? {} : { news }),
  ...(pageFrontmatter === null ? {} : { page: pageFrontmatter }),
  ...(home === null ? {} : { home }),
}
```

Do not remove any Plan 03-08 fields or hooks.

- [ ] **Step 5: Patch only `Layout.vue` for runtime switch**

Implementation requirements:
- Import News/Page/Home layouts and shared types.
- Extend `SynctrolFrontmatter` with:

```ts
news?: SynctrolNewsFrontmatter
page?: SynctrolPageFrontmatter
home?: SynctrolHomeFrontmatter
```

- Add computed `formatDate`:

```ts
const localeOption = computed(
  () => theme.locales[locale.value] ?? theme.locales[theme.mainLocale],
)
const formatDate = (date: string) =>
  formatCalendarDate(date, localeOption.value.lang, localeOption.value.dateFormat)
```

- Template order:
  1. `<ReleaseIndex v-if="release?.kind === 'index'" ... />`
  2. `<ReleaseDetail v-else-if="release?.kind === 'detail'" ... />`
  3. `<NewsIndexLayout v-else-if="news?.kind === 'index'" ... />`
  4. `<NewsTagsIndexLayout v-else-if="news?.kind === 'tags-index'" ... />`
  5. `<NewsTagArchiveLayout v-else-if="news?.kind === 'tag'" ... />`
  6. `<NewsDetailLayout v-else-if="news?.kind === 'detail'" ...><Content /></NewsDetailLayout>`
  7. `<PageDetailLayout v-else-if="pageFrontmatter?.kind === 'detail'" ...><Content /></PageDetailLayout>`
  8. `<HomeLogoSlot v-else-if="home?.kind === 'home'" :html="home.logoHtml" :seo-title="String(page.frontmatter.title ?? '')" />`
  9. `<Content v-else />`
- Target `ShellLayout` footer slot:

```vue
<template #footer>
  <HomeFooterSlot v-if="home?.kind === 'home'" :html="home.footerHtml" />
</template>
```

- [ ] **Step 6: Run targeted tests**

Run:

```bash
npm test -- tests/compiler/theme.integration.test.ts tests/integration/news-page-fixtures.test.ts tests/client/layouts/news-collections.test.ts tests/client/layouts/news-detail.test.ts tests/client/layouts/page-detail.test.ts tests/client/components/home-formatters.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run full Plan 09 suite**

Run:

```bash
npm test -- tests/shared/format-message.test.ts tests/shared/news-types.test.ts tests/shared/format-calendar-date.test.ts tests/compiler/news tests/compiler/page tests/compiler/markdown/home-formatters.test.ts tests/client/components/shared-content-components.test.ts tests/client/components/news-list.test.ts tests/client/components/home-formatters.test.ts tests/client/layouts tests/compiler/theme.integration.test.ts tests/integration/news-page-fixtures.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/compiler/theme.ts src/client/layouts/Layout.vue tests/compiler/theme.integration.test.ts tests/integration/news-page-fixtures.test.ts tests/fixtures/news-page-site
git commit -m "feat(theme): wire news page and home frontmatter into layout"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
| --- | --- |
| Typed News/Page/Home frontmatter under `frontmatter.synctrol` | Tasks 1, 4, 9, 10, 11 |
| Single `Layout.vue` switch after Release handling | Task 11 |
| Shared `ContentColumn.vue` and `PaginationNav.vue` | Task 5; consumed Tasks 7-9 |
| Current type/module names and NodeNext `.js` imports | All implementation snippets under `src/**` |
| Base-aware News detail/tag/pagination links | Tasks 2-4, 11 |
| Exact VuePress markdown hook for Home formatters | Task 10 |
| Assertion during Home content parsing | Task 10 (`locale-markdown.ts`) |
| Home HTML stored under `frontmatter.synctrol.home` and rendered in `ShellLayout` footer slot | Tasks 10-11 |
| Existing `format-message.ts` and `DraftBadge.vue` reused | Tasks 1 and 5 |
| HEAD compiler signatures in integration tests | Task 11 |
| `formatCalendarDate` concrete approach | Task 6 and Task 11 |
| Direct `markdown-it-container` dependency if imported | Task 10 |
| Additive `theme.ts` patch preserving Plans 03-08 fields | Task 11 |

### Placeholder scan

No placeholder markers remain. Each task has exact paths, commands, and concrete interfaces.

### Type consistency

- `NewsListItem.coverPublicPath` is used consistently in compiler and client tasks.
- `SynctrolNewsFrontmatter.kind` maps directly to `Layout.vue` branches.
- `SynctrolPageFrontmatter.kind` is `detail` only.
- `SynctrolHomeFrontmatter.logoHtml/footerHtml` are the only Home runtime HTML fields.
- `formatMessage` remains exported from `src/platforms/format-message.ts` at package root.
- `ContentDefinitions`, `ResolvedSynctrolThemeOptions`, `ContentIdentity`, `encodeRouteSegment`, and `buildUrlLayers` match HEAD modules.

### Intentionally deferred

- RSS/Sitemap emission and `excludeFromRss` enforcement: Plan 10.
- News Article JSON-LD / OG tags: Plan 10.
- NPM packaging and publish verification: Plan 11.
- Custom client platform component bundling: outside Plan 09.
