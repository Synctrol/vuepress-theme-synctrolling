# vuepress-theme-synctrolling

这是 Synctrol 音乐团队站点使用的 VuePress 2 专用主题，用来发布多语言作品、新闻和页面，并生成搜索引擎信息与订阅源。

本仓库只发布主题包。官网 Synctrol.com 是另一份使用本主题的站点，不要把这个仓库的构建结果当成官网去部署。

运行环境：Node.js `^20.9.0 || >=22.0.0`、Vue `^3.5.0`、VuePress `^2.0.0-rc.24`。

## 安装

```bash
npm install vuepress-theme-synctrolling vue@^3.5.0 vuepress@^2.0.0-rc.24
```

## 主题功能

这不是通用文档主题。黑白配色、黄金分割版面、粗边框和直角都写死在主题里。站点作者通过内容和配置来运营网站，而不是去改外观。

你可以发布四种内容：

- **首页**（`home`）：每个语言一个入口页，用来放标识和口号。
- **作品**（`release`）：方图列表和详情。详情可以附一张专辑或周边手册，并挂上播放器或购买链接。
- **新闻**（`news`）：按日期排列，支持标签和分页。
- **页面**（`page`）：团队介绍、成员介绍等普通页，不会自动汇总成列表。

站点始终按语言前缀访问，例如 `/zh/`、`/en/`。某语言还没有译文时，会显示主语言正文，并标明尚未翻译。开发时可以打开草稿预览。

打开网站根地址时，主题会生成**根语言路由器**：按「上次选择的语言 → 浏览器语言 → 站点主语言」跳到对应语言首页。这个根页没有可见的语言链接，也不会写进站点地图。

页面共用同一套外壳：顶栏文案和明暗模式、右侧导航（含社交图标和链接云）、底栏文案和语言切换。每种内容类型可以挂自己的背景。图片和文件会带上内容哈希。主题还会写出各语言的订阅源、整站站点地图，以及一份供部署方核对的平台安全策略清单 `synctrol-csp.json`。

## 主题重要概念

**内容包**是主题识别内容的最小单位。某个目录里只要有 `content.yml`，它就是一个包。同目录下的 `zh.md`、`en.md` 是各语言正文。作品包还可以再放一份 `book.yml`。文件夹怎么摆都不决定网址，内容包也不能套在另一个内容包里面。

**语言键**（例如 `zh`、`en`）同时决定源文件名、网址前缀，以及多语言字段怎么取值。`lang`（例如 `zh-CN`）只用来标注网页语言，并匹配浏览器语言。VuePress 自己的 `locales` 路径要和主题语言键对齐，例如 `'/zh/'` 对应 `zh`。

多语言文案可以写成一句通用字符串，也可以按语言写成对象。对象必须包含主语言；缺了的语言会回退到主语言，并标出实际语言。自定义路径 `path` 是例外：没写的语言走该类型的默认路径，不会去借用主语言的自定义路径。

首页的身份固定为 `home`。其他内容的身份是「类型 + 别名」，例如 `release:first-album`。不写别名时，就用文件夹名字。最终地址是：VuePress 的 `base` + 语言前缀 + 该页路径。`siteUrl` 用来拼搜索引擎和订阅源需要的绝对地址，必须是不带尾斜杠的网站源点。

三类图各管各的，不会互相顶替：

- `cover`：文章引用和社交分享图，不进作品列表方图。
- `artwork`：作品列表和详情的主图。
- 专辑手册里的封面组：只出现在专辑详情里。

首页不能写 `cover`，社交图用站点配置里的默认图。背景只能在主题配置里按内容类型指定，单篇内容改不了。播放器和外链只能写在作品手册里：数字平台放专辑链接，实体平台放周边条目链接。

顶栏文字来自 `topbarText`，底栏文字来自 `footbarText`。首页屏幕上的标识来自 `home-logo` 区块；首页 Markdown 开头的标题只给搜索引擎用，不会当成标识显示。

## 主题配置方法

在 `.vuepress/config.ts` 里启用主题：

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
    topbarText: '版权所有',
    footbarText: '敬请期待',
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

必填项是 `siteUrl`、`mainLocale`、`locales`、`topbarText` 和 `seo`。常用可选项：

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `definitionsPath` | 内容根下的 `definitions.yml` | 标签和平台定义文件 |
| `showDrafts` | 关闭 | 打开后会生成草稿页，并在列表里打草稿标记 |
| `defaultColorMode` | 跟随系统 | 用户还没自己选过时的明暗模式 |
| `footbarText` | 不显示 | 底栏左侧文案 |
| `featureFont` | 主题默认展示字体 | 作用在标识、顶栏底栏和导航上 |
| `feeds.rss` / `feeds.sitemap` | 开启 | 关掉后仍保留页面级搜索引擎信息 |
| `navigation.items` | 空 | 内部链接写成 `/releases/` 这种相对语言根的路径 |
| `socialLinks.items` | 空 | 侧栏图标链接 |
| `linkCloud.items` | 不显示 | 侧栏文字链接 |
| `release.urlSegment` | `releases` | 作品网址段，所有语言共用 |
| `news.urlSegment` | `news` | 新闻网址段，所有语言共用 |
| `platforms.loadStrategy` | 点击后再加载 | 也可以改成进入视口后再加载，不能一进页就加载 |
| `backgrounds` | 空背景 | 按首页 / 作品 / 新闻 / 页面分别指定背景模块 |

中文和英文可以只覆盖部分界面文案；其他语言必须把全部文案写齐。多写了主题不认识的配置字段，构建会失败。

内容默认放在站点源码里的 `content/`：

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

`definitions.yml` 用来声明新闻标签和平台。内容包的 `content.yml` 写类型、别名、日期、标签和图片。首页 Markdown 必须包含标识区块：

```md
---
title: 站点名
description: 首页给搜索引擎用的摘要
---

::: home-logo
# SYNCTROL

WE SHAPE WAVE
AND DESCRIBE SOUND
:::
```

内置平台类型包括外链、本地音频，以及 YouTube、B 站、Apple Music、Spotify、SoundCloud、网易云。也可以在配置里注册自定义平台，但不能在内容里直接塞网页代码、脚本或内嵌框。

如果只想用主题的颜色和字体变量，可以单独引入：

```ts
import 'vuepress-theme-synctrolling/styles.css'
```

这个入口**只导出设计令牌**。正常用主题时不必单独引入，主题自己会加载完整样式。

## 主题使用要求

- 使用 Node.js `^20.9.0 || >=22.0.0`、Vue `^3.5.0`、VuePress `^2.0.0-rc.24`。
- `siteUrl` 必须是不带路径、查询、锚点和尾斜杠的 `http` 或 `https` 源点。
- 自定义域名把 VuePress 的 `base` 设为 `'/'`。如果发在仓库子路径上，写成 `'/仓库名/'` 这种带尾斜杠的形式。
- VuePress 的 `locales` 必须覆盖主题里配置的每一种语言。
- 全站只能有一个可发布的首页；每个语言的首页都要有 `home-logo` 区块。首页不能自定义路径。
- 所有内容页都带语言前缀。
- 引用了未声明的标签或平台、写了未知字段、套了内容包、同类型别名重复、最终地址冲突、图片文件缺失，构建都会失败。
- 日期必须写成 `YYYY-MM-DD`；更新日不能早于发布日。
- 展示字体默认走 Archivo Black 这一套字体栈，也可以用 `featureFont` 改。npm 包**不附带** Archivo Black 的 WOFF2 文件，仓库里也没有可分发的授权字体。要用的话，请在自己的站点里托管，或通过页面头部引入。
- `.vuepress/public` 只放文件名必须固定的东西，例如域名文件。社交默认图和组织标志会走带哈希的资源通道。

## 开发

如果你在改这个主题仓库本身：

```bash
npm install
npm test
npm run build
npm run assert:build-artifacts
npm run assert:pack
npm run assert:exports
npm run test:consumer-smoke
```
