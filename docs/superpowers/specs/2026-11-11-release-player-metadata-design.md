# 作品元数据与 Player 拆分设计

日期: 2026-11-11  
状态: 待审阅

## 目标

去掉「definitions 平台目录 + book.yml 链接条目」带来的双层复杂度。作品页改为：

1. **旁路元数据文件**只承载曲目 / credit / covers / 标题等展示数据；
2. **Markdown** 用内置 `<Player>` 挂播放器、用现有 `<Button>` 挂外链；
3. **definitions.yml** 不再声明平台；不支持消费站自定义播放器类型。

这是一次 **breaking** 契约变更。

## 决策摘要

| 决策 | 选择 |
| --- | --- |
| 平台友好 key / definitions.platforms | 删除；Player 直接使用内置 type |
| book.yml | 整份删除 |
| 播放器 vs 外链 | 分开：`<Player>` / 现有 `<Button>` |
| 曲目等元数据 | 旁路 YAML（如 `album.yml`），组件 `src` 指向同一文件取不同字段 |
| category digital/physical | 删除；由 type→渲染器决定行为 |
| gift 线 | 全部删除（类型、组件、文档、测试） |
| 自定义 `platforms.types` | 删除；扩展播放器必须改主题源码 |
| AlbumPlatform | 替换为 `Player` |
| GiftItem / LinkPlatform 等旧平台 entry UI | 随契约删除 |

## 契约边界

### 删除

- 内容包中的 `book.yml`（出现即构建失败）。
- `definitions.yml` 的 `platforms` 字段（出现即构建失败）；文件只保留 `tags`（及未来若有的非平台字段）。
- 内容类型 `gift`；`content.yml` 写 `type: gift` 构建失败。
- 组件：`AlbumPlatform`、`GiftItem`；仅服务旧 platform entry 的渲染链路（如 `LinkPlatform`、`PlatformLinks`、按 platform key 查找的 embed 列表）若无其它引用则删除。
- 主题选项：`platforms.types` 自定义注册；album↔digital / gift↔physical 的 category 校验。
- 编译产物中的 `previewLinks` / `platformLinks` / 整本注入 `book`（见下文上下文）。

### 保留（形状调整）

- 内置播放器 type 注册表（主题源码内）：`youtube_player`、`bilibili_player`、`apple_music_player`、`spotify_player`、`soundcloud_player`、`netease_player`、`audio_player`。  
  - 删除内置 `link` type（外链改走 `<Button>`）。
- `content.yml` 的 release 字段（`artwork`、`cover`、`date` 等）不变；`AlbumArtwork` 仍读 content 包 artwork。
- `TabView` / `TabPanel` 与 embed 激活加载策略保持现状（活动面板内 Player 激活时加载）。
- 平台 CSP 审计产物 `synctrol-csp.json`：改为根据页面中实际使用的 `<Player type>` 汇总 origins，不注入 CSP meta。
- 主题选项保留 `platforms.loadStrategy`（`'interaction' | 'viewport'`，默认 `'interaction'`），作用于 `TabView` 之外的 `<Player>`；**删除** `platforms.types`。未知 `platforms` 子字段构建失败。

### 新增 / 替换

- 旁路元数据文件 + 组件 `src`。
- 全局组件 `<Player>`。
- 外链复用已有全局 `<Button href="…">`。

## 旁路元数据文件

### 约定

- 建议文件名：`album.yml`，放在内容包目录内；组件 `src` 为相对**该内容包目录**的路径（与旧 book 资源解析一致），禁止指到包外。
- 同一文件可被多个组件共用：

```md
<AlbumIdentity src="./album.yml" />
<AlbumTracklist src="./album.yml" />
<AlbumCredit src="./album.yml" />
<AlbumCovers src="./album.yml" />
```

- 构建期解析 YAML、校验、把 `covers` 等资源纳入哈希管线；运行时组件消费编译后的片段，浏览器不直接读 YAML。
- 缺 `src`、路径逃逸出内容包、文件缺失、未知字段、类型不合法 → **构建失败**（不再「空渲染 + warn」作为主路径，避免漏挂数据上线）。

### 建议字段（album）

```yaml
title:          # Multilanguage，供 AlbumIdentity；亦可比照旧 book.title
  zh: …
  en: …
copyright: …    # 字符串；由 AlbumCredit 作版权行（与现行 credit 区块行为对齐）
credit:         # 固定键集合，同现行：catalogNumber / illustrator / designer /
                # mastering / mix / webDesign / producer / specialThanks
                # 值：字符串或非空字符串数组
  designer: …
covers:         # 相对内容包的资源路径列表
  - ./assets/cover.webp
discs:
  - title: { zh: 第一碟, en: Disc One }
    desc: …     # 可选，同现行 disc.desc
    tracks:
      - title: { zh: 第一曲, en: Track One }
        artists: [Synctrol]
        duration: 272
        desc: … # 可选
```

**禁止**在该文件中出现任何播放器 / 外链 URL 字段（`links`、`platform`、`players` 等未知字段 → 构建失败）。

顶层**不需要** `type` 字段（文件角色由组件 `src` 使用表达）。写出 `type` 视为未知字段，构建失败。

## Player

### Markdown API

```md
<Player type="netease_player" url="https://music.163.com/#/album?id=…" />
<Player type="youtube_player" url="https://www.youtube.com/watch?v=…" />
<Player type="spotify_player" uri="https://open.spotify.com/album/…" />
```

- `type`：内置能力 key 之一；未知 type 或校验失败 → **构建失败**（通过主题编译期收集 Markdown 中的 Player 用法，或等价静态检查；不得只靠生产环境 console.warn）。
- 其余属性：沿用该 type 现行 validate 契约（`url` / `uri` / `id` / `resourceType` 等）。
- 加载策略：`TabView` 活动面板内激活时加载；面板外遵循 `platforms.loadStrategy`。

### 与 Button 的分工

| 需求 | 用法 |
| --- | --- |
| 嵌入式试听 / 视频播放器 | `<Player type="…">` |
| 可命名外链按钮 | `<Button href="https://…">Bandcamp</Button>` |

不再存在「名为 bandcamp 的 link 平台定义」。

## 上下文与布局

- `ReleaseDetail` 仍只渲染草稿标记 + Markdown 正文；`frontmatter.title` 仅 SEO。
- `synctrol-release` 注入收缩为页面壳层所需最小集（如 locale、messages、artwork 来自 content、loadStrategy）。**不再**注入整本 book / gift / platforms definitions。
- `AlbumIdentity` / `AlbumTracklist` / `AlbumCredit` / `AlbumCovers` 以各自 `src` 的编译结果为准。
- `AlbumArtwork` 继续只用 `content.yml` 的 `artwork`。

## CSP

- 构建扫描（或编译时收集）站点中出现的 Player type，按内置注册表 `cspOrigins` 写入 `synctrol-csp.json`（`frame-src` / `media-src` / `connect-src`）。
- 纯 `<Button>` 外链不进入 frame-src。

## 文档与迁移

- 更新 `README.md`、`AGENTS.md`、fixtures（含 consumer-smoke）、CHANGELOG（breaking）。
- 示例作品页展示：`album.yml` + `<Player>` + `<Button>` + 现有专辑组件。
- 明确声明：新增播放器 type 只能改主题源码，不提供消费站注册 API。

## 测试要求

- 删除或改写：book.yml、gift、definitions.platforms、AlbumPlatform、自定义 platforms.types、category 校验相关测试。
- 新增/改写：`album.yml` + `src` 校验与曲目/credit/covers 渲染；`<Player>` 各内置 type；Button 外链；definitions 含 `platforms` 时失败；存在 `book.yml` 时失败；`type: gift` 失败；CSP 仅含实际 Player origins。
- `npm test` 与构建后 assert / consumer-smoke 全绿。

## 非目标

- 不在本变更中重做壳层视觉或新增外观定制项。
- 不引入新的通用「平台目录」或消费站可插拔 Player 插件机制。
- 不把曲目改成纯手写 Markdown 列表（结构化 `discs`/`tracks` 保留）。

## 风险

- 所有现有消费内容与 smoke fixture 需一次性迁移；旧 book/definitions 示例失效。
- Markdown 中 `<Player>` 的静态收集需接入主题编译管线；实现计划必须给出具体钩子与失败路径，满足「非法 Player → 构建失败」。
