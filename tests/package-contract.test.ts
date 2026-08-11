import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface PackageJson {
  scripts: Record<string, string>
}

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageJson

describe('package contract', () => {
  it('typechecks NodeNext production sources before Bundler-resolved tests', () => {
    expect(packageJson.scripts['test:typecheck']).toBe(
      'tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json --noEmit',
    )
  })
})
