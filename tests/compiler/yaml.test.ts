import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { loadYamlFile } from '../../src/compiler/yaml'

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/compiler/yaml',
)

function expectInvalidYaml(path: string): void {
  try {
    loadYamlFile(path)
    expect.unreachable('should have thrown')
  } catch (error) {
    expect(isDiagnosticError(error)).toBe(true)
    if (isDiagnosticError(error)) {
      expect(error.diagnostics[0].code).toBe('INVALID_YAML')
      expect(error.diagnostics[0].path).toBe(path)
    }
  }
}

async function expectNoProcessWarnings(
  action: () => void,
): Promise<void> {
  const warnings: Error[] = []
  const listener = (warning: Error) => warnings.push(warning)
  process.on('warning', listener)
  try {
    action()
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(warnings).toHaveLength(0)
  } finally {
    process.off('warning', listener)
  }
}

describe('loadYamlFile', () => {
  it('parses a valid YAML file into a plain object', () => {
    const path = join(fixtureRoot, 'valid.yml')
    const data = loadYamlFile(path)
    expect(data).toEqual({ type: 'release', slug: 'first-release' })
  })

  it('throws INVALID_YAML for malformed YAML', () => {
    expectInvalidYaml(join(fixtureRoot, 'invalid.yml'))
  })

  it('throws INVALID_YAML for a missing file', () => {
    expectInvalidYaml(join(fixtureRoot, 'missing.yml'))
  })

  it('throws INVALID_YAML for unresolved custom tag !foo without emitting warnings', async () => {
    const path = join(fixtureRoot, 'custom-tag-foo.yml')
    await expectNoProcessWarnings(() => expectInvalidYaml(path))
  })

  it('throws INVALID_YAML for !!js/function tag without executing or emitting warnings', async () => {
    const path = join(fixtureRoot, 'custom-tag-js-function.yml')
    await expectNoProcessWarnings(() => expectInvalidYaml(path))
  })
})
