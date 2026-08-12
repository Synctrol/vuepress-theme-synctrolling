import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildRoutePackages,
  toRoutePackage,
} from '../../src/compiler/route-packages'
import type { CompiledContentPackage } from '../../src/shared/types'

describe('toRoutePackage', () => {
  it('flattens a news manifest into route input', () => {
    const pkg: CompiledContentPackage = {
      dir: '/content/news/launch',
      identity: 'news:launch',
      manifest: {
        type: 'news',
        slug: 'launch',
        date: '2026-08-10',
        updated: '2026-08-11',
        draft: false,
        tags: ['release'],
        cover: './assets/cover.jpg',
        path: { zh: '/custom/launch/' },
      },
    }

    expect(toRoutePackage(pkg, {})).toEqual({
      dir: '/content/news/launch',
      identity: 'news:launch',
      type: 'news',
      slug: 'launch',
      date: '2026-08-10',
      updated: '2026-08-11',
      draft: false,
      tags: ['release'],
      cover: './assets/cover.jpg',
      path: { zh: '/custom/launch/' },
      locales: {},
    })
  })

  it('maps home to a null slug, empty tags, and no date', () => {
    const routePackage = toRoutePackage(
      {
        dir: '/content/home',
        identity: 'home',
        manifest: { type: 'home', draft: true },
      },
      {},
    )

    expect(routePackage.slug).toBeNull()
    expect(routePackage.tags).toEqual([])
    expect(routePackage).not.toHaveProperty('date')
    expect(routePackage).not.toHaveProperty('path')
    expect(routePackage.draft).toBe(true)
  })

  it('copies tags so later mutation cannot reach the manifest', () => {
    const manifestTags = ['release']
    const routePackage = toRoutePackage(
      {
        dir: '/content/news/a',
        identity: 'news:a',
        manifest: {
          type: 'news',
          slug: 'a',
          date: '2026-08-10',
          draft: false,
          tags: manifestTags,
        },
      },
      {},
    )

    routePackage.tags.push('extra')
    expect(manifestTags).toEqual(['release'])
  })
})

describe('buildRoutePackages', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'synctrol-routepkg-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('attaches locale markdown read from each package directory', () => {
    const dir = join(root, 'releases', 'first-release')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'zh.md'), '---\ntitle: 第一张专辑\n---\n正文\n', 'utf8')

    const [routePackage] = buildRoutePackages({
      packages: [
        {
          dir,
          identity: 'release:first-release',
          manifest: {
            type: 'release',
            slug: 'first-release',
            date: '2026-08-11',
            draft: false,
          },
        },
      ],
      localeKeys: ['zh', 'en'],
    })

    expect(routePackage?.locales.zh?.title).toBe('第一张专辑')
    expect(routePackage?.locales.en).toBeUndefined()
  })
})
