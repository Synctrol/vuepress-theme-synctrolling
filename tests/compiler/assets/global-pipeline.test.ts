import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { themeOptions } from '../../helpers/asset-fixtures'
import {
  buildGlobalAssetPath,
  collectGlobalOptionRefs,
  isConfigRelativeAssetRef,
  resolveGlobalAsset,
} from '../../../src/compiler/assets/global-pipeline'
import { hashFileContents } from '../../../src/compiler/assets/hash'

const configDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/assets/global/.vuepress',
)

describe('isConfigRelativeAssetRef', () => {
  it('accepts config-relative refs', () => {
    expect(isConfigRelativeAssetRef('./assets/logo.svg')).toBe(true)
    expect(isConfigRelativeAssetRef('assets/logo.svg')).toBe(true)
  })

  it('rejects root-absolute and remote URLs', () => {
    expect(isConfigRelativeAssetRef('/images/og.png')).toBe(false)
    expect(isConfigRelativeAssetRef('/i.png')).toBe(false)
    expect(isConfigRelativeAssetRef('https://cdn.example.com/a.webp')).toBe(false)
    expect(isConfigRelativeAssetRef('http://cdn.example.com/a.webp')).toBe(false)
  })

  it('rejects any http(s) scheme prefix, not only with //', () => {
    expect(isConfigRelativeAssetRef('https:cdn.example.com/a.webp')).toBe(false)
    expect(isConfigRelativeAssetRef('HTTP:foo')).toBe(false)
    expect(isConfigRelativeAssetRef('http:')).toBe(false)
  })
})

describe('collectGlobalOptionRefs', () => {
  it('collects social icons, artworkPlaceholder, defaultImage, and organization logo when config-relative', () => {
    expect(collectGlobalOptionRefs(themeOptions())).toEqual([
      './assets/github.svg',
      './assets/artwork-placeholder.svg',
      './assets/social-default.webp',
      './assets/logo.svg',
    ])
  })

  it('skips root-absolute and remote option refs without failing', () => {
    expect(
      collectGlobalOptionRefs(
        themeOptions({
          seo: {
            name: 'Synctrol',
            description: 'd',
            defaultImage: '/images/og.png',
            organization: { name: 'Synctrol', logo: 'https://cdn.example.com/logo.svg' },
            collections: {
              release: { title: 'R', description: 'r' },
              news: { title: 'N', description: 'n' },
            },
          },
          socialLinks: {
            items: [
              {
                label: { zh: 'X', en: 'X' },
                icon: '/icons/x.svg',
                url: 'https://example.com',
              },
            ],
          },
          release: {
            urlSegment: 'releases',
            index: {
              enabled: true,
              pagination: 12,
                                        },
            artworkPlaceholder: '/images/placeholder.svg',
          },
        }),
      ),
    ).toEqual([])
  })
})

describe('buildGlobalAssetPath', () => {
  it('emits /assets/global with retained nested path and hash', () => {
    expect(buildGlobalAssetPath('icons/nested.svg', 'abcd1234')).toBe(
      '/assets/global/icons/nested.abcd1234.svg',
    )
  })
})

describe('resolveGlobalAsset', () => {
  it('resolves config-relative refs into hashed global assets with base and siteUrl', () => {
    const sourcePath = join(configDir, 'assets/logo.svg')
    const buffer = readFileSync(sourcePath)
    const hash = hashFileContents(buffer)
    const resolved = resolveGlobalAsset({
      configDir,
      relativeRef: './assets/logo.svg',
      base: '/docs/',
      siteUrl: 'https://synctrol.com',
    })
    expect(resolved.kind).toBe('global')
    expect(resolved.sourcePath).toBe(sourcePath)
    expect(resolved.contentHash).toBe(hash)
    expect(resolved.assetPath).toBe(`/assets/global/logo.${hash}.svg`)
    expect(resolved.publicPath).toBe(`/docs/assets/global/logo.${hash}.svg`)
    expect(resolved.absoluteUrl).toBe(
      `https://synctrol.com/docs/assets/global/logo.${hash}.svg`,
    )
  })

  it('retains nesting under .vuepress/assets', () => {
    const resolved = resolveGlobalAsset({
      configDir,
      relativeRef: './assets/icons/nested.svg',
      base: '/',
      siteUrl: 'https://synctrol.com',
    })
    expect(resolved.assetPath).toMatch(
      /^\/assets\/global\/icons\/nested\.[0-9a-f]{8}\.svg$/,
    )
  })
})
