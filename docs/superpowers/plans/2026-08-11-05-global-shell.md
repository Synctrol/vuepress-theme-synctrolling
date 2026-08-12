# Global Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Revision Notes (executable against Plans 01–04 @ HEAD `a599cc4`)

Revised so an implementation worker can execute against shipped Plans 01–04 without breaking asset/page-data contracts. Binding decisions (do not re-litigate):

1. **Nested page data:** Layout/client reads `page.frontmatter.synctrol.{identity,locale,contentAssets,alternates,…}` — never top-level `synctrolIdentity` / `synctrolLocale`. Call `setContentAssetMap(frontmatter.synctrol.contentAssets ?? {})` on page change.
2. **Extend client exports (JS-only subpath):** `src/client/index.ts` **extends** Plan 04 asset helpers (`resolveContentAsset`, `setContentAssetMap`, `createResolveContentAsset`, `normalizeContentAssetRef`, `ContentAssetMap`) plus pure TS composables/utilities/keys. Do **not** re-export `Layout.vue` (or any SFC) from this barrel — Node `import('vuepress-theme-synctrolling/client')` / `dist/client/index.js` must stay loadable without resolving `.vue`. Layout registers only via `defineClientConfig` in `src/client/config.ts`. Smoke tests keep asserting asset helpers; they must **not** require importing Layout from Node.
3. **URL helpers:** Import `joinPublicPath` / `normalizeBase` from `../../shared/route-path.js` (not `url/normalize-path`).
4. **Encoded locale hrefs:** Navigation locale prefixes and any synthesized locale-home fallbacks use `encodePathSegment` (Plan 03 RFC3986 encoder extracted to shared) / compiled `publicPath` — no raw CJK keys in hrefs. Prefer injected `frontmatter.synctrol.alternates[].publicPath`.
5. **`LOCALE_STORAGE_KEY` client boundary:** Client must not import `src/compiler/**`. Task 1 prerequisite moves the constant to `src/shared/locale-storage.ts`; `root-router-html.ts` imports from shared (re-export optional). LanguageSwitcher imports from shared. Plan 03 Downstream note synced.
6. **NodeNext imports:** Every `src/**` relative import ends in `.js` (including `<script setup>` in `.vue` files). Test imports stay extensionless.
7. **Vue SFC typecheck + dist copy:** Add `src/vue-shim.d.ts` (`declare module '*.vue'`) and include it in production `tsconfig.json`. Keep **`tsc`** as the package TypeScript compiler (do not switch to `vue-tsc`). Do **not** add `src/**/*.vue` to `tsc` `include` — shim lets `.ts` (e.g. `config.ts`) import `.vue` for typecheck without emitting SFCs; a post-`tsc` copy step supplies `*.vue` / `*.css` / client media under `dist/client`.
8. **`theme.ts` is a PATCH:** Task 3/13 show additive diffs against current Plan 04 `theme.ts` (assets + `contentAssets` + filter + router). Full-file illustrative replacements are forbidden.
9. **Alternates leftover fixed:** No raw `` `/${key}/` `` home synthesis; use encoded segment or compiled `publicPath`.
10. **SocialLinks (Plan 05 scope):** Shell acceptance allows root-absolute, remote `http(s):`, and data-URI icon stubs. Hashed `globalPublicPaths` injection into client options is **out of scope** for this plan (later plans may wire it).
11. **Deps:** Install Vue test tooling compatible with shipped `vite ^6.4.3` / `vitest ^4.1.10` / Node 20 — do not pin stale `happy-dom@^15` / `@vitejs/plugin-vue@^5.2.0` ranges unless `tests/package-contract.test.ts` is updated intentionally.

### Round-2 packaging (closes GPT Criticals on Vue + `tsc`)

12. **`tsc` + copy client assets:** Package build stays `tsc -p tsconfig.json`, then **`node scripts/copy-client-assets.mjs`** copies client static assets (`*.vue`, `*.css`, and any needed client media) from `src/client` → `dist/client`, preserving structure. Task 1 creates the script and updates `package.json` `"build"` accordingly (e.g. `tsc -p tsconfig.json && node scripts/copy-client-assets.mjs`). Plan 11 may extend the same script for fonts/pack asserts — do not invent a parallel copy pipeline in Plan 05.
13. **`clientConfigFile` → emitted `.js`:** Theme resolves `path.resolve(__dirname, '../client/config.js')` (not `config.ts`). After `tsc`, the artifact is `dist/client/config.js`; VuePress’s bundler resolves `.vue` imports inside that config when the theme is consumed.
14. **No SFC re-exports from `./client`:** Confirms item 2 — `export { default as Layout } from './layouts/Layout.vue'` is forbidden in `src/client/index.ts`.
15. **`vue-shim.d.ts` stays** for `tsc` typecheck of `.ts` → `.vue` imports; copy step owns runtime presence under `dist/`.
16. **Vitest Layout mock hoisting:** `Layout.test.ts` must use `vi.hoisted(() => …)` for any `ref` / state closed over by `vi.mock('vuepress/client', …)` so Vitest does not hit temporal-dead-zone / hoist-order failures.
17. **Stdlib paths:** Prefer `node:path` / `node:url` (`dirname`, `resolve`, `fileURLToPath`) for `__dirname` + `clientConfigFile`. Do **not** add a direct `@vuepress/utils` dependency solely for `getDirname` / `path` unless it is already a package dependency (today it is only transitive via `vuepress`).

**Goal:** Build the Synctrol VuePress theme global shell—Header, Main, Navigation, Footer, SocialLinks, LanguageSwitcher, ThemeMode, desktop golden-ratio CSS grid, mobile hamburger flow, dock clearance, and accessibility behavior—without Background runtime or Release/News content UI.

**Architecture:** Client Vue components under `src/client/` compose a single `Layout.vue` that applies CSS grid areas `header / main / navigation / footer / dock`. Pure TypeScript helpers under `src/client/` and `src/shared/` own color-mode cycling, navigation href resolution, locale alternates, focus trapping, and message interpolation so component tests stay thin. Theme options arrive from Plan 01 `__SYNCTROL_THEME_OPTIONS__`; page identity/locale/contentAssets/alternates come from nested `frontmatter.synctrol` stamped by Plans 03–04 (tests inject fixtures). Social icon URLs may be stubs (absolute/remote/data-URI).

**Tech Stack:** Vue 3 SFCs, VuePress 2 theme client API, TypeScript, Vitest + happy-dom + `@vue/test-utils`, CSS custom properties from Plan 01 tokens, package `vuepress-theme-synctrolling`.

## Global Constraints

- Package name is `vuepress-theme-synctrolling`.
- Brand tokens are fixed: black/white, `3px` strong border, `0` radius, Archivo Black display face, golden-ratio desktop grid.
- There is no `contentDir`, full route-template, visual-token, breakpoint, SocialLinks icon-size, or Release artwork-loading option.
- `defaultColorMode` defaults to `auto`; ThemeMode cycle remains `AUTO → LIGHT → DARK → AUTO`.
- Navigation is an options object with `externalTarget` defaulting to `'_blank'`; SocialLinks options expose `items` only.
- Plans 01–04 are assumed complete (types, options, messages, tokens including dock vars, multilanguage resolver, compiled page identities, asset pipeline + `frontmatter.synctrol.contentAssets`, client asset helpers on `./client`).
- Asset hashing (Plan 04) may be stubbed in shell tests: pass resolved public URLs or data-URI icons.
- No Background runtime (Plan 06). No Release/News content UI beyond shell chrome (Plans 08–09).
- Desktop breakpoint boundary is `768px` (`max-width: 768px` = mobile).
- Safe-area dock tokens from Plan 01 must be consumed, not redefined with different values.
- Every relative import inside `src/` ends in `.js`; test imports are extensionless (Plan 03 convention).
- Keep `tsc` for package emit; copy `src/client` static assets (`*.vue`, `*.css`, client media) into `dist/client` after compile. Never re-export SFCs from the Node-importable `./client` subpath.
- `clientConfigFile` always resolves to the emitted `../client/config.js` (not `.ts`).
- Prefer stdlib `node:path` / `node:url` over `@vuepress/utils` for theme path resolution unless `@vuepress/utils` is already a direct dependency.
- All later tasks inherit these constraints.

## Downstream note (Plan 03/04 contracts)

- Plan 04 exports `resolveContentAsset` / `setContentAssetMap` / `createResolveContentAsset` / `normalizeContentAssetRef` from `vuepress-theme-synctrolling/client` (via `src/client/index.ts`). This plan **extends** that barrel with pure TS only (keys/composables/utilities). Layout calls `setContentAssetMap(frontmatter.synctrol.contentAssets ?? {})` on page change and is registered in `src/client/config.ts` via `defineClientConfig` — do **not** re-export `Layout.vue` from `src/client/index.ts`; do not invent a separate `./client/assets` package export; do not drop Plan 04 exports.
- Page data lives under nested **`frontmatter.synctrol`**: `identity`, `locale`, `contentAssets`, plus Plan 05-injected **`alternates`** (`{ locale, publicPath }[]` from `built.site.pages` for the same identity; `publicPath` already encodeRouteSegment'd).
- Social icon option refs that are root-absolute (`/…`) or remote `http(s):` are preserved by Plan 04 (not hashed). Config-relative icons are hashed into `/assets/global/…`. Plan 05 shell stubs (absolute/remote/data-URI) remain valid; wiring `globalPublicPaths` into client options is out of scope here.
- Extend Plan 03/04 `theme.ts` in place — do not replace page registration, content-tree filtering, root-router write, or asset compile/inject. Set `clientConfigFile` to emitted `../client/config.js`.
- `LOCALE_STORAGE_KEY` canonical home after Task 1 prerequisite: `src/shared/locale-storage.ts` (value remains `synctrol:locale`). Compiler root-router and client LanguageSwitcher both import from shared.
- Build packaging: Task 1 adds `scripts/copy-client-assets.mjs` and updates `"build"` so `npm run test:build-smoke` / Node import of `dist/client/index.js` stays green while `dist/client/**/*.vue` exist for VuePress.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/shared/locale-storage.ts` | **Task 1 prerequisite:** canonical `LOCALE_STORAGE_KEY` (`synctrol:locale`) for root router + LanguageSwitcher |
| `src/shared/encode-path-segment.ts` | **Task 5 prerequisite:** Plan 03 `encodePathSegment` extracted for client-safe locale encoding |
| `src/shared/format-message.ts` | Interpolate `{name}` placeholders in locale messages |
| `src/vue-shim.d.ts` | Minimal `declare module '*.vue'` so production `tsc` accepts `.vue` imports |
| `src/client/color-mode/types.ts` | `ColorModePreference` type |
| `src/client/color-mode/cycle.ts` | Cycle `auto → light → dark → auto` |
| `src/client/color-mode/storage.ts` | `localStorage` key `synctrol:color-mode` read/write |
| `src/client/color-mode/resolve.ts` | Resolve preference + `prefers-color-scheme` → `light \| dark` |
| `src/client/color-mode/boot-script.ts` | Inline startup script string preventing FOUC |
| `src/client/navigation/resolve-nav-href.ts` | Internal/external href rules; reject `./` `../`; encode locale segment |
| `src/client/navigation/is-external-href.ts` | Detect absolute URL destinations |
| `src/client/i18n/locale-alternates.ts` | Build LanguageSwitcher targets from page identity + encoded publicPaths |
| `src/client/a11y/focus-trap.ts` | Focus trap activate/deactivate for overlays |
| `src/client/composables/useThemeOptions.ts` | Read resolved theme options from define/inject |
| `src/client/composables/useColorMode.ts` | Reactive color-mode preference + computed surface |
| `src/client/composables/useLocaleShell.ts` | Current locale, messages, copyright text |
| `src/client/components/ThemeMode.vue` | Single-label cycle control |
| `src/client/components/Navigation.vue` | Desktop/drawer nav list |
| `src/client/components/HeaderBar.vue` | Copyright, ThemeMode, mobile hamburger |
| `src/client/components/NavDrawer.vue` | Mobile hamburger overlay with focus trap |
| `src/client/components/SocialLinks.vue` | Fixed bottom-left icon links |
| `src/client/components/LanguageSwitcher.vue` | Fixed bottom-right upward collapsible |
| `src/client/components/SiteFooter.vue` | Reserved footer region (empty stub) |
| `src/client/components/ShellLayout.vue` | Grid shell composing all regions |
| `src/client/layouts/Layout.vue` | VuePress layout entry wrapping `ShellLayout`; wires `setContentAssetMap` |
| `src/client/styles/shell.css` | Grid, dock, mobile, overlay, focus-visible rules |
| `src/client/config.ts` | VuePress client config: layouts + styles (`defineClientConfig` registers `Layout`) |
| `src/client/index.ts` | **Extend** Plan 04 client exports with pure TS only (keys/composables); **no** `.vue` re-exports |
| `src/compiler/theme.ts` | **PATCH** Plan 04 theme — add `clientConfigFile` → `../client/config.js`, boot script, `synctrol.alternates`; keep assets + filter + router |
| `src/compiler/root-router-html.ts` | Import `LOCALE_STORAGE_KEY` from shared after Task 1 prerequisite |
| `src/compiler/path-suffix.ts` | Re-import `encodePathSegment` from shared after Task 5 prerequisite |
| `scripts/copy-client-assets.mjs` | **Task 1:** copy `*.vue` / `*.css` / client media `src/client` → `dist/client` after `tsc` |
| `tests/shared/format-message.test.ts` | Message interpolation |
| `tests/client/color-mode/*.test.ts` | Cycle, storage, resolve, boot script |
| `tests/client/navigation/*.test.ts` | Href resolution |
| `tests/client/i18n/locale-alternates.test.ts` | Alternate locale hrefs |
| `tests/client/a11y/focus-trap.test.ts` | Focus trap |
| `tests/client/components/*.test.ts` | Component + a11y tests |
| `tests/client/shell/shell-layout.test.ts` | Grid areas, mobile flow, dock clearance |
| `vitest.config.ts` | Split node vs happy-dom environments |
| `package.json` | Add Vue test deps; set `build` to `tsc && node scripts/copy-client-assets.mjs` |

**Assumed from Plans 01–04 (do not redefine):**

- `ResolvedSynctrolThemeOptions`, `NavigationOptions`, `SocialLinksOptions`, `resolveThemeOptions`
- `resolveMultilanguage`, `LocaleMessages` (`auto`/`light`/`dark`/`menu`/`close`/`language`/`themeModeAnnouncement`)
- Dock tokens in `src/client/styles/tokens.css`
- `PageIdentity`, `CompiledPage.url.publicPath` (locale segment already encodeRouteSegment'd)
- Nested `frontmatter.synctrol` with `identity`, `locale`, `contentAssets` (Plan 04)
- Client asset helpers already exported from `src/client/index.ts`
- `__SYNCTROL_THEME_OPTIONS__` define from `synctrolTheme()` via Plan 01 `toClientThemeOptions`
- Plan 03/04 own `src/compiler/theme.ts` (`onInitialized` page registration, asset compile, content-tree filter, `onGenerated` root router). This plan **patches** that module only.
- `joinPublicPath` / `normalizeBase` live in `src/shared/route-path.ts`
- Locale home / alternate `publicPath` values are encodeRouteSegment'd (ASCII fixtures unchanged; CJK locale keys must not appear raw in hrefs)

---

### Task 1: Vue client test harness + client asset packaging

**Files:**
- Modify: `package.json` — Vue test deps **and** `"build": "tsc -p tsconfig.json && node scripts/copy-client-assets.mjs"`
- Modify: `vitest.config.ts`
- Modify: `tsconfig.json`
- Create: `src/vue-shim.d.ts`
- Create: `scripts/copy-client-assets.mjs`
- Create: `src/shared/locale-storage.ts` (**prerequisite — client boundary**)
- Modify: `src/compiler/root-router-html.ts` — import `LOCALE_STORAGE_KEY` from `../shared/locale-storage.js` (remove local `export const`; re-export from shared if other modules import from root-router today)
- Create: `tests/client/harness/mount.ts`
- Create: `tests/client/harness/fixtures.ts`
- Create: `tests/client/harness/smoke.test.ts`

**Interfaces:**
- Consumes: Plan 01 Vitest + Vue peer deps; Plan 03 `LOCALE_STORAGE_KEY` value `synctrol:locale`; existing `tsc` emit layout
- Produces: happy-dom environment for `tests/client/**`; `mountShell(component, options)` helper; fixture theme options; `*.vue` module shim for `tsc`; shared `LOCALE_STORAGE_KEY`; post-`tsc` copy of client static assets into `dist/client` so VuePress can load SFCs while Node `./client` stays JS-only

- [ ] **Step 0: Move `LOCALE_STORAGE_KEY` to shared (client-safe prerequisite)**

Client code must not import `src/compiler/**`. Before LanguageSwitcher (Task 10) or any client consumer:

```ts
// src/shared/locale-storage.ts
/** Must stay exactly `synctrol:locale` — shared by root router HTML and LanguageSwitcher. */
export const LOCALE_STORAGE_KEY = 'synctrol:locale'
```

```ts
// src/compiler/root-router-html.ts — change only the constant ownership
import { LOCALE_STORAGE_KEY } from '../shared/locale-storage.js'
export { LOCALE_STORAGE_KEY } // keep existing importers working
// delete: export const LOCALE_STORAGE_KEY = 'synctrol:locale'
```

Run existing root-router / theme integration tests to confirm no drift:

```bash
npm test -- tests/compiler/root-router-html.test.ts tests/compiler/theme.integration.test.ts
```

Expected: PASS (string value unchanged).

- [ ] **Step 1: Write the failing harness smoke test**

```ts
// tests/client/harness/smoke.test.ts
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountShell } from './mount'

describe('client harness', () => {
  it('mounts a Vue SFC under happy-dom', () => {
    const Comp = defineComponent({
      setup() {
        return () => h('button', { type: 'button' }, 'OK')
      },
    })
    const wrapper = mountShell(Comp)
    expect(wrapper.get('button').text()).toBe('OK')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/harness/smoke.test.ts`

Expected: FAIL because `mount` helper / happy-dom / Vue plugin are missing.

- [ ] **Step 3: Install deps, vue shim, and implement harness**

Install Vue test tooling compatible with shipped Vite 6 / Vitest 4 (avoid stale major pins):

```bash
npm install -D @vue/test-utils@^2.4.6 happy-dom@^17.0.0 @vitejs/plugin-vue@^5.2.4
```

(If package-contract later asserts exact ranges, update that test in the same commit. Prefer ranges that resolve cleanly under Node 20 + `vite@^6.4.3`.)

```ts
// src/vue-shim.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['tests/client/**', 'happy-dom'],
      ['tests/**', 'node'],
    ],
  },
})
```

Update `tsconfig.json` — keep production `tsc` (no `vue-tsc`). Include the shim; do **not** add `src/**/*.vue` to `include` (tsc must not parse SFCs):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "jsx": "preserve"
  },
  "include": ["src/**/*.ts", "src/vue-shim.d.ts"]
}
```

```ts
// tests/client/harness/fixtures.ts
import type { ResolvedSynctrolThemeOptions } from '../../../src/shared/options'
import { resolveThemeOptions } from '../../../src/shared/options'

export function fixtureThemeOptions(
  overrides: Partial<Parameters<typeof resolveThemeOptions>[0]> = {},
): ResolvedSynctrolThemeOptions {
  return resolveThemeOptions({
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    copyright: { zh: '© 2026 Synctrol', en: '© 2026 Synctrol' },
    defaultColorMode: 'auto',
    locales: {
      zh: { lang: 'zh-CN', label: '中文' },
      en: { lang: 'en-US', label: 'English' },
    },
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
    },
    socialLinks: {
      items: [
        {
          label: 'GitHub',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
          url: 'https://github.com/synctrol',
        },
      ],
    },
    seo: {
      name: 'Synctrol',
      description: {
        zh: 'Synctrol 音乐团队官方网站',
        en: 'Official website of the Synctrol music team',
      },
      defaultImage: './assets/social-default.webp',
      organization: { name: 'Synctrol', logo: './assets/logo.svg' },
      collections: {
        release: {
          title: { zh: '作品', en: 'Releases' },
          description: { zh: 'Synctrol 作品列表', en: 'Synctrol releases' },
        },
        news: {
          title: { zh: '新闻', en: 'News' },
          description: { zh: 'Synctrol 新闻', en: 'Synctrol news' },
        },
      },
    },
    ...overrides,
  })
}
```

```ts
// tests/client/harness/mount.ts
import { mount, type MountingOptions } from '@vue/test-utils'
import { type Component } from 'vue'
import {
  SYNCTROL_THEME_OPTIONS_KEY,
  SYNCTROL_SHELL_CONTEXT_KEY,
  type SynctrolShellContext,
} from '../../../src/client/composables/keys'
import { fixtureThemeOptions } from './fixtures'

export interface MountShellOptions extends MountingOptions<Record<string, unknown>> {
  locale?: string
  identity?: string
  publicPath?: string
  base?: string
  themeOverrides?: Parameters<typeof fixtureThemeOptions>[0]
  shellContext?: Partial<SynctrolShellContext>
}

export function mountShell(
  component: Component,
  options: MountShellOptions = {},
) {
  const theme = fixtureThemeOptions(options.themeOverrides)
  const locale = options.locale ?? 'zh'
  const shell: SynctrolShellContext = {
    locale,
    identity: options.identity ?? 'home',
    publicPath: options.publicPath ?? `/${locale}/`,
    base: options.base ?? '/',
    drawerOpen: false,
    setDrawerOpen: () => {},
    localeAlternates: [
      { locale: 'zh', label: '中文', href: '/zh/' },
      { locale: 'en', label: 'English', href: '/en/' },
    ],
    ...options.shellContext,
  }

  return mount(component, {
    ...options,
    global: {
      ...options.global,
      provide: {
        [SYNCTROL_THEME_OPTIONS_KEY as symbol]: theme,
        [SYNCTROL_SHELL_CONTEXT_KEY as symbol]: shell,
        ...(options.global?.provide ?? {}),
      },
    },
  })
}
```

Create injection keys early so the harness compiles:

```ts
// src/client/composables/keys.ts
import type { InjectionKey, Ref } from 'vue'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { LocaleKey } from '../../shared/types.js'
import type { PageIdentity } from '../../shared/route-types.js'

export interface LocaleAlternateLink {
  locale: LocaleKey
  label: string
  href: string
}

export interface SynctrolShellContext {
  locale: LocaleKey
  identity: PageIdentity | string
  publicPath: string
  base: string
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  localeAlternates: LocaleAlternateLink[]
}

export const SYNCTROL_THEME_OPTIONS_KEY: InjectionKey<ResolvedSynctrolThemeOptions> =
  Symbol('synctrol-theme-options')

export const SYNCTROL_SHELL_CONTEXT_KEY: InjectionKey<SynctrolShellContext> =
  Symbol('synctrol-shell-context')

export const SYNCTROL_DRAWER_OPEN_KEY: InjectionKey<Ref<boolean>> = Symbol(
  'synctrol-drawer-open',
)
```

- [ ] **Step 4: Run harness smoke test + typecheck**

Run: `npm test -- tests/client/harness/smoke.test.ts`

Expected: PASS

Also confirm production typecheck still green with the shim present:

Run: `npm run test:typecheck`

Expected: PASS

- [ ] **Step 5: Add `copy-client-assets` build step (packaging prerequisite)**

`tsc` does not emit `.vue` / `.css`. Without a copy step, VuePress cannot load Layout from `dist/`, and any accidental SFC re-export from `dist/client/index.js` would break Node smoke. Create the copy script and wire `package.json` **before** Task 3/13 rely on `clientConfigFile` + Layout SFCs in `dist/`.

```js
// scripts/copy-client-assets.mjs
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcClient = join(root, 'src', 'client')
const distClient = join(root, 'dist', 'client')

const COPY_EXTENSIONS = new Set([
  '.vue',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

if (!existsSync(srcClient)) {
  throw new Error(`Missing src/client at ${srcClient}`)
}
mkdirSync(distClient, { recursive: true })

let copied = 0
for (const file of walk(srcClient)) {
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  if (!COPY_EXTENSIONS.has(ext)) continue
  const rel = relative(srcClient, file)
  const dest = join(distClient, rel)
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(file, dest)
  copied += 1
}

console.log(`copy-client-assets: copied ${copied} files into dist/client/`)
```

Update `package.json` scripts (keep existing test scripts; only change `build`):

```json
"build": "tsc -p tsconfig.json && node scripts/copy-client-assets.mjs"
```

Verify packaging still allows Node import of `./client` (asset helpers only; no `.vue` in the barrel). Until Layout SFCs exist, the copy may log `copied 0` if `src/client` has no matching static files yet — that is OK in Task 1. After Task 12/13 add `.vue`/`.css`, rebuild and confirm files appear under `dist/client`.

Run:

```bash
npm run build
node scripts/smoke-built-exports.mjs
```

Expected: PASS (Plan 04 asset helpers still importable from built `vuepress-theme-synctrolling/client`). If `src/client` already has CSS/assets from Plan 01/04, they appear under `dist/client`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tsconfig.json \
  scripts/copy-client-assets.mjs \
  src/vue-shim.d.ts src/shared/locale-storage.ts src/compiler/root-router-html.ts \
  src/client/composables/keys.ts \
  tests/client/harness/mount.ts tests/client/harness/fixtures.ts \
  tests/client/harness/smoke.test.ts
git commit -m "test: add Vue client harness and copy-client-assets build step"
```

---

### Task 2: Message formatter and color-mode pure helpers

**Files:**
- Create: `src/shared/format-message.ts`
- Create: `tests/shared/format-message.test.ts`
- Create: `src/client/color-mode/types.ts`
- Create: `src/client/color-mode/cycle.ts`
- Create: `src/client/color-mode/storage.ts`
- Create: `src/client/color-mode/resolve.ts`
- Create: `tests/client/color-mode/cycle.test.ts`
- Create: `tests/client/color-mode/storage.test.ts`
- Create: `tests/client/color-mode/resolve.test.ts`

**Interfaces:**
- Consumes: `defaultColorMode` from Plan 01; `LocaleMessages` keys `auto|light|dark`
- Produces:
  - `formatMessage(template, vars): string`
  - `ColorModePreference = 'auto' | 'light' | 'dark'`
  - `nextColorMode(current): ColorModePreference`
  - `COLOR_MODE_STORAGE_KEY = 'synctrol:color-mode'`
  - `readColorModePreference(storage, fallback): ColorModePreference`
  - `writeColorModePreference(storage, value): void`
  - `resolveSurfaceColorMode(preference, prefersDark): 'light' | 'dark'`

- [ ] **Step 1: Write failing tests**

```ts
// tests/shared/format-message.test.ts
import { describe, expect, it } from 'vitest'
import { formatMessage } from '../../src/shared/format-message'

describe('formatMessage', () => {
  it('replaces named placeholders', () => {
    expect(
      formatMessage('Theme mode {current}, next {next}', {
        current: 'AUTO',
        next: 'LIGHT',
      }),
    ).toBe('Theme mode AUTO, next LIGHT')
  })

  it('leaves unknown placeholders intact', () => {
    expect(formatMessage('Hello {name}', {})).toBe('Hello {name}')
  })
})
```

```ts
// tests/client/color-mode/cycle.test.ts
import { describe, expect, it } from 'vitest'
import { nextColorMode } from '../../../src/client/color-mode/cycle'

describe('nextColorMode', () => {
  it('cycles AUTO → LIGHT → DARK → AUTO', () => {
    expect(nextColorMode('auto')).toBe('light')
    expect(nextColorMode('light')).toBe('dark')
    expect(nextColorMode('dark')).toBe('auto')
  })
})
```

```ts
// tests/client/color-mode/storage.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  COLOR_MODE_STORAGE_KEY,
  readColorModePreference,
  writeColorModePreference,
} from '../../../src/client/color-mode/storage'

describe('color mode storage', () => {
  const memory = new Map<string, string>()
  const storage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v)
    },
  }

  beforeEach(() => memory.clear())

  it('returns fallback when unset or invalid', () => {
    expect(readColorModePreference(storage, 'auto')).toBe('auto')
    memory.set(COLOR_MODE_STORAGE_KEY, 'nope')
    expect(readColorModePreference(storage, 'dark')).toBe('dark')
  })

  it('persists a valid preference', () => {
    writeColorModePreference(storage, 'light')
    expect(memory.get(COLOR_MODE_STORAGE_KEY)).toBe('light')
    expect(readColorModePreference(storage, 'auto')).toBe('light')
  })
})
```

```ts
// tests/client/color-mode/resolve.test.ts
import { describe, expect, it } from 'vitest'
import { resolveSurfaceColorMode } from '../../../src/client/color-mode/resolve'

describe('resolveSurfaceColorMode', () => {
  it('AUTO follows prefers-color-scheme', () => {
    expect(resolveSurfaceColorMode('auto', true)).toBe('dark')
    expect(resolveSurfaceColorMode('auto', false)).toBe('light')
  })

  it('explicit modes ignore system preference', () => {
    expect(resolveSurfaceColorMode('light', true)).toBe('light')
    expect(resolveSurfaceColorMode('dark', false)).toBe('dark')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/shared/format-message.test.ts \
  tests/client/color-mode/cycle.test.ts \
  tests/client/color-mode/storage.test.ts \
  tests/client/color-mode/resolve.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement helpers**

```ts
// src/shared/format-message.ts
export function formatMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const value = vars[key]
    return value === undefined ? match : String(value)
  })
}
```

```ts
// src/client/color-mode/types.ts
export type ColorModePreference = 'auto' | 'light' | 'dark'
export type SurfaceColorMode = 'light' | 'dark'
```

```ts
// src/client/color-mode/cycle.ts
import type { ColorModePreference } from './types.js'

const ORDER: ColorModePreference[] = ['auto', 'light', 'dark']

export function nextColorMode(
  current: ColorModePreference,
): ColorModePreference {
  const index = ORDER.indexOf(current)
  return ORDER[(index + 1) % ORDER.length]!
}
```

```ts
// src/client/color-mode/storage.ts
import type { ColorModePreference } from './types.js'

export const COLOR_MODE_STORAGE_KEY = 'synctrol:color-mode'

export interface ColorModeStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function isPreference(value: string): value is ColorModePreference {
  return value === 'auto' || value === 'light' || value === 'dark'
}

export function readColorModePreference(
  storage: ColorModeStorageLike,
  fallback: ColorModePreference,
): ColorModePreference {
  const raw = storage.getItem(COLOR_MODE_STORAGE_KEY)
  if (!raw || !isPreference(raw)) return fallback
  return raw
}

export function writeColorModePreference(
  storage: ColorModeStorageLike,
  value: ColorModePreference,
): void {
  storage.setItem(COLOR_MODE_STORAGE_KEY, value)
}
```

```ts
// src/client/color-mode/resolve.ts
import type { ColorModePreference, SurfaceColorMode } from './types.js'

export function resolveSurfaceColorMode(
  preference: ColorModePreference,
  prefersDark: boolean,
): SurfaceColorMode {
  if (preference === 'auto') return prefersDark ? 'dark' : 'light'
  return preference
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- tests/shared/format-message.test.ts \
  tests/client/color-mode/cycle.test.ts \
  tests/client/color-mode/storage.test.ts \
  tests/client/color-mode/resolve.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/format-message.ts src/client/color-mode \
  tests/shared/format-message.test.ts tests/client/color-mode
git commit -m "feat: add color-mode helpers and message formatter"
```

---

### Task 3: Color-mode boot script (FOUC prevention)

**Files:**
- Create: `src/client/color-mode/boot-script.ts`
- Create: `tests/client/color-mode/boot-script.test.ts`
- Modify: `src/compiler/theme.ts` — **PATCH** current Plan 04 `synctrolTheme` (keep `compileAssets`, `frontmatter.synctrol.contentAssets`, content filter, `createPage`, `define`, root-router `onGenerated`)

**Interfaces:**
- Consumes: `COLOR_MODE_STORAGE_KEY`, `defaultColorMode`; existing Plan 04 `synctrolTheme`
- Produces: `buildColorModeBootScript(defaultColorMode: ColorModePreference): string` that sets `document.documentElement.dataset.theme` to `light` or `dark` before paint; theme also sets `clientConfigFile` and injects the boot script into `app.siteData.head` without dropping Plan 04 wiring

- [ ] **Step 1: Write the failing boot-script test**

```ts
// tests/client/color-mode/boot-script.test.ts
import { describe, expect, it } from 'vitest'
import { COLOR_MODE_STORAGE_KEY } from '../../../src/client/color-mode/storage'
import { buildColorModeBootScript } from '../../../src/client/color-mode/boot-script'

describe('buildColorModeBootScript', () => {
  it('embeds the storage key and default preference', () => {
    const script = buildColorModeBootScript('auto')
    expect(script).toContain(COLOR_MODE_STORAGE_KEY)
    expect(script).toContain("'auto'")
    expect(script).toContain('dataset.theme')
    expect(script).toContain('prefers-color-scheme')
  })

  it('uses the configured default when storage is empty', () => {
    const script = buildColorModeBootScript('dark')
    expect(script).toContain("'dark'")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/color-mode/boot-script.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement boot script and PATCH Plan 04 theme.ts**

```ts
// src/client/color-mode/boot-script.ts
import type { ColorModePreference } from './types.js'
import { COLOR_MODE_STORAGE_KEY } from './storage.js'

export function buildColorModeBootScript(
  defaultColorMode: ColorModePreference,
): string {
  const key = JSON.stringify(COLOR_MODE_STORAGE_KEY)
  const fallback = JSON.stringify(defaultColorMode)
  return `(function(){try{var k=${key};var d=${fallback};var v=localStorage.getItem(k);if(v!=='auto'&&v!=='light'&&v!=='dark')v=d;var dark=v==='dark'||(v==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`
}
```

**PATCH only** — do not replace `src/compiler/theme.ts`. Against HEAD Plan 04 theme, apply these additive edits:

```ts
// src/compiler/theme.ts — ADDITIVE PATCH against Plan 04 HEAD
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPage } from 'vuepress/core'
import type { App, Page, ThemeObject } from 'vuepress/core'
import { buildColorModeBootScript } from '../client/color-mode/boot-script.js'
import { toClientThemeOptions } from '../shared/client-options.js'
import type { SynctrolThemeOptions } from '../shared/options.js'
import { resolveThemeOptions } from '../shared/options.js'
import type { CompiledPage } from '../shared/route-types.js'
import type { RouteContentPackage } from '../shared/types.js'
import { compileAssets } from './assets/compile-assets.js'
import { selectAssetPackageSources } from './assets/select-asset-package-sources.js'
import { buildSite, SYNCTROL_CONTENT_DIR, type BuiltSite } from './build-site.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ... keep isContentSourcePage + bodyFor unchanged ...

export function synctrolTheme(options: SynctrolThemeOptions) {
  const resolved = resolveThemeOptions(options)
  const clientOptions = toClientThemeOptions(resolved)
  const boot = buildColorModeBootScript(resolved.defaultColorMode) // ADD
  let built: BuiltSite | undefined

  return {
    name: 'vuepress-theme-synctrolling',
    // ADD — must point at tsc-emitted artifact (VuePress bundler resolves .vue from here)
    clientConfigFile: resolve(__dirname, '../client/config.js'),
    define: {
      __SYNCTROL_THEME_OPTIONS__: clientOptions,
    },
    onInitialized: async (app: App): Promise<void> => {
      app.siteData.head.push(['script', {}, boot]) // ADD (before or after buildSite; must not remove Plan 04 body)

      built = buildSite({ /* unchanged */ })

      const assetSources = selectAssetPackageSources({ /* unchanged */ })
      const assetManifest = compileAssets({ /* unchanged */ })

      app.pages = app.pages.filter((page) => !isContentSourcePage(page))

      const byDir = new Map(built.packages.map((pkg) => [pkg.dir, pkg]))

      for (const compiled of built.site.pages) {
        const contentAssets =
          assetManifest.contentPublicPaths[compiled.identity] ?? {}
        // ADD — LanguageSwitcher targets (encoded publicPath from Plan 03)
        const alternates = built.site.pages
          .filter((p) => p.identity === compiled.identity)
          .map((p) => ({
            locale: p.locale,
            publicPath: p.url.publicPath,
          }))
        const page = await createPage(app, {
          path: decodeURI(compiled.url.routePath),
          content: bodyFor(compiled, byDir),
          frontmatter: {
            lang: resolved.locales[compiled.locale]?.lang ?? compiled.locale,
            title: compiled.title,
            ...(compiled.description === undefined
              ? {}
              : { description: compiled.description }),
            synctrol: {
              identity: compiled.identity,
              locale: compiled.locale,
              contentType: compiled.contentType,
              isFallback: compiled.isFallback,
              isDraft: compiled.isDraft,
              noindex: compiled.noindex,
              bodyLocale: compiled.bodyLocale,
              canonicalLocale: compiled.canonicalLocale,
              contentAssets, // KEEP Plan 04 field
              alternates, // ADD Plan 05 field
            },
          },
        })
        app.pages.push(page)
      }
    },
    onGenerated: (app: App): void => {
      // KEEP Plan 04 / Plan 03 root-router write unchanged
      if (built === undefined) return
      const target = app.dir.dest('index.html')
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, built.site.rootRouterHtml, 'utf8')
    },
  } satisfies ThemeObject
}
```

Forbidden: deleting `compileAssets`, `contentAssets`, content-tree filtering, or root-router `onGenerated`. Forbidden: pasting a Plan-01-style stub factory. Forbidden: `clientConfigFile: …/config.ts` (Node/`dist` consumers need the emitted `.js`). Prefer stdlib `node:path` / `node:url` over `@vuepress/utils` for `__dirname` resolution.

```ts
// src/index.ts — already re-exports from ./compiler/theme.js after Plan 03/04;
// do not switch back to an inline factory or ./node/theme.js.
export { synctrolTheme } from './compiler/theme.js'
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/client/color-mode/boot-script.test.ts tests/smoke.test.ts tests/compiler/theme.integration.test.ts`

Expected: PASS (theme integration still sees `contentAssets`; boot script tests green).

- [ ] **Step 5: Commit**

```bash
git add src/client/color-mode/boot-script.ts src/compiler/theme.ts src/index.ts \
  tests/client/color-mode/boot-script.test.ts
git commit -m "feat: inject color-mode boot script to prevent FOUC"
```

---

### Task 4: `useColorMode` composable and ThemeMode component

**Files:**
- Create: `src/client/composables/useColorMode.ts`
- Create: `src/client/composables/useThemeOptions.ts`
- Create: `src/client/composables/useLocaleShell.ts`
- Create: `src/client/components/ThemeMode.vue`
- Create: `tests/client/components/ThemeMode.test.ts`

**Interfaces:**
- Consumes: cycle/storage/resolve helpers; theme `defaultColorMode`; locale messages
- Produces: ThemeMode button showing only current localized label; cycles on click/Enter/Space; `aria-live` announcement with current+next

- [ ] **Step 1: Write the failing ThemeMode test**

```ts
// tests/client/components/ThemeMode.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import ThemeMode from '../../../src/client/components/ThemeMode.vue'
import { COLOR_MODE_STORAGE_KEY } from '../../../src/client/color-mode/storage'
import { mountShell } from '../harness/mount'

describe('ThemeMode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'light'
  })

  it('shows the localized AUTO label by default', () => {
    const wrapper = mountShell(ThemeMode, { locale: 'en' })
    expect(wrapper.get('button').text()).toBe('AUTO')
  })

  it('cycles AUTO → LIGHT → DARK → AUTO and persists', async () => {
    const wrapper = mountShell(ThemeMode, { locale: 'en' })
    const button = wrapper.get('button')

    await button.trigger('click')
    expect(button.text()).toBe('LIGHT')
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    await button.trigger('click')
    expect(button.text()).toBe('DARK')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await button.trigger('click')
    expect(button.text()).toBe('AUTO')
  })

  it('respects defaultColorMode when storage is empty', () => {
    const wrapper = mountShell(ThemeMode, {
      locale: 'en',
      themeOverrides: { defaultColorMode: 'dark' },
    })
    expect(wrapper.get('button').text()).toBe('DARK')
  })

  it('announces current and next mode for assistive tech', () => {
    const wrapper = mountShell(ThemeMode, { locale: 'en' })
    const live = wrapper.get('[aria-live="polite"]')
    expect(live.text()).toContain('AUTO')
    expect(live.text()).toContain('LIGHT')
  })

  it('cycles with Enter and Space', async () => {
    const wrapper = mountShell(ThemeMode, { locale: 'en' })
    const button = wrapper.get('button')
    await button.trigger('keydown', { key: 'Enter' })
    expect(button.text()).toBe('LIGHT')
    await button.trigger('keydown', { key: ' ' })
    expect(button.text()).toBe('DARK')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/components/ThemeMode.test.ts`

Expected: FAIL because ThemeMode / composables are missing.

- [ ] **Step 3: Implement composables and ThemeMode**

```ts
// src/client/composables/useThemeOptions.ts
import { inject } from 'vue'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import { SYNCTROL_THEME_OPTIONS_KEY } from './keys.js'

declare const __SYNCTROL_THEME_OPTIONS__: ResolvedSynctrolThemeOptions

export function useThemeOptions(): ResolvedSynctrolThemeOptions {
  return (
    inject(SYNCTROL_THEME_OPTIONS_KEY, null) ?? __SYNCTROL_THEME_OPTIONS__
  )
}
```

```ts
// src/client/composables/useLocaleShell.ts
import { computed, inject } from 'vue'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import { SYNCTROL_SHELL_CONTEXT_KEY } from './keys.js'
import { useThemeOptions } from './useThemeOptions.js'

export function useLocaleShell() {
  const theme = useThemeOptions()
  const shell = inject(SYNCTROL_SHELL_CONTEXT_KEY)!
  const locale = computed(() => shell.locale)
  const messages = computed(() => theme.locales[shell.locale]!.messages)
  const localeLabel = computed(() => theme.locales[shell.locale]!.label)
  const copyright = computed(() => {
    const resolved = resolveMultilanguage(
      theme.copyright,
      shell.locale,
      theme.mainLocale,
    )
    return resolved
  })
  return { theme, shell, locale, messages, localeLabel, copyright }
}
```

```ts
// src/client/composables/useColorMode.ts
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { nextColorMode } from '../color-mode/cycle.js'
import { resolveSurfaceColorMode } from '../color-mode/resolve.js'
import {
  readColorModePreference,
  writeColorModePreference,
} from '../color-mode/storage.js'
import type { ColorModePreference } from '../color-mode/types.js'
import { useThemeOptions } from './useThemeOptions.js'

function getPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDataset(surface: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = surface
}

export function useColorMode() {
  const theme = useThemeOptions()
  const preference = ref<ColorModePreference>(theme.defaultColorMode)
  const prefersDark = ref(false)

  const surface = computed(() =>
    resolveSurfaceColorMode(preference.value, prefersDark.value),
  )

  function syncFromStorage(): void {
    preference.value = readColorModePreference(
      window.localStorage,
      theme.defaultColorMode,
    )
  }

  function cycle(): void {
    preference.value = nextColorMode(preference.value)
    writeColorModePreference(window.localStorage, preference.value)
  }

  let media: MediaQueryList | undefined
  let onChange: (() => void) | undefined

  onMounted(() => {
    syncFromStorage()
    prefersDark.value = getPrefersDark()
    applyDataset(surface.value)
    media = window.matchMedia('(prefers-color-scheme: dark)')
    onChange = () => {
      prefersDark.value = media!.matches
    }
    media.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    if (media && onChange) media.removeEventListener('change', onChange)
  })

  watch(surface, (value) => applyDataset(value), { flush: 'sync' })

  return { preference, surface, cycle }
}
```

```vue
<!-- src/client/components/ThemeMode.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { nextColorMode } from '../color-mode/cycle.js'
import type { ColorModePreference } from '../color-mode/types.js'
import { formatMessage } from '../../shared/format-message.js'
import { useColorMode } from '../composables/useColorMode.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'

const { preference, cycle } = useColorMode()
const { messages } = useLocaleShell()

const labelMap = computed<Record<ColorModePreference, string>>(() => ({
  auto: messages.value.auto,
  light: messages.value.light,
  dark: messages.value.dark,
}))

const visibleLabel = computed(() => labelMap.value[preference.value])
const nextLabel = computed(() => labelMap.value[nextColorMode(preference.value)])
const announcement = computed(() =>
  formatMessage(messages.value.themeModeAnnouncement, {
    current: visibleLabel.value,
    next: nextLabel.value,
  }),
)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    cycle()
  }
}
</script>

<template>
  <div class="syn-theme-mode">
    <button
      type="button"
      class="syn-theme-mode__button"
      :aria-label="announcement"
      @click="cycle"
      @keydown="onKeydown"
    >
      {{ visibleLabel }}
    </button>
    <span class="syn-visually-hidden" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
```

- [ ] **Step 4: Run ThemeMode tests**

Run: `npm test -- tests/client/components/ThemeMode.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/composables/useColorMode.ts \
  src/client/composables/useThemeOptions.ts \
  src/client/composables/useLocaleShell.ts \
  src/client/components/ThemeMode.vue \
  tests/client/components/ThemeMode.test.ts
git commit -m "feat: add ThemeMode control with persisted cycle"
```

---

### Task 5: Navigation href resolution

**Files:**
- Create: `src/shared/encode-path-segment.ts` (**prerequisite** — extract Plan 03 pure encoder)
- Modify: `src/compiler/path-suffix.ts` — import `encodePathSegment` from shared (keep `encodeRouteSegment` API)
- Create: `src/client/navigation/is-external-href.ts`
- Create: `src/client/navigation/resolve-nav-href.ts`
- Create: `tests/client/navigation/resolve-nav-href.test.ts`

**Interfaces:**
- Consumes: `Multilanguage` href via `resolveMultilanguage`; VuePress `base`; active `locale`; shared `encodePathSegment` + `joinPublicPath`/`normalizeBase` from `route-path.js`
- Produces:
  - `isExternalHref(href: string): boolean`
  - `resolveNavHref({ href, locale, base, mainLocale }): { href: string; external: boolean }`
  - Throws on `./` or `../` paths
  - Internal hrefs prefix **encoded** locale segment (no raw CJK)

- [ ] **Step 0: Extract `encodePathSegment` to shared (client-safe)**

Move the pure RFC3986 encoder from `src/compiler/path-suffix.ts` into shared so Navigation can encode locale segments without importing compiler:

```ts
// src/shared/encode-path-segment.ts
/** `encodeURIComponent` leaves these five unescaped; RFC 3986 does not. */
const RFC3986_EXTRA = /[!'()*]/g

/** Strict RFC 3986 percent-encoding for a single path segment (slug, tag, or locale). */
export function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(
    RFC3986_EXTRA,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}
```

```ts
// src/compiler/path-suffix.ts — re-export / import from shared
import { encodePathSegment } from '../shared/encode-path-segment.js'
export { encodePathSegment }
// delete local RFC3986_EXTRA + encodePathSegment body; keep encodeRouteSegment
```

Run: `npm test -- tests/compiler/path-suffix.test.ts` (or equivalent path-suffix coverage)

Expected: PASS

- [ ] **Step 1: Write failing tests**

```ts
// tests/client/navigation/resolve-nav-href.test.ts
import { describe, expect, it } from 'vitest'
import { isExternalHref } from '../../../src/client/navigation/is-external-href'
import { resolveNavHref } from '../../../src/client/navigation/resolve-nav-href'
import { encodePathSegment } from '../../../src/shared/encode-path-segment'

describe('isExternalHref', () => {
  it('detects absolute http(s) URLs', () => {
    expect(isExternalHref('https://github.com/synctrol')).toBe(true)
    expect(isExternalHref('http://example.com')).toBe(true)
    expect(isExternalHref('/releases/')).toBe(false)
  })
})

describe('resolveNavHref', () => {
  it('prefixes base + encoded locale for internal leading-slash paths', () => {
    expect(
      resolveNavHref({
        href: '/releases/',
        locale: 'zh',
        base: '/',
        mainLocale: 'zh',
      }),
    ).toEqual({ href: '/zh/releases/', external: false })

    expect(
      resolveNavHref({
        href: '/releases/',
        locale: 'en',
        base: '/docs/',
        mainLocale: 'zh',
      }),
    ).toEqual({ href: '/docs/en/releases/', external: false })
  })

  it('encodes non-ASCII locale segments (no raw CJK in href)', () => {
    const locale = '日本語'
    const encoded = encodePathSegment(locale)
    expect(
      resolveNavHref({
        href: '/releases/',
        locale,
        base: '/',
        mainLocale: 'zh',
      }),
    ).toEqual({ href: `/${encoded}/releases/`, external: false })
    expect(
      resolveNavHref({
        href: '/releases/',
        locale,
        base: '/',
        mainLocale: 'zh',
      }).href,
    ).not.toContain('日本語')
  })

  it('resolves Multilanguage href maps', () => {
    expect(
      resolveNavHref({
        href: { zh: '/releases/', en: '/works/' },
        locale: 'en',
        base: '/',
        mainLocale: 'zh',
      }),
    ).toEqual({ href: '/en/works/', external: false })
  })

  it('passes through external URLs unchanged', () => {
    expect(
      resolveNavHref({
        href: 'https://github.com/synctrol',
        locale: 'zh',
        base: '/',
        mainLocale: 'zh',
      }),
    ).toEqual({ href: 'https://github.com/synctrol', external: true })
  })

  it('rejects relative ./ and ../ navigation paths', () => {
    expect(() =>
      resolveNavHref({
        href: './releases/',
        locale: 'zh',
        base: '/',
        mainLocale: 'zh',
      }),
    ).toThrow(/\.\//)

    expect(() =>
      resolveNavHref({
        href: '../x/',
        locale: 'zh',
        base: '/',
        mainLocale: 'zh',
      }),
    ).toThrow(/\.\./)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/client/navigation/resolve-nav-href.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement resolution**

```ts
// src/client/navigation/is-external-href.ts
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href)
}
```

```ts
// src/client/navigation/resolve-nav-href.ts
import { encodePathSegment } from '../../shared/encode-path-segment.js'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'
import type { LocaleKey, Multilanguage } from '../../shared/types.js'
import { isExternalHref } from './is-external-href.js'

export interface ResolveNavHrefInput {
  href: Multilanguage
  locale: LocaleKey
  base: string
  mainLocale: LocaleKey
}

export interface ResolvedNavHref {
  href: string
  external: boolean
}

export function resolveNavHref(input: ResolveNavHrefInput): ResolvedNavHref {
  const { text } = resolveMultilanguage(
    input.href,
    input.locale,
    input.mainLocale,
  )

  if (text.startsWith('./') || text.startsWith('../') || text.includes('/../') || text.includes('/./')) {
    throw new Error(`Invalid navigation href (relative segments forbidden): ${text}`)
  }

  if (isExternalHref(text)) {
    return { href: text, external: true }
  }

  if (!text.startsWith('/')) {
    throw new Error(`Invalid navigation href (must be leading-slash or absolute URL): ${text}`)
  }

  const encodedLocale = encodePathSegment(input.locale)
  const routePath = `/${encodedLocale}${text}`.replace(/\/{2,}/g, '/')
  const normalized =
    text.endsWith('/') && !routePath.endsWith('/') ? `${routePath}/` : routePath

  return {
    href: joinPublicPath(normalizeBase(input.base), normalized),
    external: false,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/client/navigation/resolve-nav-href.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/encode-path-segment.ts src/compiler/path-suffix.ts \
  src/client/navigation tests/client/navigation
git commit -m "feat: resolve navigation hrefs with locale and base"
```

---

### Task 6: Navigation component

**Files:**
- Create: `src/client/components/Navigation.vue`
- Create: `tests/client/components/Navigation.test.ts`

**Interfaces:**
- Consumes: `theme.navigation.items`, `externalTarget`, `resolveNavHref`, `resolveMultilanguage` for labels
- Produces: ordered `<nav>` list; external links use `externalTarget` plus safe `rel="noopener noreferrer"` when `_blank`

- [ ] **Step 1: Write failing Navigation tests**

```ts
// tests/client/components/Navigation.test.ts
import { describe, expect, it } from 'vitest'
import Navigation from '../../../src/client/components/Navigation.vue'
import { mountShell } from '../harness/mount'

describe('Navigation', () => {
  it('renders items in configuration order with localized labels', () => {
    const wrapper = mountShell(Navigation, { locale: 'en' })
    const links = wrapper.findAll('a')
    expect(links).toHaveLength(2)
    expect(links[0]!.text()).toBe('Releases')
    expect(links[0]!.attributes('href')).toBe('/en/releases/')
    expect(links[1]!.text()).toBe('GitHub')
    expect(links[1]!.attributes('href')).toBe('https://github.com/synctrol')
  })

  it('applies externalTarget and safe rel on external links', () => {
    const wrapper = mountShell(Navigation, {
      locale: 'zh',
      themeOverrides: {
        navigation: {
          externalTarget: '_blank',
          items: [
            { label: 'GitHub', href: 'https://github.com/synctrol' },
          ],
        },
      },
    })
    const link = wrapper.get('a')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('uses _self without forcing rel when configured', () => {
    const wrapper = mountShell(Navigation, {
      locale: 'zh',
      themeOverrides: {
        navigation: {
          externalTarget: '_self',
          items: [
            { label: 'GitHub', href: 'https://github.com/synctrol' },
          ],
        },
      },
    })
    const link = wrapper.get('a')
    expect(link.attributes('target')).toBe('_self')
    expect(link.attributes('rel')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/components/Navigation.test.ts`

Expected: FAIL because Navigation.vue is missing.

- [ ] **Step 3: Implement Navigation.vue**

```vue
<!-- src/client/components/Navigation.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import { resolveNavHref } from '../navigation/resolve-nav-href.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'

const { theme, shell, locale } = useLocaleShell()

const items = computed(() =>
  theme.navigation.items.map((item) => {
    const label = resolveMultilanguage(
      item.label,
      locale.value,
      theme.mainLocale,
    )
    const resolved = resolveNavHref({
      href: item.href,
      locale: locale.value,
      base: shell.base,
      mainLocale: theme.mainLocale,
    })
    const target = resolved.external
      ? theme.navigation.externalTarget
      : undefined
    const rel =
      resolved.external && theme.navigation.externalTarget === '_blank'
        ? 'noopener noreferrer'
        : undefined
    return {
      label: label.text,
      labelLang: label.fellBack ? label.locale : undefined,
      href: resolved.href,
      external: resolved.external,
      target,
      rel,
    }
  }),
)
</script>

<template>
  <nav class="syn-navigation" aria-label="Navigation">
    <ul class="syn-navigation__list">
      <li v-for="(item, index) in items" :key="index" class="syn-navigation__item">
        <a
          class="syn-navigation__link"
          :href="item.href"
          :target="item.target"
          :rel="item.rel"
          :lang="item.labelLang"
        >
          {{ item.label }}
        </a>
      </li>
    </ul>
  </nav>
</template>
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/client/components/Navigation.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/Navigation.vue tests/client/components/Navigation.test.ts
git commit -m "feat: add Navigation component with externalTarget"
```

---

### Task 7: Focus trap utility and NavDrawer

**Files:**
- Create: `src/client/a11y/focus-trap.ts`
- Create: `tests/client/a11y/focus-trap.test.ts`
- Create: `src/client/components/NavDrawer.vue`
- Create: `tests/client/components/NavDrawer.test.ts`

**Interfaces:**
- Consumes: Navigation component; `messages.menu` / `messages.close`
- Produces: `createFocusTrap(container): { activate, deactivate }`; drawer traps focus while open; Escape closes; restores focus to opener; only Navigation enters the drawer (not Main/Footer)

- [ ] **Step 1: Write failing focus-trap and drawer tests**

```ts
// tests/client/a11y/focus-trap.test.ts
import { describe, expect, it } from 'vitest'
import { createFocusTrap } from '../../../src/client/a11y/focus-trap'

describe('createFocusTrap', () => {
  it('cycles Tab within the container and restores focus on deactivate', () => {
    document.body.innerHTML = `
      <button id="opener">open</button>
      <div id="panel">
        <button id="a">A</button>
        <button id="b">B</button>
      </div>
    `
    const opener = document.getElementById('opener') as HTMLButtonElement
    const panel = document.getElementById('panel') as HTMLElement
    opener.focus()

    const trap = createFocusTrap(panel, { restoreFocus: opener })
    trap.activate()
    expect(document.activeElement?.id).toBe('a')

    const b = document.getElementById('b') as HTMLButtonElement
    b.focus()
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    )
    expect(document.activeElement?.id).toBe('a')

    trap.deactivate()
    expect(document.activeElement?.id).toBe('opener')
  })
})
```

```ts
// tests/client/components/NavDrawer.test.ts
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import NavDrawer from '../../../src/client/components/NavDrawer.vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { mountShell } from '../harness/mount'

describe('NavDrawer', () => {
  it('renders Navigation only when open and closes on Escape', async () => {
    const drawerOpen = ref(true)
    const wrapper = mountShell(NavDrawer, {
      locale: 'en',
      global: {
        provide: {
          [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen,
        },
      },
    })

    expect(wrapper.find('.syn-navigation').exists()).toBe(true)
    expect(wrapper.find('.syn-site-footer').exists()).toBe(false)
    expect(wrapper.find('.syn-main').exists()).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(drawerOpen.value).toBe(false)
  })

  it('exposes dialog semantics while open', () => {
    const drawerOpen = ref(true)
    const wrapper = mountShell(NavDrawer, {
      locale: 'en',
      global: {
        provide: {
          [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen,
        },
      },
    })
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/client/a11y/focus-trap.test.ts \
  tests/client/components/NavDrawer.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement focus trap and NavDrawer**

```ts
// src/client/a11y/focus-trap.ts
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

export interface FocusTrap {
  activate(): void
  deactivate(): void
}

export function createFocusTrap(
  container: HTMLElement,
  options: { restoreFocus?: HTMLElement | null } = {},
): FocusTrap {
  let active = false

  function focusables(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
    )
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!active || event.key !== 'Tab') return
    const items = focusables()
    if (items.length === 0) {
      event.preventDefault()
      return
    }
    const first = items[0]!
    const last = items[items.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return {
    activate() {
      if (active) return
      active = true
      container.addEventListener('keydown', onKeydown)
      const items = focusables()
      items[0]?.focus()
    },
    deactivate() {
      if (!active) return
      active = false
      container.removeEventListener('keydown', onKeydown)
      options.restoreFocus?.focus()
    },
  }
}
```

```vue
<!-- src/client/components/NavDrawer.vue -->
<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { createFocusTrap, type FocusTrap } from '../a11y/focus-trap.js'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../composables/keys.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import Navigation from './Navigation.vue'

const drawerOpen = inject(SYNCTROL_DRAWER_OPEN_KEY) as Ref<boolean>
const { messages } = useLocaleShell()
const panelRef = ref<HTMLElement | null>(null)
let trap: FocusTrap | null = null
let opener: HTMLElement | null = null

function close(): void {
  drawerOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && drawerOpen.value) {
    event.preventDefault()
    close()
  }
}

watch(drawerOpen, async (open) => {
  if (open) {
    opener = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => {
      if (!panelRef.value) return
      trap = createFocusTrap(panelRef.value, { restoreFocus: opener })
      trap.activate()
    })
  } else {
    trap?.deactivate()
    trap = null
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  trap?.deactivate()
})
</script>

<template>
  <div
    class="syn-nav-drawer"
    role="dialog"
    aria-modal="true"
    :aria-label="messages.menu"
    :aria-hidden="drawerOpen ? 'false' : 'true'"
  >
    <button
      type="button"
      class="syn-nav-drawer__close"
      @click="close"
    >
      {{ messages.close }}
    </button>
    <div ref="panelRef" class="syn-nav-drawer__panel">
      <Navigation />
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/client/a11y/focus-trap.test.ts \
  tests/client/components/NavDrawer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/a11y/focus-trap.ts src/client/components/NavDrawer.vue \
  tests/client/a11y/focus-trap.test.ts tests/client/components/NavDrawer.test.ts
git commit -m "feat: add NavDrawer with focus trap and Escape"
```

---

### Task 8: HeaderBar (copyright, ThemeMode, hamburger)

**Files:**
- Create: `src/client/components/HeaderBar.vue`
- Create: `tests/client/components/HeaderBar.test.ts`

**Interfaces:**
- Consumes: copyright multilanguage; ThemeMode; drawer open ref; `messages.menu`
- Produces: Header with copyright + ThemeMode always; hamburger button only for mobile CSS class hook (`syn-header__menu` present in DOM, shown via CSS ≤768px)

- [ ] **Step 1: Write failing HeaderBar tests**

```ts
// tests/client/components/HeaderBar.test.ts
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import HeaderBar from '../../../src/client/components/HeaderBar.vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { mountShell } from '../harness/mount'

describe('HeaderBar', () => {
  it('renders localized copyright and ThemeMode', () => {
    const drawerOpen = ref(false)
    const wrapper = mountShell(HeaderBar, {
      locale: 'zh',
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
    })
    expect(wrapper.text()).toContain('© 2026 Synctrol')
    expect(wrapper.find('.syn-theme-mode').exists()).toBe(true)
  })

  it('toggles the drawer via the hamburger button', async () => {
    const drawerOpen = ref(false)
    const wrapper = mountShell(HeaderBar, {
      locale: 'en',
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
    })
    const menu = wrapper.get('.syn-header__menu')
    expect(menu.text()).toBe('MENU')
    await menu.trigger('click')
    expect(drawerOpen.value).toBe(true)
    expect(menu.attributes('aria-expanded')).toBe('true')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/components/HeaderBar.test.ts`

Expected: FAIL because HeaderBar.vue is missing.

- [ ] **Step 3: Implement HeaderBar**

```vue
<!-- src/client/components/HeaderBar.vue -->
<script setup lang="ts">
import { inject, type Ref } from 'vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../composables/keys.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import ThemeMode from './ThemeMode.vue'

const drawerOpen = inject(SYNCTROL_DRAWER_OPEN_KEY) as Ref<boolean>
const { copyright, messages } = useLocaleShell()

function toggleMenu(): void {
  drawerOpen.value = !drawerOpen.value
}
</script>

<template>
  <header class="syn-header">
    <p
      class="syn-header__copyright"
      :lang="copyright.fellBack ? copyright.locale : undefined"
    >
      {{ copyright.text }}
    </p>
    <div class="syn-header__controls">
      <ThemeMode />
      <button
        type="button"
        class="syn-header__menu"
        :aria-expanded="drawerOpen ? 'true' : 'false'"
        :aria-label="messages.menu"
        @click="toggleMenu"
      >
        {{ messages.menu }}
      </button>
    </div>
  </header>
</template>
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/client/components/HeaderBar.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/HeaderBar.vue tests/client/components/HeaderBar.test.ts
git commit -m "feat: add HeaderBar with copyright ThemeMode and menu"
```

---

### Task 9: SocialLinks component

**Files:**
- Create: `src/client/components/SocialLinks.vue`
- Create: `tests/client/components/SocialLinks.test.ts`

**Interfaces:**
- Consumes: `theme.socialLinks.items` only (no `iconSize`); Plan 05 acceptance uses root-absolute, remote `http(s):`, or data-URI icon stubs (hashed `globalPublicPaths` client injection is out of scope)
- Produces: fixed bottom-left icon `<a>` buttons; `aria-label` from label; decorative icons `aria-hidden="true"`; always `target="_blank"` + `rel="noopener noreferrer"`

- [ ] **Step 1: Write failing SocialLinks tests**

```ts
// tests/client/components/SocialLinks.test.ts
import { describe, expect, it } from 'vitest'
import SocialLinks from '../../../src/client/components/SocialLinks.vue'
import { mountShell } from '../harness/mount'

describe('SocialLinks', () => {
  it('renders icon-only links with accessible labels', () => {
    const wrapper = mountShell(SocialLinks, { locale: 'en' })
    const link = wrapper.get('a')
    expect(link.attributes('aria-label')).toBe('GitHub')
    expect(link.attributes('href')).toBe('https://github.com/synctrol')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(wrapper.get('img').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('img').attributes('alt')).toBe('')
  })

  it('does not expose an iconSize configuration surface', async () => {
    const mod = await import('../../../src/shared/options')
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync('src/shared/options.ts', 'utf8'),
    )
    expect(source).not.toMatch(/iconSize/)
    expect(mod).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/components/SocialLinks.test.ts`

Expected: FAIL because SocialLinks.vue is missing.

- [ ] **Step 3: Implement SocialLinks**

```vue
<!-- src/client/components/SocialLinks.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'

const { theme, locale } = useLocaleShell()

const items = computed(() =>
  theme.socialLinks.items.map((item) => {
    const label = resolveMultilanguage(
      item.label,
      locale.value,
      theme.mainLocale,
    )
    return {
      href: item.url,
      icon: item.icon,
      label: label.text,
      labelLang: label.fellBack ? label.locale : undefined,
    }
  }),
)
</script>

<template>
  <ul class="syn-social-links" aria-label="Social links">
    <li v-for="(item, index) in items" :key="index" class="syn-social-links__item">
      <a
        class="syn-social-links__link"
        :href="item.href"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="item.label"
        :lang="item.labelLang"
      >
        <img
          class="syn-social-links__icon"
          :src="item.icon"
          alt=""
          aria-hidden="true"
          width="40"
          height="40"
        />
      </a>
    </li>
  </ul>
</template>
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/client/components/SocialLinks.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/SocialLinks.vue tests/client/components/SocialLinks.test.ts
git commit -m "feat: add SocialLinks fixed dock control"
```

---

### Task 10: Locale alternates helper and LanguageSwitcher

**Files:**
- Create: `src/client/i18n/locale-alternates.ts`
- Create: `tests/client/i18n/locale-alternates.test.ts`
- Create: `src/client/components/LanguageSwitcher.vue`
- Create: `tests/client/components/LanguageSwitcher.test.ts`

**Interfaces:**
- Consumes: `PageIdentity`, locale labels, compiled/encoded `publicPath`s; `LOCALE_STORAGE_KEY` from `src/shared/locale-storage.js` (Task 1 prerequisite)
- Produces:
  - `buildLocaleAlternates({ locales, identity, pages }): LocaleAlternateLink[]`
  - Collapsible upward switcher showing full current locale label
  - Escape / outside click / selection close; keyboard listbox pattern; focus restore; persists via `LOCALE_STORAGE_KEY`
  - `persistLocalePreference` writes the shared key (does **not** redeclare it)

**Plan 03 publicPath contract:** alternate `href` values must come from compiled `url.publicPath` / `frontmatter.synctrol.alternates` (locale segment already encodeRouteSegment'd). Do not build home hrefs by concatenating a raw LocaleKey into `` `/${key}/` ``.

- [ ] **Step 1: Write failing tests**

```ts
// tests/client/i18n/locale-alternates.test.ts
import { describe, expect, it } from 'vitest'
import { buildLocaleAlternates } from '../../../src/client/i18n/locale-alternates'

describe('buildLocaleAlternates', () => {
  it('maps the same identity to each locale publicPath with full labels', () => {
    const links = buildLocaleAlternates({
      identity: 'release:first-release',
      localeOptions: {
        zh: { label: '中文' },
        en: { label: 'English' },
      },
      pages: [
        {
          identity: 'release:first-release',
          locale: 'zh',
          publicPath: '/zh/releases/first-release/',
        },
        {
          identity: 'release:first-release',
          locale: 'en',
          publicPath: '/en/releases/first-release/',
        },
      ],
    })
    expect(links).toEqual([
      { locale: 'zh', label: '中文', href: '/zh/releases/first-release/' },
      { locale: 'en', label: 'English', href: '/en/releases/first-release/' },
    ])
  })

  it('includes generated collection identities', () => {
    const links = buildLocaleAlternates({
      identity: 'news-tag:release',
      localeOptions: {
        zh: { label: '中文' },
        en: { label: 'English' },
      },
      pages: [
        {
          identity: 'news-tag:release',
          locale: 'zh',
          publicPath: '/zh/news/tags/release/',
        },
        {
          identity: 'news-tag:release',
          locale: 'en',
          publicPath: '/en/news/tags/release/',
        },
      ],
    })
    expect(links.map((l) => l.href)).toEqual([
      '/zh/news/tags/release/',
      '/en/news/tags/release/',
    ])
  })
})
```

```ts
// tests/client/components/LanguageSwitcher.test.ts
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LanguageSwitcher from '../../../src/client/components/LanguageSwitcher.vue'
import { LOCALE_STORAGE_KEY } from '../../../src/shared/locale-storage'
import { mountShell } from '../harness/mount'

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the full current locale label when collapsed', () => {
    const wrapper = mountShell(LanguageSwitcher, { locale: 'zh' })
    expect(wrapper.get('button.syn-language__toggle').text()).toBe('中文')
  })

  it('expands upward, navigates, persists preference, and closes', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })

    const wrapper = mountShell(LanguageSwitcher, {
      locale: 'zh',
      shellContext: {
        localeAlternates: [
          { locale: 'zh', label: '中文', href: '/zh/' },
          { locale: 'en', label: 'English', href: '/en/' },
        ],
      },
    })

    await wrapper.get('button.syn-language__toggle').trigger('click')
    expect(wrapper.find('.syn-language__list').classes()).toContain(
      'syn-language__list--open',
    )
    const en = wrapper.get('a[href="/en/"]')
    expect(en.text()).toBe('English')

    await en.trigger('click')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(assign).toHaveBeenCalledWith('/en/')
  })

  it('closes on Escape and outside click', async () => {
    const wrapper = mountShell(LanguageSwitcher, { locale: 'en' })
    await wrapper.get('button.syn-language__toggle').trigger('click')
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(false)

    await wrapper.get('button.syn-language__toggle').trigger('click')
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/client/i18n/locale-alternates.test.ts \
  tests/client/components/LanguageSwitcher.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement alternates helper and LanguageSwitcher**

```ts
// src/client/i18n/locale-alternates.ts
import { LOCALE_STORAGE_KEY } from '../../shared/locale-storage.js'
import type { LocaleKey } from '../../shared/types.js'
import type { LocaleAlternateLink } from '../composables/keys.js'

export interface AlternatePageRef {
  identity: string
  locale: LocaleKey
  publicPath: string
}

export function buildLocaleAlternates(input: {
  identity: string
  localeOptions: Record<string, { label: string }>
  pages: AlternatePageRef[]
}): LocaleAlternateLink[] {
  const links: LocaleAlternateLink[] = []
  for (const [locale, option] of Object.entries(input.localeOptions)) {
    const page = input.pages.find(
      (p) => p.identity === input.identity && p.locale === locale,
    )
    if (!page) continue
    links.push({
      locale,
      label: option.label,
      href: page.publicPath,
    })
  }
  return links
}

export function persistLocalePreference(
  storage: { setItem(key: string, value: string): void },
  locale: LocaleKey,
): void {
  storage.setItem(LOCALE_STORAGE_KEY, locale)
}
```

Note: Do **not** redeclare `LOCALE_STORAGE_KEY` here — import from shared (Task 1 prerequisite). Value must remain `synctrol:locale`.

```vue
<!-- src/client/components/LanguageSwitcher.vue -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { persistLocalePreference } from '../i18n/locale-alternates.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'

const { messages, localeLabel, shell, locale } = useLocaleShell()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const toggleRef = ref<HTMLButtonElement | null>(null)

const alternates = computed(() => shell.localeAlternates)

function close(): void {
  if (!open.value) return
  open.value = false
  toggleRef.value?.focus()
}

function toggle(): void {
  open.value = !open.value
}

function select(href: string, targetLocale: string, event: Event): void {
  event.preventDefault()
  persistLocalePreference(window.localStorage, targetLocale)
  open.value = false
  window.location.assign(href)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

function onPointerDown(event: MouseEvent): void {
  if (!open.value || !rootRef.value) return
  if (!rootRef.value.contains(event.target as Node)) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('mousedown', onPointerDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousedown', onPointerDown)
})
</script>

<template>
  <div ref="rootRef" class="syn-language">
    <button
      ref="toggleRef"
      type="button"
      class="syn-language__toggle"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="messages.language"
      @click="toggle"
    >
      {{ localeLabel }}
    </button>
    <ul
      class="syn-language__list"
      :class="{ 'syn-language__list--open': open }"
      role="listbox"
      :aria-hidden="open ? 'false' : 'true'"
    >
      <li v-for="item in alternates" :key="item.locale" role="option">
        <a
          class="syn-language__option"
          :href="item.href"
          :aria-current="item.locale === locale ? 'page' : undefined"
          @click="select(item.href, item.locale, $event)"
        >
          {{ item.label }}
        </a>
      </li>
    </ul>
  </div>
</template>
```


- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/client/i18n/locale-alternates.test.ts \
  tests/client/components/LanguageSwitcher.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/i18n/locale-alternates.ts \
  src/client/components/LanguageSwitcher.vue \
  tests/client/i18n/locale-alternates.test.ts \
  tests/client/components/LanguageSwitcher.test.ts
git commit -m "feat: add LanguageSwitcher with upward collapse and locale persistence"
```

---

### Task 11: SiteFooter stub

**Files:**
- Create: `src/client/components/SiteFooter.vue`
- Create: `tests/client/components/SiteFooter.test.ts`

**Interfaces:**
- Consumes: optional default slot for future `home-footer` formatter (Home plan)
- Produces: reserved Footer region; empty by default; no copyright, construction notice, or social links

- [ ] **Step 1: Write failing Footer test**

```ts
// tests/client/components/SiteFooter.test.ts
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import SiteFooter from '../../../src/client/components/SiteFooter.vue'
import { mountShell } from '../harness/mount'

describe('SiteFooter', () => {
  it('renders an empty reserved region by default', () => {
    const wrapper = mountShell(SiteFooter)
    expect(wrapper.get('footer.syn-site-footer').text().trim()).toBe('')
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('projects slot content for a future home-footer formatter', () => {
    const wrapper = mountShell(SiteFooter, {
      slots: {
        default: () => h('p', 'Home footer stub'),
      },
    })
    expect(wrapper.text()).toContain('Home footer stub')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/components/SiteFooter.test.ts`

Expected: FAIL because SiteFooter.vue is missing.

- [ ] **Step 3: Implement SiteFooter**

```vue
<!-- src/client/components/SiteFooter.vue -->
<template>
  <footer class="syn-site-footer">
    <slot />
  </footer>
</template>
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/client/components/SiteFooter.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/SiteFooter.vue tests/client/components/SiteFooter.test.ts
git commit -m "feat: reserve SiteFooter region for home-footer later"
```

---

### Task 12: Shell CSS grid, dock tokens, and ShellLayout

**Files:**
- Create: `src/client/styles/shell.css`
- Modify: `src/client/styles/index.ts`
- Create: `src/client/components/ShellLayout.vue`
- Create: `tests/client/shell/shell-layout.test.ts`
- Create: `tests/client/styles/shell-css.test.ts`

**Interfaces:**
- Consumes: Plan 01 dock tokens; HeaderBar, Navigation, SiteFooter, SocialLinks, LanguageSwitcher, NavDrawer
- Produces: desktop grid areas `header/main/navigation/footer/dock`; columns `minmax(0,1.618fr) / minmax(280px,1fr)`; rows `auto / minmax(0,1.618fr) / minmax(0,1fr) / var(--syn-dock-content-clearance)`; mobile ≤768px flow; docks fixed corners; drawer hides docks

- [ ] **Step 1: Write failing CSS and layout tests**

```ts
// tests/client/styles/shell-css.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('shell.css', () => {
  const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')

  it('defines desktop grid areas and golden-ratio columns/rows', () => {
    expect(css).toContain("grid-template-areas:")
    expect(css).toContain("'header header'")
    expect(css).toContain("'main navigation'")
    expect(css).toContain("'main footer'")
    expect(css).toContain("'dock dock'")
    expect(css).toContain('minmax(0, 1.618fr)')
    expect(css).toContain('minmax(280px, 1fr)')
    expect(css).toContain('var(--syn-dock-content-clearance)')
  })

  it('uses the mobile breakpoint at 768px and dock safe-area tokens', () => {
    expect(css).toContain('@media (max-width: 768px)')
    expect(css).toContain('var(--syn-dock-bottom)')
    expect(css).toContain('var(--syn-dock-left)')
    expect(css).toContain('var(--syn-dock-right)')
    expect(css).toContain('var(--syn-dock-gap)')
    expect(css).toContain('var(--syn-dock-control-size)')
    expect(css).toContain('@media (max-width: 360px)')
  })

  it('hides fixed docks while the drawer is open', () => {
    expect(css).toMatch(/\.syn-shell--drawer-open[\s\S]*\.syn-social-links/)
    expect(css).toMatch(/\.syn-shell--drawer-open[\s\S]*\.syn-language/)
  })
})
```

```ts
// tests/client/shell/shell-layout.test.ts
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import ShellLayout from '../../../src/client/components/ShellLayout.vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { mountShell } from '../harness/mount'

describe('ShellLayout', () => {
  it('composes header main navigation footer docks and drawer chrome', () => {
    const drawerOpen = ref(false)
    const wrapper = mountShell(ShellLayout, {
      locale: 'zh',
      slots: {
        default: '<p class="syn-main-probe">Main content</p>',
      },
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
    })

    expect(wrapper.find('.syn-header').exists()).toBe(true)
    expect(wrapper.find('.syn-main').exists()).toBe(true)
    expect(wrapper.find('.syn-navigation').exists()).toBe(true)
    expect(wrapper.find('.syn-site-footer').exists()).toBe(true)
    expect(wrapper.find('.syn-shell__dock').exists()).toBe(true)
    expect(wrapper.find('.syn-social-links').exists()).toBe(true)
    expect(wrapper.find('.syn-language').exists()).toBe(true)
    expect(wrapper.find('.syn-nav-drawer').exists()).toBe(true)
    expect(wrapper.text()).toContain('Main content')
  })

  it('marks drawer-open state on the shell root for CSS dock hiding', async () => {
    const drawerOpen = ref(true)
    const wrapper = mountShell(ShellLayout, {
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
    })
    expect(wrapper.get('.syn-shell').classes()).toContain('syn-shell--drawer-open')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/client/styles/shell-css.test.ts \
  tests/client/shell/shell-layout.test.ts
```

Expected: FAIL because shell.css / ShellLayout are missing.

- [ ] **Step 3: Implement shell.css and ShellLayout**

```css
/* src/client/styles/shell.css */
.syn-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.syn-shell {
  min-height: 100dvh;
  display: grid;
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
  color: var(--syn-fg);
  background: var(--syn-bg);
  font-family: var(--syn-font-body);
}

.syn-header {
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: var(--syn-border-strong);
  padding: 12px 16px;
}

.syn-header__menu {
  display: none;
}

.syn-main {
  grid-area: main;
  min-width: 0;
  border-right: var(--syn-border-strong);
  padding: 24px 16px;
}

.syn-main__inner {
  max-width: var(--syn-content-width);
}

.syn-navigation {
  grid-area: navigation;
  border-bottom: var(--syn-border-strong);
  padding: 16px;
}

.syn-site-footer {
  grid-area: footer;
  padding: 16px;
  min-height: 0;
}

.syn-shell__dock {
  grid-area: dock;
  pointer-events: none;
}

.syn-social-links,
.syn-language {
  position: fixed;
  bottom: var(--syn-dock-bottom);
  z-index: 20;
  pointer-events: auto;
}

.syn-social-links {
  left: var(--syn-dock-left);
  display: flex;
  flex-wrap: wrap-reverse;
  gap: var(--syn-dock-gap);
  max-width: calc(
    100vw - var(--syn-dock-left) - var(--syn-dock-right) - 40vw -
      (2 * var(--syn-dock-gap))
  );
  list-style: none;
  margin: 0;
  padding: 0;
}

.syn-social-links__link {
  display: inline-flex;
  width: var(--syn-dock-control-size);
  height: var(--syn-dock-control-size);
  border: var(--syn-border-strong);
  border-radius: var(--syn-radius);
}

.syn-social-links__icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.syn-language {
  right: var(--syn-dock-right);
}

.syn-language__list {
  position: absolute;
  right: 0;
  bottom: calc(100% + var(--syn-dock-gap));
  display: none;
  margin: 0;
  padding: 0;
  list-style: none;
  border: var(--syn-border-strong);
  background: var(--syn-bg);
}

.syn-language__list--open {
  display: block;
}

.syn-language__toggle {
  min-height: var(--syn-dock-control-size);
  max-width: 40vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: var(--syn-border-strong);
  border-radius: var(--syn-radius);
  background: var(--syn-bg);
  color: var(--syn-fg);
}

.syn-nav-drawer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: none;
  background: var(--syn-bg);
  color: var(--syn-fg);
  padding: 16px;
}

.syn-shell--drawer-open .syn-nav-drawer {
  display: block;
}

.syn-shell--drawer-open .syn-social-links,
.syn-shell--drawer-open .syn-language {
  visibility: hidden;
  pointer-events: none;
}

:focus-visible {
  outline: var(--syn-border-strong);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .syn-shell {
    display: block;
    padding-bottom: var(--syn-dock-content-clearance);
  }

  .syn-header__menu {
    display: inline-flex;
  }

  .syn-main {
    border-right: 0;
    border-bottom: var(--syn-border-strong);
  }

  .syn-shell > .syn-navigation {
    display: none;
  }

  .syn-shell__dock {
    display: none;
  }
}

@media (max-width: 360px) {
  .syn-social-links__link {
    width: 36px;
    height: 36px;
  }

  .syn-language__toggle {
    max-width: 40vw;
  }
}
```

```ts
// src/client/styles/index.ts
import './tokens.css'
import './shell.css'
```

```vue
<!-- src/client/components/ShellLayout.vue -->
<script setup lang="ts">
import { computed, inject, provide, ref, type Ref } from 'vue'
import {
  SYNCTROL_DRAWER_OPEN_KEY,
} from '../composables/keys.js'
import HeaderBar from './HeaderBar.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import NavDrawer from './NavDrawer.vue'
import Navigation from './Navigation.vue'
import SiteFooter from './SiteFooter.vue'
import SocialLinks from './SocialLinks.vue'

const injected = inject(SYNCTROL_DRAWER_OPEN_KEY, null) as Ref<boolean> | null
const drawerOpen = injected ?? ref(false)
if (!injected) provide(SYNCTROL_DRAWER_OPEN_KEY, drawerOpen)

const shellClass = computed(() => ({
  'syn-shell': true,
  'syn-shell--drawer-open': drawerOpen.value,
}))
</script>

<template>
  <div :class="shellClass">
    <HeaderBar />
    <main class="syn-main">
      <div class="syn-main__inner">
        <slot />
      </div>
    </main>
    <Navigation />
    <SiteFooter>
      <slot name="footer" />
    </SiteFooter>
    <div class="syn-shell__dock" aria-hidden="true" />
    <SocialLinks />
    <LanguageSwitcher />
    <NavDrawer />
  </div>
</template>
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/client/styles/shell-css.test.ts \
  tests/client/shell/shell-layout.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/styles/shell.css src/client/styles/index.ts \
  src/client/components/ShellLayout.vue \
  tests/client/styles/shell-css.test.ts \
  tests/client/shell/shell-layout.test.ts
git commit -m "feat: add golden-ratio ShellLayout and responsive dock CSS"
```

---

### Task 13: VuePress Layout entry and client config wiring

**Files:**
- Create: `src/client/layouts/Layout.vue`
- Create: `src/client/config.ts`
- Modify: `src/client/index.ts` — **extend** Plan 04 exports with pure TS only (do **not** re-export `Layout.vue`)
- Modify: `src/compiler/theme.ts` — ensure `clientConfigFile` → `../client/config.js` + `synctrol.alternates` from Task 3 patch remain
- Create: `tests/client/layouts/Layout.test.ts`
- Create: `tests/client/index.exports.test.ts` (smoke that Plan 04 helpers remain exported; **no** Layout Node import)

**Interfaces:**
- Consumes: `__SYNCTROL_THEME_OPTIONS__`; nested `frontmatter.synctrol`; Plan 04 `setContentAssetMap`
- Produces: Layout provides shell context (locale, identity, alternates, base), syncs content asset map on page change, renders `ShellLayout` around `<Content />`; Layout is registered only via `defineClientConfig` in `config.ts`; `./client` still exports asset helpers as Node-importable JS

**Important — Vitest mock hoisting:** Any state closed over by `vi.mock('vuepress/client', …)` (e.g. `pageRef`) **must** be created with `vi.hoisted(() => …)`. Declaring `const pageRef = ref(…)` above `vi.mock` fails under Vitest hoist rules.

- [ ] **Step 1: Write failing Layout + export tests**

```ts
// tests/client/layouts/Layout.test.ts
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import Layout from '../../../src/client/layouts/Layout.vue'
import { fixtureThemeOptions } from '../harness/fixtures'
import { mount } from '@vue/test-utils'
import {
  SYNCTROL_THEME_OPTIONS_KEY,
} from '../../../src/client/composables/keys'
import { resolveContentAsset, setContentAssetMap } from '../../../src/client'

const { pageRef } = vi.hoisted(() => {
  const { ref } = require('vue') as typeof import('vue')
  return {
    pageRef: ref({
      path: '/zh/',
      frontmatter: {
        synctrol: {
          identity: 'home',
          locale: 'zh',
          contentAssets: {
            './assets/cover.webp': '/assets/content/home/cover.abc123.webp',
          },
          alternates: [
            { locale: 'zh', publicPath: '/zh/' },
            { locale: 'en', publicPath: '/en/' },
          ],
        },
      },
    }),
  }
})

vi.mock('vuepress/client', () => {
  return {
    Content: defineComponent({
      name: 'Content',
      setup: () => () => h('article', { class: 'vp-content' }, 'Page body'),
    }),
    useRoute: () => ({ path: '/zh/' }),
    useData: () => ({
      page: pageRef,
      siteData: { value: { base: '/' } },
    }),
  }
})

describe('Layout', () => {
  it('wraps Content in the Synctrol shell using nested synctrol frontmatter', async () => {
    setContentAssetMap({})
    const theme = fixtureThemeOptions()
    const wrapper = mount(Layout, {
      global: {
        provide: {
          [SYNCTROL_THEME_OPTIONS_KEY as symbol]: theme,
        },
      },
    })
    await nextTick()
    expect(wrapper.find('.syn-shell').exists()).toBe(true)
    expect(wrapper.find('.vp-content').text()).toBe('Page body')
    expect(wrapper.find('.syn-header').exists()).toBe(true)
    expect(
      resolveContentAsset('./assets/cover.webp'),
    ).toBe('/assets/content/home/cover.abc123.webp')
  })
})
```

Prefer a pure ESM-friendly hoisted form if `require` is undesirable in the suite — e.g. hoist a plain mutable object and assign `ref(...)` inside the factory after importing Vue at module top is unavailable; the binding requirement is **`vi.hoisted`**, not the exact `require` shape:

```ts
const { pageRef } = vi.hoisted(() => {
  // create the ref inside hoisted so vi.mock can close over it safely
  return { pageRef: null as null | ReturnType<typeof ref> }
})
// after imports that Vitest does not hoist past the mock:
import { ref as vueRef } from 'vue'
pageRef = vueRef({ /* … */ }) // only if using a let binding from hoisted
```

Simplest accepted pattern: hoist with `vi.hoisted` + create the `ref` inside that callback (dynamic `import('vue')` is async — prefer sync factory that imports Vue via the already-bundled test environment). Workers may use:

```ts
import { ref } from 'vue'

const { pageRef } = vi.hoisted(() => {
  // NOTE: Vitest rewrites this so `ref` from the outer import is available
  // when the hoisted factory runs; do not declare pageRef with `ref(...)`
  // as a sibling above vi.mock without vi.hoisted.
  return {
    pageRef: ref({
      path: '/zh/',
      frontmatter: {
        synctrol: {
          identity: 'home',
          locale: 'zh',
          contentAssets: {
            './assets/cover.webp': '/assets/content/home/cover.abc123.webp',
          },
          alternates: [
            { locale: 'zh', publicPath: '/zh/' },
            { locale: 'en', publicPath: '/en/' },
          ],
        },
      },
    }),
  }
})
```

If the first `require` form fails under the repo’s ESM Vitest config, switch to the second `vi.hoisted` + outer `import { ref }` form. Do **not** leave un-hoisted `const pageRef = ref(...)` above `vi.mock`.

```ts
// tests/client/index.exports.test.ts
import { describe, expect, it } from 'vitest'
import * as client from '../../src/client'

describe('client package exports', () => {
  it('keeps Plan 04 asset helpers (JS-only; no Layout SFC export)', () => {
    expect(typeof client.resolveContentAsset).toBe('function')
    expect(typeof client.createResolveContentAsset).toBe('function')
    expect(typeof client.setContentAssetMap).toBe('function')
    expect(typeof client.normalizeContentAssetRef).toBe('function')
    expect(
      Object.prototype.hasOwnProperty.call(client, 'Layout'),
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/client/layouts/Layout.test.ts tests/client/index.exports.test.ts`

Expected: FAIL because Layout / extended client exports are incomplete.

- [ ] **Step 3: Implement Layout and EXTEND client wiring (no SFC barrel export)**

```vue
<!-- src/client/layouts/Layout.vue -->
<script setup lang="ts">
import { computed, provide, reactive, ref, watch } from 'vue'
import { Content, useData } from 'vuepress/client'
import { setContentAssetMap } from '../assets/resolve-content-asset.js'
import {
  SYNCTROL_DRAWER_OPEN_KEY,
  SYNCTROL_SHELL_CONTEXT_KEY,
  SYNCTROL_THEME_OPTIONS_KEY,
  type SynctrolShellContext,
} from '../composables/keys.js'
import ShellLayout from '../components/ShellLayout.vue'
import { useThemeOptions } from '../composables/useThemeOptions.js'
import { buildLocaleAlternates } from '../i18n/locale-alternates.js'
import { encodePathSegment } from '../../shared/encode-path-segment.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'

interface SynctrolFrontmatter {
  identity?: string
  locale?: string
  contentAssets?: Record<string, string>
  alternates?: Array<{ locale: string; publicPath: string }>
}

const theme = useThemeOptions()
const { page, siteData } = useData()
const drawerOpen = ref(false)

const synctrol = computed(
  () => (page.value.frontmatter.synctrol as SynctrolFrontmatter | undefined) ?? {},
)

const identity = computed(() => synctrol.value.identity ?? 'home')
const locale = computed(() => synctrol.value.locale ?? theme.mainLocale)

const localeAlternates = computed(() => {
  const injected = synctrol.value.alternates ?? []
  const pages = injected.length
    ? injected.map((entry) => ({
        identity: identity.value,
        locale: entry.locale,
        publicPath: entry.publicPath,
      }))
    : Object.keys(theme.locales).map((key) => ({
        identity: identity.value,
        locale: key,
        // Encoded locale home — never raw `/${key}/` for non-ASCII keys
        publicPath: joinPublicPath(
          normalizeBase(siteData.value.base),
          `/${encodePathSegment(key)}/`,
        ),
      }))
  return buildLocaleAlternates({
    identity: identity.value,
    localeOptions: Object.fromEntries(
      Object.entries(theme.locales).map(([key, value]) => [
        key,
        { label: value.label },
      ]),
    ),
    pages,
  })
})

watch(
  () => synctrol.value.contentAssets,
  (map) => {
    setContentAssetMap(map ?? {})
  },
  { immediate: true },
)

const shell = reactive<SynctrolShellContext>({
  locale: locale.value,
  identity: identity.value,
  publicPath: page.value.path,
  base: siteData.value.base,
  drawerOpen: false,
  setDrawerOpen: (open: boolean) => {
    drawerOpen.value = open
  },
  localeAlternates: localeAlternates.value,
})

watch(
  [locale, identity, localeAlternates, page, siteData, drawerOpen],
  () => {
    shell.locale = locale.value
    shell.identity = identity.value
    shell.publicPath = page.value.path
    shell.base = siteData.value.base
    shell.localeAlternates = localeAlternates.value
    shell.drawerOpen = drawerOpen.value
  },
  { immediate: true, deep: true },
)

provide(SYNCTROL_THEME_OPTIONS_KEY, theme)
provide(SYNCTROL_SHELL_CONTEXT_KEY, shell)
provide(SYNCTROL_DRAWER_OPEN_KEY, drawerOpen)
</script>

<template>
  <ShellLayout>
    <Content />
  </ShellLayout>
</template>
```

```ts
// src/client/config.ts
import { defineClientConfig } from 'vuepress/client'
import Layout from './layouts/Layout.vue'
import './styles/index.js'

export default defineClientConfig({
  layouts: {
    Layout,
  },
})
```

```ts
// src/client/index.ts — EXTEND Plan 04; never replace asset helpers; NEVER re-export SFCs
export {
  createResolveContentAsset,
  normalizeContentAssetRef,
  resolveContentAsset,
  setContentAssetMap,
  type ContentAssetMap,
} from './assets/resolve-content-asset.js'

export * from './composables/keys.js'
// Forbidden: export { default as Layout } from './layouts/Layout.vue'
```

Confirm `src/compiler/theme.ts` still has:

```ts
clientConfigFile: resolve(__dirname, '../client/config.js'),
```

Confirm `scripts/smoke-built-exports.mjs` still asserts Plan 04 asset helpers after build, and does **not** assert `client.Layout`. After `npm run build`, `dist/client/layouts/Layout.vue` and `dist/client/config.js` must exist (copy step + tsc). `dist/client/index.js` must not contain a `.vue` import.

- [ ] **Step 4: Run Layout + export tests + build smoke**

Run:

```bash
npm test -- tests/client/layouts/Layout.test.ts tests/client/index.exports.test.ts
npm run test:build-smoke
```

Expected: PASS (asset helpers remain on `vuepress-theme-synctrolling/client`; Node can load `dist/client/index.js`; Layout SFCs present under `dist/client` via copy).

- [ ] **Step 5: Commit**

```bash
git add src/client/layouts/Layout.vue src/client/config.ts src/client/index.ts \
  src/compiler/theme.ts tests/client/layouts/Layout.test.ts \
  tests/client/index.exports.test.ts
git commit -m "feat: wire VuePress Layout via client config (no SFC barrel export)"
```
---

### Task 14: Shell accessibility and responsive integration suite

**Files:**
- Create: `tests/client/shell/shell-a11y.test.ts`
- Create: `tests/client/shell/shell-mobile.test.ts`

**Interfaces:**
- Consumes: ShellLayout + all chrome components
- Produces: regression coverage for Escape, focus restore, hamburger-only Navigation, dock hiding, ThemeMode keyboard path already covered

- [ ] **Step 1: Write failing integration tests**

```ts
// tests/client/shell/shell-a11y.test.ts
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import ShellLayout from '../../../src/client/components/ShellLayout.vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { mountShell } from '../harness/mount'

describe('shell accessibility', () => {
  it('opens drawer from header, traps focus context, and closes on Escape with restore', async () => {
    const drawerOpen = ref(false)
    const wrapper = mountShell(ShellLayout, {
      locale: 'en',
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
      attachTo: document.body,
    })

    const menu = wrapper.get('.syn-header__menu')
    await menu.trigger('click')
    expect(drawerOpen.value).toBe(true)
    expect(wrapper.get('.syn-shell').classes()).toContain('syn-shell--drawer-open')
    expect(wrapper.find('.syn-nav-drawer .syn-navigation').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(drawerOpen.value).toBe(false)
  })

  it('gives every social icon link an accessible name', () => {
    const wrapper = mountShell(ShellLayout)
    for (const link of wrapper.findAll('.syn-social-links a')) {
      expect(link.attributes('aria-label')).toBeTruthy()
    }
  })
})
```

```ts
// tests/client/shell/shell-mobile.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import ShellLayout from '../../../src/client/components/ShellLayout.vue'
import { mountShell } from '../harness/mount'

describe('shell mobile contract', () => {
  it('keeps Main and Footer as sibling shell regions, Navigation also mounted for desktop/drawer', () => {
    const wrapper = mountShell(ShellLayout, {
      slots: { default: '<p>Body</p>' },
    })
    const root = wrapper.get('.syn-shell')
    expect(root.find(':scope > .syn-main').exists()).toBe(true)
    expect(root.find(':scope > .syn-site-footer').exists()).toBe(true)
    expect(root.find(':scope > .syn-navigation').exists()).toBe(true)
    expect(root.find('.syn-nav-drawer .syn-navigation').exists()).toBe(true)
  })

  it('encodes mobile flow and dock clearance as padding in CSS', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toContain('@media (max-width: 768px)')
    expect(css).toContain('padding-bottom: var(--syn-dock-content-clearance)')
    expect(css).toContain('.syn-shell > .syn-navigation')
    expect(css).toContain('display: none')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail if prior tasks drifted**

Run:

```bash
npm test -- tests/client/shell/shell-a11y.test.ts \
  tests/client/shell/shell-mobile.test.ts
```

Expected: FAIL only if wiring is incomplete; otherwise implement any missing class hooks then continue.

- [ ] **Step 3: Keep drawer visibility class-driven**

`NavDrawer` stays mounted. Open state is `drawerOpen` plus `.syn-shell--drawer-open` on the shell root. CSS uses `.syn-nav-drawer { display: none }` and `.syn-shell--drawer-open .syn-nav-drawer { display: block }` (already in Task 12). Do not add `v-if` that removes the drawer from the document. Hamburger visibility remains mobile-only via `.syn-header__menu`.

- [ ] **Step 4: Run the full Plan 05 suite**

Run:

```bash
npm test -- tests/client tests/shared/format-message.test.ts
```

Expected: all Plan 05 tests PASS. Then run full package suite:

```bash
npm test
```

Expected: Plans 01–04 tests still PASS alongside Plan 05.

- [ ] **Step 5: Commit**

```bash
git add tests/client/shell/shell-a11y.test.ts \
  tests/client/shell/shell-mobile.test.ts \
  src/client
git commit -m "test: cover shell accessibility and mobile chrome contracts"
```

---

### Task 15: Final verification checklist

**Files:**
- Modify: none unless a verification failure forces a fix under this plan’s scope

**Interfaces:**
- Consumes: entire Plan 05 deliverable
- Produces: green test run proving shell acceptance criteria for this plan

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`

Expected: PASS (foundation + compiler + locale/route + assets + shell).

- [ ] **Step 2: Manually confirm scoped acceptance against the spec**

Checklist (mark each during verification):

- [ ] Desktop grid areas are `header/main/navigation/footer/dock` with columns `1.618fr` + `minmax(280px,1fr)` and dock clearance row.
- [ ] Main spans Navigation+Footer rows; SocialLinks fixed bottom-left; LanguageSwitcher fixed bottom-right.
- [ ] Mobile ≤768px: Header (copyright, ThemeMode, hamburger); Main then Footer in flow; only Navigation in hamburger; docks remain fixed corners; clearance via padding.
- [ ] ThemeMode single-label cycle AUTO→LIGHT→DARK→AUTO honors `defaultColorMode` and boot script.
- [ ] Navigation options include `externalTarget`; SocialLinks has items only (no iconSize).
- [ ] LanguageSwitcher collapses upward with full locale labels; persists `synctrol:locale`.
- [ ] Footer reserved and empty by default (slot ready for home-footer).
- [ ] Focus trap, Escape, aria labels/`aria-expanded`/`aria-modal` present.
- [ ] Dock safe-area tokens used: `--syn-dock-bottom/left/right/gap/control-size/content-clearance`.
- [ ] No Background runtime; no Release/News content UI beyond shell chrome.

- [ ] **Step 3: Commit verification note only if fixes were required**

If Step 1 required code fixes, commit them:

```bash
git add -A
git commit -m "fix: close global shell verification gaps"
```

If already green, no extra commit.

---

## Plan Self-Review

1. **Spec coverage (Plan 05 / sections 14–19, 29 shell a11y, 32.3 shell components; contracts from Plans 01–04):** Desktop grid (§14.1), mobile shell (§14.2), dock tokens (§14.2), Header+ThemeMode (§15), Navigation+externalTarget (§16), SocialLinks items-only (§17), LanguageSwitcher (§18), Footer reserved (§19), a11y Escape/focus/labels (§29), component tests (§32.3). Background (§13/§06), Release/News UI (§22–26), SEO (§28), root router HTML (§7.3 beyond locale storage key) intentionally out of scope.

2. **Placeholder scan:** No TBD/TODO/“implement later” left in tasks; asset hashing deferred explicitly via stub URLs allowed by Plan 05 constraints.

3. **Type consistency:** `NavigationOptions.externalTarget`, `SocialLinksOptions.items`, `defaultColorMode`, `ColorModePreference`, `synctrol:color-mode`, `LOCALE_STORAGE_KEY` (`synctrol:locale` via shared), nested `frontmatter.synctrol` (`identity`/`locale`/`contentAssets`/`alternates`), Plan 04 client asset helpers, dock CSS variable names match Plans 01–04 and the design spec.

4. **HEAD executability:** Snippets import `route-path.js`, extend `src/client/index.ts`, patch Plan 04 `theme.ts`, encode locale segments, and include `vue-shim.d.ts` so `npm test` / `npm run build` stay green under `tsc`.

---

**Task count:** 15  
**Key files:** `src/client/components/ShellLayout.vue`, `src/client/layouts/Layout.vue`, `src/client/styles/shell.css`, `src/client/components/ThemeMode.vue`, `src/client/components/Navigation.vue`, `src/client/components/HeaderBar.vue`, `src/client/components/NavDrawer.vue`, `src/client/components/SocialLinks.vue`, `src/client/components/LanguageSwitcher.vue`, `src/client/components/SiteFooter.vue`, `src/client/color-mode/*`, `src/client/navigation/resolve-nav-href.ts`, `src/client/a11y/focus-trap.ts`, `src/client/config.ts`, `src/client/index.ts` (extends Plan 04), `src/compiler/theme.ts` (Plan 04 patch), `src/shared/locale-storage.ts`, `src/shared/encode-path-segment.ts`, `src/vue-shim.d.ts`
