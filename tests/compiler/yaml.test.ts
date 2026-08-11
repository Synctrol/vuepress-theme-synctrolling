import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { loadYamlFile } from '../../src/compiler/yaml'

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/compiler/yaml',
)

describe('loadYamlFile', () => {
  it('parses a valid YAML file into a plain object', () => {
    const data = loadYamlFile(join(fixtureRoot, 'valid.yml'))
    expect(data).toEqual({ type: 'release', slug: 'first-release' })
  })

  it('throws INVALID_YAML for malformed YAML', () => {
    try {
      loadYamlFile(join(fixtureRoot, 'invalid.yml'))
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_YAML')
        expect(error.diagnostics[0].path).toContain('invalid.yml')
      }
    }
  })

  it('throws INVALID_YAML for a missing file', () => {
    try {
      loadYamlFile(join(fixtureRoot, 'missing.yml'))
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_YAML')
      }
    }
  })
})
