# Synctrol VuePress Theme Design

**Status:** Proposed for written-spec review  
**Date:** 2026-08-11  
**Target:** VuePress 2 theme for the Synctrol music team website

## 1. Purpose

Build a Synctrol-specific VuePress theme package for:

1. Music and merchandise releases.
2. Team and member introductions.
3. Team news.

The theme preserves the current Synctrol site's black-and-white industrial identity while adding structured content, multilingual publishing, responsive layouts, media embeds, and archives. The repository ships `vuepress-theme-synctrolling` as an npm package; consumer sites (including Synctrol.com on GitHub Pages) depend on that package.

This is not a general-purpose documentation theme. Configuration exists to operate the Synctrol website without allowing arbitrary visual changes that dilute the brand.

## 2. Reference Design Findings

### 2.1 Synctrol

The current [Synctrol website](https://synctrol.com/) establishes the primary visual language:

- Pure black and white with limited gray.
- Heavy display typography.
- Three-pixel dividers and square corners.
- Golden-ratio desktop composition.
- A body region currently containing the Synctrol logo.
- A navigation region currently containing external links.
- A footer region currently containing the construction notice.

The new theme keeps the composition and design language but removes the construction notice, moves social links into an independent fixed control, and allows type-specific custom backgrounds.

### 2.2 Diverse System

Two desktop-only references are used:

- The Diverse System home release grid informs the square-artwork Release index.
- The first square artwork links to [LTK 2026 Season: Pandemonium Original Sound Track](https://diverse.jp/vsp-1010/). Its detail page informs the large-artwork, linear-information Release detail structure.

No Diverse System mobile layout is used as a reference. Mobile behavior is designed specifically for Synctrol.

## 3. Approaches Considered

### 3.1 Generic theme versus dedicated theme

- **Generic theme:** broad color, radius, layout, and component customization.
- **Dedicated theme:** fixed Synctrol visual language with operational configuration.

**Decision:** dedicated theme. It keeps brand tokens fixed while exposing content, locale, navigation, social link, background module, route, and platform-type configuration.

### 3.2 Locale directory trees versus colocated translations

- **Separate trees:** `zh/releases/foo.md` and `en/releases/foo.md`.
- **Colocated package:** `foo/content.yml`, `foo/zh.md`, and `foo/en.md`.

**Decision:** colocated packages. Shared data and assets live beside every translation, reducing duplication and making translation status explicit.

### 3.3 Commerce model versus editorial release model

- **Commerce model:** products, variants, SKUs, GTINs, inventory-like fields.
- **Editorial model:** one Release page with an optional Album or Gift Book.

**Decision:** editorial model. The website links to external stores but does not model a storefront.

### 3.4 Per-page backgrounds versus type backgrounds

- **Per-page:** each content package selects an arbitrary background.
- **Per-type:** theme configuration assigns one TypeScript background module to each content type.

**Decision:** per-type backgrounds. Content packages cannot select or override backgrounds.

## 4. Content Types

```ts
export type ContentType = 'home' | 'release' | 'news' | 'page'
```

| Type | Purpose | Collection behavior |
| --- | --- | --- |
| `home` | Locale homepage | Exactly one package; fixed locale-root route |
| `release` | Music, project, or merchandise release | Release index ordered by date |
| `news` | Team news | Chronological index and tag archives |
| `page` | Team, member, and general pages | No automatic collection |

Member pages use `page` in the first version. There is no `member` type and no per-page layout selector.

### 4.1 Theme option overview

```ts
interface SynctrolThemeOptions {
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
```

There is no `contentDir`, full route-template, visual-token, breakpoint, SocialLinks icon-size, or Release artwork-loading option.

## 5. Content Root and Package Discovery

The default source root is `content/`. The default global definitions file is `content/definitions.yml`.

```text
content/
├── definitions.yml
├── home/
│   ├── content.yml
│   ├── zh.md
│   ├── en.md
│   └── assets/
└── releases/
    └── first-release/
        ├── content.yml
        ├── book.yml
        ├── zh.md
        ├── en.md
        └── assets/
```

Discovery rules:

1. A directory containing `content.yml` is a content package.
2. The scanner recursively searches ordinary directories.
3. A content package cannot contain another content package.
4. A nested `content.yml` produces a build error naming both package paths.
5. Source directory hierarchy does not determine type or URL.
6. `config.yml` and other YAML files have no implicit behavior.
7. `book.yml` is allowed only in a `release` package.

The definitions file path is independently configurable:

```ts
import { resolve } from 'node:path'

synctrolTheme({
  definitionsPath: resolve(__dirname, '../content/definitions.yml'),
})
```

- `definitionsPath` accepts an absolute path or a path relative to the VuePress configuration file.
- It defaults to `<sourceDir>/content/definitions.yml`.
- The file does not need to be inside the content root.
- A missing, unreadable, or invalid configured definitions file is a build error.

## 6. Shared Content Manifest

Non-Home packages use:

```yaml
type: release
slug: first-release
date: 2026-08-11
draft: false
cover: ./assets/article-cover.webp
artwork: ./assets/album-entry.webp
path:
  zh: /custom/path/
  en: /custom/path/
```

### 6.1 Fields

| Field | Type | Rule |
| --- | --- | --- |
| `type` | `ContentType` | Required |
| `slug` | `string` | Optional outside Home; defaults to package directory name |
| `date` | `YYYY-MM-DD` string | Required for Release and News |
| `draft` | `boolean` | Optional; defaults to `false` |
| `cover` | asset path | Optional for Release, News, and Page |
| `artwork` | asset path | Optional and valid only for Release |
| `path` | `LocalePath` | Optional route suffix |

`background` is not a legal field. Its presence is a build error.

Type-specific manifest fields:

| Type | Additional fields |
| --- | --- |
| Home | No additional manifest fields |
| Release | `date`, optional `cover`, optional `artwork` |
| News | `date`, optional `updated`, `tags`, optional `cover` |
| Page | Optional `cover` |

`date` and `updated` use the exact `YYYY-MM-DD` form. Dates are interpreted as calendar dates without timezone conversion. `updated` cannot precede `date`. Unknown manifest fields are build errors.

`path` deliberately does not use the normal Multilanguage fallback:

```ts
type LocalePath = string | Partial<Record<LocaleKey, string>>
```

- A scalar applies the same suffix to every locale.
- A map applies only the explicitly configured locale entry.
- A missing locale entry uses the type default, never the main locale's entry.

### 6.2 Slug identity

- The resolved identity is `{type}:{slug}`.
- Slugs must be unique within the same content type.
- Different content types may share a slug.
- An omitted slug uses the exact package directory name.
- Renaming a package directory changes an implicit slug.
- Explicit slugs are recommended when source folders may be reorganized.
- Empty values, path separators, `.` and `..` are invalid.

## 7. Multilingual Model

### 7.1 Locale configuration

```ts
import { enMessages, zhMessages } from 'vuepress-theme-synctrolling'

synctrolTheme({
  mainLocale: 'zh',
  locales: {
    zh: {
      lang: 'zh-CN',
      label: '中文',
      dateFormat: {
        dateStyle: 'long',
      },
      messages: zhMessages,
    },
    en: {
      lang: 'en-US',
      label: 'English',
      dateFormat: {
        dateStyle: 'long',
      },
      messages: enMessages,
    },
  },
})
```

The locale key controls:

- Source filename: `zh.md`.
- URL prefix: `/zh/`.
- Lookup key in multilingual values.

`lang` controls HTML language annotation and browser-language matching. Every locale supplies:

```ts
interface LocaleMessages {
  draft: string
  translationUnavailable: string
  light: string
  dark: string
  auto: string
  menu: string
  close: string
  language: string
  themeModeAnnouncement: string // {current}, {next}
  returnToReleases: string
  published: string
  previousPage: string
  nextPage: string
  updated: string
  authors: string
  album: string
  tracklist: string
  disc: string // {number}
  track: string // {number}
  covers: string
  platformLinks: string
  gifts: string
  giftItems: string
  readMore: string
  activateEmbed: string // {platform}
  embedFailed: string // {platform}
  openExternal: string // {platform}
  emptyReleases: string
  emptyNews: string
  paginatedTitle: string // {title}, {page}
  tagArchiveTitle: string // {tag}, {title}
}
```

`dateFormat` is optional `Intl.DateTimeFormatOptions` and defaults to `{ dateStyle: 'long' }`. The theme exports complete Chinese and English message defaults; locale `messages` are partial overrides merged with those defaults. The English `translationUnavailable` value is exactly “This article is not yet available in English. Showing the original version.” Adding any other locale requires every message field.

Content-facing defaults include:

| Key | Chinese | English |
| --- | --- | --- |
| `published` | 发布于 | Published |
| `updated` | 更新于 | Updated |
| `authors` | 作者 | Authors |
| `album` | 专辑 | Album |
| `tracklist` | 曲目列表 | Tracklist |
| `disc` | 第 {number} 碟 | Disc {number} |
| `track` | 第 {number} 曲 | Track {number} |
| `covers` | 封面 | Covers |
| `platformLinks` | 收听与获取 | Listen & Get |
| `gifts` | 周边 | Gifts |
| `giftItems` | 周边清单 | Gift Items |
| `readMore` | 阅读更多 | Read More |
| `returnToReleases` | 返回作品列表 | Back to Releases |
| `emptyReleases` | 暂无作品 | No releases |
| `emptyNews` | 暂无新闻 | No news |

Browser-language matching normalizes case and `_`/`-`, then checks each browser preference in order:

1. Exact locale key.
2. Exact configured `lang`.
3. Primary language subtag against a locale key.
4. Primary language subtag against configured `lang`.

Configuration order breaks ties.

Locale Markdown uses:

```md
---
title: 页面标题
description: 页面摘要
draft: false
---

正文
```

- `title` and `description` are required for Home as SEO metadata but are not rendered as the Home logo.
- `title` is required for Release, News, and Page.
- `description` is required for Home SEO and optional for other types; it supplies list and SEO summary text.
- `draft` is optional and defaults to `false`.
- Home uses formatter content for its visible identity; its required frontmatter title is SEO-only and is not rendered in Main.

### 7.2 Multilanguage type

```ts
export type Multilanguage =
  | string
  | Record<LocaleKey, string>
```

A scalar applies to every language:

```yaml
title: SYNCTROL
```

A map selects by locale:

```yaml
title:
  zh: 第一张专辑
  en: First Album
```

Map resolution is:

1. Current locale.
2. `mainLocale`.

A map must define `mainLocale`; otherwise validation fails. Text falling back to `mainLocale` receives a local `lang` annotation. Scalar text inherits the current page language because the author explicitly declared it shared.

### 7.3 Root language router

GitHub Pages serves a small root document at `/`. An inline script chooses:

1. Last manually selected locale.
2. First supported `navigator.languages` entry.
3. `mainLocale`.

The script uses `location.replace()`. The root page also contains visible language links for JavaScript-disabled clients. It does not load a background module.

### 7.4 Locale URL requirement

When multilingual mode is active, all content routes include a locale prefix:

```text
/zh/releases/first-release/
/en/releases/first-release/
```

No content page is emitted without a locale prefix.

## 8. Routes

Collection routes derive from theme options:

```ts
release: {
  urlSegment: 'releases',
  index: {
    enabled: true,
    pagination: 12,
    mobileGridColumns: 2,
    desktopGridColumns: 3,
  },
  artworkPlaceholder: undefined,
},

news: {
  urlSegment: 'news',
  index: {
    enabled: true,
    pagination: 12,
  },
  tags: {
    urlSegment: 'tags',
    index: {
      enabled: true,
    },
  },
},
```

```ts
interface ReleaseOptions {
  urlSegment: string
  index: {
    enabled: boolean
    pagination: number | false
    mobileGridColumns: number
    desktopGridColumns: number
  }
  artworkPlaceholder?: string
}

interface NewsOptions {
  urlSegment: string
  index: {
    enabled: boolean
    pagination: number | false
  }
  tags: {
    urlSegment: string
    index: {
      enabled: boolean
    }
  }
}
```

The default generated suffixes are:

```text
release index      → /{release.urlSegment}/
release detail     → /{release.urlSegment}/{slug}/
release pagination → /{release.urlSegment}/page/{page}/
news index         → /{news.urlSegment}/
news detail        → /{news.urlSegment}/{slug}/
news pagination    → /{news.urlSegment}/page/{page}/
news tags index    → /{news.urlSegment}/{news.tags.urlSegment}/
news tag archive   → /{news.urlSegment}/{news.tags.urlSegment}/{tag}/
tag pagination     → /{news.urlSegment}/{news.tags.urlSegment}/{tag}/page/{page}/
page detail        → /{slug}/
home               → /
```

`urlSegment` is one scalar string shared by every locale. It cannot be a Multilanguage value.

The final URL is `VuePress base + /{locale} + resolved path suffix`.

The implementation distinguishes:

- `routePath`: locale-prefixed router path without origin or VuePress base.
- `outputPath`: file path below VuePress `dest`; directory routes emit `<route>/index.html`.
- `publicPath`: VuePress base plus route path, used by browser links.
- `absoluteUrl`: required `siteUrl` origin plus public path, used by canonical, Open Graph, RSS, and Sitemap.

```ts
synctrolTheme({
  siteUrl: 'https://synctrol.com',
})
```

`siteUrl` is required in production builds and has no trailing slash. With the custom domain, VuePress `base` is `/`.

The root language router is always emitted as `<dest>/index.html`. Its redirect destination uses `publicPath`, including a non-root VuePress base.

`path` is opaque. The theme does not inspect it for locale-like segments:

```yaml
path:
  zh: /zh/test
```

produces:

```text
/zh/zh/test/
```

Resolution:

1. Current locale's page-specific path.
2. Type route derived from `release.urlSegment` or `news.urlSegment`.
3. Built-in type path.

It never reuses the main locale's page-specific path. Final route collisions are build errors.

Home always uses `/` and cannot be remapped.

Path rules:

- Page-specific paths must begin and end with `/`.
- Query strings and hashes are invalid.
- Empty segments (`//`) are invalid, but ordinary repeated names such as `/zh/zh/test/` are valid.
- Slug and tag substitutions use RFC 3986 percent encoding as single path segments.
- Every URL segment must be non-empty and cannot contain `/`, query, hash, `.` or `..`.
- Page one always uses the collection/tag index route.
- Numbered pagination routes start at page two.

Generated pages have stable cross-locale identities:

```text
release-index
release-page:{page}
news-index
news-page:{page}
news-tags-index
news-tag:{tag}
news-tag:{tag}:page:{page}
```

LanguageSwitcher resolves generated identities using the target locale prefix and the same scalar URL segments. Tag keys use RFC 3986 percent encoding. Page-specific custom paths affect details only and never alter collection routes.

Index switches:

- `release.index.enabled: false` suppresses Release Index and its pagination, but not Release detail pages.
- `news.index.enabled: false` suppresses News Index and its pagination, but not News detail or tag pages.
- `news.tags.index.enabled: false` suppresses only the News Tags Index; individual tag archives still generate.
- News tag archives use `news.index.pagination`.
- A pagination value of `false` emits one unpaginated list.

## 9. Translation and Draft Publishing

### 9.1 Normal builds

| Condition | Behavior |
| --- | --- |
| `content.yml` has `draft: true` | Skip all locale pages without warning |
| Main-locale Markdown is absent or draft | Warn and skip the entire package |
| Non-main Markdown is absent or draft | Emit target-locale route using main-locale body |
| All locales are unavailable | Warn and skip |

A fallback page:

- Keeps the target locale URL and UI shell.
- Shows a localized translation-unavailable message.
- Renders the main-locale body.
- Annotates the body with its actual `lang`.
- Adds `noindex`.
- Uses the main-locale page as canonical.
- Emits no false `hreflang` translation.

English copy:

> This article is not yet available in English. Showing the original version.

Fallback items remain visible in the target locale's Release and News indexes. Their title and description come from the main-locale Markdown, carry the main language's local `lang`, and display the target-locale translation-unavailable badge. Shared date, tag, cover, and artwork data remain unchanged. Target-locale RSS excludes fallback items.

### 9.2 Draft preview

VuePress does not provide this behavior in core. The theme implements:

```ts
showDrafts: boolean
```

When enabled:

- Global and locale drafts are generated.
- A locale draft displays its actual draft rather than fallback content.
- Drafts appear in lists.
- List cards and detail pages show localized draft badges.
- Drafts remain `noindex` and remain outside Sitemap.

### 9.3 Home publishing matrix

Home overrides the normal package-skip behavior because every locale root requires a homepage.

| `showDrafts` | Manifest draft | Main Markdown | Result |
| --- | --- | --- | --- |
| `false` | `false` | Published | Build Home normally |
| `false` | `true` | Any | Build error: no publishable Home |
| `false` | `false` | Missing or draft | Build error: no publishable main-locale Home |
| `true` | `false` or `true` | Published or draft | Build Home; show draft badge when either source is draft |
| `true` | Any | Missing | Build error: Home content is absent |

With a usable main Home, missing non-main Markdown generates the normal fallback Home. A present non-main draft displays its actual draft when `showDrafts` is enabled.

## 10. Global Definitions

The configured definitions file contains tags and platforms. Its default location is `content/definitions.yml`:

```yaml
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

Definition rules:

- Keys are stable internal identifiers.
- `tags.*.title` and `platforms.*.name` require main-locale values.
- Missing non-main tag titles and platform names fall back to their respective main-locale values.
- Referencing an undeclared tag or platform is a build error.
- Unused definitions are allowed.

## 11. Platform Entry System

The public configuration has no adapter, mode, or nested args object.

Platform definitions contain:

- `category`: `digital | physical`.
- `type`: renderer and validation type.
- `name`: `Multilanguage`.

Entries are flat:

```yaml
links:
  - platform: bilibili
    bvid: BV1xxxxxxxxx
    page: 1
    autoplay: false

  - platform: youtube
    videoId: abc123
    start: 30

  - platform: taobao
    url: https://item.taobao.com/example
```

Common entry fields:

```ts
interface PlatformEntryBase {
  platform: string
  label?: Multilanguage
}
```

Built-in first-version types:

```ts
type BuiltInPlatformType =
  | 'link'
  | 'audio_player'
  | 'youtube_player'
  | 'bilibili_player'
  | 'apple_music_player'
  | 'spotify_player'
  | 'soundcloud_player'
  | 'netease_player'

type LinkEntry = PlatformEntryBase & {
  url: string
}

type AudioPlayerEntry = PlatformEntryBase & {
  src: string
  mime?: string
  autoplay?: boolean
}

type YouTubePlayerEntry = PlatformEntryBase & {
  videoId: string
  start?: number
  autoplay?: boolean
}

type BilibiliPlayerEntry = PlatformEntryBase & {
  bvid: string
  page?: number
  autoplay?: boolean
}

type AppleMusicPlayerEntry = PlatformEntryBase & {
  url: string
}

type SpotifyPlayerEntry = PlatformEntryBase & {
  uri: string
}

type SoundCloudPlayerEntry = PlatformEntryBase & {
  url: string
}

type NeteasePlayerEntry = PlatformEntryBase & {
  id: string
  resourceType: 'song' | 'album' | 'playlist'
}
```

Built-in value constraints:

- `link.url`: absolute HTTPS URL.
- `audio_player.src`: package-relative audio asset or absolute HTTPS URL.
- `audio_player.mime`: when present, must start with `audio/`.
- `youtube_player.videoId`: exactly 11 characters matching `[A-Za-z0-9_-]`.
- `youtube_player.start`: non-negative integer seconds.
- `bilibili_player.bvid`: `BV` followed by ten ASCII letters or digits.
- `bilibili_player.page`: integer greater than or equal to one.
- Every `autoplay` field is boolean and defaults to `false`.
- `apple_music_player.url`: HTTPS URL on `music.apple.com`.
- `spotify_player.uri`: `spotify:album:…`, `spotify:track:…`, or `spotify:playlist:…`.
- `soundcloud_player.url`: HTTPS URL on `soundcloud.com`.
- `netease_player.id`: non-empty decimal digit string.

Runtime behavior and custom types use:

```ts
platforms: {
  loadStrategy: 'interaction',
  types: {},
}
```

- `loadStrategy` accepts `'interaction' | 'viewport'` and defaults to `'interaction'`.
- `interaction` loads an embed after explicit activation.
- `viewport` loads it when the entry enters the viewport.
- Immediate loading is intentionally unsupported.
- URL validation, CSP audit output, and failure fallback cannot be disabled.

Processing is:

```text
entry.platform
→ configured definitions file → platforms[platform]
→ definition.type
→ type schema validation
→ type renderer
```

Unknown types, unknown fields, missing required fields, and invalid values are build errors. Multiple entries may use the same platform.

`platforms.types` can register additional platform types:

```ts
import type { Component } from 'vue'

interface PlatformTypeRegistration<T extends PlatformEntryBase> {
  validate(entry: unknown): T
  component: Component
  cspOrigins(entry: T): string[]
  fallbackUrl?(entry: T): string
}

interface PlatformTypesConfig {
  [type: string]: PlatformTypeRegistration<PlatformEntryBase>
}
```

`validate` returns normalized data or throws a diagnostic containing the content path and platform key. YAML content cannot provide arbitrary HTML, scripts, or iframe templates.

The compiler calls `cspOrigins()` for every visible platform entry, normalizes origins, de-duplicates them, and writes `<dest>/synctrol-csp.json` with `frame-src`, `media-src`, and `connect-src` arrays. Built-in renderers contribute their required origins to the same artifact. The first version does not inject a CSP meta tag because arbitrary configured Background modules may require additional directives and GitHub Pages cannot set response headers. The JSON file and build summary are an auditable deployment artifact for a future reverse proxy or manual policy; runtime safety still relies on strict entry validation and renderer-owned URLs.

The only legal platform-entry locations are:

- `book.yml → album.links`, which requires digital platforms.
- `book.yml → gift.items[].links`, which requires physical platforms.

No standalone top-level `links` field exists in `content.yml`.

Embeds load only after user interaction. Failure falls back to an external link when the renderer can derive one.

## 12. Asset Model

### 12.1 Content-owned assets

```text
content/releases/first-release/assets/cover.webp
→ /assets/content/release/first-release/cover.[hash].webp

content/home/assets/logo.svg
→ /assets/content/home/logo.[hash].svg
```

Content files use package-relative paths:

```yaml
artwork: ./assets/artwork.webp
```

Markdown image and download links resolve relative to the locale Markdown file, so `![Alt](./assets/image.webp)` enters the same package asset pipeline. Raw HTML relative asset attributes are rejected because they cannot be validated reliably. Registered Vue components receive package assets through a theme-provided `resolveContentAsset('./assets/name.ext')` helper.

### 12.2 Global and theme assets

```text
.vuepress/assets/logo.svg
→ /assets/global/logo.[hash].svg

theme/assets/grid.svg
→ /assets/theme/grid.[hash].svg
```

Theme-configured social icons and `release.artworkPlaceholder` resolve relative to the VuePress configuration file and enter the global asset pipeline.

Background TypeScript modules import their own resources with normal TypeScript imports; the VuePress bundler hashes those files as theme assets.

Rules:

- Asset URLs have no locale prefix.
- Normal assets always use content hashes.
- There is no stable-URL option.
- Nested asset paths are retained.
- Paths cannot escape their owning package.
- Missing files and case mismatches fail the build.
- VuePress `base` is applied to emitted URLs.
- Absolute asset URLs use required `siteUrl` plus their public URL.
- `.vuepress/public` is reserved for fixed-name files such as `CNAME` and `robots.txt`.

## 13. Theme Background Modules

Background selection exists only in theme configuration:

```ts
synctrolTheme({
  backgrounds: {
    home: () => import('./backgrounds/home'),
    release: () => import('./backgrounds/release'),
    news: () => import('./backgrounds/news'),
    page: () => import('./backgrounds/page'),
  },
})
```

Selection uses the resolved content type:

- Home pages use `home`.
- Release detail and Release index pages use `release`.
- News detail, index, and tag archive pages use `news`.
- General pages use `page`.

Missing configuration produces an empty solid-color background.

```ts
interface BackgroundContext {
  element: HTMLElement
  route: string
  locale: string
  colorMode: 'light' | 'dark'
  reducedMotion: boolean
}

interface BackgroundController {
  update(context: BackgroundContext): void
  dispose(): void
}

type BackgroundModule = {
  default(context: BackgroundContext): BackgroundController
}
```

Modules may mount images, SVG, Canvas, video, or WebGL. They initialize only on the client and do not determine layout size. The shell calls `update()` on route, locale, computed color mode, or reduced-motion changes, and calls `dispose()` before replacing or unmounting a module. Modules must clean up events, animation frames, observers, and DOM they create.

Content manifests cannot select or override a background.

## 14. Global Shell

Every rendered content page has:

```text
Background
Header
Main
Navigation
Footer
SocialLinks
LanguageSwitcher
```

### 14.1 Desktop grid

The page occupies at least `100dvh`.

```text
┌─────────────────────────────────────────────┐
│ Header                                      │
├──────────────────────────────┬──────────────┤
│ Main                         │ Navigation   │
│                              │              │
│                              ├──────────────┤
│                              │ Footer       │
├──────────────────────────────┴──────────────┤
│ S                                         L │
└─────────────────────────────────────────────┘

S = SocialLinks: fixed bottom-left
L = LanguageSwitcher: fixed bottom-right
```

The desktop shell uses:

```css
grid-template-areas:
  'header header'
  'main navigation'
  'main footer'
  'dock dock';

grid-template-columns:
  minmax(0, 1.618fr)
  minmax(280px, 1fr);

grid-template-rows:
  auto
  minmax(0, 1.618fr)
  minmax(0, 1fr)
  var(--syn-dock-content-clearance);
```

Main spans the Navigation and Footer rows. Navigation occupies the upper-right cell, Footer occupies the lower-right cell, and the full-width Dock row reserves visible space for the two fixed corner controls. Main article content has a `760px` maximum readable width. Release primary artwork has a `660px` maximum width.

### 14.2 Mobile shell

The first mobile breakpoint is `768px`.

```text
Header
├── Copyright
├── ThemeMode
└── Hamburger

Main

Footer

SocialLinks: fixed bottom-left
LanguageSwitcher: fixed bottom-right
```

Only Navigation enters the hamburger drawer. Main and Footer are sibling regions in normal document flow. The desktop Dock grid row collapses into equivalent bottom padding on mobile while SocialLinks and LanguageSwitcher remain fixed.

Fixed-control tokens:

```css
--syn-dock-bottom: max(16px, env(safe-area-inset-bottom));
--syn-dock-left: max(16px, env(safe-area-inset-left));
--syn-dock-right: max(16px, env(safe-area-inset-right));
--syn-dock-gap: 12px;
--syn-dock-control-size: 40px;
--syn-dock-content-clearance: 72px;
```

The desktop Dock row and mobile bottom padding reserve `--syn-dock-content-clearance`. SocialLinks may occupy at most the viewport width minus the measured LanguageSwitcher width, both side insets, and two dock gaps. Below `360px`, icons use `36px`, SocialLinks wrap upward, and the language label truncates with ellipsis at `40vw`. Opening the hamburger drawer hides both fixed docks until it closes.

There is no table of contents.

## 15. Header and Theme Mode

Header appears on all pages and contains:

- Configured copyright.
- ThemeMode control.
- Hamburger button on mobile only.

ThemeMode is one button showing only the selected mode:

```text
AUTO → LIGHT → DARK → AUTO
```

Rules:

- `defaultColorMode` accepts `'auto' | 'light' | 'dark'` and defaults to `'auto'`.
- The configured default applies only when the user has no saved selection.
- The visible label is localized.
- `AUTO` follows `prefers-color-scheme`.
- Choice is stored in `localStorage`.
- An inline startup script prevents color flash.
- Enter, Space, and pointer activation cycle the mode.
- Accessible text announces the current and next mode.

## 16. Navigation

Navigation is manually configured and shared across pages:

```ts
navigation: {
  externalTarget: '_blank',
  items: [
    {
      label: { zh: '作品', en: 'Releases' },
      href: '/releases/',
    },
    {
      label: 'GitHub',
      href: 'https://github.com/synctrol',
    },
  ],
}
```

- Internal destinations use leading-slash locale-root-relative paths such as `/releases/`. The theme prepends VuePress `base` and the active locale.
- External destinations use complete URLs.
- `label` and `href` may be `Multilanguage`.
- `externalTarget` accepts `'_blank' | '_self'` and defaults to `'_blank'`.
- Order is `items` configuration order.
- Desktop renders the Navigation region.
- Mobile renders the same entries in the hamburger drawer.
- External destinations use `externalTarget`; safe `rel` attributes cannot be disabled.
- `./` and `../` navigation paths are invalid because their browser meaning depends on the current page.

## 17. Social Links

Social links are not Navigation or Footer content.

```ts
socialLinks: {
  items: [
    {
      label: 'GitHub',
      icon: './assets/github.svg',
      url: 'https://github.com/synctrol',
    },
  ],
}
```

- They appear on every page.
- They are fixed at the bottom-left on desktop and mobile.
- Only icons are visible.
- Each link is an `<a>`, styled as an icon button.
- `label` is required for `aria-label` and may be multilingual.
- Icons are decorative to assistive technology.
- External links use `target="_blank"` and safe `rel`.
- The group wraps upward when needed and cannot overlap LanguageSwitcher.
- Icon dimensions are fixed visual tokens and are not configurable.

## 18. Language Switcher

LanguageSwitcher appears on every page and is fixed at the bottom-right.

- Collapsed state shows the current locale's full configured label.
- It expands upward.
- It uses no flags.
- Selection navigates to the same content identity in the target locale.
- A missing target translation opens the already-generated fallback page.
- Selection updates the persisted root-router preference.
- Escape, outside click, and successful selection close it.
- It supports keyboard navigation and focus restoration.
- The hamburger drawer temporarily covers or hides it to avoid competing overlays.

## 19. Footer

The shell always reserves a Footer region.

- Home may populate it through the `home-footer` Markdown formatter.
- Non-Home Footer is empty in the first version.
- Desktop places Footer in the lower-right cell below Navigation.
- Mobile places Footer after Main in normal document flow.
- It contains no construction notice, copyright, or social links.
- Adding future Footer content does not require changing the shell contract.

## 20. Home

Home is a single-screen immersive portal on desktop.

### 20.1 Home manifest

```yaml
type: home
draft: false
```

Home:

- Has no slug.
- Has no custom path.
- Generates `/{locale}/`.
- Has exactly one content package.
- Uses the Home background selected in theme configuration.
- Applies the exact availability and draft behavior in the Home publishing matrix in section 9.3.

### 20.2 Markdown formatters

```md
::: home-logo
# SYNCTROL

WE SHAPE WAVE  
AND DESCRIBE SOUND
:::
```

`home-logo` is required. An optional `home-footer` formatter uses the same container syntax; when absent, Footer renders empty.

Desktop places the logo in Main, Navigation in the upper-right cell, and Footer in the lower-right cell while keeping the shell immersive. Mobile places Logo and Footer in normal flow while Navigation moves into the drawer.

The previous grid, scanline, noise, and shape backgrounds are not enabled by default.

## 21. Release Manifest Images

```yaml
type: release
date: 2026-08-11
cover: ./assets/article-cover.webp
artwork: ./assets/album-entry.webp
```

The image roles are independent:

- Release `cover`: article-style references and social sharing; it is not rendered in the Release index or structured Release hero.
- `artwork`: Release index and Release detail entry artwork.
- `book.yml → album.covers`: complete album cover surfaces.

There is no fallback among these fields. `artwork` does not have to equal the first Album cover.

Other content types use `cover` as follows:

- News: index card, detail heading image, and Open Graph.
- Page: detail heading image and Open Graph.
- Home: `cover` is invalid; Home Open Graph uses the configured site default.

## 22. Release Index

The desktop index takes only the square-artwork grid principle from the Diverse System homepage.

- `release.index.desktopGridColumns` controls desktop columns, defaults to `3`, and accepts integers from `1` through `6`.
- `release.index.mobileGridColumns` controls mobile columns, defaults to `2`, and accepts integers from `1` through `3`.
- Square `artwork`.
- No visible date or description appears beneath an artwork tile.
- Title remains available as image alternative text, accessible link text, and focus feedback.
- Date descending.
- `release.index.pagination` defaults to `12`, accepts a positive integer or `false`, and controls Releases per page.
- Page one uses the Release index route; page two and later use the configured pagination route.
- Pagination is emitted only when visible entries exceed the configured page size. Drafts count when `showDrafts` makes them visible.
- Synctrol three-pixel borders and black/white hover inversion.
- Clicking a card opens Release detail.
- Missing artwork uses `release.artworkPlaceholder` when configured, otherwise a branded empty frame; it never falls back to `cover`.

Synctrol owns the mobile design:

- Grid columns use `release.index.mobileGridColumns`.
- No behavior is copied from Diverse System mobile.

Draft cards follow `showDrafts`.

## 23. Release Detail

The desktop information hierarchy follows the referenced Diverse detail page without copying its navigation, share button, purchase text, loading animation, or typography.

Main content order:

1. Return-to-Releases link.
2. Page title and date.
3. Large `artwork`.
4. Book identity and description.
5. Type-specific Book body.
6. Locale Markdown article body.

Album Book body order:

1. Album platform entries.
2. Complete Album covers.
3. Disc and Track list.

Gift Book body renders the item list directly. Each item contains its own covers followed by its own platform links; Gift links are never hoisted into a Book-level platform section.

The detail column is centered within Main. Artwork is at most `660px`. Structured sections use strong headings, three-pixel outer boundaries where useful, one-pixel row separators, square corners, and no decorative card shadows.

A Release without `book.yml` remains valid, appears in the Release index, and renders its Markdown page without a structured list.

## 24. Release Book

A Release may contain zero or one `book.yml`.

```ts
type Book = AlbumBook | GiftBook
```

### 24.1 Shared fields

```ts
interface BookBase {
  title: Multilanguage
  desc?: Multilanguage
  authors?: string[]
  copyright?: string
}

interface AlbumBook extends BookBase {
  type: 'album'
  album: {
    covers?: AssetPath[]
    links?: DigitalPlatformEntry[]
    discs?: Disc[]
  }
}

interface Disc {
  title: Multilanguage
  desc?: Multilanguage
  tracks: Track[]
}

interface Track {
  title: Multilanguage
  artists: string[]
  duration: number
  desc?: Multilanguage
  copyright?: string
}

interface GiftBook extends BookBase {
  type: 'gift'
  gift: {
    items: GiftItem[]
  }
}

interface GiftItem {
  id: string
  title: Multilanguage
  desc?: Multilanguage
  covers?: AssetPath[]
  links?: PhysicalPlatformEntry[]
  copyright?: string
}
```

### 24.2 Album

```yaml
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
    - ./assets/back.webp
  links:
    - platform: bilibili
      bvid: BV1xxxxxxxxx
      page: 1
      autoplay: false
  discs:
    - title:
        zh: 第一碟
        en: Disc One
      desc:
        zh: 第一碟介绍
        en: Disc one description
      tracks:
        - title:
            zh: 第一曲
            en: Track One
          artists:
            - Synctrol
          duration: 272
          desc:
            zh: 曲目介绍
            en: Track description
          copyright: © 2026 Synctrol
```

Album rules:

- The `album` branch is required and the `gift` branch is forbidden.
- `album.covers`, `album.links`, and `album.discs` are optional arrays.
- Links require digital platforms.
- Disc and Track IDs derive from array order.
- Display numbering starts at one.
- Generated anchors use `disc-1` and `disc-1-track-1`.
- Track duration is a non-negative integer in seconds.
- Track artists is a non-empty string array.
- A Disc has a required tracks array, which may be empty.
- Array order is the only sort order.

### 24.3 Gift

```yaml
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
        - ./assets/poster-back.webp
      links:
        - platform: taobao
          url: https://item.taobao.com/example
      copyright: © 2026 Synctrol
```

Gift rules:

- The `gift` branch is required and the `album` branch is forbidden.
- `gift.items` is required and may be empty.
- Item IDs are required and unique within the Gift.
- Item order is array order.
- Item links require physical platforms.
- Items have no variants, SKU, GTIN, inventory, or options.

Unknown fields anywhere in `book.yml` are build errors.

## 25. News

```yaml
type: news
date: 2026-08-11
updated: 2026-08-12
cover: ./assets/news-cover.webp
tags:
  - release
```

Rules:

- `date` is required.
- `updated` and `cover` are optional.
- `updated` cannot precede `date`.
- `tags` is required and may be empty.
- Every tag must be declared in the configured definitions file.
- News sorts by date descending and then slug for stability.

Index:

- `news.index.pagination` defaults to `12`, accepts a positive integer or `false`, and controls both News Index and individual tag archives.
- Page one uses the index or tag route; page two and later use the corresponding pagination route.
- Pagination is emitted only when that current-build visible dataset exceeds the configured page size. Drafts count when `showDrafts` makes them visible.
- Cover, title, description, date, and tags.
- Text-only layout when cover is absent.
- Tag links open generated locale-specific archives.
- News Tags Index lists all declared tags with visible article counts and is not paginated.

Detail:

- `760px` maximum body width.
- Title, date, optional updated date, tags, cover, and Markdown.
- No search and no table of contents.

## 26. Page

Page uses:

- The global shell.
- A `760px` maximum Markdown body.
- No automatic listing.
- No layout field.
- No table of contents.

Team and member presentations use Markdown and registered Vue components. Pages enter Navigation only through manual theme configuration.

## 27. Visual Tokens

Initial fixed tokens:

```css
:root {
  --syn-black: #000;
  --syn-white: #fff;
  --syn-border-strong: 3px solid currentColor;
  --syn-border-subtle: 1px solid currentColor;
  --syn-radius: 0;
  --syn-content-width: 760px;
  --syn-artwork-width: 660px;
}
```

- Display typography uses the self-hosted Archivo Black WOFF2 file with `font-display: swap`.
- Body typography uses a highly readable system/CJK sans-serif stack.
- Dark mode inverts the primary surface and text relationship.
- Semantic warning/error colors are restricted to content feedback, not general decoration.
- Shadows and rounded cards are not part of the theme language.
- Hover and focus use inversion, underline, and border treatment.

## 28. SEO and Feeds

Site-level metadata is required:

```ts
seo: {
  name: {
    zh: 'Synctrol',
    en: 'Synctrol',
  },
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
      title: {
        zh: '作品',
        en: 'Releases',
      },
      description: {
        zh: 'Synctrol 作品列表',
        en: 'Synctrol releases',
      },
    },
    news: {
      title: {
        zh: '新闻',
        en: 'News',
      },
      description: {
        zh: 'Synctrol 新闻',
        en: 'Synctrol news',
      },
    },
  },
}
```

`siteUrl` supplies the organization URL. Home requires its own locale frontmatter description. Other pages use their locale description when present and otherwise use the site locale description. RSS channel name and description use the site-level locale values.

Release and News index headings and metadata use `seo.collections`. Paginated titles use `messages.paginatedTitle`. Tag archive titles use the localized tag title, News collection title, and `messages.tagArchiveTitle`; their description uses the News collection description. Pagination descriptions remain the collection description.

`seo.defaultImage` and `seo.organization.logo` resolve relative to the VuePress configuration file, enter the global hashed-asset pipeline, and become absolute URLs through `siteUrl`.

All pages receive:

- Localized title and description.
- Canonical URL.
- Open Graph metadata.
- Correct `lang`.
- Real-translation-only `hreflang`.

Structured data:

- News: `Article`.
- Album Book: `MusicAlbum` and `MusicRecording`.
- Gift: no `Product`, because the site does not model commerce.
- Site root: `WebSite` and `Organization`.

Open Graph image:

- Uses `cover` when configured.
- Does not substitute `artwork`.
- Uses `seo.defaultImage` when `cover` is absent.

Generated outputs:

- Locale-specific Sitemap entries.
- `/{locale}/rss.xml` for every configured locale.
- RSS includes News and Release.
- Draft and fallback pages are excluded from Sitemap and RSS.

Generation is configurable:

```ts
feeds: {
  rss: true,
  sitemap: true,
}
```

Both values default to `true`. A `false` value suppresses the corresponding output without changing canonical, Open Graph, JSON-LD, or `hreflang`.

## 29. Accessibility

- Every icon link has an accessible label.
- Language is annotated at page and fallback-fragment level.
- Hamburger and language overlays restore focus and close with Escape.
- Hamburger traps focus while open.
- ThemeMode is keyboard operable.
- Platform embeds have descriptive titles.
- Visible focus uses `:focus-visible`.
- Color contrast meets WCAG AA.
- Language selection uses text, never flags alone.
- Reduced-motion preferences disable or simplify animated backgrounds.

## 30. Performance and Security

- Platform iframes load according to `platforms.loadStrategy`; immediate loading is unavailable.
- Background modules clean up animation frames, observers, and events.
- Non-critical images lazy-load.
- First visible artwork may load eagerly.
- Asset hashes provide cache invalidation on GitHub Pages.
- Arbitrary iframe HTML and YAML scripts are prohibited.
- Platform renderers whitelist origins and produce the merged `synctrol-csp.json` audit artifact.
- External links use safe `rel` attributes.
- Audio hosted directly in the repository is supported but documentation discourages large media because of GitHub Pages bandwidth and repository costs.

## 31. Error Handling

Build errors:

- Invalid YAML or schema.
- Unknown content or platform type.
- Nested content package.
- Duplicate same-type slug.
- Duplicate final route.
- Missing referenced asset.
- Asset path escaping a package.
- Unknown tag or platform.
- Invalid platform entry fields.
- Missing main-locale value in a Multilanguage map.
- Invalid Book branch for its `type`.
- Invalid URL segment, pagination value, or Release grid-column count.
- Invalid locale date format, default color mode, feed option, or external-link target.

Build warnings:

- Main-locale Markdown unavailable: package skipped.
- Non-main locale unavailable: fallback page generated.
- Non-main global definition label unavailable: main-locale label used.

Intentional drafts do not warn when excluded by `content.yml`.

## 32. Testing Strategy

### 32.1 Unit tests

- Content package discovery and nesting rejection.
- Slug and route resolution.
- URL-segment route derivation and index enable/disable behavior.
- Release/News pagination and Release grid option validation.
- Multilanguage scalar/map behavior.
- Draft and fallback matrix.
- Asset path and emitted URL resolution.
- Platform type validation.
- Album/Gift discriminated union.
- One-based Disc and Track numbering.
- Background type selection.
- Feed enable/disable behavior.

### 32.2 Integration tests

- Build Chinese and English fixtures.
- Verify generated locale paths.
- Verify fallback metadata and local `lang`.
- Verify Release, News, tag archive, and RSS output.
- Verify GitHub Pages base-path handling.
- Verify missing assets and duplicate routes fail.

### 32.3 Component tests

- ThemeMode cycle and persistence.
- Hamburger keyboard behavior.
- LanguageSwitcher focus and route behavior.
- Platform lazy loading and failure fallback.
- Social link accessible labels.
- Draft badges.

### 32.4 Visual tests

- Home desktop golden-ratio shell.
- Home mobile flow.
- Release grid.
- Album detail and Track list.
- Gift detail.
- News and Page typography.
- Light, dark, and auto color modes.

## 33. Delivery Decomposition

The design spans several independently testable subsystems. Implementation planning should be split into these ordered plans:

1. **Package foundation:** VuePress theme package, fixed tokens, shared types, and test harness.
2. **Content compiler:** package discovery, YAML schemas, definitions, Book validation, and diagnostics.
3. **Locale and route compiler:** locale negotiation, URL segments, virtual collections, drafts, and fallback pages.
4. **Asset pipeline:** package assets, Markdown assets, global/theme assets, hashing, and base-path support.
5. **Global shell:** Header, Navigation, Footer slot, SocialLinks, LanguageSwitcher, ThemeMode, responsive behavior, and their accessibility tests.
6. **Background runtime:** type-based TypeScript modules, update/dispose lifecycle, reduced motion, and performance tests.
7. **Platform system:** built-in schemas, custom type registration, lazy renderers, CSP origins, fallback links, and component accessibility.
8. **Release:** index, detail, Album/Gift Book, artwork/covers, and Release-specific structured data.
9. **News and Page:** News archives, tags, pagination, articles, general pages, and localized list fallback behavior.
10. **SEO and feeds:** canonical, Open Graph, JSON-LD, `hreflang`, RSS, and Sitemap.
11. **npm package publish:** package exports, build artifacts, consumer smoke install, README/CHANGELOG, CI publish, and release verification.

Each plan must use test-driven tasks, produce an independently testable deliverable, and end with its own verification and commit.

## 34. Acceptance Criteria

The design is complete when:

1. Chinese and English sites build under mandatory locale prefixes.
2. Root JavaScript routing honors persisted, browser, and main locale order.
3. Content packages, translations, drafts, assets, and routes follow this specification.
4. All four content types render through the shared Synctrol shell.
5. Desktop preserves the split industrial composition; mobile uses the dedicated responsive behavior.
6. Home renders logo/footer formatters and manual Navigation.
7. Release index uses artwork; detail renders optional Album/Gift Book data.
8. Platforms render through flat type-validated entries.
9. Backgrounds are chosen exclusively by content type in theme configuration.
10. No search or table of contents is exposed.
11. Draft, fallback, SEO, RSS, Sitemap, and accessibility behaviors pass automated tests, and the theme package is publishable to npm.
