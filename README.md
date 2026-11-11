# vuepress-theme-synctrolling

这是给 Synctrol 团队使用的 VuePress 2 主题，用来发布多语言首页、作品、新闻和页面。

外观和版面是固定的，不是通用主题。若你希望改设计或行为，请自行 fork 后维护。

## 主题功能

用这个主题，你可以：

- 做中英（或更多语言）站点，网址按语言分开，例如 `/zh/`、`/en/`
- 发布首页、作品、新闻和普通介绍页
- 给作品附上专辑信息，以及播放器和外部链接
- 给新闻加标签和分页
- 在顶栏、底栏放文案，在侧栏放导航、社交图标和常用链接
- 让打开网站根地址时，自动进入合适的语言首页
- 给交互配一套符号化音效（顶栏开关、跟随系统减弱动态偏好，见下文）
- 配一段可选背景音乐（顶栏手动开关，见下文）

主题不会提供换色、改圆角、改版面这类能力。

## 主题重要概念

先记住这几件事，后面配置会轻松很多。

**一份内容就是一个文件夹。** 文件夹里有 `content.yml`，再加上 `zh.md`、`en.md` 这类语言正文。作品可以另放 `album.yml`，由正文里的专辑组件通过 `src` 读取。

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
    tags: {
      release: {
        title: { zh: '作品发布', en: 'Releases' },
      },
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

站内链接（`navigation`、`linkCloud`）都相对语言根书写，不要带语言前缀——写 `/releases/` 而不是 `/zh/releases/`，主题会自动补上当前语言前缀。

还需要按同样规则准备两张图，放在 `.vuepress/assets/`：社交分享默认图 `social-default.svg`，以及组织标志 `logo.svg`。社交图标路径按你实际文件改。

常用可选项（不写就用默认值）：

| 你想做的事 | 写哪个选项 |
| --- | --- |
| 预览草稿 | `showDrafts: true` |
| 默认明暗模式 | `defaultColorMode: 'auto'` / `'light'` / `'dark'` |
| 声明新闻标签 | `tags: { release: { title: { zh: '作品发布', en: 'Releases' } } }` |
| 展示字体 | `featureFont`（字体文件请自己在站点里引入） |
| 自定义背景 | `background: './backgrounds/host'`（见下） |
| 交互音效 | `sounds: { keys: { ... } }`（见下） |
| 背景音乐 | `music: '/music/Beater.mp3'`（见下） |
| 关掉订阅源或站点地图 | `feeds: { rss: false, sitemap: false }` |

要自绘背景（图片 / Canvas / WebGL 都行），写一个背景提供者模块并在 `synctrolTheme` 里注册：

```ts
// .vuepress/backgrounds/host.ts
import type { BackgroundModule } from 'vuepress-theme-synctrolling'

const module: BackgroundModule = {
  default(context) {
    // context.element 是背景层；context.route / contentType / locale /
    // colorMode / reducedMotion 都是响应式 ref，可自行 watch。
    return {
      request(snapshot) {
        // 每次打开页面都会收到一次申请（含首次挂载）。
        // snapshot.reason 为 'init' | 'navigate'。
      },
      dispose() {},
    }
  },
}
export default module.default
```

配置里写 `background: './backgrounds/host'`（相对 `.vuepress` 目录的模块路径）。页面切换时主题只会「通知」提供者，具体动画怎么切由提供者自己决定；不配置 `background` 就是纯色背景。

#### 可选：交互音效

想让站点的操作有声音反馈时，按下面两步做。

先把音频文件放进 `.vuepress/public/sounds/`（固定文件名，文件名与下面的键对应）：

```text
.vuepress/public/sounds/
├── navigate.webm
├── menuOpen.webm
├── menuClose.webm
├── themeCycle.webm
├── localeChange.webm
├── paginate.webm
├── tabSelect.webm
├── accordionToggle.webm
└── embedActivate.webm
```

再在 `synctrolTheme` 里声明哪些键配了文件：

```ts
sounds: {
  enabled: true, // 默认 true；作为访客未手动切换时的初始值
  keys: {
    navigate: '/sounds/navigate.webm',
    menuOpen: '/sounds/menuOpen.webm',
    menuClose: '/sounds/menuClose.webm',
    themeCycle: '/sounds/themeCycle.webm',
    localeChange: '/sounds/localeChange.webm',
    paginate: '/sounds/paginate.webm',
    tabSelect: '/sounds/tabSelect.webm',
    accordionToggle: '/sounds/accordionToggle.webm',
    embedActivate: '/sounds/embedActivate.webm',
  },
},
```

各键的含义：

| 键 | 什么时候响 |
| --- | --- |
| `navigate` | 站内链接跳转成功（SPA 路由切换后） |
| `menuOpen` / `menuClose` | 汉堡菜单开合；在打开的抽屉里选链接只响 `menuClose` |
| `themeCycle` | 切换主题模式 |
| `localeChange` | 切换语言（整页跳转前） |
| `paginate` | 翻页（此时不再另响 `navigate`） |
| `tabSelect` | 切换标签页 |
| `accordionToggle` | 展开或折叠手风琴 |
| `embedActivate` | 播放器 embed 被激活（试听面板首次加载、独立激活按钮） |

行为约定：未声明或文件缺失的键静默（构建不报错，浏览器控制台只警告一次）；
`prefers-reduced-motion: reduce` 与顶栏「音效开 / 音效关」chip 关闭时全部静默
（顶栏开关只在声明了至少一个键后出现，访客的选择存入浏览器本地记忆）；
音频只在访客手势后才开始加载与播放（受浏览器自动播放策略约束）；同一键
80ms 内重复触发会合并，不同键可以重叠。音效请用短小的符号化提示音并控制好
响度——主题不提供音量调节，混合电平由素材本身决定。

#### 可选：背景音乐

把曲目放进 `.vuepress/public/music/`（固定文件名），再在配置里声明：

```ts
music: '/music/Beater.mp3',
```

顶栏会出现「背景乐开 / 背景乐关」chip：默认关、不记忆偏好，每次访问都由访客
手动开启（浏览器策略不允许无声手势自动出声）；点击后循环播放、约 0.7 秒淡入
淡出，切换页面不中断；与交互音效互不干预地并存，曲目音量请自行控制在「背景」
电平。文件缺失或播放失败只会在浏览器控制台警告一次，不报构建错。

若同时配置了 `background`，主题会把背景乐的实时音频分析交给背景提供者：上下文里的
`context.spectrum` 提供 `active` / `frame` 两个响应式值、每帧刷新的归一化频谱
`data`（FFT 1024 共 512 个频点）、`binHz`（每频点对应 Hz，随设备采样率自动校准，
可据此精确切 400Hz/800Hz/3000Hz 这类频段）与整体响度 `rmsDb`（dBFS RMS）——只
在播放中且未开启「减弱动态效果」时更新，停止后数据清零。怎么把频谱与响度映射成
视觉（频段着色、位移扰动、消散速度、响度驱动的深浅/alpha……）由你的背景模块决定。

### 4. 建好内容目录

在站点根目录建立 `content/`：

```text
content/
├── home/
│   ├── content.yml
│   ├── zh.md
│   └── en.md
├── releases/
│   └── my-release/
│       ├── content.yml
│       ├── album.yml
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

新闻标签统一在 `synctrolTheme({ tags: { ... } })` 中声明；内容目录不再需要全局定义文件。

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

<NewAlbumReleased title="专辑名" text="一句话介绍" href="/zh/releases/my-release/" cover="./assets/album.svg" />
```

首页必须有 `home-logo` 区块，而且全站只能有一个首页。`<NewAlbumReleased />` 可选：像插在 Logo 下方的一整块可点击横幅（无边框、左右贴满容器、右对齐文字），展示专辑名与介绍文案，标题右侧带 ↗ 箭头；`background` 指向首页内容包里的图片（如 `./assets/album.svg`）作为背景（右对齐、不裁切、最大宽度 460px，图片以外的区域只显示遮罩），`position` 可选指定背景重心（默认 `right center`），`href` 可选（提供后整块都是链接）。文字限制在背景区域内；区块高度 = 内边距 + 标题行 +（介绍行数 + 1）× 行高。遮罩与文字颜色随主题模式自动翻转：亮色为深色遮罩配白字，暗色为浅色遮罩配黑字。

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

各语言正文用 Markdown 写即可。作品若要附专辑元数据，再在该作品文件夹里加 `album.yml`：

```yaml
# releases/my-release/album.yml
title:
  zh: 我的专辑
  en: My Album
copyright: © 2026 Synctrol
credit:
  catalogNumber: SYN-001
  illustrator: 插画师
covers:
  - ./assets/cover.webp
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

专辑详情页由 Markdown 中的组件手动组装。专辑数据组件通过 `src` 读取作品包内的 `album.yml`；播放器和外链直接写在 Markdown 中：

```md
<AlbumArtwork />
<AlbumIdentity src="./album.yml" />
<AlbumTracklist src="./album.yml" />
<TabView>
  <TabPanel label="试听">
    <Player type="netease_player" url="https://music.163.com/#/album?id=368479005" />
  </TabPanel>
  <TabPanel label="收听与获取">
    <Player type="spotify_player" uri="https://open.spotify.com/album/6sTGvo4ElkLW573RbrH5Yk" />
    <Button href="https://resolvers.bandcamp.com/album/gemini-fables">Bandcamp</Button>
  </TabPanel>
</TabView>
<AlbumCredit src="./album.yml" />
<Box><AlbumCovers src="./album.yml" /></Box>
```

- `<AlbumArtwork />` 渲染 content.yml 的 artwork（含占位图回退）。
- `<AlbumIdentity src="...">` 渲染专辑标题。
- `<AlbumTracklist src="...">` 渲染曲目表（不带区块标题与边框）；`<AlbumCovers src="...">` 渲染封面组。`src` 必须指向当前内容包内存在的元数据文件。
- `<TabView>` 与 `<TabPanel label="...">` 组成通用标签页：默认选中第一个面板，切换到哪个面板就自动加载该面板内的 embed。
- `<Player type="...">` 渲染内置播放器。支持 `audio_player`、`youtube_player`、`bilibili_player`、`apple_music_player`、`spotify_player`、`soundcloud_player`、`netease_player`；属性按播放器类型使用 `url`、`uri` 等。播放器类型固定在主题源码中，消费站点不能注册自定义类型。
- 外部收听或购买链接使用 `<Button href="...">名称</Button>`，不写入 `album.yml`。
- `<AlbumCredit src="...">` 按固定顺序渲染 credit：catalogNumber、illustrator、designer、mastering、mix、webDesign、producer、specialThanks；credit 的值可以是字符串或字符串数组（数组每个值独占一行）。`album.yml` 的顶层 copyright 渲染为该区块的最后一行。

### 通用组件

- `<Button href="...">文字</Button>` 渲染工业风格描边按钮（有 `href` 时为链接，否则为普通按钮）。
- `<ButtonGroup align="center">` 把多个 `<Button>` 组合成紧贴的按钮组，`align` 支持 `left` / `center` / `right` / `stretch`（默认 `stretch`，撑满容器等分）。
- `<Box>` 是带 3px 边框的包装盒，可包裹任意组件或正文；`<AlbumCovers src="./album.yml" />` 默认无边框，需要边框时写成 `<Box><AlbumCovers src="./album.yml" /></Box>`。
- `<Notice type="info" title="标题">正文</Notice>` 渲染左侧 3px 竖线提示块；`type` 支持 `info` / `warning` / `success`，`title` 可选。
- `<Accordion label="标题">内容</Accordion>` 渲染可折叠面板，默认折叠，`open` 可设为初始展开。
- `<Divider>文字</Divider>` 渲染带可选居中文字的分隔线。
- `<Figure src="./assets/cover.svg" alt="封面" caption="图 1">` 渲染居中图片与灰色说明文字。

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
- 日期写成 `YYYY-MM-DD`。新闻用到的标签必须先在 `synctrolTheme()` 的 `tags` 选项里声明。
