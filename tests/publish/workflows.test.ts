import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ci = readFileSync(resolve('.github/workflows/ci.yml'), 'utf8')
const publish = readFileSync(resolve('.github/workflows/publish.yml'), 'utf8')
const prepublish = readFileSync(resolve('scripts/prepublish-check.mjs'), 'utf8')

describe('publish workflows', () => {
  it('runs source tests before build and post-build gates', () => {
    expect(prepublish).toMatch(/npm', \['test'\]/)
    expect(prepublish).toMatch(/npm', \['run', 'build'\]/)
    expect(prepublish.indexOf("'test'")).toBeLessThan(
      prepublish.indexOf("'build'"),
    )
    expect(prepublish).toContain('assert:build-artifacts')
    expect(prepublish).toContain('assert:pack')
    expect(prepublish).toContain('assert:exports')
    expect(prepublish).toContain('test:consumer-smoke')
  })

  it('runs split lanes in CI', () => {
    expect(ci).toContain('npm ci')
    expect(ci).toContain('npm test')
    expect(ci).toContain('npm run build')
    expect(ci).toContain('npm run assert:build-artifacts')
    expect(ci).toContain('npm run assert:pack')
    expect(ci).toContain('npm run assert:exports')
    expect(ci).toContain('npm run test:consumer-smoke')
  })

  it('publishes tags with OIDC and token fallback', () => {
    expect(publish).toContain("tags: ['v*']")
    expect(publish).toContain('id-token: write')
    expect(publish).toContain('npm publish --provenance --access public')
    expect(publish).toContain('NODE_AUTH_TOKEN')
    expect(publish).toContain('secrets.NPM_TOKEN')
  })
})
