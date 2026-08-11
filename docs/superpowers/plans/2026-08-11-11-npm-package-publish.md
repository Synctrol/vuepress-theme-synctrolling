# NPM Package Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize and ship `vuepress-theme-synctrolling` as a public npm package: publishable `package.json`, `dist/` build with node + client artifacts, pack-content gates, consumer-fixture install/build smoke, consumer README + CHANGELOG, and CI test/publish-on-tag workflow.

**Architecture:** Plans 01–10 already implement the theme (compiler, shell, platforms, Release/News, SEO/feeds) including Plan 03 root language router emission for consumer sites that may host on GitHub Pages. This plan does **not** deploy GitHub Pages. It hardens the package boundary: compile/copy into `dist/`, assert `npm pack` contents, prove a minimal VuePress consumer can install the tarball and build zh/en, document consumer usage (including static-hosting notes for root router / `siteUrl` / `base`), and wire GitHub Actions for CI + tag publish. Visual/a11y end-to-end for the theme is verified through the consumer fixture build and existing theme tests, not a Pages deploy.

**Tech Stack:** Node.js 20+, npm, TypeScript (`tsc`), Vitest, VuePress 2, Vue 3, GitHub Actions (OIDC trusted publishing or `NPM_TOKEN` placeholder), package name `vuepress-theme-synctrolling`.

## Global Constraints

- Package name is `vuepress-theme-synctrolling` (currently unscoped). This repository **is** the theme package and **publishes** it; Synctrol.com is a **separate consumer site**, not this repo.
- Plans 01–10 are complete and green; do not reimplement compiler, shell, platforms, Release/News layouts, SEO/feeds, or root-router generation.
- Root language router implementation remains Plan 03; Plan 11 only documents consumer usage (`siteUrl`, VuePress `base`, root `/` redirect behavior).
- GitHub Pages deploy is **out of goal** for Plan 11. A short “consumer static hosting notes” subsection in the public README is enough.
- Brand tokens and shell geometry remain fixed; publishing must not soften them with convenience configuration.
- Published tarball must not leak `tests/`, `docs/superpowers/`, or fixtures unless intentionally listed under `files`.
- `type` is `"module"`; peer deps remain `vue` and `vuepress`.
- Version strategy is SemVer; first public release is `0.1.0` (Plan 01 scaffold used `0.0.0` + `"private": true`).
- All later tasks inherit these constraints.

## File Structure

| Path | Responsibility |
| --- | --- |
| `package.json` | Publish metadata, exports, files, peers, engines, scripts, `prepublishOnly` |
| `tsconfig.json` | Existing NodeNext emit to `dist/` (adjust only if copy/build needs it) |
| `scripts/copy-package-assets.mjs` | Copy `.vue`, `.css`, fonts, and other non-TS client assets into `dist/` |
| `scripts/assert-pack-contents.mjs` | Assert `npm pack --dry-run` / pack listing excludes leaks and includes required paths |
| `scripts/assert-exports-resolve.mjs` | Resolve package exports (`.`, `./client`, CSS/messages) from built `dist/` |
| `scripts/prepublish-check.mjs` | Orchestrate tests → build → pack assert → exports resolve |
| `src/node/theme.ts` | Ensure `clientConfigFile` resolves to published `dist/client/config.js` |
| `src/client/styles/fonts.css` | `@font-face` for self-hosted Archivo Black (if not already present) |
| `src/client/assets/fonts/archivo-black.woff2` | Display font binary shipped in `dist/` |
| `src/client/styles/index.ts` | Import fonts + tokens + shell (+ feature CSS from Plans 05–09) |
| `tests/publish/package-json.test.ts` | Assert publishable `package.json` shape |
| `tests/publish/build-artifacts.test.ts` | Assert `dist/` contains node + client artifacts consumers need |
| `tests/publish/pack-contents.test.ts` | Assert pack allow/deny lists |
| `tests/fixtures/sites/consumer-smoke/` | Minimal VuePress consumer site (zh/en) that depends on the theme |
| `tests/e2e/publish/consumer-smoke.test.ts` | Pack → install tarball into fixture → `vuepress build` → assert paths |
| `tests/e2e/publish/consumer-a11y-smoke.test.ts` | Fixture-output / shell contract smoke for a11y-critical markers |
| `README.md` | Public consumer docs: install, minimal config, content layout, hosting notes |
| `CHANGELOG.md` | Bootstrap changelog for `0.1.0` |
| `LICENSE` | SPDX license file matching `package.json` `license` |
| `.github/workflows/ci.yml` | PR/push CI: install, test, build, pack asserts |
| `.github/workflows/publish.yml` | Tag `v*` publish workflow (OIDC preferred + token fallback docs) |
| `.npmignore` | Defense-in-depth exclusions if any path slips past `files` |

**Assumed from Plans 01–10 (do not recreate):**

- `synctrolTheme(options)` theme factory in `src/node/theme.ts` / `src/index.ts`
- `zhMessages` / `enMessages` from `src/shared/messages.ts`, re-exported from package root
- Client entry `src/client/index.ts` + `src/client/config.ts` with layouts and styles
- CSS tokens in `src/client/styles/tokens.css`; shell/feature CSS imported via `src/client/styles/index.ts`
- Root router emission via Plan 03 (`generateRootRouterHtml` / `onGenerated`)
- Production `siteUrl` validation and locale-prefixed routes
- Vitest suite green via `npm test`
- Existing e2e/component tests cover shell a11y behaviors; Plan 11 adds consumer-fixture smoke, not a Pages deploy

**Out of scope:** deploying this repo to GitHub Pages, changing brand tokens, new content types, commerce, search, TOC, reverse-proxy CSP header injection.

---

### Task 1: Publishable `package.json` metadata and exports

**Files:**
- Create: `tests/publish/package-json.test.ts`
- Create: `LICENSE`
- Modify: `package.json`

**Interfaces:**
- Consumes: Plan 01 scaffold fields (`name`, `type`, early `exports`)
- Produces: publish-ready `package.json` with SemVer `0.1.0`, `private` removed/false, `exports` for `.` / `./client` / `./styles.css` / message re-exports via `.`, `files: ["dist"]`, peers, engines, repository, license, optional `publishConfig.access` comment-by-field for future scope

- [ ] **Step 1: Write the failing package metadata test**

```ts
// tests/publish/package-json.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(
  readFileSync(resolve('package.json'), 'utf8'),
) as Record<string, unknown>

describe('publishable package.json', () => {
  it('uses the approved unscoped package name and SemVer start version', () => {
    expect(pkg.name).toBe('vuepress-theme-synctrolling')
    expect(pkg.version).toBe('0.1.0')
    expect(pkg.private).toBeFalsy()
    expect(pkg.type).toBe('module')
    expect(pkg.license).toBe('MIT')
  })

  it('declares ESM exports for theme root, client, and CSS entry', () => {
    const exportsMap = pkg.exports as Record<string, unknown>
    expect(exportsMap['.']).toEqual({
      types: './dist/index.d.ts',
      default: './dist/index.js',
    })
    expect(exportsMap['./client']).toEqual({
      types: './dist/client/index.d.ts',
      default: './dist/client/index.js',
    })
    expect(exportsMap['./styles.css']).toBe('./dist/client/styles/tokens.css')
  })

  it('ships only dist and declares peers, engines, and repository', () => {
    expect(pkg.files).toEqual(['dist'])
    expect(pkg.peerDependencies).toEqual({
      vue: '^3.5.0',
      vuepress: '^2.0.0',
    })
    expect(pkg.engines).toEqual({ node: '>=20' })
    const repository = pkg.repository as { type: string; url: string }
    expect(repository.type).toBe('git')
    expect(repository.url).toMatch(/^git\+https:\/\/github\.com\//)
    expect(typeof pkg.description).toBe('string')
    expect((pkg.description as string).length).toBeGreaterThan(20)
  })

  it('documents future scoped publish access without requiring a scope today', () => {
    // Unscoped packages publish publicly by default. Keep publishConfig so a
    // later rename to @synctrol/vuepress-theme-synctrolling can set access.
    const publishConfig = pkg.publishConfig as { access?: string } | undefined
    expect(publishConfig?.access).toBe('public')
  })

  it('wires build, pack assert, and prepublishOnly scripts', () => {
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts.build).toMatch(/tsc/)
    expect(scripts['build:assets']).toContain('copy-package-assets')
    expect(scripts['assert:pack']).toContain('assert-pack-contents')
    expect(scripts['assert:exports']).toContain('assert-exports-resolve')
    expect(scripts.prepublishOnly).toContain('prepublish-check')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/publish/package-json.test.ts`

Expected: FAIL because `version` is still `0.0.0` and/or `private` is `true`, and publish scripts / `publishConfig` / tightened `files` are missing.

- [ ] **Step 3: Finalize `package.json` and add `LICENSE`**

Replace / merge `package.json` to this shape (preserve existing `devDependencies` and any Plan 02–10 deps such as `yaml`; only the publish surface is shown):

```json
{
  "name": "vuepress-theme-synctrolling",
  "version": "0.1.0",
  "description": "Synctrol-specific VuePress 2 theme for music releases, news, and team pages.",
  "license": "MIT",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/synctrol/vuepress-theme-synctrolling.git"
  },
  "bugs": {
    "url": "https://github.com/synctrol/vuepress-theme-synctrolling/issues"
  },
  "homepage": "https://github.com/synctrol/vuepress-theme-synctrolling#readme",
  "keywords": [
    "vuepress",
    "vuepress-theme",
    "synctrol",
    "music"
  ],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./client": {
      "types": "./dist/client/index.d.ts",
      "default": "./dist/client/index.js"
    },
    "./styles.css": "./dist/client/styles/tokens.css"
  },
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json && node scripts/copy-package-assets.mjs",
    "build:assets": "node scripts/copy-package-assets.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "assert:pack": "node scripts/assert-pack-contents.mjs",
    "assert:exports": "node scripts/assert-exports-resolve.mjs",
    "prepublishOnly": "node scripts/prepublish-check.mjs"
  },
  "peerDependencies": {
    "vue": "^3.5.0",
    "vuepress": "^2.0.0"
  }
}
```

If the real GitHub org/repo URL differs from `synctrol/vuepress-theme-synctrolling`, set `repository.url`, `bugs.url`, and `homepage` to the actual remote from `git remote get-url origin` (still `git+https://…` form). Do not invent a second package name.

```text
MIT License

Copyright (c) 2026 Synctrol

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Remove `"private": true` entirely (do not leave `"private": false` unless a tool requires the key).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/publish/package-json.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json LICENSE tests/publish/package-json.test.ts
git commit -m "chore: finalize package.json for npm publish"
```

---

### Task 2: Build pipeline — `tsc` + copy client assets into `dist/`

**Files:**
- Create: `scripts/copy-package-assets.mjs`
- Create: `tests/publish/build-artifacts.test.ts`
- Create: `src/client/styles/fonts.css` (if `@font-face` is not already present)
- Create: `src/client/assets/fonts/archivo-black.woff2` (binary; obtain from a licensed self-hostable Archivo Black WOFF2 already used by Synctrol, or generate a minimal placeholder only in tests — production ships the real font)
- Modify: `src/client/styles/index.ts` — import `./fonts.css` before tokens
- Modify: `src/node/theme.ts` — resolve `clientConfigFile` to `../client/config.js` (published path)
- Modify: `package.json` scripts if Task 1 left placeholders incomplete

**Interfaces:**
- Consumes: `tsc` emit under `dist/` mirroring `src/**/*.ts`; Vue SFCs and CSS under `src/client/`
- Produces: `dist/` containing `index.js` + `.d.ts`, `dist/client/**` including `.vue` / `.css` / fonts, and `clientConfigFile` pointing at `dist/client/config.js` when the theme loads from `dist/node/theme.js`

- [ ] **Step 1: Write the failing build-artifact tests**

```ts
// tests/publish/build-artifacts.test.ts
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dist = (...parts: string[]) => resolve('dist', ...parts)

describe('dist package artifacts', () => {
  it('emits node entry and theme factory types', () => {
    expect(existsSync(dist('index.js'))).toBe(true)
    expect(existsSync(dist('index.d.ts'))).toBe(true)
    expect(existsSync(dist('node', 'theme.js'))).toBe(true)
    const indexJs = readFileSync(dist('index.js'), 'utf8')
    expect(indexJs).toMatch(/synctrolTheme/)
  })

  it('includes client entry, config, layouts, and CSS tokens', () => {
    expect(existsSync(dist('client', 'index.js'))).toBe(true)
    expect(existsSync(dist('client', 'config.js'))).toBe(true)
    expect(existsSync(dist('client', 'layouts', 'Layout.vue'))).toBe(true)
    expect(existsSync(dist('client', 'styles', 'tokens.css'))).toBe(true)
    expect(existsSync(dist('client', 'styles', 'fonts.css'))).toBe(true)
    expect(
      existsSync(dist('client', 'assets', 'fonts', 'archivo-black.woff2')),
    ).toBe(true)
  })

  it('points clientConfigFile at the published config.js path', () => {
    const themeJs = readFileSync(dist('node', 'theme.js'), 'utf8')
    expect(themeJs).toMatch(/client\/config\.js/)
    expect(themeJs).not.toMatch(/client\/config\.ts/)
  })

  it('re-exports default locale messages from the package root', async () => {
    const mod = await import(resolve('dist/index.js'))
    expect(mod.zhMessages.published).toBe('发布于')
    expect(mod.enMessages.published).toBe('Published')
    expect(typeof mod.synctrolTheme).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rm -rf dist
npm test -- tests/publish/build-artifacts.test.ts
```

Expected: FAIL because `dist/` is missing or incomplete (no copied `.vue`/fonts, or `clientConfigFile` still references `.ts`).

- [ ] **Step 3: Implement asset copy script, font CSS, and theme path fix**

```js
// scripts/copy-package-assets.mjs
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = join(root, 'src')
const distRoot = join(root, 'dist')

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

if (!existsSync(srcRoot)) {
  throw new Error(`Missing src at ${srcRoot}`)
}
mkdirSync(distRoot, { recursive: true })

let copied = 0
for (const file of walk(srcRoot)) {
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  if (!COPY_EXTENSIONS.has(ext)) continue
  const rel = relative(srcRoot, file)
  const dest = join(distRoot, rel)
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(file, dest)
  copied += 1
}

if (copied === 0) {
  throw new Error('copy-package-assets: no client assets copied')
}

console.log(`copy-package-assets: copied ${copied} files into dist/`)
```

```css
/* src/client/styles/fonts.css */
@font-face {
  font-family: 'Archivo Black';
  src: url('../assets/fonts/archivo-black.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

Ensure `src/client/styles/index.ts` begins with:

```ts
import './fonts.css'
import './tokens.css'
import './shell.css'
// …existing Plan 08/09 feature CSS imports remain below
```

In `src/node/theme.ts`, set:

```ts
clientConfigFile: path.resolve(__dirname, '../client/config.js'),
```

Do not point at `config.ts` in the published path. Local Vitest that imports from `src/` continues to use source modules directly; VuePress consumer builds load the theme from `dist/`.

Place the real Archivo Black WOFF2 at `src/client/assets/fonts/archivo-black.woff2`. If the binary is not yet in the tree from earlier plans, add it in this task (do not leave a missing path).

- [ ] **Step 4: Build and run artifact tests**

Run:

```bash
npm run build
npm test -- tests/publish/build-artifacts.test.ts
```

Expected: PASS; console shows `copy-package-assets: copied N files into dist/`.

- [ ] **Step 5: Commit**

```bash
git add scripts/copy-package-assets.mjs tests/publish/build-artifacts.test.ts \
  src/client/styles/fonts.css src/client/styles/index.ts \
  src/client/assets/fonts/archivo-black.woff2 src/node/theme.ts package.json
git commit -m "build: emit dist with client vue, css, and fonts"
```

---

### Task 3: Pack contents assertions (`npm pack --dry-run`)

**Files:**
- Create: `scripts/assert-pack-contents.mjs`
- Create: `tests/publish/pack-contents.test.ts`
- Create: `.npmignore`

**Interfaces:**
- Consumes: `package.json` `files: ["dist"]` and built `dist/`
- Produces: failing CI if pack includes `tests/`, `docs/superpowers/`, fixtures, source maps under repo root leakage, or omits required `dist` entries

- [ ] **Step 1: Write the failing pack-contents test**

```ts
// tests/publish/pack-contents.test.ts
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

function packPaths(): string[] {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf8',
  })
  const parsed = JSON.parse(out) as Array<{ files: Array<{ path: string }> }>
  return parsed[0].files.map((f) => f.path).sort()
}

describe('npm pack contents', () => {
  it('includes required dist artifacts and package metadata', () => {
    const paths = packPaths()
    expect(paths).toContain('package.json')
    expect(paths).toContain('LICENSE')
    expect(paths).toContain('README.md')
    expect(paths).toContain('dist/index.js')
    expect(paths).toContain('dist/index.d.ts')
    expect(paths).toContain('dist/client/config.js')
    expect(paths).toContain('dist/client/layouts/Layout.vue')
    expect(paths).toContain('dist/client/styles/tokens.css')
    expect(paths).toContain('dist/client/assets/fonts/archivo-black.woff2')
  })

  it('excludes tests, superpowers docs, and fixture sites', () => {
    const paths = packPaths()
    for (const path of paths) {
      expect(path.startsWith('tests/')).toBe(false)
      expect(path.startsWith('docs/')).toBe(false)
      expect(path.startsWith('docs/superpowers/')).toBe(false)
      expect(path.includes('fixtures/')).toBe(false)
      expect(path.startsWith('src/')).toBe(false)
      expect(path.startsWith('.github/')).toBe(false)
      expect(path.startsWith('scripts/')).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run build
npm test -- tests/publish/pack-contents.test.ts
```

Expected: FAIL until README/LICENSE are present as packable root files and required `dist/` paths exist after `npm run build` (README may still be the Plan 01 stub — that is fine for pack inclusion; Task 8 rewrites content).

- [ ] **Step 3: Implement assert script and `.npmignore`**

```js
// scripts/assert-pack-contents.mjs
import { execFileSync } from 'node:child_process'

const required = [
  'package.json',
  'LICENSE',
  'README.md',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/client/config.js',
  'dist/client/layouts/Layout.vue',
  'dist/client/styles/tokens.css',
  'dist/client/assets/fonts/archivo-black.woff2',
]

const forbiddenPrefixes = [
  'tests/',
  'docs/',
  'src/',
  '.github/',
  'scripts/',
]

function listPackFiles() {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf8',
  })
  const parsed = JSON.parse(out)
  if (!Array.isArray(parsed) || !parsed[0]?.files) {
    throw new Error(
      'assert-pack-contents: unexpected npm pack --json shape; need npm 10+',
    )
  }
  return parsed[0].files.map((f) => f.path)
}

const files = listPackFiles()
const missing = required.filter((r) => !files.includes(r))
if (missing.length) {
  console.error('assert-pack-contents: missing required files:\n' + missing.join('\n'))
  process.exit(1)
}

const leaks = files.filter((f) =>
  forbiddenPrefixes.some((p) => f === p.slice(0, -1) || f.startsWith(p)),
)
if (leaks.length) {
  console.error('assert-pack-contents: forbidden paths in pack:\n' + leaks.join('\n'))
  process.exit(1)
}

console.log(`assert-pack-contents: ok (${files.length} files)`)
```

```text
# .npmignore — defense in depth; package.json "files" is the source of truth
tests/
docs/
src/
scripts/
.github/
*.tgz
vitest.config.ts
tsconfig.json
.env
.env.*
```

Note: npm includes `LICENSE`, `README.md`, and `package.json` even when `files` is restrictive. Keep those at repo root.

- [ ] **Step 4: Run pack asserts**

Run:

```bash
npm run build
npm test -- tests/publish/pack-contents.test.ts
npm run assert:pack
```

Expected: PASS / `assert-pack-contents: ok`.

- [ ] **Step 5: Commit**

```bash
git add scripts/assert-pack-contents.mjs tests/publish/pack-contents.test.ts .npmignore
git commit -m "test: assert npm pack contents exclude non-publish paths"
```

---

### Task 4: Export resolution + prepublish checks

**Files:**
- Create: `scripts/assert-exports-resolve.mjs`
- Create: `scripts/prepublish-check.mjs`
- Create: `tests/publish/exports-resolve.test.ts`

**Interfaces:**
- Consumes: built `dist/` and `package.json` `exports`
- Produces: `prepublishOnly` gate — tests green, build green, pack assert, exports resolve

- [ ] **Step 1: Write the failing exports-resolve test**

```ts
// tests/publish/exports-resolve.test.ts
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

describe('package exports resolve from dist', () => {
  it('resolves root synctrolTheme and messages', async () => {
    const entry = resolve(root, 'dist/index.js')
    const mod = await import(pathToFileURL(entry).href)
    expect(typeof mod.synctrolTheme).toBe('function')
    expect(mod.enMessages.translationUnavailable).toBe(
      'This article is not yet available in English. Showing the original version.',
    )
  })

  it('resolves ./client and ./styles.css export targets on disk', () => {
    const require = createRequire(resolve(root, 'package.json'))
    // Subpath exports may not resolve via createRequire in all Node versions;
    // assert the export map targets exist as files.
    const client = pkg.exports['./client'].default.replace(/^\.\//, '')
    const css = pkg.exports['./styles.css'].replace(/^\.\//, '')
    const fs = require('node:fs')
    expect(fs.existsSync(resolve(root, client))).toBe(true)
    expect(fs.existsSync(resolve(root, css))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails without build**

Run:

```bash
rm -rf dist
npm test -- tests/publish/exports-resolve.test.ts
```

Expected: FAIL (missing `dist/index.js`).

- [ ] **Step 3: Implement assert + prepublish orchestrator**

```js
// scripts/assert-exports-resolve.mjs
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

function targetPath(exportValue) {
  if (typeof exportValue === 'string') return resolve(root, exportValue)
  if (exportValue && typeof exportValue.default === 'string') {
    return resolve(root, exportValue.default)
  }
  throw new Error(`Unsupported export value: ${JSON.stringify(exportValue)}`)
}

for (const [key, value] of Object.entries(pkg.exports)) {
  const file = targetPath(value)
  if (!existsSync(file)) {
    console.error(`assert-exports-resolve: missing ${key} -> ${file}`)
    process.exit(1)
  }
  if (typeof value === 'object' && value.types) {
    const types = resolve(root, value.types)
    if (!existsSync(types)) {
      console.error(`assert-exports-resolve: missing types for ${key} -> ${types}`)
      process.exit(1)
    }
  }
}

const mod = await import(pathToFileURL(resolve(root, 'dist/index.js')).href)
if (typeof mod.synctrolTheme !== 'function') {
  console.error('assert-exports-resolve: synctrolTheme is not a function')
  process.exit(1)
}
if (!mod.zhMessages || !mod.enMessages) {
  console.error('assert-exports-resolve: zhMessages/enMessages missing')
  process.exit(1)
}

console.log('assert-exports-resolve: ok')
```

```js
// scripts/prepublish-check.mjs
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit' })
}

run('npm', ['test'])
run('npm', ['run', 'build'])
run('node', ['scripts/assert-pack-contents.mjs'])
run('node', ['scripts/assert-exports-resolve.mjs'])
console.log('\nprepublish-check: all gates passed')
```

- [ ] **Step 4: Run build + export asserts**

Run:

```bash
npm run build
npm test -- tests/publish/exports-resolve.test.ts
npm run assert:exports
node scripts/prepublish-check.mjs
```

Expected: all PASS. `prepublish-check` runs the full suite (may take longer).

- [ ] **Step 5: Commit**

```bash
git add scripts/assert-exports-resolve.mjs scripts/prepublish-check.mjs \
  tests/publish/exports-resolve.test.ts package.json
git commit -m "chore: add prepublish checks for test, build, pack, exports"
```

---

### Task 5: Consumer fixture site (minimal VuePress zh/en)

**Files:**
- Create: `tests/fixtures/sites/consumer-smoke/package.json`
- Create: `tests/fixtures/sites/consumer-smoke/.vuepress/config.ts`
- Create: `tests/fixtures/sites/consumer-smoke/.vuepress/assets/social-default.webp` (1×1 webp or tiny placeholder)
- Create: `tests/fixtures/sites/consumer-smoke/.vuepress/assets/logo.svg`
- Create: `tests/fixtures/sites/consumer-smoke/content/definitions.yml`
- Create: `tests/fixtures/sites/consumer-smoke/content/home/content.yml`
- Create: `tests/fixtures/sites/consumer-smoke/content/home/zh.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/home/en.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/releases/demo/content.yml`
- Create: `tests/fixtures/sites/consumer-smoke/content/releases/demo/zh.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/releases/demo/en.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/releases/demo/assets/artwork.webp`
- Create: `tests/fixtures/sites/consumer-smoke/content/news/hello/content.yml`
- Create: `tests/fixtures/sites/consumer-smoke/content/news/hello/zh.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/news/hello/en.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/pages/about/content.yml`
- Create: `tests/fixtures/sites/consumer-smoke/content/pages/about/zh.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/pages/about/en.md`

**Interfaces:**
- Consumes: published theme API `synctrolTheme`, `zhMessages`, `enMessages`
- Produces: a fixture site that builds locale-prefixed zh/en pages and emits root `index.html` router when using the theme from a local tarball

- [ ] **Step 1: Write fixture files (consumer site is the “test subject”; e2e comes in Task 6)**

```json
{
  "name": "synctrol-theme-consumer-smoke",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vuepress build ."
  },
  "devDependencies": {
    "vue": "^3.5.0",
    "vuepress": "^2.0.0",
    "vuepress-theme-synctrolling": "file:../../../.."
  }
}
```

The `file:../../../..` path is a temporary workspace link for authoring; Task 6 rewrites the dependency to the packed tarball during the smoke test.

```ts
// tests/fixtures/sites/consumer-smoke/.vuepress/config.ts
import { resolve } from 'node:path'
import { defineUserConfig } from 'vuepress'
import {
  enMessages,
  synctrolTheme,
  zhMessages,
} from 'vuepress-theme-synctrolling'

const configDir = resolve(import.meta.dirname)

export default defineUserConfig({
  base: '/',
  dest: resolve(configDir, '../.vuepress/dist'),
  locales: {
    '/zh/': { lang: 'zh-CN' },
    '/en/': { lang: 'en-US' },
  },
  theme: synctrolTheme({
    siteUrl: 'https://example.com',
    mainLocale: 'zh',
    locales: {
      zh: {
        lang: 'zh-CN',
        label: '中文',
        messages: zhMessages,
      },
      en: {
        lang: 'en-US',
        label: 'English',
        messages: enMessages,
      },
    },
    copyright: '© Synctrol',
    navigation: {
      items: [
        { label: { zh: '作品', en: 'Releases' }, href: '/releases/' },
        { label: { zh: '新闻', en: 'News' }, href: '/news/' },
        { label: { zh: '关于', en: 'About' }, href: '/about/' },
      ],
    },
    seo: {
      name: { zh: 'Consumer Smoke', en: 'Consumer Smoke' },
      description: {
        zh: '主题消费冒烟站点',
        en: 'Theme consumer smoke site',
      },
      defaultImage: './assets/social-default.webp',
      organization: {
        name: 'Synctrol',
        logo: './assets/logo.svg',
      },
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

If `import.meta.dirname` is unavailable on the CI Node version, use:

```ts
import { fileURLToPath } from 'node:url'
const configDir = resolve(fileURLToPath(new URL('.', import.meta.url)))
```

```yaml
# content/definitions.yml
tags:
  release:
    title:
      zh: 作品发布
      en: Releases
platforms: {}
```

```yaml
# content/home/content.yml
type: home
draft: false
```

```md
---
title: Synctrol Smoke
description: 中文首页 SEO
---

::: home-logo
# SYNCTROL

WE SHAPE WAVE  
AND DESCRIBE SOUND
:::
```

```md
---
title: Synctrol Smoke
description: English home SEO
---

::: home-logo
# SYNCTROL

WE SHAPE WAVE  
AND DESCRIBE SOUND
:::
```

(Save the Chinese Markdown as `zh.md` and English as `en.md` under `content/home/`.)

```yaml
# content/releases/demo/content.yml
type: release
slug: demo
date: 2026-08-11
draft: false
artwork: ./assets/artwork.webp
```

```md
<!-- content/releases/demo/zh.md -->
---
title: 演示作品
description: 冒烟发布
---

中文作品正文。
```

```md
<!-- content/releases/demo/en.md -->
---
title: Demo Release
description: Smoke release
---

English release body.
```

```yaml
# content/news/hello/content.yml
type: news
slug: hello
date: 2026-08-11
draft: false
tags:
  - release
```

```md
<!-- content/news/hello/zh.md -->
---
title: 你好
description: 新闻冒烟
---

中文新闻。
```

```md
<!-- content/news/hello/en.md -->
---
title: Hello
description: News smoke
---

English news.
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

关于页面。
```

```md
<!-- content/pages/about/en.md -->
---
title: About
---

About page.
```

Create tiny binary placeholders for `.vuepress/assets/social-default.webp`, `.vuepress/assets/logo.svg`, and `content/releases/demo/assets/artwork.webp` (valid minimal SVG/WebP bytes). Logo SVG example:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#000"/>
  <text x="32" y="38" text-anchor="middle" fill="#fff" font-size="12">S</text>
</svg>
```

- [ ] **Step 2: Verify fixture paths exist (no full build yet)**

Run:

```bash
node -e "const fs=require('fs'); const p='tests/fixtures/sites/consumer-smoke'; for (const f of ['package.json','.vuepress/config.ts','content/home/zh.md','content/releases/demo/en.md','content/news/hello/zh.md','content/pages/about/en.md','content/definitions.yml']) { if (!fs.existsSync(p+'/'+f)) { console.error('missing', f); process.exit(1)} } console.log('fixture files ok')"
```

Expected: `fixture files ok`

- [ ] **Step 3: Commit**

```bash
git add tests/fixtures/sites/consumer-smoke
git commit -m "test: add VuePress consumer-smoke fixture site"
```

---

### Task 6: Consumer install smoke — tarball → install → zh/en build

**Files:**
- Create: `tests/e2e/publish/consumer-smoke.test.ts`
- Create: `scripts/run-consumer-smoke.mjs` (optional helper used by the test)

**Interfaces:**
- Consumes: `npm pack` tarball of this package; fixture from Task 5
- Produces: green e2e proving a consumer can install the packed theme and build `/zh/`, `/en/`, root router, and a release/news page

- [ ] **Step 1: Write the failing consumer-smoke test**

```ts
// tests/e2e/publish/consumer-smoke.test.ts
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve('.')
const fixtureSrc = resolve('tests/fixtures/sites/consumer-smoke')

describe('consumer tarball smoke', () => {
  it('installs the packed theme and builds zh/en with root router', () => {
    execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'inherit' })

    const packOut = execFileSync('npm', ['pack', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    const tarballName = (JSON.parse(packOut) as Array<{ filename: string }>)[0]
      .filename
    const tarballPath = resolve(repoRoot, tarballName)

    const work = mkdtempSync(join(tmpdir(), 'synctrol-consumer-'))
    try {
      cpSync(fixtureSrc, work, { recursive: true })
      const pkgPath = join(work, 'package.json')
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        devDependencies: Record<string, string>
      }
      pkg.devDependencies['vuepress-theme-synctrolling'] = `file:${tarballPath}`
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

      execFileSync('npm', ['install'], { cwd: work, stdio: 'inherit' })
      execFileSync('npx', ['vuepress', 'build', '.'], {
        cwd: work,
        stdio: 'inherit',
      })

      const dest = join(work, '.vuepress/dist')
      expect(existsSync(join(dest, 'index.html'))).toBe(true)
      expect(existsSync(join(dest, 'zh', 'index.html'))).toBe(true)
      expect(existsSync(join(dest, 'en', 'index.html'))).toBe(true)
      expect(
        existsSync(join(dest, 'zh', 'releases', 'demo', 'index.html')),
      ).toBe(true)
      expect(existsSync(join(dest, 'en', 'news', 'hello', 'index.html'))).toBe(
        true,
      )
      expect(existsSync(join(dest, 'zh', 'about', 'index.html'))).toBe(true)

      const root = readFileSync(join(dest, 'index.html'), 'utf8')
      expect(root).toMatch(/location\.replace/)
      expect(root).toMatch(/href="\/zh\/"/)
      expect(root).toMatch(/href="\/en\/"/)
      expect(root).not.toMatch(/background/i)

      const zhHome = readFileSync(join(dest, 'zh', 'index.html'), 'utf8')
      expect(zhHome).toMatch(/SYNCTROL/)
    } finally {
      rmSync(work, { recursive: true, force: true })
      if (existsSync(tarballPath)) rmSync(tarballPath, { force: true })
    }
  }, 300_000)
})
```

If Vitest does not pick up a long timeout from the third argument in this version, set `testTimeout: 300000` in a `describe` config via `vitest` file-level:

```ts
export const timeout = 300_000
```

or run this file under a dedicated script in Task 8 CI.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/e2e/publish/consumer-smoke.test.ts`

Expected: FAIL until pack/install/build succeeds (missing theme wiring, wrong dest paths, or root router absent).

- [ ] **Step 3: Fix theme publish surface until the smoke passes**

Only adjust publish-facing paths if needed:

- Ensure `synctrolTheme` from `dist/index.js` registers `clientConfigFile` under `dist/client/config.js`
- Ensure VuePress can resolve `.vue` SFCs from the package `dist/client/**`
- Ensure Plan 03 root router still writes `<dest>/index.html`

Do not reimplement router logic; fix packaging/path resolution only.

- [ ] **Step 4: Re-run consumer smoke**

Run: `npm test -- tests/e2e/publish/consumer-smoke.test.ts`

Expected: PASS within timeout; temp dirs cleaned; no leftover `*.tgz` in repo root.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/publish/consumer-smoke.test.ts src/node/theme.ts
git commit -m "test: smoke consumer install from npm pack tarball"
```

---

### Task 7: Fixture visual/a11y smoke (no Pages deploy)

**Files:**
- Create: `tests/e2e/publish/consumer-a11y-smoke.test.ts`

**Interfaces:**
- Consumes: built consumer fixture HTML from the same pack→install→build flow (or a shared helper)
- Produces: assertions that shipping package still emits a11y-critical shell markers and locale routes (ThemeMode / LanguageSwitcher / SocialLinks contracts already unit-tested in Plan 05; this task verifies they survive pack)

- [ ] **Step 1: Extract a shared pack-build helper and write a11y smoke**

```ts
// tests/e2e/publish/pack-consumer.ts
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

export interface PackedConsumer {
  dest: string
  cleanup: () => void
}

export function buildPackedConsumer(): PackedConsumer {
  const repoRoot = resolve('.')
  execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'inherit' })
  const packOut = execFileSync('npm', ['pack', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  const tarballName = (JSON.parse(packOut) as Array<{ filename: string }>)[0]
    .filename
  const tarballPath = resolve(repoRoot, tarballName)
  const work = mkdtempSync(join(tmpdir(), 'synctrol-a11y-'))
  cpSync(resolve('tests/fixtures/sites/consumer-smoke'), work, {
    recursive: true,
  })
  const pkgPath = join(work, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    devDependencies: Record<string, string>
  }
  pkg.devDependencies['vuepress-theme-synctrolling'] = `file:${tarballPath}`
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
  execFileSync('npm', ['install'], { cwd: work, stdio: 'inherit' })
  execFileSync('npx', ['vuepress', 'build', '.'], {
    cwd: work,
    stdio: 'inherit',
  })
  const dest = join(work, '.vuepress/dist')
  return {
    dest,
    cleanup: () => {
      rmSync(work, { recursive: true, force: true })
      if (existsSync(tarballPath)) rmSync(tarballPath, { force: true })
    },
  }
}
```

Refactor Task 6 to import `buildPackedConsumer` if duplication appears (keep behavior identical).

```ts
// tests/e2e/publish/consumer-a11y-smoke.test.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildPackedConsumer, type PackedConsumer } from './pack-consumer'

describe('consumer fixture a11y/visual smoke', () => {
  let packed: PackedConsumer

  beforeAll(() => {
    packed = buildPackedConsumer()
  }, 300_000)

  afterAll(() => {
    packed?.cleanup()
  })

  it('emits color-mode boot script and theme dataset hook', () => {
    const zh = readFileSync(join(packed.dest, 'zh', 'index.html'), 'utf8')
    expect(zh).toMatch(/localStorage\.getItem/)
    expect(zh).toMatch(/dataset\.theme|data-theme/)
  })

  it('keeps language switcher and social dock labels available in locale pages', () => {
    const release = readFileSync(
      join(packed.dest, 'en', 'releases', 'demo', 'index.html'),
      'utf8',
    )
    // Shell mounts client components; SSR/HTML should still include dock regions
    // or root app attributes from Plan 05 layout. Assert stable markers:
    expect(release).toMatch(/Demo Release|lang="en-US"/)
    expect(release).toMatch(/hreflang|canonical|og:title/)
  })

  it('root router keeps visible no-JS language links', () => {
    const root = readFileSync(join(packed.dest, 'index.html'), 'utf8')
    expect(root).toMatch(/<a[^>]+href="\/zh\/"/)
    expect(root).toMatch(/<a[^>]+href="\/en\/"/)
  })
})
```

- [ ] **Step 2: Run to verify failure/pass cycle**

Run: `npm test -- tests/e2e/publish/consumer-a11y-smoke.test.ts`

Expected: first run may fail on marker strings if HTML shape differs; adjust assertions to match actual Plan 05/10 emitted HTML **without** weakening a11y requirements (keep boot script, no-JS links, locale lang).

- [ ] **Step 3: Align Task 6 with shared helper**

Update `tests/e2e/publish/consumer-smoke.test.ts` to use `buildPackedConsumer()` so both e2e files share one pack path.

- [ ] **Step 4: Re-run both e2e publish tests**

Run:

```bash
npm test -- tests/e2e/publish/consumer-smoke.test.ts tests/e2e/publish/consumer-a11y-smoke.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/publish/pack-consumer.ts \
  tests/e2e/publish/consumer-a11y-smoke.test.ts \
  tests/e2e/publish/consumer-smoke.test.ts
git commit -m "test: verify packed theme a11y markers via consumer fixture"
```

---

### Task 8: Public consumer README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: public API from Plans 01–10 (`synctrolTheme`, messages, content layout)
- Produces: install + minimal config + content overview + brief design pointer + consumer static hosting notes (root router, `siteUrl`, `base`) — **not** a GitHub Pages deploy guide for this repo

- [ ] **Step 1: Write a README contract test**

```ts
// tests/publish/readme.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readme = readFileSync(resolve('README.md'), 'utf8')

describe('consumer README', () => {
  it('documents install, synctrolTheme config, and content layout', () => {
    expect(readme).toContain('# vuepress-theme-synctrolling')
    expect(readme).toContain('npm install vuepress-theme-synctrolling')
    expect(readme).toContain('synctrolTheme(')
    expect(readme).toContain('zhMessages')
    expect(readme).toContain('enMessages')
    expect(readme).toContain('content/')
    expect(readme).toContain('content.yml')
    expect(readme).toMatch(/home|release|news|page/)
  })

  it('includes consumer static hosting notes without making Pages deploy the package goal', () => {
    expect(readme).toContain('## Consumer static hosting notes')
    expect(readme).toContain('siteUrl')
    expect(readme).toContain('base')
    expect(readme).toMatch(/root language router|root router/i)
    expect(readme).not.toMatch(/## Deploy this repository to GitHub Pages/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/publish/readme.test.ts`

Expected: FAIL against the Plan 01 stub README.

- [ ] **Step 3: Write the consumer README**

```md
# vuepress-theme-synctrolling

Synctrol-specific VuePress 2 theme for music/merchandise releases, team pages, and news. This package is the theme; **Synctrol.com is a separate consumer site**.

Design concepts (brand tokens, shell geometry, content model) are specified in the repository design doc: `docs/superpowers/specs/2026-08-11-synctrol-vuepress-theme-design.md`.

## Install

```bash
npm install vuepress-theme-synctrolling vue vuepress
```

Peer dependencies: `vue@^3.5`, `vuepress@^2`.

## Minimal config

```ts
// .vuepress/config.ts
import { defineUserConfig } from 'vuepress'
import {
  enMessages,
  synctrolTheme,
  zhMessages,
} from 'vuepress-theme-synctrolling'

export default defineUserConfig({
  base: '/',
  theme: synctrolTheme({
    siteUrl: 'https://example.com',
    mainLocale: 'zh',
    locales: {
      zh: { lang: 'zh-CN', label: '中文', messages: zhMessages },
      en: { lang: 'en-US', label: 'English', messages: enMessages },
    },
    copyright: '© Your Team',
    seo: {
      name: { zh: 'Example', en: 'Example' },
      description: { zh: '站点简介', en: 'Site description' },
      defaultImage: './assets/social-default.webp',
      organization: { name: 'Example', logo: './assets/logo.svg' },
      collections: {
        release: {
          title: { zh: '作品', en: 'Releases' },
          description: { zh: '作品列表', en: 'Releases' },
        },
        news: {
          title: { zh: '新闻', en: 'News' },
          description: { zh: '新闻列表', en: 'News' },
        },
      },
    },
  }),
})
```

Optional CSS entry for tooling that needs a direct stylesheet path:

```ts
import 'vuepress-theme-synctrolling/styles.css'
```

(Normal sites rely on the theme client config to load tokens, fonts, and shell CSS.)

## Content layout overview

Default source root is `content/` with colocated packages:

```text
content/
├── definitions.yml
├── home/
│   ├── content.yml
│   ├── zh.md
│   ├── en.md
│   └── assets/
├── releases/
│   └── my-release/
│       ├── content.yml
│       ├── book.yml          # optional Album or Gift book
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

Rules of thumb:

- A directory with `content.yml` is a content package (`home` | `release` | `news` | `page`).
- Locale files are `zh.md` / `en.md` (locale keys match theme `locales`).
- Multilingual routes always include a locale prefix (`/zh/...`, `/en/...`).
- Brand visuals are fixed by the theme; configure content, locales, navigation, social links, platforms, and per-type backgrounds — not free-form visual tokens.

## Consumer static hosting notes

These notes are for **sites that consume** this theme (for example Synctrol.com), including hosts such as GitHub Pages:

1. Set required production `siteUrl` to the public origin **without** a trailing slash (`https://synctrol.com`).
2. Custom-domain sites typically use VuePress `base: '/'`. Project Pages under a subpath need a trailing-slash base such as `/repo-name/`.
3. The theme always emits a **root language router** at `/index.html` that chooses saved locale → `navigator.languages` → `mainLocale`, then `location.replace()` to a locale home. Visible language links remain for no-JS clients.
4. Do not expect this **theme repository** to deploy GitHub Pages for Synctrol.com; ship the site from the consumer repo’s own build.

## Develop (theme contributors)

```bash
npm install
npm test
npm run build
npm run assert:pack
npm run assert:exports
```

Tagged releases publish to npm via GitHub Actions (see `.github/workflows/publish.yml`).
```

- [ ] **Step 4: Run README test**

Run: `npm test -- tests/publish/readme.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add README.md tests/publish/readme.test.ts
git commit -m "docs: write consumer README for theme install and hosting notes"
```

---

### Task 9: CHANGELOG bootstrap

**Files:**
- Create: `CHANGELOG.md`
- Create: `tests/publish/changelog.test.ts`
- Modify: `package.json` only if you add `"files"` exception — keep CHANGELOG out of npm tarball unless desired; default npm does **not** auto-include CHANGELOG when `files: ["dist"]`. That is acceptable; CHANGELOG lives in git for humans. Do not add CHANGELOG to `files` unless you intentionally want it on npm (this plan keeps it git-only).

**Interfaces:**
- Consumes: version `0.1.0` from Task 1
- Produces: Keep-a-Changelog style bootstrap describing the first public theme release

- [ ] **Step 1: Write the failing changelog test**

```ts
// tests/publish/changelog.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const log = readFileSync(resolve('CHANGELOG.md'), 'utf8')

describe('CHANGELOG', () => {
  it('bootstraps 0.1.0 as the first public release', () => {
    expect(log).toContain('# Changelog')
    expect(log).toContain('## [0.1.0] - 2026-08-11')
    expect(log).toContain('vuepress-theme-synctrolling')
    expect(log).toMatch(/First public release/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/publish/changelog.test.ts`

Expected: FAIL (file missing).

- [ ] **Step 3: Write CHANGELOG.md**

```md
# Changelog

All notable changes to `vuepress-theme-synctrolling` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-11

### Added

- First public release of the Synctrol VuePress 2 theme package.
- Content compiler for colocated `home`, `release`, `news`, and `page` packages.
- Locale/route compiler with mandatory locale prefixes, drafts/fallback, and root language router emission for consumer static hosts.
- Asset pipeline with hashed content/global/theme URLs.
- Global shell: Header, Navigation, Footer slot, SocialLinks, LanguageSwitcher, ThemeMode.
- Type-based background module runtime.
- Platform entry system with built-in players/links and `synctrol-csp.json` audit artifact.
- Release index/detail with optional Album/Gift books.
- News indexes, tags, pagination, and general Page layout.
- SEO metadata, JSON-LD, locale RSS, and Sitemap generation.
- Publish pipeline: `dist/` build, pack assertions, consumer fixture smoke, and tag-based npm publish workflow.
```

- [ ] **Step 4: Run changelog test**

Run: `npm test -- tests/publish/changelog.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md tests/publish/changelog.test.ts
git commit -m "docs: bootstrap CHANGELOG for 0.1.0"
```

---

### Task 10: GitHub Actions — CI test + publish on tag

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/publish.yml`
- Create: `tests/publish/workflows.test.ts`

**Interfaces:**
- Consumes: `npm test`, `npm run build`, pack/export asserts, `prepublishOnly`
- Produces: CI on push/PR; publish job on `v*` tags using npm trusted publishing (OIDC) with documented `NPM_TOKEN` fallback

- [ ] **Step 1: Write workflow contract tests**

```ts
// tests/publish/workflows.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ci = readFileSync(resolve('.github/workflows/ci.yml'), 'utf8')
const publish = readFileSync(resolve('.github/workflows/publish.yml'), 'utf8')

describe('github workflows', () => {
  it('runs install, test, build, and pack/export asserts on CI', () => {
    expect(ci).toMatch(/on:\s*\n\s*(push|pull_request)/)
    expect(ci).toContain('npm ci')
    expect(ci).toContain('npm test')
    expect(ci).toContain('npm run build')
    expect(ci).toContain('npm run assert:pack')
    expect(ci).toContain('npm run assert:exports')
  })

  it('publishes to npm on version tags with OIDC permissions', () => {
    expect(publish).toContain("tags: ['v*']")
    expect(publish).toContain('id-token: write')
    expect(publish).toContain('npm publish')
    expect(publish).toMatch(/NPM_TOKEN|trusted publishing|provenance/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/publish/workflows.test.ts`

Expected: FAIL (workflows missing).

- [ ] **Step 3: Add workflows**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install
        run: npm ci

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

      - name: Assert pack contents
        run: npm run assert:pack

      - name: Assert exports resolve
        run: npm run assert:exports

      - name: Consumer smoke
        run: npm test -- tests/e2e/publish/consumer-smoke.test.ts tests/e2e/publish/consumer-a11y-smoke.test.ts
```

```yaml
# .github/workflows/publish.yml
name: Publish

on:
  push:
    tags: ['v*']

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          registry-url: https://registry.npmjs.org

      - name: Install
        run: npm ci

      - name: Prepublish checks
        run: npm run prepublishOnly

      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          # Preferred: configure npm Trusted Publishing (OIDC) for this
          # GitHub repo + workflow. No long-lived token required.
          # Fallback: repository secret NPM_TOKEN (classic automation token)
          # with publish permission. When using the fallback, set:
          #   NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Document in the workflow comments (as above): OIDC trusted publishing is preferred; `NPM_TOKEN` is the documented fallback so the workflow remains usable before OIDC is configured. When OIDC is fully configured and `NPM_TOKEN` is absent, remove the `NODE_AUTH_TOKEN` line or leave the secret unset only after confirming trusted publishing works for the package.

Tag/release procedure for maintainers (also implied by CHANGELOG):

```bash
# after main is green
git tag v0.1.0
git push origin v0.1.0
```

- [ ] **Step 4: Run workflow tests**

Run: `npm test -- tests/publish/workflows.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/publish.yml \
  tests/publish/workflows.test.ts
git commit -m "ci: add test workflow and tag-based npm publish"
```

---

### Task 11: Final verification gate

**Files:**
- Modify: none required if Tasks 1–10 are green; optionally add `scripts/verify-release.mjs` that aliases `prepublish-check` + consumer e2e

**Interfaces:**
- Consumes: all Plan 11 artifacts
- Produces: documented release verification commands that must pass before tagging `v0.1.0`

- [ ] **Step 1: Write verify-release script**

```js
// scripts/verify-release.mjs
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit' })
}

run('node', ['scripts/prepublish-check.mjs'])
run('npm', [
  'test',
  '--',
  'tests/e2e/publish/consumer-smoke.test.ts',
  'tests/e2e/publish/consumer-a11y-smoke.test.ts',
])
console.log('\nverify-release: ready to tag v0.1.0 and push for npm publish')
```

Add to `package.json` scripts:

```json
"verify:release": "node scripts/verify-release.mjs"
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run verify:release
```

Expected:

- All unit/integration tests PASS
- `dist/` build PASS
- pack contents assert PASS
- exports resolve PASS
- consumer tarball smoke PASS
- consumer a11y smoke PASS
- Final log line: `verify-release: ready to tag v0.1.0 and push for npm publish`

- [ ] **Step 3: Manual tag dry-run checklist (no Pages deploy)**

Confirm each item locally (commands already covered by `verify:release`):

1. `package.json` name is `vuepress-theme-synctrolling`, version `0.1.0`, not private.
2. `npm pack --dry-run` has no `tests/` or `docs/superpowers/`.
3. Consumer fixture builds zh/en and root router from the tarball.
4. README documents install, `synctrolTheme`, content layout, and static hosting notes only.
5. Publishing happens via `git tag v0.1.0 && git push origin v0.1.0`, not by deploying this repo to GitHub Pages.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-release.mjs package.json
git commit -m "chore: add verify:release gate before first npm tag"
```

---

## Plan Self-Review

1. **Spec / request coverage:** Package finalize, build/`dist`, pack asserts, consumer smoke, README, CHANGELOG, Actions CI/publish, prepublish gates, hosting notes (not Pages deploy), fixture visual/a11y smoke — each maps to Tasks 1–11. Root router remains Plan 03; Plan 11 documents consumer usage only. Package name and “this repo publishes the theme; Synctrol.com is separate” are in Global Constraints + README.
2. **Placeholder scan:** No TBD/TODO; concrete file paths, commands, and code blocks throughout. Repository URL uses a concrete `git+https` form with instruction to align to `git remote get-url origin` if different.
3. **Type/API consistency:** Public exports remain `synctrolTheme`, `zhMessages`, `enMessages`, `./client`, `./styles.css`; `clientConfigFile` → `dist/client/config.js`; SemVer `0.1.0`; peers `vue` / `vuepress`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-11-11-npm-package-publish.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints
