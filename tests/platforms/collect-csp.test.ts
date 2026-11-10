import { describe, expect, it } from 'vitest'
import { collectCspFromEntries } from '../../src/platforms/collect-csp'
import { resolvePlatformTypes } from '../../src/platforms/registry'

describe('collectCspFromEntries', () => {
  it('merges frame-src for players and media-src for audio', () => {
    const types = resolvePlatformTypes()
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
})
