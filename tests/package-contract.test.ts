import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface PackageJson {
  devDependencies: Record<string, string>
  engines: Record<string, string>
  peerDependencies: Record<string, string>
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

  it('supports Node 20 and aligns the tested VuePress RC contract', () => {
    expect(packageJson.engines.node).toBe('^20.9.0 || >=22.0.0')
    expect(packageJson.devDependencies['@types/node']).toMatch(/^\^20\./)
    expect(packageJson.devDependencies.vuepress).toBe('^2.0.0-rc.24')
    expect(packageJson.peerDependencies.vuepress).toBe('^2.0.0-rc.24')
  })
})
