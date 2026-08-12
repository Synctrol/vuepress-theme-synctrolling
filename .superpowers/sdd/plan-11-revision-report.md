# Plan 11 Revision Report

Branch checked: `cursor/synctrol-theme-design-ee11` at `c01a05e71cb2df9e775621f52001da5801ca5614` after `git pull origin cursor/synctrol-theme-design-ee11`.

Plan revised: `docs/superpowers/plans/2026-08-11-11-npm-package-publish.md`

## Status

Plan 11 is now revised to be executable against HEAD after Plans 01-10, subject to normal implementation/test feedback during execution. This was a docs-only revision; no feature code was implemented.

## Major changes

1. **Bound current package compatibility contract**
   - Kept VuePress peer/dev range at `^2.0.0-rc.24`.
   - Kept Node engine at `^20.9.0 || >=22.0.0`.
   - Updated package metadata/test samples to match `tests/package-contract.test.ts` at HEAD.

2. **Preserved existing build contracts**
   - Removed the old `copy-package-assets.mjs` direction.
   - Plan now preserves `tsc -p tsconfig.json && node scripts/copy-client-assets.mjs`.
   - Plan verifies/extends `copy-client-assets.mjs` for font extensions without renaming it.
   - `test:build-smoke` remains explicitly preserved.

3. **Split source tests from post-build publish gates**
   - `npm test` remains source/unit only.
   - Build artifact, pack, export, and consumer smoke checks run after `npm run build` through dedicated scripts.
   - `prepublish-check`, CI, and release verification now use the order: source tests -> build -> post-build gates.

4. **Isolated fixture TypeScript**
   - Added a task to exclude `tests/fixtures/sites/**` from `tsconfig.test.json`.
   - Post-build consumer fixture work is kept out of default Vitest/source checks.

5. **Clarified public package surface**
   - `./client` stays JS-only.
   - `./styles.css` is documented and tested as a tokens-only export.
   - `clientConfigFile` is verified in built output instead of being reworked.

6. **Resolved font asset blocker conservatively**
   - No Archivo Black binary exists in HEAD.
   - Revised plan keeps the existing font-family stack and does not ship a WOFF2 until a licensed source and notice are available.

7. **Bound publish auth mode**
   - Publish workflow is dual-mode: npm trusted publishing/OIDC preferred, `NPM_TOKEN` fallback documented and wired.

8. **Included package-lock handling**
   - Task 1 includes `package-lock.json` and instructs `npm install --package-lock-only` after package metadata edits.

## Remaining risks

- The consumer smoke script may need assertion string adjustments if VuePress output HTML differs from the proposed markers, but it is isolated to the post-build lane.
- The GitHub publish workflow still depends on repository/npm-side trusted publishing setup or a valid `NPM_TOKEN` secret at tag time.
- The Archivo Black self-hosted font remains intentionally unshipped until a licensed binary source is provided.
