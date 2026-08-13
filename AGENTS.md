# AGENTS

本文件给编码代理和维护者：说明仓库约定、现行主题契约，以及改代码时不要踩的坑。

面向站点作者的说明只写在 `README.md`。README 必须是中文，按步骤讲安装和配置；严禁在 README 中提及本文件、任何 AGENTS 文件，或「权威参考」之类人类作者不需要的信息。

## 仓库约定

- README 面向人类站点作者：只写安装、配置与使用。禁止在 README 中提及 `AGENTS.md`、代理说明或「权威参考」。
- 本仓库发布的是主题 npm 包，不是 Synctrol.com。不要把本仓库的构建产物当成官网部署。
- 这是专用主题：不要新增配色、圆角、断点、壳层几何或展示字体的自由定制项。品牌 token 固定在 `src/client/styles/tokens.css`。
- 源码使用 TypeScript NodeNext：`src/**` 内部 import 必须带 `.js` 后缀。
- `npm test` 只跑源码/单元测试。依赖 `dist/`、`npm pack` 或消费端安装的检查走 `npm run build` 之后的 `assert:*` / `test:consumer-smoke`。
- 已废弃的公开选项：`copyright` 已更名为 `topbarText`；首页 Markdown 底栏 formatter 已由 `footbarText` 取代。文档与示例不得再示范这两项旧契约。
- 根语言路由器页面不再输出可见语言链接；`/` 只做 `location.replace()` 跳转。Sitemap 不含该根页。

## 主题功能

本包是面向 Synctrol 音乐团队站点的专用 VuePress 2 主题，不是通用文档主题。黑白工业视觉、黄金分割壳层、3px 边框与直角几何固定在主题内。消费站点通过内容包和主题选项运营站点，而不是改主题外观。

主题提供：

1. **四种内容类型**：`home`（语言首页）、`release`（作品）、`news`（新闻）、`page`（团队、成员与普通页）。
2. **多语言发布**：所有内容路由带 locale 前缀；缺失译文时生成回退页；可用 `showDrafts` 预览草稿。
3. **根语言路由器**：在站点根 `/index.html` 按「已保存语言 → 浏览器语言 → `mainLocale`」选择语言首页，并以 `location.replace()` 跳转。
4. **作品系统**：方图索引网格、详情页、可选 Album / Gift `book.yml`、平台播放器与外链。
5. **新闻系统**：按日期倒序的索引、标签归档、分页。
6. **全局壳层**：顶栏（`topbarText`、主题模式、移动端汉堡菜单）、导航列（含侧栏社交图标与链接云）、底栏（`footbarText` 与语言切换）。
7. **按内容类型加载的背景模块**：Home / Release / News / Page 各自对应一个 TypeScript 背景入口。
8. **资源管线**：内容包、全局与主题资源输出带内容哈希的 URL，并应用 VuePress `base`。
9. **SEO 与订阅**：canonical、Open Graph、仅真实译文的 `hreflang`、JSON-LD、各语言 `/{locale}/rss.xml`、站点 `sitemap.xml`。
10. **平台 CSP 审计产物**：构建写出 `synctrol-csp.json`（`frame-src` / `media-src` / `connect-src`），不注入 CSP meta。

## 主题重要概念

### 内容包

含 `content.yml` 的目录就是一个内容包。同目录下的 `{localeKey}.md` 是该语言正文；`book.yml` 仅允许出现在 `release` 包中。扫描递归普通目录，但内容包不能嵌套。源目录层级不决定类型或 URL。

### 语言键与 `lang`

`locales` 的 key 同时控制源文件名（`zh.md`）、URL 前缀（`/zh/`）以及多语言字段的查找键。`lang`（如 `zh-CN`）只用于 HTML 语言标注和浏览器语言匹配。VuePress `locales` 的 path 应与主题 locale key 对齐，例如 `'/zh/'` 对应 `zh`。

### `Multilanguage`

```ts
type Multilanguage = string | Record<LocaleKey, string>
```

标量字符串对所有语言生效。对象按当前 locale key 取值，缺失时回退到 `mainLocale`；回退文本会带实际语言的 `lang` 标注。对象必须包含 `mainLocale` 条目。`content.yml` 的 `path` 例外：缺失语言使用该类型的默认路径，绝不复用主语言的自定义 path。

### 身份与 URL

Home 的身份固定为 `home`。其他包的身份是 `{type}:{slug}`；省略 `slug` 时使用包目录名。最终 URL 为 `VuePress base + /{locale} + path suffix`。`siteUrl`（无尾斜杠的 http(s) origin）拼出 canonical、Open Graph、RSS 与 Sitemap 使用的绝对地址。

默认 path suffix：

| 页面 | suffix |
| --- | --- |
| Home | `/` |
| Release 索引 | `/{release.urlSegment}/` |
| Release 详情 | `/{release.urlSegment}/{slug}/` |
| News 索引 | `/{news.urlSegment}/` |
| News 详情 | `/{news.urlSegment}/{slug}/` |
| News 标签索引 | `/{news.urlSegment}/{news.tags.urlSegment}/` |
| News 标签归档 | `/{news.urlSegment}/{news.tags.urlSegment}/{tag}/` |
| Page 详情 | `/{slug}/` |

分页从第 2 页起使用 `/page/{page}/`。第 1 页始终是集合或标签的索引路由。

### 封面角色

- `cover`：文章式引用与社交分享图；不进入作品索引方图。
- `artwork`：作品索引与详情主图。
- `book.yml → album.covers`：专辑封面组。

三者互不回退。News / Page 使用 `cover` 作为列表或页头图以及 Open Graph。Home 禁止 `cover`，社交图使用 `seo.defaultImage`。

### 背景与平台

背景只在主题配置里按内容类型指定，内容包不能选择或覆盖。平台条目只允许写在 `book.yml` 的 `album.links`（数字平台）和 `gift.items[].links`（实体平台）；`content.yml` 没有顶层 `links`。

### 壳层文案

`topbarText` 渲染在顶栏；`footbarText` 渲染在底栏。首页可见标识来自 `::: home-logo` formatter，其 frontmatter `title` 只用于 SEO，不作为首页 Logo。

## 主题配置方法

在 `.vuepress/config.ts` 中调用 `synctrolTheme()`：

```ts
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
    topbarText: 'Copyright Your Team',
    footbarText: '敬请期待 · STAY TUNED',
    featureFont:
      "'Archivo Black', 'Arial Black', Arial, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif",
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
      items: [
        { label: { zh: '文档', en: 'Docs' }, href: '/docs/' },
      ],
    },
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

### 主题选项

必填：`siteUrl`、`mainLocale`、`locales`、`topbarText`、`seo`。

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `definitionsPath` | `<sourceDir>/content/definitions.yml` | 标签与平台定义文件；相对 VuePress 配置文件解析 |
| `showDrafts` | `false` | 为 `true` 时生成草稿页并在列表中显示草稿标记 |
| `defaultColorMode` | `'auto'` | `'auto' \| 'light' \| 'dark'`；仅在用户尚未保存选择时生效 |
| `footbarText` | 未设置 | 底栏文案；未设置则底栏左侧为空 |
| `featureFont` | token 默认栈 | 应用到 Logo、顶栏/底栏文案与导航链接的 CSS `font-family` |
| `feeds.rss` / `feeds.sitemap` | `true` | 关闭后仍保留 canonical、Open Graph、JSON-LD、`hreflang` |
| `navigation.items` | `[]` | 内部 href 以 `/` 开头、相对语言根，例如 `/releases/` |
| `navigation.externalTarget` | `'_blank'` | `'_blank' \| '_self'` |
| `socialLinks.items` | `[]` | 侧栏图标链接；`icon` 相对 VuePress 配置文件 |
| `linkCloud.items` | 未设置 | 侧栏文字链接云 |
| `release.urlSegment` | `'releases'` | 所有语言共用的作品 URL 段 |
| `release.index.pagination` | `12` | 正整数或 `false`（单页不分页） |
| `release.index.mobileGridColumns` | `2` | 1–3 |
| `release.index.desktopGridColumns` | `3` | 1–6 |
| `news.urlSegment` | `'news'` | 所有语言共用的新闻 URL 段 |
| `news.tags.urlSegment` | `'tags'` | 标签 URL 段 |
| `platforms.loadStrategy` | `'interaction'` | `'interaction' \| 'viewport'`；不支持立即加载 embed |
| `backgrounds` | 空 | `{ home, release, news, page }` 各自 `() => import('./backgrounds/...')` |

`zh` / `en` 的 `messages` 可部分覆盖主题内置文案；其他 locale key 必须提供完整 `LocaleMessages`。未知选项字段是构建错误。

### 内容目录

默认内容根是 VuePress source 下的 `content/`：

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

`definitions.yml` 声明新闻标签与平台：

```yaml
tags:
  release:
    title:
      zh: 作品发布
      en: Releases
platforms:
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
```

内容包清单示例：

```yaml
# home/content.yml
type: home
draft: false
```

```yaml
# releases/my-release/content.yml
type: release
slug: my-release
date: 2026-08-11
artwork: ./assets/artwork.webp
cover: ./assets/article-cover.webp
```

```yaml
# news/hello/content.yml
type: news
slug: hello
date: 2026-08-11
tags:
  - release
```

首页 Markdown 必须包含 `home-logo` formatter：

```md
---
title: 站点名
description: 首页 SEO 摘要
---

::: home-logo
# SYNCTROL

WE SHAPE WAVE
AND DESCRIBE SOUND
:::
```

内置平台类型：`link`、`audio_player`、`youtube_player`、`bilibili_player`、`apple_music_player`、`spotify_player`、`soundcloud_player`、`netease_player`。可在 `platforms.types` 注册自定义类型（`validate` / `component` / `cspOrigins` / 可选 `fallbackUrl`）。YAML 不得提供任意 HTML、脚本或 iframe 模板。

### 仅设计令牌的 CSS 导出

```ts
import 'vuepress-theme-synctrolling/styles.css'
```

`vuepress-theme-synctrolling/styles.css` 只导出设计令牌，指向 `dist/client/styles/tokens.css`。普通 VuePress 站点应让主题客户端配置加载完整样式，而不是只引入这一文件。

## 主题使用要求

运行时与包契约：

- Node.js `^20.9.0 || >=22.0.0`
- Vue `^3.5.0`
- VuePress `^2.0.0-rc.24`
- 本包是主题；Synctrol.com 是独立的消费站点。不要把本仓库部署为官网。

配置与托管：

1. `siteUrl` 必填，必须是无路径、无查询、无 hash、无尾斜杠的绝对 `http:` / `https:` origin。
2. 自定义域名使用 VuePress `base: '/'`。项目页托管使用带尾斜杠的子路径，例如 `/repo-name/`。
3. 主题发出根语言路由器：根 `/index.html` 按已保存语言、浏览器语言、然后 `mainLocale` 选择语言首页，并调用 `location.replace()`。该根页没有可见语言链接，也不进入站点地图。
4. VuePress `locales` 必须覆盖每一个主题 locale key，path 形如 `'/{localeKey}/'`。

内容与构建：

- 必须恰好有一个可发布的 Home 包；每个语言首页 Markdown 必须包含 `::: home-logo`。
- 多语言开启时，所有内容页都带 locale 前缀；Home 不能自定义 path。
- 引用未声明的 tag / platform、未知 YAML 字段、嵌套内容包、同类型重复 slug、最终路由冲突、缺失资源都会导致构建失败。
- `date` / `updated` 必须是 `YYYY-MM-DD`；`updated` 不得早于 `date`。
- 平台 embed 只在交互或进入视口后加载；不能配置为立即加载。
- 展示字体默认使用 `'Archivo Black', 'Arial Black', Arial, ...`。可用 `featureFont` 覆盖展示字体栈。npm 包不附带 Archivo Black 的 WOFF2 文件，仓库里也没有可分发的授权字体。消费站点如需该字体，应自行托管或通过页面头部引入。
- `.vuepress/public` 只放固定文件名资源（如 `CNAME`、`robots.txt`）。社交默认图与组织 logo 走全局哈希资源管线。

## 开发

```bash
npm install
npm test
npm run build
npm run assert:build-artifacts
npm run assert:pack
npm run assert:exports
npm run test:consumer-smoke
```

主要目录：

| 路径 | 职责 |
| --- | --- |
| `src/shared/` | 选项、类型、多语言、消息默认值 |
| `src/compiler/` | 内容发现、路由、资源、SEO、feeds、根路由器 |
| `src/client/` | 壳层、布局、背景运行时、平台渲染 |
| `tests/` | 与源码结构对应的契约测试；`tests/publish/` 锁定包文档 |

改主题行为时先补测试。不要为了文档示例重新引入已删除的公开选项或根页语言链接。
