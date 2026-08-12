# Background Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Revision Notes (executable against Plans 01–05 @ HEAD `34bf7e7`)

Revised so an implementation worker can execute against shipped Plans 01–05 without breaking the JSON-safe client options contract, nested page-data shape, color-mode sharing, or `./client` packaging. Binding decisions (do not re-litigate):

1. **Backgrounds reach the client via a Vite virtual module — not `__SYNCTROL_THEME_OPTIONS__`.**
   - Keep `toClientThemeOptions()` JSON-safe; **never** put `backgrounds` / loader functions on `define.__SYNCTROL_THEME_OPTIONS__`.
   - `synctrolTheme()` captures `resolved.backgrounds` loaders on the Node side.
   - Theme registers a Vite plugin through `extendsBundlerOptions` exposing `virtual:synctrol-backgrounds` (alias `@synctrol/backgrounds` → same module).
   - Serialization: for each loader, extract the dynamic-import specifier from supported forms only:
     - `() => import('…')`
     - `() => import("…")`
     (optional whitespace inside). Resolve relative specifiers against the site config directory (`app.dir.source('.vuepress')`). Emit:
     `export default { home: () => import('/abs/or/resolved/id'), … }`.
   - Unsupported loader shapes → build diagnostic error (do not silently drop).
   - Client runtime imports the virtual module map; missing type key → solid `--syn-bg` fallback.
   - Existing `tests/shared/client-options.test.ts` assertions that client options / define omit `backgrounds` **remain**; add new tests proving the virtual-module channel.

2. **Page data is nested `page.value.frontmatter.synctrol` (Plans 03/04/05).**
   - Do **not** invent `page.synctrol` or top-level VuePress page fields.
   - Stamp `routePath: compiled.url.routePath` onto `frontmatter.synctrol` in a `theme.ts` PATCH (additive; preserve `clientConfigFile`, boot script, `buildSite`, `compileAssets`, content-tree filter, `contentAssets`, `alternates`, root-router `onGenerated`).
   - Background composable reads `contentType`, `locale`, `routePath` from that nested object (fall back to `page.path` / `route.path` only if `routePath` absent).

3. **Shared reactive color-mode surface (extends Plan 05 — not a parallel instance).**
   - Adapt shipped `src/client/composables/useColorMode.ts` to a **module-level singleton** so `ThemeMode` and `BackgroundRuntime` observe one preference/surface.
   - Export `useResolvedColorMode(): Ref<'light' | 'dark'>` (returns the singleton’s resolved `surface`) from the Plan 05 color-mode composable surface (same file or a thin re-export next to it under `src/client/color-mode/` / `composables/`).
   - Document and test that cycling ThemeMode updates backgrounds without a second `useColorMode()` instance.

4. **`BackgroundHost.vue` is Layout-internal only.**
   - Do **not** re-export SFCs from `src/client/index.ts` / package `./client`.
   - `./client` may export pure TS runtime helpers/types (`BackgroundRuntime`, resolve helpers, etc.) but not `.vue`.
   - Layout imports `BackgroundHost.vue` directly (same pattern as Plan 05 `config.ts` → `Layout.vue`).

5. **NodeNext `.js` imports** on every relative import inside `src/**` (including `<script setup>` in `.vue`). Test imports stay extensionless (bundler / `tsconfig.test.json`).

6. **Vitest:** extend the shipped `projects` config only. Do **not** replace it with `environmentMatchGlobs`. Do **not** reinstall `happy-dom` / `@vue/test-utils` / `@vitejs/plugin-vue` (already at HEAD). DOM-using background tests live under `tests/client/**` so HEAD’s node project `exclude: ['tests/client/**']` keeps them out of the node environment — do **not** leave `document`/`HTMLElement` contracts under `tests/shared/` with only a client `include` add (node would dual-run them).

7. **Stale loader race:** increment `loadGeneration` (or equivalent cancel token) on solid fallback too; add test `pending module load → missing-loader solid` so a late resolve cannot remount after solid.

8. **`useThemeOptions` typing:** return / inject `ClientSynctrolThemeOptions` (not `ResolvedSynctrolThemeOptions`). Backgrounds are **not** on theme options inject; they come from the virtual module.

9. **HEAD API signatures in Task integration examples:**
   - `parseContentManifest(contentYmlPath, packageDir)`
   - `generateRootRouterHtml({ options, base })` with `options` from `themeOptions()` / `resolveThemeOptions`

10. **Shell stacking:** integrate with shipped `shell.css` — make `.syn-shell` background transparent so the fixed host is visible. Fixed `.syn-background` stays at `z-index: 0`; shell content regions (`.syn-header`, `.syn-main`, `.syn-navigation`, `.syn-site-footer`) get `position: relative; z-index: 1` so content paints above the decorative layer. Do **not** invent a competing global z-index system that overrides Plan 05 dock/drawer rules (`z-index: 20` / drawer `40`). Prefer these minimal additive rules + one transparent-shell tweak.

**Goal:** Implement the client-only Synctrol background runtime that loads type-keyed TypeScript background modules from theme config (via a Vite virtual module), drives their `update`/`dispose` lifecycle, and falls back to an empty solid surface when no module is configured.

**Architecture:** A pure `resolveBackgroundContentType` maps page content types (including collection pages) onto the four theme keys `home | release | news | page`. Node-side theme code serializes configured `() => import(…)` loaders into `virtual:synctrol-backgrounds`. A `BackgroundRuntime` owns module load/swap, builds `BackgroundContext`, and never sizes the shell. A Vue `BackgroundHost` mounts only inside the Plan 05 layout on content pages; the root language router HTML never hosts it. Modules export `default(context) => BackgroundController` and clean up everything they create.

**Tech Stack:** TypeScript 5.x, Vue 3, VuePress 2 client APIs + `extendsBundlerOptions` Vite plugin, Vitest projects (`client` = happy-dom, `node` = node) from Plan 05, ESM package layout from Plan 01 (`vuepress-theme-synctrolling`).

## Global Constraints

- Package name is `vuepress-theme-synctrolling`.
- Content types are only `home | release | news | page`.
- Background selection exists only in theme configuration: `backgrounds?: Partial<Record<ContentType, BackgroundLoader>>`.
- Selection uses the resolved content type only; content packages cannot select or override backgrounds (`background` in `content.yml` is already a Plan 02 build error `ILLEGAL_BACKGROUND`).
- Missing configuration produces an empty solid-color background (token surface `--syn-bg`).
- Module API is exactly: `default(context: BackgroundContext): BackgroundController` with `update(context)` and `dispose()`.
- Modules initialize only on the client and do not determine layout size.
- The shell calls `update()` on route, locale, computed color mode, or reduced-motion changes, and calls `dispose()` before replacing or unmounting a module.
- Modules must clean up events, animation frames, observers, and DOM they create.
- Reduced-motion preferences disable or simplify animated backgrounds (`BackgroundContext.reducedMotion`).
- The root language router page does not load a background module.
- Brand tokens remain fixed; backgrounds must not introduce purple glow themes, rounded cards, or soft shadows into the shell.
- `__SYNCTROL_THEME_OPTIONS__` stays JSON-safe (`ClientSynctrolThemeOptions`); backgrounds never travel through it.
- All later tasks inherit these constraints.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/shared/background.ts` | `BackgroundContext`, `BackgroundController`, `BackgroundModule`, typed `BackgroundLoader` |
| `src/shared/options.ts` | Re-export / consume typed `BackgroundLoader` (Plan 01 already has the option field) |
| `src/compiler/backgrounds/extract-loader-specifier.ts` | Parse supported `() => import('…')` forms; diagnostic on unsupported |
| `src/compiler/backgrounds/emit-virtual-module.ts` | Emit virtual module source; resolve relative to config dir |
| `src/compiler/backgrounds/vite-plugin.ts` | Vite plugin for `virtual:synctrol-backgrounds` / `@synctrol/backgrounds` |
| `src/compiler/theme.ts` | PATCH: `extendsBundlerOptions` + stamp `frontmatter.synctrol.routePath` |
| `src/client/background/resolve-type.ts` | Map page `contentType` → background config key |
| `src/client/background/reduced-motion.ts` | Read `prefers-reduced-motion` and subscribe to changes |
| `src/client/background/runtime.ts` | `BackgroundRuntime`: load, update, dispose-before-replace, solid fallback, generation cancel |
| `src/client/background/BackgroundHost.vue` | Fixed full-bleed host; Layout-internal only |
| `src/client/background/background-host.css` | Host layer styles + content-above-background stacking (`z-index: 0` host / `z-index: 1` shell content children); coordinate shell transparency in `shell.css` |
| `src/client/background/use-background-runtime.ts` | Wire route / locale / colorMode / reducedMotion; import virtual map |
| `src/client/background/virtual-backgrounds.d.ts` | Ambient module for `virtual:synctrol-backgrounds` |
| `src/client/background/index.ts` | Internal TS barrel (no SFC re-exports required for `./client`) |
| `src/client/composables/useColorMode.ts` | Plan 05 singleton + `useResolvedColorMode` |
| `src/client/composables/useThemeOptions.ts` | Typed as `ClientSynctrolThemeOptions` |
| `src/client/composables/keys.ts` | Injection key typed as `ClientSynctrolThemeOptions` |
| `src/client/layouts/Layout.vue` | Mount `BackgroundHost` (Plan 05 shell; this plan inserts the host) |
| `src/client/styles/shell.css` | Transparent shell background so fixed host is visible (dock/drawer z-index unchanged) |
| `src/client/index.ts` | Optional pure-TS background helper re-exports only — **no** `.vue` |
| `tests/client/background/background-types.test.ts` | Type/API contract tests (DOM/`HTMLElement`; client/happy-dom project — covered by HEAD node `exclude: ['tests/client/**']`) |
| `tests/compiler/backgrounds/*.test.ts` | Specifier extract, emit, unsupported diagnostics |
| `tests/client/background/*.test.ts` | Client runtime / host / composable coverage |
| `tests/fixtures/backgrounds/*` | Probe modules + theme-config example |

**Assumed from Plan 05 (Global Shell) — must already exist before executing this plan:**

- `src/client/layouts/Layout.vue` + `ShellLayout.vue` render shell regions for every content page.
- `src/client/composables/useColorMode.ts` exists with `{ preference, surface, cycle }` — this plan adapts it to a shared singleton and exports `useResolvedColorMode`.
- Page data lives under `page.value.frontmatter.synctrol` with at least `identity`, `locale`, `contentType`, flags, `contentAssets`, `alternates` (Plans 03–05). This plan adds `routePath`.
- Root language router remains static HTML from Plan 03 (`generateRootRouterHtml`); it is not rendered through `Layout.vue`.
- Vitest `projects` already split `tests/client/**` (happy-dom + Vue plugin) vs other tests (node).
- `scripts/copy-client-assets.mjs` already copies `.vue` / `.css` under `src/client` → `dist/client` (no script change required for new background assets).

**Out of scope for this plan:** building default decorative backgrounds (grid/scanline/noise/shape stay disabled), platform embeds, Release/News UI, SEO, npm package publish, and changing Plan 02 manifest validation.

---

### Task 1: Background module type contracts

**Files:**
- Create: `src/shared/background.ts`
- Create: `tests/client/background/background-types.test.ts`
- Modify: `src/shared/options.ts` (replace loose `BackgroundLoader = () => Promise<unknown>` with the typed export)
- Modify: `src/index.ts` (re-export background types)
- Modify: `vitest.config.ts` — **none required for this test path** (HEAD already routes `tests/client/**` → happy-dom and excludes it from the node project)

**Interfaces:**
- Consumes: `ContentType` from `src/shared/types.ts` (Plan 01)
- Produces: `BackgroundContext`, `BackgroundController`, `BackgroundModule`, `BackgroundLoader`

- [ ] **Step 1: Write the failing type-contract tests**

Place the DOM/`document.createElement` contracts under `tests/client/background/` (not `tests/shared/`). HEAD Vitest already has:

```ts
// node project (shipped) — do not regress
exclude: ['tests/client/**'],
```

If a future shared DOM test must stay outside `tests/client/**`, extend the node project exclude to match HEAD’s pattern (e.g. `exclude: ['tests/client/**', 'tests/shared/background-types.test.ts']`) **and** add that file to the client project `include` — never client-include alone (node would dual-run it without `document`).

```ts
// tests/client/background/background-types.test.ts
import { describe, expect, it } from 'vitest'
import type {
  BackgroundContext,
  BackgroundController,
  BackgroundLoader,
  BackgroundModule,
} from '../../../src/shared/background'

describe('background module contracts', () => {
  it('requires BackgroundContext fields from the spec', () => {
    const context: BackgroundContext = {
      element: document.createElement('div'),
      route: '/zh/',
      locale: 'zh',
      colorMode: 'dark',
      reducedMotion: true,
    }
    expect(context.element).toBeInstanceOf(HTMLElement)
    expect(context.route).toBe('/zh/')
    expect(context.locale).toBe('zh')
    expect(context.colorMode).toBe('dark')
    expect(context.reducedMotion).toBe(true)
  })

  it('requires update and dispose on BackgroundController', () => {
    const calls: string[] = []
    const controller: BackgroundController = {
      update(ctx) {
        calls.push(`update:${ctx.route}`)
      },
      dispose() {
        calls.push('dispose')
      },
    }
    controller.update({
      element: document.createElement('div'),
      route: '/en/releases/',
      locale: 'en',
      colorMode: 'light',
      reducedMotion: false,
    })
    controller.dispose()
    expect(calls).toEqual(['update:/en/releases/', 'dispose'])
  })

  it('loads modules through BackgroundLoader returning a default factory', async () => {
    const loader: BackgroundLoader = async () => {
      const mod: BackgroundModule = {
        default(context) {
          expect(context.element).toBeInstanceOf(HTMLElement)
          return {
            update() {},
            dispose() {},
          }
        },
      }
      return mod
    }
    const mod = await loader()
    const controller = mod.default({
      element: document.createElement('div'),
      route: '/zh/news/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(typeof controller.update).toBe('function')
    expect(typeof controller.dispose).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/background/background-types.test.ts`

Expected: FAIL because `src/shared/background.ts` does not exist (or exports are missing).

- [ ] **Step 3: Implement shared background types and wire options**

```ts
// src/shared/background.ts
export interface BackgroundContext {
  element: HTMLElement
  route: string
  locale: string
  colorMode: 'light' | 'dark'
  reducedMotion: boolean
}

export interface BackgroundController {
  update(context: BackgroundContext): void
  dispose(): void
}

export type BackgroundModule = {
  default(context: BackgroundContext): BackgroundController
}

export type BackgroundLoader = () => Promise<BackgroundModule>
```

In `src/shared/options.ts`, remove the local `export type BackgroundLoader = () => Promise<unknown>` and import the typed alias:

```ts
import type { BackgroundLoader } from './background.js'
// …
export type { BackgroundLoader } from './background.js'
// SynctrolThemeOptions.backgrounds / ResolvedSynctrolThemeOptions.backgrounds
// continue to use Partial<Record<ContentType, BackgroundLoader>>
```

Re-export from `src/index.ts`:

```ts
export type {
  BackgroundContext,
  BackgroundController,
  BackgroundLoader,
  BackgroundModule,
} from './shared/background.js'
```

Do **not** change `vitest.config.ts` for this task — the test path is already under `tests/client/**` (happy-dom). Do **not** reinstall happy-dom / Vue test deps (already present). Do **not** switch to `environmentMatchGlobs`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/background/background-types.test.ts`

Expected: PASS (client/happy-dom project only; node project must not pick it up).

- [ ] **Step 5: Commit**

```bash
git add src/shared/background.ts src/shared/options.ts src/index.ts \
  tests/client/background/background-types.test.ts
git commit -m "feat: add background module type contracts"
```

---

### Task 2: Resolve background key from page content type

**Files:**
- Create: `src/client/background/resolve-type.ts`
- Create: `src/client/background/types.ts`
- Create: `tests/client/background/resolve-type.test.ts`

**Interfaces:**
- Consumes: `ContentType`; Plan 03 `CompiledPage.contentType` including `'release-collection' | 'news-collection'`
- Produces: `resolveBackgroundContentType(contentType): ContentType`; `SynctrolClientPageData` matching **nested** `frontmatter.synctrol`

- [ ] **Step 1: Write the failing mapping tests**

```ts
// tests/client/background/resolve-type.test.ts
import { describe, expect, it } from 'vitest'
import { resolveBackgroundContentType } from '../../../src/client/background/resolve-type'

describe('resolveBackgroundContentType', () => {
  it('maps home, release, news, and page detail types to themselves', () => {
    expect(resolveBackgroundContentType('home')).toBe('home')
    expect(resolveBackgroundContentType('release')).toBe('release')
    expect(resolveBackgroundContentType('news')).toBe('news')
    expect(resolveBackgroundContentType('page')).toBe('page')
  })

  it('maps release collection pages to release', () => {
    expect(resolveBackgroundContentType('release-collection')).toBe('release')
  })

  it('maps news collection and tag archive pages to news', () => {
    expect(resolveBackgroundContentType('news-collection')).toBe('news')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/background/resolve-type.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement resolver and client page-data type**

```ts
// src/client/background/resolve-type.ts
import type { ContentType } from '../../shared/types.js'

export type PageContentType = ContentType | 'release-collection' | 'news-collection'

export function resolveBackgroundContentType(
  contentType: PageContentType,
): ContentType {
  switch (contentType) {
    case 'release-collection':
      return 'release'
    case 'news-collection':
      return 'news'
    case 'home':
    case 'release':
    case 'news':
    case 'page':
      return contentType
    default: {
      const _exhaustive: never = contentType
      return _exhaustive
    }
  }
}
```

```ts
// src/client/background/types.ts
import type { PageContentType } from './resolve-type.js'

/**
 * Shape of fields read from `page.value.frontmatter.synctrol`
 * (Plans 03–05 nest theme page data here — never `page.synctrol`).
 */
export interface SynctrolClientPageData {
  locale: string
  contentType: PageContentType
  /** Stamped by Plan 06 theme.ts PATCH from `compiled.url.routePath`. */
  routePath: string
  identity?: string
  contentAssets?: Record<string, string>
  alternates?: Array<{ locale: string; publicPath: string }>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/background/resolve-type.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/background/resolve-type.ts src/client/background/types.ts \
  tests/client/background/resolve-type.test.ts
git commit -m "feat: map page content types to background config keys"
```

---

### Task 3: Reduced-motion preference helper

**Files:**
- Create: `src/client/background/reduced-motion.ts`
- Create: `tests/client/background/reduced-motion.test.ts`

**Interfaces:**
- Consumes: `window.matchMedia`
- Produces: `readReducedMotion(media?: MediaQueryList): boolean`; `subscribeReducedMotion(listener): () => void`

- [ ] **Step 1: Write the failing reduced-motion tests**

```ts
// tests/client/background/reduced-motion.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  REDUCED_MOTION_QUERY,
  readReducedMotion,
  subscribeReducedMotion,
} from '../../../src/client/background/reduced-motion'

describe('reduced motion helper', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads prefers-reduced-motion: reduce as true', () => {
    const mql = {
      matches: true,
      media: REDUCED_MOTION_QUERY,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    expect(readReducedMotion(mql as unknown as MediaQueryList)).toBe(true)
  })

  it('reads prefers-reduced-motion: no-preference as false', () => {
    const mql = {
      matches: false,
      media: REDUCED_MOTION_QUERY,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    expect(readReducedMotion(mql as unknown as MediaQueryList)).toBe(false)
  })

  it('subscribes and unsubscribes change listeners', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mql = {
      matches: false,
      media: REDUCED_MOTION_QUERY,
      addEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
        if (type === 'change') listeners.add(listener)
      }),
      removeEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
        if (type === 'change') listeners.delete(listener)
      }),
    }
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql),
    )

    const seen: boolean[] = []
    const unsubscribe = subscribeReducedMotion((value) => {
      seen.push(value)
    })

    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    for (const listener of listeners) {
      listener({ matches: true } as MediaQueryListEvent)
    }
    expect(seen).toEqual([true])

    unsubscribe()
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(listeners.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/background/reduced-motion.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement helper**

```ts
// src/client/background/reduced-motion.ts
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function readReducedMotion(
  media: MediaQueryList | null | undefined = typeof window !== 'undefined'
    ? window.matchMedia(REDUCED_MOTION_QUERY)
    : null,
): boolean {
  return Boolean(media?.matches)
}

export function subscribeReducedMotion(
  listener: (reducedMotion: boolean) => void,
): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const media = window.matchMedia(REDUCED_MOTION_QUERY)
  const onChange = (event: MediaQueryListEvent) => {
    listener(event.matches)
  }
  media.addEventListener('change', onChange)
  return () => {
    media.removeEventListener('change', onChange)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/background/reduced-motion.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/background/reduced-motion.ts tests/client/background/reduced-motion.test.ts
git commit -m "feat: add prefers-reduced-motion helper for backgrounds"
```

---

### Task 4: BackgroundRuntime load, update, dispose-before-replace, solid fallback

**Files:**
- Create: `src/client/background/runtime.ts`
- Create: `tests/client/background/runtime.test.ts`
- Create: `tests/fixtures/backgrounds/solid-probe.ts`
- Create: `tests/fixtures/backgrounds/animating-probe.ts`

**Interfaces:**
- Consumes: `BackgroundLoader`, `BackgroundContext`, `BackgroundController`, `ContentType`, `resolveBackgroundContentType`
- Produces: `BackgroundRuntime` with `setHost(element)`, `sync(input)`, `dispose()`

**Race rule:** every path that abandons an in-flight load (including `replaceWithSolid` and `dispose`) must bump `loadGeneration` so a late `loader()` resolve cannot mount.

- [ ] **Step 1: Write fixture modules and failing runtime tests**

Use the solid-probe / animating-probe fixtures from the original plan (init/update/dispose logging; rAF/listener/observer cleanup). Add this race case to `runtime.test.ts`:

```ts
  it('ignores a pending loader when sync falls back to solid before it resolves', async () => {
    let resolveLoader!: (mod: Awaited<ReturnType<BackgroundLoader>>) => void
    const pendingLoader: BackgroundLoader = () =>
      new Promise((resolve) => {
        resolveLoader = resolve
      })

    const runtime = new BackgroundRuntime({
      backgrounds: { home: pendingLoader },
    })
    runtime.setHost(host)

    const pending = runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })

    await runtime.sync({
      contentType: 'page',
      route: '/zh/about/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(host.dataset.synBackground).toBe('solid')

    resolveLoader({
      default() {
        host.dataset.leaked = '1'
        return { update() {}, dispose() {} }
      },
    })
    await pending
    expect(host.dataset.synBackground).toBe('solid')
    expect(host.dataset.leaked).toBeUndefined()
    runtime.dispose()
  })
```

Also keep the original cases: load by type, collection mapping, solid when missing, update on same key, dispose-before-replace, dispose-before-solid, animating cleanup, reducedMotion, sync-before-setHost.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/background/runtime.test.ts`

Expected: FAIL because `BackgroundRuntime` does not exist.

- [ ] **Step 3: Implement BackgroundRuntime**

```ts
// src/client/background/runtime.ts
import type {
  BackgroundContext,
  BackgroundController,
  BackgroundLoader,
  BackgroundModule,
} from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'
import {
  resolveBackgroundContentType,
  type PageContentType,
} from './resolve-type.js'

export interface BackgroundRuntimeOptions {
  backgrounds: Partial<Record<ContentType, BackgroundLoader>>
}

export interface BackgroundSyncInput {
  contentType: PageContentType
  route: string
  locale: string
  colorMode: 'light' | 'dark'
  reducedMotion: boolean
}

export class BackgroundRuntime {
  private readonly backgrounds: Partial<Record<ContentType, BackgroundLoader>>
  private host: HTMLElement | null = null
  private activeKey: ContentType | null = null
  private controller: BackgroundController | null = null
  private loadGeneration = 0

  constructor(options: BackgroundRuntimeOptions) {
    this.backgrounds = options.backgrounds
  }

  setHost(element: HTMLElement): void {
    this.host = element
    this.applySolidSurface(element)
  }

  async sync(input: BackgroundSyncInput): Promise<void> {
    if (!this.host) return

    const key = resolveBackgroundContentType(input.contentType)
    const loader = this.backgrounds[key]
    const context = this.buildContext(input)

    if (!loader) {
      await this.replaceWithSolid()
      return
    }

    if (this.activeKey === key && this.controller) {
      this.controller.update(context)
      this.host.dataset.synBackground = 'module'
      return
    }

    await this.replaceWithModule(key, loader, context)
  }

  dispose(): void {
    this.loadGeneration += 1
    this.disposeActive()
    if (this.host) {
      this.applySolidSurface(this.host)
      this.host.dataset.synBackground = 'solid'
    }
  }

  private buildContext(input: BackgroundSyncInput): BackgroundContext {
    if (!this.host) {
      throw new Error('BackgroundRuntime host is not set')
    }
    return {
      element: this.host,
      route: input.route,
      locale: input.locale,
      colorMode: input.colorMode,
      reducedMotion: input.reducedMotion,
    }
  }

  private async replaceWithSolid(): Promise<void> {
    // Invalidate any in-flight module load (pending → solid).
    this.loadGeneration += 1
    this.disposeActive()
    if (!this.host) return
    this.applySolidSurface(this.host)
    this.host.dataset.synBackground = 'solid'
  }

  private async replaceWithModule(
    key: ContentType,
    loader: BackgroundLoader,
    context: BackgroundContext,
  ): Promise<void> {
    const generation = ++this.loadGeneration
    this.disposeActive()

    const mod: BackgroundModule = await loader()
    if (generation !== this.loadGeneration || !this.host) {
      return
    }

    this.controller = mod.default(context)
    this.activeKey = key
    this.host.dataset.synBackground = 'module'
  }

  private disposeActive(): void {
    if (this.controller) {
      this.controller.dispose()
    }
    this.controller = null
    this.activeKey = null
    if (this.host) {
      this.host.replaceChildren()
    }
  }

  private applySolidSurface(element: HTMLElement): void {
    element.style.backgroundColor = 'var(--syn-bg)'
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/background/runtime.test.ts`

Expected: PASS (including pending→solid).

- [ ] **Step 5: Commit**

```bash
git add src/client/background/runtime.ts tests/client/background/runtime.test.ts \
  tests/fixtures/backgrounds/solid-probe.ts tests/fixtures/backgrounds/animating-probe.ts
git commit -m "feat: add background runtime load update dispose lifecycle"
```

---

### Task 5: Extract loader specifiers and emit virtual module source

**Files:**
- Create: `src/compiler/backgrounds/extract-loader-specifier.ts`
- Create: `src/compiler/backgrounds/emit-virtual-module.ts`
- Create: `tests/compiler/backgrounds/extract-loader-specifier.test.ts`
- Create: `tests/compiler/backgrounds/emit-virtual-module.test.ts`

**Interfaces:**
- Consumes: `BackgroundLoader`, `ContentType`, site config directory path
- Produces: specifier string | diagnostic; virtual module source string

**Supported loader forms (only):**
- `() => import('specifier')`
- `() => import("specifier")`

Whitespace inside the arrow/call is allowed. Template literals, blocks, helpers, `async () => …`, multi-statement bodies, and non-functions are **unsupported** → diagnostic error (reuse `SynctrolDiagnosticError` / compiler diagnostic helpers with a stable code such as `UNSUPPORTED_BACKGROUND_LOADER`).

- [ ] **Step 1: Write failing extract/emit tests**

```ts
// tests/compiler/backgrounds/extract-loader-specifier.test.ts
import { describe, expect, it } from 'vitest'
import { extractBackgroundImportSpecifier } from '../../../src/compiler/backgrounds/extract-loader-specifier'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'

describe('extractBackgroundImportSpecifier', () => {
  it('extracts single-quoted dynamic import specifiers', () => {
    const loader = () => import('./backgrounds/home')
    expect(extractBackgroundImportSpecifier(loader, 'home')).toBe(
      './backgrounds/home',
    )
  })

  it('extracts double-quoted dynamic import specifiers', () => {
    const loader = () => import("./backgrounds/release")
    expect(extractBackgroundImportSpecifier(loader, 'release')).toBe(
      './backgrounds/release',
    )
  })

  it('rejects unsupported loader shapes with a diagnostic', () => {
    const bad = async () => ({ default() { return { update() {}, dispose() {} } } })
    try {
      extractBackgroundImportSpecifier(bad as never, 'page')
      expect.unreachable('should throw')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      expect(String(error)).toMatch(/UNSUPPORTED_BACKGROUND_LOADER|unsupported/i)
    }
  })
})
```

```ts
// tests/compiler/backgrounds/emit-virtual-module.test.ts
import { describe, expect, it } from 'vitest'
import { emitBackgroundsVirtualModule } from '../../../src/compiler/backgrounds/emit-virtual-module'
import type { BackgroundLoader } from '../../../src/shared/background'

describe('emitBackgroundsVirtualModule', () => {
  it('emits an empty default export when no loaders are configured', () => {
    expect(emitBackgroundsVirtualModule({}, '/site/.vuepress')).toBe(
      'export default {}\n',
    )
  })

  it('emits resolved absolute import ids for configured keys', () => {
    const backgrounds = {
      home: (() => import('./backgrounds/home')) as BackgroundLoader,
      news: (() => import('./backgrounds/news')) as BackgroundLoader,
    }
    const source = emitBackgroundsVirtualModule(
      backgrounds,
      '/site/.vuepress',
    )
    expect(source).toContain('home: () => import(')
    expect(source).toContain('/site/.vuepress/backgrounds/home')
    expect(source).toContain('news: () => import(')
    expect(source).not.toContain('release:')
    expect(source).not.toContain('page:')
  })
})
```

Note: Vitest may transform `import()` in test files — if `Function.prototype.toString.call(loader)` no longer matches the supported forms, define loaders via `new Function('return () => import("./backgrounds/home")')()` or equivalent so extraction sees the literal source. Prefer that technique in tests if needed.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/backgrounds/extract-loader-specifier.test.ts tests/compiler/backgrounds/emit-virtual-module.test.ts`

Expected: FAIL (modules missing).

- [ ] **Step 3: Implement extract + emit**

```ts
// src/compiler/backgrounds/extract-loader-specifier.ts
import type { BackgroundLoader } from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'
import { fail } from '../diagnostics.js'

const SUPPORTED =
  /^\(\)\s*=>\s*import\(\s*(['"])([^'"]+)\1\s*\)$/

export function extractBackgroundImportSpecifier(
  loader: BackgroundLoader,
  key: ContentType,
): string {
  if (typeof loader !== 'function') {
    fail({
      severity: 'error',
      code: 'UNSUPPORTED_BACKGROUND_LOADER',
      message: `backgrounds.${key} must be () => import('…') or () => import("…")`,
    })
  }
  const source = Function.prototype.toString
    .call(loader)
    .replace(/\s+/g, ' ')
    .trim()
  const match = SUPPORTED.exec(source)
  if (!match) {
    fail({
      severity: 'error',
      code: 'UNSUPPORTED_BACKGROUND_LOADER',
      message: `backgrounds.${key} must be () => import('…') or () => import("…"); got: ${source}`,
    })
  }
  return match[2]!
}
```

```ts
// src/compiler/backgrounds/emit-virtual-module.ts
import { isAbsolute, resolve } from 'node:path'
import type { BackgroundLoader } from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'
import { extractBackgroundImportSpecifier } from './extract-loader-specifier.js'

const KEYS: ContentType[] = ['home', 'release', 'news', 'page']

export function emitBackgroundsVirtualModule(
  backgrounds: Partial<Record<ContentType, BackgroundLoader>>,
  configDir: string,
): string {
  const lines: string[] = []
  for (const key of KEYS) {
    const loader = backgrounds[key]
    if (!loader) continue
    const specifier = extractBackgroundImportSpecifier(loader, key)
    const id = isAbsolute(specifier)
      ? specifier
      : resolve(configDir, specifier)
    lines.push(`  ${key}: () => import(${JSON.stringify(id)})`)
  }
  if (lines.length === 0) return 'export default {}\n'
  return `export default {\n${lines.join(',\n')}\n}\n`
}
```

Use shipped `fail({ severity, code, message })` from `src/compiler/diagnostics.ts` (throws `SynctrolDiagnosticError`). Do not invent a two-arg `new SynctrolDiagnosticError(code, message)` constructor.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/compiler/backgrounds/extract-loader-specifier.test.ts tests/compiler/backgrounds/emit-virtual-module.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/backgrounds/extract-loader-specifier.ts \
  src/compiler/backgrounds/emit-virtual-module.ts \
  tests/compiler/backgrounds/extract-loader-specifier.test.ts \
  tests/compiler/backgrounds/emit-virtual-module.test.ts
git commit -m "feat: serialize background loaders into virtual module source"
```

---

### Task 6: Vite plugin + theme.ts PATCH + client options typing

**Files:**
- Create: `src/compiler/backgrounds/vite-plugin.ts`
- Create: `tests/compiler/backgrounds/vite-plugin.test.ts`
- Modify: `src/compiler/theme.ts` (PATCH only)
- Modify: `src/client/composables/useThemeOptions.ts` → `ClientSynctrolThemeOptions`
- Modify: `src/client/composables/keys.ts` → injection key type
- Modify: `tests/compiler/theme.integration.test.ts` and/or `tests/shared/client-options.test.ts` (assert define still omits backgrounds; assert plugin registration / routePath stamp)
- Create: `src/client/background/virtual-backgrounds.d.ts`

**Interfaces:**
- Consumes: `resolved.backgrounds`, `app.dir.source('.vuepress')`, shipped theme hooks
- Produces: Vite virtual module `virtual:synctrol-backgrounds` (alias `@synctrol/backgrounds`); stamped `frontmatter.synctrol.routePath`

- [ ] **Step 1: Write failing plugin / theme PATCH tests**

```ts
// tests/compiler/backgrounds/vite-plugin.test.ts
import { describe, expect, it } from 'vitest'
import { createSynctrolBackgroundsVitePlugin } from '../../../src/compiler/backgrounds/vite-plugin'
import { emitBackgroundsVirtualModule } from '../../../src/compiler/backgrounds/emit-virtual-module'

describe('createSynctrolBackgroundsVitePlugin', () => {
  it('resolves virtual:synctrol-backgrounds and @synctrol/backgrounds', () => {
    const plugin = createSynctrolBackgroundsVitePlugin({
      backgrounds: {},
      configDir: '/site/.vuepress',
    })
    const resolveId = plugin.resolveId!.bind(plugin)
    expect(resolveId('virtual:synctrol-backgrounds', undefined)).toBe(
      '\0virtual:synctrol-backgrounds',
    )
    expect(resolveId('@synctrol/backgrounds', undefined)).toBe(
      '\0virtual:synctrol-backgrounds',
    )
  })

  it('loads the emitted module source', () => {
    const backgrounds = {
      home: (() => import('./backgrounds/home')) as () => Promise<unknown>,
    }
    const plugin = createSynctrolBackgroundsVitePlugin({
      backgrounds: backgrounds as never,
      configDir: '/site/.vuepress',
    })
    const load = plugin.load!.bind(plugin)
    expect(load('\0virtual:synctrol-backgrounds')).toBe(
      emitBackgroundsVirtualModule(backgrounds as never, '/site/.vuepress'),
    )
  })
})
```

Extend theme integration coverage (additive asserts on existing suite or new cases):

- `theme.define.__SYNCTROL_THEME_OPTIONS__` still has **no** `backgrounds`.
- Theme object exposes `extendsBundlerOptions` that pushes the plugin onto `bundlerOptions.viteOptions.plugins`.
- Created page `frontmatter.synctrol.routePath` equals `compiled.url.routePath` (assert via existing theme integration harness patterns).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/compiler/backgrounds/vite-plugin.test.ts tests/shared/client-options.test.ts`

Expected: FAIL until plugin / typing / PATCH land.

- [ ] **Step 3: Implement plugin, theme PATCH, typing fixes**

```ts
// src/compiler/backgrounds/vite-plugin.ts
import type { Plugin } from 'vite'
import type { BackgroundLoader } from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'
import { emitBackgroundsVirtualModule } from './emit-virtual-module.js'

const VIRTUAL_ID = 'virtual:synctrol-backgrounds'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

export function createSynctrolBackgroundsVitePlugin(options: {
  backgrounds: Partial<Record<ContentType, BackgroundLoader>>
  configDir: string
}): Plugin {
  return {
    name: 'synctrol-backgrounds',
    resolveId(id) {
      if (id === VIRTUAL_ID || id === '@synctrol/backgrounds') {
        return RESOLVED_ID
      }
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return emitBackgroundsVirtualModule(
          options.backgrounds,
          options.configDir,
        )
      }
    },
  }
}
```

`theme.ts` PATCH (additive — preserve all Plan 03–05 behavior):

```ts
// inside synctrolTheme return object — ADD:
extendsBundlerOptions: (bundlerOptions, app) => {
  const configDir = app.dir.source('.vuepress')
  const viteOptions = ((bundlerOptions as { viteOptions?: { plugins?: unknown[] } })
    .viteOptions ??= {})
  viteOptions.plugins ??= []
  viteOptions.plugins.push(
    createSynctrolBackgroundsVitePlugin({
      backgrounds: resolved.backgrounds,
      configDir,
    }),
  )
},
```

And in the `createPage` frontmatter.synctrol object, **add**:

```ts
routePath: compiled.url.routePath,
```

Typing fix:

```ts
// src/client/composables/useThemeOptions.ts
import type { ClientSynctrolThemeOptions } from '../../shared/client-options.js'
declare const __SYNCTROL_THEME_OPTIONS__: ClientSynctrolThemeOptions
export function useThemeOptions(): ClientSynctrolThemeOptions { /* … */ }
```

```ts
// src/client/composables/keys.ts
import type { ClientSynctrolThemeOptions } from '../../shared/client-options.js'
export const SYNCTROL_THEME_OPTIONS_KEY: InjectionKey<ClientSynctrolThemeOptions> =
  Symbol('synctrol-theme-options')
```

Ambient module:

```ts
// src/client/background/virtual-backgrounds.d.ts
declare module 'virtual:synctrol-backgrounds' {
  import type { BackgroundLoader } from '../../shared/background.js'
  import type { ContentType } from '../../shared/types.js'
  const loaders: Partial<Record<ContentType, BackgroundLoader>>
  export default loaders
}

declare module '@synctrol/backgrounds' {
  export { default } from 'virtual:synctrol-backgrounds'
}
```

Ensure `vite` types are available (already a devDependency). `extendsBundlerOptions` mutates `viteOptions.plugins` on the opaque `BundlerOptions` record — document Vite bundler only for this plan.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- \
  tests/compiler/backgrounds/vite-plugin.test.ts \
  tests/shared/client-options.test.ts \
  tests/compiler/theme.integration.test.ts
```

Expected: PASS; client options still omit `backgrounds`.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/backgrounds/vite-plugin.ts src/compiler/theme.ts \
  src/client/composables/useThemeOptions.ts src/client/composables/keys.ts \
  src/client/background/virtual-backgrounds.d.ts \
  tests/compiler/backgrounds/vite-plugin.test.ts \
  tests/compiler/theme.integration.test.ts tests/shared/client-options.test.ts
git commit -m "feat: register virtual backgrounds module and stamp routePath"
```

---

### Task 7: Shared resolved color mode (extend Plan 05)

**Files:**
- Modify: `src/client/composables/useColorMode.ts` (singleton + export `useResolvedColorMode`)
- Create or modify: `tests/client/color-mode/use-color-mode-shared.test.ts` (or extend existing ThemeMode / color-mode tests)
- Re-export from `src/client/color-mode/` only if a thin path is useful; prefer one shared implementation

**Interfaces:**
- Consumes: Plan 05 color-mode helpers (`cycle`, `resolve`, `storage`, `useThemeOptions`)
- Produces: module-level singleton `{ preference, surface, cycle }`; `useResolvedColorMode(): Ref<'light' | 'dark'>`

- [ ] **Step 1: Write failing shared-surface tests**

```ts
// tests/client/color-mode/use-color-mode-shared.test.ts
import { afterEach, describe, expect, it } from 'vitest'
import {
  __resetColorModeStateForTests,
  useColorMode,
  useResolvedColorMode,
} from '../../../src/client/composables/useColorMode'

describe('shared color mode surface', () => {
  afterEach(() => {
    __resetColorModeStateForTests()
  })

  it('returns the same preference/surface for multiple callers', () => {
    const a = useColorMode()
    const b = useColorMode()
    expect(a.preference).toBe(b.preference)
    expect(a.surface).toBe(b.surface)
    expect(useResolvedColorMode()).toBe(a.surface)
  })

  it('updates useResolvedColorMode when preference cycles to a concrete mode', () => {
    const { preference, cycle } = useColorMode()
    const resolved = useResolvedColorMode()
    // Force a deterministic non-auto preference for the assertion:
    while (preference.value === 'auto') cycle()
    const after = preference.value
    expect(after === 'light' || after === 'dark').toBe(true)
    expect(resolved.value).toBe(after)
  })
})
```

- [ ] **Step 2: Run test to verify it fails / shows separate instances**

Run: `npm test -- tests/client/color-mode/use-color-mode-shared.test.ts`

Expected: FAIL until singleton lands (today each `useColorMode()` creates local refs).

- [ ] **Step 3: Adapt useColorMode to singleton + export useResolvedColorMode**

Refactor shipped `useColorMode` so the preference/surface/media wiring is created once per module:

```ts
// src/client/composables/useColorMode.ts — sketch
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
// …existing imports…

type ColorModeApi = {
  preference: Ref<ColorModePreference>
  surface: Ref<'light' | 'dark'>
  cycle: () => void
}

let shared: ColorModeApi | null = null

function createColorModeState(): ColorModeApi {
  // move current useColorMode body here (preference, prefersDark, surface, cycle, media)
  // …
  return { preference, surface, cycle }
}

export function useColorMode(): ColorModeApi {
  if (!shared) shared = createColorModeState()
  return shared
}

export function useResolvedColorMode(): Ref<'light' | 'dark'> {
  return useColorMode().surface
}

/** Test-only reset between cases. */
export function __resetColorModeStateForTests(): void {
  shared = null
}
```

Keep ThemeMode importing `useColorMode` unchanged. Existing ThemeMode tests should still pass; reset singleton in `afterEach` where mounts share module state.

This **extends** Plan 05 files — do not invent a second color-mode store under `src/client/background/`.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- \
  tests/client/color-mode/use-color-mode-shared.test.ts \
  tests/client/components/ThemeMode.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/composables/useColorMode.ts \
  tests/client/color-mode/use-color-mode-shared.test.ts
git commit -m "feat: share resolved color mode surface for backgrounds"
```

---

### Task 8: BackgroundHost — client-only mount without layout size ownership

**Files:**
- Create: `src/client/background/BackgroundHost.vue`
- Create: `src/client/background/background-host.css`
- Modify: `src/client/styles/shell.css` (transparent shell background)
- Create: `tests/client/background/BackgroundHost.test.ts`

**Interfaces:**
- Consumes: `BackgroundRuntime` via props; host element ref
- Produces: `.syn-background` full-bleed decorative layer that does not participate in shell grid sizing

- [ ] **Step 1: Write the failing host tests**

```ts
// tests/client/background/BackgroundHost.test.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BackgroundHost from '../../../src/client/background/BackgroundHost.vue'
import { BackgroundRuntime } from '../../../src/client/background/runtime'
import { solidProbeLoader, solidProbeLog } from '../../fixtures/backgrounds/solid-probe'

describe('BackgroundHost', () => {
  it('renders a full-bleed host that does not own layout size', () => {
    const runtime = new BackgroundRuntime({ backgrounds: {} })
    const wrapper = mount(BackgroundHost, {
      props: { runtime },
      attachTo: document.body,
    })

    const el = wrapper.get('.syn-background').element as HTMLElement
    const style = getComputedStyle(el)
    expect(style.position).toBe('fixed')
    expect(style.inset).toBe('0px')
    expect(style.pointerEvents).toBe('none')
    expect(style.zIndex).toBe('0')
    expect(el.style.gridArea).toBe('')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.dataset.synBackground).toBe('solid')
    wrapper.unmount()
  })

  it('keeps shell content stacked above the fixed background layer', () => {
    // Mount minimal shell + host so stacking CSS is asserted (content above z-index:0).
    const runtime = new BackgroundRuntime({ backgrounds: {} })
    const root = document.createElement('div')
    root.innerHTML = `
      <div class="syn-shell">
        <header class="syn-header"></header>
        <main class="syn-main"><div class="syn-main__inner">content</div></main>
        <nav class="syn-navigation"></nav>
        <footer class="syn-site-footer"></footer>
        <div class="syn-shell__dock"></div>
      </div>
    `
    document.body.appendChild(root)
    const hostMount = document.createElement('div')
    document.body.appendChild(hostMount)
    const wrapper = mount(BackgroundHost, {
      props: { runtime },
      attachTo: hostMount,
    })

    const bg = getComputedStyle(wrapper.get('.syn-background').element)
    const main = getComputedStyle(root.querySelector('.syn-main') as HTMLElement)
    const header = getComputedStyle(root.querySelector('.syn-header') as HTMLElement)
    expect(bg.zIndex).toBe('0')
    expect(Number(main.zIndex)).toBeGreaterThan(Number(bg.zIndex))
    expect(Number(header.zIndex)).toBeGreaterThan(Number(bg.zIndex))
    expect(main.position).toMatch(/relative|sticky|absolute|fixed/)
    wrapper.unmount()
    root.remove()
    hostMount.remove()
  })

  it('initializes only after the host element exists (client mount)', async () => {
    solidProbeLog.length = 0
    const runtime = new BackgroundRuntime({
      backgrounds: { home: solidProbeLoader },
    })
    const wrapper = mount(BackgroundHost, {
      props: {
        runtime,
        syncInput: {
          contentType: 'home' as const,
          route: '/zh/',
          locale: 'zh',
          colorMode: 'light' as const,
          reducedMotion: false,
        },
      },
      attachTo: document.body,
    })
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog[0]).toMatch(/^init:/)
    wrapper.unmount()
    expect(solidProbeLog).toContain('dispose')
  })
})
```

Do **not** add `npm install` for Vue test tooling (already in package.json). Do **not** rewrite Vitest to `environmentMatchGlobs`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/background/BackgroundHost.test.ts`

Expected: FAIL because `BackgroundHost.vue` does not exist.

- [ ] **Step 3: Implement host CSS, shell transparency, and component**

```css
/* src/client/background/background-host.css */
.syn-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background-color: var(--syn-bg);
}

/* Content above decorative background — do not raise the whole .syn-shell
   (dock/drawer keep Plan 05 z-index: 20 / 40). */
.syn-shell > .syn-header,
.syn-shell > .syn-main,
.syn-shell > .syn-navigation,
.syn-shell > .syn-site-footer {
  position: relative;
  z-index: 1;
}
```

In `src/client/styles/shell.css`, change `.syn-shell` `background: var(--syn-bg)` → `background: transparent` (host owns the solid fallback). Keep dock/drawer z-index rules from Plan 05 intact — do **not** blanket-set `.syn-shell { position: relative; z-index: 1 }` in a way that fights those rules. Content-above-background is the explicit `z-index: 1` on shell content children above (asserted in BackgroundHost tests). If stacking still needs a local stacking context, prefer `isolation: isolate` on `.syn-shell` only when tests show docks incorrectly sit under the host.

```vue
<!-- src/client/background/BackgroundHost.vue -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BackgroundRuntime, BackgroundSyncInput } from './runtime.js'
import './background-host.css'

const props = defineProps<{
  runtime: BackgroundRuntime
  syncInput?: BackgroundSyncInput | null
}>()

const hostRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!hostRef.value) return
  props.runtime.setHost(hostRef.value)
  if (props.syncInput) {
    void props.runtime.sync(props.syncInput)
  }
})

watch(
  () => props.syncInput,
  (input) => {
    if (!input || !hostRef.value) return
    void props.runtime.sync(input)
  },
  { deep: true },
)

onBeforeUnmount(() => {
  props.runtime.dispose()
})
</script>

<template>
  <div
    ref="hostRef"
    class="syn-background"
    data-syn-background="solid"
    aria-hidden="true"
  />
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/background/BackgroundHost.test.ts`

Expected: PASS. Re-run any Plan 05 shell CSS tests if they assert `.syn-shell` background.

- [ ] **Step 5: Commit**

```bash
git add src/client/background/BackgroundHost.vue src/client/background/background-host.css \
  src/client/styles/shell.css tests/client/background/BackgroundHost.test.ts
git commit -m "feat: add client-only BackgroundHost without layout ownership"
```

---

### Task 9: Wire route, locale, colorMode, reducedMotion + Layout

**Files:**
- Create: `src/client/background/use-background-runtime.ts`
- Create: `src/client/background/index.ts` (TS-only barrel — **no** `BackgroundHost` export required for package `./client`)
- Create: `tests/client/background/use-background-runtime.test.ts`
- Modify: `src/client/layouts/Layout.vue` — import host directly; mount above shell
- Modify: `src/client/index.ts` — optional pure-TS re-exports only; **forbidden** to export `.vue`

**Interfaces:**
- Consumes: `virtual:synctrol-backgrounds`, `useResolvedColorMode()`, VuePress `useData()` / route path, `frontmatter.synctrol`
- Produces: `useBackgroundRuntime()` returning `{ runtime, syncInput }`; Layout mounts host on content pages only

- [ ] **Step 1: Write the failing composable tests**

Mock VuePress data as **nested** frontmatter (not `page.synctrol`):

```ts
// tests/client/background/use-background-runtime.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useBackgroundRuntime } from '../../../src/client/background/use-background-runtime'
import { solidProbeLoader, solidProbeLog } from '../../fixtures/backgrounds/solid-probe'
import type { SynctrolClientPageData } from '../../../src/client/background/types'
import { __resetColorModeStateForTests } from '../../../src/client/composables/useColorMode'

const routePath = ref('/zh/')
const synctrol = ref<SynctrolClientPageData>({
  locale: 'zh',
  contentType: 'home',
  routePath: '/zh/',
})
const colorMode = ref<'light' | 'dark'>('light')
const reducedMotionMatches = ref(false)

vi.mock('vuepress/client', () => ({
  useData: () => ({
    page: ref({
      path: routePath.value,
      get frontmatter() {
        return { synctrol: synctrol.value }
      },
    }),
    siteData: ref({ base: '/' }),
  }),
  useRoute: () => ({
    get path() {
      return routePath.value
    },
  }),
}))

vi.mock('virtual:synctrol-backgrounds', () => ({
  default: {
    home: solidProbeLoader,
    release: solidProbeLoader,
  },
}))

vi.mock('../../../src/client/composables/useColorMode', async () => {
  const actual = await vi.importActual<
    typeof import('../../../src/client/composables/useColorMode')
  >('../../../src/client/composables/useColorMode')
  return {
    ...actual,
    useResolvedColorMode: () => colorMode,
  }
})

vi.mock('../../../src/client/background/reduced-motion', async () => {
  const actual = await vi.importActual<
    typeof import('../../../src/client/background/reduced-motion')
  >('../../../src/client/background/reduced-motion')
  return {
    ...actual,
    readReducedMotion: () => reducedMotionMatches.value,
    subscribeReducedMotion: (listener: (value: boolean) => void) => {
      ;(subscribeReducedMotion as unknown as { _emit?: (v: boolean) => void })._emit = (
        value: boolean,
      ) => {
        reducedMotionMatches.value = value
        listener(value)
      }
      return () => {}
    },
  }
})

import { subscribeReducedMotion } from '../../../src/client/background/reduced-motion'

function mountHarness() {
  const Harness = defineComponent({
    setup() {
      const { runtime, syncInput } = useBackgroundRuntime()
      return () =>
        h('div', { class: 'syn-shell' }, [
          h('div', {
            class: 'syn-background',
            ref: (el) => {
              if (el instanceof HTMLElement) {
                runtime.setHost(el)
                if (syncInput.value) void runtime.sync(syncInput.value)
              }
            },
          }),
        ])
    },
  })
  return mount(Harness, { attachTo: document.body })
}

describe('useBackgroundRuntime', () => {
  afterEach(() => {
    solidProbeLog.length = 0
    routePath.value = '/zh/'
    synctrol.value = {
      locale: 'zh',
      contentType: 'home',
      routePath: '/zh/',
    }
    colorMode.value = 'light'
    reducedMotionMatches.value = false
    __resetColorModeStateForTests()
    document.body.innerHTML = ''
  })

  it('updates on route, locale, colorMode, and reducedMotion changes', async () => {
    const wrapper = mountHarness()
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog[0]).toMatch(/^init:\/zh\/:zh:light:false$/)

    routePath.value = '/zh/releases/'
    synctrol.value = {
      locale: 'zh',
      contentType: 'release-collection',
      routePath: '/zh/releases/',
    }
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog).toContain('dispose')
    expect(solidProbeLog.at(-1)).toMatch(/^init:\/zh\/releases\/:zh:light:false$/)

    synctrol.value = {
      locale: 'en',
      contentType: 'release-collection',
      routePath: '/en/releases/',
    }
    routePath.value = '/en/releases/'
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog.at(-1)).toMatch(/^update:\/en\/releases\/:en:light:false$/)

    colorMode.value = 'dark'
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog.at(-1)).toMatch(/^update:\/en\/releases\/:en:dark:false$/)

    const emit = (
      subscribeReducedMotion as unknown as { _emit?: (v: boolean) => void }
    )._emit
    emit?.(true)
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog.at(-1)).toMatch(/^update:\/en\/releases\/:en:dark:true$/)

    wrapper.unmount()
  })

  it('does not load a background when synctrol contentType is missing', async () => {
    synctrol.value = {
      locale: 'zh',
      contentType: undefined as never,
      routePath: '/',
    }
    // Prefer: omit contentType entirely in the mock frontmatter for this case.
    const wrapper = mountHarness()
    await nextTick()
    await Promise.resolve()
    // When contentType is absent, syncInput is null — no module init.
    expect(solidProbeLog).toEqual([])
    wrapper.unmount()
  })
})
```

If Vitest cannot resolve the virtual module mock by bare id, add a Vitest alias in the **client project** only:

```ts
// vitest.config.ts client project
resolve: {
  alias: {
    'virtual:synctrol-backgrounds': fileURLToPath(
      new URL('./tests/fixtures/backgrounds/virtual-backgrounds-mock.ts', import.meta.url),
    ),
  },
},
```

Keep that as an extension of projects — still no `environmentMatchGlobs`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/background/use-background-runtime.test.ts`

Expected: FAIL because `useBackgroundRuntime` does not exist.

- [ ] **Step 3: Implement composable, TS barrel, Layout wiring**

```ts
// src/client/background/use-background-runtime.ts
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useData, useRoute } from 'vuepress/client'
import backgroundLoaders from 'virtual:synctrol-backgrounds'
import { useResolvedColorMode } from '../composables/useColorMode.js'
import {
  readReducedMotion,
  subscribeReducedMotion,
} from './reduced-motion.js'
import { BackgroundRuntime, type BackgroundSyncInput } from './runtime.js'
import type { SynctrolClientPageData } from './types.js'

export function useBackgroundRuntime(): {
  runtime: BackgroundRuntime
  syncInput: Ref<BackgroundSyncInput | null>
} {
  const runtime = new BackgroundRuntime({
    backgrounds: backgroundLoaders ?? {},
  })
  const route = useRoute()
  const { page } = useData()
  const colorMode = useResolvedColorMode()
  const reducedMotion = ref(readReducedMotion())

  const unsubscribeMotion = subscribeReducedMotion((value) => {
    reducedMotion.value = value
  })

  const syncInput = computed<BackgroundSyncInput | null>(() => {
    const data = page.value.frontmatter.synctrol as
      | SynctrolClientPageData
      | undefined
    if (!data?.contentType) return null
    return {
      contentType: data.contentType,
      route: data.routePath || route.path || page.value.path,
      locale: data.locale,
      colorMode: colorMode.value,
      reducedMotion: reducedMotion.value,
    }
  })

  watch(
    syncInput,
    (input) => {
      if (!input) {
        runtime.dispose()
        return
      }
      void runtime.sync(input)
    },
    { deep: true },
  )

  onBeforeUnmount(() => {
    unsubscribeMotion()
    runtime.dispose()
  })

  return { runtime, syncInput }
}
```

```ts
// src/client/background/index.ts — TS only
export type {
  BackgroundContext,
  BackgroundController,
  BackgroundLoader,
  BackgroundModule,
} from '../../shared/background.js'
export { resolveBackgroundContentType } from './resolve-type.js'
export {
  readReducedMotion,
  subscribeReducedMotion,
  REDUCED_MOTION_QUERY,
} from './reduced-motion.js'
export { BackgroundRuntime } from './runtime.js'
export type {
  BackgroundRuntimeOptions,
  BackgroundSyncInput,
} from './runtime.js'
export { useBackgroundRuntime } from './use-background-runtime.js'
export type { SynctrolClientPageData } from './types.js'
// Forbidden: export BackgroundHost.vue
```

Layout excerpt (NodeNext `.js` on TS imports; `.vue` stays `.vue`):

```vue
<!-- src/client/layouts/Layout.vue — additive excerpt -->
<script setup lang="ts">
import BackgroundHost from '../background/BackgroundHost.vue'
import { useBackgroundRuntime } from '../background/use-background-runtime.js'
// …existing imports…

const { runtime, syncInput } = useBackgroundRuntime()
</script>

<template>
  <BackgroundHost :runtime="runtime" :sync-input="syncInput" />
  <ShellLayout>
    <Content />
  </ShellLayout>
</template>
```

Optional `src/client/index.ts` extension — pure TS only:

```ts
export {
  resolveBackgroundContentType,
  BackgroundRuntime,
  useBackgroundRuntime,
} from './background/index.js'
// Forbidden: export BackgroundHost
```

Confirm root language router HTML from Plan 03 still contains no `syn-background` mount.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/background/use-background-runtime.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/background/use-background-runtime.ts src/client/background/index.ts \
  src/client/layouts/Layout.vue src/client/index.ts \
  tests/client/background/use-background-runtime.test.ts vitest.config.ts
git commit -m "feat: wire background runtime to route locale colorMode motion"
```

---

### Task 10: Theme config API example, content.yml exclusion, root-router guarantee

**Files:**
- Create: `tests/client/background/config-and-root.test.ts`
- Create: `tests/fixtures/backgrounds/theme-config-example.ts`
- Modify: `README.md` — Backgrounds subsection (virtual-module delivery note)

**Interfaces:**
- Consumes: Plan 01 `resolveThemeOptions`; Plan 02 `parseContentManifest(path, packageDir)`; Plan 03 `generateRootRouterHtml({ options, base })`
- Produces: regression coverage for config keys, ILLEGAL_BACKGROUND, root-router exclusion

- [ ] **Step 1: Write the failing integration-style tests**

```ts
// tests/fixtures/backgrounds/theme-config-example.ts
import type { BackgroundModule } from '../../../src/shared/background'

const emptyModule: BackgroundModule = {
  default() {
    return {
      update() {},
      dispose() {},
    }
  },
}

/** Canonical theme config shape — selection by content type only. */
export const exampleBackgrounds = {
  home: async () => emptyModule,
  release: async () => emptyModule,
  news: async () => emptyModule,
  page: async () => emptyModule,
}
```

```ts
// tests/client/background/config-and-root.test.ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveThemeOptions } from '../../../src/shared/options'
import { exampleBackgrounds } from '../../fixtures/backgrounds/theme-config-example'
import { generateRootRouterHtml } from '../../../src/compiler/root-router-html'
import { parseContentManifest } from '../../../src/compiler/manifest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
import { BackgroundRuntime } from '../../../src/client/background/runtime'
import { themeOptions } from '../../helpers/route-fixtures'
import type { ContentType } from '../../../src/shared/types'
import type { SynctrolThemeOptions } from '../../../src/shared/options'

/** Minimal valid theme *input* (not resolved) — mirror tests/shared/client-options.test.ts. */
const baseInput = {
  siteUrl: 'https://synctrol.com',
  mainLocale: 'zh',
  locales: {
    zh: { lang: 'zh-CN', label: '中文' },
    en: { lang: 'en-US', label: 'English' },
  },
  copyright: '© Synctrol',
  seo: {
    name: 'Synctrol',
    description: 'Official website of the Synctrol music team',
    defaultImage: './assets/social-default.webp',
    organization: { name: 'Synctrol', logo: './assets/logo.svg' },
    collections: {
      release: { title: 'Releases', description: 'Synctrol releases' },
      news: { title: 'News', description: 'Synctrol news' },
    },
  },
} as const satisfies SynctrolThemeOptions

const temporaryRoots = new Set<string>()

afterEach(() => {
  for (const root of temporaryRoots) {
    rmSync(root, { force: true, recursive: true })
  }
  temporaryRoots.clear()
})

describe('background theme config and exclusions', () => {
  it('accepts backgrounds keyed only by home/release/news/page', () => {
    const resolved = resolveThemeOptions({
      ...baseInput,
      backgrounds: exampleBackgrounds,
    })
    const keys = Object.keys(resolved.backgrounds).sort()
    expect(keys).toEqual(['home', 'news', 'page', 'release'])
    for (const key of keys as ContentType[]) {
      expect(typeof resolved.backgrounds[key]).toBe('function')
    }
  })

  it('defaults backgrounds to an empty object (solid fallback everywhere)', () => {
    const resolved = resolveThemeOptions({ ...baseInput })
    expect(resolved.backgrounds).toEqual({})
  })

  it('rejects background in content.yml via Plan 02 schema', () => {
    const root = mkdtempSync(join(tmpdir(), 'synctrol-bg-manifest-'))
    temporaryRoots.add(root)
    const dir = join(root, 'about')
    mkdirSync(dir)
    const path = join(dir, 'content.yml')
    writeFileSync(path, 'type: page\nbackground: ./bg.ts\n', 'utf8')
    try {
      parseContentManifest(path, dir)
      expect.unreachable('should throw')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      expect(String(error)).toMatch(/background|ILLEGAL_BACKGROUND/i)
    }
  })

  it('root language router HTML does not mount or import backgrounds', () => {
    const html = generateRootRouterHtml({
      options: themeOptions(),
      base: '/',
    })
    expect(html).not.toMatch(/syn-background/i)
    expect(html).not.toMatch(/BackgroundHost|BackgroundRuntime|virtual:synctrol-backgrounds/i)
    expect(html).toMatch(/synctrol:locale/)
  })

  it('runtime still paints solid when config omits a type even if others exist', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const runtime = new BackgroundRuntime({
      backgrounds: { home: exampleBackgrounds.home },
    })
    runtime.setHost(host)
    await runtime.sync({
      contentType: 'page',
      route: '/zh/about/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(host.dataset.synBackground).toBe('solid')
    runtime.dispose()
    host.remove()
  })
})
```

Use `baseInput` (SynctrolThemeOptions) with `resolveThemeOptions` — do **not** spread `themeOptions()` (already resolved) back into the resolver. `generateRootRouterHtml` takes `{ options: themeOptions(), base: '/' }` per HEAD.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/background/config-and-root.test.ts`

Expected: FAIL until fixture/README wiring completes; compiler APIs themselves already exist.

- [ ] **Step 3: Add README backgrounds section**

```md
## Backgrounds

Background modules are selected only in theme configuration by content type.
Loaders must be dynamic-import arrows so the theme can emit a Vite virtual module
(`virtual:synctrol-backgrounds`); they are **not** serialized through
`__SYNCTROL_THEME_OPTIONS__`.

```ts
import { synctrolTheme } from 'vuepress-theme-synctrolling'

export default {
  theme: synctrolTheme({
    // …required options…
    backgrounds: {
      home: () => import('./backgrounds/home'),
      release: () => import('./backgrounds/release'),
      news: () => import('./backgrounds/news'),
      page: () => import('./backgrounds/page'),
    },
  }),
}
```

Each module default-exports `(context) => ({ update, dispose })`. Missing keys
render an empty solid `--syn-bg` surface. `content.yml` cannot set `background`.
The root language router page does not load a background module.
```

No production default decorative modules are shipped.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/background/config-and-root.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/client/background/config-and-root.test.ts \
  tests/fixtures/backgrounds/theme-config-example.ts README.md
git commit -m "test: lock background config selection and root-router exclusion"
```

---

### Task 11: Plan 06 verification suite

**Files:**
- Modify: none required beyond ensuring all tests green
- Optional aggregator: skip unless a local runner needs it (prefer explicit file list)

**Interfaces:**
- Consumes: all Task 1–10 deliverables
- Produces: green Plan 06 gate

- [ ] **Step 1: Run the full Plan 06 related suite**

```bash
npm test -- \
  tests/client/background/background-types.test.ts \
  tests/compiler/backgrounds/extract-loader-specifier.test.ts \
  tests/compiler/backgrounds/emit-virtual-module.test.ts \
  tests/compiler/backgrounds/vite-plugin.test.ts \
  tests/client/background/resolve-type.test.ts \
  tests/client/background/reduced-motion.test.ts \
  tests/client/background/runtime.test.ts \
  tests/client/background/BackgroundHost.test.ts \
  tests/client/background/use-background-runtime.test.ts \
  tests/client/background/config-and-root.test.ts \
  tests/client/color-mode/use-color-mode-shared.test.ts \
  tests/shared/client-options.test.ts \
  tests/compiler/theme.integration.test.ts
```

Expected: all PASS after Tasks 1–10.

- [ ] **Step 2: Typecheck + full suite**

Run:

```bash
npm run test:typecheck
npm test
```

Expected: all existing Plan 01–05 tests plus Plan 06 background tests PASS.

- [ ] **Step 3: Commit only if an optional aggregator file was added; otherwise skip**

No empty commit. If verification needed a small fix, commit that fix with a clear message.

---

## Plan Self-Review

1. **Spec coverage (Background Runtime slice only):**
   - §3.4 / §13 per-type config `backgrounds: { home, release, news, page }` → Tasks 1, 5–6, 10
   - Client delivery via Vite virtual module (JSON-safe define preserved) → Tasks 5–6, 9
   - Selection by resolved content type; collections map to `release` / `news` → Task 2, 4
   - Nested `frontmatter.synctrol` + `routePath` stamp → Tasks 2, 6, 9
   - Shared `useResolvedColorMode` extending Plan 05 → Task 7
   - `content.yml` cannot set `background` → Task 10 (`parseContentManifest(path, packageDir)`)
   - Empty solid background when missing → Tasks 4, 8, 10
   - API `default(context) => { update, dispose }` → Tasks 1, 4
   - Client-only init; no layout size ownership; Layout-internal host; content stacked above fixed background → Tasks 8–9
   - Update on route / locale / colorMode / reducedMotion; dispose before replace → Tasks 4, 9
   - Stale pending→solid race → Task 4
   - Cleanup events / rAF / observers / DOM → Task 4 animating probe
   - Root language router does not load background → Tasks 9–10 (`generateRootRouterHtml({ options, base })`)
   - `./client` stays JS-only → Tasks 8–9
2. **Placeholders:** none (`TBD`/`TODO`/“similar to Task N” absent).
3. **Type consistency:** `BackgroundContext`, `BackgroundController`, `BackgroundModule`, `BackgroundLoader`, `BackgroundSyncInput`, `PageContentType`, `SynctrolClientPageData` (nested frontmatter), `ClientSynctrolThemeOptions`, `virtual:synctrol-backgrounds` are stable across tasks.

## Acceptance Gate

Plan 06 is complete when:

1. Theme options accept optional `backgrounds` loaders for the four content types only; client JSON projection still omits them.
2. Vite virtual module exposes the loader map; unsupported loader shapes fail at build with a diagnostic.
3. Runtime selects modules solely from resolved content type (including collection pages) via `frontmatter.synctrol`.
4. Missing loaders yield an empty solid `--syn-bg` host with no module DOM; pending→solid races cannot remount.
5. Modules follow `default → update/dispose`, dispose before replace, and clean up resources.
6. Client Layout hosts the background; root language router HTML does not; `./client` does not export `BackgroundHost.vue`. Shell content regions stack above `.syn-background` (`z-index: 0`).
7. ThemeMode and backgrounds share one resolved color-mode surface via `useResolvedColorMode`.
8. Reduced motion is supplied on every context and honored by the animating fixture.
9. `npm run test:typecheck` and `npm test` pass including all files listed in Task 11.
