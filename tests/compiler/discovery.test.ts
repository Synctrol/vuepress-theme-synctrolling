import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { discoverContentPackages } from '../../src/compiler/discovery'

const fixtureRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/compiler/discovery',
)

function withTemporaryDirectory(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'synctrol-discovery-'))
  try {
    run(root)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}

describe('discoverContentPackages', () => {
  it('finds packages in deterministic order and records a real book.yml', () => {
    const root = join(fixtureRoot, 'ok')

    expect(discoverContentPackages(root)).toEqual([
      {
        dir: join(root, 'home'),
        contentYmlPath: join(root, 'home/content.yml'),
      },
      {
        dir: join(root, 'releases/first-release'),
        contentYmlPath: join(root, 'releases/first-release/content.yml'),
        bookYmlPath: join(root, 'releases/first-release/book.yml'),
      },
    ])
  })

  it('returns absolute paths when contentRoot is relative', () => {
    const root = join(fixtureRoot, 'ok')
    const packages = discoverContentPackages(relative(process.cwd(), root))

    expect(packages).toHaveLength(2)
    for (const discoveredPackage of packages) {
      expect(discoveredPackage.dir).toBe(resolve(discoveredPackage.dir))
      expect(discoveredPackage.contentYmlPath).toBe(
        resolve(discoveredPackage.contentYmlPath),
      )
      if (discoveredPackage.bookYmlPath) {
        expect(discoveredPackage.bookYmlPath).toBe(
          resolve(discoveredPackage.bookYmlPath),
        )
      }
    }
  })

  it('sorts recursively discovered packages independently of creation order', () => {
    withTemporaryDirectory((root) => {
      const zPackage = join(root, 'z-package')
      const aPackage = join(root, 'a-group/deep-package')
      mkdirSync(zPackage, { recursive: true })
      writeFileSync(join(zPackage, 'content.yml'), '{}')
      mkdirSync(aPackage, { recursive: true })
      writeFileSync(join(aPackage, 'content.yml'), '{}')

      expect(discoverContentPackages(root).map(({ dir }) => dir)).toEqual([
        aPackage,
        zPackage,
      ])
    })
  })

  it('ignores config.yml, ordinary files, and non-file content.yml entries', () => {
    withTemporaryDirectory((root) => {
      const symlinkPackage = join(root, 'symlink-package')
      const directoryPackage = join(root, 'directory-package')
      mkdirSync(symlinkPackage)
      writeFileSync(join(symlinkPackage, 'manifest.yml'), '{}')
      symlinkSync(
        join(symlinkPackage, 'manifest.yml'),
        join(symlinkPackage, 'content.yml'),
        'file',
      )
      mkdirSync(join(directoryPackage, 'content.yml'), { recursive: true })
      writeFileSync(join(root, 'config.yml'), '{}')
      writeFileSync(join(root, 'notes.md'), 'not a package')

      expect(discoverContentPackages(root)).toEqual([])
    })
  })

  it('does not recurse into directory symlinks', () => {
    withTemporaryDirectory((temporaryRoot) => {
      const root = join(temporaryRoot, 'root')
      const outside = join(temporaryRoot, 'outside')
      mkdirSync(root)
      mkdirSync(outside)
      writeFileSync(join(outside, 'content.yml'), '{}')
      symlinkSync(outside, join(root, 'outside-link'), 'dir')
      symlinkSync(root, join(root, 'cycle'), 'dir')

      expect(discoverContentPackages(root)).toEqual([])
    })
  })

  it('records book.yml only when it is a real ordinary file', () => {
    withTemporaryDirectory((root) => {
      const packageDir = join(root, 'package')
      mkdirSync(packageDir)
      writeFileSync(join(packageDir, 'content.yml'), '{}')
      writeFileSync(join(root, 'book-target.yml'), 'type: album')
      symlinkSync(
        join(root, 'book-target.yml'),
        join(packageDir, 'book.yml'),
        'file',
      )

      expect(discoverContentPackages(root)).toEqual([
        {
          dir: packageDir,
          contentYmlPath: join(packageDir, 'content.yml'),
        },
      ])
    })
  })

  it('errors on nested packages with exact parent and child paths', () => {
    const parent = join(fixtureRoot, 'nested/releases/parent')
    const child = join(parent, 'child')

    try {
      discoverContentPackages(join(fixtureRoot, 'nested'))
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics).toHaveLength(1)
        expect(error.diagnostics[0]).toMatchObject({
          severity: 'error',
          code: 'NESTED_PACKAGE',
          path: parent,
          relatedPath: child,
        })
        expect(error.diagnostics[0].message).toContain(parent)
        expect(error.diagnostics[0].message).toContain(child)
      }
    }
  })

  it('returns an empty array for an empty content root', () => {
    withTemporaryDirectory((root) => {
      expect(discoverContentPackages(root)).toEqual([])
    })
  })

  it('reports a missing content root as a discovery diagnostic', () => {
    withTemporaryDirectory((temporaryRoot) => {
      const missingRoot = join(temporaryRoot, 'missing')

      try {
        discoverContentPackages(missingRoot)
        expect.unreachable('should have thrown')
      } catch (error) {
        expect(isDiagnosticError(error)).toBe(true)
        if (isDiagnosticError(error)) {
          expect(error.diagnostics).toEqual([
            expect.objectContaining({
              severity: 'error',
              code: 'CONTENT_DISCOVERY_FAILED',
              path: resolve(missingRoot),
            }),
          ])
        }
      }
    })
  })
})
