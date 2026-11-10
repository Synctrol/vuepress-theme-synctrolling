import { describe, expect, it } from 'vitest'
import { buildAlbumJsonLd, buildArticleJsonLd, buildPageJsonLd, secondsToIsoDuration } from '../../../src/compiler/seo/json-ld.js'
import type { CompiledAlbumMetadata } from '../../../src/shared/release/types.js'
import { page, resolvedOptions, seoContentContext, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()
const album: CompiledAlbumMetadata = {
  title: { zh: '第一张专辑', en: 'First Album' },
  covers: [],
  discs: [{ title: 'Disc', tracks: [{ title: { zh: '曲', en: 'Track' }, artists: ['Synctrol'], duration: 120 }] }],
}

describe('json-ld builders', () => {
  it('formats durations and article schema', () => {
    expect(secondsToIsoDuration(120)).toBe('PT2M')
    expect(buildArticleJsonLd({ headline: 'Launch', description: 'Summary', canonicalUrl: 'https://synctrol.com/en/article/launch/', image: 'https://synctrol.com/og.webp', datePublished: '2026-08-11', dateModified: '2026-08-12', organizationName: 'Synctrol' })).toMatchObject({ '@type': 'Article', headline: 'Launch', dateModified: '2026-08-12' })
  })

  it('builds album recordings from compiled album metadata', () => {
    expect(buildAlbumJsonLd({ album, locale: 'en', mainLocale: 'zh', pageUrl: 'https://synctrol.com/en/releases/first/' }).map((node) => node['@type'])).toEqual(['MusicAlbum', 'MusicRecording'])
    const releaseNodes = buildPageJsonLd(page({ identity: 'release:first', locale: 'en', contentType: 'release', packagePath: '/site/content/releases/first', url: url('https://synctrol.com/en/releases/first/') }), options, seoContentContext({ albumByPackagePath: new Map([['/site/content/releases/first', album]]) }), { title: 'First Album', description: 'Desc', canonicalUrl: 'https://synctrol.com/en/releases/first/', image: 'https://synctrol.com/og.webp' })
    expect(releaseNodes.map((node) => node['@type'])).toEqual(['MusicAlbum', 'MusicRecording'])
  })

  it('omits album-level byArtist now that book authors are retired', () => {
    const nodes = buildAlbumJsonLd({ album, locale: 'en', mainLocale: 'zh', pageUrl: 'https://synctrol.com/en/releases/first/' })
    expect(nodes[0]).not.toHaveProperty('byArtist')
    expect(nodes[0]).toMatchObject({ '@type': 'MusicAlbum', name: 'First Album' })
  })

  it('builds home site graph and news article graph', () => {
    const homeNodes = buildPageJsonLd(page({ identity: 'home', locale: 'en', contentType: 'home', url: url('https://synctrol.com/en/'), title: 'Home' }), options, seoContentContext(), { title: 'Home', description: 'Home desc', canonicalUrl: 'https://synctrol.com/en/', image: 'https://synctrol.com/og.webp' })
    expect(homeNodes.map((node) => node['@type'])).toEqual(['Organization', 'WebSite'])

    const newsNodes = buildPageJsonLd(page({ identity: 'news:launch', locale: 'en', contentType: 'news', packagePath: '/site/content/news/launch', url: url('https://synctrol.com/en/article/launch/'), title: 'Launch' }), options, seoContentContext({ dateByPackagePath: new Map([['/site/content/news/launch', '2026-08-11']]) }), { title: 'Launch', description: 'Summary', canonicalUrl: 'https://synctrol.com/en/article/launch/', image: 'https://synctrol.com/og.webp' })
    expect(newsNodes.map((node) => node['@type'])).toEqual(['Article'])
  })
})
