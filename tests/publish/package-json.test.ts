import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface PackageJson {
  name: string
  version: string
  private?: boolean
  description?: string
  license?: string
  type: string
  exports: Record<string, unknown>
  files: string[]
  publishConfig?: { access?: string }
  peerDependencies: Record<string, string>
  devDependencies: Record<string, string>
  engines: Record<string, string>
  scripts: Record<string, string>
  repository?: { type: string; url: string }
  bugs?: { url: string }
  homepage?: string
}

const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as PackageJson
const lock = JSON.parse(readFileSync(resolve('package-lock.json'), 'utf8')) as {
  name: string
  version: string
  packages: Record<
    string,
    {
      version?: string
      peerDependencies?: Record<string, string>
      engines?: Record<string, string>
    }
  >
}

describe('publishable package.json', () => {
  it('uses approved public package metadata', () => {
    expect(pkg.name).toBe('vuepress-theme-synctrolling')
    expect(pkg.version).toBe('0.1.0')
    expect(pkg.private).toBeUndefined()
    expect(pkg.type).toBe('module')
    expect(pkg.license).toBe('MIT')
    expect(pkg.description).toMatch(/Synctrol/)
  })

  it('declares root, JS-only client, and tokens-only CSS exports', () => {
    expect(pkg.exports['.']).toEqual({
      types: './dist/index.d.ts',
      default: './dist/index.js',
    })
    expect(pkg.exports['./client']).toEqual({
      types: './dist/client/index.d.ts',
      default: './dist/client/index.js',
    })
    expect(pkg.exports['./styles.css']).toBe('./dist/client/styles/tokens.css')
  })

  it('ships only dist and keeps current peer/engine contract', () => {
    expect(pkg.files).toEqual(['dist'])
    expect(pkg.peerDependencies).toEqual({
      vue: '^3.5.0',
      vuepress: '^2.0.0-rc.24',
    })
    expect(pkg.devDependencies.vuepress).toBe('^2.0.0-rc.24')
    expect(pkg.engines.node).toBe('^20.9.0 || >=22.0.0')
    expect(pkg.publishConfig?.access).toBe('public')
  })

  it('keeps source and post-build scripts split', () => {
    expect(pkg.scripts.build).toBe(
      'tsc -p tsconfig.json && node scripts/copy-client-assets.mjs',
    )
    expect(pkg.scripts['test:build-smoke']).toBe(
      'npm run build && node scripts/smoke-built-exports.mjs',
    )
    expect(pkg.scripts.test).toBe('npm run test:typecheck && vitest run')
    expect(pkg.scripts['assert:build-artifacts']).toContain(
      'assert-build-artifacts',
    )
    expect(pkg.scripts['assert:pack']).toContain('assert-pack-contents')
    expect(pkg.scripts['assert:exports']).toContain('assert-exports-resolve')
    expect(pkg.scripts['test:consumer-smoke']).toContain('run-consumer-smoke')
    expect(pkg.scripts.prepublishOnly).toContain('prepublish-check')
  })

  it('has package-lock root metadata synchronized', () => {
    expect(lock.name).toBe(pkg.name)
    expect(lock.version).toBe(pkg.version)
    expect(lock.packages[''].version).toBe(pkg.version)
    expect(lock.packages[''].peerDependencies?.vuepress).toBe('^2.0.0-rc.24')
    expect(lock.packages[''].engines?.node).toBe('^20.9.0 || >=22.0.0')
  })
})
