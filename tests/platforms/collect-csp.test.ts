import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { collectCspFromEntries } from '../../src/platforms/collect-csp'
import { resolvePlatformTypes } from '../../src/platforms/registry'

describe('collectCspFromEntries', () => {
  it('merges frame-src for players and media-src for audio', () => {
    const types = resolvePlatformTypes({})
    const csp = collectCspFromEntries(
      [
        {
          type: 'youtube_player',
          entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
        },
        {
          type: 'audio_player',
          entry: { platform: 'host', src: 'https://cdn.example.com/a.mp3', autoplay: false },
        },
        {
          type: 'bilibili_player',
          entry: { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', autoplay: false },
        },
      ],
      types,
    )
    expect(csp['frame-src']).toEqual([
      'https://www.youtube.com',
      'https://player.bilibili.com',
    ])
    expect(csp['media-src']).toEqual(['https://cdn.example.com'])
    expect(csp['connect-src']).toEqual([])
  })

  it('maps custom type origins to frame-src only (v1)', () => {
    const types = resolvePlatformTypes({
      bandcamp_player: {
        validate: (e: unknown) => e as never,
        component: defineComponent({ setup: () => () => h('div') }),
        cspOrigins: () => ['https://bandcamp.com'],
      },
    })
    const csp = collectCspFromEntries(
      [{ type: 'bandcamp_player', entry: { platform: 'bc', url: 'https://bandcamp.com/x' } }],
      types,
    )
    expect(csp['frame-src']).toEqual(['https://bandcamp.com'])
    expect(csp['media-src']).toEqual([])
    expect(csp['connect-src']).toEqual([])
  })
})
