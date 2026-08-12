import assert from 'node:assert/strict'

const root = await import('vuepress-theme-synctrolling')
const client = await import('vuepress-theme-synctrolling/client')

assert.equal(typeof root.synctrolTheme, 'function')
assert.equal(typeof client.resolveContentAsset, 'function')
assert.equal(typeof client.createResolveContentAsset, 'function')
assert.equal(typeof client.setContentAssetMap, 'function')

console.log('Built root and client exports imported successfully.')
