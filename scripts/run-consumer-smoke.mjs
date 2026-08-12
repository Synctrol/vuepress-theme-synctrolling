import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = process.cwd()
const fixture = resolve(root, 'tests/fixtures/sites/consumer-smoke')

assert.ok(
  existsSync(resolve(root, 'dist/index.js')),
  'dist/index.js missing; run npm run build before npm run test:consumer-smoke',
)

const packOut = execFileSync('npm', ['pack', '--json'], {
  cwd: root,
  encoding: 'utf8',
})
const tarballName = JSON.parse(packOut)[0].filename
const tarballPath = resolve(root, tarballName)
const work = mkdtempSync(join(tmpdir(), 'synctrol-consumer-'))

try {
  cpSync(fixture, work, { recursive: true })
  const pkgPath = join(work, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  pkg.devDependencies['vuepress-theme-synctrolling'] = `file:${tarballPath}`
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  execFileSync('npm', ['install'], { cwd: work, stdio: 'inherit' })
  execFileSync('npx', ['vuepress', 'build', '.'], {
    cwd: work,
    stdio: 'inherit',
  })

  const dest = join(work, '.vuepress', 'dist')
  for (const path of [
    'index.html',
    'zh/index.html',
    'en/index.html',
    'zh/releases/demo/index.html',
    'en/news/hello/index.html',
    'zh/about/index.html',
    'sitemap.xml',
    'zh/rss.xml',
    'en/rss.xml',
  ]) {
    assert.ok(existsSync(join(dest, path)), `missing built output ${path}`)
  }

  const rootHtml = readFileSync(join(dest, 'index.html'), 'utf8')
  assert.match(rootHtml, /location\.replace/)
  assert.match(rootHtml, /href="\/zh\/"/)
  assert.match(rootHtml, /href="\/en\/"/)

  const zhHome = readFileSync(join(dest, 'zh/index.html'), 'utf8')
  assert.match(zhHome, /SYNCTROL/)
  assert.match(zhHome, /lang="zh-CN"|<html[^>]+lang="zh-CN"/)

  const enRelease = readFileSync(join(dest, 'en/releases/demo/index.html'), 'utf8')
  assert.match(enRelease, /Demo Release/)
  assert.match(enRelease, /canonical|og:title/)

  console.log('run-consumer-smoke: ok')
} finally {
  rmSync(work, { recursive: true, force: true })
  rmSync(tarballPath, { force: true })
}
