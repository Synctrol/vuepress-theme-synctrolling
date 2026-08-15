import { describe, expect, it } from 'vitest'
import { buildEmbedUrl, buildFallbackUrl } from '../../src/platforms/urls'

describe('buildEmbedUrl / buildFallbackUrl', () => {
  it('builds youtube embed and watch URLs', () => {
    const entry = { platform: 'youtube', videoId: 'dQw4w9WgXcQ', start: 30, autoplay: false }
    expect(buildEmbedUrl('youtube_player', entry)).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=30&autoplay=0',
    )
    expect(buildFallbackUrl('youtube_player', entry)).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )
  })

  it('builds bilibili player and video page URLs', () => {
    const entry = {
      platform: 'bilibili',
      bvid: 'BV1xxxxxxxxx',
      page: 2,
      autoplay: true,
    }
    expect(buildEmbedUrl('bilibili_player', entry)).toBe(
      'https://player.bilibili.com/player.html?bvid=BV1xxxxxxxxx&page=2&autoplay=1',
    )
    expect(buildFallbackUrl('bilibili_player', entry)).toBe(
      'https://www.bilibili.com/video/BV1xxxxxxxxx',
    )
  })

  it('maps spotify URIs to open.spotify.com embed and page URLs', () => {
    const entry = { platform: 'spotify', uri: 'spotify:album:abc123' }
    expect(buildEmbedUrl('spotify_player', entry)).toBe(
      'https://open.spotify.com/embed/album/abc123',
    )
    expect(buildFallbackUrl('spotify_player', entry)).toBe(
      'https://open.spotify.com/album/abc123',
    )
  })

  it('rewrites apple music URLs onto embed.music.apple.com', () => {
    const entry = {
      platform: 'apple',
      url: 'https://music.apple.com/us/album/example/123',
    }
    expect(buildEmbedUrl('apple_music_player', entry)).toBe(
      'https://embed.music.apple.com/us/album/example/123',
    )
    expect(buildFallbackUrl('apple_music_player', entry)).toBe(
      'https://music.apple.com/us/album/example/123',
    )
  })

  it('builds soundcloud widget and netease outchain URLs', () => {
    const sc = {
      platform: 'soundcloud',
      url: 'https://soundcloud.com/artist/track',
    }
    expect(buildEmbedUrl('soundcloud_player', sc)).toBe(
      'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Ftrack&auto_play=false',
    )
    expect(buildFallbackUrl('soundcloud_player', sc)).toBe(
      'https://soundcloud.com/artist/track',
    )

    const ne = {
      platform: 'netease',
      id: '12345',
      resourceType: 'song' as const,
    }
    expect(buildEmbedUrl('netease_player', ne)).toBe(
      'https://music.163.com/outchain/player?type=2&id=12345&auto=0',
    )
    expect(buildFallbackUrl('netease_player', ne)).toBe(
      'https://music.163.com/#/song?id=12345',
    )
  })

  it('returns link url as fallback and no embed; audio uses src when HTTPS', () => {
    expect(buildEmbedUrl('link', { platform: 'taobao', url: 'https://item.taobao.com/x' })).toBe(
      undefined,
    )
    expect(buildFallbackUrl('link', { platform: 'taobao', url: 'https://item.taobao.com/x' })).toBe(
      'https://item.taobao.com/x',
    )
    expect(
      buildFallbackUrl('audio_player', {
        platform: 'local',
        src: 'https://cdn.example.com/a.mp3',
        autoplay: false,
      }),
    ).toBe('https://cdn.example.com/a.mp3')
    expect(
      buildFallbackUrl('audio_player', {
        platform: 'local',
        src: './assets/a.mp3',
        autoplay: false,
      }),
    ).toBe(undefined)
  })
})
