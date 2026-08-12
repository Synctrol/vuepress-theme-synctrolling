import { execFileSync } from 'node:child_process'

const required = [
  'package.json',
  'LICENSE',
  'README.md',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/client/index.js',
  'dist/client/config.js',
  'dist/client/layouts/Layout.vue',
  'dist/client/styles/tokens.css',
]

const forbiddenPrefixes = [
  'tests/',
  'docs/',
  'src/',
  '.github/',
  'scripts/',
  '.superpowers/',
]

const forbiddenNames = ['vitest.config.ts', 'tsconfig.json', 'tsconfig.test.json']

function listPackFiles() {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf8',
  })
  const parsed = JSON.parse(out)
  if (!Array.isArray(parsed) || !parsed[0]?.files) {
    throw new Error('assert-pack-contents: unexpected npm pack --json shape')
  }
  return parsed[0].files.map((file) => file.path).sort()
}

const files = listPackFiles()
const missing = required.filter((path) => !files.includes(path))
if (missing.length > 0) {
  console.error('assert-pack-contents: missing required files:\n' + missing.join('\n'))
  process.exit(1)
}

const leaks = files.filter(
  (path) =>
    forbiddenPrefixes.some((prefix) => path.startsWith(prefix)) ||
    forbiddenNames.includes(path) ||
    path.endsWith('.tgz'),
)
if (leaks.length > 0) {
  console.error('assert-pack-contents: forbidden paths in pack:\n' + leaks.join('\n'))
  process.exit(1)
}

console.log(`assert-pack-contents: ok (${files.length} files)`)
