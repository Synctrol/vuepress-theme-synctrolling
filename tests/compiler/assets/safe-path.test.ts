import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
import { resolveSafePath } from '../../../src/compiler/assets/safe-path'

const packageRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/assets/safe-path/package',
)

describe('resolveSafePath', () => {
  it('resolves a package-relative asset inside the root', () => {
    const resolved = resolveSafePath(packageRoot, './assets/Cover.webp')
    expect(resolved).toBe(join(packageRoot, 'assets/Cover.webp'))
  })

  it('resolves nested relative paths and retains nesting', () => {
    const resolved = resolveSafePath(packageRoot, './assets/nested/art.webp')
    expect(resolved).toBe(join(packageRoot, 'assets/nested/art.webp'))
  })

  it('rejects path escape with .. segments', () => {
    try {
      resolveSafePath(packageRoot, './assets/../../outside.webp')
      expect.unreachable('expected escape failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_PATH_ESCAPE')
      }
    }
  })

  it('rejects absolute filesystem refs', () => {
    try {
      resolveSafePath(packageRoot, '/etc/passwd')
      expect.unreachable('expected escape failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_PATH_ESCAPE')
      }
    }
  })

  it('fails when the file is missing', () => {
    try {
      resolveSafePath(packageRoot, './assets/missing.webp')
      expect.unreachable('expected missing failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_MISSING')
        expect(error.diagnostics[0]?.path).toContain('missing.webp')
      }
    }
  })

  it('fails on case mismatch even when the OS filesystem is case-insensitive', () => {
    try {
      resolveSafePath(packageRoot, './assets/cover.webp')
      expect.unreachable('expected case mismatch failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_CASE_MISMATCH')
      }
    }
  })
})
