import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolvePlatformTypes } from '../../src/platforms/registry'
import { validatePlatformEntry } from '../../src/compiler/platform-entry'
import { collectVisiblePlatformEntries } from '../../src/compiler/platforms/collect-visible-platform-entries'
import { collectCspFromEntries } from '../../src/platforms/collect-csp'
import {
  assertNoCspMetaInjection,
  writeSynctrolCspJson,
} from '../../src/compiler/platforms/write-csp-artifact'
import type { AlbumBook, ContentDefinitions, GiftBook } from '../../src/shared/types'
import { resolveThemeOptions } from '../../src/shared/options'

const defs: ContentDefinitions = {
  tags: {},
  platforms: {
    bilibili: { category: 'digital', type: 'bilibili_player', name: 'Bilibili' },
    youtube: { category: 'digital', type: 'youtube_player', name: 'YouTube' },
    taobao: {
      category: 'physical',
      type: 'link',
      name: { zh: '淘宝', en: 'Taobao' },
    },
  },
}

describe('platform system integration', () => {
  it('validates flat entries, filters visibility, writes CSP artifact, never injects CSP meta', () => {
    const options = resolveThemeOptions({
      siteUrl: 'https://synctrol.com',
      mainLocale: 'zh',
      copyright: 'SYNCTROL',
      locales: {
        zh: { lang: 'zh-CN', label: '中文' },
        en: { lang: 'en-US', label: 'English' },
      },
      platforms: { loadStrategy: 'viewport', types: {} },
      seo: {
        name: 'Synctrol',
        description: { zh: '中文', en: 'English' },
        defaultImage: './assets/social-default.webp',
        organization: { name: 'Synctrol', logo: './assets/logo.svg' },
        collections: {
          release: {
            title: { zh: '作品', en: 'Releases' },
            description: { zh: '列表', en: 'List' },
          },
          news: {
            title: { zh: '新闻', en: 'News' },
            description: { zh: '新闻', en: 'News' },
          },
        },
      },
    })
    expect(options.platforms.loadStrategy).toBe('viewport')

    const types = resolvePlatformTypes(options.platforms.types)
    const albumLink = validatePlatformEntry(
      { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 1, autoplay: false },
      defs,
      'zh',
      '/content/releases/a/book.yml',
      'digital',
      types,
    )
    const giftLink = validatePlatformEntry(
      { platform: 'taobao', url: 'https://item.taobao.com/example' },
      defs,
      'zh',
      '/content/releases/a/book.yml',
      'physical',
      types,
    )

    const album: AlbumBook = {
      type: 'album',
      title: 'A',
      album: { links: [albumLink] },
    }
    const gift: GiftBook = {
      type: 'gift',
      title: 'G',
      gift: { items: [{ id: 'poster', title: 'P', links: [giftLink] }] },
    }

    const platformTypes = {
      bilibili: 'bilibili_player',
      taobao: 'link',
    }

    // Published album only — gift package has no pages → excluded from CSP.
    const collected = collectVisiblePlatformEntries({
      compiledPackages: [
        {
          dir: '/pkg/a',
          identity: 'release:a',
          manifest: { type: 'release', slug: 'a', title: 'A', date: '2024-01-01' } as never,
          book: album,
        },
        {
          dir: '/pkg/g',
          identity: 'release:g',
          manifest: { type: 'release', slug: 'g', title: 'G', date: '2024-01-01' } as never,
          book: gift,
        },
      ],
      packages: [
        { identity: 'release:a', dir: '/pkg/a', type: 'release', slug: 'a', locales: {} } as never,
        { identity: 'release:g', dir: '/pkg/g', type: 'release', slug: 'g', locales: {} } as never,
      ],
      pages: [
        { identity: 'release:a', packagePath: '/pkg/a', bodyLocale: 'zh' } as never,
      ],
      platformTypes,
    })
    const csp = collectCspFromEntries(collected, types)
    expect(csp['frame-src']).toContain('https://player.bilibili.com')
    expect(csp['frame-src']).not.toContain('https://item.taobao.com')

    const dest = mkdtempSync(join(tmpdir(), 'synctrol-platform-'))
    const artifact = writeSynctrolCspJson(dest, csp)
    expect(JSON.parse(readFileSync(artifact, 'utf8'))['frame-src']).toContain(
      'https://player.bilibili.com',
    )
    assertNoCspMetaInjection('<!doctype html><html><head></head><body></body></html>')
  })
})
