import { describe, expect, it } from 'vitest'
import {
  resolveArtworkPlaceholder,
} from '../../../src/compiler/release/resolve-release-assets'
import { buildReleaseIndexModel } from '../../../src/compiler/release/list-model'
import { asset, releaseDetailPage } from '../../helpers/release-fixtures'
import type { AssetManifest } from '../../../src/shared/asset-types'
import type { CompiledPage } from '../../../src/shared/route-types'
import type { RouteContentPackage } from '../../../src/shared/types'

const emptyManifest = (): AssetManifest => ({
  assets: [],
  bySourcePath: {},
  contentPublicPaths: {},
  globalPublicPaths: {},
})

describe('resolveArtworkPlaceholder', () => {
  it('preserves root-absolute placeholders via resolvedFromPublicPath', () => {
    const resolved = resolveArtworkPlaceholder(
      emptyManifest(),
      '/images/placeholder.svg',
    )
    expect(resolved).toMatchObject({
      publicPath: '/images/placeholder.svg',
      absoluteUrl: '/images/placeholder.svg',
    })
  })

  it('preserves http(s) placeholders via resolvedFromPublicPath', () => {
    const resolved = resolveArtworkPlaceholder(
      emptyManifest(),
      'https://cdn.example.com/placeholder.webp',
    )
    expect(resolved?.publicPath).toBe(
      'https://cdn.example.com/placeholder.webp',
    )
  })

  it('looks up config-relative placeholders in globalPublicPaths', () => {
    const hashed = '/assets/global/placeholder.hash.webp'
    const manifest: AssetManifest = {
      ...emptyManifest(),
      globalPublicPaths: {
        './assets/placeholder.webp': hashed,
      },
      assets: [asset(hashed)],
    }
    const resolved = resolveArtworkPlaceholder(
      manifest,
      './assets/placeholder.webp',
    )
    expect(resolved?.publicPath).toBe(hashed)
  })

  it('yields artworkKind placeholder with absolute publicPath on index tiles', () => {
    const absolute = '/images/placeholder.svg'
    const collectionPage: CompiledPage = {
      identity: 'release-index',
      locale: 'zh',
      contentType: 'release-collection',
      url: {
        routePath: '/zh/releases/',
        outputPath: 'zh/releases/index.html',
        publicPath: '/zh/releases/',
        absoluteUrl: 'https://synctrol.com/zh/releases/',
      },
      isFallback: false,
      isDraft: false,
      noindex: false,
      bodyLocale: 'zh',
      canonicalLocale: 'zh',
      title: 'release-index',
      collection: {
        page: 1,
        pageCount: 1,
        itemIdentities: ['release:a'] as never,
      },
    }
    const pkg: RouteContentPackage = {
      dir: '/content/releases/a',
      identity: 'release:a',
      type: 'release',
      slug: 'a',
      date: '2026-08-11',
      draft: false,
      tags: [],
      cover: './assets/a-cover.webp',
      locales: {},
    }
    const model = buildReleaseIndexModel({
      collectionPage,
      detailPages: [
        releaseDetailPage({ identity: 'release:a', slug: 'a', title: 'A' }),
      ],
      packages: [pkg],
      releaseOptions: {
        urlSegment: 'releases',
        artworkPlaceholder: absolute,
        index: {
          enabled: true,
          pagination: 12,
        },
      },
      resolveArtwork: () => undefined,
      resolvePlaceholder: () =>
        resolveArtworkPlaceholder(emptyManifest(), absolute),
      showDrafts: false,
    })
    expect(model!.tiles[0].artworkKind).toBe('placeholder')
    expect(model!.tiles[0].artwork?.publicPath).toBe(absolute)
  })
})
