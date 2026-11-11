import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { compileContent } from '../../src/compiler/compile-content'

const roots: string[] = []

function createSite(): {
  root: string
  contentRoot: string
  releaseDir: string
} {
  const root = mkdtempSync(join(tmpdir(), 'synctrol-release-markdown-'))
  roots.push(root)
  const contentRoot = join(root, 'content')
  const releaseDir = join(contentRoot, 'releases', 'demo')
  mkdirSync(join(contentRoot, 'home'), { recursive: true })
  mkdirSync(releaseDir, { recursive: true })
  writeFileSync(join(contentRoot, 'home', 'content.yml'), 'type: home\n')
  writeFileSync(
    join(releaseDir, 'content.yml'),
    'type: release\ndate: 2026-11-11\n',
  )
  return { root, contentRoot, releaseDir }
}

function compile(root: string, contentRoot: string) {
  return compileContent({
    contentRoot,
    sourceDir: root,
    configDir: join(root, '.vuepress'),
    mainLocale: 'zh',
    definitions: { tags: {} },
  })
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

describe('compileContent release Markdown', () => {
  it('parses each referenced album source once and validates Players', () => {
    const site = createSite()
    writeFileSync(
      join(site.releaseDir, 'album.yml'),
      [
        'title: Demo',
        'covers: []',
        'discs: []',
        '',
      ].join('\n'),
    )
    writeFileSync(
      join(site.releaseDir, 'zh.md'),
      [
        '---',
        'title: Demo',
        '---',
        '<AlbumIdentity src="./album.yml" />',
        '<AlbumTracklist src="./album.yml" />',
        '<Player type="netease_player" url="https://music.163.com/#/album?id=123" />',
        '',
      ].join('\n'),
    )

    const release = compile(site.root, site.contentRoot).packages.find(
      (pkg) => pkg.identity === 'release:demo',
    )

    expect(release?.albumBySrc).toEqual({
      './album.yml': {
        title: 'Demo',
        covers: [],
        discs: [],
      },
    })
    expect(release?.players).toEqual([
      {
        platform: 'netease_player',
        id: '123',
        resourceType: 'album',
      },
    ])
  })

  it('rejects album src paths that escape the content package', () => {
    const site = createSite()
    writeFileSync(
      join(site.releaseDir, 'zh.md'),
      '---\ntitle: Demo\n---\n<AlbumIdentity src="../album.yml" />\n',
    )

    expect(() => compile(site.root, site.contentRoot)).toThrow(
      /album src.*outside.*package/i,
    )
  })

  it('rejects book.yml before parsing it', () => {
    const site = createSite()
    writeFileSync(join(site.releaseDir, 'book.yml'), 'malformed: [\n')

    expect(() => compile(site.root, site.contentRoot)).toThrow(
      /book\.yml is no longer supported/,
    )
  })
})
