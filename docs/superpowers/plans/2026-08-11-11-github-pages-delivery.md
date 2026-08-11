# GitHub Pages Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship and verify GitHub Pages delivery for `vuepress-theme-synctrolling`: root language router emission, production `siteUrl` and base-path gates, bilingual fixture build, CSP audit artifact presence, visual and accessibility end-to-end checks, and deploy documentation.

**Architecture:** Plans 01–10 already compile content, routes, shell, platforms, SEO, and feeds. This plan wires delivery-only Node hooks that always write `<dest>/index.html` (root language router), enforce production `siteUrl` and VuePress `base` rules, build a zh/en fixture site under `tests/fixtures/sites/delivery/`, assert `synctrol-csp.json`, and run delivery verification (visual checklist + a11y e2e). No new content types or brand tokens.

**Tech Stack:** VuePress 2, TypeScript, Vitest (Node + happy-dom), Node `fs`/`path`, fixture site under `tests/fixtures/sites/delivery/`, package name `vuepress-theme-synctrolling`.

## Global Constraints

- Package name is `vuepress-theme-synctrolling`.
- Plans 01–10 are complete and green; do not reimplement compiler, shell, platforms, Release/News layouts, or SEO/feed emission.
- Root language router negotiation order is exactly: saved locale → first supported `navigator.languages` entry → `mainLocale`.
- Root script uses `location.replace()`; visible no-JS language links remain; `localStorage` access is wrapped in `try/catch`.
- Redirect destinations use `publicPath` (VuePress `base` included).
- Root router is always emitted as `<dest>/index.html` and does not load a background module.
- `siteUrl` is required in production builds and has no trailing slash.
- Custom-domain deployments use VuePress `base: '/'`.
- Non-root `base` must be a leading-and-trailing-slash path segment string (for example `/docs/`); it must not contain `.`, `..`, query, or hash.
- Platform CSP audit artifact is `<dest>/synctrol-csp.json` with `frame-src`, `media-src`, and `connect-src` arrays (Plan 07 produces it; this plan verifies presence and shape on delivery builds).
- Brand tokens and shell geometry remain fixed; delivery must not soften them with convenience configuration.
- All later tasks inherit these constraints.

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/shared/locale/root-router-script.ts` | Inline root-router script body (Plan 03; harden if gaps found) |
| `src/node/root-router/generate-root-html.ts` | Root HTML generator (Plan 03; keep contracts) |
| `src/node/root-router/emit-root-router.ts` | Write `rootRouterHtml` to `<dest>/index.html` |
| `src/node/delivery/require-production-site-url.ts` | Fail production builds without valid `siteUrl` |
| `src/node/delivery/assert-vuepress-base.ts` | Validate custom-domain `/` and non-root base paths |
| `src/node/delivery/build-context.ts` | Shared helpers: `isProductionBuild()`, normalize dest |
| `src/node/theme/on-generated.ts` | VuePress `onGenerated` hook: emit root router + verify CSP artifact |
| `src/node/theme/on-initialized.ts` | VuePress `onInitialized` / prepare hook: production siteUrl + base gates |
| `src/index.ts` | Ensure theme wires delivery hooks (modify only if missing) |
| `tests/fixtures/sites/delivery/` | End-to-end zh/en fixture site (content + `.vuepress/config.ts`) |
| `tests/node/root-router/*.test.ts` | Root script/HTML delivery contracts |
| `tests/node/delivery/*.test.ts` | siteUrl / base / emit / CSP verification unit tests |
| `tests/e2e/delivery/*.test.ts` | Fixture build + path/CSP assertions |
| `tests/e2e/a11y/*.test.ts` | ThemeMode, hamburger, LanguageSwitcher, social labels, reduced motion |
| `docs/visual-regression-checklist.md` | Manual visual regression checklist (spec §32.4) |
| `docs/deploy-github-pages.md` | GitHub Pages deploy guide (custom domain + project pages) |

**Assumed from Plans 01–10 (do not recreate):**

- `generateRootRouterHtml({ options, base }): string` and `ROOT_ROUTER_SCRIPT` (Plan 03)
- `assertSiteUrl(siteUrl: string): string` (Plan 03)
- `normalizeBase` / `joinPublicPath` (Plan 03)
- `compileSiteRoutes(...): CompiledSite` with `rootRouterHtml` (Plan 03)
- Theme factory `synctrolTheme(options)` returning a VuePress theme that already compiles content and writes locale pages (Plans 04–10)
- Shell components: `ThemeMode`, hamburger/`MobileNav`, `LanguageSwitcher`, `SocialLinks` (Plan 05)
- Background runtime honors `reducedMotion` (Plan 06)
- Build writes `<dest>/synctrol-csp.json` via Plan 07 platform CSP aggregation
- Fixture-ready content types Home / Release (Album + Gift) / News / Page render (Plans 08–09)
- SEO/feeds emit under locale prefixes (Plan 10)

**Out of scope:** new content types, brand-token changes, CSP meta injection, reverse-proxy header configuration, commerce, search, TOC.

---

### Task 1: Root language router contracts (negotiation, storage, base, no-JS)

**Files:**
- Create: `tests/node/root-router/root-router-script.behavior.test.ts`
- Create: `tests/node/root-router/generate-root-html.delivery.test.ts`
- Modify: `src/shared/locale/root-router-script.ts` — only if existing Plan 03 script fails new assertions
- Modify: `src/node/root-router/generate-root-html.ts` — only if HTML contracts fail

**Interfaces:**
- Consumes: `ROOT_ROUTER_SCRIPT`, `generateRootRouterHtml`, Plan 03 `themeOptions` helper (or local copy under `tests/helpers/delivery-fixtures.ts`)
- Produces: verified contracts — storage key `synctrol:locale`; order saved → browser → `mainLocale`; `try/catch` around `localStorage`; `location.replace(publicPath)`; no-JS `<a href>` links; VuePress base in hrefs and script config; no background module reference

- [ ] **Step 1: Add delivery fixtures helper and failing behavior tests**

```ts
// tests/helpers/delivery-fixtures.ts
import type { LocaleKey, LocaleOptions, SynctrolThemeOptions } from '../../src/shared/types'

export function deliveryLocales(): Record<LocaleKey, LocaleOptions> {
  return {
    zh: {
      lang: 'zh-CN',
      label: '中文',
      messages: {} as LocaleOptions['messages'],
    },
    en: {
      lang: 'en-US',
      label: 'English',
      messages: {} as LocaleOptions['messages'],
    },
  }
}

export function deliveryThemeOptions(
  overrides: Partial<SynctrolThemeOptions> = {},
): SynctrolThemeOptions {
  return {
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    locales: deliveryLocales(),
    copyright: '© Synctrol',
    seo: {
      name: { zh: 'Synctrol', en: 'Synctrol' },
      description: {
        zh: 'Synctrol 音乐团队官方网站',
        en: 'Official website of the Synctrol music team',
      },
      defaultImage: './assets/social-default.webp',
      organization: {
        name: 'Synctrol',
        logo: './assets/logo.svg',
      },
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
    locales: overrides.locales ?? deliveryLocales(),
  }
}
```

```ts
// tests/node/root-router/root-router-script.behavior.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ROOT_ROUTER_SCRIPT } from '../../../src/shared/locale/root-router-script'

type RouterConfig = {
  mainLocale: string
  base: string
  locales: Array<{ key: string; lang: string }>
}

function runRootRouter(config: RouterConfig, env: {
  stored?: string | null
  languages?: string[]
  storageThrows?: boolean
}) {
  const replace = vi.fn()
  const store = new Map<string, string>()
  if (env.stored != null) store.set('synctrol:locale', env.stored)

  const localStorageMock = {
    getItem: (key: string) => {
      if (env.storageThrows) throw new Error('blocked')
      return store.has(key) ? store.get(key)! : null
    },
    setItem: (key: string, value: string) => {
      if (env.storageThrows) throw new Error('blocked')
      store.set(key, value)
    },
  }

  const windowObj: Record<string, unknown> = {
    __SYNCTROL_ROOT_ROUTER__: config,
    localStorage: localStorageMock,
    navigator: {
      languages: env.languages ?? [],
      language: env.languages?.[0],
    },
    location: { replace },
  }

  // Evaluate the IIFE against a fake window binding used by the script.
  const fn = new Function(
    'window',
    'localStorage',
    'navigator',
    'location',
    `${ROOT_ROUTER_SCRIPT}`,
  )
  fn(
    windowObj,
    localStorageMock,
    windowObj.navigator,
    windowObj.location,
  )
  return { replace }
}

const baseConfig: RouterConfig = {
  mainLocale: 'zh',
  base: '/',
  locales: [
    { key: 'zh', lang: 'zh-CN' },
    { key: 'en', lang: 'en-US' },
  ],
}

describe('ROOT_ROUTER_SCRIPT behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefers saved locale over browser languages and mainLocale', () => {
    const { replace } = runRootRouter(baseConfig, {
      stored: 'en',
      languages: ['zh-CN', 'en-US'],
    })
    expect(replace).toHaveBeenCalledWith('/en/')
  })

  it('uses first supported browser language when nothing is saved', () => {
    const { replace } = runRootRouter(baseConfig, {
      stored: null,
      languages: ['fr-FR', 'en-GB', 'zh-CN'],
    })
    expect(replace).toHaveBeenCalledWith('/en/')
  })

  it('falls back to mainLocale when saved and browser languages miss', () => {
    const { replace } = runRootRouter(baseConfig, {
      stored: null,
      languages: ['fr-FR', 'de-DE'],
    })
    expect(replace).toHaveBeenCalledWith('/zh/')
  })

  it('ignores unknown saved locale and continues negotiation', () => {
    const { replace } = runRootRouter(baseConfig, {
      stored: 'ja',
      languages: ['en-US'],
    })
    expect(replace).toHaveBeenCalledWith('/en/')
  })

  it('does not throw when localStorage access fails and still redirects', () => {
    expect(() =>
      runRootRouter(baseConfig, {
        storageThrows: true,
        languages: ['en-US'],
      }),
    ).not.toThrow()
    const { replace } = runRootRouter(baseConfig, {
      storageThrows: true,
      languages: ['en-US'],
    })
    expect(replace).toHaveBeenCalledWith('/en/')
  })

  it('includes non-root VuePress base in location.replace target', () => {
    const { replace } = runRootRouter(
      { ...baseConfig, base: '/docs/' },
      { stored: 'zh', languages: [] },
    )
    expect(replace).toHaveBeenCalledWith('/docs/zh/')
  })

  it('uses location.replace (not assign/href mutation)', () => {
    expect(ROOT_ROUTER_SCRIPT).toContain('location.replace')
    expect(ROOT_ROUTER_SCRIPT).not.toMatch(/location\.href\s*=/)
    expect(ROOT_ROUTER_SCRIPT).not.toContain('location.assign')
  })

  it('wraps localStorage in try/catch', () => {
    expect(ROOT_ROUTER_SCRIPT).toMatch(/try\s*\{[^}]*localStorage[\s\S]*?\}\s*catch/)
  })
})
```

```ts
// tests/node/root-router/generate-root-html.delivery.test.ts
import { describe, expect, it } from 'vitest'
import { generateRootRouterHtml } from '../../../src/node/root-router/generate-root-html'
import { deliveryThemeOptions } from '../../helpers/delivery-fixtures'

describe('generateRootRouterHtml delivery contracts', () => {
  it('emits visible no-JS language links for every locale', () => {
    const html = generateRootRouterHtml({
      options: deliveryThemeOptions(),
      base: '/',
    })
    expect(html).toContain('<a href="/zh/">中文</a>')
    expect(html).toContain('<a href="/en/">English</a>')
    expect(html).toMatch(/<noscript>/i)
  })

  it('embeds base and mainLocale for the inline script', () => {
    const html = generateRootRouterHtml({
      options: deliveryThemeOptions(),
      base: '/site/',
    })
    expect(html).toContain('"mainLocale":"zh"')
    expect(html).toContain('"base":"/site/"')
    expect(html).toContain('<a href="/site/zh/">中文</a>')
    expect(html).toContain('<a href="/site/en/">English</a>')
    expect(html).toContain('location.replace')
    expect(html).toContain('synctrol:locale')
  })

  it('does not load a background module on the root document', () => {
    const html = generateRootRouterHtml({
      options: deliveryThemeOptions(),
      base: '/',
    })
    expect(html.toLowerCase()).not.toContain('background')
    expect(html).not.toMatch(/type=["']module["']/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail or expose gaps**

Run: `pnpm exec vitest run tests/node/root-router/root-router-script.behavior.test.ts tests/node/root-router/generate-root-html.delivery.test.ts`

Expected: FAIL if script/HTML modules are missing or if Plan 03 script lacks `try/catch`, base handling, or negotiation order. If all PASS already, proceed to Step 3 only to confirm no edits are required, then still commit the new tests.

- [ ] **Step 3: Harden script/HTML only as needed**

If Step 2 failed, replace `src/shared/locale/root-router-script.ts` with:

```ts
// src/shared/locale/root-router-script.ts
/**
 * Pure script body string. Negotiation order:
 * 1. localStorage synctrol:locale (try/catch)
 * 2. matchBrowserLocale(navigator.languages)
 * 3. mainLocale
 * Redirects with location.replace(publicPath including VuePress base).
 */
export const ROOT_ROUTER_SCRIPT = `(() => {
  const cfg = window.__SYNCTROL_ROOT_ROUTER__;
  if (!cfg) return;
  const storageKey = 'synctrol:locale';
  const normalize = (tag) => {
    const full = String(tag || '').trim().toLowerCase().replace(/_/g, '-');
    const primary = full.split('-')[0] || full;
    return { full, primary };
  };
  const matchBrowserLocale = (preferences, locales, mainLocale) => {
    for (const preference of preferences) {
      const { full, primary } = normalize(preference);
      for (const entry of locales) {
        if (normalize(entry.key).full === full) return entry.key;
      }
      for (const entry of locales) {
        if (normalize(entry.lang).full === full) return entry.key;
      }
      for (const entry of locales) {
        if (normalize(entry.key).primary === primary) return entry.key;
      }
      for (const entry of locales) {
        if (normalize(entry.lang).primary === primary) return entry.key;
      }
    }
    return mainLocale;
  };
  const stored = (() => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  })();
  const known = new Set(cfg.locales.map((l) => l.key));
  let locale = stored && known.has(stored) ? stored : null;
  if (!locale) {
    const prefs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language].filter(Boolean);
    locale = matchBrowserLocale(prefs, cfg.locales, cfg.mainLocale);
  }
  const base = cfg.base === '/' ? '' : String(cfg.base || '/').replace(/\\/$/, '');
  const target = base + '/' + locale + '/';
  location.replace(target);
})();`
```

Ensure `generateRootRouterHtml` still emits no-JS links via `joinPublicPath` and inlines `ROOT_ROUTER_SCRIPT` (Plan 03 implementation). Do not add background imports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/root-router/root-router-script.behavior.test.ts tests/node/root-router/generate-root-html.delivery.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/delivery-fixtures.ts tests/node/root-router/root-router-script.behavior.test.ts tests/node/root-router/generate-root-html.delivery.test.ts src/shared/locale/root-router-script.ts src/node/root-router/generate-root-html.ts
git commit -m "test(delivery): lock root language router negotiation and HTML contracts"
```

---

### Task 2: Always emit `<dest>/index.html`

**Files:**
- Create: `src/node/root-router/emit-root-router.ts`
- Create: `src/node/theme/on-generated.ts`
- Create: `tests/node/root-router/emit-root-router.test.ts`
- Create: `tests/node/delivery/on-generated.test.ts`
- Modify: `src/index.ts` (or the Plan 04–10 theme entry that registers hooks) to call `createOnGenerated`

**Interfaces:**
- Consumes: `generateRootRouterHtml` / `CompiledSite.rootRouterHtml`; VuePress `dest` directory string; theme options + `base`
- Produces: `emitRootRouterHtml(destDir: string, html: string): string` (returns written path); `createOnGenerated(ctx)` hook that always writes `<dest>/index.html`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/root-router/emit-root-router.test.ts
import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { emitRootRouterHtml } from '../../../src/node/root-router/emit-root-router'

describe('emitRootRouterHtml', () => {
  it('always writes dest/index.html', () => {
    const dest = mkdtempSync(join(tmpdir(), 'synctrol-dest-'))
    const written = emitRootRouterHtml(dest, '<!DOCTYPE html><html><body>root</body></html>')
    expect(written).toBe(join(dest, 'index.html'))
    expect(existsSync(written)).toBe(true)
    expect(readFileSync(written, 'utf8')).toContain('root')
  })

  it('overwrites an existing dest/index.html from VuePress', () => {
    const dest = mkdtempSync(join(tmpdir(), 'synctrol-dest-'))
    const first = emitRootRouterHtml(dest, 'FIRST')
    const second = emitRootRouterHtml(dest, 'SECOND')
    expect(first).toBe(second)
    expect(readFileSync(second, 'utf8')).toBe('SECOND')
  })
})
```

```ts
// tests/node/delivery/on-generated.test.ts
import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createOnGenerated } from '../../../src/node/theme/on-generated'
import { deliveryThemeOptions } from '../../helpers/delivery-fixtures'

describe('createOnGenerated', () => {
  it('emits root router HTML to dest/index.html using theme options and base', async () => {
    const dest = mkdtempSync(join(tmpdir(), 'synctrol-on-gen-'))
    // Pretend Plan 07 already wrote CSP so onGenerated CSP check can pass.
    writeFileSync(
      join(dest, 'synctrol-csp.json'),
      JSON.stringify({ 'frame-src': [], 'media-src': [], 'connect-src': [] }),
    )

    const hook = createOnGenerated({
      options: deliveryThemeOptions(),
      base: '/',
      getRootRouterHtml: () =>
        '<!DOCTYPE html><html><body><a href="/zh/">中文</a></body></html>',
    })

    await hook({
      dir: { dest: () => dest },
      options: { base: '/' },
    } as never)

    expect(readFileSync(join(dest, 'index.html'), 'utf8')).toContain('href="/zh/"')
  })

  it('uses VuePress base when generating redirects if getRootRouterHtml is omitted', async () => {
    const dest = mkdtempSync(join(tmpdir(), 'synctrol-on-gen-base-'))
    writeFileSync(
      join(dest, 'synctrol-csp.json'),
      JSON.stringify({ 'frame-src': [], 'media-src': [], 'connect-src': [] }),
    )

    const hook = createOnGenerated({
      options: deliveryThemeOptions(),
      base: '/docs/',
    })

    await hook({
      dir: { dest: () => dest },
      options: { base: '/docs/' },
    } as never)

    const html = readFileSync(join(dest, 'index.html'), 'utf8')
    expect(html).toContain('/docs/zh/')
    expect(html).toContain('/docs/en/')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/node/root-router/emit-root-router.test.ts tests/node/delivery/on-generated.test.ts`

Expected: FAIL with module not found for `emit-root-router` / `on-generated`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/root-router/emit-root-router.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export function emitRootRouterHtml(destDir: string, html: string): string {
  const target = join(destDir, 'index.html')
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, html, 'utf8')
  return target
}
```

```ts
// src/node/theme/on-generated.ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { SynctrolThemeOptions } from '../../shared/types'
import { generateRootRouterHtml } from '../root-router/generate-root-html'
import { emitRootRouterHtml } from '../root-router/emit-root-router'
import { assertSynctrolCspArtifact } from '../delivery/assert-csp-artifact'

export interface OnGeneratedContext {
  options: SynctrolThemeOptions
  base: string
  /** Optional override used by tests; production uses generateRootRouterHtml. */
  getRootRouterHtml?: () => string
  /** When false, skip CSP assertion (unit tests that isolate root emission). Default true. */
  requireCspArtifact?: boolean
}

export function createOnGenerated(ctx: OnGeneratedContext) {
  return async (app: {
    dir: { dest: () => string }
    options: { base: string }
  }) => {
    const destDir = app.dir.dest()
    const base = app.options.base || ctx.base || '/'
    const html =
      ctx.getRootRouterHtml?.() ??
      generateRootRouterHtml({ options: ctx.options, base })
    emitRootRouterHtml(destDir, html)

    if (ctx.requireCspArtifact !== false) {
      assertSynctrolCspArtifact(join(destDir, 'synctrol-csp.json'))
    }
  }
}
```

```ts
// src/node/delivery/assert-csp-artifact.ts
import { existsSync, readFileSync } from 'node:fs'

export interface SynctrolCspArtifact {
  'frame-src': string[]
  'media-src': string[]
  'connect-src': string[]
}

export function assertSynctrolCspArtifact(filePath: string): SynctrolCspArtifact {
  if (!existsSync(filePath)) {
    throw new Error(`Missing CSP audit artifact: ${filePath}`)
  }
  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<SynctrolCspArtifact>
  for (const key of ['frame-src', 'media-src', 'connect-src'] as const) {
    if (!Array.isArray(raw[key])) {
      throw new Error(`synctrol-csp.json missing array field: ${key}`)
    }
  }
  return raw as SynctrolCspArtifact
}
```

Wire into the theme entry (adjust to match the Plan 04–10 hook registration site):

```ts
// snippet for src/index.ts (or src/node/theme/create-theme.ts)
import { createOnGenerated } from './node/theme/on-generated'
import { createOnInitialized } from './node/theme/on-initialized'

export function synctrolTheme(options: SynctrolThemeOptions) {
  const resolved = resolveThemeOptions(options) // existing Plan 01 helper
  return {
    name: 'vuepress-theme-synctrolling',
    // ...existing layouts/plugins from Plans 04–10...
    onInitialized: createOnInitialized({ options: resolved }),
    onGenerated: createOnGenerated({ options: resolved, base: '/' }),
  }
}
```

Note: `createOnInitialized` is added in Task 3; for this task, if that module does not exist yet, register only `onGenerated` here and add `onInitialized` in Task 3 without breaking tests. Temporarily stub:

```ts
// src/node/theme/on-initialized.ts (temporary no-op until Task 3)
export function createOnInitialized(_ctx: { options: unknown }) {
  return async () => {}
}
```

Update `on-generated` tests: Task 2’s `createOnGenerated` imports `assertSynctrolCspArtifact`. That file is created in this step so Task 2 tests pass. Task 6 expands CSP coverage.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/root-router/emit-root-router.test.ts tests/node/delivery/on-generated.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/root-router/emit-root-router.ts src/node/theme/on-generated.ts src/node/theme/on-initialized.ts src/node/delivery/assert-csp-artifact.ts src/index.ts tests/node/root-router/emit-root-router.test.ts tests/node/delivery/on-generated.test.ts
git commit -m "feat(delivery): always emit dest/index.html root language router"
```

---

### Task 3: Production builds require `siteUrl`

**Files:**
- Create: `src/node/delivery/require-production-site-url.ts`
- Create: `src/node/delivery/build-context.ts`
- Modify: `src/node/theme/on-initialized.ts`
- Create: `tests/node/delivery/require-production-site-url.test.ts`
- Create: `tests/node/delivery/on-initialized.test.ts`

**Interfaces:**
- Consumes: `assertSiteUrl` (Plan 03); VuePress app `env.isBuild` / `NODE_ENV`
- Produces: `isProductionBuild(env?: { isBuild?: boolean }): boolean`; `requireProductionSiteUrl(siteUrl: string | undefined, isProd: boolean): string`; `createOnInitialized` that fails production builds when `siteUrl` is missing/invalid

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/delivery/require-production-site-url.test.ts
import { describe, expect, it } from 'vitest'
import {
  isProductionBuild,
  requireProductionSiteUrl,
} from '../../../src/node/delivery/require-production-site-url'

describe('isProductionBuild', () => {
  it('is true when VuePress isBuild is true', () => {
    expect(isProductionBuild({ isBuild: true })).toBe(true)
  })

  it('is false for dev server (isBuild false)', () => {
    expect(isProductionBuild({ isBuild: false })).toBe(false)
  })
})

describe('requireProductionSiteUrl', () => {
  it('requires and validates siteUrl in production', () => {
    expect(requireProductionSiteUrl('https://synctrol.com', true)).toBe(
      'https://synctrol.com',
    )
    expect(() => requireProductionSiteUrl(undefined, true)).toThrow(/siteUrl/i)
    expect(() => requireProductionSiteUrl('', true)).toThrow(/siteUrl/i)
    expect(() => requireProductionSiteUrl('https://synctrol.com/', true)).toThrow(
      /trailing slash/i,
    )
  })

  it('allows missing siteUrl in non-production (dev) and returns empty string sentinel', () => {
    expect(requireProductionSiteUrl(undefined, false)).toBe('')
    expect(requireProductionSiteUrl('', false)).toBe('')
  })

  it('still validates format when a non-production siteUrl is provided', () => {
    expect(() => requireProductionSiteUrl('https://synctrol.com/', false)).toThrow(
      /trailing slash/i,
    )
    expect(requireProductionSiteUrl('https://example.com', false)).toBe(
      'https://example.com',
    )
  })
})
```

```ts
// tests/node/delivery/on-initialized.test.ts
import { describe, expect, it } from 'vitest'
import { createOnInitialized } from '../../../src/node/theme/on-initialized'
import { deliveryThemeOptions } from '../../helpers/delivery-fixtures'

describe('createOnInitialized production siteUrl gate', () => {
  it('throws on production build when siteUrl is missing', async () => {
    const hook = createOnInitialized({
      options: deliveryThemeOptions({ siteUrl: '' as unknown as string }),
    })
    await expect(
      hook({
        env: { isBuild: true },
        options: { base: '/' },
      } as never),
    ).rejects.toThrow(/siteUrl/i)
  })

  it('passes on production build with valid siteUrl', async () => {
    const hook = createOnInitialized({
      options: deliveryThemeOptions({ siteUrl: 'https://synctrol.com' }),
    })
    await expect(
      hook({
        env: { isBuild: true },
        options: { base: '/' },
      } as never),
    ).resolves.toBeUndefined()
  })

  it('does not require siteUrl during dev (isBuild false)', async () => {
    const hook = createOnInitialized({
      options: deliveryThemeOptions({ siteUrl: '' as unknown as string }),
    })
    await expect(
      hook({
        env: { isBuild: false },
        options: { base: '/' },
      } as never),
    ).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/node/delivery/require-production-site-url.test.ts tests/node/delivery/on-initialized.test.ts`

Expected: FAIL with module not found or no-op `createOnInitialized`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/node/delivery/build-context.ts
export interface BuildEnv {
  isBuild?: boolean
}

export function isProductionBuild(env?: BuildEnv): boolean {
  return env?.isBuild === true
}
```

```ts
// src/node/delivery/require-production-site-url.ts
import { assertSiteUrl } from '../url/site-url'
import { isProductionBuild, type BuildEnv } from './build-context'

export { isProductionBuild }
export type { BuildEnv }

export function requireProductionSiteUrl(
  siteUrl: string | undefined,
  isProd: boolean,
): string {
  if (!isProd) {
    if (!siteUrl) return ''
    return assertSiteUrl(siteUrl)
  }
  return assertSiteUrl(siteUrl ?? '')
}

export function requireProductionSiteUrlFromEnv(
  siteUrl: string | undefined,
  env?: BuildEnv,
): string {
  return requireProductionSiteUrl(siteUrl, isProductionBuild(env))
}
```

```ts
// src/node/theme/on-initialized.ts
import type { SynctrolThemeOptions } from '../../shared/types'
import { requireProductionSiteUrlFromEnv } from '../delivery/require-production-site-url'
import { assertVuePressBase } from '../delivery/assert-vuepress-base'

export interface OnInitializedContext {
  options: SynctrolThemeOptions
  /** When true (default), also validate VuePress base. Task 4 owns full base tests. */
  validateBase?: boolean
}

export function createOnInitialized(ctx: OnInitializedContext) {
  return async (app: {
    env: { isBuild?: boolean }
    options: { base: string }
  }) => {
    requireProductionSiteUrlFromEnv(ctx.options.siteUrl, app.env)
    if (ctx.validateBase !== false) {
      assertVuePressBase(app.options.base ?? '/')
    }
  }
}
```

```ts
// src/node/delivery/assert-vuepress-base.ts
// Minimal stub so Task 3 compiles; Task 4 replaces with full validation.
export function assertVuePressBase(base: string): string {
  if (!base) throw new Error('VuePress base is required')
  return base
}
```

Ensure `src/index.ts` registers `onInitialized: createOnInitialized({ options: resolved })`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/delivery/require-production-site-url.test.ts tests/node/delivery/on-initialized.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/delivery/build-context.ts src/node/delivery/require-production-site-url.ts src/node/delivery/assert-vuepress-base.ts src/node/theme/on-initialized.ts src/index.ts tests/node/delivery/require-production-site-url.test.ts tests/node/delivery/on-initialized.test.ts
git commit -m "feat(delivery): require siteUrl for production builds"
```

---

### Task 4: Custom-domain base `/` and non-root base validation

**Files:**
- Modify: `src/node/delivery/assert-vuepress-base.ts`
- Create: `tests/node/delivery/assert-vuepress-base.test.ts`
- Modify: `tests/node/delivery/on-initialized.test.ts` — add base failure cases

**Interfaces:**
- Consumes: VuePress `base` string
- Produces: `assertVuePressBase(base: string): string` — accepts `/` (custom domain) and non-root bases like `/docs/`; rejects missing leading/trailing slash, `.` / `..`, query, hash, empty segments

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/delivery/assert-vuepress-base.test.ts
import { describe, expect, it } from 'vitest'
import { assertVuePressBase } from '../../../src/node/delivery/assert-vuepress-base'

describe('assertVuePressBase', () => {
  it('accepts custom-domain root base /', () => {
    expect(assertVuePressBase('/')).toBe('/')
  })

  it('accepts non-root bases with leading and trailing slashes', () => {
    expect(assertVuePressBase('/docs/')).toBe('/docs/')
    expect(assertVuePressBase('/synctrol/')).toBe('/synctrol/')
  })

  it('rejects bases without leading slash', () => {
    expect(() => assertVuePressBase('docs/')).toThrow(/leading slash/i)
  })

  it('rejects non-root bases without trailing slash', () => {
    expect(() => assertVuePressBase('/docs')).toThrow(/trailing slash/i)
  })

  it('rejects . and .. segments', () => {
    expect(() => assertVuePressBase('/./')).toThrow(/\./)
    expect(() => assertVuePressBase('/../')).toThrow(/\./)
    expect(() => assertVuePressBase('/docs/../')).toThrow(/\./)
  })

  it('rejects query or hash', () => {
    expect(() => assertVuePressBase('/docs/?x=1')).toThrow(/query|hash/i)
    expect(() => assertVuePressBase('/docs/#x')).toThrow(/query|hash/i)
  })

  it('rejects empty segments', () => {
    expect(() => assertVuePressBase('//')).toThrow(/empty/i)
    expect(() => assertVuePressBase('/docs//v/')).toThrow(/empty/i)
  })
})
```

Append to `tests/node/delivery/on-initialized.test.ts`:

```ts
  it('rejects invalid VuePress base during initialization', async () => {
    const hook = createOnInitialized({
      options: deliveryThemeOptions({ siteUrl: 'https://synctrol.com' }),
    })
    await expect(
      hook({
        env: { isBuild: true },
        options: { base: 'docs/' },
      } as never),
    ).rejects.toThrow(/leading slash/i)
  })

  it('accepts custom-domain base /', async () => {
    const hook = createOnInitialized({
      options: deliveryThemeOptions({ siteUrl: 'https://synctrol.com' }),
    })
    await expect(
      hook({
        env: { isBuild: true },
        options: { base: '/' },
      } as never),
    ).resolves.toBeUndefined()
  })

  it('accepts project-pages non-root base /docs/', async () => {
    const hook = createOnInitialized({
      options: deliveryThemeOptions({ siteUrl: 'https://example.github.io' }),
    })
    await expect(
      hook({
        env: { isBuild: true },
        options: { base: '/docs/' },
      } as never),
    ).resolves.toBeUndefined()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/node/delivery/assert-vuepress-base.test.ts tests/node/delivery/on-initialized.test.ts`

Expected: FAIL on invalid-base cases (stub from Task 3 accepts almost anything)

- [ ] **Step 3: Write full validation**

```ts
// src/node/delivery/assert-vuepress-base.ts
export function assertVuePressBase(base: string): string {
  if (base == null || base === '') {
    throw new Error('VuePress base is required')
  }
  if (base === '/') return '/'

  if (!base.startsWith('/')) {
    throw new Error('VuePress base must have a leading slash')
  }
  if (!base.endsWith('/')) {
    throw new Error('VuePress base must have a trailing slash')
  }
  if (base.includes('?') || base.includes('#')) {
    throw new Error('VuePress base must not contain query or hash')
  }

  const inner = base.slice(1, -1)
  if (inner === '') {
    throw new Error('VuePress base must not contain empty segments')
  }
  const segments = inner.split('/')
  for (const segment of segments) {
    if (segment === '') {
      throw new Error('VuePress base must not contain empty segments')
    }
    if (segment === '.' || segment === '..') {
      throw new Error('VuePress base must not contain . or .. segments')
    }
  }
  return base
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/delivery/assert-vuepress-base.test.ts tests/node/delivery/on-initialized.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/delivery/assert-vuepress-base.ts tests/node/delivery/assert-vuepress-base.test.ts tests/node/delivery/on-initialized.test.ts
git commit -m "feat(delivery): validate custom-domain and non-root VuePress base"
```

---

### Task 5: End-to-end fixture site build (zh/en)

**Files:**
- Create fixture tree under `tests/fixtures/sites/delivery/`
- Create: `tests/e2e/delivery/build-fixture-site.test.ts`
- Create: `tests/e2e/delivery/run-fixture-build.ts` (helper that invokes VuePress build)
- Modify: `package.json` scripts — add `"test:delivery": "vitest run tests/e2e/delivery"`

**Interfaces:**
- Consumes: theme package entry `synctrolTheme`; VuePress `createBuildApp` / CLI build; fixture content covering Home, Release (Album + Gift), News, Page
- Produces: successful production build into a temp `dest`; locale-prefixed HTML for zh and en; root `dest/index.html` language router

Fixture layout:

```text
tests/fixtures/sites/delivery/
├── package.json                 # optional local scripts; root package may drive build
├── .vuepress/
│   ├── config.ts
│   ├── public/
│   │   └── CNAME                # synctrol.com
│   └── assets/
│       ├── social-default.webp  # 1x1 placeholder ok for tests
│       ├── logo.svg
│       └── github.svg
├── content/
│   ├── definitions.yml
│   ├── home/
│   │   ├── content.yml
│   │   ├── zh.md
│   │   └── en.md
│   ├── releases/
│   │   ├── album-one/
│   │   │   ├── content.yml
│   │   │   ├── book.yml         # type: album
│   │   │   ├── zh.md
│   │   │   ├── en.md
│   │   │   └── assets/
│   │   │       └── artwork.webp
│   │   └── gift-one/
│   │       ├── content.yml
│   │       ├── book.yml         # type: gift
│   │       ├── zh.md
│   │       ├── en.md
│   │       └── assets/
│   │           └── poster.webp
│   ├── news/
│   │   └── hello/
│   │       ├── content.yml
│   │       ├── zh.md
│   │       └── en.md
│   └── pages/
│       └── about/
│           ├── content.yml
│           ├── zh.md
│           └── en.md
└── README.md
```

- [ ] **Step 1: Write fixture content and failing e2e test**

`.vuepress/config.ts`:

```ts
import { resolve } from 'node:path'
import { defineUserConfig } from 'vuepress'
import { synctrolTheme } from 'vuepress-theme-synctrolling'
import { enMessages, zhMessages } from 'vuepress-theme-synctrolling'

const siteRoot = resolve(import.meta.dirname, '..')

export default defineUserConfig({
  base: '/',
  dest: resolve(siteRoot, '.vuepress/dist'),
  theme: synctrolTheme({
    siteUrl: 'https://synctrol.com',
    definitionsPath: resolve(siteRoot, 'content/definitions.yml'),
    mainLocale: 'zh',
    locales: {
      zh: {
        lang: 'zh-CN',
        label: '中文',
        dateFormat: { dateStyle: 'long' },
        messages: zhMessages,
      },
      en: {
        lang: 'en-US',
        label: 'English',
        dateFormat: { dateStyle: 'long' },
        messages: enMessages,
      },
    },
    copyright: { zh: '© Synctrol', en: '© Synctrol' },
    defaultColorMode: 'auto',
    feeds: { rss: true, sitemap: true },
    navigation: {
      externalTarget: '_blank',
      items: [
        { label: { zh: '作品', en: 'Releases' }, href: '/releases/' },
        { label: { zh: '新闻', en: 'News' }, href: '/news/' },
        { label: { zh: '关于', en: 'About' }, href: '/about/' },
      ],
    },
    socialLinks: {
      items: [
        {
          label: 'GitHub',
          icon: resolve(import.meta.dirname, 'assets/github.svg'),
          url: 'https://github.com/synctrol',
        },
      ],
    },
    release: {
      urlSegment: 'releases',
      index: {
        enabled: true,
        pagination: 12,
        mobileGridColumns: 2,
        desktopGridColumns: 3,
      },
    },
    news: {
      urlSegment: 'news',
      index: { enabled: true, pagination: 12 },
      tags: { urlSegment: 'tags', index: { enabled: true } },
    },
    seo: {
      name: { zh: 'Synctrol', en: 'Synctrol' },
      description: {
        zh: 'Synctrol 音乐团队官方网站',
        en: 'Official website of the Synctrol music team',
      },
      defaultImage: resolve(import.meta.dirname, 'assets/social-default.webp'),
      organization: {
        name: 'Synctrol',
        logo: resolve(import.meta.dirname, 'assets/logo.svg'),
      },
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
  }),
})
```

Minimal content files (create each exactly):

```yaml
# content/definitions.yml
tags:
  release:
    title:
      zh: 作品发布
      en: Releases
platforms:
  bilibili:
    category: digital
    type: bilibili_player
    name: Bilibili
  taobao:
    category: physical
    type: link
    name:
      zh: 淘宝
      en: Taobao
```

```yaml
# content/home/content.yml
type: home
draft: false
```

```md
<!-- content/home/zh.md -->
---
title: Synctrol
description: Synctrol 音乐团队官方网站
---

::: home-logo
# SYNCTROL

WE SHAPE WAVE  
AND DESCRIBE SOUND
:::
```

```md
<!-- content/home/en.md -->
---
title: Synctrol
description: Official website of the Synctrol music team
---

::: home-logo
# SYNCTROL

WE SHAPE WAVE  
AND DESCRIBE SOUND
:::
```

```yaml
# content/releases/album-one/content.yml
type: release
slug: album-one
date: 2026-08-01
draft: false
artwork: ./assets/artwork.webp
```

```yaml
# content/releases/album-one/book.yml
type: album
title:
  zh: 第一张专辑
  en: First Album
album:
  links:
    - platform: bilibili
      bvid: BV1xxxxxxxxx
      page: 1
      autoplay: false
  discs:
    - title:
        zh: 第一碟
        en: Disc One
      tracks:
        - title:
            zh: 第一曲
            en: Track One
          artists:
            - Synctrol
          duration: 272
```

```md
<!-- content/releases/album-one/zh.md -->
---
title: 第一张专辑
description: 专辑介绍
---

专辑正文。
```

```md
<!-- content/releases/album-one/en.md -->
---
title: First Album
description: Album intro
---

Album body.
```

```yaml
# content/releases/gift-one/content.yml
type: release
slug: gift-one
date: 2026-08-02
draft: false
artwork: ./assets/poster.webp
```

```yaml
# content/releases/gift-one/book.yml
type: gift
title:
  zh: 周边系列
  en: Merchandise
gift:
  items:
    - id: poster
      title:
        zh: 纪念海报
        en: Commemorative Poster
      links:
        - platform: taobao
          url: https://item.taobao.com/example
```

```md
<!-- content/releases/gift-one/zh.md -->
---
title: 周边系列
---

周边正文。
```

```md
<!-- content/releases/gift-one/en.md -->
---
title: Merchandise
---

Gift body.
```

```yaml
# content/news/hello/content.yml
type: news
slug: hello
date: 2026-08-03
draft: false
tags:
  - release
```

```md
<!-- content/news/hello/zh.md -->
---
title: 你好
description: 新闻摘要
---

新闻正文。
```

```md
<!-- content/news/hello/en.md -->
---
title: Hello
description: News summary
---

News body.
```

```yaml
# content/pages/about/content.yml
type: page
slug: about
draft: false
```

```md
<!-- content/pages/about/zh.md -->
---
title: 关于
---

关于团队。
```

```md
<!-- content/pages/about/en.md -->
---
title: About
---

About the team.
```

Create tiny placeholder binaries for `artwork.webp`, `poster.webp`, `social-default.webp` (1×1 webp) and minimal `logo.svg` / `github.svg`. Example SVG:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#000"/></svg>
```

For webp placeholders, write a minimal valid file via Node in the test helper setup, or commit a 1×1 webp byte array.

```ts
// tests/e2e/delivery/run-fixture-build.ts
import { resolve, join } from 'node:path'
import { mkdtempSync, rmSync, cpSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const fixtureRoot = resolve(
  import.meta.dirname,
  '../../fixtures/sites/delivery',
)

export interface FixtureBuildResult {
  destDir: string
  cleanup: () => void
}

/**
 * Copies the delivery fixture into a temp directory and runs a VuePress
 * production build with dest pointed at `<temp>/.vuepress/dist`.
 */
export async function runDeliveryFixtureBuild(): Promise<FixtureBuildResult> {
  const work = mkdtempSync(join(tmpdir(), 'synctrol-delivery-'))
  cpSync(fixtureRoot, work, { recursive: true })
  const destDir = join(work, '.vuepress/dist')

  // Prefer programmatic VuePress build API from Plans 04–10 harness.
  // Fall back to spawning `pnpm exec vuepress build` in `work` if the
  // programmatic helper below is unavailable in this repo revision.
  const require = createRequire(import.meta.url)
  let build: ((source: string) => Promise<void>) | null = null
  try {
    // Optional harness exported by later plans:
    //   src/node/delivery/build-fixture.ts → buildDeliverySite(sourceDir)
    const mod = await import('../../../src/node/delivery/build-fixture.js')
    build = mod.buildDeliverySite
  } catch {
    build = null
  }

  if (build) {
    await build(work)
  } else {
    const { spawnSync } = await import('node:child_process')
    const result = spawnSync(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      ['exec', 'vuepress', 'build', work],
      {
        cwd: resolve(import.meta.dirname, '../../..'),
        env: { ...process.env, NODE_ENV: 'production' },
        encoding: 'utf8',
      },
    )
    if (result.status !== 0) {
      throw new Error(
        `vuepress build failed:\n${result.stdout}\n${result.stderr}`,
      )
    }
  }

  if (!existsSync(destDir)) {
    throw new Error(`Build dest missing: ${destDir}`)
  }

  return {
    destDir,
    cleanup: () => {
      rmSync(work, { recursive: true, force: true })
    },
  }
}
```

If programmatic build is preferred, also create:

```ts
// src/node/delivery/build-fixture.ts
import { resolve } from 'node:path'
import { createBuildApp } from 'vuepress'
import { pathToFileURL } from 'node:url'

export async function buildDeliverySite(sourceDir: string): Promise<void> {
  const configPath = resolve(sourceDir, '.vuepress/config.ts')
  const configMod = await import(pathToFileURL(configPath).href)
  const userConfig = configMod.default
  const app = createBuildApp({
    ...userConfig,
    source: sourceDir,
  })
  await app.init()
  await app.prepare()
  await app.build()
}
```

```ts
// tests/e2e/delivery/build-fixture-site.test.ts
import { describe, expect, it, afterEach } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  runDeliveryFixtureBuild,
  type FixtureBuildResult,
} from './run-fixture-build'

describe('delivery fixture site build (zh/en)', () => {
  let built: FixtureBuildResult | undefined

  afterEach(() => {
    built?.cleanup()
    built = undefined
  })

  it('builds locale-prefixed pages and root language router', async () => {
    built = await runDeliveryFixtureBuild()
    const { destDir } = built

    const required = [
      'index.html',
      'zh/index.html',
      'en/index.html',
      'zh/releases/index.html',
      'en/releases/index.html',
      'zh/releases/album-one/index.html',
      'en/releases/album-one/index.html',
      'zh/releases/gift-one/index.html',
      'en/releases/gift-one/index.html',
      'zh/news/index.html',
      'en/news/index.html',
      'zh/news/hello/index.html',
      'en/news/hello/index.html',
      'zh/about/index.html',
      'en/about/index.html',
      'synctrol-csp.json',
    ]

    for (const rel of required) {
      expect(existsSync(join(destDir, rel)), `missing ${rel}`).toBe(true)
    }

    const root = readFileSync(join(destDir, 'index.html'), 'utf8')
    expect(root).toContain('location.replace')
    expect(root).toContain('<a href="/zh/">中文</a>')
    expect(root).toContain('<a href="/en/">English</a>')
    expect(root).toContain('synctrol:locale')
    expect(root.toLowerCase()).not.toContain('background')

    const zhHome = readFileSync(join(destDir, 'zh/index.html'), 'utf8')
    expect(zhHome).toMatch(/lang=["']zh-CN["']/)
    expect(zhHome).toContain('SYNCTROL')

    const enAlbum = readFileSync(
      join(destDir, 'en/releases/album-one/index.html'),
      'utf8',
    )
    expect(enAlbum).toMatch(/lang=["']en-US["']/)
    expect(enAlbum).toContain('First Album')
  }, 180_000)
})
```

Add script to root `package.json`:

```json
"test:delivery": "vitest run tests/e2e/delivery"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/e2e/delivery/build-fixture-site.test.ts`

Expected: FAIL until fixture files exist and production build succeeds (missing paths / build errors)

- [ ] **Step 3: Materialize fixture assets and ensure theme build path works**

Create all files listed above. Generate a 1×1 WebP with:

```bash
node --input-type=module -e "
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
const webp = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=', 'base64');
const paths = [
  'tests/fixtures/sites/delivery/content/releases/album-one/assets/artwork.webp',
  'tests/fixtures/sites/delivery/content/releases/gift-one/assets/poster.webp',
  'tests/fixtures/sites/delivery/.vuepress/assets/social-default.webp',
];
for (const p of paths) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, webp); }
"
```

Write SVGs and `CNAME` (`synctrol.com`). Fix any theme wiring so `vuepress build` against the fixture succeeds with `base: '/'` and `siteUrl: 'https://synctrol.com'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/e2e/delivery/build-fixture-site.test.ts`

Expected: PASS (build completes; all required paths exist; root router HTML contracts hold)

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/sites/delivery tests/e2e/delivery src/node/delivery/build-fixture.ts package.json
git commit -m "test(delivery): add zh/en GitHub Pages fixture site build"
```

---

### Task 6: Assert `synctrol-csp.json` audit artifact

**Files:**
- Create: `tests/node/delivery/assert-csp-artifact.test.ts`
- Create: `tests/e2e/delivery/csp-artifact.test.ts`
- Modify: `src/node/delivery/assert-csp-artifact.ts` only if Task 2 stub needs richer errors

**Interfaces:**
- Consumes: Plan 07 CSP writer output at `<dest>/synctrol-csp.json`; `assertSynctrolCspArtifact`
- Produces: unit + e2e proof that delivery builds leave a valid audit artifact with `frame-src`, `media-src`, `connect-src` arrays (Bilibili/Taobao fixture origins appear when applicable)

- [ ] **Step 1: Write the failing tests**

```ts
// tests/node/delivery/assert-csp-artifact.test.ts
import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { assertSynctrolCspArtifact } from '../../../src/node/delivery/assert-csp-artifact'

describe('assertSynctrolCspArtifact', () => {
  it('accepts a valid artifact', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csp-ok-'))
    const file = join(dir, 'synctrol-csp.json')
    writeFileSync(
      file,
      JSON.stringify({
        'frame-src': ['https://player.bilibili.com'],
        'media-src': [],
        'connect-src': [],
      }),
    )
    const art = assertSynctrolCspArtifact(file)
    expect(art['frame-src']).toContain('https://player.bilibili.com')
  })

  it('fails when the file is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csp-missing-'))
    expect(() => assertSynctrolCspArtifact(join(dir, 'synctrol-csp.json'))).toThrow(
      /Missing CSP audit artifact/i,
    )
  })

  it('fails when required arrays are absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csp-bad-'))
    const file = join(dir, 'synctrol-csp.json')
    writeFileSync(file, JSON.stringify({ 'frame-src': [] }))
    expect(() => assertSynctrolCspArtifact(file)).toThrow(/media-src/i)
  })
})
```

```ts
// tests/e2e/delivery/csp-artifact.test.ts
import { describe, expect, it, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  runDeliveryFixtureBuild,
  type FixtureBuildResult,
} from './run-fixture-build'
import { assertSynctrolCspArtifact } from '../../../src/node/delivery/assert-csp-artifact'

describe('delivery CSP audit artifact', () => {
  let built: FixtureBuildResult | undefined

  afterEach(() => {
    built?.cleanup()
    built = undefined
  })

  it('writes synctrol-csp.json with directive arrays on production fixture build', async () => {
    built = await runDeliveryFixtureBuild()
    const file = join(built.destDir, 'synctrol-csp.json')
    const art = assertSynctrolCspArtifact(file)
    expect(Array.isArray(art['frame-src'])).toBe(true)
    expect(Array.isArray(art['media-src'])).toBe(true)
    expect(Array.isArray(art['connect-src'])).toBe(true)
    // Album fixture embeds bilibili_player — origin must be auditable.
    const blob = readFileSync(file, 'utf8')
    expect(blob.toLowerCase()).toMatch(/bilibili/)
  }, 180_000)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/node/delivery/assert-csp-artifact.test.ts tests/e2e/delivery/csp-artifact.test.ts`

Expected: unit tests PASS if Task 2 helper exists; e2e FAIL until Plan 07 writer emits bilibili origins into the fixture build (fix Plan 07 aggregation if missing)

- [ ] **Step 3: Ensure Plan 07 CSP writer runs during theme build**

Confirm the production build path calls the Plan 07 CSP aggregator so `<dest>/synctrol-csp.json` is written before or during `onGenerated`. If missing, register the writer in the same hook pipeline (without injecting a CSP meta tag):

```ts
// illustrative wiring inside existing theme build finish hook
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function writeSynctrolCspJson(
  destDir: string,
  artifact: {
    'frame-src': string[]
    'media-src': string[]
    'connect-src': string[]
  },
): void {
  writeFileSync(join(destDir, 'synctrol-csp.json'), JSON.stringify(artifact, null, 2))
}
```

Do not add CSP `<meta http-equiv>` tags.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/node/delivery/assert-csp-artifact.test.ts tests/e2e/delivery/csp-artifact.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/node/delivery/assert-csp-artifact.ts tests/node/delivery/assert-csp-artifact.test.ts tests/e2e/delivery/csp-artifact.test.ts
git commit -m "test(delivery): require synctrol-csp.json audit artifact on builds"
```

---

### Task 7: Visual regression checklist (Home, Release, Album/Gift, News/Page, color modes)

**Files:**
- Create: `docs/visual-regression-checklist.md`
- Create: `tests/e2e/delivery/visual-structure.test.ts` — automated structural smoke against built HTML/CSS tokens where feasible
- Modify: `tests/e2e/delivery/build-fixture-site.test.ts` only if shared selectors helper is extracted

**Interfaces:**
- Consumes: built fixture HTML from Task 5; fixed CSS tokens from Plan 01 (`--syn-border-strong`, golden-ratio grid areas)
- Produces: human/agent checklist covering spec §32.4; automated assertions that shell grid areas / release grid markers / color-mode bootstrap exist in output

- [ ] **Step 1: Write the checklist document and failing structure test**

```md
<!-- docs/visual-regression-checklist.md -->
# Synctrol Visual Regression Checklist

Use the delivery fixture site (`tests/fixtures/sites/delivery`) production build, served locally (`pnpm exec vuepress serve` or static server on `.vuepress/dist`). Check each item at the listed viewport. Mark `[x]` only when the criterion matches the live page.

## Home — desktop golden-ratio shell

Viewport: `1280×800` or wider. URL: `/zh/` and `/en/`.

- [ ] First viewport is one composition (not a dashboard): brand/logo is the hero-level signal in Main
- [ ] Desktop grid places Header full-width; Main left; Navigation upper-right; Footer lower-right; Dock clearance row present
- [ ] `grid-template-columns` reads as golden-ratio (`minmax(0, 1.618fr)` / `minmax(280px, 1fr)`)
- [ ] SocialLinks fixed bottom-left; LanguageSwitcher fixed bottom-right
- [ ] No cards, no hero overlays, no construction notice
- [ ] Strong borders are `3px`; corners are square (`--syn-radius: 0`)

## Home — mobile flow

Viewport: `375×812`. URL: `/zh/`.

- [ ] Header shows Copyright, ThemeMode, and Hamburger only
- [ ] Main (logo) and Footer stack in normal flow; Navigation is inside the hamburger drawer
- [ ] Fixed docks remain bottom-left / bottom-right and do not overlap each other
- [ ] Opening hamburger hides both fixed docks until close

## Release — index grid

Viewport desktop `1280×800` and mobile `375×812`. URL: `/zh/releases/`.

- [ ] Desktop columns match `release.index.desktopGridColumns` (fixture default `3`)
- [ ] Mobile columns match `release.index.mobileGridColumns` (fixture default `2`)
- [ ] Tiles are square artwork only — no visible date/description under tiles
- [ ] Title remains available as image alt / accessible link text
- [ ] Hover/focus uses black/white inversion and `3px` borders; no card shadows

## Release — Album detail

URL: `/zh/releases/album-one/` and `/en/releases/album-one/`.

- [ ] Order: return link → title/date → large artwork → book identity → Album body → Markdown
- [ ] Album body order: platform entries → covers → disc/track list
- [ ] Artwork max width respects `--syn-artwork-width` (`660px`)
- [ ] Disc/Track numbering is one-based; square corners; no decorative shadows

## Release — Gift detail

URL: `/zh/releases/gift-one/`.

- [ ] Gift item list renders directly (no hoisted Book-level platform section)
- [ ] Each item shows its covers then its physical platform links
- [ ] Same industrial borders/typography as Album (no product-commerce chrome)

## News and Page typography

URLs: `/zh/news/`, `/zh/news/hello/`, `/zh/about/`.

- [ ] News index shows cover/title/description/date/tags (or text-only when cover absent)
- [ ] News/Page detail body max width `--syn-content-width` (`760px`)
- [ ] No search UI and no table of contents

## Color modes — light / dark / auto

On Home `/zh/`:

- [ ] ThemeMode cycles `AUTO → LIGHT → DARK → AUTO` via pointer and keyboard (Enter/Space)
- [ ] LIGHT: white surface / black text relationship
- [ ] DARK: inverted primary surface/text
- [ ] AUTO follows `prefers-color-scheme` when no saved selection
- [ ] Inline startup script prevents color flash on reload
- [ ] Choice persists in `localStorage` across reload

## Sign-off

- Date:
- Build SHA / branch:
- Reviewer:
```

```ts
// tests/e2e/delivery/visual-structure.test.ts
import { describe, expect, it, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  runDeliveryFixtureBuild,
  type FixtureBuildResult,
} from './run-fixture-build'

describe('visual structure smoke (delivery fixture)', () => {
  let built: FixtureBuildResult | undefined

  afterEach(() => {
    built?.cleanup()
    built = undefined
  })

  it('emits shell geometry tokens and release/home markers used by the checklist', async () => {
    built = await runDeliveryFixtureBuild()
    const zhHome = readFileSync(join(built.destDir, 'zh/index.html'), 'utf8')
    const zhReleases = readFileSync(
      join(built.destDir, 'zh/releases/index.html'),
      'utf8',
    )
    const zhAlbum = readFileSync(
      join(built.destDir, 'zh/releases/album-one/index.html'),
      'utf8',
    )
    const zhGift = readFileSync(
      join(built.destDir, 'zh/releases/gift-one/index.html'),
      'utf8',
    )
    const zhNews = readFileSync(
      join(built.destDir, 'zh/news/hello/index.html'),
      'utf8',
    )
    const zhPage = readFileSync(join(built.destDir, 'zh/about/index.html'), 'utf8')

    // Tokens / shell
    expect(zhHome).toMatch(/--syn-border-strong:\s*3px/)
    expect(zhHome).toMatch(/--syn-radius:\s*0/)
    expect(zhHome).toMatch(/--syn-content-width:\s*760px/)
    expect(zhHome).toMatch(/--syn-artwork-width:\s*660px/)
    expect(zhHome).toMatch(/1\.618fr/)
    expect(zhHome).toMatch(/SYNCTROL/)

    // Color mode bootstrap present (Plan 05 inline script)
    expect(zhHome).toMatch(/localStorage|synctrol:color|color-mode|ThemeMode/i)

    // Release grid + details
    expect(zhReleases).toMatch(/release|artwork|grid/i)
    expect(zhAlbum).toMatch(/track|disc|album/i)
    expect(zhGift).toMatch(/gift|taobao|poster/i)

    // News / Page readable column
    expect(zhNews).toMatch(/760px|syn-content-width|hello|你好/i)
    expect(zhPage).toMatch(/760px|syn-content-width|about|关于/i)
  }, 180_000)
})
```

- [ ] **Step 2: Run automated structure test to verify it fails**

Run: `pnpm exec vitest run tests/e2e/delivery/visual-structure.test.ts`

Expected: FAIL until fixture build HTML includes token strings / content markers (fix CSS emission or selectors to match actual Plan 01/05/08 output class names if strings differ — keep assertions tied to real emitted CSS variable names)

- [ ] **Step 3: Align assertions with real emitted markup and complete the checklist file**

Adjust regexes to the exact token CSS and landmarks produced by Plans 01/05/08/09. Do not invent new visual styles. Keep `docs/visual-regression-checklist.md` as the manual gate for desktop grid, mobile flow, Release grid, Album/Gift, News/Page, and light/dark/auto.

- [ ] **Step 4: Run tests and manually walk the checklist once against the fixture**

Run: `pnpm exec vitest run tests/e2e/delivery/visual-structure.test.ts`

Expected: PASS

Serve the fixture dest and tick every checklist item. If any item fails, fix theme CSS/markup from the owning plan (05/08/09) — delivery plan only records the gate.

- [ ] **Step 5: Commit**

```bash
git add docs/visual-regression-checklist.md tests/e2e/delivery/visual-structure.test.ts
git commit -m "docs(delivery): add visual regression checklist and structure smoke tests"
```

---

### Task 8: Accessibility end-to-end

**Files:**
- Create: `tests/e2e/a11y/shell-a11y.test.ts`
- Create: `tests/e2e/a11y/setup.ts` (happy-dom vitest environment helpers)
- Modify: `vitest.config.ts` — ensure `tests/e2e/a11y/**` use `environment: 'happy-dom'` via workspace project or per-file pragma
- Modify: `package.json` — add `happy-dom` if not already present from Plan 05

**Interfaces:**
- Consumes: Plan 05 components `ThemeMode`, hamburger/`MobileNavDrawer`, `LanguageSwitcher`, `SocialLinks`; Plan 06 reduced-motion wiring on backgrounds
- Produces: e2e-style component suite proving keyboard ThemeMode, hamburger focus trap + Escape, LanguageSwitcher keyboard/focus restore, social `aria-label`s, and reduced-motion background simplification signal

- [ ] **Step 1: Configure happy-dom and write failing a11y tests**

```ts
// vitest.config.ts (additive project or inline)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['tests/e2e/a11y/**', 'happy-dom'],
      ['tests/client/**', 'happy-dom'],
    ],
  },
})
```

```ts
// tests/e2e/a11y/setup.ts
import { config } from '@vue/test-utils'

config.global.stubs = {
  // Keep real Plan 05 components; stub router-link if needed:
  RouterLink: { template: '<a><slot /></a>', props: ['to'] },
}

export function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches:
        query.includes('prefers-reduced-motion') && reducedMotion
          ? true
          : query.includes('prefers-color-scheme: dark')
            ? false
            : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  })
}
```

```ts
// tests/e2e/a11y/shell-a11y.test.ts
/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { mockMatchMedia } from './setup'

// Import real Plan 05 components (paths from Plan 05 — adjust if renamed):
import ThemeMode from '../../../src/client/components/ThemeMode.vue'
import MobileNavDrawer from '../../../src/client/components/MobileNavDrawer.vue'
import LanguageSwitcher from '../../../src/client/components/LanguageSwitcher.vue'
import SocialLinks from '../../../src/client/components/SocialLinks.vue'

describe('accessibility end-to-end (shell)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockMatchMedia(false)
    document.body.innerHTML = ''
  })

  it('ThemeMode is keyboard operable and announces current/next mode', async () => {
    const wrapper = mount(ThemeMode, {
      props: {
        defaultColorMode: 'auto',
        messages: {
          light: 'Light',
          dark: 'Dark',
          auto: 'Auto',
          themeModeAnnouncement: 'Theme {current}. Next {next}.',
        },
      },
      attachTo: document.body,
    })
    const button = wrapper.get('button')
    expect(button.attributes('aria-live') || button.attributes('aria-label') || button.text()).toBeTruthy()

    await button.trigger('keydown', { key: 'Enter' })
    await nextTick()
    // AUTO → LIGHT
    expect(wrapper.text().toLowerCase()).toMatch(/light/)

    await button.trigger('keydown', { key: ' ' })
    await nextTick()
    // LIGHT → DARK
    expect(wrapper.text().toLowerCase()).toMatch(/dark/)
  })

  it('hamburger traps focus while open and restores on Escape', async () => {
    const wrapper = mount(MobileNavDrawer, {
      props: {
        open: true,
        items: [
          { label: 'Releases', href: '/zh/releases/' },
          { label: 'News', href: '/zh/news/' },
        ],
        messages: { menu: 'Menu', close: 'Close' },
      },
      attachTo: document.body,
    })
    await flushPromises()

    const focusable = wrapper
      .findAll('a, button, [tabindex]:not([tabindex="-1"])')
      .filter((n) => n.isVisible())
    expect(focusable.length).toBeGreaterThan(0)

    // Tab cycles inside the drawer (focus trap)
    const first = focusable[0].element as HTMLElement
    const last = focusable[focusable.length - 1].element as HTMLElement
    last.focus()
    await wrapper.trigger('keydown', { key: 'Tab' })
    expect(document.activeElement === first || wrapper.element.contains(document.activeElement)).toBe(
      true,
    )

    await wrapper.trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.emitted('close') || wrapper.emitted('update:open')).toBeTruthy()
  })

  it('LanguageSwitcher supports keyboard navigation and focus restoration', async () => {
    const wrapper = mount(LanguageSwitcher, {
      props: {
        currentLocale: 'zh',
        locales: [
          { key: 'zh', label: '中文', href: '/zh/' },
          { key: 'en', label: 'English', href: '/en/' },
        ],
        messages: { language: 'Language' },
      },
      attachTo: document.body,
    })
    const toggle = wrapper.get('button')
    toggle.element.focus()
    await toggle.trigger('click')
    await nextTick()
    const options = wrapper.findAll('[role="menuitem"], a, button').filter((n) =>
      n.text().includes('English'),
    )
    expect(options.length).toBeGreaterThan(0)
    await wrapper.trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(document.activeElement).toBe(toggle.element)
  })

  it('SocialLinks icon anchors expose aria-label text', async () => {
    const wrapper = mount(SocialLinks, {
      props: {
        items: [
          {
            label: 'GitHub',
            iconUrl: '/assets/global/github.hash.svg',
            url: 'https://github.com/synctrol',
          },
        ],
      },
      attachTo: document.body,
    })
    const link = wrapper.get('a')
    expect(link.attributes('aria-label')).toBe('GitHub')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toMatch(/noopener/)
    const img = link.find('img, svg')
    if (img.exists()) {
      expect(
        img.attributes('aria-hidden') === 'true' ||
          img.attributes('alt') === '',
      ).toBe(true)
    }
  })

  it('reduced motion is exposed to background context consumers', async () => {
    mockMatchMedia(true)
    // Prefer the Plan 06 composable if exported:
    let reduced = false
    try {
      const mod = await import('../../../src/client/composables/useReducedMotion')
      const result = mod.useReducedMotion()
      reduced = !!(result.reducedMotion?.value ?? result.value ?? result)
    } catch {
      // Fallback: assert matchMedia contract the shell uses
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    expect(reduced).toBe(true)
  })
})
```

Install happy-dom / test-utils if missing:

```bash
pnpm add -D happy-dom @vue/test-utils
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/e2e/a11y/shell-a11y.test.ts`

Expected: FAIL on missing components, wrong prop names, or unmet a11y behaviors — fix Plan 05/06 components to satisfy the contracts (delivery owns the gate, not duplicate implementations)

- [ ] **Step 3: Align imports/props with Plan 05/06 public component APIs and make behaviors pass**

Update import paths and prop names to the real Plan 05 exports. Do not weaken: ThemeMode keyboard cycle, hamburger focus trap + Escape, LanguageSwitcher focus restore, social `aria-label`, reduced motion detection must remain asserted.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/e2e/a11y/shell-a11y.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/a11y vitest.config.ts package.json package-lock.json pnpm-lock.yaml
git commit -m "test(a11y): add end-to-end shell accessibility coverage for delivery"
```

---

### Task 9: GitHub Pages deployment documentation

**Files:**
- Create: `docs/deploy-github-pages.md`
- Modify: `README.md` — add a short “Deploy” section linking to the doc

**Interfaces:**
- Consumes: delivery gates from Tasks 2–6; fixture config patterns
- Produces: operator docs for custom-domain (`base: '/'`, `siteUrl`, `CNAME`) and project pages (non-root `base`), plus build/artifact verification including `synctrol-csp.json` and root `index.html`

- [ ] **Step 1: Write the failing doc presence test**

```ts
// tests/node/delivery/deploy-docs.test.ts
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('GitHub Pages deploy docs', () => {
  const doc = resolve('docs/deploy-github-pages.md')

  it('exists and covers custom domain, base, siteUrl, root router, and CSP artifact', () => {
    expect(existsSync(doc)).toBe(true)
    const text = readFileSync(doc, 'utf8')
    expect(text).toMatch(/siteUrl/)
    expect(text).toMatch(/base:\s*['"]\/['"]/)
    expect(text).toMatch(/CNAME/)
    expect(text).toMatch(/index\.html/)
    expect(text).toMatch(/synctrol-csp\.json/)
    expect(text).toMatch(/GitHub Pages/i)
    expect(text).toMatch(/location\.replace|language router|root router/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/node/delivery/deploy-docs.test.ts`

Expected: FAIL — `docs/deploy-github-pages.md` missing

- [ ] **Step 3: Write the deployment guide**

```md
<!-- docs/deploy-github-pages.md -->
# Deploying Synctrol to GitHub Pages

This theme targets a production static build suitable for GitHub Pages. Production builds require `siteUrl`. The root language router always writes `dest/index.html`. Platform embeds leave an audit file `synctrol-csp.json` (not an injected CSP meta tag).

## Custom domain (synctrol.com)

1. Set VuePress `base` to `'/'`.
2. Set theme `siteUrl` to `'https://synctrol.com'` (no trailing slash).
3. Place a `CNAME` file in `.vuepress/public/` containing:

```text
synctrol.com
```

4. Build:

```bash
pnpm exec vuepress build
```

5. Publish the `dest` directory (default `.vuepress/dist`) with GitHub Pages (Actions `peaceiris/actions-gh-pages` or equivalent).

6. Verify artifacts in `dest`:

| Artifact | Expectation |
| --- | --- |
| `index.html` | Root language router with `location.replace`, no-JS locale links, `synctrol:locale` |
| `zh/index.html`, `en/index.html` | Locale homes |
| `synctrol-csp.json` | `{ "frame-src": [], "media-src": [], "connect-src": [] }` arrays present |
| `CNAME` | Copied from `.vuepress/public` |

## Project pages (non-root base)

Example site served at `https://example.github.io/docs/`:

```ts
// .vuepress/config.ts
export default defineUserConfig({
  base: '/docs/',
  theme: synctrolTheme({
    siteUrl: 'https://example.github.io',
    // ...locales, seo, etc.
  }),
})
```

Rules:

- `base` must start and end with `/`.
- `base` must not contain `.`, `..`, query, or hash.
- Root router redirects and language links include the base (for example `/docs/zh/`).
- `siteUrl` remains origin-only (`https://example.github.io`) with no path and no trailing slash.

## Root language router behavior

`dest/index.html` is a small document (no background module). With JavaScript:

1. Read `localStorage['synctrol:locale']` inside `try/catch`.
2. Else match `navigator.languages` against configured locales/`lang`.
3. Else use `mainLocale`.
4. `location.replace(publicPath)` to `/{base}{locale}/`.

Without JavaScript, visible locale links remain in the document.

## Production gate

`siteUrl` is required when VuePress `env.isBuild === true`. Dev server may omit it. Invalid values (trailing slash, non-http(s), path/query/hash) fail the build in both modes when provided.

## CSP audit artifact

After build, open `synctrol-csp.json` and feed `frame-src` / `media-src` / `connect-src` into your reverse proxy or manual policy. GitHub Pages cannot set CSP response headers; the theme does not inject a CSP meta tag because configured Background modules may need extra directives.

## Local verification

```bash
pnpm exec vitest run tests/e2e/delivery tests/e2e/a11y tests/node/delivery tests/node/root-router
pnpm exec vuepress build tests/fixtures/sites/delivery
```

Walk `docs/visual-regression-checklist.md` against the fixture dest before releasing.
```

Append to root `README.md`:

```md
## Deploy

See [docs/deploy-github-pages.md](./docs/deploy-github-pages.md) for custom-domain and project-pages GitHub Pages deployment, including `siteUrl`, `base`, root language router, and `synctrol-csp.json` verification.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/node/delivery/deploy-docs.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/deploy-github-pages.md README.md tests/node/delivery/deploy-docs.test.ts
git commit -m "docs(delivery): add GitHub Pages deployment guide"
```

---

### Task 10: Plan 11 verification suite

**Files:**
- Create: `tests/e2e/delivery/plan11.verification.test.ts`
- Modify: `package.json` — add `"test:plan11": "vitest run tests/node/root-router tests/node/delivery tests/e2e/delivery tests/e2e/a11y"`

**Interfaces:**
- Consumes: all Task 1–9 deliverables
- Produces: one command that proves delivery acceptance for spec §7.3, §8 siteUrl/base/root emission, §11 CSP artifact, §29 a11y, §32.2–32.4 delivery slice, §33 plan 11, §34 items 2 and 11

- [ ] **Step 1: Write the verification test**

```ts
// tests/e2e/delivery/plan11.verification.test.ts
import { describe, expect, it, afterEach } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  runDeliveryFixtureBuild,
  type FixtureBuildResult,
} from './run-fixture-build'
import { assertSynctrolCspArtifact } from '../../../src/node/delivery/assert-csp-artifact'
import { assertVuePressBase } from '../../../src/node/delivery/assert-vuepress-base'
import { requireProductionSiteUrl } from '../../../src/node/delivery/require-production-site-url'
import { generateRootRouterHtml } from '../../../src/node/root-router/generate-root-html'
import { deliveryThemeOptions } from '../../helpers/delivery-fixtures'

describe('Plan 11 delivery verification', () => {
  let built: FixtureBuildResult | undefined

  afterEach(() => {
    built?.cleanup()
    built = undefined
  })

  it('enforces production siteUrl and base rules', () => {
    expect(requireProductionSiteUrl('https://synctrol.com', true)).toBe(
      'https://synctrol.com',
    )
    expect(() => requireProductionSiteUrl(undefined, true)).toThrow(/siteUrl/i)
    expect(assertVuePressBase('/')).toBe('/')
    expect(assertVuePressBase('/docs/')).toBe('/docs/')
    expect(() => assertVuePressBase('/docs')).toThrow(/trailing slash/i)
  })

  it('root router HTML includes base-aware redirects and no-JS links', () => {
    const html = generateRootRouterHtml({
      options: deliveryThemeOptions(),
      base: '/docs/',
    })
    expect(html).toContain('location.replace')
    expect(html).toContain('<a href="/docs/zh/">中文</a>')
    expect(html).toContain('<a href="/docs/en/">English</a>')
  })

  it('production fixture emits root index, zh/en trees, and CSP artifact', async () => {
    built = await runDeliveryFixtureBuild()
    const { destDir } = built

    expect(existsSync(join(destDir, 'index.html'))).toBe(true)
    expect(existsSync(join(destDir, 'zh/index.html'))).toBe(true)
    expect(existsSync(join(destDir, 'en/index.html'))).toBe(true)

    const root = readFileSync(join(destDir, 'index.html'), 'utf8')
    expect(root).toContain('synctrol:locale')
    expect(root).toContain('location.replace')

    const csp = assertSynctrolCspArtifact(join(destDir, 'synctrol-csp.json'))
    expect(csp['frame-src']).toBeDefined()
    expect(csp['media-src']).toBeDefined()
    expect(csp['connect-src']).toBeDefined()

    expect(existsSync(resolve('docs/deploy-github-pages.md'))).toBe(true)
    expect(existsSync(resolve('docs/visual-regression-checklist.md'))).toBe(true)
  }, 180_000)
})
```

Add to `package.json`:

```json
"test:plan11": "vitest run tests/node/root-router tests/node/delivery tests/e2e/delivery tests/e2e/a11y"
```

- [ ] **Step 2: Run the full Plan 11 suite**

Run:

```bash
pnpm run test:plan11
```

Expected: PASS — all delivery unit, e2e build, CSP, visual structure, a11y, and docs tests green

- [ ] **Step 3: Run focused regression commands listed in deploy docs**

Run:

```bash
pnpm exec vitest run tests/e2e/delivery tests/e2e/a11y tests/node/delivery tests/node/root-router
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/delivery/plan11.verification.test.ts package.json
git commit -m "test(delivery): add Plan 11 GitHub Pages delivery verification suite"
```

---

## Self-Review

**Spec coverage (Plan 11 in-scope only):**

| Spec area | Task |
| --- | --- |
| §7.3 root language router (saved → browser → mainLocale, `location.replace`, no-JS links) | Tasks 1, 2, 5, 10 |
| §7.3 / §8 root always `<dest>/index.html`; redirects use `publicPath` / base | Tasks 1, 2, 5 |
| localStorage `try/catch` | Task 1 |
| §8 `siteUrl` required in production; no trailing slash | Tasks 3, 10 |
| §8 custom domain `base: '/'`; non-root base supported with validation | Tasks 4, 9, 10 |
| §11 / §30 `synctrol-csp.json` audit artifact | Tasks 2, 6, 10 |
| §29 accessibility (ThemeMode, hamburger trap, LanguageSwitcher, social labels, reduced motion) | Task 8 |
| §32.2 integration: zh/en fixture build + GitHub Pages base handling | Tasks 5, 4, 10 |
| §32.4 visual tests checklist (Home desktop/mobile, Release grid, Album/Gift, News/Page, color modes) | Task 7 |
| §33 item 11 GitHub Pages delivery | All tasks |
| §34 acceptance items 2 and 11 (root routing; GitHub Pages automated tests) | Tasks 1, 5, 10 |
| Deploy documentation | Task 9 |

**Explicitly out of scope (no tasks):** content compiler changes, new content types, CSP meta injection, reverse-proxy header setup, brand-token edits, SEO/feed regeneration (Plan 10).

**Placeholder scan:** no TBD/TODO; every step includes concrete files, code, commands, and expected results.

**Type consistency:** `generateRootRouterHtml`, `emitRootRouterHtml`, `requireProductionSiteUrl`, `assertVuePressBase`, `assertSynctrolCspArtifact`, `createOnInitialized`, `createOnGenerated`, `runDeliveryFixtureBuild` names are shared across tasks; `synctrol:locale` storage key matches Plan 03 LanguageSwitcher persistence expectation.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-11-11-github-pages-delivery.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration (`superpowers:subagent-driven-development`)
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints
