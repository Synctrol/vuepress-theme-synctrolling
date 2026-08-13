import type { AlbumBook, GiftBook, LocaleKey } from '../../src/shared/types'
import type { CompiledPage } from '../../src/shared/route-types'
import type { ResolvedAsset } from '../../src/shared/asset-types'
import { enMessages, zhMessages } from '../../src/shared/messages'

export { enMessages, zhMessages }

export function asset(
  publicPath: string,
  sourcePath = publicPath,
): ResolvedAsset {
  const assetPath = publicPath.startsWith('/assets/')
    ? publicPath
    : `/assets${publicPath}`
  return {
    kind: 'content',
    sourcePath,
    assetPath,
    publicPath,
    absoluteUrl: `https://synctrol.com${publicPath}`,
    contentHash: 'testhash',
  }
}

export function albumBook(overrides: Partial<AlbumBook> = {}): AlbumBook {
  return {
    title: { zh: '第一张专辑', en: 'First Album' },
    copyright: '© 2026 Synctrol',
    album: {
      covers: ['./assets/front.webp', './assets/back.webp'],
      links: [
        {
          platform: 'bilibili',
          bvid: 'BV1xxxxxxxxx',
          page: 1,
          autoplay: false,
        },
      ],
      discs: [
        {
          title: { zh: '第一碟', en: 'Disc One' },
          tracks: [
            {
              title: { zh: '第一曲', en: 'Track One' },
              artists: ['Synctrol'],
              duration: 272,
            },
            {
              title: { zh: '第二曲', en: 'Track Two' },
              artists: ['Synctrol'],
              duration: 61,
            },
          ],
        },
      ],
      ...overrides.album,
    },
    ...overrides,
    type: 'album',
  }
}

export function giftBook(overrides: Partial<GiftBook> = {}): GiftBook {
  return {
    title: { zh: '周边系列', en: 'Merchandise' },
    gift: {
      items: [
        {
          id: 'poster',
          title: { zh: '纪念海报', en: 'Commemorative Poster' },
          covers: ['./assets/poster-front.webp'],
          links: [
            {
              platform: 'taobao',
              url: 'https://item.taobao.com/example',
            },
          ],
        },
      ],
      ...overrides.gift,
    },
    ...overrides,
    type: 'gift',
  }
}

export function releaseDetailPage(
  overrides: Partial<CompiledPage> = {},
): CompiledPage {
  return {
    identity: 'release:first-release',
    locale: 'zh',
    contentType: 'release',
    url: {
      routePath: '/zh/releases/first-release/',
      outputPath: 'zh/releases/first-release/index.html',
      publicPath: '/zh/releases/first-release/',
      absoluteUrl: 'https://synctrol.com/zh/releases/first-release/',
    },
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: 'zh',
    canonicalLocale: 'zh',
    packagePath: 'content/releases/first-release',
    slug: 'first-release',
    title: '第一张专辑',
    description: '简介',
    ...overrides,
  }
}

export function releaseCollectionPage(
  overrides: Partial<CompiledPage> & {
    collection: NonNullable<CompiledPage['collection']>
  },
): CompiledPage {
  return {
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
    title: '作品',
    ...overrides,
  }
}

export function messageFor(locale: LocaleKey) {
  return locale === 'en' ? enMessages : zhMessages
}
