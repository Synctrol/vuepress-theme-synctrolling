import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = (...parts) => join(root, 'dist', ...parts)

function read(path) {
  return readFileSync(path, 'utf8')
}

assert.ok(existsSync(dist('index.js')), 'dist/index.js must exist')
assert.ok(existsSync(dist('index.d.ts')), 'dist/index.d.ts must exist')
assert.ok(
  existsSync(dist('compiler', 'theme.js')),
  'dist/compiler/theme.js must exist',
)
assert.ok(
  existsSync(dist('client', 'index.js')),
  'dist/client/index.js must exist',
)
assert.ok(
  existsSync(dist('client', 'config.js')),
  'dist/client/config.js must exist',
)
assert.ok(
  existsSync(dist('client', 'layouts', 'Layout.vue')),
  'dist/client/layouts/Layout.vue must be copied',
)
assert.ok(
  existsSync(dist('client', 'styles', 'tokens.css')),
  'dist/client/styles/tokens.css must be copied',
)

const themeJs = read(dist('compiler', 'theme.js'))
assert.match(themeJs, /\.\.\/client\/config\.js|client\/config\.js/)
assert.doesNotMatch(themeJs, /client\/config\.ts/)

// Strip line comments so intentional "Forbidden: …Layout.vue / BackgroundSurface"
// documentation in the JS-only barrel does not false-positive the boundary check.
const clientJs = read(dist('client', 'index.js')).replace(/\/\/.*$/gm, '')
assert.doesNotMatch(clientJs, /Layout\.vue/)
assert.doesNotMatch(clientJs, /BackgroundSurface/)
assert.doesNotMatch(clientJs, /^\s*export\b[^;]*\.vue/m)

const tokensCss = read(dist('client', 'styles', 'tokens.css'))
assert.match(tokensCss, /--syn-font-display/)
assert.match(tokensCss, /Archivo Black/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
assert.equal(pkg.exports['./styles.css'], './dist/client/styles/tokens.css')

const copier = read(join(root, 'scripts', 'copy-client-assets.mjs'))
for (const ext of ['.vue', '.css', '.woff', '.woff2', '.ttf', '.otf']) {
  assert.match(copier, new RegExp(ext.replace('.', '\\.')))
}
assert.doesNotMatch(copier, /copy-package-assets/)

console.log('assert-build-artifacts: ok')
