# Background Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the client-only Synctrol background runtime that loads type-keyed TypeScript background modules from theme config, drives their `update`/`dispose` lifecycle, and falls back to an empty solid surface when no module is configured.

**Architecture:** A pure `resolveBackgroundContentType` maps page content types (including collection pages) onto the four theme keys `home | release | news | page`. A `BackgroundRuntime` owns module load/swap, builds `BackgroundContext`, and never sizes the shell. A Vue `BackgroundHost` mounts only inside the Plan 05 layout on content pages; the root language router HTML never hosts it. Modules export `default(context) => BackgroundController` and clean up everything they create.

**Tech Stack:** TypeScript 5.x, Vue 3, VuePress 2 client APIs, Vitest with `happy-dom` for DOM/lifecycle tests, ESM package layout from Plan 01 (`vuepress-theme-synctrolling`).

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
- All later tasks inherit these constraints.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/shared/background.ts` | `BackgroundContext`, `BackgroundController`, `BackgroundModule`, typed `BackgroundLoader` |
| `src/shared/options.ts` | Re-export / consume typed `BackgroundLoader` (Plan 01 already has the option field) |
| `src/client/background/resolve-type.ts` | Map page `contentType` → background config key |
| `src/client/background/reduced-motion.ts` | Read `prefers-reduced-motion` and subscribe to changes |
| `src/client/background/runtime.ts` | `BackgroundRuntime`: load, update, dispose-before-replace, solid fallback |
| `src/client/background/BackgroundHost.vue` | Fixed full-bleed host element; no layout grid ownership |
| `src/client/background/use-background-runtime.ts` | Wire route / locale / colorMode / reducedMotion into runtime |
| `src/client/background/index.ts` | Public client exports for backgrounds |
| `src/client/layouts/Layout.vue` | Mount `BackgroundHost` (Plan 05 shell; this plan only inserts the host) |
| `tests/shared/background-types.test.ts` | Type/API contract tests |
| `tests/client/background/resolve-type.test.ts` | Content-type → key mapping |
| `tests/client/background/reduced-motion.test.ts` | Media-query helper |
| `tests/client/background/runtime.test.ts` | Load / update / dispose / solid fallback |
| `tests/client/background/BackgroundHost.test.ts` | Host mount, client-only, no size ownership |
| `tests/client/background/use-background-runtime.test.ts` | Watcher lifecycle and root-router exclusion |
| `tests/fixtures/backgrounds/solid-probe.ts` | Fixture module that records init/update/dispose and optional animation |
| `tests/fixtures/backgrounds/animating-probe.ts` | Fixture that starts rAF/listeners and proves cleanup + reduced-motion |

**Assumed from Plan 05 (Global Shell) — must already exist before executing this plan:**

- `src/client/layouts/Layout.vue` renders the shell regions (Header, Main, Navigation, Footer, SocialLinks, LanguageSwitcher) for every content page.
- A client composable or inject provides computed color mode as `'light' | 'dark'` (resolved from ThemeMode + `prefers-color-scheme` when mode is `auto`). Name used here: `useResolvedColorMode(): Ref<'light' | 'dark'>`.
- Page data exposed to the client includes at least: `locale: string`, `contentType: ContentType | 'release-collection' | 'news-collection'`, and `routePath: string` under a theme-owned key (this plan reads `page.value.synctrol` shaped as `SynctrolClientPageData` defined below).
- Root language router remains static HTML from Plan 03 (`generateRootRouterHtml`); it is not rendered through `Layout.vue`.

**Out of scope for this plan:** building default decorative backgrounds (grid/scanline/noise/shape stay disabled), platform embeds, Release/News UI, SEO, npm package publish, and changing Plan 02 manifest validation.

---

### Task 1: Background module type contracts

**Files:**
- Create: `src/shared/background.ts`
- Create: `tests/shared/background-types.test.ts`
- Modify: `src/shared/options.ts` (replace loose `BackgroundLoader = () => Promise<unknown>` with the typed export)
- Modify: `src/index.ts` (re-export background types)

**Interfaces:**
- Consumes: `ContentType` from `src/shared/types.ts` (Plan 01)
- Produces: `BackgroundContext`, `BackgroundController`, `BackgroundModule`, `BackgroundLoader`

- [ ] **Step 1: Write the failing type-contract tests**

```ts
// tests/shared/background-types.test.ts
import { describe, expect, it } from 'vitest'
import type {
  BackgroundContext,
  BackgroundController,
  BackgroundLoader,
  BackgroundModule,
} from '../../src/shared/background'

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

Run: `npm test -- tests/shared/background-types.test.ts`

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
import type { ContentType, LocaleKey, /* …existing… */ } from './types.js'

export type { BackgroundLoader } from './background.js'
// SynctrolThemeOptions.backgrounds and ResolvedSynctrolThemeOptions.backgrounds
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/shared/background-types.test.ts`

Expected: PASS. If `document` is undefined under the default Vitest `node` environment, set this file (and later client background tests) to use `happy-dom` via a file-level directive or Vitest project config:

```ts
// vitest.config.ts — extend Plan 01 config
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['tests/client/**', 'happy-dom'],
      ['tests/shared/background-types.test.ts', 'happy-dom'],
    ],
  },
})
```

Install if missing: `npm install -D happy-dom`

Then re-run until PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/background.ts src/shared/options.ts src/index.ts tests/shared/background-types.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: add background module type contracts"
```

---

### Task 2: Resolve background key from page content type

**Files:**
- Create: `src/client/background/resolve-type.ts`
- Create: `tests/client/background/resolve-type.test.ts`
- Create: `src/client/background/types.ts` (client page-data shape used by later tasks)

**Interfaces:**
- Consumes: `ContentType` from `src/shared/types.ts`; Plan 03 `CompiledPage.contentType` values including `'release-collection' | 'news-collection'`
- Produces: `resolveBackgroundContentType(contentType): ContentType`; `SynctrolClientPageData`

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

/** Theme-owned client page payload stamped by the compiler onto VuePress page data. */
export interface SynctrolClientPageData {
  locale: string
  contentType: PageContentType
  routePath: string
  /** True only for the static root language router document — never set on Layout pages. */
  isRootLanguageRouter?: boolean
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/background/resolve-type.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/background/resolve-type.ts src/client/background/types.ts tests/client/background/resolve-type.test.ts
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
- Consumes: `BackgroundLoader`, `BackgroundContext`, `BackgroundController`, `ContentType`, `resolveBackgroundContentType`, `readReducedMotion`
- Produces: `BackgroundRuntime` with `setHost(element)`, `sync(input)`, `dispose()`

- [ ] **Step 1: Write fixture modules and failing runtime tests**

```ts
// tests/fixtures/backgrounds/solid-probe.ts
import type {
  BackgroundContext,
  BackgroundController,
  BackgroundModule,
} from '../../../src/shared/background'

export const solidProbeLog: string[] = []

const mod: BackgroundModule = {
  default(context: BackgroundContext): BackgroundController {
    solidProbeLog.push(`init:${context.route}:${context.locale}:${context.colorMode}:${context.reducedMotion}`)
    context.element.dataset.probe = 'solid'
    return {
      update(next) {
        solidProbeLog.push(
          `update:${next.route}:${next.locale}:${next.colorMode}:${next.reducedMotion}`,
        )
        next.element.dataset.probe = 'solid'
      },
      dispose() {
        solidProbeLog.push('dispose')
        delete context.element.dataset.probe
      },
    }
  },
}

export default mod.default
export const solidProbeLoader = async () => mod
```

```ts
// tests/fixtures/backgrounds/animating-probe.ts
import type {
  BackgroundContext,
  BackgroundController,
  BackgroundModule,
} from '../../../src/shared/background'

export const animatingProbeState = {
  rafIds: [] as number[],
  listeners: [] as Array<{ target: EventTarget; type: string; handler: EventListener }>,
  observers: [] as Array<{ disconnect: () => void }>,
  nodes: [] as HTMLElement[],
  reducedMotionHonored: [] as boolean[],
}

function resetAnimatingProbeState(): void {
  animatingProbeState.rafIds = []
  animatingProbeState.listeners = []
  animatingProbeState.observers = []
  animatingProbeState.nodes = []
  animatingProbeState.reducedMotionHonored = []
}

export { resetAnimatingProbeState }

const mod: BackgroundModule = {
  default(context: BackgroundContext): BackgroundController {
    const node = document.createElement('div')
    node.className = 'animating-probe'
    context.element.appendChild(node)
    animatingProbeState.nodes.push(node)

    const onClick: EventListener = () => {}
    context.element.addEventListener('click', onClick)
    animatingProbeState.listeners.push({
      target: context.element,
      type: 'click',
      handler: onClick,
    })

    const observer = new MutationObserver(() => {})
    observer.observe(context.element, { childList: true })
    animatingProbeState.observers.push(observer)

    let rafId = 0
    const tick = () => {
      if (context.reducedMotion) return
      rafId = window.requestAnimationFrame(tick)
      animatingProbeState.rafIds.push(rafId)
    }

    const applyMotion = (reducedMotion: boolean) => {
      animatingProbeState.reducedMotionHonored.push(reducedMotion)
      if (reducedMotion) {
        if (rafId) window.cancelAnimationFrame(rafId)
        rafId = 0
        node.dataset.motion = 'static'
      } else {
        node.dataset.motion = 'animated'
        tick()
      }
    }

    applyMotion(context.reducedMotion)

    return {
      update(next) {
        applyMotion(next.reducedMotion)
      },
      dispose() {
        if (rafId) window.cancelAnimationFrame(rafId)
        context.element.removeEventListener('click', onClick)
        observer.disconnect()
        node.remove()
        animatingProbeState.rafIds = []
        animatingProbeState.listeners = []
        animatingProbeState.observers = []
        animatingProbeState.nodes = []
      },
    }
  },
}

export default mod.default
export const animatingProbeLoader = async () => mod
```

```ts
// tests/client/background/runtime.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackgroundRuntime } from '../../../src/client/background/runtime'
import {
  animatingProbeLoader,
  animatingProbeState,
  resetAnimatingProbeState,
} from '../../fixtures/backgrounds/animating-probe'
import {
  solidProbeLoader,
  solidProbeLog,
} from '../../fixtures/backgrounds/solid-probe'
import type { BackgroundLoader } from '../../../src/shared/background'
import type { ContentType } from '../../../src/shared/types'

describe('BackgroundRuntime', () => {
  let host: HTMLElement

  beforeEach(() => {
    host = document.createElement('div')
    host.className = 'syn-background'
    document.body.appendChild(host)
    solidProbeLog.length = 0
    resetAnimatingProbeState()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function run(
    backgrounds: Partial<Record<ContentType, BackgroundLoader>>,
    input: {
      contentType: ContentType | 'release-collection' | 'news-collection'
      route: string
      locale: string
      colorMode: 'light' | 'dark'
      reducedMotion: boolean
    },
  ) {
    const runtime = new BackgroundRuntime({ backgrounds })
    runtime.setHost(host)
    return runtime.sync(input).then(() => runtime)
  }

  it('loads the module for the resolved content type and initializes with context', async () => {
    const runtime = await run(
      { home: solidProbeLoader },
      {
        contentType: 'home',
        route: '/zh/',
        locale: 'zh',
        colorMode: 'dark',
        reducedMotion: false,
      },
    )
    expect(solidProbeLog).toEqual(['init:/zh/:zh:dark:false'])
    expect(host.dataset.probe).toBe('solid')
    expect(host.dataset.synBackground).toBe('module')
    runtime.dispose()
  })

  it('uses the release module for release-collection pages', async () => {
    const runtime = await run(
      { release: solidProbeLoader },
      {
        contentType: 'release-collection',
        route: '/zh/releases/',
        locale: 'zh',
        colorMode: 'light',
        reducedMotion: true,
      },
    )
    expect(solidProbeLog[0]).toBe('init:/zh/releases/:zh:light:true')
    runtime.dispose()
  })

  it('uses the news module for news-collection pages', async () => {
    const runtime = await run(
      { news: solidProbeLoader },
      {
        contentType: 'news-collection',
        route: '/en/news/tags/release/',
        locale: 'en',
        colorMode: 'light',
        reducedMotion: false,
      },
    )
    expect(solidProbeLog[0]).toContain('/en/news/tags/release/')
    runtime.dispose()
  })

  it('renders an empty solid background when the loader is missing', async () => {
    const runtime = await run(
      {},
      {
        contentType: 'page',
        route: '/zh/about/',
        locale: 'zh',
        colorMode: 'light',
        reducedMotion: false,
      },
    )
    expect(solidProbeLog).toEqual([])
    expect(host.dataset.synBackground).toBe('solid')
    expect(host.childNodes.length).toBe(0)
    expect(getComputedStyle(host).backgroundColor).not.toBe('')
    runtime.dispose()
  })

  it('calls update when route/locale/colorMode/reducedMotion change for the same module', async () => {
    const runtime = new BackgroundRuntime({
      backgrounds: { home: solidProbeLoader },
    })
    runtime.setHost(host)
    await runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    await runtime.sync({
      contentType: 'home',
      route: '/en/',
      locale: 'en',
      colorMode: 'dark',
      reducedMotion: true,
    })
    expect(solidProbeLog).toEqual([
      'init:/zh/:zh:light:false',
      'update:/en/:en:dark:true',
    ])
    runtime.dispose()
  })

  it('disposes the current module before replacing it with another type', async () => {
    const runtime = new BackgroundRuntime({
      backgrounds: {
        home: solidProbeLoader,
        page: solidProbeLoader,
      },
    })
    runtime.setHost(host)
    await runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    await runtime.sync({
      contentType: 'page',
      route: '/zh/team/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(solidProbeLog).toEqual([
      'init:/zh/:zh:light:false',
      'dispose',
      'init:/zh/team/:zh:light:false',
    ])
    runtime.dispose()
  })

  it('disposes before switching from a module to solid fallback', async () => {
    const runtime = new BackgroundRuntime({
      backgrounds: { home: solidProbeLoader },
    })
    runtime.setHost(host)
    await runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    await runtime.sync({
      contentType: 'page',
      route: '/zh/team/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(solidProbeLog).toEqual([
      'init:/zh/:zh:light:false',
      'dispose',
    ])
    expect(host.dataset.synBackground).toBe('solid')
    runtime.dispose()
  })

  it('requires modules to clean up events, raf, observers, and DOM on dispose', async () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const runtime = await run(
      { page: animatingProbeLoader },
      {
        contentType: 'page',
        route: '/zh/about/',
        locale: 'zh',
        colorMode: 'light',
        reducedMotion: false,
      },
    )
    expect(animatingProbeState.nodes).toHaveLength(1)
    expect(animatingProbeState.listeners).toHaveLength(1)
    expect(animatingProbeState.observers).toHaveLength(1)
    expect(animatingProbeState.reducedMotionHonored[0]).toBe(false)

    runtime.dispose()

    expect(host.querySelector('.animating-probe')).toBeNull()
    expect(animatingProbeState.nodes).toHaveLength(0)
    expect(animatingProbeState.listeners).toHaveLength(0)
    expect(animatingProbeState.observers).toHaveLength(0)
    expect(cancelSpy).toHaveBeenCalled()
    cancelSpy.mockRestore()
  })

  it('passes reducedMotion so modules can disable animation', async () => {
    const runtime = await run(
      { page: animatingProbeLoader },
      {
        contentType: 'page',
        route: '/zh/about/',
        locale: 'zh',
        colorMode: 'light',
        reducedMotion: true,
      },
    )
    expect(animatingProbeState.reducedMotionHonored).toContain(true)
    expect(host.querySelector('.animating-probe')?.getAttribute('data-motion')).toBe(
      'static',
    )
    runtime.dispose()
  })

  it('ignores sync before setHost and remains safe on the server', async () => {
    const runtime = new BackgroundRuntime({
      backgrounds: { home: solidProbeLoader },
    })
    await runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    expect(solidProbeLog).toEqual([])
    runtime.dispose()
  })
})
```

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

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/background/runtime.ts tests/client/background/runtime.test.ts tests/fixtures/backgrounds/solid-probe.ts tests/fixtures/backgrounds/animating-probe.ts
git commit -m "feat: add background runtime load update dispose lifecycle"
```

---

### Task 5: BackgroundHost — client-only mount without layout size ownership

**Files:**
- Create: `src/client/background/BackgroundHost.vue`
- Create: `src/client/background/background-host.css`
- Create: `tests/client/background/BackgroundHost.test.ts`
- Modify: `vitest.config.ts` if Vue SFC testing needs `@vue/test-utils` + Vue plugin (install as needed)

**Interfaces:**
- Consumes: `BackgroundRuntime` via prop/inject from Task 6; host element ref
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
import type { ContentType } from '../../../src/shared/types'
import type { BackgroundLoader } from '../../../src/shared/background'

describe('BackgroundHost', () => {
  it('renders a full-bleed host that does not own layout size', () => {
    const backgrounds: Partial<Record<ContentType, BackgroundLoader>> = {}
    const runtime = new BackgroundRuntime({ backgrounds })
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
    // Must not claim shell grid areas or set intrinsic layout height ownership.
    expect(el.style.gridArea).toBe('')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.dataset.synBackground).toBe('solid')
    wrapper.unmount()
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/background/BackgroundHost.test.ts`

Expected: FAIL because `BackgroundHost.vue` does not exist. Install Vue Test Utils if needed:

```bash
npm install -D @vue/test-utils @vitejs/plugin-vue
```

Ensure Vitest can compile SFCs:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['tests/client/**', 'happy-dom'],
      ['tests/shared/background-types.test.ts', 'happy-dom'],
    ],
  },
})
```

- [ ] **Step 3: Implement host CSS and component**

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

/* Shell content from Plan 05 must stack above this decorative layer. */
.syn-shell {
  position: relative;
  z-index: 1;
}
```

```vue
<!-- src/client/background/BackgroundHost.vue -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BackgroundRuntime, BackgroundSyncInput } from './runtime'
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

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/background/BackgroundHost.vue src/client/background/background-host.css tests/client/background/BackgroundHost.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: add client-only BackgroundHost without layout ownership"
```

---

### Task 6: Wire route, locale, colorMode, and reducedMotion updates

**Files:**
- Create: `src/client/background/use-background-runtime.ts`
- Create: `tests/client/background/use-background-runtime.test.ts`
- Create: `src/client/background/index.ts`
- Modify: `src/client/layouts/Layout.vue` (Plan 05) to mount `BackgroundHost` and call the composable
- Modify: `src/client/index.ts` (re-export background public API if the file exists from Plan 05; create minimal export barrel if missing)

**Interfaces:**
- Consumes: Plan 05 `useResolvedColorMode()`, VuePress `useRoute()` / `usePageData()`, theme `backgrounds` from resolved options injected as `synctrolThemeOptions`, Task 3–5 APIs
- Produces: `useBackgroundRuntime()` returning `{ runtime, syncInput }`; Layout mounts host on content pages only

- [ ] **Step 1: Write the failing composable tests**

```ts
// tests/client/background/use-background-runtime.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useBackgroundRuntime } from '../../../src/client/background/use-background-runtime'
import { solidProbeLoader, solidProbeLog } from '../../fixtures/backgrounds/solid-probe'
import type { SynctrolClientPageData } from '../../../src/client/background/types'
import type { ResolvedSynctrolThemeOptions } from '../../../src/shared/options'

const routePath = ref('/zh/')
const pageData = ref<SynctrolClientPageData>({
  locale: 'zh',
  contentType: 'home',
  routePath: '/zh/',
})
const colorMode = ref<'light' | 'dark'>('light')
const reducedMotionMatches = ref(false)

vi.mock('vuepress/client', () => ({
  useRoute: () => ({
    get path() {
      return routePath.value
    },
  }),
  usePageData: () =>
    ref({
      get synctrol() {
        return pageData.value
      },
    }),
}))

vi.mock('../../../src/client/color-mode/use-resolved-color-mode', () => ({
  useResolvedColorMode: () => colorMode,
}))

vi.mock('../../../src/client/background/reduced-motion', async () => {
  const actual = await vi.importActual<
    typeof import('../../../src/client/background/reduced-motion')
  >('../../../src/client/background/reduced-motion')
  return {
    ...actual,
    readReducedMotion: () => reducedMotionMatches.value,
    subscribeReducedMotion: (listener: (value: boolean) => void) => {
      const stop = () => {}
      // expose a test hook
      ;(subscribeReducedMotion as unknown as { _emit?: (v: boolean) => void })._emit = (
        value: boolean,
      ) => {
        reducedMotionMatches.value = value
        listener(value)
      }
      return stop
    },
  }
})

import { subscribeReducedMotion } from '../../../src/client/background/reduced-motion'

const themeOptions = {
  backgrounds: {
    home: solidProbeLoader,
    release: solidProbeLoader,
  },
} as unknown as ResolvedSynctrolThemeOptions

function mountHarness() {
  const Harness = defineComponent({
    setup() {
      const { runtime, syncInput } = useBackgroundRuntime(themeOptions)
      return () =>
        h('div', { class: 'syn-shell' }, [
          h(
            'div',
            {
              class: 'syn-background',
              ref: (el) => {
                if (el instanceof HTMLElement) {
                  runtime.setHost(el)
                  void runtime.sync(syncInput.value)
                }
              },
            },
          ),
        ])
    },
  })
  return mount(Harness, { attachTo: document.body })
}

describe('useBackgroundRuntime', () => {
  afterEach(() => {
    solidProbeLog.length = 0
    routePath.value = '/zh/'
    pageData.value = {
      locale: 'zh',
      contentType: 'home',
      routePath: '/zh/',
    }
    colorMode.value = 'light'
    reducedMotionMatches.value = false
    document.body.innerHTML = ''
  })

  it('updates on route, locale, colorMode, and reducedMotion changes', async () => {
    const wrapper = mountHarness()
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog[0]).toMatch(/^init:\/zh\/:zh:light:false$/)

    routePath.value = '/zh/releases/'
    pageData.value = {
      locale: 'zh',
      contentType: 'release-collection',
      routePath: '/zh/releases/',
    }
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog).toContain('dispose')
    expect(solidProbeLog.at(-1)).toMatch(/^init:\/zh\/releases\/:zh:light:false$/)

    pageData.value = {
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

  it('does not load a background when page data marks root language router', async () => {
    pageData.value = {
      locale: 'zh',
      contentType: 'home',
      routePath: '/',
      isRootLanguageRouter: true,
    }
    routePath.value = '/'
    const wrapper = mountHarness()
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog).toEqual([])
    wrapper.unmount()
  })
})
```

If Plan 05 placed `useResolvedColorMode` at a different path, adjust the mock import path to the real Plan 05 module; do not invent a second color-mode system.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/background/use-background-runtime.test.ts`

Expected: FAIL because `useBackgroundRuntime` does not exist.

- [ ] **Step 3: Implement composable, barrel, and Layout wiring**

```ts
// src/client/background/use-background-runtime.ts
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { usePageData, useRoute } from 'vuepress/client'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import { useResolvedColorMode } from '../color-mode/use-resolved-color-mode.js'
import {
  readReducedMotion,
  subscribeReducedMotion,
} from './reduced-motion.js'
import { BackgroundRuntime, type BackgroundSyncInput } from './runtime.js'
import type { SynctrolClientPageData } from './types.js'

interface SynctrolPageDataBag {
  synctrol?: SynctrolClientPageData
}

export function useBackgroundRuntime(
  themeOptions: Pick<ResolvedSynctrolThemeOptions, 'backgrounds'>,
): {
  runtime: BackgroundRuntime
  syncInput: Ref<BackgroundSyncInput | null>
} {
  const runtime = new BackgroundRuntime({
    backgrounds: themeOptions.backgrounds ?? {},
  })
  const route = useRoute()
  const page = usePageData<SynctrolPageDataBag>()
  const colorMode = useResolvedColorMode()
  const reducedMotion = ref(readReducedMotion())

  const unsubscribeMotion = subscribeReducedMotion((value) => {
    reducedMotion.value = value
  })

  const syncInput = computed<BackgroundSyncInput | null>(() => {
    const synctrol = page.value.synctrol
    if (!synctrol || synctrol.isRootLanguageRouter) {
      return null
    }
    return {
      contentType: synctrol.contentType,
      route: synctrol.routePath || route.path,
      locale: synctrol.locale,
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
 // src/client/background/index.ts
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
export { default as BackgroundHost } from './BackgroundHost.vue'
export type { SynctrolClientPageData } from './types.js'
```

In Plan 05 `Layout.vue`, mount the host above the shell (decorative underlay). Minimal required insertion:

```vue
<!-- src/client/layouts/Layout.vue — relevant excerpt only -->
<script setup lang="ts">
import BackgroundHost from '../background/BackgroundHost.vue'
import { useBackgroundRuntime } from '../background/use-background-runtime'
import { useSynctrolThemeOptions } from '../composables/use-synctrol-theme-options'

const themeOptions = useSynctrolThemeOptions()
const { runtime, syncInput } = useBackgroundRuntime(themeOptions)
</script>

<template>
  <BackgroundHost :runtime="runtime" :sync-input="syncInput" />
  <div class="syn-shell">
    <!-- existing Plan 05 regions: Header, Main, Navigation, Footer, docks -->
  </div>
</template>
```

If Plan 05 named the options composable differently, use that existing composable; it must expose resolved `backgrounds`.

Confirm root language router HTML from Plan 03 still contains no `syn-background` mount and no background module import — that document is static and never uses `Layout.vue`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/background/use-background-runtime.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/background/use-background-runtime.ts src/client/background/index.ts src/client/layouts/Layout.vue src/client/index.ts tests/client/background/use-background-runtime.test.ts
git commit -m "feat: wire background runtime to route locale colorMode motion"
```

---

### Task 7: Theme config API example, content.yml exclusion regression, root-router guarantee

**Files:**
- Create: `tests/client/background/config-and-root.test.ts`
- Create: `tests/fixtures/backgrounds/theme-config-example.ts` (documents the public loader shape)
- Modify: `README.md` — add a short Backgrounds subsection under configuration (only backgrounds; do not invent unrelated docs)
- Modify: `src/index.ts` / `src/client/index.ts` if any export gaps remain

**Interfaces:**
- Consumes: Plan 01 `resolveThemeOptions` / `SynctrolThemeOptions.backgrounds`; Plan 02 `ILLEGAL_BACKGROUND`; Plan 03 `generateRootRouterHtml`
- Produces: regression coverage that config keys are content-type only, manifests cannot set backgrounds, and root router HTML never loads a background

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

/** Canonical theme config shape from design §13 — selection by content type only. */
export const exampleBackgrounds = {
  home: async () => emptyModule,
  release: async () => emptyModule,
  news: async () => emptyModule,
  page: async () => emptyModule,
}
```

```ts
// tests/client/background/config-and-root.test.ts
import { describe, expect, it } from 'vitest'
import { resolveThemeOptions } from '../../../src/shared/options'
import { zhMessages, enMessages } from '../../../src/shared/messages'
import { exampleBackgrounds } from '../../fixtures/backgrounds/theme-config-example'
import { generateRootRouterHtml } from '../../../src/compiler/root-router-html'
import { parseContentManifest } from '../../../src/compiler/manifest'
import { BackgroundRuntime } from '../../../src/client/background/runtime'
import type { ContentType } from '../../../src/shared/types'

const baseOptions = {
  siteUrl: 'https://synctrol.com',
  mainLocale: 'zh',
  locales: {
    zh: { lang: 'zh-CN', label: '中文', messages: zhMessages },
    en: { lang: 'en-US', label: 'English', messages: enMessages },
  },
  copyright: '© Synctrol',
  seo: {
    name: { zh: 'Synctrol', en: 'Synctrol' },
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
} as const

describe('background theme config and exclusions', () => {
  it('accepts backgrounds keyed only by home/release/news/page', () => {
    const resolved = resolveThemeOptions({
      ...baseOptions,
      backgrounds: exampleBackgrounds,
    })
    const keys = Object.keys(resolved.backgrounds).sort()
    expect(keys).toEqual(['home', 'news', 'page', 'release'])
    for (const key of keys as ContentType[]) {
      expect(typeof resolved.backgrounds[key]).toBe('function')
    }
  })

  it('defaults backgrounds to an empty object (solid fallback everywhere)', () => {
    const resolved = resolveThemeOptions({ ...baseOptions })
    expect(resolved.backgrounds).toEqual({})
  })

  it('rejects background in content.yml via Plan 02 schema', () => {
    expect(() =>
      parseContentManifest({
        path: 'content/pages/about/content.yml',
        raw: 'type: page\nbackground: ./bg.ts\n',
        mainLocale: 'zh',
      }),
    ).toThrow(/background|ILLEGAL_BACKGROUND/i)
  })

  it('root language router HTML does not mount or import backgrounds', () => {
    const html = generateRootRouterHtml({
      mainLocale: 'zh',
      locales: {
        zh: { label: '中文', publicPath: '/zh/' },
        en: { label: 'English', publicPath: '/en/' },
      },
    })
    expect(html).not.toMatch(/syn-background/i)
    expect(html).not.toMatch(/BackgroundHost|BackgroundRuntime|backgrounds\s*:/i)
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

If Plan 02 exports a different parse entry than `parseContentManifest`, call the real Plan 02 API that surfaces `ILLEGAL_BACKGROUND` (for example the compile helper used in `tests/compiler/manifest.test.ts`). If `generateRootRouterHtml` lives at a different Plan 03 path, import that exact module. Do not reimplement either.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/background/config-and-root.test.ts`

Expected: FAIL until README/example fixture wiring is complete and imports resolve. If `parseContentManifest` / `generateRootRouterHtml` already exist from Plans 02–03, failures should be limited to the missing example fixture / README assertion targets rather than those compilers.

- [ ] **Step 3: Add README backgrounds section and ensure exports**

Add to `README.md`:

```md
## Backgrounds

Background modules are selected only in theme configuration by content type:

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

Each module default-exports `(context) => ({ update, dispose })`. Missing keys render an empty solid `--syn-bg` surface. `content.yml` cannot set `background`. The root language router page does not load a background module.
```

Ensure `exampleBackgrounds` fixture exists as written in Step 1. No production default decorative modules are shipped.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/background/config-and-root.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/client/background/config-and-root.test.ts tests/fixtures/backgrounds/theme-config-example.ts README.md src/index.ts src/client/index.ts
git commit -m "test: lock background config selection and root-router exclusion"
```

---

### Task 8: Plan 06 verification suite

**Files:**
- Modify: none required beyond ensuring all tests green
- Create: `tests/client/background/plan06-verification.test.ts` only if a single aggregator helps local runs; prefer running the suite below without a new file when possible

**Interfaces:**
- Consumes: all Task 1–7 deliverables
- Produces: green Plan 06 gate

- [ ] **Step 1: Write the failing verification checklist test (aggregator)**

```ts
// tests/client/background/plan06-verification.test.ts
import { describe, expect, it } from 'vitest'
import { resolveBackgroundContentType } from '../../../src/client/background/resolve-type'
import { BackgroundRuntime } from '../../../src/client/background/runtime'
import { readReducedMotion } from '../../../src/client/background/reduced-motion'
import { exampleBackgrounds } from '../../fixtures/backgrounds/theme-config-example'

describe('plan 06 background runtime verification', () => {
  it('covers type mapping, solid fallback, and reduced-motion read', async () => {
    expect(resolveBackgroundContentType('release-collection')).toBe('release')
    expect(resolveBackgroundContentType('news-collection')).toBe('news')

    const host = document.createElement('div')
    document.body.appendChild(host)
    const runtime = new BackgroundRuntime({ backgrounds: {} })
    runtime.setHost(host)
    await runtime.sync({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: readReducedMotion({
        matches: true,
      } as MediaQueryList),
    })
    expect(host.dataset.synBackground).toBe('solid')
    runtime.dispose()
    host.remove()

    expect(typeof exampleBackgrounds.home).toBe('function')
  })
})
```

- [ ] **Step 2: Run the full Plan 06 related suite (expect failures only if prior tasks incomplete)**

Run:

```bash
npm test -- \
  tests/shared/background-types.test.ts \
  tests/client/background/resolve-type.test.ts \
  tests/client/background/reduced-motion.test.ts \
  tests/client/background/runtime.test.ts \
  tests/client/background/BackgroundHost.test.ts \
  tests/client/background/use-background-runtime.test.ts \
  tests/client/background/config-and-root.test.ts \
  tests/client/background/plan06-verification.test.ts
```

Expected: all PASS after Tasks 1–7.

- [ ] **Step 3: Implement aggregator file if Step 2 failed only because it was missing**

Create `tests/client/background/plan06-verification.test.ts` as in Step 1.

- [ ] **Step 4: Re-run full theme test suite**

Run: `npm test`

Expected: all existing Plan 01–05 tests plus Plan 06 background tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/client/background/plan06-verification.test.ts
git commit -m "test: verify background runtime plan 06 gate"
```

---

## Plan Self-Review

1. **Spec coverage (Background Runtime slice only):**
   - §3.4 / §13 per-type config `backgrounds: { home, release, news, page }` → Tasks 1, 7
   - Selection by resolved content type; collections map to `release` / `news` → Task 2, 4
   - `content.yml` cannot set `background` → Task 7 (Plan 02 `ILLEGAL_BACKGROUND` regression)
   - Empty solid background when missing → Tasks 4, 5, 7
   - API `default(context) => { update, dispose }` → Tasks 1, 4
   - Client-only init; no layout size ownership → Tasks 5, 6
   - Update on route / locale / colorMode / reducedMotion; dispose before replace → Tasks 4, 6
   - Cleanup events / rAF / observers / DOM → Task 4 animating probe
   - Reduced motion honor → Tasks 3, 4, 6
   - Root language router does not load background → Tasks 6, 7
   - §29 / §30 accessibility & performance notes for backgrounds → Tasks 3–4
2. **Placeholders:** none (`TBD`/`TODO`/“similar to Task N” absent).
3. **Type consistency:** `BackgroundContext`, `BackgroundController`, `BackgroundModule`, `BackgroundLoader`, `BackgroundSyncInput`, `PageContentType`, and `SynctrolClientPageData` names are stable across tasks; Plan 05 assumptions are explicit (`useResolvedColorMode`, `Layout.vue`, `page.synctrol`).

## Acceptance Gate

Plan 06 is complete when:

1. Theme options accept optional `backgrounds` loaders for the four content types only.
2. Runtime selects modules solely from resolved content type (including collection pages).
3. Missing loaders yield an empty solid `--syn-bg` host with no module DOM.
4. Modules follow `default → update/dispose`, dispose before replace, and clean up resources.
5. Client Layout hosts the background; root language router HTML does not.
6. Reduced motion is supplied on every context and honored by the animating fixture.
7. `npm test` passes including all files listed in Task 8.
