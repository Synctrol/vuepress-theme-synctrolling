import { describe, expect, it } from 'vitest'
import {
  isPreviewEntry,
  splitPreviewLinks,
} from '../../../src/shared/release/link-roles'
import type {
  ContentDefinitions,
  NormalizedPlatformEntry,
} from '../../../src/shared/types'
import { builtInPlatformTypes } from '../../../src/platforms/builtins/index'

const definitions: ContentDefinitions['platforms'] = {
  sc: { category: 'digital', type: 'soundcloud_player', name: 'SoundCloud' },
  spotify: { category: 'digital', type: 'spotify_player', name: 'Spotify' },
}

const entries: NormalizedPlatformEntry[] = [
  { platform: 'sc', url: 'https://soundcloud.com/a/b' },
  { platform: 'spotify', url: 'https://open.spotify.com/album/x' },
]

describe('preview link roles', () => {
  it('classifies entries by their type registration preview flag', () => {
    expect(isPreviewEntry(entries[0], definitions, builtInPlatformTypes)).toBe(true)
    expect(isPreviewEntry(entries[1], definitions, builtInPlatformTypes)).toBe(false)
  })

  it('splits entries into preview and platform groups keeping order', () => {
    const { previewLinks, platformLinks } = splitPreviewLinks(
      entries,
      definitions,
      builtInPlatformTypes,
    )
    expect(previewLinks.map((e) => e.platform)).toEqual(['sc'])
    expect(platformLinks.map((e) => e.platform)).toEqual(['spotify'])
  })

  it('treats unknown platform or type as non-preview', () => {
    expect(
      isPreviewEntry(
        { platform: 'missing' },
        definitions,
        builtInPlatformTypes,
      ),
    ).toBe(false)
  })
})
