# vuepress-theme-synctrolling

这是给 Synctrol 团队使用的 VuePress 2 主题，用来发布多语言首页、作品、新闻和页面。

外观和版面是固定的，不是通用主题。若你希望改设计或行为，请自行 fork 后维护。

## 主题功能

用这个主题，你可以：

- 做中英（或更多语言）站点，网址按语言分开，例如 `/zh/`、`/en/`
- 发布首页、作品、新闻和普通介绍页
- 给作品附上专辑或周边信息，以及收听、购买链接
- 给新闻加标签和分页
- 在顶栏、底栏放文案，在侧栏放导航、社交图标和常用链接
- 让打开网站根地址时，自动进入合适的语言首页

主题不会提供换色、改圆角、改版面这类能力。

## 主题重要概念

先记住这几件事，后面配置会轻松很多。

**一份内容就是一个文件夹。** 文件夹里有 `content.yml`，再加上 `zh.md`、`en.md` 这类语言正文。作品还可以多放一份 `book.yml`。

**语言名要前后一致。** 配置里写 `zh`，正文就叫 `zh.md`，网址就是 `/zh/`。界面上显示「中文」还是「English」，用配置里的 `label`。

**同一句话可以两种写法。** 所有语言都一样，就直接写字符串；要按语言区分，就写成对象，并且必须包含主语言：

```yaml
title:
  zh: 作品
  en: Releases
```

**图有分工。** `artwork` 是作品列表和详情的主图；`cover` 是分享到社交平台时用的图，不会出现在作品方图列表里。首页标识写在正文的 `home-logo` 区块里，不要靠 `cover`。

**顶栏和底栏是配置出来的。** 顶栏文字是 `topbarText`，底栏文字是 `footbarText`。导航、社交图标、侧栏链接也都在主题配置里写，不在 Markdown 里写。

## 主题配置方法

按下面六步做。

### 1. 确认环境

需要：

- Node.js `^20.9.0 || >=22.0.0`
- Vue `^3.5.0`
- VuePress `^2.0.0-rc.24`

### 2. 安装主题

在 VuePress 站点目录里执行：

```bash
npm install vuepress-theme-synctrolling vue@^3.5.0 vuepress@^2.0.0-rc.24 @vuepress/bundler-vite@^2.0.0-rc.24
```

### 3. 写下站点配置

新建 `.vuepress/config.ts`：

```ts
import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import {
  enMessages,
  synctrolTheme,
  zhMessages,
} from 'vuepress-theme-synctrolling'

export default defineUserConfig({
  base: '/',
  bundler: viteBundler(),
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
    topbarText: '版权所有',
    footbarText: '敬请期待',
    navigation: {
      items: [
        { label: { zh: '作品', en: 'Releases' }, href: '/releases/' },
        { label: { zh: '新闻', en: 'News' }, href: '/news/' },
      ],
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
    linkCloud: {
      items: [{ label: { zh: '文档', en: 'Docs' }, href: '/docs/' }],
    },
    seo: {
      name: { zh: '示例站点', en: 'Example' },
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

把 `siteUrl` 换成你的网站地址，不要末尾斜杠。自己的域名把 `base` 留成 `'/'`；如果发在仓库子路径上，写成 `'/仓库名/'`。

还需要按同样规则准备两张图，放在 `.vuepress/assets/`：社交分享默认图 `social-default.svg`，以及组织标志 `logo.svg`。社交图标路径按你实际文件改。

常用可选项（不写就用默认值）：

| 你想做的事 | 写哪个选项 |
| --- | --- |
| 预览草稿 | `showDrafts: true` |
| 默认明暗模式 | `defaultColorMode: 'auto'` / `'light'` / `'dark'` |
| 展示字体 | `featureFont`（字体文件请自己在站点里引入） |
| 关掉订阅源或站点地图 | `feeds: { rss: false, sitemap: false }` |

### 4. 建好内容目录

在站点根目录建立 `content/`：

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

先写 `content/definitions.yml`，声明新闻标签（以及作品里要用到的平台）：

```yaml
tags:
  release:
    title:
      zh: 作品发布
      en: Releases
platforms:
  soundcloud:
    category: digital
    type: soundcloud_player
    name: SoundCloud
  taobao:
    category: physical
    type: link
    name:
      zh: 淘宝
      en: Taobao
```

### 5. 写首页

`content/home/content.yml`：

```yaml
type: home
```

`content/home/zh.md`（英文页同样结构，文件名改成 `en.md`）：

```md
---
title: 站点名
description: 首页简介
---

::: home-logo
# 站点名

副标题第一行
副标题第二行
:::
```

首页必须有 `home-logo` 区块，而且全站只能有一个首页。

### 6. 再添加作品、新闻或页面

作品 `content/releases/my-release/content.yml`：

```yaml
type: release
slug: my-release
date: 2026-08-11
artwork: ./assets/artwork.webp
```

新闻 `content/news/hello/content.yml`：

```yaml
type: news
slug: hello
date: 2026-08-11
tags:
  - release
```

普通页 `content/pages/about/content.yml`：

```yaml
type: page
slug: about
```

各语言正文用 Markdown 写即可。作品若要附专辑或周边，再在该作品文件夹里加 `book.yml`：

```yaml
# releases/my-release/book.yml
type: album
title:
  zh: 我的专辑
  en: My Album
copyright: © 2026 Synctrol
credit:
  catalogNumber: SYN-001
  illustrator: 插画师
album:
  links:
    - platform: soundcloud
      url: https://soundcloud.com/synctrol/demo
  discs:
    - title:
        zh: 第一碟
        en: Disc One
      tracks:
        - title:
            zh: 第一曲
            en: Track One
          artists: [Synctrol]
          duration: 272
```

### 专辑页组件

专辑详情页由 Markdown 中的组件手动组装，组件自动读取该作品包的 book.yml 数据：

```md
<AlbumArtwork />
<AlbumIdentity />
<AlbumTracklist />
<TabView><TabPanel label="试听"><AlbumPlatform platform="soundcloud" /></TabPanel><TabPanel label="收听与获取"><AlbumPlatform platform="spotify" /></TabPanel></TabView>
<AlbumCredit />
<AlbumCovers />
<GiftItem id="poster" />
```

- `<AlbumArtwork />` 渲染 content.yml 的 artwork（含占位图回退）。
- `<AlbumIdentity />` 渲染专辑标题。
- `<AlbumTracklist />` 渲染曲目表（不带区块标题与边框）；`<AlbumCovers />` 渲染封面组。
- `<TabView>` 与 `<TabPanel label="...">` 组成通用标签页：默认选中第一个面板，切换到哪个面板就自动加载该面板内的 embed。
- `<AlbumPlatform platform="...">` 渲染 book.yml 中该平台的条目（试听条目或数字平台链接条目都由此组件选取）。`platform` 对应 definitions.yml 中的平台 key，未找到条目时不渲染。借助它，不同语言版本可以选不同的平台：例如中文页放 `<AlbumPlatform platform="netease" />`，英文页放 `<AlbumPlatform platform="soundcloud" />`。
- `<AlbumCredit />` 按固定顺序渲染 credit：catalogNumber、illustrator、designer、mastering、mix、webDesign、producer、specialThanks；credit 的值可以是字符串或字符串数组（数组每个值独占一行）。book.yml 的顶层 copyright 渲染为该区块的最后一行。
- `<GiftItem id="..." />` 渲染指定 id 的周边条目（gift 类型 book）。

本地预览：

```bash
npx vuepress dev .
```

正式构建：

```bash
npx vuepress build .
```

## 主题使用要求

- 本主题只给 Synctrol 团队使用。若要改外观或行为，请自行 fork 后维护。
- 使用 Node.js `^20.9.0 || >=22.0.0`、Vue `^3.5.0`、VuePress `^2.0.0-rc.24`。
- 必填配置：`siteUrl`、`mainLocale`、`locales`、`topbarText`、`seo`。
- `siteUrl` 写成 `https://你的域名`，不要带路径，也不要末尾斜杠。
- VuePress 的 `locales` 必须覆盖主题里配置的每一种语言。
- 内容放在 `content/`。全站只能有一个首页，每个语言的首页都要有 `home-logo`。
- 日期写成 `YYYY-MM-DD`。新闻用到的标签必须先在 `definitions.yml` 里声明。
