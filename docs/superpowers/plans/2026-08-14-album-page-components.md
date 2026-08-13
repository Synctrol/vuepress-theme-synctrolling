# 专辑页组件化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 专辑详情页从「布局自动渲染 book 区块」改为「布局只注入上下文,站点作者在 Markdown 中用全局组件组装页面」,并新增试听(preview)链接概念与结构化 credit。

**Architecture:** 编译期把 book.yml 数据拆分成 `previewLinks`/`platformLinks`/`credit` 注入 frontmatter;客户端 `ReleaseDetail` 布局通过 `provide(SYNCTROL_RELEASE_CONTEXT_KEY)` 提供上下文;九个无 props 组件(`AlbumArtwork`/`AlbumIdentity`/`AlbumCopyright`/`AlbumPreviews`/`AlbumPlatformLinks`/`AlbumTracklist`/`AlbumCredit`/`AlbumCovers`/`GiftItem(id)`)在 client config 全局注册,Markdown 直接使用。

**Tech Stack:** TypeScript NodeNext(import 必须带 `.js` 后缀)、Vue 3 SFC、VuePress 2 rc.24、vitest、CSS 字符串断言测试。

**验证命令:** `npx vitest run <file>` → `npm test` → `npm run build` → `npm pack` → fixture `npm install <tarball> && npx vuepress build .` → ChromeMCP 检查。

---

### Task 1: 共享契约 —— BookCredit、BookBase 去 desc/authors、messages 增删键

**Files:**
- Modify: `src/shared/types.ts:26-59`(LocaleMessages)、`src/shared/types.ts:204-209`(BookBase)
- Modify: `src/shared/messages.ts`
- Test: `tests/shared/messages.test.ts`、`tests/shared/types.test.ts`

- [ ] **Step 1: 写失败测试**

修改 `tests/shared/messages.test.ts`:键数 32 → 39,新增断言:

```ts
import { describe, expect, it } from 'vitest'
import { enMessages, zhMessages } from '../../src/shared/messages'
import type { LocaleMessages } from '../../src/shared/types'

const keys = Object.keys(enMessages) as Array<keyof LocaleMessages>

describe('default locale messages', () => {
  it('exports complete chinese and english catalogs with the same keys', () => {
    expect(Object.keys(zhMessages).sort()).toEqual(keys.sort())
    expect(keys).toHaveLength(39)
  })

  it('uses the approved english translation-unavailable copy', () => {
    expect(enMessages.translationUnavailable).toBe(
      'This article is not yet available in English. Showing the original version.',
    )
  })

  it('includes the required content-facing chinese defaults', () => {
    expect(zhMessages.published).toBe('发布于')
    expect(zhMessages.updated).toBe('更新于')
    expect(zhMessages.album).toBe('专辑')
    expect(zhMessages.tracklist).toBe('曲目列表')
    expect(zhMessages.disc).toBe('第 {number} 碟')
    expect(zhMessages.track).toBe('第 {number} 曲')
    expect(zhMessages.covers).toBe('封面')
    expect(zhMessages.platformLinks).toBe('收听与获取')
    expect(zhMessages.gifts).toBe('周边')
    expect(zhMessages.giftItems).toBe('周边清单')
    expect(zhMessages.readMore).toBe('阅读更多')
    expect(zhMessages.emptyReleases).toBe('暂无作品')
    expect(zhMessages.emptyNews).toBe('暂无新闻')
    expect(zhMessages.previewSectionTitle).toBe('试听')
    expect(zhMessages.creditCatalogNumber).toBe('制品编号')
    expect(zhMessages.creditIllustrator).toBe('插画')
    expect(zhMessages.creditDesigner).toBe('平面设计')
    expect(zhMessages.creditMastering).toBe('母带')
    expect(zhMessages.creditMix).toBe('混音')
    expect(zhMessages.creditWebDesign).toBe('网页设计')
    expect(zhMessages.creditProducer).toBe('制作人')
    expect(zhMessages.creditSpecialThanks).toBe('特别鸣谢')
  })

  it('drops the retired return-to-releases and authors messages', () => {
    expect('returnToReleases' in zhMessages).toBe(false)
    expect('authors' in zhMessages).toBe(false)
  })
})
```

修改 `tests/shared/types.test.ts` 的 `LOCALE_MESSAGE_KEYS` 数组:删除 `'returnToReleases'`、`'authors'`,追加:

```ts
  'previewSectionTitle',
  'creditCatalogNumber',
  'creditIllustrator',
  'creditDesigner',
  'creditMastering',
  'creditMix',
  'creditWebDesign',
  'creditProducer',
  'creditSpecialThanks',
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/shared/messages.test.ts tests/shared/types.test.ts`
Expected: FAIL(键数不匹配 / 新键缺失)

- [ ] **Step 3: 实现**

`src/shared/types.ts` 中 `LocaleMessages` 替换为:

```ts
export interface LocaleMessages {
  draft: string
  translationUnavailable: string
  light: string
  dark: string
  auto: string
  menu: string
  close: string
  home: string
  language: string
  themeModeAnnouncement: string
  published: string
  previousPage: string
  nextPage: string
  updated: string
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
  previewSectionTitle: string
  creditCatalogNumber: string
  creditIllustrator: string
  creditDesigner: string
  creditMastering: string
  creditMix: string
  creditWebDesign: string
  creditProducer: string
  creditSpecialThanks: string
}
```

`src/shared/types.ts` 中 `BookBase` 替换(desc/authors 删除,credit 新增),并在文件里新增 BookCredit 类型(放在 BookBase 之前):

```ts
export const BOOK_CREDIT_KEYS = [
  'catalogNumber',
  'illustrator',
  'designer',
  'mastering',
  'mix',
  'webDesign',
  'producer',
  'specialThanks',
] as const

export type BookCreditKey = (typeof BOOK_CREDIT_KEYS)[number]

export type BookCredit = Partial<Record<BookCreditKey, string>>

export interface BookBase {
  title: Multilanguage
  copyright?: string
  credit?: BookCredit
}
```

`src/shared/messages.ts` 中 zh/en 两表:删除 `returnToReleases`、`authors` 键,新增:

```ts
  previewSectionTitle: '试听',
  creditCatalogNumber: '制品编号',
  creditIllustrator: '插画',
  creditDesigner: '平面设计',
  creditMastering: '母带',
  creditMix: '混音',
  creditWebDesign: '网页设计',
  creditProducer: '制作人',
  creditSpecialThanks: '特别鸣谢',
```

```ts
  previewSectionTitle: 'Preview',
  creditCatalogNumber: 'Catalog Number',
  creditIllustrator: 'Illustrator',
  creditDesigner: 'Designer',
  creditMastering: 'Mastering',
  creditMix: 'Mix',
  creditWebDesign: 'Web Design',
  creditProducer: 'Producer',
  creditSpecialThanks: 'Special Thanks',
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/shared/messages.test.ts tests/shared/types.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/shared/types.ts src/shared/messages.ts tests/shared/messages.test.ts tests/shared/types.test.ts
git commit -m "feat: book credit keys and preview message contract"
```

---

### Task 2: book.yml 解析 —— 顶层 desc/authors 报错、credit 解析

**Files:**
- Modify: `src/compiler/book.ts`(ALBUM_BOOK_FIELDS/GIFT_BOOK_FIELDS、parseCredit、parseAlbumBook/parseGiftBook)
- Test: `tests/compiler/book-album.test.ts`、`tests/compiler/book-gift.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/compiler/book-album.test.ts` 顶部现有 describe 里,把引用顶层 desc/authors 的用例替换为 credit 用例。文件开头(第 97-220 行附近)现有测试直接重写:将

```ts
const yaml = `type: album
title:
  zh: 第一张专辑
  en: First Album
desc:
  zh: 第一张专辑介绍
  en: First Album description
authors: [Synctrol, Guest]
copyright: © 2026 Synctrol
album:
  covers: ['./assets/front.webp']
  discs:
    - title: Disc
      desc: Main disc
      tracks:
        - title: Opening
          artists: [Synctrol]
          duration: 120
          desc: Opening track
`
```

改为

```ts
const yaml = `type: album
title:
  zh: 第一张专辑
  en: First Album
copyright: © 2026 Synctrol
credit:
  catalogNumber: DVSP-0327
  illustrator: タイキ
album:
  covers: ['./assets/front.webp']
  discs:
    - title: Disc
      desc: Main disc
      tracks:
        - title: Opening
          artists: [Synctrol]
          duration: 120
          desc: Opening track
`
```

对应 `expect(parsed)` 断言:`desc: {zh...}` 与 `authors` 断言删除,新增 `credit: { catalogNumber: 'DVSP-0327', illustrator: 'タイキ' }`。

在文件中新增 describe(沿用该文件现有的 `writeBook(body)`/`defs` 辅助,`parseBook(path, defs, 'zh')` 签名):

```ts
describe('parseAlbumBook credit validation', () => {
  it('parses credit keys and ignores omitted ones', () => {
    const path = writeBook(`type: album
title: Album
credit:
  catalogNumber: DVSP-0327
  illustrator: タイキ
album: {}
`)
    const book = parseBook(path, defs, 'zh') as AlbumBook
    expect(book.credit).toEqual({ catalogNumber: 'DVSP-0327', illustrator: 'タイキ' })
  })

  it('rejects unknown credit keys', () => {
    const run = () =>
      parseBook(
        writeBook(`type: album
title: Album
credit:
  master: Who
album: {}
`),
        defs,
        'zh',
      )
    expect(run).toThrowError(/Unknown field "credit\.master"/)
  })

  it('rejects non-string credit values', () => {
    const run = () =>
      parseBook(
        writeBook(`type: album
title: Album
credit:
  illustrator: 123
album: {}
`),
        defs,
        'zh',
      )
    expect(run).toThrowError(/credit\.illustrator must be a string/)
  })

  it('rejects top-level desc and authors fields', () => {
    for (const field of ['desc: x', 'authors: [A]']) {
      const run = () =>
        parseBook(
          writeBook(`type: album
title: Album
${field}
album: {}
`),
          defs,
          'zh',
        )
      expect(run).toThrowError(/Unknown field/)
    }
  })

  it('keeps disc and track desc fields', () => {
    const book = parseBook(
      writeBook(`type: album
title: Album
album:
  discs:
    - title: Disc
      desc: Main disc
      tracks:
        - title: T
          artists: [A]
          duration: 60
          desc: Opening track
`),
      defs,
      'zh',
    ) as AlbumBook
    expect(book.album.discs?.[0]?.desc).toBe('Main disc')
  })
})
```

(`AlbumBook` 类型 import 已在文件顶部存在则复用,否则补充 `import type { AlbumBook } from '../../../src/shared/types'`。)

同样在 `tests/compiler/book-gift.test.ts` 中:顶层 desc/authors 用例改为报错断言,新增 gift credit 解析用例(该文件辅助与 book-album.test.ts 同构,`writeBook`/`defs` 按该文件实际辅助名):

```ts
it('parses gift credit and rejects top-level desc/authors', () => {
  const book = parseBook(
    writeBook(`type: gift
title: Gifts
credit:
  producer: Synctrol
gift:
  items: []
`),
    defs,
    'zh',
  ) as GiftBook
  expect(book.credit).toEqual({ producer: 'Synctrol' })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/compiler/book-album.test.ts tests/compiler/book-gift.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/compiler/book.ts`:

1. 顶部 import 增加类型(第一处 import 语句中追加 `BookCredit`、`BookCreditKey`,并新增值导入):

```ts
import {
  BOOK_CREDIT_KEYS,
} from '../shared/types.js'
```

(值导入与现有 type import 分行;`BookCredit`/`BookCreditKey` 类型加到现有 `import type { ... } from '../shared/types.js'` 列表。)

2. 顶部字段常量:

```ts
const ALBUM_BOOK_FIELDS = ['type', 'title', 'copyright', 'credit', 'album'] as const
const GIFT_BOOK_FIELDS = ['type', 'title', 'copyright', 'credit', 'gift'] as const
```

3. 在 `parseOptionalCopyright` 之后新增:

```ts
function parseCredit(
  value: unknown,
  path: string,
): BookCredit | undefined {
  if (value === undefined) return undefined
  if (!isPlainMapping(value, path, 'credit')) {
    invalid('INVALID_BOOK', 'credit must be a plain mapping', path)
  }
  const credit: BookCredit = {}
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !BOOK_CREDIT_KEYS.includes(key as BookCreditKey)) {
      invalid('UNKNOWN_FIELD', `Unknown field "credit.${String(key)}"`, path)
    }
    const entry = (value as PlainRecord)[key]
    if (typeof entry !== 'string') {
      invalid('INVALID_BOOK', `credit.${key} must be a string`, path)
    }
    credit[key as BookCreditKey] = entry
  }
  return credit
}
```

4. `parseAlbumBook` 内:删除 desc/authors 相关行(`parseOptionalMultilanguage(raw.desc...)` 与 `parseOptionalStringArray(raw.authors...)` 与返回体中的对应展开),新增:

```ts
  const credit = parseCredit(raw.credit, path)
```

返回体:

```ts
  return {
    type: 'album',
    title: assertMultilanguage(raw.title, mainLocale, path, 'title'),
    ...(copyright === undefined ? {} : { copyright }),
    ...(credit === undefined ? {} : { credit }),
    album: { ... },
  }
```

5. `parseGiftBook` 同样处理(删除 desc/authors,新增 credit 解析与展开)。

`parseOptionalMultilanguage` 与 `parseOptionalStringArray` 仍被 disc/track/item 使用,保留。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/compiler/book-album.test.ts tests/compiler/book-gift.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/compiler/book.ts tests/compiler/book-album.test.ts tests/compiler/book-gift.test.ts
git commit -m "feat: book.yml top-level desc/authors removed, credit parsing added"
```

---

### Task 3: preview 标志 —— PlatformTypeRegistration.preview + 内置音频型标记

**Files:**
- Modify: `src/shared/options.ts:77-84`(PlatformTypeRegistration)
- Modify: `src/platforms/builtins/soundcloud-player.ts`、`src/platforms/builtins/audio-player.ts`、`src/platforms/builtins/netease-player.ts`
- Test: `tests/compiler/platform-entry-registry.test.ts`(或新建 `tests/shared/platform-preview.test.ts`)

- [ ] **Step 1: 写失败测试**

新建 `tests/shared/platform-preview.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { builtInPlatformTypes } from '../../src/platforms/builtins/index'

describe('preview platform types', () => {
  it('marks the audio-ish built-ins as preview', () => {
    expect(builtInPlatformTypes.soundcloud_player.preview).toBe(true)
    expect(builtInPlatformTypes.audio_player.preview).toBe(true)
    expect(builtInPlatformTypes.netease_player.preview).toBe(true)
  })

  it('keeps link/video/store built-ins non-preview', () => {
    expect(builtInPlatformTypes.link.preview).toBeUndefined()
    expect(builtInPlatformTypes.youtube_player.preview).toBeUndefined()
    expect(builtInPlatformTypes.bilibili_player.preview).toBeUndefined()
    expect(builtInPlatformTypes.spotify_player.preview).toBeUndefined()
    expect(builtInPlatformTypes.apple_music_player.preview).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/shared/platform-preview.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/shared/options.ts`:

```ts
export interface PlatformTypeRegistration<
  T extends PlatformEntryBase = PlatformEntryBase,
> {
  /** True when entries of this type are preview/demo links rendered in the preview section. */
  preview?: true
  validate(entry: unknown): T
  component: Component
  cspOrigins(entry: T): string[]
  fallbackUrl?(entry: T): string | undefined
}
```

`src/platforms/builtins/soundcloud-player.ts`:

```ts
export const soundcloudPlayerType: PlatformTypeRegistration<SoundCloudPlayerEntry> =
  {
    preview: true,
    validate(raw: unknown): SoundCloudPlayerEntry {
```

`src/platforms/builtins/audio-player.ts`:

```ts
export const audioPlayerType: PlatformTypeRegistration<AudioPlayerEntry> = {
  preview: true,
  validate(raw: unknown): AudioPlayerEntry {
```

`src/platforms/builtins/netease-player.ts`:同样加 `preview: true,`(该文件结构同 soundcloud)。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/shared/platform-preview.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/shared/options.ts src/platforms/builtins/soundcloud-player.ts src/platforms/builtins/audio-player.ts src/platforms/builtins/netease-player.ts tests/shared/platform-preview.test.ts
git commit -m "feat: preview flag on platform type registrations"
```

---

### Task 4: 链接拆分辅助 + detail model 重写

**Files:**
- Create: `src/shared/release/link-roles.ts`(isPreviewEntry / splitPreviewLinks)
- Modify: `src/shared/release/types.ts`(ReleaseDetailModel 全新形态,删除 sections)
- Modify: `src/compiler/release/detail-model.ts`(重写)
- Test: Create `tests/shared/release/link-roles.test.ts`;Modify `tests/compiler/release/detail-model.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `tests/shared/release/link-roles.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  isPreviewEntry,
  splitPreviewLinks,
} from '../../../src/shared/release/link-roles'
import type {
  ContentDefinitions,
  NormalizedPlatformEntry,
} from '../../../src/shared/types'
import { builtInPlatformTypes } from '../../../src/platforms/builtins/index'

const definitions: ContentDefinitions['platforms'] = {
  sc: { category: 'digital', type: 'soundcloud_player', name: 'SoundCloud' },
  spotify: { category: 'digital', type: 'spotify_player', name: 'Spotify' },
}

const entries: NormalizedPlatformEntry[] = [
  { platform: 'sc', url: 'https://soundcloud.com/a/b' },
  { platform: 'spotify', url: 'https://open.spotify.com/album/x' },
]

describe('preview link roles', () => {
  it('classifies entries by their type registration preview flag', () => {
    expect(isPreviewEntry(entries[0], definitions, builtInPlatformTypes)).toBe(true)
    expect(isPreviewEntry(entries[1], definitions, builtInPlatformTypes)).toBe(false)
  })

  it('splits entries into preview and platform groups keeping order', () => {
    const { previewLinks, platformLinks } = splitPreviewLinks(
      entries,
      definitions,
      builtInPlatformTypes,
    )
    expect(previewLinks.map((e) => e.platform)).toEqual(['sc'])
    expect(platformLinks.map((e) => e.platform)).toEqual(['spotify'])
  })

  it('treats unknown platform or type as non-preview', () => {
    expect(
      isPreviewEntry(
        { platform: 'missing' },
        definitions,
        builtInPlatformTypes,
      ),
    ).toBe(false)
  })
})
```

重写 `tests/compiler/release/detail-model.test.ts`(整个文件替换):

```ts
import { describe, expect, it } from 'vitest'
import { buildReleaseDetailModel } from '../../../src/compiler/release/detail-model'
import { albumBook, asset, giftBook, releaseDetailPage, zhMessages } from '../../helpers/release-fixtures'
import { builtInPlatformTypes } from '../../../src/platforms/builtins/index'
import type { RouteContentPackage } from '../../../src/shared/types'
import type { ContentDefinitions } from '../../../src/shared/types'

const basePkg: RouteContentPackage = {
  dir: '/content/releases/first-release',
  identity: 'release:first-release',
  type: 'release',
  slug: 'first-release',
  date: '2026-08-11',
  draft: false,
  tags: [],
  cover: './assets/article-cover.webp',
  artwork: './assets/album-entry.webp',
  locales: {},
}

const definitions: ContentDefinitions['platforms'] = {
  soundcloud: { category: 'digital', type: 'soundcloud_player', name: 'SoundCloud' },
  bilibili: { category: 'digital', type: 'bilibili_player', name: { zh: '哔哩哔哩', en: 'Bilibili' } },
  taobao: { category: 'physical', type: 'link', name: '淘宝' },
}

describe('buildReleaseDetailModel', () => {
  it('produces the injected context shape for an album book', () => {
    const book = albumBook({
      credit: { catalogNumber: 'DVSP-0327', illustrator: 'タイキ' },
      album: {
        covers: ['./assets/front.webp'],
        links: [
          { platform: 'soundcloud', url: 'https://soundcloud.com/synctrol/x' },
          { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 1, autoplay: false },
        ],
        discs: [
          {
            title: { zh: '第一碟', en: 'Disc One' },
            tracks: [
              { title: { zh: '第一曲', en: 'Track One' }, artists: ['Synctrol'], duration: 272 },
            ],
          },
        ],
      },
    })
    const model = buildReleaseDetailModel({
      page: releaseDetailPage(),
      pkg: basePkg,
      book,
      messages: zhMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => asset('/assets/content/release/first-release/album-entry.hash.webp'),
      resolveAlbumCover: (p) => asset(`/assets/content/release/first-release/${p.replace('./assets/', '')}`),
      resolveGiftItemCover: (p) => asset(`/assets/content/release/first-release/${p.replace('./assets/', '')}`),
      resolvePlaceholder: () => undefined,
      showDrafts: false,
    })

    expect(model.includedInIndex).toBe(true)
    expect(model.showDraftBadge).toBe(false)
    expect(model.artwork).toMatchObject({ kind: 'artwork' })
    expect(model.book).toMatchObject({
      type: 'album',
      title: { text: '第一张专辑' },
      copyright: '© 2026 Synctrol',
      credit: { catalogNumber: 'DVSP-0327', illustrator: 'タイキ' },
    })
    expect(model.book?.type === 'album' && model.book.previewLinks.map((e) => e.platform)).toEqual(['soundcloud'])
    expect(model.book?.type === 'album' && model.book.platformLinks.map((e) => e.platform)).toEqual(['bilibili'])
    expect(model.book?.type === 'album' && model.book.covers).toHaveLength(1)
    expect(model.book?.type === 'album' && model.book.discs[0].tracks[0].number).toBe(1)
  })

  it('builds gift items with split links and keeps item desc', () => {
    const book = giftBook({
      gift: {
        items: [
          {
            id: 'poster',
            title: { zh: '纪念海报', en: 'Poster' },
            desc: { zh: '限量', en: 'Limited' },
            covers: ['./assets/poster-front.webp'],
            links: [{ platform: 'taobao', url: 'https://item.taobao.com/example' }],
          },
        ],
      },
    })
    const model = buildReleaseDetailModel({
      page: releaseDetailPage(),
      pkg: { ...basePkg, artwork: undefined },
      book,
      messages: zhMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => undefined,
      resolveAlbumCover: (p) => asset(p),
      resolveGiftItemCover: (p) => asset(p),
      resolvePlaceholder: () => undefined,
      showDrafts: false,
    })

    expect(model.artwork).toMatchObject({ kind: 'empty-frame' })
    expect(model.book?.type === 'gift' && model.book.items).toHaveLength(1)
    expect(model.book?.type === 'gift' && model.book.items[0]).toMatchObject({
      id: 'poster',
      title: { text: '纪念海报' },
      desc: { text: '限量' },
    })
    expect(model.book?.type === 'gift' && model.book.items[0].platformLinks.map((e) => e.platform)).toEqual(['taobao'])
  })

  it('omits book but keeps artwork and draft flags when book.yml is absent', () => {
    const model = buildReleaseDetailModel({
      page: releaseDetailPage({ isDraft: true }),
      pkg: basePkg,
      book: undefined,
      messages: zhMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => asset('/entry.webp'),
      resolveAlbumCover: () => {
        throw new Error('should not resolve album covers without a book')
      },
      resolveGiftItemCover: () => {
        throw new Error('should not resolve gift covers without a book')
      },
      resolvePlaceholder: () => undefined,
      showDrafts: true,
    })
    expect(model.book).toBeUndefined()
    expect(model.showDraftBadge).toBe(true)
    expect(model.draftLabel).toBe('草稿')
    expect(model.artwork.artworkKind).toBe('artwork')
  })

  it('falls back to the placeholder artwork when package artwork is missing', () => {
    const model = buildReleaseDetailModel({
      page: releaseDetailPage(),
      pkg: { ...basePkg, artwork: undefined },
      book: undefined,
      messages: zhMessages,
      mainLocale: 'zh',
      definitions,
      platformTypes: builtInPlatformTypes,
      resolveArtwork: () => undefined,
      resolveAlbumCover: () => {
        throw new Error('unused')
      },
      resolveGiftItemCover: () => {
        throw new Error('unused')
      },
      resolvePlaceholder: () => asset('/placeholder.webp'),
      showDrafts: false,
    })
    expect(model.artwork.artworkKind).toBe('placeholder')
    expect(model.artwork.artwork?.publicPath).toBe('/placeholder.webp')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/shared/release/link-roles.test.ts tests/compiler/release/detail-model.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

新建 `src/shared/release/link-roles.ts`:

```ts
import type {
  ContentDefinitions,
  NormalizedPlatformEntry,
} from '../types.js'
import type { PlatformTypeRegistration } from '../options.js'

export function isPreviewEntry(
  entry: NormalizedPlatformEntry,
  definitions: ContentDefinitions['platforms'],
  platformTypes: Record<string, PlatformTypeRegistration>,
): boolean {
  const definition = definitions[entry.platform]
  if (definition === undefined) return false
  const registration = platformTypes[definition.type]
  return registration?.preview === true
}

export function splitPreviewLinks(
  entries: NormalizedPlatformEntry[],
  definitions: ContentDefinitions['platforms'],
  platformTypes: Record<string, PlatformTypeRegistration>,
): {
  previewLinks: NormalizedPlatformEntry[]
  platformLinks: NormalizedPlatformEntry[]
} {
  const previewLinks: NormalizedPlatformEntry[] = []
  const platformLinks: NormalizedPlatformEntry[] = []
  for (const entry of entries) {
    ;(isPreviewEntry(entry, definitions, platformTypes)
      ? previewLinks
      : platformLinks
    ).push(entry)
  }
  return { previewLinks, platformLinks }
}
```

重写 `src/shared/release/types.ts` 中 `ReleaseDetailSection`/`ReleaseDetailModel`(删除 section 联合与 NumberedDisc 外的旧模型;`ReleaseArtworkKind`、`ReleaseIndexTile`、`ReleaseIndexModel`、`ResolvedText` 保留):

```ts
export interface ReleaseAlbumBookData {
  type: 'album'
  title: ResolvedText
  copyright?: string
  credit?: BookCredit
  previewLinks: NormalizedPlatformEntry[]
  platformLinks: NormalizedPlatformEntry[]
  covers: ResolvedAsset[]
  discs: NumberedDisc[]
}

export interface ReleaseGiftItemData {
  id: string
  title: ResolvedText
  desc?: ResolvedText
  covers: ResolvedAsset[]
  previewLinks: NormalizedPlatformEntry[]
  platformLinks: NormalizedPlatformEntry[]
  copyright?: string
}

export interface ReleaseGiftBookData {
  type: 'gift'
  title: ResolvedText
  copyright?: string
  credit?: BookCredit
  items: ReleaseGiftItemData[]
}

export interface ReleaseDetailModel {
  showDraftBadge: boolean
  draftLabel: string
  includedInIndex: true
  artwork: {
    kind: ReleaseArtworkKind
    artwork?: ResolvedAsset
    alt: string
  }
  book?: ReleaseAlbumBookData | ReleaseGiftBookData
}

/** Injected into frontmatter.synctrol.release */
export type SynctrolReleaseFrontmatter =
  | {
      kind: 'index'
      model: ReleaseIndexModel
      collectionTitle: string
      prevHref: string | null
      nextHref: string | null
    }
  | {
      kind: 'detail'
      model: ReleaseDetailModel
    }
```

import 增加 `BookCredit`:

```ts
import type { AssetPath, Book, BookCredit, NormalizedPlatformEntry } from '../types.js'
```

重写 `src/compiler/release/detail-model.ts`:

```ts
import type {
  Book,
  LocaleKey,
  LocaleMessages,
  RouteContentPackage,
  ContentDefinitions,
} from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { ResolvedAsset } from '../../shared/asset-types.js'
import type { ReleaseDetailModel } from '../../shared/release/types.js'
import { selectAlbumCovers, selectReleaseArtwork } from '../../shared/release/image-roles.js'
import { splitPreviewLinks } from '../../shared/release/link-roles.js'
import { numberDiscs } from '../../shared/release/numbering.js'
import { resolveMultilanguage } from '../../shared/multilanguage.js'

export interface BuildReleaseDetailModelInput {
  page: CompiledPage
  pkg: RouteContentPackage
  book: Book | undefined
  messages: LocaleMessages
  mainLocale: LocaleKey
  definitions: ContentDefinitions['platforms']
  platformTypes: Record<string, PlatformTypeRegistration>
  resolveArtwork: (pkg: RouteContentPackage) => ResolvedAsset | undefined
  resolveAlbumCover: (relativePath: string) => ResolvedAsset
  resolveGiftItemCover?: (relativePath: string) => ResolvedAsset
  resolvePlaceholder: () => ResolvedAsset | undefined
  showDrafts: boolean
}

function resolvedText(
  value: import('../../shared/types.js').Multilanguage,
  locale: LocaleKey,
  mainLocale: LocaleKey,
) {
  const r = resolveMultilanguage(value, locale, mainLocale)
  return {
    text: r.text,
    ...(r.fellBack ? { lang: r.locale } : {}),
  }
}

export function buildReleaseDetailModel(
  input: BuildReleaseDetailModelInput,
): ReleaseDetailModel {
  const { page, pkg, book, messages } = input

  const artworkPath = selectReleaseArtwork({
    cover: pkg.cover,
    artwork: pkg.artwork,
  })
  const resolvedArtwork = artworkPath ? input.resolveArtwork(pkg) : undefined
  const placeholder =
    !resolvedArtwork ? input.resolvePlaceholder() : undefined

  let bookData: ReleaseDetailModel['book']
  if (book !== undefined) {
    const title = resolvedText(book.title, page.locale, input.mainLocale)
    const common = {
      title,
      ...(book.copyright === undefined ? {} : { copyright: book.copyright }),
      ...(book.credit === undefined ? {} : { credit: book.credit }),
    }
    if (book.type === 'album') {
      const covers = selectAlbumCovers({ artwork: pkg.artwork, book }).map(
        (p) => input.resolveAlbumCover(p),
      )
      const { previewLinks, platformLinks } = splitPreviewLinks(
        book.album.links ?? [],
        input.definitions,
        input.platformTypes,
      )
      bookData = {
        type: 'album',
        ...common,
        previewLinks,
        platformLinks,
        covers,
        discs: numberDiscs(book.album.discs ?? []),
      }
    } else {
      const resolveCover = input.resolveGiftItemCover ?? input.resolveAlbumCover
      bookData = {
        type: 'gift',
        ...common,
        items: book.gift.items.map((item) => {
          const { previewLinks, platformLinks } = splitPreviewLinks(
            item.links ?? [],
            input.definitions,
            input.platformTypes,
          )
          return {
            id: item.id,
            title: resolvedText(item.title, page.locale, input.mainLocale),
            ...(item.desc
              ? { desc: resolvedText(item.desc, page.locale, input.mainLocale) }
              : {}),
            covers: (item.covers ?? []).map((p) => resolveCover(p)),
            previewLinks,
            platformLinks,
            ...(item.copyright ? { copyright: item.copyright } : {}),
          }
        }),
      }
    }
  }

  return {
    showDraftBadge: Boolean(input.showDrafts && page.isDraft),
    draftLabel: messages.draft,
    includedInIndex: true,
    artwork: {
      kind: resolvedArtwork ? 'artwork' : placeholder ? 'placeholder' : 'empty-frame',
      artwork: resolvedArtwork ?? placeholder,
      alt: page.title,
    },
    ...(bookData === undefined ? {} : { book: bookData }),
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/shared/release/link-roles.test.ts tests/compiler/release/detail-model.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/shared/release/link-roles.ts src/shared/release/types.ts src/compiler/release/detail-model.ts tests/shared/release/link-roles.test.ts tests/compiler/release/detail-model.test.ts
git commit -m "feat: release detail model rewritten as injected album data"
```

---

### Task 5: frontmatter 注入管道 —— inject-release-frontmatter + theme.ts

**Files:**
- Modify: `src/compiler/release/inject-release-frontmatter.ts`
- Modify: `src/compiler/theme.ts:168-194`
- Test: `tests/compiler/release/inject-release-frontmatter.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/compiler/release/inject-release-frontmatter.test.ts` 现有 detail 用例(input 含 `releaseIndexHrefForLocale`、返回 `authorsLabel`)改为:input 增加 `definitions`、`platformTypes`,断言返回 `{ kind: 'detail', model }` 且无 `authorsLabel`、`model.sections` 不存在。具体:找到现有 `it('builds detail payload ...')` 用例(若无则新增):

```ts
it('builds detail payload with injected album data and no authors label', () => {
  const input = {
    compiled: releaseDetailPage({ identity: 'release:first-release', slug: 'first-release' }),
    allPages: [],
    packages: [
      {
        dir: '/content/releases/first-release',
        identity: 'release:first-release',
        type: 'release' as const,
        slug: 'first-release',
        date: '2026-08-11',
        draft: false,
        tags: [],
        artwork: './assets/album-entry.webp',
        locales: {},
      },
    ],
    compiledPackages: [
      {
        dir: '/content/releases/first-release',
        identity: 'release:first-release',
        manifest: {} as never,
        book: albumBook({ authors: undefined as never }),
      },
    ],
    assetManifest: {
      contentPublicPaths: { 'release:first-release': { './assets/album-entry.webp': '/assets/hash.webp' } },
      globalPublicPaths: {},
    } as never,
    releaseOptions,
    showDrafts: false,
    mainLocale: 'zh',
    messages: zhMessages,
    collectionTitle: '作品',
    formatDate: (d: string) => d,
    releaseIndexHrefForLocale: () => '/zh/releases/',
    definitions: {
      bilibili: { category: 'digital' as const, type: 'bilibili_player', name: 'Bilibili' },
    },
    platformTypes: builtInPlatformTypes,
  }
  const result = buildReleaseFrontmatterForPage(input as never)
  expect(result).toMatchObject({ kind: 'detail' })
  expect(result && 'authorsLabel' in result).toBe(false)
  const model = result && result.kind === 'detail' ? result.model : null
  expect(model && 'sections' in model).toBe(false)
})
```

(需要 import `builtInPlatformTypes`。)

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/compiler/release/inject-release-frontmatter.test.ts`
Expected: FAIL(TS 或断言)

- [ ] **Step 3: 实现**

`src/compiler/release/inject-release-frontmatter.ts`:

- `BuildReleaseFrontmatterInput` 增加:

```ts
  definitions: ContentDefinitions['platforms']
  platformTypes: Record<string, PlatformTypeRegistration>
```

删除 `releaseIndexHrefForLocale: (locale: LocaleKey) => string | null`。

- detail 分支:

```ts
  if (compiled.contentType === 'release') {
    const pkg = input.packages.find((p) => p.identity === compiled.identity)
    if (!pkg) return null
    const book = findBook(input.compiledPackages, pkg)
    const model = buildReleaseDetailModel({
      page: compiled,
      pkg,
      book,
      messages: input.messages,
      mainLocale: input.mainLocale,
      definitions: input.definitions,
      platformTypes: input.platformTypes,
      resolveArtwork: (p) => resolvePackageArtwork(input.assetManifest, p),
      resolveAlbumCover: (ref) =>
        resolvePackageAssetRef(input.assetManifest, pkg.identity, ref),
      resolveGiftItemCover: (ref) =>
        resolvePackageAssetRef(input.assetManifest, pkg.identity, ref),
      resolvePlaceholder: () =>
        resolveArtworkPlaceholder(
          input.assetManifest,
          input.releaseOptions.artworkPlaceholder,
        ),
      showDrafts: input.showDrafts,
    })
    return {
      kind: 'detail',
      model,
    }
  }
```

- import 增加 `ContentDefinitions`、`PlatformTypeRegistration`。

`src/compiler/theme.ts:168-194` 调用处:

```ts
        const release = buildReleaseFrontmatterForPage({
          compiled,
          allPages,
          packages,
          compiledPackages,
          assetManifest,
          releaseOptions: resolved.release,
          showDrafts: resolved.showDrafts,
          mainLocale: resolved.mainLocale,
          messages: localeMessages,
          collectionTitle,
          formatDate: (yyyyMmDd) => {
            return yyyyMmDd
          },
          definitions: platformDefinitions,
          platformTypes: resolvePlatformTypes(resolved.platforms.types),
        })
```

删除 `releaseIndexHrefForLocale` 参数。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/compiler/release/inject-release-frontmatter.test.ts && npx tsc --noEmit -p tsconfig.json`(或 `npm run test:typecheck`)
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/compiler/release/inject-release-frontmatter.ts src/compiler/theme.ts tests/compiler/release/inject-release-frontmatter.test.ts
git commit -m "feat: inject album data and platform registrations into release frontmatter"
```

---

### Task 6: JSON-LD 移除 byArtist(book authors)

**Files:**
- Modify: `src/compiler/seo/json-ld.ts:61-72`
- Test: `tests/compiler/seo/json-ld.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/compiler/seo/json-ld.test.ts`:album fixture 去掉 `authors`,新增断言:

```ts
  it('omits album-level byArtist now that book authors are retired', () => {
    const nodes = buildAlbumJsonLd({ book: album, locale: 'en', mainLocale: 'zh', pageUrl: 'https://synctrol.com/en/releases/first/' })
    expect(nodes[0]).not.toHaveProperty('byArtist')
    expect(nodes[0]).toMatchObject({ '@type': 'MusicAlbum', name: 'First Album' })
  })
```

并将 `const album: AlbumBook = { ... }` 中 `authors: ['Synctrol']` 删除。

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/compiler/seo/json-ld.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/compiler/seo/json-ld.ts` MusicAlbum 节点:

```ts
    {
      '@context': 'https://schema.org',
      '@type': 'MusicAlbum',
      name,
      numTracks: position,
      track: tracks,
      url: input.pageUrl,
    },
```

(删除 `...(input.book.authors?.length ? ...)` 行;track 级 `byArtist` 保留。)

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/compiler/seo/json-ld.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/compiler/seo/json-ld.ts tests/compiler/seo/json-ld.test.ts
git commit -m "feat: drop byArtist from album JSON-LD"
```

---

### Task 7: 客户端上下文 + ReleaseDetail 布局重写 + Layout 接线

**Files:**
- Create: `src/client/components/release/release-context.ts`
- Modify: `src/client/layouts/ReleaseDetail.vue`(重写)
- Modify: `src/client/layouts/Layout.vue:173-183`
- Test: `tests/client/release/ReleaseDetail.layout.test.ts`(重写)

- [ ] **Step 1: 写失败测试**

重写 `tests/client/release/ReleaseDetail.layout.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, inject } from 'vue'
import ReleaseDetail from '../../../src/client/layouts/ReleaseDetail.vue'
import type { ReleaseDetailModel } from '../../../src/shared/release/types'
import { asset, zhMessages } from '../../helpers/release-fixtures'
import { builtInPlatformTypes } from '../../../src/platforms/builtins/index'
import { SYNCTROL_RELEASE_CONTEXT_KEY } from '../../../src/client/components/release/release-context'
import type { ContentDefinitions } from '../../../src/shared/types'

vi.mock('vuepress/client', () => ({
  Content: defineComponent({
    name: 'Content',
    setup: () => () => h('div', { 'data-testid': 'vuepress-content' }, '正文'),
  }),
}))

const Probe = defineComponent({
  name: 'Probe',
  setup() {
    const ctx = inject(SYNCTROL_RELEASE_CONTEXT_KEY)
    return () =>
      h('span', { 'data-testid': 'probe' }, ctx ? ctx.model.artwork.alt : 'none')
  },
})

const definitions: ContentDefinitions['platforms'] = {}

const model: ReleaseDetailModel = {
  includedInIndex: true,
  showDraftBadge: true,
  draftLabel: '草稿',
  artwork: { kind: 'artwork', artwork: asset('/entry.webp'), alt: '第一张专辑' },
}

describe('ReleaseDetail layout', () => {
  it('renders only the draft badge and Content, and provides the release context', () => {
    const wrapper = mount(ReleaseDetail, {
      props: {
        model,
        locale: 'zh',
        mainLocale: 'zh',
        definitions,
        types: builtInPlatformTypes,
        loadStrategy: 'interaction' as const,
        messages: zhMessages,
      },
      global: {
        // Content 是布局内部唯一的内容出口;用探针替换它验证注入上下文。
        stubs: { Content: Probe },
      },
    })
    expect(wrapper.get('[data-testid="draft-badge"]').text()).toBe('草稿')
    expect(wrapper.get('[data-testid="probe"]').text()).toBe('第一张专辑')
    expect(wrapper.find('[data-detail-section]').exists()).toBe(false)
  })

  it('omits the draft badge when the model disables it', () => {
    const wrapper = mount(ReleaseDetail, {
      props: {
        model: { ...model, showDraftBadge: false },
        locale: 'zh',
        mainLocale: 'zh',
        definitions,
        types: builtInPlatformTypes,
        loadStrategy: 'interaction' as const,
        messages: zhMessages,
      },
      global: { stubs: { Content: true } },
    })
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/client/release/ReleaseDetail.layout.test.ts`
Expected: FAIL(模块不存在 / props 不匹配)

- [ ] **Step 3: 实现**

新建 `src/client/components/release/release-context.ts`:

```ts
import { inject } from 'vue'
import type { InjectionKey } from 'vue'
import type { ReleaseDetailModel } from '../../../shared/release/types.js'
import type {
  ContentDefinitions,
  LocaleKey,
  LocaleMessages,
} from '../../../shared/types.js'
import type { PlatformTypeRegistration } from '../../../shared/options.js'

export interface ReleasePageContext {
  locale: LocaleKey
  mainLocale: LocaleKey
  model: ReleaseDetailModel
  definitions: ContentDefinitions['platforms']
  types: Record<string, PlatformTypeRegistration>
  loadStrategy: 'interaction' | 'viewport'
  messages: LocaleMessages
}

export const SYNCTROL_RELEASE_CONTEXT_KEY: InjectionKey<ReleasePageContext> =
  Symbol('synctrol-release')

export function useReleasePage(): ReleasePageContext | undefined {
  const context = inject(SYNCTROL_RELEASE_CONTEXT_KEY, undefined)
  if (context === undefined) {
    console.warn(
      '[vuepress-theme-synctrolling] Album components must be used on a release page',
    )
  }
  return context
}
```

重写 `src/client/layouts/ReleaseDetail.vue`:

```vue
<script setup lang="ts">
import { provide } from 'vue'
import { Content } from 'vuepress/client'
import DraftBadge from '../components/DraftBadge.vue'
import {
  SYNCTROL_RELEASE_CONTEXT_KEY,
} from '../components/release/release-context.js'
import type { ReleaseDetailModel } from '../../shared/release/types.js'
import type {
  ContentDefinitions,
  LocaleKey,
  LocaleMessages,
} from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'

const props = defineProps<{
  model: ReleaseDetailModel
  locale: LocaleKey
  mainLocale: LocaleKey
  definitions: ContentDefinitions['platforms']
  types: Record<string, PlatformTypeRegistration>
  loadStrategy: 'interaction' | 'viewport'
  messages: LocaleMessages
}>()

provide(SYNCTROL_RELEASE_CONTEXT_KEY, {
  locale: props.locale,
  mainLocale: props.mainLocale,
  model: props.model,
  definitions: props.definitions,
  types: props.types,
  loadStrategy: props.loadStrategy,
  messages: props.messages,
})
</script>

<template>
  <article class="syn-release-detail" data-testid="release-detail-root">
    <DraftBadge v-if="model.showDraftBadge" :label="model.draftLabel" />
    <Content />
  </article>
</template>
```

`src/client/layouts/Layout.vue`:

```vue
    <ReleaseDetail
      v-else-if="release?.kind === 'detail'"
      :model="release.model"
      :locale="locale"
      :main-locale="theme.mainLocale"
      :definitions="platformDefinitions"
      :types="platformTypes"
      :load-strategy="theme.platforms.loadStrategy"
      :messages="localeMessages"
    />
```

(删除 `:authors-label` 与 `:platform-messages`。)

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/client/release/ReleaseDetail.layout.test.ts tests/client/layouts/Layout.test.ts && npm run test:typecheck`
Expected: PASS(Layout.test.ts 若引用旧 props 需同步修)

- [ ] **Step 5: 提交**

```bash
git add src/client/components/release/release-context.ts src/client/layouts/ReleaseDetail.vue src/client/layouts/Layout.vue tests/client/release/ReleaseDetail.layout.test.ts
git commit -m "feat: release page context injection and minimal ReleaseDetail layout"
```

---

### Task 8: 九个专辑组件 + client config 全局注册

**Files:**
- Create: `src/client/components/release/AlbumArtwork.vue`、`AlbumIdentity.vue`、`AlbumCopyright.vue`、`AlbumPreviews.vue`、`AlbumPlatformLinks.vue`、`AlbumTracklist.vue`、`AlbumCredit.vue`、`AlbumCovers.vue`、`GiftItem.vue`
- Modify: `src/client/components/platforms/PlatformLinks.ts`(可选 `title` prop)
- Modify: `src/client/config.ts`(enhance 注册)
- Test: `tests/client/release/album-components.test.ts`(新建)、`tests/client/components/platforms/PlatformLinks.test.ts`(若存在,补 title prop 用例)

- [ ] **Step 1: 写失败测试**

新建 `tests/client/release/album-components.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import AlbumArtwork from '../../../src/client/components/release/AlbumArtwork.vue'
import AlbumIdentity from '../../../src/client/components/release/AlbumIdentity.vue'
import AlbumCopyright from '../../../src/client/components/release/AlbumCopyright.vue'
import AlbumPreviews from '../../../src/client/components/release/AlbumPreviews.vue'
import AlbumPlatformLinks from '../../../src/client/components/release/AlbumPlatformLinks.vue'
import AlbumTracklist from '../../../src/client/components/release/AlbumTracklist.vue'
import AlbumCredit from '../../../src/client/components/release/AlbumCredit.vue'
import AlbumCovers from '../../../src/client/components/release/AlbumCovers.vue'
import GiftItem from '../../../src/client/components/release/GiftItem.vue'
import { SYNCTROL_RELEASE_CONTEXT_KEY } from '../../../src/client/components/release/release-context'
import type { ReleasePageContext } from '../../../src/client/components/release/release-context'
import type { ReleaseDetailModel } from '../../../src/shared/release/types'
import { asset, zhMessages } from '../../helpers/release-fixtures'
import { builtInPlatformTypes } from '../../../src/platforms/builtins/index'
import type { ContentDefinitions } from '../../../src/shared/types'

vi.mock('vuepress/client', () => ({}))

const definitions: ContentDefinitions['platforms'] = {
  soundcloud: { category: 'digital', type: 'soundcloud_player', name: 'SoundCloud' },
  bilibili: { category: 'digital', type: 'bilibili_player', name: 'Bilibili' },
}

const albumModel: ReleaseDetailModel = {
  includedInIndex: true,
  showDraftBadge: false,
  draftLabel: '草稿',
  artwork: { kind: 'artwork', artwork: asset('/entry.webp'), alt: '第一张专辑' },
  book: {
    type: 'album',
    title: { text: '第一张专辑' },
    copyright: '© 2026 Synctrol',
    credit: { catalogNumber: 'DVSP-0327', illustrator: 'タイキ' },
    previewLinks: [{ platform: 'soundcloud', url: 'https://soundcloud.com/a/b' }],
    platformLinks: [
      { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 1, autoplay: false },
    ],
    covers: [asset('/front.webp')],
    discs: [
      {
        number: 1,
        anchor: 'disc-1',
        title: { zh: '第一碟' },
        tracks: [
          {
            number: 1,
            anchor: 'disc-1-track-1',
            title: { zh: '第一曲' },
            artists: ['Synctrol'],
            durationSeconds: 272,
            durationLabel: '4:32',
          },
        ],
      },
    ],
  },
}

const giftModel: ReleaseDetailModel = {
  includedInIndex: true,
  showDraftBadge: false,
  draftLabel: '草稿',
  artwork: { kind: 'empty-frame', alt: '周边' },
  book: {
    type: 'gift',
    title: { text: '周边系列' },
    items: [
      {
        id: 'poster',
        title: { text: '纪念海报' },
        desc: { text: '限量' },
        covers: [asset('/poster.webp')],
        previewLinks: [],
        platformLinks: [],
      },
    ],
  },
}

function provideContext(model: ReleaseDetailModel): Record<string, unknown> {
  const ctx: ReleasePageContext = {
    locale: 'zh',
    mainLocale: 'zh',
    model,
    definitions,
    types: builtInPlatformTypes,
    loadStrategy: 'interaction',
    messages: zhMessages,
  }
  return { [SYNCTROL_RELEASE_CONTEXT_KEY as symbol]: ctx }
}

function mountWith(model: ReleaseDetailModel) {
  return { global: { provide: provideContext(model) } }
}

describe('album components', () => {
  it('AlbumArtwork renders the artwork image', () => {
    const wrapper = mount(AlbumArtwork, mountWith(albumModel))
    expect(wrapper.get('[data-testid="album-artwork"] img').attributes('src')).toBe('/entry.webp')
    expect(wrapper.get('img').attributes('alt')).toBe('第一张专辑')
  })

  it('AlbumIdentity renders only the book title as h2', () => {
    const wrapper = mount(AlbumIdentity, mountWith(albumModel))
    expect(wrapper.get('[data-testid="album-identity"]').text()).toBe('第一张专辑')
    expect(wrapper.get('h2').exists()).toBe(true)
  })

  it('AlbumCopyright renders the copyright and hides when absent', () => {
    const wrapper = mount(AlbumCopyright, mountWith(albumModel))
    expect(wrapper.get('[data-testid="album-copyright"]').text()).toBe('© 2026 Synctrol')
    const none = mount(AlbumCopyright, mountWith({ ...albumModel, book: undefined }))
    expect(none.find('[data-testid="album-copyright"]').exists()).toBe(false)
  })

  it('AlbumPreviews renders preview links with the preview title', () => {
    const wrapper = mount(AlbumPreviews, {
      ...mountWith(albumModel),
      global: {
        ...mountWith(albumModel).global,
        stubs: { PlatformLinks: { props: ['entries', 'title'], template: `<div data-testid="pl"><span data-testid="pl-title">{{ title }}</span><span data-testid="pl-count">{{ entries.length }}</span></div>` } },
      },
    })
    expect(wrapper.get('[data-testid="pl-count"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="pl-title"]').text()).toBe('试听')
  })

  it('AlbumPlatformLinks renders non-preview links', () => {
    const wrapper = mount(AlbumPlatformLinks, {
      ...mountWith(albumModel),
      global: {
        ...mountWith(albumModel).global,
        stubs: { PlatformLinks: { props: ['entries', 'title'], template: `<div data-testid="pl"><span data-testid="pl-count">{{ entries.length }}</span><span data-testid="pl-title">{{ title || 'default' }}</span></div>` } },
      },
    })
    expect(wrapper.get('[data-testid="pl-count"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="pl-title"]').text()).toBe('default')
  })

  it('AlbumTracklist renders disc, tracks with artists under title and no duration', () => {
    const wrapper = mount(AlbumTracklist, mountWith(albumModel))
    expect(wrapper.get('[data-testid="album-tracklist"]').exists()).toBe(true)
    expect(wrapper.get('#disc-1').exists()).toBe(true)
    expect(wrapper.get('#disc-1-track-1').text()).toContain('第一曲')
    expect(wrapper.get('#disc-1-track-1').text()).toContain('Synctrol')
    expect(wrapper.find('[data-testid="track-row"]').text()).not.toContain('4:32')
  })

  it('AlbumCredit renders only provided keys in fixed order with translated labels', () => {
    const wrapper = mount(AlbumCredit, mountWith(albumModel))
    const rows = wrapper.findAll('[data-testid="credit-row"]')
    expect(rows.map((r) => r.text())).toEqual(['制品编号DVSP-0327', '插画タイキ'])
  })

  it('AlbumCovers renders cover images lazily with numbered alt', () => {
    const wrapper = mount(AlbumCovers, mountWith(albumModel))
    const img = wrapper.get('[data-testid="album-cover"]')
    expect(img.attributes('src')).toBe('/front.webp')
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('GiftItem renders the item selected by id and warns on unknown id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(GiftItem, { props: { id: 'poster' }, global: mountWith(giftModel).global })
    expect(wrapper.get('[data-testid="gift-item"] h3').text()).toBe('纪念海报')
    const missing = mount(GiftItem, { props: { id: 'nope' }, global: mountWith(giftModel).global })
    expect(missing.find('[data-testid="gift-item"]').exists()).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('warns and renders nothing without the context', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(AlbumTracklist)
    expect(wrapper.find('[data-testid="album-tracklist"]').exists()).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/client/release/album-components.test.ts`
Expected: FAIL(组件不存在)

- [ ] **Step 3: 实现**

`AlbumArtwork.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import ReleaseArtwork from './ReleaseArtwork.vue'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const artwork = computed(() => context?.model.artwork)
</script>

<template>
  <div
    v-if="artwork"
    class="syn-release-detail-artwork"
    data-testid="album-artwork"
  >
    <ReleaseArtwork
      :kind="artwork.kind"
      :artwork="artwork.artwork"
      :alt="artwork.alt"
      eager
    />
  </div>
</template>
```

`AlbumIdentity.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const book = computed(() => context?.model.book)
</script>

<template>
  <h2
    v-if="book"
    class="syn-album-identity"
    data-testid="album-identity"
    :lang="book.title.lang"
  >
    {{ book.title.text }}
  </h2>
</template>
```

`AlbumCopyright.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const book = computed(() => context?.model.book)
</script>

<template>
  <p
    v-if="book?.copyright"
    class="syn-album-copyright"
    data-testid="album-copyright"
  >
    {{ book.copyright }}
  </p>
</template>
```

`AlbumPreviews.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { PlatformLinks } from '../platforms/PlatformLinks.js'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const previewLinks = computed(() =>
  context && context.model.book?.type === 'album'
    ? context.model.book.previewLinks
    : [],
)
const platformMessages = computed(() => ({
  platformLinks: context?.messages.platformLinks ?? '',
  activateEmbed: context?.messages.activateEmbed ?? '',
  embedFailed: context?.messages.embedFailed ?? '',
  openExternal: context?.messages.openExternal ?? '',
}))
</script>

<template>
  <div
    v-if="context && previewLinks.length"
    data-testid="album-previews"
    class="syn-album-section syn-album-previews"
  >
    <PlatformLinks
      :entries="previewLinks"
      :definitions="context.definitions"
      :types="context.types"
      :load-strategy="context.loadStrategy"
      :locale="context.locale"
      :main-locale="context.mainLocale"
      :messages="platformMessages"
      :title="context.messages.previewSectionTitle"
    />
  </div>
</template>
```

`AlbumPlatformLinks.vue`(与上同构,`title` 不传):

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { PlatformLinks } from '../platforms/PlatformLinks.js'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const platformLinks = computed(() =>
  context && context.model.book?.type === 'album'
    ? context.model.book.platformLinks
    : [],
)
const platformMessages = computed(() => ({
  platformLinks: context?.messages.platformLinks ?? '',
  activateEmbed: context?.messages.activateEmbed ?? '',
  embedFailed: context?.messages.embedFailed ?? '',
  openExternal: context?.messages.openExternal ?? '',
}))
</script>

<template>
  <div
    v-if="context && platformLinks.length"
    data-testid="album-platform-links"
    class="syn-album-section syn-album-platform-links"
  >
    <PlatformLinks
      :entries="platformLinks"
      :definitions="context.definitions"
      :types="context.types"
      :load-strategy="context.loadStrategy"
      :locale="context.locale"
      :main-locale="context.mainLocale"
      :messages="platformMessages"
    />
  </div>
</template>
```

`AlbumTracklist.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { resolveMultilanguage } from '../../../shared/multilanguage.js'
import { formatMessage } from '../../../shared/release/numbering.js'
import { useReleasePage } from './release-context.js'
import type { NumberedDisc, NumberedTrack } from '../../../shared/release/numbering.js'
import type { Multilanguage } from '../../../shared/types.js'

const context = useReleasePage()
const album = computed(() =>
  context && context.model.book?.type === 'album' ? context.model.book : undefined,
)

function resolved(value: Multilanguage) {
  const r = resolveMultilanguage(value, context!.locale, context!.mainLocale)
  return { text: r.text, lang: r.fellBack ? r.locale : undefined }
}

function discTitle(disc: NumberedDisc) {
  return resolved(disc.title)
}

function trackTitle(track: NumberedTrack) {
  return resolved(track.title)
}
</script>

<template>
  <section
    v-if="album && album.discs.length"
    class="syn-album-section syn-album-tracklist"
    data-testid="album-tracklist"
  >
    <h2>{{ context!.messages.tracklist }}</h2>
    <article
      v-for="disc in album.discs"
      :id="disc.anchor"
      :key="disc.anchor"
      class="syn-album-disc"
    >
      <h3>
        {{ formatMessage(context!.messages.disc, { number: disc.number }) }}
        ·
        <span :lang="discTitle(disc).lang">{{ discTitle(disc).text }}</span>
      </h3>
      <ol class="syn-album-tracks">
        <li
          v-for="track in disc.tracks"
          :id="track.anchor"
          :key="track.anchor"
          data-testid="track-row"
          class="syn-album-track"
        >
          <span class="syn-album-track__label">
            {{ formatMessage(context!.messages.track, { number: track.number }) }}
          </span>
          <span class="syn-album-track__main">
            <span class="syn-album-track__title" :lang="trackTitle(track).lang">
              {{ trackTitle(track).text }}
            </span>
            <span class="syn-album-track__artists">{{
              track.artists.join(', ')
            }}</span>
          </span>
        </li>
      </ol>
    </article>
  </section>
</template>
```

`AlbumCredit.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useReleasePage } from './release-context.js'
import type { BookCreditKey, LocaleMessages } from '../../../shared/types.js'

const CREDIT_ORDER: Array<[BookCreditKey, keyof LocaleMessages]> = [
  ['catalogNumber', 'creditCatalogNumber'],
  ['illustrator', 'creditIllustrator'],
  ['designer', 'creditDesigner'],
  ['mastering', 'creditMastering'],
  ['mix', 'creditMix'],
  ['webDesign', 'creditWebDesign'],
  ['producer', 'creditProducer'],
  ['specialThanks', 'creditSpecialThanks'],
]

const context = useReleasePage()
const credit = computed(() => context?.model.book?.credit)
const rows = computed(() =>
  credit.value
    ? CREDIT_ORDER.filter(([key]) => credit.value![key] !== undefined)
    : [],
)
</script>

<template>
  <section
    v-if="rows.length"
    class="syn-album-section syn-album-credit"
    data-testid="album-credit"
  >
    <dl>
      <template v-for="[key, labelKey] in rows" :key="key">
        <div class="syn-album-credit__row" data-testid="credit-row">
          <dt>{{ context!.messages[labelKey] }}</dt>
          <dd>{{ credit![key] }}</dd>
        </div>
      </template>
    </dl>
  </section>
</template>
```

`AlbumCovers.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const covers = computed(() =>
  context && context.model.book?.type === 'album'
    ? context.model.book.covers
    : [],
)
</script>

<template>
  <section
    v-if="context && covers.length"
    class="syn-album-section syn-album-covers"
    data-testid="album-covers"
  >
    <h2>{{ context.messages.covers }}</h2>
    <ul>
      <li v-for="(cover, i) in covers" :key="cover.publicPath">
        <img
          data-testid="album-cover"
          :src="cover.publicPath"
          :alt="`${context.messages.covers} ${i + 1}`"
          loading="lazy"
        />
      </li>
    </ul>
  </section>
</template>
```

`GiftItem.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { PlatformLinks } from '../platforms/PlatformLinks.js'
import { useReleasePage } from './release-context.js'

const props = defineProps<{ id: string }>()

const context = useReleasePage()
const item = computed(() =>
  context && context.model.book?.type === 'gift'
    ? context.model.book.items.find((entry) => entry.id === props.id)
    : undefined,
)
const platformMessages = computed(() => ({
  platformLinks: context?.messages.platformLinks ?? '',
  activateEmbed: context?.messages.activateEmbed ?? '',
  embedFailed: context?.messages.embedFailed ?? '',
  openExternal: context?.messages.openExternal ?? '',
}))

if (context !== undefined && item.value === undefined) {
  console.warn(
    `[vuepress-theme-synctrolling] GiftItem: unknown id "${props.id}"`,
  )
}
</script>

<template>
  <article
    v-if="item"
    :id="`gift-${item.id}`"
    class="syn-gift-item"
    data-testid="gift-item"
  >
    <h3 :lang="item.title.lang">{{ item.title.text }}</h3>
    <p v-if="item.desc" :lang="item.desc.lang">{{ item.desc.text }}</p>

    <div v-if="item.covers.length" class="syn-gift-item__covers">
      <h4>{{ context!.messages.covers }}</h4>
      <ul>
        <li v-for="(cover, i) in item.covers" :key="cover.publicPath">
          <img
            data-testid="gift-item-cover"
            :src="cover.publicPath"
            :alt="`${item.title.text} ${context!.messages.covers} ${i + 1}`"
            loading="lazy"
          />
        </li>
      </ul>
    </div>

    <div v-if="item.previewLinks.length" class="syn-gift-item__previews">
      <PlatformLinks
        :entries="item.previewLinks"
        :definitions="context!.definitions"
        :types="context!.types"
        :load-strategy="context!.loadStrategy"
        :locale="context!.locale"
        :main-locale="context!.mainLocale"
        :messages="platformMessages"
        :title="context!.messages.previewSectionTitle"
      />
    </div>

    <div v-if="item.platformLinks.length" class="syn-gift-item__links">
      <PlatformLinks
        :entries="item.platformLinks"
        :definitions="context!.definitions"
        :types="context!.types"
        :load-strategy="context!.loadStrategy"
        :locale="context!.locale"
        :main-locale="context!.mainLocale"
        :messages="platformMessages"
      />
    </div>

    <p v-if="item.copyright">{{ item.copyright }}</p>
  </article>
</template>
```

`src/client/components/platforms/PlatformLinks.ts` 增加可选 title prop:

```ts
    title: {
      type: String,
      default: undefined,
    },
```

且 setup 渲染:

```ts
  setup(props) {
    const sectionTitle = props.title ?? props.messages.platformLinks
    return () =>
      h('section', { class: 'syn-platform-links', 'aria-label': sectionTitle }, [
        h('h2', { class: 'syn-platform-links__title' }, sectionTitle),
```

`src/client/config.ts`:

```ts
import { defineClientConfig } from 'vuepress/client'
import Layout from './layouts/Layout.vue'
import Root from './layouts/Root.vue'
import AlbumArtwork from './components/release/AlbumArtwork.vue'
import AlbumIdentity from './components/release/AlbumIdentity.vue'
import AlbumCopyright from './components/release/AlbumCopyright.vue'
import AlbumPreviews from './components/release/AlbumPreviews.vue'
import AlbumPlatformLinks from './components/release/AlbumPlatformLinks.vue'
import AlbumTracklist from './components/release/AlbumTracklist.vue'
import AlbumCredit from './components/release/AlbumCredit.vue'
import AlbumCovers from './components/release/AlbumCovers.vue'
import GiftItem from './components/release/GiftItem.vue'
import './styles/index.js'

declare const __SYNCTROL_THEME_OPTIONS__: {
  featureFont?: string
}

export default defineClientConfig({
  layouts: {
    Layout,
    Root,
    NotFound: Layout,
  },
  enhance({ app }) {
    app.component('AlbumArtwork', AlbumArtwork)
    app.component('AlbumIdentity', AlbumIdentity)
    app.component('AlbumCopyright', AlbumCopyright)
    app.component('AlbumPreviews', AlbumPreviews)
    app.component('AlbumPlatformLinks', AlbumPlatformLinks)
    app.component('AlbumTracklist', AlbumTracklist)
    app.component('AlbumCredit', AlbumCredit)
    app.component('AlbumCovers', AlbumCovers)
    app.component('GiftItem', GiftItem)
  },
  setup() {
    const featureFont = __SYNCTROL_THEME_OPTIONS__.featureFont
    if (featureFont !== undefined && typeof document !== 'undefined') {
      document.documentElement.style.setProperty(
        '--syn-font-display',
        featureFont,
      )
    }
  },
})
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/client/release/album-components.test.ts && npm run test:typecheck`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/client/components/release/ src/client/components/platforms/PlatformLinks.ts src/client/config.ts tests/client/release/album-components.test.ts
git commit -m "feat: album section components registered for markdown assembly"
```

---

### Task 9: 专辑区块样式 + 删除旧 body 组件

**Files:**
- Modify: `src/client/styles/release.css`(新 `.syn-album-section` 系列;替换旧 track 网格;移除 `.syn-album-discs/.syn-album-covers/.syn-album-links/.syn-gift-book-body` 外壳)
- Delete: `src/client/components/release/AlbumBookBody.vue`、`GiftBookBody.vue`、`ReleaseBookIdentity.vue`
- Delete: `tests/client/release/AlbumBookBody.test.ts`、`tests/client/release/GiftBookBody.test.ts`
- Test: `tests/client/styles/release-css.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/client/styles/release-css.test.ts` 追加:

```ts
  it('defines the album section shell and two-column tracklist', () => {
    expect(css).toMatch(/\.syn-album-section\s*\{[^}]*border:\s*var\(--syn-border-strong\)/)
    expect(css).toMatch(/\.syn-album-track\s*\{[^}]*grid-template-columns:\s*auto\s+1fr/)
    expect(css).toMatch(/\.syn-album-track__artists\s*\{[^}]*font-size:\s*0\.75em/)
    expect(css).toMatch(/\.syn-album-track__label\s*\{[^}]*text-align:\s*right/)
  })

  it('defines the credit grid and covers grid', () => {
    expect(css).toMatch(/\.syn-album-credit__row\s*\{[^}]*display:\s*grid/)
    expect(css).toMatch(/\.syn-album-credit__row\s*\{[^}]*grid-template-columns:\s*1fr\s+1\.618fr/)
    expect(css).toMatch(/\.syn-album-covers\s+ul\s*\{[^}]*display:\s*grid/)
  })

  it('drops the retired auto-render section shells', () => {
    expect(css).not.toMatch(/\.syn-album-discs\s*,/)
    expect(css).not.toMatch(/\.syn-gift-book-body/)
  })
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/client/styles/release-css.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/client/styles/release.css` 全文替换为:

```css
.syn-release-index-grid {
  display: grid;
  grid-template-columns: repeat(var(--syn-release-mobile-cols, 2), minmax(0, 1fr));
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  border: var(--syn-border-strong);
}

@media (min-width: 768px) {
  .syn-release-index-grid {
    grid-template-columns: repeat(var(--syn-release-desktop-cols, 3), minmax(0, 1fr));
  }
}

.syn-release-index-grid__item {
  border: var(--syn-border-subtle);
}

.syn-release-tile {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1;
  color: inherit;
  text-decoration: none;
}

.syn-release-tile:hover,
.syn-release-tile:focus-visible {
  background: var(--syn-black);
  color: var(--syn-white);
  outline: none;
}

:root[data-theme='dark'] .syn-release-tile:hover,
:root[data-theme='dark'] .syn-release-tile:focus-visible {
  background: var(--syn-white);
  color: var(--syn-black);
}

.syn-release-artwork,
.syn-release-artwork img,
.syn-release-artwork__empty {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.syn-release-artwork__empty {
  border: var(--syn-border-strong);
  background:
    linear-gradient(currentColor, currentColor) center / 40% 3px no-repeat,
    linear-gradient(currentColor, currentColor) center / 3px 40% no-repeat;
}

.syn-release-detail {
  position: relative;
}

.syn-release-detail-artwork {
  max-width: var(--syn-artwork-width);
  width: 100%;
  margin-inline: auto;
}

.syn-draft-badge {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  border: var(--syn-border-strong);
  padding: 0.25rem 0.5rem;
  background: var(--syn-white);
  color: var(--syn-black);
  font-size: 0.75rem;
  line-height: 1.2;
}

:root[data-theme='dark'] .syn-draft-badge {
  background: var(--syn-black);
  color: var(--syn-white);
}

/* Shared shell for album sections assembled from markdown. */
.syn-album-section {
  border: var(--syn-border-strong);
  margin-block: 1.5rem;
  padding: 1rem;
}

.syn-album-section h2 {
  margin-block-start: 0;
}

.syn-album-tracklist .syn-album-disc + .syn-album-disc {
  margin-block-start: 1.5rem;
}

.syn-album-tracks {
  margin: 0;
  padding: 0;
}

.syn-album-track {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  border-block-start: var(--syn-border-subtle);
  padding-block: 0.5rem;
  list-style: none;
}

.syn-album-track__label {
  min-width: 3rem;
  text-align: right;
}

.syn-album-track__main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.syn-album-track__artists {
  font-size: 0.75em;
  color: var(--syn-sub-title-fg);
}

.syn-album-credit dl {
  margin: 0;
}

.syn-album-credit__row {
  display: grid;
  grid-template-columns: 1fr 1.618fr;
  gap: 0.75rem;
  border-block-start: var(--syn-border-subtle);
  padding-block: 0.5rem;
}

.syn-album-credit__row dt {
  font-weight: 600;
}

.syn-album-credit__row dd {
  margin: 0;
}

.syn-album-covers ul,
.syn-gift-item__covers ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 768px) {
  .syn-album-covers ul,
  .syn-gift-item__covers ul {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.syn-album-covers img,
.syn-gift-item__covers img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.syn-album-previews .syn-platform-embed {
  width: 100%;
}

.syn-gift-item {
  border: var(--syn-border-strong);
  margin-block: 1.5rem;
  padding: 1rem;
}
```

删除三个旧组件文件与两个旧测试文件。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/client/styles/release-css.test.ts tests/client/release && npm run test:typecheck`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/client/styles/release.css tests/client/styles/release-css.test.ts
git rm src/client/components/release/AlbumBookBody.vue src/client/components/release/GiftBookBody.vue src/client/components/release/ReleaseBookIdentity.vue tests/client/release/AlbumBookBody.test.ts tests/client/release/GiftBookBody.test.ts
git commit -m "feat: album section styles, drop auto-render book bodies"
```

---

### Task 10: 全量测试修复 + fixture 更新(book.yml + markdown 组件组装)

**Files:**
- Modify: `tests/helpers/release-fixtures.ts`(albumBook/giftBook 去 desc/authors,加 credit)
- Modify: `tests/fixtures/sites/consumer-smoke/content/releases/demo/book.yml`(Create)
- Modify: `tests/fixtures/sites/consumer-smoke/content/definitions.yml`(加 soundcloud 平台)
- Modify: `tests/fixtures/sites/consumer-smoke/content/releases/demo/zh.md`、`en.md`
- 修复其余受影响的测试文件

- [ ] **Step 1: 更新 fixtures 与 fixture 内容**

`tests/helpers/release-fixtures.ts`:

```ts
export function albumBook(overrides: Partial<AlbumBook> = {}): AlbumBook {
  return {
    title: { zh: '第一张专辑', en: 'First Album' },
    copyright: '© 2026 Synctrol',
    album: {
      covers: ['./assets/front.webp', './assets/back.webp'],
      links: [
        {
          platform: 'bilibili',
          bvid: 'BV1xxxxxxxxx',
          page: 1,
          autoplay: false,
        },
      ],
      discs: [
        {
          title: { zh: '第一碟', en: 'Disc One' },
          tracks: [
            {
              title: { zh: '第一曲', en: 'Track One' },
              artists: ['Synctrol'],
              duration: 272,
            },
            {
              title: { zh: '第二曲', en: 'Track Two' },
              artists: ['Synctrol'],
              duration: 61,
            },
          ],
        },
      ],
      ...overrides.album,
    },
    ...overrides,
    type: 'album',
  }
}

export function giftBook(overrides: Partial<GiftBook> = {}): GiftBook {
  return {
    title: { zh: '周边系列', en: 'Merchandise' },
    gift: {
      items: [
        {
          id: 'poster',
          title: { zh: '纪念海报', en: 'Commemorative Poster' },
          covers: ['./assets/poster-front.webp'],
          links: [
            {
              platform: 'taobao',
              url: 'https://item.taobao.com/example',
            },
          ],
        },
      ],
      ...overrides.gift,
    },
    ...overrides,
    type: 'gift',
  }
}
```

`tests/fixtures/sites/consumer-smoke/content/definitions.yml`:

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
  spotify:
    category: digital
    type: spotify_player
    name: Spotify
```

新建 `tests/fixtures/sites/consumer-smoke/content/releases/demo/book.yml`:

```yaml
type: album
title:
  zh: 演示专辑
  en: Demo Album
copyright: © 2026 Synctrol
credit:
  catalogNumber: SYN-001
  illustrator: 插画师
  designer: 设计师
  mastering: 母带师
album:
  covers:
    - ./assets/artwork.svg
  links:
    - platform: soundcloud
      url: https://soundcloud.com/synctrol/demo
    - platform: spotify
      url: https://open.spotify.com/album/demo
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
        - title:
            zh: 第二曲
            en: Track Two
          artists: [Synctrol]
          duration: 61
```

`zh.md` 替换为:

```md
---
title: 演示作品
description: 冒烟发布
---

<AlbumArtwork />

<AlbumIdentity />

<AlbumTracklist />

<AlbumPreviews />

<AlbumPlatformLinks />

<AlbumCredit />

<AlbumCovers />

<AlbumCopyright />

中文作品正文。
```

`en.md` 对应英文版本同样结构。

- [ ] **Step 2: 运行全量测试并修复剩余编译错误**

Run: `npm test 2>&1 | tail -30`
Expected: 除 3 个预存 `theme.integration.test.ts` 失败外全部通过;如有其他失败逐个修复(涉及 `tests/compiler/*` 中引用旧 model 形状或 `authors`/`returnToReleases` 的用例,按本计划前文的新契约更新)。典型修复点:
- `tests/shared/release/image-roles.test.ts` 若构造 Book 带 authors/desc → 删字段。
- `tests/compiler/build-site.test.ts` / `tests/compiler/compile-content.test.ts` 若 book.yml fixture 带顶层 desc/authors → 更新 YAML。
- `tests/compiler/seo/*` 若引用 albumBook() 的 authors → 已由 fixtures 修复。

- [ ] **Step 3: typecheck**

Run: `npm run test:typecheck`
Expected: 干净

- [ ] **Step 4: 提交**

```bash
git add tests/helpers/release-fixtures.ts tests/fixtures/sites/consumer-smoke/content/
git add -u
git commit -m "test: fixture book.yml and markdown component assembly for smoke site"
```

---

### Task 11: 打包验证 + 浏览器检查

**Files:** 无(验证)

- [ ] **Step 1: 构建与打包**

```bash
npm run build
rm -f vuepress-theme-synctrolling-0.1.0.tgz && npm pack
cd tests/fixtures/sites/consumer-smoke
npm install /Users/cardidi/repos/vuepress-theme-synctrolling/vuepress-theme-synctrolling-0.1.0.tgz
npx vuepress build .
```

Expected: 构建成功;`synctrol-csp.json` 输出包含 soundcloud origin。

- [ ] **Step 2: 重启 dev server**

```bash
pkill -f "vuepress dev"; nohup npx vuepress dev . > /tmp/vuepress-dev.log 2>&1 &
```

等待 `http://localhost:8080/zh/` 返回 200。

- [ ] **Step 3: ChromeMCP 验证**

打开 `http://localhost:8080/zh/releases/demo/`,用 a11y 快照 + evaluate 检查:
- 页面出现 `[data-testid="album-artwork"]`、`[data-testid="album-identity"]`(h2「演示专辑」)、`[data-testid="album-tracklist"]`(两行曲目,艺人小字)、`[data-testid="album-previews"]`(h2「试听」+ SoundCloud embed 激活按钮)、`[data-testid="album-platform-links"]`(Spotify)、`[data-testid="album-credit"]`(制品编号/插画/设计/母带 四行)、`[data-testid="album-covers"]`、`[data-testid="album-copyright"]`(© 2026 Synctrol)
- 不存在 `[data-detail-section]` 与返回链接
- 无 console 报错

- [ ] **Step 4: 提交(如有修复)**

```bash
git add -u && git commit -m "fix: smoke verification adjustments"
```

---

### Task 12: 文档(README 中文作者指南 + AGENTS.md 契约)

**Files:**
- Modify: `README.md`(book.yml 结构、专辑组件用法)
- Modify: `AGENTS.md`(主题功能/内容包/重要概念中专辑契约的更新)
- Test: `tests/publish/theme-docs.test.ts`、`tests/publish/readme.test.ts`

- [ ] **Step 1: 更新 README**

在 README 的「内容目录」示例中 book.yml 展示新结构(含 credit、links 平台引用);新增「专辑页组件」小节,示例:

```md
专辑页由 Markdown 中的组件组装,所有组件自动读取该作品包的 book.yml 数据:

<AlbumArtwork />
<AlbumIdentity />
<AlbumTracklist />
<AlbumPreviews />
<AlbumPlatformLinks />
<AlbumCredit />
<AlbumCovers />
<AlbumCopyright />
<GiftItem id="poster" />

- `<AlbumPreviews />` 渲染试听链接:definitions.yml 中声明为
  soundcloud_player / audio_player / netease_player 类型(或自定义类型带 preview: true)
  的平台条目。
- `<AlbumCredit />` 按固定顺序渲染 credit: catalogNumber、illustrator、
  designer、mastering、mix、webDesign、producer、specialThanks。
```

同时删除文档中对自动渲染区块、`authors`/顶层 `desc` 的旧示例(确保不违反 tests/publish 断言)。

- [ ] **Step 2: 更新 AGENTS.md**

- 「内容包」一节 book.yml 说明:顶层字段为 `type/title/copyright/credit/album|gift`;`desc`/`authors` 已废弃(出现即构建错误);credit 固定键列表;preview 判定(平台 type 注册表 `preview: true`,内置音频型三个)。
- 「主题功能」作品系统条目:专辑页由 Markdown 全局组件手动组装,布局仅注入上下文与草稿角标;返回链接已移除。

- [ ] **Step 3: 运行文档锁定测试**

Run: `npx vitest run tests/publish`
Expected: PASS(若断言旧文案需同步调整断言,保证 README 仍为中文作者指南且不提及 AGENTS)

- [ ] **Step 4: 提交**

```bash
git add README.md AGENTS.md tests/publish/
git commit -m "docs: album component assembly contract in README and AGENTS"
```

---

### Task 13: 终验 —— 全量测试 + 全流程确认

- [ ] **Step 1: 全量测试**

Run: `npm test 2>&1 | grep -E "Tests "`
Expected: `3 failed | N passed`(仅 3 个预存 theme.integration 失败)

- [ ] **Step 2: 构建产物断言**

Run: `npm run assert:build-artifacts && npm run assert:pack && npm run assert:exports && npm run test:consumer-smoke`
Expected: 全部通过

- [ ] **Step 3: 提交残留变更(如有)**

```bash
git status --short
git add -u && git commit -m "chore: final verification fixes" || true
```
