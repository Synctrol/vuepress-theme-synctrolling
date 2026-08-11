# Plan 02 / Task 4 Report: Content package discovery and nesting rejection

## Status

Complete. `discoverContentPackages` discovers only real `content.yml` files, returns deterministic absolute paths, records only real `book.yml` files, avoids directory symlinks, rejects nested packages, and converts discovery IO failures to diagnostics.

## RED evidence

Command: `npm test -- tests/compiler/discovery.test.ts`

```text
tests/compiler/discovery.test.ts(13,41): error TS2307:
Cannot find module '../../src/compiler/discovery'
tests/compiler/discovery.test.ts(73,51): error TS7031:
Binding element 'dir' implicitly has an 'any' type.
```

Exit code: 2. The missing implementation caused the expected module-resolution failure; the implicit `any` was a consequence of that unresolved import.

## GREEN evidence

Command: `npm test -- tests/compiler/discovery.test.ts`

```text
Test Files  1 passed (1)
Tests  9 passed (9)
```

Exit code: 0.

## Full verification

| Command | Result |
|---------|--------|
| `npm test -- tests/compiler/discovery.test.ts` | PASS — 9/9, typecheck clean |
| `npm test` | PASS — 185/185 (13 files), typecheck clean |
| `npm run build` | PASS — `tsc -p tsconfig.json` exit 0 |
| `npm audit` | PASS — 0 vulnerabilities |
| `git diff --check 22524df...HEAD` | PASS |
| `git diff --stat 22524df...HEAD` | 10 files, 300 insertions |

## Commits

- `d0c2aca` — `test(compiler): specify content package discovery`
- `bec1664` — `feat(compiler): discover content packages and reject nesting`
- Branch: `cursor/synctrol-theme-design-ee11` (pushed)

## Files changed

| File | Action |
|------|--------|
| `src/compiler/discovery.ts` | Added deterministic recursive discovery, nested-package rejection, symlink boundaries, and structured IO diagnostics |
| `src/shared/types.ts` | Added `DiscoveredPackage` |
| `tests/compiler/discovery.test.ts` | Added nine focused behavior tests with temporary-directory cleanup |
| `tests/fixtures/compiler/discovery/` | Added normal and nested package fixture trees |

## Implementation notes

1. Resolves `contentRoot` before traversal, so package directories and YAML paths are always absolute.
2. Sorts directory entries before recursion and sorts the final package list with a locale-independent lexical comparator.
3. Treats only a `Dirent.isFile()` entry named `content.yml` as a package. Ordinary files and `config.yml` are ignored.
4. Recurses only into `Dirent.isDirectory()` entries, so file and directory symlinks are neither packages nor traversal targets.
5. Uses `lstatSync` for `book.yml`, recording only ordinary files without following symlinks. `ENOENT` means no book; other errors become `CONTENT_DISCOVERY_FAILED`.
6. Converts root and child-directory read failures to `CONTENT_DISCOVERY_FAILED` with the exact failing absolute path.
7. Emits `NESTED_PACKAGE` with `path` set to the absolute parent package and `relatedPath` set to the absolute child package.

## Concerns

No blocking concerns. A cross-platform permission-denied fixture was intentionally omitted because permission semantics vary by OS and test user; missing-root diagnostics are covered, while root/child reads share the same error conversion path.
