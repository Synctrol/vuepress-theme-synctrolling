# vuepress-theme-synctrolling

Synctrol-specific VuePress 2 theme for multilingual release, news, page, SEO, feed, and static-site publishing. This package is the theme; Synctrol.com is a separate consumer site.

Requires Node.js `^20.9.0 || >=22.0.0`, Vue `^3.5.0`, and VuePress `^2.0.0-rc.24`.

## Install

```bash
npm install vuepress-theme-synctrolling vue@^3.5.0 vuepress@^2.0.0-rc.24
```

## Minimal config

```ts
// .vuepress/config.ts
import { defineUserConfig } from 'vuepress'
import {
  enMessages,
  synctrolTheme,
  zhMessages,
} from 'vuepress-theme-synctrolling'

export default defineUserConfig({
  base: '/',
  locales: {
    '/zh/': { lang: 'zh-CN' },
    '/en/': { lang: 'en-US' },
  },
  theme: synctrolTheme({
    siteUrl: 'https://example.com',
    mainLocale: 'zh',
    locales: {
      zh: { lang: 'zh-CN', label: '中文', messages: zhMessages },
      en: { lang: 'en-US', label: 'English', messages: enMessages },
    },
    copyright: 'Copyright Your Team',
    seo: {
      name: { zh: 'Example', en: 'Example' },
      description: { zh: '站点简介', en: 'Site description' },
      defaultImage: './assets/social-default.svg',
      organization: { name: 'Example', logo: './assets/logo.svg' },
      collections: {
        release: {
          title: { zh: '作品', en: 'Releases' },
          description: { zh: '作品列表', en: 'Releases list' },
        },
        news: {
          title: { zh: '新闻', en: 'News' },
          description: { zh: '新闻列表', en: 'News list' },
        },
      },
    },
  }),
})
```

## Optional tokens-only CSS export

```ts
import 'vuepress-theme-synctrolling/styles.css'
```

`vuepress-theme-synctrolling/styles.css` exports `dist/client/styles/tokens.css` only. Normal VuePress sites should let the theme client config load the complete style stack.

Display typography uses the CSS stack `'Archivo Black', 'Arial Black', Arial, ...`. The npm package does not ship an Archivo Black WOFF2 yet because no licensed binary is tracked in this repository.

## Content layout overview

```text
content/
├── definitions.yml
├── home/
│   ├── content.yml
│   ├── zh.md
│   └── en.md
├── releases/
│   └── my-release/
│       ├── content.yml
│       ├── book.yml
│       ├── zh.md
│       ├── en.md
│       └── assets/
├── news/
│   └── hello/
│       ├── content.yml
│       ├── zh.md
│       └── en.md
└── pages/
    └── about/
        ├── content.yml
        ├── zh.md
        └── en.md
```

A directory with `content.yml` is a content package (`home`, `release`, `news`, or `page`). Locale files are named by locale key (`zh.md`, `en.md`). Public routes are locale-prefixed.

## Consumer static hosting notes

These notes are for sites that consume this theme:

1. Set `siteUrl` to the public origin without a trailing slash.
2. Use VuePress `base: '/'` for custom domains. Use a trailing-slash subpath such as `/repo-name/` for project-page hosting.
3. The theme emits a root language router at `/index.html` that chooses saved locale, browser language, then `mainLocale`, and calls `location.replace()` to the locale home. Visible `/zh/` and `/en/` links remain for no-JS clients.
4. Do not deploy this theme repository as Synctrol.com; deploy the consumer site's own build output.

## Develop

```bash
npm install
npm test
npm run build
npm run assert:build-artifacts
npm run assert:pack
npm run assert:exports
npm run test:consumer-smoke
```
