import { existsSync, readdirSync, readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
import { compileAssets } from '../../../src/compiler/assets/compile-assets'
import { hashFileContents } from '../../../src/compiler/assets/hash'
import { themeOptions } from '../../helpers/asset-fixtures'
import type { AssetPackageSource } from '../../../src/shared/asset-types'

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/assets/compile',
)

function packages(): AssetPackageSource[] {
  const homeDir = join(fixtureRoot, 'content/home')
  const releaseDir = join(fixtureRoot, 'content/releases/first-release')
  return [
    {
      packageDir: homeDir,
      type: 'home',
      slug: null,
      declaredPaths: [],
      localeMarkdown: [
        {
          filePath: join(homeDir, 'zh.md'),
          body: readFileSync(join(homeDir, 'zh.md'), 'utf8'),
        },
      ],
    },
    {
      packageDir: releaseDir,
      type: 'release',
      slug: 'first-release',
      declaredPaths: ['./assets/cover.webp'],
      localeMarkdown: [
        {
          filePath: join(releaseDir, 'zh.md'),
          body: readFileSync(join(releaseDir, 'zh.md'), 'utf8'),
        },
      ],
    },
  ]
}

describe('compileAssets', () => {
  it('hashes content, global, and theme assets and writes them under dest', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-'))
    const manifest = compileAssets({
      packages: packages(),
      themeOptions: themeOptions(),
      configDir: join(fixtureRoot, '.vuepress'),
      themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
      themeAssetPaths: ['./grid.svg'],
      base: '/docs/',
      destDir,
    })

    const releaseCover = manifest.assets.find((asset) =>
      asset.sourcePath.endsWith('first-release/assets/cover.webp'),
    )
    expect(releaseCover?.kind).toBe('content')
    expect(releaseCover?.assetPath).toMatch(
      /^\/assets\/content\/release\/first-release\/cover\.[0-9a-f]{8}\.webp$/,
    )
    expect(releaseCover?.publicPath.startsWith('/docs/assets/content/')).toBe(
      true,
    )
    expect(releaseCover?.absoluteUrl.startsWith('https://synctrol.com/docs/')).toBe(
      true,
    )
    expect(
      existsSync(join(destDir, releaseCover!.assetPath.slice(1))),
    ).toBe(true)

    const homeBody = manifest.contentPublicPaths.home['./assets/body.webp']
    expect(homeBody).toMatch(/^\/docs\/assets\/content\/home\/body\.[0-9a-f]{8}\.webp$/)

    expect(manifest.globalPublicPaths['./assets/logo.svg']).toMatch(
      /^\/docs\/assets\/global\/logo\.[0-9a-f]{8}\.svg$/,
    )

    const themeGrid = manifest.assets.find((asset) =>
      asset.sourcePath.endsWith('theme-assets/grid.svg'),
    )
    expect(themeGrid?.assetPath).toMatch(/^\/assets\/theme\/grid\.[0-9a-f]{8}\.svg$/)

    expect(
      manifest.assets.some((asset) =>
        asset.sourcePath.includes(`${join('.vuepress', 'public')}`),
      ),
    ).toBe(false)
    expect(existsSync(join(destDir, 'CNAME'))).toBe(false)
  })

  it('does not hash root-absolute global option refs', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-abs-'))
    const manifest = compileAssets({
      packages: [],
      themeOptions: themeOptions({
        seo: {
          name: 'Synctrol',
          description: 'd',
          defaultImage: '/images/og.png',
          organization: { name: 'Synctrol', logo: '/images/logo.png' },
          collections: {
            release: { title: 'R', description: 'r' },
            news: { title: 'N', description: 'n' },
          },
        },
        socialLinks: { items: [] },
        release: {
          urlSegment: 'releases',
          index: {
            enabled: true,
            pagination: 12,
                                  },
        },
      }),
      configDir: join(fixtureRoot, '.vuepress'),
      themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
      themeAssetPaths: [],
      base: '/',
      destDir,
    })
    expect(Object.keys(manifest.globalPublicPaths)).toEqual([])
    expect(manifest.assets.filter((a) => a.kind === 'global')).toEqual([])
  })

  it('fails when Markdown contains raw HTML relative assets', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-bad-'))
    const homeDir = join(fixtureRoot, 'content/home')
    try {
      compileAssets({
        packages: [
          {
            packageDir: homeDir,
            type: 'home',
            slug: null,
            declaredPaths: [],
            localeMarkdown: [
              {
                filePath: join(homeDir, 'zh.md'),
                body: '<img src="./assets/body.webp" alt="x">',
              },
            ],
          },
        ],
        themeOptions: themeOptions(),
        configDir: join(fixtureRoot, '.vuepress'),
        themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
        themeAssetPaths: [],
        base: '/',
        destDir,
      })
      expect.unreachable('expected raw html failure')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_RAW_HTML_RELATIVE')
      }
    }
  })

  it('rejects .vuepress/public refs before hashing or copying into dest', () => {
    const destDir = mkdtempSync(join(tmpdir(), 'synctrol-assets-public-'))
    const publicCname = join(fixtureRoot, '.vuepress/public/CNAME')
    const pollutedName = `CNAME.${hashFileContents(readFileSync(publicCname))}`

    try {
      compileAssets({
        packages: [],
        themeOptions: themeOptions({
          seo: {
            name: 'Synctrol',
            description: 'd',
            defaultImage: './public/CNAME',
            organization: { name: 'Synctrol', logo: '/images/logo.png' },
            collections: {
              release: { title: 'R', description: 'r' },
              news: { title: 'N', description: 'n' },
            },
          },
          socialLinks: { items: [] },
          release: {
            urlSegment: 'releases',
            index: {
              enabled: true,
              pagination: 12,
                                        },
          },
        }),
        configDir: join(fixtureRoot, '.vuepress'),
        themeAssetsRoot: join(fixtureRoot, 'theme-assets'),
        themeAssetPaths: [],
        base: '/',
        destDir,
      })
      expect.unreachable('expected .vuepress/public rejection')
    } catch (error) {
      expect(String(error)).toMatch(
        /\.vuepress\/public|must not enter the hashed asset pipeline/i,
      )
    }

    expect(existsSync(join(destDir, 'assets/global', pollutedName))).toBe(false)
    const written = existsSync(destDir)
      ? readdirSync(destDir, { recursive: true }).map(String)
      : []
    expect(written.some((entry) => entry.includes('CNAME'))).toBe(false)
  })
})
