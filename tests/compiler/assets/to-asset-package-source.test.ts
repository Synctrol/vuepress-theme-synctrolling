import { describe, expect, it } from 'vitest'
import { toAssetPackageSource } from '../../../src/compiler/assets/to-asset-package-source'
import type {
  CompiledContentPackage,
  RouteContentPackage,
} from '../../../src/shared/types'

describe('toAssetPackageSource', () => {
  it('joins compiled + routed packages by dir/identity', () => {
    const compiled: CompiledContentPackage = {
      dir: '/content/releases/first-release',
      identity: 'release:first-release',
      manifest: {
        type: 'release',
        slug: 'first-release',
        date: '2026-08-11',
        draft: false,
        cover: './assets/cover.webp',
      },
      book: {
        type: 'album',
        title: 'A',
        album: { covers: ['./assets/front.webp'] },
      },
    }
    const routed: RouteContentPackage = {
      dir: '/content/releases/first-release',
      identity: 'release:first-release',
      type: 'release',
      slug: 'first-release',
      date: '2026-08-11',
      draft: false,
      tags: [],
      cover: './assets/cover.webp',
      locales: {
        zh: {
          filePath: '/content/releases/first-release/zh.md',
          title: 'First',
          draft: false,
          body: '![Art](./assets/nested/art.webp)',
        },
      },
    }
    const source = toAssetPackageSource(compiled, routed)
    expect(source.packageDir).toBe(compiled.dir)
    expect(source.type).toBe('release')
    expect(source.slug).toBe('first-release')
    expect(source.declaredPaths).toEqual([
      './assets/cover.webp',
      './assets/front.webp',
    ])
    expect(source.localeMarkdown).toEqual([
      {
        filePath: '/content/releases/first-release/zh.md',
        body: '![Art](./assets/nested/art.webp)',
      },
    ])
  })

  it('throws when dir or identity do not match', () => {
    const compiled: CompiledContentPackage = {
      dir: '/a',
      identity: 'home',
      manifest: { type: 'home', draft: false },
    }
    const routed: RouteContentPackage = {
      dir: '/b',
      identity: 'home',
      type: 'home',
      slug: null,
      draft: false,
      tags: [],
      locales: {},
    }
    expect(() => toAssetPackageSource(compiled, routed)).toThrow(/dir|identity/i)
  })

  it('filters undefined Partial locale slots before mapping filePath/body', () => {
    const compiled: CompiledContentPackage = {
      dir: '/content/home',
      identity: 'home',
      manifest: { type: 'home', draft: false },
    }
    const routed: RouteContentPackage = {
      dir: '/content/home',
      identity: 'home',
      type: 'home',
      slug: null,
      draft: false,
      tags: [],
      locales: {
        zh: {
          filePath: '/content/home/zh.md',
          title: '首页',
          draft: false,
          body: '正文',
        },
        en: undefined,
      },
    }
    const source = toAssetPackageSource(compiled, routed)
    expect(source.localeMarkdown).toEqual([
      { filePath: '/content/home/zh.md', body: '正文' },
    ])
  })
})
