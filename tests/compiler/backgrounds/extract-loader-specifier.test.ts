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
