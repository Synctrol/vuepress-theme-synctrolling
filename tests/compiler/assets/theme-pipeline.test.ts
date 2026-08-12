import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { hashFileContents } from '../../../src/compiler/assets/hash'
import {
  buildThemeAssetPath,
  resolveThemeAsset,
} from '../../../src/compiler/assets/theme-pipeline'

const themeAssetsRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/assets/theme-assets',
)

describe('buildThemeAssetPath', () => {
  it('emits /assets/theme with hash and retained nesting', () => {
    expect(buildThemeAssetPath('textures/noise.png', 'abcd1234')).toBe(
      '/assets/theme/textures/noise.abcd1234.png',
    )
  })
})

describe('resolveThemeAsset', () => {
  it('resolves an explicit theme static file', () => {
    const sourcePath = join(themeAssetsRoot, 'grid.svg')
    const hash = hashFileContents(readFileSync(sourcePath))
    const resolved = resolveThemeAsset({
      themeAssetsRoot,
      relativeRef: './grid.svg',
      base: '/',
      siteUrl: 'https://synctrol.com',
    })
    expect(resolved).toEqual({
      kind: 'theme',
      sourcePath,
      contentHash: hash,
      assetPath: `/assets/theme/grid.${hash}.svg`,
      publicPath: `/assets/theme/grid.${hash}.svg`,
      absoluteUrl: `https://synctrol.com/assets/theme/grid.${hash}.svg`,
    })
  })

  it('applies VuePress base to theme public URLs', () => {
    const resolved = resolveThemeAsset({
      themeAssetsRoot,
      relativeRef: './textures/noise.png',
      base: '/site/',
      siteUrl: 'https://example.com',
    })
    expect(resolved.publicPath.startsWith('/site/assets/theme/textures/')).toBe(
      true,
    )
    expect(resolved.absoluteUrl.startsWith('https://example.com/site/assets/theme/')).toBe(
      true,
    )
  })

  it('computes relative keys from realpath of a symlink themeAssetsRoot', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'theme-assets-symlink-'))
    const linkRoot = join(tmp, 'link-root')
    symlinkSync(realpathSync(themeAssetsRoot), linkRoot)
    try {
      const hash = hashFileContents(
        readFileSync(join(themeAssetsRoot, 'grid.svg')),
      )
      const resolved = resolveThemeAsset({
        themeAssetsRoot: linkRoot,
        relativeRef: './grid.svg',
        base: '/',
        siteUrl: 'https://synctrol.com',
      })
      expect(resolved.assetPath).toBe(`/assets/theme/grid.${hash}.svg`)
      expect(resolved.assetPath).not.toContain('..')
      expect(resolved.sourcePath).toBe(
        realpathSync(join(themeAssetsRoot, 'grid.svg')),
      )
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
