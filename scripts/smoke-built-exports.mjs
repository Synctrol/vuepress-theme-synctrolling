import assert from 'node:assert/strict'

const root = await import('vuepress-theme-synctrolling')
const client = await import('vuepress-theme-synctrolling/client')

assert.equal(typeof root.synctrolTheme, 'function')
assert.deepEqual(Object.keys(client), [])

console.log('Built root and client exports imported successfully.')
