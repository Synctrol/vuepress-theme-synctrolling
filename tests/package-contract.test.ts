import { existsSync, readFileSync } from 'node:fs'
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

  it('pins a patched test toolchain that still supports the Node 20 baseline', () => {
    expect(packageJson.devDependencies.vitest).toBe('^4.1.10')
    expect(packageJson.devDependencies.vite).toBe('^6.4.3')
  })

  it('provides a build smoke for both package export targets', () => {
    const clientEntry = new URL('../src/client/index.ts', import.meta.url)
    const buildSmoke = new URL(
      '../scripts/smoke-built-exports.mjs',
      import.meta.url,
    )
    const smokeSource = readFileSync(buildSmoke, 'utf8')

    expect(existsSync(clientEntry)).toBe(true)
    expect(readFileSync(clientEntry, 'utf8')).not.toMatch(/\.css/)
    expect(existsSync(buildSmoke)).toBe(true)
    expect(smokeSource).toMatch(/dist\/client\/layouts\/Layout\.vue/)
    expect(smokeSource).toMatch(/dist\/client\/config\.js/)
    expect(packageJson.scripts['test:build-smoke']).toBe(
      'npm run build && node scripts/smoke-built-exports.mjs',
    )
  })

  it('ignores generated package artifacts', () => {
    const gitignore = readFileSync(
      new URL('../.gitignore', import.meta.url),
      'utf8',
    )

    expect(gitignore).toContain('node_modules/')
    expect(gitignore).toContain('dist/')
  })
})
