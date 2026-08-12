import { describe, expect, it } from 'vitest'
import type { Book, CompiledContentPackage } from '../../../src/shared/types'
import { collectPackageDeclaredPaths } from '../../../src/compiler/assets/collect-package-refs'

function releasePackage(): CompiledContentPackage {
  const book = {
    type: 'album',
    title: 'SYNCTROL',
    album: {
      covers: ['./assets/front.webp', './assets/back.webp'],
      links: [
        {
          platform: 'audio',
          src: './assets/preview.mp3',
        },
        {
          platform: 'audio',
          src: 'https://cdn.example.com/a.mp3',
        },
        {
          platform: 'bilibili',
          bvid: 'BV1xxxxxxxxx',
        },
      ],
    },
  } as Book

  return {
    dir: '/content/releases/first-release',
    identity: 'release:first-release',
    manifest: {
      type: 'release',
      slug: 'first-release',
      date: '2026-08-11',
      draft: false,
      cover: './assets/article-cover.webp',
      artwork: './assets/album-entry.webp',
    },
    book,
  }
}

describe('collectPackageDeclaredPaths', () => {
  it('collects cover, artwork, album covers, and ./ audio_player src', () => {
    const paths = collectPackageDeclaredPaths(releasePackage())
    expect(paths).toEqual([
      './assets/article-cover.webp',
      './assets/album-entry.webp',
      './assets/front.webp',
      './assets/back.webp',
      './assets/preview.mp3',
    ])
  })

  it('ignores https audio src and non-src platforms', () => {
    const paths = collectPackageDeclaredPaths(releasePackage())
    expect(paths).not.toContain('https://cdn.example.com/a.mp3')
  })

  it('collects gift item covers', () => {
    const pkg: CompiledContentPackage = {
      dir: '/content/releases/merch',
      identity: 'release:merch',
      manifest: {
        type: 'release',
        slug: 'merch',
        date: '2026-08-11',
        draft: false,
      },
      book: {
        type: 'gift',
        title: 'Merch',
        gift: {
          items: [
            {
              id: 'poster',
              title: 'Poster',
              covers: ['./assets/poster-front.webp'],
            },
          ],
        },
      },
    }
    expect(collectPackageDeclaredPaths(pkg)).toEqual([
      './assets/poster-front.webp',
    ])
  })

  it('collects ./ src from gift item links', () => {
    const pkg: CompiledContentPackage = {
      dir: '/content/releases/merch',
      identity: 'release:merch',
      manifest: {
        type: 'release',
        slug: 'merch',
        date: '2026-08-11',
        draft: false,
      },
      book: {
        type: 'gift',
        title: 'Merch',
        gift: {
          items: [
            {
              id: 'poster',
              title: 'Poster',
              covers: ['./assets/poster-front.webp'],
              links: [
                {
                  platform: 'audio',
                  src: './assets/gift-preview.mp3',
                },
                {
                  platform: 'audio',
                  src: 'https://cdn.example.com/gift.mp3',
                },
                {
                  platform: 'bilibili',
                  bvid: 'BV1xxxxxxxxx',
                },
              ],
            },
          ],
        },
      },
    }
    const paths = collectPackageDeclaredPaths(pkg)
    expect(paths).toEqual([
      './assets/poster-front.webp',
      './assets/gift-preview.mp3',
    ])
    expect(paths).not.toContain('https://cdn.example.com/gift.mp3')
  })

  it('returns an empty list when no asset fields are present', () => {
    const pkg: CompiledContentPackage = {
      dir: '/content/pages/about',
      identity: 'page:about',
      manifest: {
        type: 'page',
        slug: 'about',
        draft: false,
      },
    }
    expect(collectPackageDeclaredPaths(pkg)).toEqual([])
  })

  it('returns an empty list for home packages without reading cover/artwork', () => {
    // HomeManifest has neither field — implementation must narrow before access.
    const pkg: CompiledContentPackage = {
      dir: '/content/home',
      identity: 'home',
      manifest: {
        type: 'home',
        draft: false,
      },
    }
    expect(collectPackageDeclaredPaths(pkg)).toEqual([])
  })
})
