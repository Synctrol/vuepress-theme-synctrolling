# Global Background Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-content-type background module map with a single persistent global background provider (`IBackgroundHost`) that receives explicit page requests and a reactive context.

**Architecture:** Theme loads one provider module once per SPA session, hands it a Vue-reactive context (`BackgroundReactiveContext`), and pushes a synchronous `request(snapshot)` on every navigation (including initial mount). The provider owns type→visual mapping, transition orchestration, and per-frame size adaptation. No per-type switching, no `update()` calls.

**Tech Stack:** TypeScript (NodeNext, `.js` import suffixes), Vue 3, VuePress 2, Vitest (happy-dom + node projects), Vite virtual modules.

**Spec:** `docs/superpowers/specs/2026-08-15-global-background-provider-design.md`

---

### Task 1: Rewrite the shared background contract

**Files:**
- Modify: `src/shared/background.ts`
- Modify: `src/client/background/resolve-type.ts`
- Modify: `src/index.ts`
- Test: `tests/client/background/background-types.test.ts`

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `tests/client/background/background-types.test.ts`:

```ts
import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type {
  BackgroundLoader,
  BackgroundModule,
  BackgroundReactiveContext,
  BackgroundRequest,
  IBackgroundHost,
  PageContentType,
} from '../../../src/shared/background'
import type { ContentType } from '../../../src/shared/types'

describe('background module contracts', () => {
  it('exposes reactive refs on BackgroundReactiveContext', () => {
    const context: BackgroundReactiveContext = {
      element: document.createElement('div'),
      route: ref<{ path: string; identity?: string }>({ path: '/zh/' }),
      contentType: ref<{ raw: PageContentType; resolved: ContentType }>({
        raw: 'home',
        resolved: 'home',
      }),
      locale: ref('zh'),
      colorMode: ref<'light' | 'dark'>('dark'),
      reducedMotion: ref(true),
    }
    expect(context.element).toBeInstanceOf(HTMLElement)
    expect(context.route.value.path).toBe('/zh/')
    expect(context.contentType.value.resolved).toBe('home')
    expect(context.locale.value).toBe('zh')
    expect(context.colorMode.value).toBe('dark')
    expect(context.reducedMotion.value).toBe(true)
  })

  it('requires request and dispose on IBackgroundHost', () => {
    const calls: string[] = []
    const request: BackgroundRequest = {
      reason: 'navigate',
      routePath: '/en/releases/',
      contentType: { raw: 'release-collection', resolved: 'release' },
      locale: 'en',
      colorMode: 'light',
      reducedMotion: false,
    }
    const host: IBackgroundHost = {
      request(req) {
        calls.push(`request:${req.routePath}`)
      },
      dispose() {
        calls.push('dispose')
      },
    }
    host.request(request)
    host.dispose()
    expect(calls).toEqual(['request:/en/releases/', 'dispose'])
  })

  it('loads modules through BackgroundLoader returning a default factory', async () => {
    const loader: BackgroundLoader = async () => {
      const mod: BackgroundModule = {
        default(context) {
          expect(context.element).toBeInstanceOf(HTMLElement)
          return { request() {}, dispose() {} }
        },
      }
      return mod
    }
    const mod = await loader()
    const host = mod.default({
      element: document.createElement('div'),
      route: ref({ path: '/zh/news/' }),
      contentType: ref<{ raw: PageContentType; resolved: ContentType }>({
        raw: 'news',
        resolved: 'news',
      }),
      locale: ref('zh'),
      colorMode: ref<'light' | 'dark'>('light'),
      reducedMotion: ref(false),
    })
    expect(typeof host.request).toBe('function')
    expect(typeof host.dispose).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project client tests/client/background/background-types.test.ts`
Expected: FAIL — `BackgroundReactiveContext` / `BackgroundRequest` / `IBackgroundHost` / `PageContentType` do not exist yet.

- [ ] **Step 3: Rewrite `src/shared/background.ts`**

```ts
import type { Ref } from 'vue'
import type { ContentType } from './types.js'

export type PageContentType =
  | ContentType
  | 'release-collection'
  | 'news-collection'

export interface BackgroundReactiveContext {
  element: HTMLElement
  route: Ref<{ path: string; identity?: string }>
  contentType: Ref<{ raw: PageContentType; resolved: ContentType }>
  locale: Ref<string>
  colorMode: Ref<'light' | 'dark'>
  reducedMotion: Ref<boolean>
}

export interface BackgroundRequest {
  reason: 'init' | 'navigate'
  routePath: string
  contentType: { raw: PageContentType; resolved: ContentType }
  identity?: string
  locale: string
  colorMode: 'light' | 'dark'
  reducedMotion: boolean
}

export interface IBackgroundHost {
  request(request: BackgroundRequest): void
  dispose(): void
}

export type BackgroundModule = {
  default(context: BackgroundReactiveContext): IBackgroundHost
}

export type BackgroundLoader = () => Promise<BackgroundModule>
```

- [ ] **Step 4: Update `src/client/background/resolve-type.ts`**

Replace the whole file:

```ts
import type { ContentType } from '../../shared/types.js'
import type { PageContentType } from '../../shared/background.js'

export type { PageContentType } from '../../shared/background.js'

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

- [ ] **Step 5: Update `src/index.ts` type exports**

Replace lines 7–12 (the `export type { BackgroundContext, ... }` block) with:

```ts
export type {
  BackgroundReactiveContext,
  BackgroundRequest,
  IBackgroundHost,
  BackgroundLoader,
  BackgroundModule,
  PageContentType,
} from './shared/background.js'
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run --project client tests/client/background/background-types.test.ts tests/client/background/resolve-type.test.ts`
Expected: PASS (resolve-type.test.ts still passes — `resolveBackgroundContentType` signature unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/shared/background.ts src/client/background/resolve-type.ts src/index.ts tests/client/background/background-types.test.ts
git commit -m "feat(background): global provider contract (IBackgroundHost + reactive context)"
```

---

### Task 2: Switch the theme option from `backgrounds` map to single `background`

**Files:**
- Modify: `src/shared/options.ts:135,163,349`
- Modify: `src/shared/options-validation.ts:34,479-490,568`
- Modify: `tests/helpers/seo-fixtures.ts:44`
- Modify: `tests/fixtures/backgrounds/theme-config-example.ts`
- Test: `tests/shared/options.test.ts` (lines 246, 819-914)
- Test: `tests/shared/client-options.test.ts`
- Test: `tests/client/background/config-and-root.test.ts`

- [ ] **Step 1: Update fixtures**

Replace `tests/fixtures/backgrounds/theme-config-example.ts`:

```ts
import type { BackgroundLoader } from '../../../src/shared/background'

const emptyModule = {
  default() {
    return {
      request() {},
      dispose() {},
    }
  },
}

/** Canonical theme config shape — a single global background provider loader. */
export const exampleBackground: BackgroundLoader = async () => emptyModule
```

Remove `backgrounds: {},` (line 44) from `tests/helpers/seo-fixtures.ts`.

- [ ] **Step 2: Write/adjust the failing tests**

In `tests/shared/options.test.ts`:

a) Replace the case on line 246 `['options.backgrounds', { ...base, backgrounds: [] }]` with:

```ts
    ['options.background', { ...base, background: [] }],
```

b) In the "rejects unsupported field" `it.each` (starting line 262), add a case before the closing `] as const)`:

```ts
    ['options.backgrounds', { ...base, backgrounds: {} }],
```

c) In the "does not mutate the input object" test (lines ~810-915), replace the `backgrounds` usage:

Replace:
```ts
    const backgrounds = { home: backgroundLoader }
```
with:
```ts
    const background = backgroundLoader
```

Replace `backgrounds,` (line 841, inside the `input` object literal) with `background,`.

Delete these lines (877–884):
```ts
    backgrounds.home = async () => ({
      default() {
        return {
          update() {},
          dispose() {},
        }
      },
    })
```

Replace lines 913–914:
```ts
    expect(resolved.backgrounds).not.toBe(backgrounds)
    expect(resolved.backgrounds.home).toBe(backgroundLoader)
```
with:
```ts
    expect(resolved.background).toBe(backgroundLoader)
```

In `tests/shared/client-options.test.ts`:

Replace the `backgroundLoader` fixture (line 42) body's controller object with:
```ts
const backgroundLoader = async () => ({
  default() {
    return {
      request() {},
      dispose() {},
    }
  },
})
```

Replace `backgrounds: { home: backgroundLoader },` with `background: backgroundLoader,` (3 occurrences at lines 59, 83, 95).

Replace `resolved.backgrounds.home` with `resolved.background` (line 66).

Replace `expect(clientOptions).not.toHaveProperty('backgrounds')` with `expect(clientOptions).not.toHaveProperty('background')` (lines 67, 87).

In the "registers backgrounds via Vite plugin" test (line 92), replace the `backgrounds: { home: backgroundLoader }` (line 95) with `background: backgroundLoader`, and line 99 `'backgrounds'` with `'background'`.

In `tests/client/background/config-and-root.test.ts`:

Replace the `import { exampleBackgrounds }` line with:
```ts
import { exampleBackground } from '../../fixtures/backgrounds/theme-config-example'
```

Replace the `describe('background theme config and exclusions')` block with:

```ts
describe('background theme config and exclusions', () => {
  it('accepts background as a loader function', () => {
    const resolved = resolveThemeOptions({
      ...baseInput,
      background: exampleBackground,
    })
    expect(typeof resolved.background).toBe('function')
  })

  it('defaults background to undefined (solid fallback everywhere)', () => {
    const resolved = resolveThemeOptions({ ...baseInput })
    expect(resolved.background).toBeUndefined()
  })

  it('rejects the removed backgrounds map as an unknown field', () => {
    expect(() =>
      resolveThemeOptions({
        ...baseInput,
        backgrounds: { home: exampleBackground },
      } as SynctrolThemeOptions),
    ).toThrow(/Unknown field options\.backgrounds/)
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
      options: resolveThemeOptions({
        ...baseInput,
        background: exampleBackground,
      }),
      base: '/',
    })
    expect(html).not.toMatch(/syn-background/i)
    expect(html).not.toMatch(/BackgroundSurface|BackgroundRuntime|virtual:synctrol-backgrounds/i)
    expect(html).toMatch(/synctrol:locale/)
  })
})
```

Remove the now-deleted "runtime still paints solid when config omits a type" test (it exercises the old per-type runtime API, superseded in Task 4). Also remove the now-unused imports at the top if they become dangling (the `ContentType` type import and `BackgroundRuntime` import are used by the removed test; drop them in this file's final form — the rewritten block above no longer uses them).

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run --project node tests/shared/options.test.ts tests/shared/client-options.test.ts && npx vitest run --project client tests/client/background/config-and-root.test.ts`
Expected: FAIL — `background` option is not recognized; `backgrounds` still accepted.

- [ ] **Step 4: Update the option schema**

In `src/shared/options.ts`:

Replace line 135 `backgrounds?: Partial<Record<ContentType, BackgroundLoader>>` with:
```ts
  background?: BackgroundLoader
```

Replace line 163 `backgrounds: Partial<Record<ContentType, BackgroundLoader>>` with:
```ts
  background?: BackgroundLoader
```

Replace line 349 `backgrounds: { ...(input.backgrounds ?? {}) },` with:
```ts
    background: input.background,
```

In `src/shared/options-validation.ts`:

Replace `'backgrounds',` (line 34) with `'background',`.

Replace the `validateBackgrounds` function (lines 479–490) with:
```ts
function validateBackground(value: unknown): void {
  if (value === undefined) return
  if (typeof value !== 'function') {
    throw new Error('Invalid options.background: expected a function')
  }
}
```

Replace `validateBackgrounds(input.backgrounds)` (line 568) with:
```ts
  validateBackground(input.background)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --project node tests/shared/options.test.ts tests/shared/client-options.test.ts && npx vitest run --project client tests/client/background/config-and-root.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/options.ts src/shared/options-validation.ts tests/helpers/seo-fixtures.ts tests/fixtures/backgrounds/theme-config-example.ts tests/shared/options.test.ts tests/shared/client-options.test.ts tests/client/background/config-and-root.test.ts
git commit -m "feat(background): replace backgrounds map option with single background loader"
```

---

### Task 3: Emit a single loader from the backgrounds virtual module

**Files:**
- Modify: `src/compiler/backgrounds/extract-loader-specifier.ts`
- Modify: `src/compiler/backgrounds/emit-virtual-module.ts`
- Modify: `src/compiler/backgrounds/vite-plugin.ts`
- Modify: `src/compiler/theme.ts:308`
- Modify: `src/client/background/virtual-backgrounds.d.ts`
- Modify: `tests/fixtures/backgrounds/virtual-backgrounds-mock.ts`
- Test: `tests/compiler/backgrounds/extract-loader-specifier.test.ts`
- Test: `tests/compiler/backgrounds/emit-virtual-module.test.ts`
- Test: `tests/compiler/backgrounds/vite-plugin.test.ts`
- Test: `tests/compiler/theme.integration.test.ts` (lines 115-118, 126, 146-149)

- [ ] **Step 1: Write/adjust the failing tests**

Replace `tests/compiler/backgrounds/extract-loader-specifier.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { extractBackgroundImportSpecifier } from '../../../src/compiler/backgrounds/extract-loader-specifier'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'

/** Build a loader whose toString retains the dynamic-import literal (Vitest may rewrite inline import()). */
function loaderFromSource(source: string): () => Promise<unknown> {
  return new Function(`return ${source}`)() as () => Promise<unknown>
}

describe('extractBackgroundImportSpecifier', () => {
  it('extracts single-quoted dynamic import specifiers', () => {
    const loader = loaderFromSource("() => import('./backgrounds/host')")
    expect(extractBackgroundImportSpecifier(loader as never)).toBe(
      './backgrounds/host',
    )
  })

  it('extracts double-quoted dynamic import specifiers', () => {
    const loader = loaderFromSource('() => import("./backgrounds/host")')
    expect(extractBackgroundImportSpecifier(loader as never)).toBe(
      './backgrounds/host',
    )
  })

  it('rejects unsupported loader shapes with a diagnostic', () => {
    const bad = async () => ({
      default() {
        return { request() {}, dispose() {} }
      },
    })
    try {
      extractBackgroundImportSpecifier(bad as never)
      expect.unreachable('should throw')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      expect(String(error)).toMatch(/UNSUPPORTED_BACKGROUND_LOADER|unsupported/i)
      expect(String(error)).toMatch(/background/)
    }
  })
})
```

Replace `tests/compiler/backgrounds/emit-virtual-module.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { emitBackgroundsVirtualModule } from '../../../src/compiler/backgrounds/emit-virtual-module'
import type { BackgroundLoader } from '../../../src/shared/background'

/** Build a loader whose toString retains the dynamic-import literal (Vitest may rewrite inline import()). */
function loaderFromSource(source: string): BackgroundLoader {
  return new Function(`return ${source}`)() as BackgroundLoader
}

describe('emitBackgroundsVirtualModule', () => {
  it('emits an undefined default export when no loader is configured', () => {
    expect(emitBackgroundsVirtualModule(undefined, '/site/.vuepress')).toBe(
      'export default undefined\n',
    )
  })

  it('emits a single loader default export for the configured provider', () => {
    const loader = loaderFromSource("() => import('./backgrounds/host')")
    const source = emitBackgroundsVirtualModule(loader, '/site/.vuepress')
    expect(source).toContain('export default () => import(')
    expect(source).toContain('/site/.vuepress/backgrounds/host')
  })
})
```

Replace `tests/compiler/backgrounds/vite-plugin.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createSynctrolBackgroundsVitePlugin } from '../../../src/compiler/backgrounds/vite-plugin'
import { emitBackgroundsVirtualModule } from '../../../src/compiler/backgrounds/emit-virtual-module'
import type { BackgroundLoader } from '../../../src/shared/background'

/** Build a loader whose toString retains the dynamic-import literal (Vitest may rewrite inline import()). */
function loaderFromSource(source: string): BackgroundLoader {
  return new Function(`return ${source}`)() as BackgroundLoader
}

function asHookFn<T extends (...args: never[]) => unknown>(
  hook: T | { handler: T } | undefined,
): T {
  if (typeof hook === 'function') return hook
  if (hook && typeof hook === 'object' && 'handler' in hook) {
    return hook.handler
  }
  throw new Error('expected Vite plugin hook function')
}

describe('createSynctrolBackgroundsVitePlugin', () => {
  it('resolves virtual:synctrol-backgrounds and @synctrol/backgrounds', () => {
    const plugin = createSynctrolBackgroundsVitePlugin({
      configDir: '/site/.vuepress',
    })
    const resolveId = asHookFn(plugin.resolveId as never) as (
      id: string,
      importer: string | undefined,
    ) => string | undefined
    expect(resolveId('virtual:synctrol-backgrounds', undefined)).toBe(
      '\0virtual:synctrol-backgrounds',
    )
    expect(resolveId('@synctrol/backgrounds', undefined)).toBe(
      '\0virtual:synctrol-backgrounds',
    )
  })

  it('loads the emitted module source', () => {
    const background = loaderFromSource("() => import('./backgrounds/host')")
    const plugin = createSynctrolBackgroundsVitePlugin({
      background,
      configDir: '/site/.vuepress',
    })
    const load = asHookFn(plugin.load as never) as (
      id: string,
    ) => string | undefined
    expect(load('\0virtual:synctrol-backgrounds')).toBe(
      emitBackgroundsVirtualModule(background, '/site/.vuepress'),
    )
  })
})
```

In `tests/compiler/theme.integration.test.ts`, replace the two `backgrounds: { home: (async () => ({})) as never, }` blocks with:

```ts
      background: (async () => ({})) as never,
```

and replace line 126 `'backgrounds',` with `'background',`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project node tests/compiler/backgrounds`
Expected: FAIL — signatures still take a map + key.

- [ ] **Step 3: Update the compiler**

Replace `src/compiler/backgrounds/extract-loader-specifier.ts`:

```ts
import type { BackgroundLoader } from '../../shared/background.js'
import { fail } from '../diagnostics.js'

const SUPPORTED =
  /^\(\)\s*=>\s*import\(\s*(['"])([^'"]+)\1\s*\)$/

export function extractBackgroundImportSpecifier(
  loader: BackgroundLoader,
): string {
  if (typeof loader !== 'function') {
    fail({
      severity: 'error',
      code: 'UNSUPPORTED_BACKGROUND_LOADER',
      message: `background must be () => import('…') or () => import("…")`,
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
      message: `background must be () => import('…') or () => import("…"); got: ${source}`,
    })
  }
  return match[2]!
}
```

Replace `src/compiler/backgrounds/emit-virtual-module.ts`:

```ts
import { isAbsolute, resolve } from 'node:path'
import type { BackgroundLoader } from '../../shared/background.js'
import { extractBackgroundImportSpecifier } from './extract-loader-specifier.js'

export function emitBackgroundsVirtualModule(
  background: BackgroundLoader | undefined,
  configDir: string,
): string {
  if (!background) return 'export default undefined\n'
  const specifier = extractBackgroundImportSpecifier(background)
  const id = isAbsolute(specifier)
    ? specifier
    : resolve(configDir, specifier)
  return `export default () => import(${JSON.stringify(id)})\n`
}
```

Replace `src/compiler/backgrounds/vite-plugin.ts`:

```ts
import type { Plugin } from 'vite'
import type { BackgroundLoader } from '../../shared/background.js'
import { emitBackgroundsVirtualModule } from './emit-virtual-module.js'

const VIRTUAL_ID = 'virtual:synctrol-backgrounds'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

export function createSynctrolBackgroundsVitePlugin(options: {
  background?: BackgroundLoader
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
        return emitBackgroundsVirtualModule(options.background, options.configDir)
      }
    },
  }
}
```

In `src/compiler/theme.ts` line 308, replace `backgrounds: resolved.backgrounds,` with:

```ts
          background: resolved.background,
```

Replace `src/client/background/virtual-backgrounds.d.ts`:

```ts
declare module 'virtual:synctrol-backgrounds' {
  import type { BackgroundLoader } from '../../shared/background.js'
  const loader: BackgroundLoader | undefined
  export default loader
}

declare module '@synctrol/backgrounds' {
  export { default } from 'virtual:synctrol-backgrounds'
}
```

Replace `tests/fixtures/backgrounds/virtual-backgrounds-mock.ts`:

```ts
import type { BackgroundLoader } from '../../../src/shared/background.js'

/** Vitest alias stand-in for `virtual:synctrol-backgrounds` (undefined by default). */
const loader: BackgroundLoader | undefined = undefined

export default loader
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project node tests/compiler/backgrounds tests/compiler/theme.integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/backgrounds src/compiler/theme.ts src/client/background/virtual-backgrounds.d.ts tests/fixtures/backgrounds/virtual-backgrounds-mock.ts tests/compiler/backgrounds tests/compiler/theme.integration.test.ts
git commit -m "feat(background): emit single provider loader from virtual module"
```

---

### Task 4: Rewrite the client runtime to load one provider and forward requests

**Files:**
- Modify: `src/client/background/runtime.ts`
- Modify: `tests/fixtures/backgrounds/solid-probe.ts`
- Modify: `tests/fixtures/backgrounds/animating-probe.ts`
- Test: `tests/client/background/runtime.test.ts`

- [ ] **Step 1: Rewrite fixtures**

Replace `tests/fixtures/backgrounds/solid-probe.ts`:

```ts
import type {
  BackgroundModule,
  BackgroundReactiveContext,
  IBackgroundHost,
} from '../../../src/shared/background'

export const solidProbeLog: string[] = []

const mod: BackgroundModule = {
  default(context: BackgroundReactiveContext): IBackgroundHost {
    solidProbeLog.push(
      `init:${context.route.value.path}:${context.locale.value}:${context.colorMode.value}:${context.reducedMotion.value}`,
    )
    context.element.dataset.probe = 'solid'
    return {
      request(next) {
        solidProbeLog.push(
          `request:${next.reason}:${next.routePath}:${next.locale}:${next.colorMode}:${next.reducedMotion}`,
        )
        context.element.dataset.probe = 'solid'
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

Replace `tests/fixtures/backgrounds/animating-probe.ts`:

```ts
import { watch } from 'vue'
import type {
  BackgroundModule,
  BackgroundReactiveContext,
  IBackgroundHost,
} from '../../../src/shared/background'

export const animatingProbeState = {
  rafIds: [] as number[],
  listeners: [] as Array<{
    target: EventTarget
    type: string
    handler: EventListener
  }>,
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
  default(context: BackgroundReactiveContext): IBackgroundHost {
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
      if (context.reducedMotion.value) return
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

    applyMotion(context.reducedMotion.value)
    const stopWatch = watch(context.reducedMotion, (reduced) =>
      applyMotion(reduced),
    )

    return {
      request(next) {
        applyMotion(next.reducedMotion)
      },
      dispose() {
        stopWatch()
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

- [ ] **Step 2: Rewrite the runtime test**

Replace `tests/client/background/runtime.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
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
import { resolveBackgroundContentType } from '../../../src/client/background/resolve-type'
import type {
  BackgroundLoader,
  BackgroundRequest,
  PageContentType,
} from '../../../src/shared/background'
import type { ContentType } from '../../../src/shared/types'

function makeRuntime(loader?: BackgroundLoader) {
  const route = ref<{ path: string; identity?: string }>({ path: '' })
  const contentType = ref<{ raw: PageContentType; resolved: ContentType }>({
    raw: 'page',
    resolved: 'page',
  })
  const locale = ref('')
  const colorMode = ref<'light' | 'dark'>('light')
  const reducedMotion = ref(false)
  const runtime = new BackgroundRuntime({
    loader,
    context: { route, contentType, locale, colorMode, reducedMotion },
  })
  return { runtime, route, contentType, locale, colorMode, reducedMotion }
}

function request(input: {
  reason?: 'init' | 'navigate'
  routePath?: string
  raw?: PageContentType
  identity?: string
  locale?: string
  colorMode?: 'light' | 'dark'
  reducedMotion?: boolean
}): BackgroundRequest {
  const raw = input.raw ?? 'home'
  return {
    reason: input.reason ?? 'navigate',
    routePath: input.routePath ?? '/zh/',
    contentType: { raw, resolved: resolveBackgroundContentType(raw) },
    ...(input.identity === undefined ? {} : { identity: input.identity }),
    locale: input.locale ?? 'zh',
    colorMode: input.colorMode ?? 'light',
    reducedMotion: input.reducedMotion ?? false,
  }
}

describe('BackgroundRuntime', () => {
  let host: HTMLElement

  beforeEach(() => {
    document.documentElement.style.setProperty('--syn-bg', 'rgb(10, 20, 30)')
    host = document.createElement('div')
    host.className = 'syn-background'
    document.body.appendChild(host)
    solidProbeLog.length = 0
    resetAnimatingProbeState()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.style.removeProperty('--syn-bg')
  })

  it('loads the provider on first request and initializes with the reactive context', async () => {
    const { runtime, route, contentType, locale, colorMode, reducedMotion } =
      makeRuntime(solidProbeLoader)
    route.value = { path: '/zh/' }
    contentType.value = { raw: 'home', resolved: 'home' }
    locale.value = 'zh'
    colorMode.value = 'dark'
    reducedMotion.value = false

    runtime.mount(host)
    runtime.request(request({ reason: 'init', colorMode: 'dark' }))
    await Promise.resolve()
    await Promise.resolve()

    expect(solidProbeLog).toEqual([
      'init:/zh/:zh:dark:false',
      'request:init:/zh/:zh:dark:false',
    ])
    expect(host.dataset.probe).toBe('solid')
    expect(host.dataset.synBackground).toBe('module')
    runtime.dispose()
  })

  it('does not reload the provider for subsequent requests', async () => {
    const { runtime, contentType } = makeRuntime(solidProbeLoader)
    runtime.mount(host)
    runtime.request(request({ reason: 'init' }))
    await Promise.resolve()
    await Promise.resolve()

    contentType.value = { raw: 'release-collection', resolved: 'release' }
    runtime.request(
      request({
        reason: 'navigate',
        routePath: '/zh/releases/',
        raw: 'release-collection',
      }),
    )
    await Promise.resolve()

    expect(solidProbeLog.filter((e) => e.startsWith('init:')).length).toBe(1)
    expect(solidProbeLog.at(-1)).toBe(
      'request:navigate:/zh/releases/:zh:light:false',
    )
    runtime.dispose()
  })

  it('renders an empty solid background when no loader is configured', async () => {
    const { runtime } = makeRuntime(undefined)
    runtime.mount(host)
    runtime.request(request({ reason: 'init' }))
    await Promise.resolve()

    expect(solidProbeLog).toEqual([])
    expect(host.dataset.synBackground).toBe('solid')
    expect(host.childNodes.length).toBe(0)
    expect(getComputedStyle(host).backgroundColor).not.toBe('')
    runtime.dispose()
  })

  it('falls back to solid when the loader rejects', async () => {
    const { runtime } = makeRuntime(async () => {
      throw new Error('background load failed')
    })
    runtime.mount(host)
    runtime.request(request({ reason: 'init' }))
    await Promise.resolve()
    await Promise.resolve()

    expect(host.dataset.synBackground).toBe('solid')
    expect(host.style.backgroundColor).toBe('var(--syn-bg)')
    expect(solidProbeLog).toEqual([])
    runtime.dispose()
  })

  it('delivers the latest pending request once the provider finishes loading', async () => {
    let resolveLoader!: (mod: Awaited<ReturnType<BackgroundLoader>>) => void
    const pendingLoader: BackgroundLoader = () =>
      new Promise((resolve) => {
        resolveLoader = resolve
      })

    const { runtime } = makeRuntime(pendingLoader)
    runtime.mount(host)
    runtime.request(request({ reason: 'init', routePath: '/zh/' }))
    runtime.request(
      request({ reason: 'navigate', routePath: '/zh/news/', raw: 'news' }),
    )

    resolveLoader(await solidProbeLoader())

    await Promise.resolve()
    await Promise.resolve()

    expect(solidProbeLog.filter((e) => e.startsWith('request:')).length).toBe(1)
    expect(solidProbeLog.at(-1)).toBe(
      'request:navigate:/zh/news/:zh:light:false',
    )
    runtime.dispose()
  })

  it('ignores a pending loader after dispose', async () => {
    let resolveLoader!: (mod: Awaited<ReturnType<BackgroundLoader>>) => void
    const pendingLoader: BackgroundLoader = () =>
      new Promise((resolve) => {
        resolveLoader = resolve
      })

    const { runtime } = makeRuntime(pendingLoader)
    runtime.mount(host)
    runtime.request(request({ reason: 'init' }))
    runtime.dispose()

    resolveLoader(await solidProbeLoader())
    await Promise.resolve()

    expect(solidProbeLog).toEqual([])
    expect(host.dataset.synBackground).toBe('solid')
    runtime.dispose()
  })

  it('requires providers to clean up events, raf, observers, and DOM on dispose', async () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const { runtime } = makeRuntime(animatingProbeLoader)
    runtime.mount(host)
    runtime.request(request({ reason: 'init' }))
    await Promise.resolve()
    await Promise.resolve()

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

  it('lets the provider react to reducedMotion through the reactive context', async () => {
    const { runtime, reducedMotion } = makeRuntime(animatingProbeLoader)
    reducedMotion.value = true
    runtime.mount(host)
    runtime.request(request({ reason: 'init', reducedMotion: true }))
    await Promise.resolve()
    await Promise.resolve()

    expect(animatingProbeState.reducedMotionHonored).toContain(true)
    expect(
      host.querySelector('.animating-probe')?.getAttribute('data-motion'),
    ).toBe('static')

    reducedMotion.value = false
    await nextTick()
    expect(
      host.querySelector('.animating-probe')?.getAttribute('data-motion'),
    ).toBe('animated')
    runtime.dispose()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run --project client tests/client/background/runtime.test.ts`
Expected: FAIL — `BackgroundRuntime` still has the old `{ backgrounds }` / `sync` API.

- [ ] **Step 4: Rewrite `src/client/background/runtime.ts`**

```ts
import type { Ref } from 'vue'
import type {
  BackgroundLoader,
  BackgroundModule,
  BackgroundReactiveContext,
  BackgroundRequest,
  IBackgroundHost,
  PageContentType,
} from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'

export interface BackgroundRuntimeContextRefs {
  route: Ref<{ path: string; identity?: string }>
  contentType: Ref<{ raw: PageContentType; resolved: ContentType }>
  locale: Ref<string>
  colorMode: Ref<'light' | 'dark'>
  reducedMotion: Ref<boolean>
}

export interface BackgroundRuntimeOptions {
  loader?: BackgroundLoader
  context: BackgroundRuntimeContextRefs
}

export class BackgroundRuntime {
  private readonly loader?: BackgroundLoader
  private readonly context: BackgroundRuntimeContextRefs
  private host: HTMLElement | null = null
  private provider: IBackgroundHost | null = null
  private loadGeneration = 0
  private pendingRequest: BackgroundRequest | null = null

  constructor(options: BackgroundRuntimeOptions) {
    this.loader = options.loader
    this.context = options.context
  }

  mount(element: HTMLElement): void {
    this.loadGeneration += 1
    this.disposeProvider()
    this.host = element
    this.applySolidSurface(element)
  }

  request(input: BackgroundRequest): void {
    if (!this.host) return
    this.pendingRequest = input
    if (!this.provider) {
      void this.loadProvider()
      return
    }
    this.provider.request(input)
  }

  dispose(): void {
    this.loadGeneration += 1
    this.disposeProvider()
    if (this.host) {
      this.applySolidSurface(this.host)
      this.host.dataset.synBackground = 'solid'
      this.host = null
    }
    this.pendingRequest = null
  }

  private async loadProvider(): Promise<void> {
    if (!this.loader || !this.host) return
    const generation = ++this.loadGeneration
    let mod: BackgroundModule
    try {
      mod = await this.loader()
    } catch {
      if (generation !== this.loadGeneration || !this.host) return
      this.applySolidSurface(this.host)
      this.host.dataset.synBackground = 'solid'
      return
    }
    if (generation !== this.loadGeneration || !this.host) return
    this.provider = mod.default(this.buildContext())
    this.host.dataset.synBackground = 'module'
    if (this.pendingRequest) {
      this.provider.request(this.pendingRequest)
    }
  }

  private buildContext(): BackgroundReactiveContext {
    if (!this.host) throw new Error('BackgroundRuntime host is not set')
    return {
      element: this.host,
      route: this.context.route,
      contentType: this.context.contentType,
      locale: this.context.locale,
      colorMode: this.context.colorMode,
      reducedMotion: this.context.reducedMotion,
    }
  }

  private disposeProvider(): void {
    if (this.provider) {
      this.provider.dispose()
    }
    this.provider = null
    if (this.host) {
      this.host.replaceChildren()
    }
  }

  private applySolidSurface(element: HTMLElement): void {
    element.style.backgroundColor = 'var(--syn-bg)'
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --project client tests/client/background/runtime.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/client/background/runtime.ts tests/fixtures/backgrounds/solid-probe.ts tests/fixtures/backgrounds/animating-probe.ts tests/client/background/runtime.test.ts
git commit -m "feat(background): single-provider runtime with request forwarding"
```

---

### Task 5: Rewrite the composable and rename BackgroundHost to BackgroundSurface

**Files:**
- Modify: `src/client/background/use-background-runtime.ts`
- Rename: `src/client/background/BackgroundHost.vue` → `src/client/background/BackgroundSurface.vue`
- Rename: `src/client/background/background-host.css` → `src/client/background/background-surface.css`
- Modify: `src/client/background/index.ts`
- Modify: `src/client/layouts/Layout.vue` (lines 5-6, 53, 157)
- Test: rename `tests/client/background/BackgroundHost.test.ts` → `tests/client/background/BackgroundSurface.test.ts`
- Test: `tests/client/background/use-background-runtime.test.ts`

- [ ] **Step 1: Rename files**

```bash
git mv src/client/background/BackgroundHost.vue src/client/background/BackgroundSurface.vue
git mv src/client/background/background-host.css src/client/background/background-surface.css
git mv tests/client/background/BackgroundHost.test.ts tests/client/background/BackgroundSurface.test.ts
```

- [ ] **Step 2: Write the failing surface + composable tests**

Replace `tests/client/background/BackgroundSurface.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import BackgroundSurface from '../../../src/client/background/BackgroundSurface.vue'
import { BackgroundRuntime } from '../../../src/client/background/runtime'
import { solidProbeLoader, solidProbeLog } from '../../fixtures/backgrounds/solid-probe'
import type {
  BackgroundRequest,
  PageContentType,
} from '../../../src/shared/background'
import type { ContentType } from '../../../src/shared/types'

function makeRuntime() {
  const route = ref<{ path: string; identity?: string }>({ path: '' })
  const contentType = ref<{ raw: PageContentType; resolved: ContentType }>({
    raw: 'home',
    resolved: 'home',
  })
  const locale = ref('zh')
  const colorMode = ref<'light' | 'dark'>('light')
  const reducedMotion = ref(false)
  const runtime = new BackgroundRuntime({
    loader: solidProbeLoader,
    context: { route, contentType, locale, colorMode, reducedMotion },
  })
  return runtime
}

function makeRequest(routePath = '/zh/'): BackgroundRequest {
  return {
    reason: 'navigate',
    routePath,
    contentType: { raw: 'home', resolved: 'home' },
    locale: 'zh',
    colorMode: 'light',
    reducedMotion: false,
  }
}

describe('BackgroundSurface', () => {
  it('renders a full-bleed host that does not own layout size', () => {
    const runtime = new BackgroundRuntime({
      context: {
        route: ref({ path: '' }),
        contentType: ref<{ raw: PageContentType; resolved: ContentType }>({
          raw: 'page',
          resolved: 'page',
        }),
        locale: ref(''),
        colorMode: ref<'light' | 'dark'>('light'),
        reducedMotion: ref(false),
      },
    })
    const wrapper = mount(BackgroundSurface, {
      props: { runtime, requestInput: null },
      attachTo: document.body,
    })

    const el = wrapper.get('.syn-background').element as HTMLElement
    const style = getComputedStyle(el)
    expect(style.position).toBe('fixed')
    if (style.inset) {
      expect(style.inset).toBe('0px')
    } else {
      expect(style.top).toBe('0px')
      expect(style.right).toBe('0px')
      expect(style.bottom).toBe('0px')
      expect(style.left).toBe('0px')
    }
    expect(style.pointerEvents).toBe('none')
    expect(style.zIndex).toBe('0')
    expect(el.style.gridArea).toBe('')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.dataset.synBackground).toBe('solid')
    wrapper.unmount()
  })

  it('keeps shell content stacked above the fixed background layer', () => {
    const runtime = new BackgroundRuntime({
      context: {
        route: ref({ path: '' }),
        contentType: ref<{ raw: PageContentType; resolved: ContentType }>({
          raw: 'page',
          resolved: 'page',
        }),
        locale: ref(''),
        colorMode: ref<'light' | 'dark'>('light'),
        reducedMotion: ref(false),
      },
    })
    const root = document.createElement('div')
    root.innerHTML = `
      <div class="syn-shell">
        <header class="syn-header"></header>
        <main class="syn-main"><section class="cell cell-title">content</section></main>
        <nav class="syn-navigation"></nav>
        <footer class="syn-site-footer"></footer>
      </div>
    `
    document.body.appendChild(root)
    const hostMount = document.createElement('div')
    document.body.appendChild(hostMount)
    const wrapper = mount(BackgroundSurface, {
      props: { runtime, requestInput: null },
      attachTo: hostMount,
    })

    const bg = getComputedStyle(wrapper.get('.syn-background').element)
    const shell = getComputedStyle(root.querySelector('.syn-shell') as HTMLElement)
    expect(bg.zIndex).toBe('0')
    expect(Number(shell.zIndex)).toBeGreaterThan(Number(bg.zIndex))
    expect(shell.position).toMatch(/relative|sticky|absolute|fixed/)
    wrapper.unmount()
    root.remove()
    hostMount.remove()
  })

  it('sends an init request on mount and disposes on unmount', async () => {
    solidProbeLog.length = 0
    const runtime = makeRuntime()
    const wrapper = mount(BackgroundSurface, {
      props: { runtime, requestInput: makeRequest('/zh/') },
      attachTo: document.body,
    })
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    expect(solidProbeLog[0]).toMatch(/^init:/)
    expect(solidProbeLog[1]).toMatch(/^request:init:/)
    wrapper.unmount()
    expect(solidProbeLog).toContain('dispose')
  })

  it('forwards navigation requests when requestInput changes', async () => {
    solidProbeLog.length = 0
    const runtime = makeRuntime()
    const requestInput = ref<BackgroundRequest | null>(makeRequest('/zh/'))
    const Parent = defineComponent({
      setup() {
        return () =>
          h(BackgroundSurface, {
            runtime,
            requestInput: requestInput.value,
          })
      },
    })
    const wrapper = mount(Parent, { attachTo: document.body })
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    expect(solidProbeLog.filter((e) => e.startsWith('request:')).length).toBe(1)

    requestInput.value = makeRequest('/zh/releases/')
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog.at(-1)).toMatch(/^request:navigate:\/zh\/releases\//)
    expect(solidProbeLog.filter((e) => e.startsWith('init:')).length).toBe(1)
    wrapper.unmount()
  })

  it('does not request when requestInput is null', async () => {
    solidProbeLog.length = 0
    const runtime = makeRuntime()
    const wrapper = mount(BackgroundSurface, {
      props: { runtime, requestInput: null },
      attachTo: document.body,
    })
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog).toEqual([])
    expect(
      (wrapper.get('.syn-background').element as HTMLElement).dataset
        .synBackground,
    ).toBe('solid')
    wrapper.unmount()
  })
})
```

Replace `tests/client/background/use-background-runtime.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import BackgroundSurface from '../../../src/client/background/BackgroundSurface.vue'
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

vi.mock('virtual:synctrol-backgrounds', async () => {
  const { solidProbeLoader } = await import(
    '../../fixtures/backgrounds/solid-probe'
  )
  return {
    default: solidProbeLoader,
  }
})

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
      const { runtime, requestInput } = useBackgroundRuntime()
      return () =>
        h(BackgroundSurface, {
          runtime,
          requestInput: requestInput.value,
        })
    },
  })
  return mount(Harness, { attachTo: document.body })
}

describe('useBackgroundRuntime', () => {
  let wrapper: ReturnType<typeof mount> | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
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

  it('builds requestInput without driving runtime.request', async () => {
    let requestSpy: ReturnType<typeof vi.spyOn> | undefined
    const Harness = defineComponent({
      setup() {
        const { runtime, requestInput } = useBackgroundRuntime()
        requestSpy = vi.spyOn(runtime, 'request')
        return () =>
          h('div', {
            'data-route': requestInput.value?.routePath ?? 'none',
            'data-mode': requestInput.value?.colorMode ?? 'none',
          })
      },
    })
    wrapper = mount(Harness)
    await nextTick()
    expect(wrapper.get('div').attributes('data-route')).toBe('/zh/')

    colorMode.value = 'dark'
    await nextTick()
    expect(wrapper.get('div').attributes('data-mode')).toBe('dark')
    expect(requestSpy).not.toHaveBeenCalled()
    expect(solidProbeLog).toEqual([])
  })

  it('forwards init then navigation requests through the surface', async () => {
    wrapper = mountHarness()
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    expect(solidProbeLog[0]).toMatch(/^init:/)
    expect(solidProbeLog[1]).toMatch(/^request:init:\/zh\//)

    routePath.value = '/zh/releases/'
    synctrol.value = {
      locale: 'zh',
      contentType: 'release-collection',
      routePath: '/zh/releases/',
    }
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog.at(-1)).toMatch(
      /^request:navigate:\/zh\/releases\//,
    )
  })

  it('does not load a background when synctrol contentType is missing', async () => {
    synctrol.value = {
      locale: 'zh',
      contentType: undefined as never,
      routePath: '/',
    }
    wrapper = mountHarness()
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    expect(solidProbeLog).toEqual([])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run --project client tests/client/background/BackgroundSurface.test.ts tests/client/background/use-background-runtime.test.ts`
Expected: FAIL — `BackgroundSurface.vue` does not exist yet; composable still returns `syncInput`.

- [ ] **Step 4: Rewrite the composable**

Replace `src/client/background/use-background-runtime.ts`:

```ts
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useData, useRoute } from 'vuepress/client'
import backgroundLoader from 'virtual:synctrol-backgrounds'
import { useResolvedColorMode } from '../composables/useColorMode.js'
import {
  readReducedMotion,
  subscribeReducedMotion,
} from './reduced-motion.js'
import { BackgroundRuntime } from './runtime.js'
import { resolveBackgroundContentType } from './resolve-type.js'
import type { SynctrolClientPageData } from './types.js'
import type {
  BackgroundRequest,
  PageContentType,
} from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'

/**
 * Builds the reactive context refs and a page-identity `requestInput`.
 * BackgroundSurface owns mount / request / dispose — do not call runtime.request here.
 */
export function useBackgroundRuntime(): {
  runtime: BackgroundRuntime
  requestInput: Ref<BackgroundRequest | null>
} {
  const route = useRoute()
  const { page } = useData()
  const colorMode = useResolvedColorMode()
  const reducedMotion = ref(readReducedMotion())

  const unsubscribeMotion = subscribeReducedMotion((value) => {
    reducedMotion.value = value
  })

  const pageData = computed<SynctrolClientPageData | undefined>(
    () => page.value.frontmatter.synctrol as SynctrolClientPageData | undefined,
  )

  const routeRef = computed<{ path: string; identity?: string }>(() => {
    const data = pageData.value
    return {
      path: data?.routePath || route.path || page.value.path,
      ...(data?.identity === undefined ? {} : { identity: data.identity }),
    }
  })

  const contentTypeRef = computed<{
    raw: PageContentType
    resolved: ContentType
  }>(() => {
    const raw = pageData.value?.contentType
    if (!raw) return { raw: 'page', resolved: 'page' }
    return { raw, resolved: resolveBackgroundContentType(raw) }
  })

  const localeRef = computed<string>(() => pageData.value?.locale ?? '')

  const runtime = new BackgroundRuntime({
    loader: backgroundLoader ?? undefined,
    context: {
      route: routeRef,
      contentType: contentTypeRef,
      locale: localeRef,
      colorMode,
      reducedMotion,
    },
  })

  const requestInput = ref<BackgroundRequest | null>(null)

  watch(
    () => {
      const data = pageData.value
      if (!data?.contentType) return null
      const routePath = data.routePath || route.path || page.value.path
      return `${routePath}|${data.contentType}|${data.identity ?? ''}`
    },
    () => {
      const data = pageData.value
      if (!data?.contentType) {
        requestInput.value = null
        return
      }
      requestInput.value = {
        reason: 'navigate',
        routePath: data.routePath || route.path || page.value.path,
        contentType: {
          raw: data.contentType,
          resolved: resolveBackgroundContentType(data.contentType),
        },
        ...(data.identity === undefined ? {} : { identity: data.identity }),
        locale: data.locale,
        colorMode: colorMode.value,
        reducedMotion: reducedMotion.value,
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    unsubscribeMotion()
  })

  return { runtime, requestInput }
}
```

- [ ] **Step 5: Write `src/client/background/BackgroundSurface.vue`**

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BackgroundRuntime } from './runtime.js'
import type { BackgroundRequest } from '../../shared/background.js'
import './background-surface.css'

const props = defineProps<{
  runtime: BackgroundRuntime
  requestInput?: BackgroundRequest | null
}>()

const hostRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!hostRef.value) return
  props.runtime.mount(hostRef.value)
  if (props.requestInput) {
    props.runtime.request({ ...props.requestInput, reason: 'init' })
  }
})

watch(
  () => props.requestInput,
  (input) => {
    if (!hostRef.value || !input) return
    props.runtime.request(input)
  },
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

Update `src/client/background/background-surface.css` — replace the header comment line `/* src/client/background/background-host.css */` with `/* src/client/background/background-surface.css */` (the rest of the CSS is unchanged).

- [ ] **Step 6: Update `src/client/background/index.ts`**

Replace the file:

```ts
export type {
  BackgroundReactiveContext,
  BackgroundRequest,
  IBackgroundHost,
  BackgroundLoader,
  BackgroundModule,
  PageContentType,
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
  BackgroundRuntimeContextRefs,
} from './runtime.js'
export { useBackgroundRuntime } from './use-background-runtime.js'
export type { SynctrolClientPageData } from './types.js'
// Forbidden: export BackgroundSurface.vue
```

- [ ] **Step 7: Update `src/client/layouts/Layout.vue`**

Replace line 5 `import BackgroundHost from '../background/BackgroundHost.vue'` with:

```ts
import BackgroundSurface from '../background/BackgroundSurface.vue'
```

Replace line 53 `const { runtime, syncInput } = useBackgroundRuntime()` with:

```ts
const { runtime, requestInput } = useBackgroundRuntime()
```

Replace line 157 `<BackgroundHost :runtime="runtime" :sync-input="syncInput" />` with:

```html
  <BackgroundSurface :runtime="runtime" :request-input="requestInput" />
```

- [ ] **Step 8: Update assert scripts (BackgroundHost → BackgroundSurface)**

In `scripts/assert-build-artifacts.mjs`, replace line 39 comment and line 43:

Replace line 43 `assert.doesNotMatch(clientJs, /BackgroundHost/)` with:
```js
assert.doesNotMatch(clientJs, /BackgroundSurface/)
```

Replace line 39 `// documentation in the JS-only barrel does not false-positive the boundary check.` — no change needed, but update the preceding comment on line 39's mention of `BackgroundHost` to `BackgroundSurface`:
```js
// Strip line comments so intentional "Forbidden: …Layout.vue / BackgroundSurface"
```

In `scripts/assert-exports-resolve.mjs`, replace line 42 `assert.equal(Object.hasOwn(clientMod, 'BackgroundHost'), false)` with:
```js
assert.equal(Object.hasOwn(clientMod, 'BackgroundSurface'), false)
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run --project client tests/client/background`
Expected: PASS (all client background tests green).

- [ ] **Step 10: Commit**

```bash
git add src/client/background src/client/layouts/Layout.vue tests/client/background scripts/assert-build-artifacts.mjs scripts/assert-exports-resolve.mjs
git commit -m "feat(background): composable + BackgroundSurface host with request lifecycle"
```

---

### Task 6: Update docs and run the full verification suite

**Files:**
- Modify: `AGENTS.md` (lines 29, 185)
- Modify: `README.md` (add `background` option row near line 138)

- [ ] **Step 1: Update AGENTS.md**

Replace the feature list bullet on line 29:
`7. **按内容类型加载的背景模块**：Home / Release / News / Page 各自对应一个 TypeScript 背景入口。`
with:
`7. **全局背景提供者**：单一常驻 `IBackgroundHost`，主题在每次导航时推送「页面申请」，提供者自行编排背景切换（动画 / 交叉淡化 / 硬切），背景可以是图片 / SVG / Canvas / WebGL / WebGPU。`

Replace the options-table row on line 185:
`| `backgrounds` | 空 | `{ home, release, news, page }` 各自 `() => import('./backgrounds/...')` |`
with:
`| `background` | 未设置 | 单一背景提供者 loader，形如 `() => import('./backgrounds/host')`；模块默认导出工厂 `(context) => IBackgroundHost`。未设置则纯色背景 |`

- [ ] **Step 2: Update README**

Add a row to the "常用可选项" table after the `featureFont` row (line 137):

```md
| 自定义背景 | `background: () => import('./backgrounds/host')`（见下） |
```

Then, after the table (after line 138), add a short section:

```md
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

配置里写 `background: () => import('./backgrounds/host')`。页面切换时主题只会「通知」提供者，具体动画怎么切由提供者自己决定；不配置 `background` 就是纯色背景。
```

- [ ] **Step 3: Run the full unit suite**

Run: `npm test`
Expected: PASS (all projects).

- [ ] **Step 4: Run the build + artifact/pack/consumer checks**

Run: `npm run build && npm run assert:build-artifacts && npm run assert:pack && npm run assert:exports && npm run test:consumer-smoke`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: document the global background provider option"
```

---

## Self-Review Notes

- **Spec coverage:** contract (Task 1), option + `backgrounds` UNKNOWN_FIELD (Task 2), virtual-module single loader (Task 3), runtime load-once + request forwarding + generation guard (Task 4), composable reactive refs + surface rename + init/navigate requests (Task 5), docs (Task 6). Root router page untouched (its `Root.vue` never imported `BackgroundHost`, so no change).
- **Viewport/DPR:** intentionally absent from the reactive context — providers read their own drawing context per frame (out of scope, per spec).
- **Type consistency:** `PageContentType` defined once in `shared/background.ts` and re-exported from `resolve-type.ts`; `BackgroundRuntimeContextRefs` matches `BackgroundReactiveContext` minus `element`; `request()` forwards `BackgroundRequest` verbatim; `IBackgroundHost` has exactly `request`/`dispose`.
- **Fixture shape:** probes import the new contract; `solidProbeLog` entries are `init:…`, `request:…`, `dispose`.
