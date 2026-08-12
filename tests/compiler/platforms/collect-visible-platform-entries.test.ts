import { describe, expect, it } from 'vitest'
import { collectVisiblePlatformEntries } from '../../../src/compiler/platforms/collect-visible-platform-entries'
import type {
  AlbumBook,
  CompiledContentPackage,
  GiftBook,
  RouteContentPackage,
} from '../../../src/shared/types'
import type { CompiledPage } from '../../../src/shared/route-types'

const platformTypes = {
  youtube: 'youtube_player',
  taobao: 'link',
}

const album: AlbumBook = {
  type: 'album',
  title: 'A',
  album: {
    links: [{ platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false }],
  },
}

const gift: GiftBook = {
  type: 'gift',
  title: 'G',
  gift: {
    items: [
      {
        id: 'poster',
        title: 'Poster',
        links: [{ platform: 'taobao', url: 'https://item.taobao.com/x' }],
      },
    ],
  },
}

function compiled(
  identity: string,
  dir: string,
  book: AlbumBook | GiftBook,
): CompiledContentPackage {
  return {
    dir,
    identity,
    manifest: {
      type: 'release',
      slug: identity.split(':')[1]!,
      date: '2024-01-01',
      draft: false,
    },
    book,
  }
}

function routed(identity: string, dir: string, slug: string): RouteContentPackage {
  return {
    identity,
    dir,
    type: 'release',
    slug,
    draft: false,
    tags: [],
    locales: {},
  }
}

function page(identity: `release:${string}`, packagePath: string): CompiledPage {
  return {
    identity,
    locale: 'zh',
    contentType: 'release',
    url: {
      routePath: `/zh/releases/${identity.split(':')[1]}/`,
      outputPath: `zh/releases/${identity.split(':')[1]}/index.html`,
      publicPath: `/zh/releases/${identity.split(':')[1]}/`,
      absoluteUrl: `https://example.com/zh/releases/${identity.split(':')[1]}/`,
    },
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: 'zh',
    canonicalLocale: 'zh',
    packagePath,
    slug: identity.split(':')[1],
    title: 'T',
  }
}

describe('collectVisiblePlatformEntries', () => {
  it('collects album.links and gift item links only for packages with published pages', () => {
    const published = compiled('release:live', '/pkg/live', album)
    const draft = compiled('release:draft', '/pkg/draft', gift)
    const pages: CompiledPage[] = [page('release:live', '/pkg/live')]
    const packages: RouteContentPackage[] = [
      routed('release:live', '/pkg/live', 'live'),
      routed('release:draft', '/pkg/draft', 'draft'),
    ]

    const items = collectVisiblePlatformEntries({
      compiledPackages: [published, draft],
      packages,
      pages,
      platformTypes,
    })
    expect(items).toEqual([
      {
        type: 'youtube_player',
        entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
      },
    ])
    expect(items.some((i) => i.type === 'link')).toBe(false)
  })

  it('returns empty when no pages publish any package', () => {
    const onlyDraft = compiled('release:draft', '/pkg/draft', album)
    expect(
      collectVisiblePlatformEntries({
        compiledPackages: [onlyDraft],
        packages: [routed('release:draft', '/pkg/draft', 'draft')],
        pages: [],
        platformTypes,
      }),
    ).toEqual([])
  })
})
