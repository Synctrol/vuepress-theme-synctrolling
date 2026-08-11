# Package Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `vuepress-theme-synctrolling` package skeleton with shared TypeScript types, theme-option defaults, fixed CSS tokens, and a Vitest harness that later plans can extend.

**Architecture:** The theme is an npm package consumed by a VuePress 2 site. This plan establishes the public entrypoint, pure TypeScript option/types modules with no Vue runtime yet, and CSS tokens that encode the Synctrol brand constraints. Later plans plug compiler and client modules into this package without renaming the public API.

**Tech Stack:** VuePress 2 (`vuepress` ^2.0.0), Vue 3, TypeScript 5.x, Vitest, Node.js 20+, ESM package type.

## Global Constraints

- Package name is `vuepress-theme-synctrolling`.
- Content types are only `home | release | news | page`.
- Brand tokens are fixed: black/white, `3px` strong border, `0` radius, Archivo Black display face, golden-ratio desktop grid.
- There is no `contentDir`, full route-template, visual-token, breakpoint, SocialLinks icon-size, or Release artwork-loading option.
- `definitionsPath` defaults to `<sourceDir>/content/definitions.yml` and may be configured independently.
- `urlSegment` is one scalar string shared by every locale.
- Release index defaults: `pagination: 12`, `mobileGridColumns: 2`, `desktopGridColumns: 3`.
- News index defaults: `pagination: 12`; tags segment defaults to `tags`.
- `defaultColorMode` defaults to `auto`; ThemeMode cycle remains `AUTO → LIGHT → DARK → AUTO`.
- Platform `loadStrategy` defaults to `interaction`; immediate loading is unsupported.
- All later tasks inherit these constraints.

---

### Task 1: Scaffold the theme package and test runner

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `tests/smoke.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: none
- Produces: npm package `vuepress-theme-synctrolling` with ESM exports; Vitest runnable via `npm test`

- [ ] **Step 1: Write the failing smoke test**

```ts
// tests/smoke.test.ts
import { describe, expect, it } from 'vitest'
import { synctrolTheme } from '../src/index'

describe('package smoke', () => {
  it('exports synctrolTheme as a function', () => {
    expect(typeof synctrolTheme).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/smoke.test.ts`

Expected: FAIL because `src/index.ts` / package scripts do not exist yet, or `synctrolTheme` is undefined.

- [ ] **Step 3: Write minimal package scaffold**

```json
{
  "name": "vuepress-theme-synctrolling",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./client": {
      "types": "./dist/client/index.d.ts",
      "default": "./dist/client/index.js"
    }
  },
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "vue": "^3.5.0",
    "vuepress": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0",
    "vue": "^3.5.0",
    "vuepress": "^2.0.0"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

```ts
// src/index.ts
export function synctrolTheme() {
  return {
    name: 'vuepress-theme-synctrolling',
  }
}
```

```md
# vuepress-theme-synctrolling

Synctrol-specific VuePress 2 theme.

## Develop

```bash
npm install
npm test
```
```

- [ ] **Step 4: Install and run the smoke test**

Run:

```bash
npm install
npm test -- tests/smoke.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/index.ts tests/smoke.test.ts README.md
git commit -m "chore: scaffold vuepress-theme-synctrolling package"
```

---

### Task 2: Shared content and locale types

**Files:**
- Create: `src/shared/types.ts`
- Create: `tests/shared/types.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: package scaffold from Task 1
- Produces: `ContentType`, `LocaleKey`, `Multilanguage`, `LocaleMessages`, `LocaleOptions`, `BuiltInPlatformType`, Book interfaces

- [ ] **Step 1: Write the failing type-contract tests**

```ts
// tests/shared/types.test.ts
import { describe, expect, it } from 'vitest'
import type {
  AlbumBook,
  ContentType,
  GiftBook,
  LocaleMessages,
  Multilanguage,
} from '../../src/shared/types'
import { CONTENT_TYPES, isMultilanguageMap } from '../../src/shared/types'

describe('shared types', () => {
  it('exposes the four content types', () => {
    expect(CONTENT_TYPES).toEqual(['home', 'release', 'news', 'page'])
  })

  it('detects multilanguage maps versus scalars', () => {
    expect(isMultilanguageMap('SYNCTROL')).toBe(false)
    expect(isMultilanguageMap({ zh: '第一张专辑', en: 'First Album' })).toBe(true)
  })

  it('accepts album and gift book discriminators', () => {
    const album: AlbumBook = {
      type: 'album',
      title: 'Demo',
      album: { covers: [], links: [], discs: [] },
    }
    const gift: GiftBook = {
      type: 'gift',
      title: { zh: '周边', en: 'Gifts' },
      gift: { items: [] },
    }
    expect(album.type).toBe('album')
    expect(gift.type).toBe('gift')
  })

  it('requires locale message keys used by the shell', () => {
    const required: Array<keyof LocaleMessages> = [
      'draft',
      'translationUnavailable',
      'light',
      'dark',
      'auto',
      'menu',
      'close',
      'language',
      'themeModeAnnouncement',
      'returnToReleases',
      'published',
      'previousPage',
      'nextPage',
      'updated',
      'authors',
      'album',
      'tracklist',
      'disc',
      'track',
      'covers',
      'platformLinks',
      'gifts',
      'giftItems',
      'readMore',
      'activateEmbed',
      'embedFailed',
      'openExternal',
      'emptyReleases',
      'emptyNews',
      'paginatedTitle',
      'tagArchiveTitle',
    ]
    expect(required.length).toBe(31)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/shared/types.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement shared types**

```ts
// src/shared/types.ts
export const CONTENT_TYPES = ['home', 'release', 'news', 'page'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]
export type LocaleKey = string

export type Multilanguage =
  | string
  | Record<LocaleKey, string>

export function isMultilanguageMap(
  value: Multilanguage,
): value is Record<LocaleKey, string> {
  return typeof value === 'object' && value !== null
}

export interface LocaleMessages {
  draft: string
  translationUnavailable: string
  light: string
  dark: string
  auto: string
  menu: string
  close: string
  language: string
  themeModeAnnouncement: string
  returnToReleases: string
  published: string
  previousPage: string
  nextPage: string
  updated: string
  authors: string
  album: string
  tracklist: string
  disc: string
  track: string
  covers: string
  platformLinks: string
  gifts: string
  giftItems: string
  readMore: string
  activateEmbed: string
  embedFailed: string
  openExternal: string
  emptyReleases: string
  emptyNews: string
  paginatedTitle: string
  tagArchiveTitle: string
}

export interface LocaleOptions {
  lang: string
  label: string
  dateFormat?: Intl.DateTimeFormatOptions
  messages?: Partial<LocaleMessages>
}

export type BuiltInPlatformType =
  | 'link'
  | 'audio_player'
  | 'youtube_player'
  | 'bilibili_player'
  | 'apple_music_player'
  | 'spotify_player'
  | 'soundcloud_player'
  | 'netease_player'

export type AssetPath = string

export interface PlatformEntryBase {
  platform: string
  label?: Multilanguage
}

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
    links?: PlatformEntryBase[]
    discs?: Disc[]
  }
}

export interface GiftItem {
  id: string
  title: Multilanguage
  desc?: Multilanguage
  covers?: AssetPath[]
  links?: PlatformEntryBase[]
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

- [ ] **Step 4: Re-export types and run tests**

```ts
// src/index.ts
export function synctrolTheme() {
  return {
    name: 'vuepress-theme-synctrolling',
  }
}

export * from './shared/types.js'
```

Run: `npm test -- tests/shared/types.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/index.ts tests/shared/types.test.ts
git commit -m "feat: add shared content and locale types"
```

---

### Task 3: Default locale messages

**Files:**
- Create: `src/shared/messages.ts`
- Create: `tests/shared/messages.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `LocaleMessages` from `src/shared/types.ts`
- Produces: `zhMessages`, `enMessages`

- [ ] **Step 1: Write the failing messages test**

```ts
// tests/shared/messages.test.ts
import { describe, expect, it } from 'vitest'
import { enMessages, zhMessages } from '../../src/shared/messages'
import type { LocaleMessages } from '../../src/shared/types'

const keys = Object.keys(enMessages) as Array<keyof LocaleMessages>

describe('default locale messages', () => {
  it('exports complete chinese and english catalogs with the same keys', () => {
    expect(Object.keys(zhMessages).sort()).toEqual(keys.sort())
    expect(keys).toHaveLength(31)
  })

  it('uses the approved english translation-unavailable copy', () => {
    expect(enMessages.translationUnavailable).toBe(
      'This article is not yet available in English. Showing the original version.',
    )
  })

  it('includes the required content-facing chinese defaults', () => {
    expect(zhMessages.published).toBe('发布于')
    expect(zhMessages.updated).toBe('更新于')
    expect(zhMessages.authors).toBe('作者')
    expect(zhMessages.album).toBe('专辑')
    expect(zhMessages.tracklist).toBe('曲目列表')
    expect(zhMessages.disc).toBe('第 {number} 碟')
    expect(zhMessages.track).toBe('第 {number} 曲')
    expect(zhMessages.covers).toBe('封面')
    expect(zhMessages.platformLinks).toBe('收听与获取')
    expect(zhMessages.gifts).toBe('周边')
    expect(zhMessages.giftItems).toBe('周边清单')
    expect(zhMessages.readMore).toBe('阅读更多')
    expect(zhMessages.returnToReleases).toBe('返回作品列表')
    expect(zhMessages.emptyReleases).toBe('暂无作品')
    expect(zhMessages.emptyNews).toBe('暂无新闻')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/shared/messages.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement message catalogs**

```ts
// src/shared/messages.ts
import type { LocaleMessages } from './types.js'

export const zhMessages: LocaleMessages = {
  draft: '草稿',
  translationUnavailable: '该内容暂未提供中文版本，正在显示原始版本。',
  light: '亮色',
  dark: '暗色',
  auto: '自动',
  menu: '菜单',
  close: '关闭',
  language: '语言',
  themeModeAnnouncement: '当前主题模式 {current}，下一个 {next}',
  returnToReleases: '返回作品列表',
  published: '发布于',
  previousPage: '上一页',
  nextPage: '下一页',
  updated: '更新于',
  authors: '作者',
  album: '专辑',
  tracklist: '曲目列表',
  disc: '第 {number} 碟',
  track: '第 {number} 曲',
  covers: '封面',
  platformLinks: '收听与获取',
  gifts: '周边',
  giftItems: '周边清单',
  readMore: '阅读更多',
  activateEmbed: '播放 {platform}',
  embedFailed: '{platform} 加载失败',
  openExternal: '打开 {platform}',
  emptyReleases: '暂无作品',
  emptyNews: '暂无新闻',
  paginatedTitle: '{title} · 第 {page} 页',
  tagArchiveTitle: '{tag} · {title}',
}

export const enMessages: LocaleMessages = {
  draft: 'DRAFT',
  translationUnavailable:
    'This article is not yet available in English. Showing the original version.',
  light: 'LIGHT',
  dark: 'DARK',
  auto: 'AUTO',
  menu: 'MENU',
  close: 'CLOSE',
  language: 'Language',
  themeModeAnnouncement: 'Theme mode {current}, next {next}',
  returnToReleases: 'Back to Releases',
  published: 'Published',
  previousPage: 'Previous',
  nextPage: 'Next',
  updated: 'Updated',
  authors: 'Authors',
  album: 'Album',
  tracklist: 'Tracklist',
  disc: 'Disc {number}',
  track: 'Track {number}',
  covers: 'Covers',
  platformLinks: 'Listen & Get',
  gifts: 'Gifts',
  giftItems: 'Gift Items',
  readMore: 'Read More',
  activateEmbed: 'Play {platform}',
  embedFailed: '{platform} failed to load',
  openExternal: 'Open {platform}',
  emptyReleases: 'No releases',
  emptyNews: 'No news',
  paginatedTitle: '{title} · Page {page}',
  tagArchiveTitle: '{tag} · {title}',
}
```

Update `src/index.ts`:

```ts
export * from './shared/messages.js'
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/shared/messages.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/messages.ts src/index.ts tests/shared/messages.test.ts
git commit -m "feat: add default chinese and english locale messages"
```

---

### Task 4: Theme option types and defaults

**Files:**
- Create: `src/shared/options.ts`
- Create: `tests/shared/options.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: types and messages from Tasks 2–3
- Produces: `SynctrolThemeOptions`, `resolveThemeOptions()`, default `release`/`news`/`feeds`/`platforms`/`navigation`/`socialLinks`

- [ ] **Step 1: Write the failing options test**

```ts
// tests/shared/options.test.ts
import { describe, expect, it } from 'vitest'
import { resolveThemeOptions } from '../../src/shared/options'
import { enMessages, zhMessages } from '../../src/shared/messages'

describe('resolveThemeOptions', () => {
  const base = {
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    copyright: 'SYNCTROL © 2026',
    locales: {
      zh: { lang: 'zh-CN', label: '中文' },
      en: { lang: 'en-US', label: 'English' },
    },
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
  }

  it('fills collection, feed, color-mode, and platform defaults', () => {
    const options = resolveThemeOptions(base)
    expect(options.defaultColorMode).toBe('auto')
    expect(options.feeds).toEqual({ rss: true, sitemap: true })
    expect(options.release).toEqual({
      urlSegment: 'releases',
      index: {
        enabled: true,
        pagination: 12,
        mobileGridColumns: 2,
        desktopGridColumns: 3,
      },
    })
    expect(options.news).toEqual({
      urlSegment: 'news',
      index: {
        enabled: true,
        pagination: 12,
      },
      tags: {
        urlSegment: 'tags',
        index: { enabled: true },
      },
    })
    expect(options.platforms).toEqual({
      loadStrategy: 'interaction',
      types: {},
    })
    expect(options.navigation).toEqual({
      externalTarget: '_blank',
      items: [],
    })
    expect(options.socialLinks).toEqual({ items: [] })
  })

  it('merges locale message overrides onto zh/en defaults', () => {
    const options = resolveThemeOptions({
      ...base,
      locales: {
        zh: {
          lang: 'zh-CN',
          label: '中文',
          messages: { draft: '未发布' },
        },
        en: {
          lang: 'en-US',
          label: 'English',
        },
      },
    })
    expect(options.locales.zh.messages.draft).toBe('未发布')
    expect(options.locales.zh.messages.emptyNews).toBe(zhMessages.emptyNews)
    expect(options.locales.en.messages).toEqual(enMessages)
    expect(options.locales.zh.dateFormat).toEqual({ dateStyle: 'long' })
  })

  it('rejects invalid release grid columns and url segments', () => {
    expect(() =>
      resolveThemeOptions({
        ...base,
        release: {
          urlSegment: 'releases/extra',
          index: {
            enabled: true,
            pagination: 12,
            mobileGridColumns: 2,
            desktopGridColumns: 3,
          },
        },
      }),
    ).toThrow(/urlSegment/)

    expect(() =>
      resolveThemeOptions({
        ...base,
        release: {
          urlSegment: 'releases',
          index: {
            enabled: true,
            pagination: 12,
            mobileGridColumns: 4,
            desktopGridColumns: 3,
          },
        },
      }),
    ).toThrow(/mobileGridColumns/)
  })

  it('requires complete messages for non-default locales', () => {
    expect(() =>
      resolveThemeOptions({
        ...base,
        locales: {
          ...base.locales,
          ja: {
            lang: 'ja-JP',
            label: '日本語',
            messages: { draft: '下書き' },
          },
        },
      }),
    ).toThrow(/messages/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/shared/options.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement option resolution**

```ts
// src/shared/options.ts
import { enMessages, zhMessages } from './messages.js'
import type {
  ContentType,
  LocaleKey,
  LocaleMessages,
  LocaleOptions,
  Multilanguage,
  PlatformEntryBase,
} from './types.js'

export type UrlSegment = string

export interface NavigationItem {
  label: Multilanguage
  href: Multilanguage
}

export interface NavigationOptions {
  items: NavigationItem[]
  externalTarget: '_blank' | '_self'
}

export interface SocialLink {
  label: Multilanguage
  icon: string
  url: string
}

export interface SocialLinksOptions {
  items: SocialLink[]
}

export interface ReleaseOptions {
  urlSegment: UrlSegment
  index: {
    enabled: boolean
    pagination: number | false
    mobileGridColumns: number
    desktopGridColumns: number
  }
  artworkPlaceholder?: string
}

export interface NewsOptions {
  urlSegment: UrlSegment
  index: {
    enabled: boolean
    pagination: number | false
  }
  tags: {
    urlSegment: UrlSegment
    index: {
      enabled: boolean
    }
  }
}

export interface PlatformTypeRegistration<T extends PlatformEntryBase = PlatformEntryBase> {
  validate(entry: unknown): T
  component: unknown
  cspOrigins(entry: T): string[]
  fallbackUrl?(entry: T): string
}

export interface PlatformsOptions {
  loadStrategy: 'interaction' | 'viewport'
  types: Record<string, PlatformTypeRegistration>
}

export interface SeoCollectionCopy {
  title: Multilanguage
  description: Multilanguage
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

export type BackgroundLoader = () => Promise<unknown>

export interface SynctrolThemeOptions {
  siteUrl: string
  definitionsPath?: string
  mainLocale: LocaleKey
  locales: Record<LocaleKey, LocaleOptions>
  showDrafts?: boolean
  defaultColorMode?: 'auto' | 'light' | 'dark'
  copyright: Multilanguage
  feeds?: {
    rss: boolean
    sitemap: boolean
  }
  navigation?: NavigationOptions
  socialLinks?: SocialLinksOptions
  release?: ReleaseOptions
  news?: NewsOptions
  platforms?: PlatformsOptions
  backgrounds?: Partial<Record<ContentType, BackgroundLoader>>
  seo: SeoOptions
}

export interface ResolvedLocaleOptions {
  lang: string
  label: string
  dateFormat: Intl.DateTimeFormatOptions
  messages: LocaleMessages
}

export interface ResolvedSynctrolThemeOptions {
  siteUrl: string
  definitionsPath?: string
  mainLocale: LocaleKey
  locales: Record<LocaleKey, ResolvedLocaleOptions>
  showDrafts: boolean
  defaultColorMode: 'auto' | 'light' | 'dark'
  copyright: Multilanguage
  feeds: { rss: boolean; sitemap: boolean }
  navigation: NavigationOptions
  socialLinks: SocialLinksOptions
  release: ReleaseOptions
  news: NewsOptions
  platforms: PlatformsOptions
  backgrounds: Partial<Record<ContentType, BackgroundLoader>>
  seo: SeoOptions
}

const DEFAULT_MESSAGES: Record<'zh' | 'en', LocaleMessages> = {
  zh: zhMessages,
  en: enMessages,
}

function assertUrlSegment(value: string, field: string): void {
  if (!value || /[/?#]/.test(value) || value === '.' || value === '..') {
    throw new Error(`Invalid ${field}: ${value}`)
  }
}

function assertPagination(value: number | false, field: string): void {
  if (value === false) return
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid ${field}: ${value}`)
  }
}

function resolveMessages(
  localeKey: LocaleKey,
  partial?: Partial<LocaleMessages>,
): LocaleMessages {
  const defaults = DEFAULT_MESSAGES[localeKey as 'zh' | 'en']
  if (defaults) {
    return { ...defaults, ...partial }
  }
  if (!partial) {
    throw new Error(`Locale ${localeKey} requires complete messages`)
  }
  const required = Object.keys(enMessages) as Array<keyof LocaleMessages>
  for (const key of required) {
    if (typeof partial[key] !== 'string') {
      throw new Error(`Locale ${localeKey} messages missing ${key}`)
    }
  }
  return partial as LocaleMessages
}

export function resolveThemeOptions(
  input: SynctrolThemeOptions,
): ResolvedSynctrolThemeOptions {
  if (!input.locales[input.mainLocale]) {
    throw new Error(`mainLocale ${input.mainLocale} is not configured`)
  }

  const release: ReleaseOptions = {
    urlSegment: input.release?.urlSegment ?? 'releases',
    index: {
      enabled: input.release?.index.enabled ?? true,
      pagination: input.release?.index.pagination ?? 12,
      mobileGridColumns: input.release?.index.mobileGridColumns ?? 2,
      desktopGridColumns: input.release?.index.desktopGridColumns ?? 3,
    },
    artworkPlaceholder: input.release?.artworkPlaceholder,
  }

  assertUrlSegment(release.urlSegment, 'release.urlSegment')
  assertPagination(release.index.pagination, 'release.index.pagination')
  if (
    release.index.mobileGridColumns < 1 ||
    release.index.mobileGridColumns > 3
  ) {
    throw new Error('Invalid mobileGridColumns')
  }
  if (
    release.index.desktopGridColumns < 1 ||
    release.index.desktopGridColumns > 6
  ) {
    throw new Error('Invalid desktopGridColumns')
  }

  const news: NewsOptions = {
    urlSegment: input.news?.urlSegment ?? 'news',
    index: {
      enabled: input.news?.index.enabled ?? true,
      pagination: input.news?.index.pagination ?? 12,
    },
    tags: {
      urlSegment: input.news?.tags.urlSegment ?? 'tags',
      index: {
        enabled: input.news?.tags.index.enabled ?? true,
      },
    },
  }

  assertUrlSegment(news.urlSegment, 'news.urlSegment')
  assertUrlSegment(news.tags.urlSegment, 'news.tags.urlSegment')
  assertPagination(news.index.pagination, 'news.index.pagination')

  const locales: Record<LocaleKey, ResolvedLocaleOptions> = {}
  for (const [key, locale] of Object.entries(input.locales)) {
    locales[key] = {
      lang: locale.lang,
      label: locale.label,
      dateFormat: locale.dateFormat ?? { dateStyle: 'long' },
      messages: resolveMessages(key, locale.messages),
    }
  }

  return {
    siteUrl: input.siteUrl.replace(/\/$/, ''),
    definitionsPath: input.definitionsPath,
    mainLocale: input.mainLocale,
    locales,
    showDrafts: input.showDrafts ?? false,
    defaultColorMode: input.defaultColorMode ?? 'auto',
    copyright: input.copyright,
    feeds: {
      rss: input.feeds?.rss ?? true,
      sitemap: input.feeds?.sitemap ?? true,
    },
    navigation: {
      externalTarget: input.navigation?.externalTarget ?? '_blank',
      items: input.navigation?.items ?? [],
    },
    socialLinks: {
      items: input.socialLinks?.items ?? [],
    },
    release,
    news,
    platforms: {
      loadStrategy: input.platforms?.loadStrategy ?? 'interaction',
      types: input.platforms?.types ?? {},
    },
    backgrounds: input.backgrounds ?? {},
    seo: input.seo,
  }
}
```

Update `src/index.ts`:

```ts
import type { SynctrolThemeOptions } from './shared/options.js'
import { resolveThemeOptions } from './shared/options.js'

export function synctrolTheme(options: SynctrolThemeOptions) {
  const resolved = resolveThemeOptions(options)
  return {
    name: 'vuepress-theme-synctrolling',
    // Later plans attach plugins/layouts using `resolved`.
    define: {
      __SYNCTROL_THEME_OPTIONS__: resolved,
    },
  }
}

export * from './shared/types.js'
export * from './shared/messages.js'
export * from './shared/options.js'
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/shared/options.test.ts tests/smoke.test.ts
```

Expected: PASS. Update `tests/smoke.test.ts` if needed so it constructs minimal valid options:

```ts
import { describe, expect, it } from 'vitest'
import { synctrolTheme } from '../src/index'

describe('package smoke', () => {
  it('creates a named theme from resolved options', () => {
    const theme = synctrolTheme({
      siteUrl: 'https://synctrol.com',
      mainLocale: 'zh',
      copyright: 'SYNCTROL © 2026',
      locales: {
        zh: { lang: 'zh-CN', label: '中文' },
        en: { lang: 'en-US', label: 'English' },
      },
      seo: {
        name: 'Synctrol',
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
    })
    expect(theme.name).toBe('vuepress-theme-synctrolling')
  })
})
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/options.ts src/index.ts tests/shared/options.test.ts tests/smoke.test.ts
git commit -m "feat: resolve synctrol theme options and defaults"
```

---

### Task 5: Fixed CSS tokens

**Files:**
- Create: `src/client/styles/tokens.css`
- Create: `tests/client/tokens.test.ts`
- Create: `src/client/styles/index.ts`

**Interfaces:**
- Consumes: brand constraints from the spec
- Produces: CSS custom properties consumed by later shell plans

- [ ] **Step 1: Write the failing token presence test**

```ts
// tests/client/tokens.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('design tokens', () => {
  it('defines the fixed synctrol brand variables', () => {
    const css = readFileSync(
      resolve('src/client/styles/tokens.css'),
      'utf8',
    )
    expect(css).toContain('--syn-black: #000;')
    expect(css).toContain('--syn-white: #fff;')
    expect(css).toContain('--syn-border-strong: 3px solid currentColor;')
    expect(css).toContain('--syn-border-subtle: 1px solid currentColor;')
    expect(css).toContain('--syn-radius: 0;')
    expect(css).toContain('--syn-content-width: 760px;')
    expect(css).toContain('--syn-artwork-width: 660px;')
    expect(css).toContain('--syn-dock-content-clearance: 72px;')
    expect(css).toContain('--syn-dock-control-size: 40px;')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/tokens.test.ts`

Expected: FAIL because the CSS file is missing.

- [ ] **Step 3: Add tokens**

```css
/* src/client/styles/tokens.css */
:root {
  color-scheme: light dark;

  --syn-black: #000;
  --syn-white: #fff;
  --syn-fg: var(--syn-black);
  --syn-bg: var(--syn-white);
  --syn-border-strong: 3px solid currentColor;
  --syn-border-subtle: 1px solid currentColor;
  --syn-radius: 0;
  --syn-content-width: 760px;
  --syn-artwork-width: 660px;

  --syn-dock-bottom: max(16px, env(safe-area-inset-bottom));
  --syn-dock-left: max(16px, env(safe-area-inset-left));
  --syn-dock-right: max(16px, env(safe-area-inset-right));
  --syn-dock-gap: 12px;
  --syn-dock-control-size: 40px;
  --syn-dock-content-clearance: 72px;

  --syn-font-display: 'Archivo Black', 'Arial Black', Arial, 'PingFang SC',
    'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif;
  --syn-font-body: 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei',
    'Noto Sans CJK SC', sans-serif;
}

:root[data-theme='dark'] {
  --syn-fg: var(--syn-white);
  --syn-bg: var(--syn-black);
}
```

```ts
// src/client/styles/index.ts
import './tokens.css'
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/client/tokens.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/styles/tokens.css src/client/styles/index.ts tests/client/tokens.test.ts
git commit -m "feat: add fixed synctrol design tokens"
```

---

### Task 6: Multilanguage resolver helper

**Files:**
- Create: `src/shared/multilanguage.ts`
- Create: `tests/shared/multilanguage.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `Multilanguage`, `LocaleKey`
- Produces: `resolveMultilanguage(value, locale, mainLocale)`

- [ ] **Step 1: Write the failing resolver test**

```ts
// tests/shared/multilanguage.test.ts
import { describe, expect, it } from 'vitest'
import { resolveMultilanguage } from '../../src/shared/multilanguage'

describe('resolveMultilanguage', () => {
  it('returns scalars for every locale', () => {
    expect(resolveMultilanguage('SYNCTROL', 'en', 'zh')).toEqual({
      text: 'SYNCTROL',
      locale: 'en',
      fellBack: false,
    })
  })

  it('prefers the current locale then mainLocale', () => {
    expect(
      resolveMultilanguage(
        { zh: '第一张专辑', en: 'First Album' },
        'en',
        'zh',
      ),
    ).toEqual({
      text: 'First Album',
      locale: 'en',
      fellBack: false,
    })

    expect(
      resolveMultilanguage({ zh: '第一张专辑' }, 'en', 'zh'),
    ).toEqual({
      text: '第一张专辑',
      locale: 'zh',
      fellBack: true,
    })
  })

  it('throws when a map omits mainLocale', () => {
    expect(() =>
      resolveMultilanguage({ en: 'Only English' }, 'en', 'zh'),
    ).toThrow(/mainLocale/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/shared/multilanguage.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement resolver**

```ts
// src/shared/multilanguage.ts
import type { LocaleKey, Multilanguage } from './types.js'
import { isMultilanguageMap } from './types.js'

export interface ResolvedMultilanguage {
  text: string
  locale: LocaleKey
  fellBack: boolean
}

export function resolveMultilanguage(
  value: Multilanguage,
  locale: LocaleKey,
  mainLocale: LocaleKey,
): ResolvedMultilanguage {
  if (!isMultilanguageMap(value)) {
    return { text: value, locale, fellBack: false }
  }

  if (!(mainLocale in value)) {
    throw new Error('Multilanguage map missing mainLocale')
  }

  if (typeof value[locale] === 'string') {
    return { text: value[locale], locale, fellBack: false }
  }

  return {
    text: value[mainLocale],
    locale: mainLocale,
    fellBack: true,
  }
}
```

Export from `src/index.ts`.

- [ ] **Step 4: Run the full foundation suite**

Run: `npm test`

Expected: all foundation tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/multilanguage.ts src/index.ts tests/shared/multilanguage.test.ts
git commit -m "feat: add multilanguage resolver helper"
```

---

## Plan Self-Review

1. **Spec coverage for Plan 01:** package identity, shared types, LocaleMessages defaults, theme option overview, release/news defaults, fixed tokens, Multilanguage rules, and validation of URL segments/grid columns are covered. Content discovery, routes, shell, platforms, SEO remain in later plans.
2. **Placeholders:** none.
3. **Type consistency:** `ReleaseOptions`, `NewsOptions`, `SynctrolThemeOptions`, `LocaleMessages`, and Book types match the approved spec naming.
