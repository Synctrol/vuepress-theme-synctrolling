import { describe, expect, it } from 'vitest'
import { collectVisiblePlatformEntries } from '../../../src/compiler/platforms/collect-visible-platform-entries'
import type { CompiledContentPackage } from '../../../src/shared/types'
import type { CompiledPage } from '../../../src/shared/route-types'

function compiled(
  identity: string,
  dir: string,
  players: CompiledContentPackage['players'],
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
    players,
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
  it('collects scanned players only for packages with published pages', () => {
    const published = compiled('release:live', '/pkg/live', [
      { platform: 'youtube_player', videoId: 'dQw4w9WgXcQ', autoplay: false },
    ])
    const draft = compiled('release:draft', '/pkg/draft', [
      { platform: 'audio_player', src: './draft.mp3', autoplay: false },
    ])
    const pages: CompiledPage[] = [page('release:live', '/pkg/live')]

    const items = collectVisiblePlatformEntries({
      compiledPackages: [published, draft],
      pages,
    })
    expect(items).toEqual([
      {
        type: 'youtube_player',
        entry: {
          platform: 'youtube_player',
          videoId: 'dQw4w9WgXcQ',
          autoplay: false,
        },
      },
    ])
  })

  it('returns empty when no pages publish any package', () => {
    const onlyDraft = compiled('release:draft', '/pkg/draft', [
      { platform: 'youtube_player', videoId: 'dQw4w9WgXcQ' },
    ])
    expect(
      collectVisiblePlatformEntries({
        compiledPackages: [onlyDraft],
        pages: [],
      }),
    ).toEqual([])
  })
})
