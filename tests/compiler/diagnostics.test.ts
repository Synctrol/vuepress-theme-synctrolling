import { describe, expect, it } from 'vitest'
import {
  createDiagnostic,
  fail,
  isDiagnosticError,
  SynctrolDiagnosticError,
} from '../../src/compiler/diagnostics'

describe('diagnostics', () => {
  it('creates an error diagnostic with path and message', () => {
    const d = createDiagnostic({
      severity: 'error',
      code: 'NESTED_PACKAGE',
      message: 'Nested content package',
      path: '/content/releases/a',
      relatedPath: '/content/releases/a/nested',
    })
    expect(d.severity).toBe('error')
    expect(d.code).toBe('NESTED_PACKAGE')
    expect(d.path).toBe('/content/releases/a')
    expect(d.relatedPath).toBe('/content/releases/a/nested')
  })

  it('fail throws SynctrolDiagnosticError wrapping one diagnostic', () => {
    expect(() =>
      fail({
        severity: 'error',
        code: 'INVALID_YAML',
        message: 'bad yaml',
        path: '/content/definitions.yml',
      }),
    ).toThrow(SynctrolDiagnosticError)

    try {
      fail({
        severity: 'error',
        code: 'INVALID_YAML',
        message: 'bad yaml',
        path: '/content/definitions.yml',
      })
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics).toHaveLength(1)
        expect(error.diagnostics[0].code).toBe('INVALID_YAML')
        expect(error.message).toContain('bad yaml')
      }
    }
  })
})
