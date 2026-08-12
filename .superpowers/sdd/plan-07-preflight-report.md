# Plan 07 preflight report: Platform system

## Verdict

Verdict: No

Plan 07 is not executable as written against HEAD `40949e2` / shipped Plans 01-06. The plan has the right high-level slice, but several task snippets still target stale or incomplete contracts. The largest blocker is that custom `platforms.types` registrations never flow through the real `compileContent()` -> `parseBook()` path, so site content using custom platform definitions would still fail before rendering or CSP collection. The theme CSP hook and public export snippets also reference non-existent paths/shapes, and multiple client source snippets use incorrect relative import depths for their planned file locations.

## Critical

1. **Custom platform registrations do not reach Book compilation.**
   - Plan evidence:
     - The goal includes custom `platforms.types` registration and says `validatePlatformEntry(..., types?)` uses the registry.
     - Task 5 only modifies `src/platforms/registry.ts`, `src/platforms/collect-csp.ts`, `src/compiler/platform-entry.ts`, and `src/shared/options.ts`.
     - The only concrete integration path in Task 5 manually passes `types` into `validatePlatformEntry(...)`.
     - The plan then says "When theme options are available to the compiler, pass `resolvePlatformTypes(options.platforms.types)` into `validatePlatformEntry`", but gives no executable changes for the compiler path.
   - Repo evidence:
     - `buildSite()` calls `compileContent({ contentRoot, sourceDir, configDir, mainLocale, definitionsPath })`; no platform type config is passed.
     - `compileContent()` calls `parseBook(bookYmlPath, definitions, mainLocale)`.
     - `parseBook()` / `parseAlbumBook()` / `parseGiftBook()` call `validatePlatformEntry(...)` without a registry argument.
   - Impact: a real VuePress site can configure a custom type in `options.platforms.types` and define a platform with that type in `definitions.yml`, but `book.yml` validation still sees only the default `validatePlatformEntry()` behavior and fails with `UNKNOWN_PLATFORM_TYPE`. This breaks a headline Plan 07 requirement.

2. **The CSP theme hook snippet is not executable against current `BuiltSite`.**
   - Plan evidence:
     - Task 11 wires CSP with `const sources = compiled.releasePackages...`.
   - Repo evidence:
     - Current `BuiltSite` has `site`, `packages`, `compiledPackages`, and `definitions`; it has no `releasePackages`.
     - `src/compiler/theme.ts` stores the built result in a local `built` variable and currently uses it only in `onGenerated` to write the root router HTML.
   - Impact: copying the hook snippet cannot compile. The plan must rewrite this as an additive patch against current `theme.ts`, probably using `built.compiledPackages`, `built.definitions.platforms`, and current route/page visibility data.

3. **The CSP collection plan does not define "visible" against Plans 03-06 publishing state.**
   - Plan evidence:
     - The architecture promises a CSP artifact collected from "every visible Book platform entry".
     - `collectVisiblePlatformEntries()` only receives `{ book, platformTypes }` and the tests construct raw `AlbumBook` / `GiftBook` objects directly.
   - Repo evidence:
     - `compileContent()` retains all packages that pass schema validation.
     - `buildSite()` separately computes route availability and pages; Plan 04 asset compilation already filters to published pages through `selectAssetPackageSources({ compiledPackages, packages, pages })`.
   - Impact: using all compiled books can over-report CSP origins for draft or otherwise unpublished releases. Using only route pages requires an explicit identity/page filter that the plan does not specify or test.

4. **Task 11 exports a non-existent module path.**
   - Plan evidence:
     - The root export snippet says:
       `export { writeSynctrolCspJson, assertNoCspMetaInjection } from './node/platforms/write-csp-artifact.js'`
   - Repo / plan evidence:
     - Task 6 creates `src/compiler/platforms/write-csp-artifact.ts`, not `src/node/platforms/...`.
     - Current root exports use actual `src/...` paths, e.g. `./compiler/index.js` and `./compiler/assets/index.js`.
   - Impact: the final public export task will fail typecheck/build until the path is corrected to the actual compiler module.

5. **Client component snippets use wrong relative import depths for their planned locations.**
   - Plan evidence:
     - `src/client/components/platforms/PlatformEmbed.ts` imports `../../shared/options.js` and `../../platforms/format-message.js`.
     - `src/client/components/platforms/PlatformLinks.ts` imports `../../shared/types.js` and `../../shared/options.js`.
   - Repo evidence:
     - From `src/client/components/platforms/`, `../../shared/...` resolves under `src/client/shared/...`, which does not exist.
     - The correct depth to root shared/platform modules is `../../../shared/...` and `../../../platforms/...`.
   - Impact: Tasks 7 and 10 are not NodeNext/typecheck executable as copied.

6. **Task 11 risks overwriting shipped `./client` exports.**
   - Plan evidence:
     - Task 11 says modify `src/client/index.ts` and shows only:
       `export { PlatformEmbed } ...`
       `export { PlatformLinks } ...`
   - Repo evidence:
     - Current `src/client/index.ts` exports Plan 04 asset helpers (`resolveContentAsset`, `createResolveContentAsset`, `setContentAssetMap`, etc.) and Plan 05 composable keys.
     - `scripts/smoke-built-exports.mjs` imports `vuepress-theme-synctrolling/client` and asserts those asset helpers exist.
   - Impact: a worker copying the snippet as a replacement would break the shipped `./client` contract and build smoke. The task must say to append platform exports while preserving existing exports and the Plan 06 `BackgroundHost` non-export boundary.

## Important

1. **Plan 07 still contains stale dependency and Vitest setup instructions.**
   - Task 7 asks to install `happy-dom` and `@vue/test-utils` and replace Vitest with `environmentMatchGlobs`.
   - HEAD already has `happy-dom`, `@vue/test-utils`, `@vitejs/plugin-vue`, and a Vitest `projects` config with a client `happy-dom` project and node project excluding `tests/client/**`.
   - Replacing this with `environmentMatchGlobs` would regress the Plan 06 setup. Plan 07 should extend the existing projects config only if platform tests need an alias or CSS setting.

2. **`PlatformTypeRegistration.component` is still too loosely typed at HEAD, but the plan does not address all downstream type imports cleanly.**
   - Current `src/shared/options.ts` has `component: unknown`.
   - Plan 07 correctly says to type it as Vue `Component`, but client snippets import `PlatformTypeRegistration` from wrong paths and tests use broad `Object` props.
   - The revision should update `src/shared/options.ts` once and ensure all renderer/component files import from the correct root-relative path.

3. **Registry refactor must preserve Plan 02 hardening tests.**
   - HEAD `src/compiler/platform-entry.ts` has stricter behavior than the simplified Plan 07 built-in snippets: own-data-property copying, accessor avoidance, inherited definition rejection, URL credential rejection, provider hostname spoof checks, and strict package-relative audio asset checks.
   - Plan 07 says existing category/platform checks remain and does rerun `tests/compiler/platform-entry.test.ts`, but the built-in registration snippets use much simpler helpers.
   - The revision should state explicitly that the refactor must preserve all current `tests/compiler/platform-entry.test.ts` security and validation cases, not merely match the new narrower built-in tests.

4. **Compiler integration tests do not prove custom types through `compileContent()` or `buildSite()`.**
   - Task 5 and Task 11 tests call `validatePlatformEntry()` manually.
   - No proposed test creates a temp content tree with a custom `definitions.yml` platform type and theme `platforms.types`, then runs `buildSite()` / `synctrolTheme()` or an expanded `compileContent()` path.
   - Add this test before implementation so the custom registry is proven at the same boundary real users exercise.

5. **CSP directive modeling is underspecified for custom types.**
   - `src/platforms/csp.ts` supports `frame-src`, `media-src`, and `connect-src`.
   - `PlatformTypeRegistration.cspOrigins(entry): string[]` has no directive information.
   - Task 5 maps every non-`audio_player` type to `frame-src` and `audio_player` to `media-src`; custom types cannot contribute `connect-src` or media origins except by type-name special case.
   - Either document that custom v1 platform CSP origins are frame-only, or change the registration contract to return directive chunks.

6. **Task 6 artifact tests prove the writer but not theme generation.**
   - The writer unit test confirms `writeSynctrolCspJson(dest, csp)` writes JSON.
   - The final integration test also calls the writer directly.
   - No test drives `synctrolTheme(...).onGenerated(app)` or equivalent to prove `<dest>/synctrol-csp.json` is actually written during VuePress generation and that root-router behavior from Plans 03/06 remains intact.

7. **Plan 07 does not include full current verification gates.**
   - The final platform suite omits `npm run test:typecheck`, `npm test`, and `npm run test:build-smoke`.
   - Given changes to root exports, `./client` exports, TypeScript source imports, and Vue component exports, these gates are necessary before marking the plan complete.

## Minor

1. **Plan assumptions should name Plans 04-06 as shipped dependencies.**
   - The opening constraints say Plans 01-03 are available, but HEAD includes Plan 04 asset helpers, Plan 05 shell/client exports, and Plan 06 background/Vitest/client boundary changes that this plan must preserve.

2. **The placeholder renderer lifecycle needs a stricter cleanup instruction.**
   - Task 4 creates `renderers/placeholders.ts` and Task 9 later says to delete it once unused.
   - Add a verification item that no built-in module imports `createStubRenderer` after Task 9, so the temporary placeholder cannot leak into the shipped registry.

3. **Test snippets should prefer current repo import conventions.**
   - Production `src/**` imports must use `.js` relative suffixes under NodeNext.
   - Test imports can remain extensionless through `tsconfig.test.json` bundler resolution.
   - A few snippets mix correct and incorrect conventions; make this explicit per source vs test file.

4. **`audio_player.src` wording is looser than current validation.**
   - Plan 07 says the plan accepts "absolute HTTPS or opaque relative `src` strings".
   - HEAD currently accepts strict package-relative `./...` assets or absolute HTTPS and rejects traversal, root-absolute, query/hash, encoded traversal, etc.
   - Keep the stricter HEAD rule unless deliberately revising Plan 02 tests.

## Revision checklist

- [ ] Add an explicit platform registry path through content compilation:
  - extend `CompileContentOptions` and/or `parseBook()` / `parseAlbumBook()` / `parseGiftBook()` to accept resolved `PlatformTypeRegistration` maps;
  - pass `resolvePlatformTypes(resolved.platforms.types)` from `buildSite()` into `compileContent()`;
  - preserve default built-ins for direct Plan 02 callers.
- [ ] Add an end-to-end custom-platform fixture test through the real compile/build path, not only direct `validatePlatformEntry(...)`.
- [ ] Rewrite Task 11 CSP hook against current `src/compiler/theme.ts` and `BuiltSite`:
  - use `built.compiledPackages`, `built.definitions.platforms`, and current page visibility;
  - keep the existing root-router write in `onGenerated`;
  - write `synctrol-csp.json` without adding a CSP meta tag.
- [ ] Define "visible Book platform entries" using current route/page availability and exclude draft/unpublished books from CSP unless they produce visible pages.
- [ ] Fix the root export path for `writeSynctrolCspJson` / `assertNoCspMetaInjection` to the actual `./compiler/platforms/write-csp-artifact.js` module.
- [ ] Append to `src/client/index.ts`; do not replace existing Plan 04 asset helper exports or Plan 05/06 client boundaries.
- [ ] Correct all production client component import depths from `src/client/components/platforms/**` to root shared/platform modules.
- [ ] Keep `src/client/index.ts` JS-only and do not export `.vue` files through `vuepress-theme-synctrolling/client`.
- [ ] Preserve all current `tests/compiler/platform-entry.test.ts` safety behavior during the registry refactor.
- [ ] Keep HEAD's Vitest `projects` config and existing devDependencies; do not replace it with `environmentMatchGlobs` or reinstall already-present packages.
- [ ] Decide whether custom `cspOrigins` is frame-only in v1 or change the registration contract to return directive-specific CSP chunks.
- [ ] Add tests proving theme generation writes `synctrol-csp.json` and does not change root-router HTML or inject CSP meta.
- [ ] After revision, run at minimum:
  - `npm run test:typecheck`
  - the full Plan 07 platform suite
  - existing `tests/compiler/platform-entry.test.ts`
  - `npm test`
  - `npm run test:build-smoke`
