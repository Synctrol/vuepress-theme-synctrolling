# Release Player + Album Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `book.yml` + `definitions.platforms` with side-car `album.yml` (`src` on album components), Markdown `<Player>` / existing `<Button>`, and delete gift + custom player registration.

**Architecture:** Compile-time: parse `album.yml` per release package, scan locale Markdown for `<Player>` tags (validate against built-in registry, collect CSP), reject `book.yml` / `definitions.platforms` / `type: gift` / `platforms.types`. Client: album components read compiled metadata via `src`; `<Player>` renders built-in embed; links use `<Button>`.

**Tech Stack:** VuePress 2 theme (TypeScript NodeNext), Vitest, existing platform builtins / PlatformEmbed, YAML via `yaml` package.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-11-release-player-metadata-design.md` (authoritative).
- Internal `src/**` imports keep `.js` suffix (NodeNext).
- No consumer-custom `platforms.types`; extend players only in theme source.
- No `book.yml`, no `definitions.platforms`, no gift line, no `link` platform type.
- `platforms.loadStrategy` remains (`interaction` | `viewport`, default `interaction`).
- Album component `src` is relative to the **content package directory**; escape outside package → build fail.
- Illegal Player / missing album.yml fields → **build fail** (not production warn-only).
- README stays Chinese author docs; do not mention AGENTS.md in README.
- `npm test` then build + assert/smoke before claiming done.
- Commit after each task; do not push unless asked.

## File map (create / modify / delete)

| Path | Role |
| --- | --- |
| `src/compiler/album-metadata.ts` | Parse/validate `album.yml` → compiled album model (title/copyright/credit/covers/discs) |
| `src/compiler/scan-release-markdown.ts` | Scan package `*.md` for `src="…"` on album components + `<Player …>` attrs |
| `src/compiler/player-entry.ts` | Validate one Player usage against built-in registry (no definitions key) |
| `src/compiler/definitions.ts` | Drop `platforms` parsing; reject `platforms` root field |
| `src/compiler/discovery.ts` / `compile-content.ts` / `build-site.ts` | Fail on `book.yml`; wire album metadata + players; stop `parseBook` |
| `src/compiler/book.ts` | Delete (or gut and remove exports) |
| `src/compiler/platform-entry.ts` | Remove category checks / definition lookup; keep only if still used by Player validate path, else delete |
| `src/compiler/release/detail-model.ts` / `inject-release-frontmatter.ts` | Shrink context: artwork + messages + loadStrategy + albumBySrc + players |
| `src/compiler/platforms/collect-visible-platform-entries.ts` / CSP writers | Collect from scanned Players only |
| `src/platforms/registry.ts` | `resolvePlatformTypes()` returns builtins only; remove custom merge |
| `src/platforms/builtins/link.ts` + `builtins/index.ts` | Remove `link` type |
| `src/shared/types.ts` / `options.ts` / `options-validation.ts` / `client-options.ts` | Drop gift book types, PlatformDefinition.platforms, `platforms.types`, gift messages if unused |
| `src/shared/release/types.ts` / `link-roles.ts` | Drop previewLinks/platformLinks/gift; album model without links |
| `src/client/components/release/Player.vue` (or `.ts`) | New global component |
| `src/client/components/release/Album*.vue` | Require `src`; read compiled metadata |
| `src/client/components/release/AlbumPlatform.vue` / `GiftItem.vue` | Delete |
| `src/client/components/platforms/renderers/LinkPlatform.ts` / `PlatformLinks.ts` | Delete if unused |
| `src/client/config.ts` | Register `Player`; drop AlbumPlatform/GiftItem |
| `tests/**` + `tests/fixtures/**` + README + AGENTS + CHANGELOG | Migrate |

---

### Task 1: Reject `definitions.platforms` and stop custom `platforms.types`

**Files:**
- Modify: `src/compiler/definitions.ts`
- Modify: `src/shared/options.ts`, `src/shared/options-validation.ts`, `src/shared/types.ts` (`ContentDefinitions`, `PlatformDefinition` removal or shrink)
- Modify: `src/platforms/registry.ts`
- Modify: `src/compiler/theme.ts`, `src/compiler/build-site.ts`, `src/compiler/compile-content.ts` (call sites of `resolvePlatformTypes(custom)`)
- Test: `tests/compiler/definitions*.test.ts` (or create `tests/compiler/definitions-platforms-removed.test.ts`)
- Test: `tests/platforms/registry.test.ts`, `tests/shared/options*.test.ts`

**Interfaces:**
- Consumes: existing `loadContentDefinitions(path, mainLocale)`
- Produces: `ContentDefinitions = { tags: Record<string, TagDefinition> }` only; `resolvePlatformTypes(): Record<string, PlatformTypeRegistration>` with **no parameters** (builtins only)

- [ ] **Step 1: Write failing tests**

```ts
// tests/compiler/definitions-platforms-removed.test.ts
import { writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { loadContentDefinitions } from '../../src/compiler/definitions.js'

describe('definitions without platforms', () => {
  it('loads tags-only definitions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'defs-'))
    const path = join(dir, 'definitions.yml')
    writeFileSync(
      path,
      `tags:\n  release:\n    title:\n      zh: 作品\n      en: Releases\n`,
    )
    const defs = loadContentDefinitions(path, 'zh')
    expect(defs.tags.release).toBeTruthy()
    expect(Object.hasOwn(defs, 'platforms')).toBe(false)
  })

  it('fails when platforms key is present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'defs-'))
    const path = join(dir, 'definitions.yml')
    writeFileSync(
      path,
      `tags: {}\nplatforms:\n  x:\n    category: digital\n    type: link\n    name: X\n`,
    )
    expect(() => loadContentDefinitions(path, 'zh')).toThrow(/platforms/i)
  })
})
```

```ts
// extend tests/platforms/registry.test.ts
it('resolvePlatformTypes ignores custom registration API', () => {
  // After change: resolvePlatformTypes() takes no custom map.
  // Calling old signature must not compile; test that builtins-only works
  // and options validation rejects platforms.types.
})
```

Also add options validation test: `platforms: { types: { custom: … } }` → throw `Unknown field` or explicit reject.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run tests/compiler/definitions-platforms-removed.test.ts`
Expected: FAIL (platforms still accepted / still on type)

- [ ] **Step 3: Implement**

- `ROOT_FIELDS` in `definitions.ts`: only `['tags']`; if `platforms` present → build error with clear message.
- Remove `parsePlatforms`, `PlatformDefinition`, `PlatformCategory` from public content definitions.
- `PlatformsOptions` → `{ loadStrategy?: 'interaction' | 'viewport' }` only; validation rejects `types`.
- `resolvePlatformTypes()` → return `{ ...builtInPlatformTypes }` with no custom merge (update signature; fix all call sites).
- Temporarily leave `link` builtin in place until Task 5 (still referenced by old book path until removed).

- [ ] **Step 4: Run tests — expect PASS** for this file; fix broken call sites so `npx vitest run tests/compiler/definitions-platforms-removed.test.ts tests/platforms/registry.test.ts` passes. Broader suite may still fail until later tasks — note failures, do not widen scope.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/definitions.ts src/shared/types.ts src/shared/options.ts src/shared/options-validation.ts src/platforms/registry.ts src/compiler/theme.ts src/compiler/build-site.ts src/compiler/compile-content.ts tests/compiler/definitions-platforms-removed.test.ts tests/platforms/registry.test.ts tests/shared
git commit -m "feat!(definitions): drop platforms catalog and custom types"
```

---

### Task 2: `album.yml` parser (pure compile helper)

**Files:**
- Create: `src/compiler/album-metadata.ts`
- Create: `tests/compiler/album-metadata.test.ts`
- Reuse field parsers from former `book.ts` where possible (credit keys, discs/tracks, multilanguage) — extract shared helpers into `src/compiler/album-metadata.ts` rather than importing doomed `book.ts`.

**Interfaces:**
- Produces:

```ts
export interface CompiledAlbumMetadata {
  title: Multilanguage
  copyright?: string
  credit?: CreditMap  // same fixed keys as today
  covers: string[]    // unresolved relative paths; asset pipeline resolves later
  discs: CompiledDisc[]
}

export function parseAlbumMetadata(
  raw: unknown,
  absolutePath: string,
  mainLocale: LocaleKey,
): CompiledAlbumMetadata
```

- Unknown fields (including `type`, `links`, `album`, `gift`) → throw with path.
- `title` required; `discs` optional array (empty ok); cover paths must be non-empty strings.

- [ ] **Step 1: Write failing tests** in `tests/compiler/album-metadata.test.ts` covering: happy path; rejects `links`; rejects unknown credit key; requires `title`; accepts credit string | string[].

- [ ] **Step 2: Run — expect FAIL** (`parseAlbumMetadata` missing)

Run: `npx vitest run tests/compiler/album-metadata.test.ts`

- [ ] **Step 3: Implement** `parseAlbumMetadata` (+ small private helpers). Do not wire into compile-content yet.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/compiler/album-metadata.ts tests/compiler/album-metadata.test.ts
git commit -m "feat(compiler): parse album.yml metadata without links"
```

---

### Task 3: Scan release Markdown for `src` + `<Player>`; compile into page model

**Files:**
- Create: `src/compiler/scan-release-markdown.ts`
- Create: `src/compiler/player-entry.ts`
- Modify: `src/compiler/compile-content.ts`, `src/compiler/release/detail-model.ts`, `src/compiler/release/inject-release-frontmatter.ts`
- Modify: `src/shared/release/types.ts` (new shapes)
- Test: `tests/compiler/scan-release-markdown.test.ts`, `tests/compiler/player-entry.test.ts`
- Update release acceptance tests as needed for new frontmatter shape

**Interfaces:**
- Produces:

```ts
export interface ScannedPlayerUsage {
  type: string
  attrs: Record<string, string>
  sourcePath: string  // md file
  // line optional if easy
}

export function scanReleaseMarkdown(markdownSource: string, sourcePath: string): {
  albumSrcPaths: string[]  // e.g. ['./album.yml'] from AlbumIdentity|Tracklist|Credit|Covers src=
  players: ScannedPlayerUsage[]
}

export function validatePlayerUsage(
  usage: ScannedPlayerUsage,
  types: Record<string, PlatformTypeRegistration>,
): PlatformEntryBase  // validated entry for CSP/embed; no platform key / name from definitions
```

- Player attrs: map HTML-like attrs to the object expected by `typeRegistration.validate` (reuse patterns from old platform-entry without `platform`/`category`). For netease, `url` alone is enough (builtin normalizes).
- Resolve `src` against package dir with `path.resolve`; if result is outside package dir → throw.
- Missing file → throw.
- Build `albumBySrc: Record<string, CompiledAlbumMetadata>` (key = normalized posix relative path as used in MD).
- If any Album* `src` appears, parse those files; duplicate src parse once.
- Detail model / provide payload: `{ artwork, locale, mainLocale, messages, loadStrategy, albumBySrc }` — **no** `book`, **no** definitions.platforms.

**Note:** Until Task 4–6 delete book, compile-content may still call `parseBook` — in this task switch release packages to the new path and **fail if `book.yml` exists** (start of removal). Discovery: if `book.yml` present → throw `book.yml is no longer supported`.

- [ ] **Step 1: Failing tests** for scanner (extracts src + Player), player validate (unknown type throws), compile fixture package with only `album.yml` + md succeeds and injects `albumBySrc`.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement scanner, player-entry, wire compile-content + detail-model + inject. Delete/stop gift branch handling in compile path (throw if old gift book encountered via book.yml — already failing on any book.yml).**

- [ ] **Step 4: Targeted vitest PASS** for new tests; fix compile-content unit tests that assumed book.yml.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(compiler): scan album src and Player tags into release model"
```

---

### Task 4: Client — album components use `src`; add `<Player>`; remove AlbumPlatform / GiftItem

**Files:**
- Modify: `AlbumIdentity.vue`, `AlbumTracklist.vue`, `AlbumCredit.vue`, `AlbumCovers.vue`, `release-context.ts`
- Create: `src/client/components/release/Player.vue` (or `.ts` using PlatformEmbed)
- Modify: `src/client/config.ts`
- Delete: `AlbumPlatform.vue`, `GiftItem.vue`
- Test: `tests/client/components/release/*.test.ts` (update mounts to pass `src` + provide `albumBySrc`)
- Remove gift/AlbumPlatform tests

**Interfaces:**
- `ReleasePageContext` includes `albumBySrc: Record<string, CompiledAlbumMetadata>` (covers may already be resolved URLs in client payload — mirror prior artwork asset resolution: resolve covers in compiler when building provide data, same as old book covers).
- Each album component:

```ts
const props = defineProps<{ src: string /* + existing optional flags */ }>()
const album = computed(() => context?.albumBySrc[normalizeSrc(props.src)])
```

- Missing key → empty render + **dev** warn is insufficient for author errors (compiler already failed if src missing); client warn only for programming mistakes.
- `<Player>` props: `type: string` plus passthrough attrs matching validated entry fields OR a single compiled entry id. Prefer: props mirror MD (`type`, `url`, `uri`, `id`, …); client looks up builtin registration, calls validate again for safety, renders `PlatformEmbed` with `platformName` = humanized type or messages fallback (use type string as label if no separate name).

Display name for activate button: use `type` label map in messages **or** simply the type key; minimal approach — use type string (e.g. `netease_player`) unless existing messages already have nicer names; do not reintroduce definitions names.

- [ ] **Step 1: Failing client tests** for Tracklist with provide `albumBySrc` + `src` prop; Player renders embed shell for `audio_player`/`netease_player` fake registration.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement components + config registration; delete AlbumPlatform/GiftItem.**

- [ ] **Step 4: Client tests PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(client): album src props and Player; remove AlbumPlatform and GiftItem"
```

---

### Task 5: Remove `book.ts`, `link` type, dead platform-entry/list UI, gift messages

**Files:**
- Delete: `src/compiler/book.ts` and exports from `src/compiler/index.ts`
- Delete: `src/platforms/builtins/link.ts`; remove from `builtins/index.ts` and `BuiltInPlatformType`
- Delete unused: `PlatformLinks.ts`, `LinkPlatform.ts`, `link-roles.ts` if unused, gift fields in `messages.ts` / `LocaleMessages` (`gifts`, `giftItems`) if unused
- Delete tests tied to book/gift/link platform definitions
- Modify CSP collect to use scanned players only (`collect-visible-platform-entries.ts` rewrite or replace)

- [ ] **Step 1: Write/adjust tests** asserting `link` is not a builtin; `parseBook` export gone; CSP from player list.

- [ ] **Step 2: Run relevant tests — FAIL on leftovers**

- [ ] **Step 3: Delete dead code; fix imports until typecheck clean for touched graph**

- [ ] **Step 4: `npm run test:typecheck` PASS; vitest for platforms/compiler release PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor!: remove book.yml pipeline, link type, and gift remnants"
```

---

### Task 6: Migrate fixtures, README, AGENTS, CHANGELOG, consumer-smoke

**Files:**
- `tests/fixtures/sites/consumer-smoke/content/releases/demo/` — replace `book.yml` with `album.yml`; rewrite `zh.md` / `en.md` to use `src` + `<Player>` + `<Button>`
- All other fixtures under `tests/fixtures/**` that have `platforms:` or `book.yml`
- `README.md`, `AGENTS.md`, `CHANGELOG.md`
- `scripts/run-consumer-smoke.mjs` assertions (AlbumPlatform → Player/TabView; bandcamp as Button text, etc.)
- Revert local-only smoke `package.json` hacks if still pointing at tarball/`file:../../../../` incorrectly for CI — keep CI-compatible dependency pattern used by `run-consumer-smoke.mjs` (script rewrites dep); fixture `package.json` may stay as tarball placeholder per existing smoke design

**Example demo md fragment:**

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

- [ ] **Step 1: Migrate fixtures + docs**

- [ ] **Step 2: Run `npm test`** — expect PASS

- [ ] **Step 3: Run `npm run build` && `npm run assert:build-artifacts` && `npm run assert:exports`**

- [ ] **Step 4: Run consumer smoke** (on Windows use `npm.cmd` if `spawnSync npm` fails — fix script in this task if still broken: `const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'`)

Run: `npm run test:consumer-smoke`  
Expected: `run-consumer-smoke: ok`

- [ ] **Step 5: Commit**

```bash
git commit -m "docs!: migrate fixtures and docs to album.yml and Player"
```

---

## Spec coverage checklist (self-review)

| Spec item | Task |
| --- | --- |
| Remove definitions.platforms | 1 |
| Remove platforms.types custom | 1, 5 |
| album.yml fields / no links | 2 |
| Component src relative to package | 3, 4 |
| Player built-in types only | 3, 4, 5 |
| Button for external links | 6 (docs/fixtures); component exists |
| Delete book.yml | 3 (fail), 5 (delete pipeline) |
| Delete gift line | 3–5 |
| Delete AlbumPlatform / GiftItem | 4 |
| Delete link type | 5 |
| CSP from Players | 3, 5 |
| loadStrategy kept | 1 (options shape), 4 (Player) |
| README / AGENTS / CHANGELOG / smoke | 6 |

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-11-11-release-player-metadata.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
