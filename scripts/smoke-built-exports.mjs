import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

assert.ok(
  existsSync(join(root, 'dist/client/layouts/Layout.vue')),
  'expected dist/client/layouts/Layout.vue after build',
)
assert.ok(
  existsSync(join(root, 'dist/client/config.js')),
  'expected dist/client/config.js after build',
)

const pkg = await import('vuepress-theme-synctrolling')
const client = await import('vuepress-theme-synctrolling/client')

assert.equal(typeof pkg.synctrolTheme, 'function')
assert.equal(typeof client.resolveContentAsset, 'function')
assert.equal(typeof client.createResolveContentAsset, 'function')
assert.equal(typeof client.setContentAssetMap, 'function')

console.log('Built root and client exports imported successfully.')
console.log('Verified dist/client/layouts/Layout.vue and dist/client/config.js exist.')
