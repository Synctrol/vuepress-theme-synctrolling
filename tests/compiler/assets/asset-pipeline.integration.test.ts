import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
import {
  collectPackageDeclaredPaths,
  compileAssets,
  createResolveContentAsset,
  themeOptions,
  toAssetPackageSource,
} from '../../helpers/asset-fixtures'
import type { CompiledContentPackage, RouteContentPackage } from '../../../src/shared/types'

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/assets/compile',
)

describe('asset pipeline integration', () => {
  it('keeps assets locale-free while applying base and siteUrl', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-int-'))
    const homeDir = join(fixtureRoot, 'content/home')
    const releaseDir = join(fixtureRoot, 'content/releases/first-release')

    const homeCompiled: CompiledContentPackage = {
      dir: homeDir,
      identity: 'home',
      manifest: { type: 'home', draft: false },
    }
    const homeRouted: RouteContentPackage = {
      dir: homeDir,
      identity: 'home',
      type: 'home',
      slug: null,
      draft: false,
      tags: [],
      locales: {
        zh: {
          filePath: join(homeDir, 'zh.md'),
          title: 'Home',
          draft: false,
          body: readFileSync(join(homeDir, 'zh.md'), 'utf8'),
        },
      },
    }
    const releaseCompiled: CompiledContentPackage = {
      dir: releaseDir,
      identity: 'release:first-release',
      manifest: {
        type: 'release',
        slug: 'first-release',
        date: '2026-08-11',
        draft: false,
        cover: './assets/cover.webp',
      },
    }
    const releaseRouted: RouteContentPackage = {
      dir: releaseDir,
      identity: 'release:first-release',
      type: 'release',
      slug: 'first-release',
      date: '2026-08-11',
      draft: false,
      tags: [],
      cover: './assets/cover.webp',
      locales: {
        zh: {
          filePath: join(releaseDir, 'zh.md'),
          title: 'First',
          draft: false,
          body: readFileSync(join(releaseDir, 'zh.md'), 'utf8'),
        },
      },
    }

    // Helper wiring: declared-path collector feeds toAssetPackageSource → compileAssets
    expect(collectPackageDeclaredPaths(homeCompiled)).toEqual([])
    expect(collectPackageDeclaredPaths(releaseCompiled)).toEqual([
      './assets/cover.webp',
    ])

    const manifest = compileAssets({
      packages: [
        toAssetPackageSource(homeCompiled, homeRouted),
        toAssetPackageSource(releaseCompiled, releaseRouted),
      ],
      themeOptions: themeOptions(),
      configDir: join(fixtureRoot, '.vuepress'),
      themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
      themeAssetPaths: ['./grid.svg'],
      base: '/docs/',
      destDir,
    })

    for (const asset of manifest.assets) {
      expect(asset.assetPath.startsWith('/assets/')).toBe(true)
      expect(asset.assetPath).not.toMatch(/\/zh\//)
      expect(asset.assetPath).not.toMatch(/\/en\//)
      expect(asset.publicPath.startsWith('/docs/assets/')).toBe(true)
      expect(asset.absoluteUrl.startsWith('https://synctrol.com/docs/assets/')).toBe(
        true,
      )
      expect(asset.assetPath).toMatch(/\.[0-9a-f]{8}\.[a-z0-9]+$/i)
    }

    const homeMap = manifest.contentPublicPaths.home
    const resolveContentAsset = createResolveContentAsset(homeMap)
    expect(resolveContentAsset('./assets/body.webp')).toMatch(
      /^\/docs\/assets\/content\/home\/body\.[0-9a-f]{8}\.webp$/,
    )

    expect(
      manifest.assets.some((asset) =>
        asset.assetPath.startsWith('/assets/content/home/'),
      ),
    ).toBe(true)
    expect(
      manifest.assets.some((asset) =>
        asset.assetPath.startsWith(
          '/assets/content/release/first-release/',
        ),
      ),
    ).toBe(true)
  })

  it('fails the build on missing content assets', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-missing-'))
    const homeDir = join(fixtureRoot, 'content/home')
    try {
      compileAssets({
        packages: [
          {
            packageDir: homeDir,
            type: 'home',
            slug: null,
            declaredPaths: ['./assets/does-not-exist.webp'],
            localeMarkdown: [],
          },
        ],
        themeOptions: themeOptions(),
        configDir: join(fixtureRoot, '.vuepress'),
        themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
        themeAssetPaths: [],
        base: '/',
        destDir,
      })
      expect.unreachable('expected missing asset failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(
          ['ASSET_MISSING', 'ASSET_CASE_MISMATCH'].includes(
            error.diagnostics[0]?.code ?? '',
          ),
        ).toBe(true)
      }
    }
  })

  it('fails the build on package path escape attempts', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-escape-'))
    const homeDir = join(fixtureRoot, 'content/home')
    try {
      compileAssets({
        packages: [
          {
            packageDir: homeDir,
            type: 'home',
            slug: null,
            declaredPaths: ['./assets/../../.vuepress/assets/logo.svg'],
            localeMarkdown: [],
          },
        ],
        themeOptions: themeOptions(),
        configDir: join(fixtureRoot, '.vuepress'),
        themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
        themeAssetPaths: [],
        base: '/',
        destDir,
      })
      expect.unreachable('expected escape failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_PATH_ESCAPE')
      }
    }
  })

  it('does not provide a stable-URL mode and always content-hashes', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-hash-'))
    const releaseDir = join(fixtureRoot, 'content/releases/first-release')
    const manifest = compileAssets({
      packages: [
        {
          packageDir: releaseDir,
          type: 'release',
          slug: 'first-release',
          declaredPaths: ['./assets/cover.webp'],
          localeMarkdown: [],
        },
      ],
      themeOptions: themeOptions(),
      configDir: join(fixtureRoot, '.vuepress'),
      themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
      themeAssetPaths: [],
      base: '/',
      destDir,
    })
    const cover = manifest.assets.find((asset) =>
      asset.sourcePath.endsWith('cover.webp'),
    )
    expect(cover?.assetPath).toMatch(
      /\/assets\/content\/release\/first-release\/cover\.[0-9a-f]{8}\.webp$/,
    )
    expect(cover?.assetPath).not.toBe(
      '/assets/content/release/first-release/cover.webp',
    )
  })
})
