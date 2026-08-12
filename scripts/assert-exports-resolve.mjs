import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

function exportTarget(value) {
  if (typeof value === 'string') return value
  if (value && typeof value.default === 'string') return value.default
  throw new Error(`Unsupported export value: ${JSON.stringify(value)}`)
}

for (const [key, value] of Object.entries(pkg.exports)) {
  const jsTarget = exportTarget(value)
  assert.ok(
    existsSync(resolve(root, jsTarget)),
    `missing export target ${key} -> ${jsTarget}`,
  )
  if (value && typeof value === 'object' && typeof value.types === 'string') {
    assert.ok(
      existsSync(resolve(root, value.types)),
      `missing types for ${key} -> ${value.types}`,
    )
  }
}

assert.equal(pkg.exports['./styles.css'], './dist/client/styles/tokens.css')

const rootMod = await import(pathToFileURL(resolve(root, 'dist/index.js')).href)
assert.equal(typeof rootMod.synctrolTheme, 'function')
assert.ok(rootMod.zhMessages)
assert.ok(rootMod.enMessages)

const clientMod = await import(pathToFileURL(resolve(root, 'dist/client/index.js')).href)
assert.equal(typeof clientMod.resolveContentAsset, 'function')
assert.equal(typeof clientMod.createResolveContentAsset, 'function')
assert.ok(clientMod.PlatformEmbed)
assert.ok(clientMod.PlatformLinks)
assert.equal(Object.hasOwn(clientMod, 'Layout'), false)
assert.equal(Object.hasOwn(clientMod, 'BackgroundHost'), false)

console.log('assert-exports-resolve: ok')
