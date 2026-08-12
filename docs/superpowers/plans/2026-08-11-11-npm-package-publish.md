# NPM Package Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Revision Notes (executable against Plans 01-10 @ HEAD `c01a05e`)

Revised after Plan 11 preflight against branch `cursor/synctrol-theme-design-ee11` at `c01a05e71cb2df9e775621f52001da5801ca5614`. Binding decisions (do not re-litigate during implementation):

1. **Keep the current VuePress RC package contract.**
   - `peerDependencies.vuepress` and `devDependencies.vuepress` stay `^2.0.0-rc.24`.
   - `engines.node` stays `^20.9.0 || >=22.0.0`.
   - Samples below intentionally match `tests/package-contract.test.ts` at HEAD; do not switch to `^2.0.0` / `>=20` unless a failing test proves HEAD changed.

2. **Preserve the build pipeline name.**
   - Build remains `tsc -p tsconfig.json && node scripts/copy-client-assets.mjs`.
   - Extend or verify `scripts/copy-client-assets.mjs` for client font extensions; do **not** rename it to `copy-package-assets`.

3. **Split source/unit tests from post-build publish checks.**
   - `npm test` remains the source/unit lane: `npm run test:typecheck && vitest run`.
   - Any check that requires `dist/`, `npm pack`, export resolution from built files, or a consumer fixture runs only after `npm run build` through dedicated scripts such as `assert:build-artifacts`, `assert:pack`, `assert:exports`, and `test:consumer-smoke`.
   - `prepublish-check` and GitHub Actions must run `npm test` first, then `npm run build`, then post-build gates.

4. **Preserve `test:build-smoke`.**
   - Keep `test:build-smoke`: `npm run build && node scripts/smoke-built-exports.mjs`.
   - `assert:exports` may reuse `scripts/smoke-built-exports.mjs`, but must not silently delete the existing script contract.

5. **Isolate fixture TypeScript.**
   - Exclude `tests/fixtures/sites/**` from `tsconfig.test.json` so fixture `.vuepress/config.ts` can import the package self-name without requiring `dist/` during pre-build typecheck.
   - Keep post-build consumer checks in their own script lane.

6. **Update `package-lock.json` with package metadata/range changes.**
   - Task 1 includes `package-lock.json`. Run `npm install --package-lock-only` after package metadata edits so `npm ci` remains reproducible.

7. **`clientConfigFile` is already correct.**
   - HEAD points at `resolve(__dirname, '../client/config.js')`. Plan 11 verifies that in built output; do not rework `src/compiler/theme.ts` unless a verification script proves the emitted package path regressed.

8. **`./client` stays JS-only.**
   - Preserve the current client boundary: asset helpers, composables, and platform JS components only.
   - Do not export `Layout.vue`, `BackgroundHost`, or any SFC from `vuepress-theme-synctrolling/client`.

9. **Archivo Black WOFF2 is not shipped in Plan 11.**
   - No tracked `.woff`, `.woff2`, `.ttf`, or `.otf` file exists at this HEAD.
   - Plan 11 keeps the current CSS font-family stack (`'Archivo Black', 'Arial Black', ...`) without adding an `@font-face` or an unlicensed binary.
   - A future task may add a WOFF2 only with a named self-hostable source and required license notice.

10. **`./styles.css` is tokens-only.**
    - The public CSS subpath points at `./dist/client/styles/tokens.css` and is documented as a design-token stylesheet only.
    - Normal VuePress consumers get full theme CSS through the theme client config.

11. **Publish auth is dual-mode.**
    - GitHub Actions publish uses npm trusted publishing / OIDC (`id-token: write`, `npm publish --provenance`) with `NPM_TOKEN` fallback documented and wired via `NODE_AUTH_TOKEN`.

12. **NodeNext stays in force.**
    - Source imports under `src/**` keep `.js` suffixes. Tests and scripts follow the repo's existing ESM patterns.

**Goal:** Finalize and ship `vuepress-theme-synctrolling` as a public npm package with publishable metadata, a verified `dist/` artifact, pack/export gates, a consumer fixture install/build smoke, public README/CHANGELOG, and CI/tag publish workflows.

**Architecture:** Plans 01-10 already implement the theme runtime, compiler, shell, content types, SEO, feeds, root router, and built export smoke. Plan 11 hardens the package boundary: package metadata and lockfile, post-build artifact assertions, `npm pack` allow/deny checks, self-name export resolution, consumer tarball smoke, public docs, and CI/publish orchestration. It does not deploy GitHub Pages or change theme feature behavior.

**Tech Stack:** Node.js `^20.9.0 || >=22.0.0`, npm, TypeScript NodeNext, Vitest, VuePress `^2.0.0-rc.24`, Vue 3, GitHub Actions, package name `vuepress-theme-synctrolling`.

## Global Constraints

- Package name is `vuepress-theme-synctrolling` (unscoped). This repository publishes the theme package; Synctrol.com is a separate consumer site.
- Plans 01-10 are complete and green; do not reimplement compiler, shell, platforms, Release/News/Page/Home layouts, SEO/feeds, CSP, assets, backgrounds, or root-router generation.
- Root language router remains Plan 03; Plan 11 only documents consumer usage (`siteUrl`, VuePress `base`, root `/` redirect behavior).
- GitHub Pages deploy is out of scope for this repo.
- Brand tokens and shell geometry remain fixed.
- Published tarball must not leak `tests/`, `docs/superpowers/`, fixtures, `src/`, `.github/`, or scripts unless intentionally allowed.
- `type` remains `"module"`; TypeScript remains NodeNext.
- Peer deps remain `vue` and `vuepress`.
- First public release is `0.1.0`.
- All later tasks inherit these constraints and the Revision Notes.

## File Structure

| Path | Responsibility |
| --- | --- |
| `package.json` | Publish metadata, exports, files, scripts, peers, engines, `prepublishOnly` |
| `package-lock.json` | Lockfile root metadata synchronized with `package.json` |
| `LICENSE` | MIT license file matching `package.json` |
| `tests/publish/package-json.test.ts` | Source-lane contract for publishable metadata without requiring `dist/` |
| `tests/package-contract.test.ts` | Existing package script/engine/build-smoke contract, extended only for lane splits |
| `vitest.config.ts` | Keeps default Vitest source/unit lane; excludes post-build publish/e2e tests |
| `tsconfig.test.json` | Excludes consumer fixture site TypeScript from pre-build typecheck |
| `scripts/copy-client-assets.mjs` | Existing client asset copier; verify/extend font extension support |
| `scripts/assert-build-artifacts.mjs` | Post-build artifact assertions for `dist/` |
| `scripts/assert-pack-contents.mjs` | Post-build `npm pack --dry-run` allow/deny gate |
| `scripts/assert-exports-resolve.mjs` | Post-build export target/import gate |
| `.npmignore` | Defense-in-depth exclusions; `package.json.files` remains source of truth |
| `tests/fixtures/sites/consumer-smoke/` | Minimal VuePress consumer fixture excluded from pre-build typecheck |
| `scripts/run-consumer-smoke.mjs` | Post-build pack -> install tarball -> VuePress build smoke |
| `scripts/prepublish-check.mjs` | Ordered source test -> build -> post-build gate orchestrator |
| `.github/workflows/ci.yml` | PR/push CI with split lanes |
| `.github/workflows/publish.yml` | Tag publish with OIDC + `NPM_TOKEN` fallback |
| `README.md` | Public consumer install/config/content/static-hosting docs |
| `CHANGELOG.md` | Bootstrap changelog for `0.1.0` |
| `scripts/verify-release.mjs` | Final maintainer gate before tagging |

**Assumed from Plans 01-10 (do not recreate):**

- `synctrolTheme(options)` in `src/compiler/theme.ts` / `src/index.ts`
- `zhMessages` / `enMessages` re-exported from package root
- Client entry `src/client/index.ts` and config `src/client/config.ts`
- CSS tokens in `src/client/styles/tokens.css`; full theme CSS imported by `src/client/styles/index.ts`
- Root router emission in `onGenerated`
- Production `siteUrl` validation and locale-prefixed routes
- Existing `test:build-smoke` and `scripts/smoke-built-exports.mjs`

---

### Task 1: Publishable metadata, exports, license, and lockfile

**Files:**
- Create: `tests/publish/package-json.test.ts`
- Create: `LICENSE`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: current package contract (`type: "module"`, self-name exports to `dist`, peer `vue` / `vuepress`)
- Produces: publishable package metadata at version `0.1.0`, `private` removed, `files: ["dist"]`, root/client/tokens CSS exports, MIT license, RC peer/engine contract unchanged, lockfile synchronized

- [ ] **Step 1: Write the failing metadata test**

```ts
// tests/publish/package-json.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface PackageJson {
  name: string
  version: string
  private?: boolean
  description?: string
  license?: string
  type: string
  exports: Record<string, unknown>
  files: string[]
  publishConfig?: { access?: string }
  peerDependencies: Record<string, string>
  devDependencies: Record<string, string>
  engines: Record<string, string>
  scripts: Record<string, string>
  repository?: { type: string; url: string }
  bugs?: { url: string }
  homepage?: string
}

const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as PackageJson
const lock = JSON.parse(readFileSync(resolve('package-lock.json'), 'utf8')) as {
  name: string
  version: string
  packages: Record<string, { version?: string; peerDependencies?: Record<string, string>; engines?: Record<string, string> }>
}

describe('publishable package.json', () => {
  it('uses approved public package metadata', () => {
    expect(pkg.name).toBe('vuepress-theme-synctrolling')
    expect(pkg.version).toBe('0.1.0')
    expect(pkg.private).toBeUndefined()
    expect(pkg.type).toBe('module')
    expect(pkg.license).toBe('MIT')
    expect(pkg.description).toMatch(/Synctrol/)
  })

  it('declares root, JS-only client, and tokens-only CSS exports', () => {
    expect(pkg.exports['.']).toEqual({
      types: './dist/index.d.ts',
      default: './dist/index.js',
    })
    expect(pkg.exports['./client']).toEqual({
      types: './dist/client/index.d.ts',
      default: './dist/client/index.js',
    })
    expect(pkg.exports['./styles.css']).toBe('./dist/client/styles/tokens.css')
  })

  it('ships only dist and keeps current peer/engine contract', () => {
    expect(pkg.files).toEqual(['dist'])
    expect(pkg.peerDependencies).toEqual({
      vue: '^3.5.0',
      vuepress: '^2.0.0-rc.24',
    })
    expect(pkg.devDependencies.vuepress).toBe('^2.0.0-rc.24')
    expect(pkg.engines.node).toBe('^20.9.0 || >=22.0.0')
    expect(pkg.publishConfig?.access).toBe('public')
  })

  it('keeps source and post-build scripts split', () => {
    expect(pkg.scripts.build).toBe(
      'tsc -p tsconfig.json && node scripts/copy-client-assets.mjs',
    )
    expect(pkg.scripts['test:build-smoke']).toBe(
      'npm run build && node scripts/smoke-built-exports.mjs',
    )
    expect(pkg.scripts.test).toBe('npm run test:typecheck && vitest run')
    expect(pkg.scripts['assert:build-artifacts']).toContain(
      'assert-build-artifacts',
    )
    expect(pkg.scripts['assert:pack']).toContain('assert-pack-contents')
    expect(pkg.scripts['assert:exports']).toContain('assert-exports-resolve')
    expect(pkg.scripts['test:consumer-smoke']).toContain('run-consumer-smoke')
    expect(pkg.scripts.prepublishOnly).toContain('prepublish-check')
  })

  it('has package-lock root metadata synchronized', () => {
    expect(lock.name).toBe(pkg.name)
    expect(lock.version).toBe(pkg.version)
    expect(lock.packages[''].version).toBe(pkg.version)
    expect(lock.packages[''].peerDependencies?.vuepress).toBe('^2.0.0-rc.24')
    expect(lock.packages[''].engines?.node).toBe('^20.9.0 || >=22.0.0')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/publish/package-json.test.ts`

Expected: FAIL because `version` is `0.0.0`, `private` is `true`, `./styles.css` / publish scripts / license metadata are missing, and lockfile root version is not `0.1.0`.

- [ ] **Step 3: Update package metadata and license**

Merge this publish surface into `package.json`, preserving the existing dependency ranges not shown here:

```json
{
  "name": "vuepress-theme-synctrolling",
  "version": "0.1.0",
  "description": "Synctrol-specific VuePress 2 theme for releases, news, pages, SEO, feeds, and multilingual static sites.",
  "license": "MIT",
  "type": "module",
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
    "build": "tsc -p tsconfig.json && node scripts/copy-client-assets.mjs",
    "build:assets": "node scripts/copy-client-assets.mjs",
    "test:typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json --noEmit",
    "test:build-smoke": "npm run build && node scripts/smoke-built-exports.mjs",
    "test": "npm run test:typecheck && vitest run",
    "test:watch": "vitest",
    "assert:build-artifacts": "node scripts/assert-build-artifacts.mjs",
    "assert:pack": "node scripts/assert-pack-contents.mjs",
    "assert:exports": "node scripts/assert-exports-resolve.mjs",
    "test:consumer-smoke": "node scripts/run-consumer-smoke.mjs",
    "prepublishOnly": "node scripts/prepublish-check.mjs"
  },
  "peerDependencies": {
    "vue": "^3.5.0",
    "vuepress": "^2.0.0-rc.24"
  },
  "engines": {
    "node": "^20.9.0 || >=22.0.0"
  }
}
```

Add repository metadata using `git remote get-url origin` as the source of truth. For the current repository, use:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Synctrol/vuepress-theme-synctrolling.git"
  },
  "bugs": {
    "url": "https://github.com/Synctrol/vuepress-theme-synctrolling/issues"
  },
  "homepage": "https://github.com/Synctrol/vuepress-theme-synctrolling#readme",
  "keywords": ["vuepress", "vuepress-theme", "synctrol", "music"]
}
```

Remove `"private": true` entirely. Do not change the VuePress RC peer/dev range or Node engine range.

Create `LICENSE`:

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

Synchronize the lockfile:

```bash
npm install --package-lock-only
```

- [ ] **Step 4: Run the metadata test**

Run: `npm test -- tests/publish/package-json.test.ts`

Expected: PASS. If `npm install --package-lock-only` changes dependency versions unexpectedly, inspect the diff and keep only valid lockfile updates from the current package metadata.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json LICENSE tests/publish/package-json.test.ts
git commit -m "chore: finalize npm package metadata"
```

---

### Task 2: Source/unit lane and fixture TypeScript isolation

**Files:**
- Modify: `tests/package-contract.test.ts`
- Modify: `vitest.config.ts`
- Modify: `tsconfig.test.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: default `npm test` contract from HEAD
- Produces: default source/unit tests that never require `dist/`, plus explicit exclusions for post-build publish tests and fixture sites

- [ ] **Step 1: Extend the package contract tests**

Add assertions to `tests/package-contract.test.ts` without changing the existing RC/engine/build-smoke assertions:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Keep the existing packageJson setup and existing tests.

it('keeps npm test as the source/unit lane only', () => {
  expect(packageJson.scripts.test).toBe('npm run test:typecheck && vitest run')
  expect(packageJson.scripts.test).not.toContain('assert:pack')
  expect(packageJson.scripts.test).not.toContain('assert:exports')
  expect(packageJson.scripts.test).not.toContain('consumer-smoke')
})

it('excludes post-build publish tests and fixture sites from pre-build checks', () => {
  const vitestConfig = readFileSync(
    new URL('../vitest.config.ts', import.meta.url),
    'utf8',
  )
  const tsconfigTest = JSON.parse(
    readFileSync(new URL('../tsconfig.test.json', import.meta.url), 'utf8'),
  ) as { exclude?: string[] }

  expect(vitestConfig).toContain('tests/publish/postbuild/**')
  expect(vitestConfig).toContain('tests/e2e/publish/**')
  expect(tsconfigTest.exclude).toContain('tests/fixtures/sites/**')
})
```

If the file already imports `readFileSync`, add only the new test bodies.

- [ ] **Step 2: Run the focused contract test to verify it fails**

Run: `npm test -- tests/package-contract.test.ts`

Expected: FAIL because `vitest.config.ts` and `tsconfig.test.json` do not yet exclude the post-build/fixture paths.

- [ ] **Step 3: Update Vitest and TypeScript test config**

In `vitest.config.ts`, extend the node project exclusion:

```ts
exclude: [
  'tests/client/**',
  'tests/publish/postbuild/**',
  'tests/e2e/publish/**',
],
```

In `tsconfig.test.json`, add an `exclude` key:

```json
{
  "exclude": ["tests/fixtures/sites/**"]
}
```

Keep `include` unchanged for normal tests and source files.

- [ ] **Step 4: Run source/unit lane verification**

Run:

```bash
npm test -- tests/package-contract.test.ts tests/publish/package-json.test.ts
npm test
```

Expected: PASS. The full `npm test` run must not require `dist/`.

- [ ] **Step 5: Commit**

```bash
git add tests/package-contract.test.ts vitest.config.ts tsconfig.test.json package.json
git commit -m "test: isolate publish checks from source test lane"
```

---

### Task 3: Build artifacts and `copy-client-assets` verification

**Files:**
- Create: `scripts/assert-build-artifacts.mjs`
- Modify: `scripts/copy-client-assets.mjs` only if HEAD no longer copies font/media extensions
- Modify: `package.json`

**Interfaces:**
- Consumes: `npm run build` and the existing `dist/` layout
- Produces: a post-build artifact gate that verifies node entry/types, client config/layout/styles, `clientConfigFile`, JS-only client boundary, tokens-only CSS export target, and no required unlicensed font binary

- [ ] **Step 1: Write the post-build artifact assertion script**

```js
// scripts/assert-build-artifacts.mjs
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = (...parts) => join(root, 'dist', ...parts)

function read(path) {
  return readFileSync(path, 'utf8')
}

assert.ok(existsSync(dist('index.js')), 'dist/index.js must exist')
assert.ok(existsSync(dist('index.d.ts')), 'dist/index.d.ts must exist')
assert.ok(
  existsSync(dist('compiler', 'theme.js')),
  'dist/compiler/theme.js must exist',
)
assert.ok(
  existsSync(dist('client', 'index.js')),
  'dist/client/index.js must exist',
)
assert.ok(
  existsSync(dist('client', 'config.js')),
  'dist/client/config.js must exist',
)
assert.ok(
  existsSync(dist('client', 'layouts', 'Layout.vue')),
  'dist/client/layouts/Layout.vue must be copied',
)
assert.ok(
  existsSync(dist('client', 'styles', 'tokens.css')),
  'dist/client/styles/tokens.css must be copied',
)

const themeJs = read(dist('compiler', 'theme.js'))
assert.match(themeJs, /\.\.\/client\/config\.js|client\/config\.js/)
assert.doesNotMatch(themeJs, /client\/config\.ts/)

const clientJs = read(dist('client', 'index.js'))
assert.doesNotMatch(clientJs, /Layout\.vue/)
assert.doesNotMatch(clientJs, /BackgroundHost/)

const tokensCss = read(dist('client', 'styles', 'tokens.css'))
assert.match(tokensCss, /--syn-font-display/)
assert.match(tokensCss, /Archivo Black/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
assert.equal(pkg.exports['./styles.css'], './dist/client/styles/tokens.css')

const copier = read(join(root, 'scripts', 'copy-client-assets.mjs'))
for (const ext of ['.vue', '.css', '.woff', '.woff2', '.ttf', '.otf']) {
  assert.match(copier, new RegExp(ext.replace('.', '\\\\.')))
}
assert.doesNotMatch(copier, /copy-package-assets/)

console.log('assert-build-artifacts: ok')
```

- [ ] **Step 2: Run the assertion before build to verify it fails**

Run:

```bash
rm -rf dist
npm run assert:build-artifacts
```

Expected: FAIL with a missing `dist/...` assertion.

- [ ] **Step 3: Ensure build scripts and copier match the contract**

Keep these scripts in `package.json`:

```json
{
  "build": "tsc -p tsconfig.json && node scripts/copy-client-assets.mjs",
  "build:assets": "node scripts/copy-client-assets.mjs",
  "assert:build-artifacts": "node scripts/assert-build-artifacts.mjs"
}
```

If `scripts/copy-client-assets.mjs` does not include the extensions below, extend its `COPY_EXTENSIONS` set:

```js
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
```

Do not create `src/client/styles/fonts.css` or `src/client/assets/fonts/archivo-black.woff2` in this plan. The current fallback stack remains the shipped font behavior until a licensed binary source is explicitly approved.

- [ ] **Step 4: Build and run artifact verification**

Run:

```bash
npm run build
npm run assert:build-artifacts
```

Expected: PASS and `copy-client-assets: copied N files into dist/client/`.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/assert-build-artifacts.mjs scripts/copy-client-assets.mjs
git commit -m "build: assert npm dist artifacts"
```

---

### Task 4: Pack contents assertions

**Files:**
- Create: `scripts/assert-pack-contents.mjs`
- Create: `.npmignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: built `dist/`, root `README.md`, root `LICENSE`, and `package.json.files`
- Produces: a post-build `npm pack --dry-run` gate that includes required publish files and excludes repo/test/docs/source leaks

- [ ] **Step 1: Write the pack assertion script**

```js
// scripts/assert-pack-contents.mjs
import { execFileSync } from 'node:child_process'

const required = [
  'package.json',
  'LICENSE',
  'README.md',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/client/index.js',
  'dist/client/config.js',
  'dist/client/layouts/Layout.vue',
  'dist/client/styles/tokens.css',
]

const forbiddenPrefixes = [
  'tests/',
  'docs/',
  'src/',
  '.github/',
  'scripts/',
  '.superpowers/',
]

const forbiddenNames = ['vitest.config.ts', 'tsconfig.json', 'tsconfig.test.json']

function listPackFiles() {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf8',
  })
  const parsed = JSON.parse(out)
  if (!Array.isArray(parsed) || !parsed[0]?.files) {
    throw new Error('assert-pack-contents: unexpected npm pack --json shape')
  }
  return parsed[0].files.map((file) => file.path).sort()
}

const files = listPackFiles()
const missing = required.filter((path) => !files.includes(path))
if (missing.length > 0) {
  console.error('assert-pack-contents: missing required files:\n' + missing.join('\n'))
  process.exit(1)
}

const leaks = files.filter(
  (path) =>
    forbiddenPrefixes.some((prefix) => path.startsWith(prefix)) ||
    forbiddenNames.includes(path) ||
    path.endsWith('.tgz'),
)
if (leaks.length > 0) {
  console.error('assert-pack-contents: forbidden paths in pack:\n' + leaks.join('\n'))
  process.exit(1)
}

console.log(`assert-pack-contents: ok (${files.length} files)`)
```

- [ ] **Step 2: Run before build to verify it fails**

Run:

```bash
rm -rf dist
npm run assert:pack
```

Expected: FAIL because required `dist/` files are missing.

- [ ] **Step 3: Add `.npmignore` and script wiring**

```text
# .npmignore - defense in depth; package.json "files" is source of truth.
tests/
docs/
src/
scripts/
.github/
.superpowers/
*.tgz
vitest.config.ts
tsconfig.json
tsconfig.test.json
.env
.env.*
```

Ensure `package.json` has:

```json
"assert:pack": "node scripts/assert-pack-contents.mjs"
```

Note: npm always includes `package.json`, `README.md`, and `LICENSE`; keep `files: ["dist"]`.

- [ ] **Step 4: Build and run pack assertions**

Run:

```bash
npm run build
npm run assert:pack
```

Expected: PASS with `assert-pack-contents: ok`.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/assert-pack-contents.mjs .npmignore
git commit -m "test: assert npm pack contents"
```

---

### Task 5: Export resolution and JS-only client boundary

**Files:**
- Create: `scripts/assert-exports-resolve.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: built `dist/`, package self-name exports, existing `scripts/smoke-built-exports.mjs`
- Produces: post-build export assertions for `.`, `./client`, and tokens-only `./styles.css`, while preserving `test:build-smoke`

- [ ] **Step 1: Write the export assertion script**

```js
// scripts/assert-exports-resolve.mjs
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

function exportTarget(value) {
  if (typeof value === 'string') return value
  if (value && typeof value.default === 'string') return value.default
  throw new Error(`Unsupported export value: ${JSON.stringify(value)}`)
}

for (const [key, value] of Object.entries(pkg.exports)) {
  const jsTarget = exportTarget(value)
  assert.ok(
    existsSync(resolve(root, jsTarget)),
    `missing export target ${key} -> ${jsTarget}`,
  )
  if (value && typeof value === 'object' && typeof value.types === 'string') {
    assert.ok(
      existsSync(resolve(root, value.types)),
      `missing types for ${key} -> ${value.types}`,
    )
  }
}

assert.equal(pkg.exports['./styles.css'], './dist/client/styles/tokens.css')

const rootMod = await import(pathToFileURL(resolve(root, 'dist/index.js')).href)
assert.equal(typeof rootMod.synctrolTheme, 'function')
assert.ok(rootMod.zhMessages)
assert.ok(rootMod.enMessages)

const clientMod = await import(pathToFileURL(resolve(root, 'dist/client/index.js')).href)
assert.equal(typeof clientMod.resolveContentAsset, 'function')
assert.equal(typeof clientMod.createResolveContentAsset, 'function')
assert.ok(clientMod.PlatformEmbed)
assert.ok(clientMod.PlatformLinks)
assert.equal(Object.hasOwn(clientMod, 'Layout'), false)
assert.equal(Object.hasOwn(clientMod, 'BackgroundHost'), false)

console.log('assert-exports-resolve: ok')
```

- [ ] **Step 2: Run before build to verify it fails**

Run:

```bash
rm -rf dist
npm run assert:exports
```

Expected: FAIL because export targets under `dist/` do not exist.

- [ ] **Step 3: Wire scripts without removing build smoke**

Keep:

```json
{
  "test:build-smoke": "npm run build && node scripts/smoke-built-exports.mjs",
  "assert:exports": "node scripts/smoke-built-exports.mjs && node scripts/assert-exports-resolve.mjs"
}
```

`assert:exports` is post-build. It intentionally calls `scripts/smoke-built-exports.mjs` **without** running `npm run build`; callers must run `npm run build` first.

- [ ] **Step 4: Build and run export gates**

Run:

```bash
npm run build
npm run assert:exports
npm run test:build-smoke
```

Expected: PASS. `test:build-smoke` rebuilds by contract; keep that duplication unless a later branch explicitly updates its contract tests.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/assert-exports-resolve.mjs
git commit -m "test: assert built package exports"
```

---

### Task 6: Consumer fixture site with TypeScript isolation

**Files:**
- Create: `tests/fixtures/sites/consumer-smoke/package.json`
- Create: `tests/fixtures/sites/consumer-smoke/.vuepress/config.ts`
- Create: `tests/fixtures/sites/consumer-smoke/.vuepress/assets/social-default.svg`
- Create: `tests/fixtures/sites/consumer-smoke/.vuepress/assets/logo.svg`
- Create: `tests/fixtures/sites/consumer-smoke/content/definitions.yml`
- Create: `tests/fixtures/sites/consumer-smoke/content/home/content.yml`
- Create: `tests/fixtures/sites/consumer-smoke/content/home/zh.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/home/en.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/releases/demo/content.yml`
- Create: `tests/fixtures/sites/consumer-smoke/content/releases/demo/zh.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/releases/demo/en.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/releases/demo/assets/artwork.svg`
- Create: `tests/fixtures/sites/consumer-smoke/content/news/hello/content.yml`
- Create: `tests/fixtures/sites/consumer-smoke/content/news/hello/zh.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/news/hello/en.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/pages/about/content.yml`
- Create: `tests/fixtures/sites/consumer-smoke/content/pages/about/zh.md`
- Create: `tests/fixtures/sites/consumer-smoke/content/pages/about/en.md`

**Interfaces:**
- Consumes: published theme API (`synctrolTheme`, `zhMessages`, `enMessages`) through package self-name
- Produces: minimal zh/en VuePress consumer site for post-build tarball smoke; fixture files are excluded from pre-build TypeScript checks by Task 2

- [ ] **Step 1: Create fixture package metadata**

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
    "vuepress": "^2.0.0-rc.24",
    "vuepress-theme-synctrolling": "file:../../../.."
  }
}
```

The local `file:../../../..` value is only for authoring; Task 7 rewrites it to the packed tarball in a temp directory.

- [ ] **Step 2: Create VuePress config without `import.meta.dirname`**

```ts
// tests/fixtures/sites/consumer-smoke/.vuepress/config.ts
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineUserConfig } from 'vuepress'
import {
  enMessages,
  synctrolTheme,
  zhMessages,
} from 'vuepress-theme-synctrolling'

const configDir = resolve(fileURLToPath(new URL('.', import.meta.url)))

export default defineUserConfig({
  base: '/',
  dest: resolve(configDir, 'dist'),
  locales: {
    '/zh/': { lang: 'zh-CN' },
    '/en/': { lang: 'en-US' },
  },
  theme: synctrolTheme({
    siteUrl: 'https://example.com',
    mainLocale: 'zh',
    locales: {
      zh: { lang: 'zh-CN', label: '中文', messages: zhMessages },
      en: { lang: 'en-US', label: 'English', messages: enMessages },
    },
    copyright: 'Copyright Synctrol',
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
      defaultImage: './assets/social-default.svg',
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

- [ ] **Step 3: Create fixture content**

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
<!-- content/home/zh.md -->
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
<!-- content/home/en.md -->
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

```yaml
# content/releases/demo/content.yml
type: release
slug: demo
date: 2026-08-11
draft: false
artwork: ./assets/artwork.svg
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
description: 关于页面
---

关于页面。
```

```md
<!-- content/pages/about/en.md -->
---
title: About
description: About page
---

About page.
```

Use small SVG files for `social-default.svg`, `logo.svg`, and release `artwork.svg`; do not add binary webp/font assets:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#000"/>
  <text x="32" y="38" text-anchor="middle" fill="#fff" font-size="12">S</text>
</svg>
```

- [ ] **Step 4: Verify fixture path inventory without building**

Run:

```bash
node -e "const fs=require('fs'); const p='tests/fixtures/sites/consumer-smoke'; for (const f of ['package.json','.vuepress/config.ts','.vuepress/assets/social-default.svg','.vuepress/assets/logo.svg','content/definitions.yml','content/home/zh.md','content/releases/demo/en.md','content/news/hello/zh.md','content/pages/about/en.md']) { if (!fs.existsSync(p+'/'+f)) { console.error('missing', f); process.exit(1) } } console.log('fixture files ok')"
npm test -- tests/package-contract.test.ts
```

Expected: `fixture files ok` and package contract tests PASS. Do not run the consumer build until Task 7.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/sites/consumer-smoke tests/package-contract.test.ts tsconfig.test.json
git commit -m "test: add isolated VuePress consumer fixture"
```

---

### Task 7: Consumer tarball smoke script

**Files:**
- Create: `scripts/run-consumer-smoke.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: built `dist/`, package tarball from `npm pack`, and Task 6 fixture
- Produces: `npm run test:consumer-smoke` proving a consumer can install the packed theme and build zh/en routes plus root router

- [ ] **Step 1: Write the consumer smoke script**

```js
// scripts/run-consumer-smoke.mjs
import assert from 'node:assert/strict'
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

const root = process.cwd()
const fixture = resolve(root, 'tests/fixtures/sites/consumer-smoke')

assert.ok(
  existsSync(resolve(root, 'dist/index.js')),
  'dist/index.js missing; run npm run build before npm run test:consumer-smoke',
)

const packOut = execFileSync('npm', ['pack', '--json'], {
  cwd: root,
  encoding: 'utf8',
})
const tarballName = JSON.parse(packOut)[0].filename
const tarballPath = resolve(root, tarballName)
const work = mkdtempSync(join(tmpdir(), 'synctrol-consumer-'))

try {
  cpSync(fixture, work, { recursive: true })
  const pkgPath = join(work, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  pkg.devDependencies['vuepress-theme-synctrolling'] = `file:${tarballPath}`
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  execFileSync('npm', ['install'], { cwd: work, stdio: 'inherit' })
  execFileSync('npx', ['vuepress', 'build', '.'], {
    cwd: work,
    stdio: 'inherit',
  })

  const dest = join(work, '.vuepress', 'dist')
  for (const path of [
    'index.html',
    'zh/index.html',
    'en/index.html',
    'zh/releases/demo/index.html',
    'en/news/hello/index.html',
    'zh/about/index.html',
    'sitemap.xml',
    'zh/rss.xml',
    'en/rss.xml',
  ]) {
    assert.ok(existsSync(join(dest, path)), `missing built output ${path}`)
  }

  const rootHtml = readFileSync(join(dest, 'index.html'), 'utf8')
  assert.match(rootHtml, /location\.replace/)
  assert.match(rootHtml, /href="\/zh\/"/)
  assert.match(rootHtml, /href="\/en\/"/)

  const zhHome = readFileSync(join(dest, 'zh/index.html'), 'utf8')
  assert.match(zhHome, /SYNCTROL/)
  assert.match(zhHome, /lang="zh-CN"|<html[^>]+lang="zh-CN"/)

  const enRelease = readFileSync(join(dest, 'en/releases/demo/index.html'), 'utf8')
  assert.match(enRelease, /Demo Release/)
  assert.match(enRelease, /canonical|og:title/)

  console.log('run-consumer-smoke: ok')
} finally {
  rmSync(work, { recursive: true, force: true })
  rmSync(tarballPath, { force: true })
}
```

- [ ] **Step 2: Run before build to verify it fails**

Run:

```bash
rm -rf dist
npm run test:consumer-smoke
```

Expected: FAIL with `dist/index.js missing; run npm run build before npm run test:consumer-smoke`.

- [ ] **Step 3: Wire the dedicated script**

```json
"test:consumer-smoke": "node scripts/run-consumer-smoke.mjs"
```

Do not call this script from `npm test`.

- [ ] **Step 4: Build and run consumer smoke**

Run:

```bash
npm run build
npm run test:consumer-smoke
```

Expected: PASS within CI timeout; temp directory and generated tarball are removed.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/run-consumer-smoke.mjs tests/fixtures/sites/consumer-smoke
git commit -m "test: smoke packed theme in consumer fixture"
```

---

### Task 8: Prepublish orchestration and GitHub Actions

**Files:**
- Create: `scripts/prepublish-check.mjs`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/publish.yml`
- Create: `tests/publish/workflows.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: source/unit lane and post-build scripts from Tasks 1-7
- Produces: ordered local prepublish gate, CI gate, and tag publish workflow with OIDC + `NPM_TOKEN` fallback

- [ ] **Step 1: Write workflow contract tests**

```ts
// tests/publish/workflows.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ci = readFileSync(resolve('.github/workflows/ci.yml'), 'utf8')
const publish = readFileSync(resolve('.github/workflows/publish.yml'), 'utf8')
const prepublish = readFileSync(resolve('scripts/prepublish-check.mjs'), 'utf8')

describe('publish workflows', () => {
  it('runs source tests before build and post-build gates', () => {
    expect(prepublish).toMatch(/npm', \['test'\]/)
    expect(prepublish).toMatch(/npm', \['run', 'build'\]/)
    expect(prepublish.indexOf("'test'")).toBeLessThan(
      prepublish.indexOf("'build'"),
    )
    expect(prepublish).toContain('assert:build-artifacts')
    expect(prepublish).toContain('assert:pack')
    expect(prepublish).toContain('assert:exports')
    expect(prepublish).toContain('test:consumer-smoke')
  })

  it('runs split lanes in CI', () => {
    expect(ci).toContain('npm ci')
    expect(ci).toContain('npm test')
    expect(ci).toContain('npm run build')
    expect(ci).toContain('npm run assert:build-artifacts')
    expect(ci).toContain('npm run assert:pack')
    expect(ci).toContain('npm run assert:exports')
    expect(ci).toContain('npm run test:consumer-smoke')
  })

  it('publishes tags with OIDC and token fallback', () => {
    expect(publish).toContain("tags: ['v*']")
    expect(publish).toContain('id-token: write')
    expect(publish).toContain('npm publish --provenance --access public')
    expect(publish).toContain('NODE_AUTH_TOKEN')
    expect(publish).toContain('secrets.NPM_TOKEN')
  })
})
```

- [ ] **Step 2: Run workflow tests to verify failure**

Run: `npm test -- tests/publish/workflows.test.ts`

Expected: FAIL because workflows and prepublish script are missing.

- [ ] **Step 3: Add `prepublish-check`**

```js
// scripts/prepublish-check.mjs
import { execFileSync } from 'node:child_process'

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  execFileSync(cmd, args, { stdio: 'inherit' })
}

run('npm', ['test'])
run('npm', ['run', 'build'])
run('npm', ['run', 'assert:build-artifacts'])
run('npm', ['run', 'assert:pack'])
run('npm', ['run', 'assert:exports'])
run('npm', ['run', 'test:consumer-smoke'])

console.log('\nprepublish-check: all gates passed')
```

Wire:

```json
"prepublishOnly": "node scripts/prepublish-check.mjs"
```

- [ ] **Step 4: Add CI and publish workflows**

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

      - name: Source and unit tests
        run: npm test

      - name: Build package
        run: npm run build

      - name: Assert build artifacts
        run: npm run assert:build-artifacts

      - name: Assert pack contents
        run: npm run assert:pack

      - name: Assert exports
        run: npm run assert:exports

      - name: Consumer smoke
        run: npm run test:consumer-smoke
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
          # Preferred: configure npm Trusted Publishing (OIDC) for this repo
          # and workflow. Fallback: set repository secret NPM_TOKEN with npm
          # publish permission.
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- tests/publish/workflows.test.ts
node scripts/prepublish-check.mjs
```

Expected: PASS. Then commit:

```bash
git add package.json scripts/prepublish-check.mjs .github/workflows/ci.yml .github/workflows/publish.yml tests/publish/workflows.test.ts
git commit -m "ci: add npm package prepublish and publish workflows"
```

---

### Task 9: Public consumer README

**Files:**
- Create: `tests/publish/readme.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: final package public API and binding decisions
- Produces: consumer-facing docs for install, peer/engine contract, minimal config, content layout, tokens-only CSS export, font policy, static hosting notes, and contributor commands

- [ ] **Step 1: Write README contract test**

```ts
// tests/publish/readme.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readme = readFileSync(resolve('README.md'), 'utf8')

describe('consumer README', () => {
  it('documents install and current compatibility contract', () => {
    expect(readme).toContain('# vuepress-theme-synctrolling')
    expect(readme).toContain('npm install vuepress-theme-synctrolling')
    expect(readme).toContain('^2.0.0-rc.24')
    expect(readme).toContain('^20.9.0 || >=22.0.0')
  })

  it('documents theme config and content layout', () => {
    expect(readme).toContain('synctrolTheme(')
    expect(readme).toContain('zhMessages')
    expect(readme).toContain('enMessages')
    expect(readme).toContain('content/')
    expect(readme).toContain('content.yml')
  })

  it('binds tokens-only CSS export, font policy, and hosting notes', () => {
    expect(readme).toContain('vuepress-theme-synctrolling/styles.css')
    expect(readme).toMatch(/tokens-only/i)
    expect(readme).toMatch(/Archivo Black/)
    expect(readme).toMatch(/does not ship.*WOFF2/i)
    expect(readme).toContain('## Consumer static hosting notes')
    expect(readme).toContain('siteUrl')
    expect(readme).toContain('base')
    expect(readme).toMatch(/root language router|root router/i)
    expect(readme).not.toMatch(/Deploy this repository to GitHub Pages/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/publish/readme.test.ts`

Expected: FAIL against the current contributor stub.

- [ ] **Step 3: Rewrite README**

````md
# vuepress-theme-synctrolling

Synctrol-specific VuePress 2 theme for multilingual release, news, page, SEO, feed, and static-site publishing. This package is the theme; Synctrol.com is a separate consumer site.

Requires Node.js `^20.9.0 || >=22.0.0`, Vue `^3.5.0`, and VuePress `^2.0.0-rc.24`.

## Install

```bash
npm install vuepress-theme-synctrolling vue@^3.5.0 vuepress@^2.0.0-rc.24
```

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
  locales: {
    '/zh/': { lang: 'zh-CN' },
    '/en/': { lang: 'en-US' },
  },
  theme: synctrolTheme({
    siteUrl: 'https://example.com',
    mainLocale: 'zh',
    locales: {
      zh: { lang: 'zh-CN', label: '中文', messages: zhMessages },
      en: { lang: 'en-US', label: 'English', messages: enMessages },
    },
    copyright: 'Copyright Your Team',
    seo: {
      name: { zh: 'Example', en: 'Example' },
      description: { zh: '站点简介', en: 'Site description' },
      defaultImage: './assets/social-default.svg',
      organization: { name: 'Example', logo: './assets/logo.svg' },
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

## Optional tokens-only CSS export

```ts
import 'vuepress-theme-synctrolling/styles.css'
```

`vuepress-theme-synctrolling/styles.css` exports `dist/client/styles/tokens.css` only. Normal VuePress sites should let the theme client config load the complete style stack.

Display typography uses the CSS stack `'Archivo Black', 'Arial Black', Arial, ...`. The npm package does not ship an Archivo Black WOFF2 yet because no licensed binary is tracked in this repository.

## Content layout overview

```text
content/
├── definitions.yml
├── home/
│   ├── content.yml
│   ├── zh.md
│   └── en.md
├── releases/
│   └── my-release/
│       ├── content.yml
│       ├── book.yml
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

A directory with `content.yml` is a content package (`home`, `release`, `news`, or `page`). Locale files are named by locale key (`zh.md`, `en.md`). Public routes are locale-prefixed.

## Consumer static hosting notes

These notes are for sites that consume this theme:

1. Set `siteUrl` to the public origin without a trailing slash.
2. Use VuePress `base: '/'` for custom domains. Use a trailing-slash subpath such as `/repo-name/` for project-page hosting.
3. The theme emits a root language router at `/index.html` that chooses saved locale, browser language, then `mainLocale`, and calls `location.replace()` to the locale home. Visible `/zh/` and `/en/` links remain for no-JS clients.
4. Do not deploy this theme repository as Synctrol.com; deploy the consumer site's own build output.

## Develop

```bash
npm install
npm test
npm run build
npm run assert:build-artifacts
npm run assert:pack
npm run assert:exports
npm run test:consumer-smoke
```
````

- [ ] **Step 4: Run README test**

Run: `npm test -- tests/publish/readme.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/publish/readme.test.ts
git commit -m "docs: write npm consumer README"
```

---

### Task 10: CHANGELOG bootstrap

**Files:**
- Create: `tests/publish/changelog.test.ts`
- Create: `CHANGELOG.md`

**Interfaces:**
- Consumes: version `0.1.0` and Plans 01-10 feature surface
- Produces: Keep-a-Changelog style first public release notes; changelog remains git documentation and is not required in `files`

- [ ] **Step 1: Write changelog contract test**

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

Expected: FAIL because `CHANGELOG.md` is missing.

- [ ] **Step 3: Write `CHANGELOG.md`**

```md
# Changelog

All notable changes to `vuepress-theme-synctrolling` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-11

### Added

- First public release of the Synctrol VuePress 2 theme package.
- Content compiler for colocated `home`, `release`, `news`, and `page` packages.
- Locale route compiler with mandatory locale prefixes, fallback handling, drafts, collections, and root language router emission for static hosts.
- Asset pipeline with hashed content/global/theme URLs.
- Global shell with navigation, footer, social links, language switching, and color mode.
- Background runtime by content type.
- Platform registry, embeds, links, and `synctrol-csp.json` audit artifact.
- Release index/detail rendering with optional Album/Gift books.
- News indexes, tag archives, pagination, and general Page/Home rendering.
- SEO metadata, JSON-LD, locale RSS, and Sitemap generation.
- Publish pipeline with `dist/` build, pack/export assertions, consumer fixture smoke, and tag-based npm publish workflow.
```

- [ ] **Step 4: Run changelog test**

Run: `npm test -- tests/publish/changelog.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md tests/publish/changelog.test.ts
git commit -m "docs: bootstrap changelog for npm release"
```

---

### Task 11: Final verification gate

**Files:**
- Create: `scripts/verify-release.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: all Plan 11 artifacts and scripts
- Produces: one final local verification command before tagging `v0.1.0`

- [ ] **Step 1: Write release verification script**

```js
// scripts/verify-release.mjs
import { execFileSync } from 'node:child_process'

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  execFileSync(cmd, args, { stdio: 'inherit' })
}

run('npm', ['test'])
run('npm', ['run', 'build'])
run('npm', ['run', 'assert:build-artifacts'])
run('npm', ['run', 'assert:pack'])
run('npm', ['run', 'assert:exports'])
run('npm', ['run', 'test:consumer-smoke'])

console.log('\nverify-release: ready to tag v0.1.0 and push for npm publish')
```

Add:

```json
"verify:release": "node scripts/verify-release.mjs"
```

- [ ] **Step 2: Run final verification**

Run:

```bash
npm run verify:release
```

Expected:

- `npm test` PASS without requiring pre-existing `dist/`
- `npm run build` PASS
- `assert-build-artifacts` PASS
- `assert-pack-contents` PASS
- `assert-exports-resolve` PASS
- consumer tarball smoke PASS
- final log line: `verify-release: ready to tag v0.1.0 and push for npm publish`

- [ ] **Step 3: Manual tag checklist (no Pages deploy)**

Confirm:

1. `package.json` name is `vuepress-theme-synctrolling`, version `0.1.0`, and no `private` field exists.
2. Peer/engine contract is still VuePress `^2.0.0-rc.24` and Node `^20.9.0 || >=22.0.0`.
3. `npm pack --dry-run --json` includes only expected package files and no `tests/`, `docs/`, `src/`, `.github/`, or `.superpowers/`.
4. `./client` import exposes JS helpers/components only and no SFC exports.
5. `./styles.css` remains documented as tokens-only.
6. No Archivo Black WOFF2 is shipped until a licensed source and notice are added.
7. Consumer fixture builds zh/en, root router, Sitemap, and RSS from the tarball.
8. Publish is via `git tag v0.1.0 && git push origin v0.1.0`; this repo does not deploy GitHub Pages.

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/verify-release.mjs
git commit -m "chore: add npm release verification gate"
```

---

## Plan Self-Review

1. **Spec / request coverage:** Tasks 1-11 cover package metadata + lockfile, source/post-build lane split, `copy-client-assets`, build artifacts, pack, exports, fixture isolation, consumer smoke, prepublish/CI/publish, README, CHANGELOG, and final verification. Binding decisions from the revision request are represented in Revision Notes and task steps.
2. **Placeholder scan:** No TODO/TBD placeholders. Each task has exact file paths, commands, and expected outcomes.
3. **Type/API consistency:** Public exports remain `synctrolTheme`, `zhMessages`, `enMessages`, `./client`, and tokens-only `./styles.css`. VuePress RC and Node engine contracts match HEAD package tests. `clientConfigFile` is verified, not reworked. `./client` stays JS-only.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-11-11-npm-package-publish.md`. Implement with subagent-driven-development or executing-plans, one task at a time, with a commit after each task.
