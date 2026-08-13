# 专辑页组件化设计

日期:2026-08-14
状态:已批准(样式细节待实现后调整)

## 目标

专辑(release)详情页不再由布局自动渲染 book 数据,改为:布局只提供注入上下文,站点作者在 Markdown 中通过全局 Vue 组件手动组装页面。新增「试听(preview)」概念与结构化 credit。

## 决策摘要

- ReleaseDetail 布局只渲染 `DraftBadge`(有草稿时)+ `<Content />`;`return-link`、`title-date`、`artwork`、`book-identity`、`album-body`、`gift-body` 自动区块全部移除。返回链接功能删除。
- 布局 `provide('synctrol-release', ...)` 注入专辑数据;组件无 props(除 `GiftItem` 的 `id`),数据来自注入,未注入时渲染空 + `console.warn`。
- 注入上下文结构(具体类型在实现时固化):`artwork`(kind + 解析结果 + alt)、`book`(type/title/copyright/credit/previewLinks/platformLinks/discs/covers,album 分支)、`gift`(items,按 id 索引,gift 分支)、`platforms`(definitions/types/loadStrategy/messages/locale/mainLocale)。
- 组件在 theme 客户端配置 `enhance({ app })` 里全局注册,Markdown 中直接使用。
- 页面 h1 不再渲染;`frontmatter.title` 仅用于 SEO。作者用 `AlbumIdentity` 渲染视觉标题。

## 数据模型

### preview 标志

- `PlatformTypeRegistration` 新增可选 `preview?: true`。
- 内置类型标记 `preview: true`:`soundcloud_player`、`audio_player`、`netease_player`。
- 不标记:`link`、`youtube_player`、`bilibili_player`、`apple_music_player`、`spotify_player`。
- 自定义类型可声明 `preview: true`。
- 判定按平台条目的 type 查注册表,`preview === true` 即试听。

### book.yml 变更

- 顶层 `desc`、`authors` 移除(album 与 gift 分支都写则构建报错 `UNKNOWN_FIELD`);JSON-LD 的 `byArtist` 随之移除。
- 子级 `disc.desc`、`track.desc`、`gift.items[].desc` 保留。
- `album.links` 编译时按 preview 判定拆成 `previewLinks`(试听,embed 渲染)与 `platformLinks`(数字平台)。gift 分支同样拆分,逻辑一致。
- 顶层新增可选 `credit` 映射,固定键:`catalogNumber`、`illustrator`、`designer`、`mastering`、`mix`、`webDesign`、`producer`、`specialThanks`。值均为字符串。未知键或非字符串值构建报错。

### detail model

- `ReleaseDetailSection` 删除 `return-link`、`title-date`、`artwork`、`book-identity`、`album-body`、`gift-body`。
- 新 model:`{ showDraftBadge, draftLabel, provide 数据 }`;`includedInIndex` 等索引契约不变。
- `resolveArtwork` 的 placeholder/empty-frame 回退逻辑移入注入上下文,由 `AlbumArtwork` 消费。
- `SynctrolReleaseFrontmatter` detail 分支改为携带注入数据。

## 组件清单

| 组件 | 渲染内容 |
| --- | --- |
| `AlbumArtwork` | `content.yml` artwork;placeholder 回退、empty-frame 十字占位;`alt` 用页面标题 |
| `AlbumIdentity` | 仅 book `title`(h2) |
| `AlbumCopyright` | book `copyright` 文本;无时不渲染 |
| `AlbumPreviews` | 试听链接区:h2「试听」+ 每条 embed(`PlatformEmbed` 复用交互/视口加载);无 preview 链接时不渲染 |
| `AlbumPlatformLinks` | 数字平台区:h2 + `PlatformLinks` 列表(link 类型外链按钮,player 类型 embed);无链接时不渲染 |
| `AlbumTracklist` | 曲目表:每个 disc 一个 article(h3 `DISC n · 标题`),ol 行内「序号 + 标题」两列,艺人小字在标题下方;无曲目时不渲染 |
| `AlbumCredit` | `credit` 键值表(dl):按固定顺序 catalogNumber/illustrator/designer/mastering/mix/webDesign/producer/specialThanks,仅渲染已提供的项;标签用 messages;无 credit 时不渲染 |
| `AlbumCovers` | `album.covers` 封面组:ul + li 图片(loading=lazy,alt 带序号);无 covers 时不渲染 |
| `GiftItem` | prop `id` 指向 `gift.items[].id`;渲染该项 title/covers/links(按 preview 拆分)/copyright;id 不存在时渲染空 + warn |

### 消息

- `messages.ts` 新增:`previewSectionTitle`(试听 / Preview)、`creditCatalogNumber`、`creditIllustrator`、`creditDesigner`、`creditMastering`、`creditMix`、`creditWebDesign`、`creditProducer`、`creditSpecialThanks`(zh/en + 消费端可覆盖)。

## 样式

延续主题既有语言(3px 边框、直角、黑白工业风),全部进 `src/client/styles/release.css`:

- `AlbumArtwork`:复用现有 `.syn-release-artwork` 样式(区块内 `max-width: var(--syn-artwork-width)` 居中);empty-frame 保持十字占位。
- 区块统一外壳:`.syn-album-section` 类(`border: var(--syn-border-strong); margin-block: 1.5rem; padding: 1rem`),`AlbumPreviews`/`AlbumPlatformLinks`/`AlbumTracklist`/`AlbumCredit`/`AlbumCovers`/`GiftItem` 共用;区块标题 h2 保持现有基调。
- `AlbumTracklist`:行内 grid「序号(auto,等宽右对齐)+ 标题(1fr)」;艺人 `.syn-album-track__artists` 在标题下方小字(`font-size: 0.75em`,次级色);行间 `border-block-start: var(--syn-border-subtle)`;移除 duration 列与现有 `.syn-album-track__label` 固定宽度写法。
- `AlbumCredit`:dl 网格「角色(1fr)+ 值(1.618fr)」,行间 subtle 边框,角色文本用 messages 标签。
- `AlbumCovers`:ul 网格 2 列(移动)/3 列(桌面),图片 `aspect-ratio: 1/1; object-fit: cover`,与索引方图一致。
- `AlbumPreviews` / `AlbumPlatformLinks`:沿用现有 `PlatformLinks` 列表与 embed 样式;previews 区块内 embed 容器在移动端宽度 100%。
- `GiftItem`:标题 + 封面组 + preview/平台链接 + copyright,整体一个 `.syn-gift-item` 外壳(与 gift-body 现有样式对齐)。
- 响应式:移动端单列堆叠;768px 以上区块内多列(仅 covers 网格变化)。

## 测试

- 编译:book.yml 顶层 desc/authors 报错、credit 固定键校验、preview 拆分、JSON-LD byArtist 移除。
- 组件:`Album*` 与 `GiftItem` 的注入渲染契约、无注入时 warn + 空渲染。
- 样式:`tests/client/styles/release-css.test.ts` 字符串断言锁定新类。
- 现有 `tests/` 相关用例随契约变更同步更新。
