import { describe, expect, it } from 'vitest'
import { builtInPlatformTypes } from '../../src/platforms/builtins'
import { isDiagnosticError } from '../../src/compiler/diagnostics'

describe('builtInPlatformTypes', () => {
  it('registers all eight built-in types', () => {
    expect(Object.keys(builtInPlatformTypes).sort()).toEqual([
      'apple_music_player',
      'audio_player',
      'bilibili_player',
      'link',
      'netease_player',
      'soundcloud_player',
      'spotify_player',
      'youtube_player',
    ])
  })

  it('validates youtube videoId and contributes youtube frame-src', () => {
    const reg = builtInPlatformTypes.youtube_player
    const entry = reg.validate({
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      start: 0,
      autoplay: false,
    })
    expect(entry).toMatchObject({ videoId: 'dQw4w9WgXcQ', autoplay: false })
    expect(reg.cspOrigins(entry)).toEqual(['https://www.youtube.com'])
    expect(reg.fallbackUrl?.(entry)).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )
  })

  it('rejects invalid bilibili bvid with a diagnostic', () => {
    try {
      builtInPlatformTypes.bilibili_player.validate({
        platform: 'bilibili',
        bvid: 'bad',
      })
      expect.unreachable('should throw')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
    }
  })

  it('requires apple music HTTPS on music.apple.com and spotify URI shapes', () => {
    expect(() =>
      builtInPlatformTypes.apple_music_player.validate({
        platform: 'apple',
        url: 'https://example.com/x',
      }),
    ).toThrow()
    expect(() =>
      builtInPlatformTypes.spotify_player.validate({
        platform: 'spotify',
        uri: 'spotify:artist:x',
      }),
    ).toThrow()
    const spotify = builtInPlatformTypes.spotify_player.validate({
      platform: 'spotify',
      uri: 'spotify:track:abc',
    })
    expect(builtInPlatformTypes.spotify_player.cspOrigins(spotify)).toEqual([
      'https://open.spotify.com',
    ])
  })

  it('defaults autoplay to false and checks audio mime prefix', () => {
    const audio = builtInPlatformTypes.audio_player.validate({
      platform: 'host',
      src: './assets/a.mp3',
    })
    expect(audio).toMatchObject({ src: './assets/a.mp3', autoplay: false })
    expect(builtInPlatformTypes.audio_player.cspOrigins(audio)).toEqual(["'self'"])
    expect(() =>
      builtInPlatformTypes.audio_player.validate({
        platform: 'host',
        src: 'https://cdn.example.com/a.mp3',
        mime: 'video/mp4',
      }),
    ).toThrow()
    const remote = builtInPlatformTypes.audio_player.validate({
      platform: 'host',
      src: 'https://cdn.example.com/a.mp3',
      mime: 'audio/mpeg',
    })
    expect(builtInPlatformTypes.audio_player.cspOrigins(remote)).toEqual([
      'https://cdn.example.com',
    ])
  })

  it('validates netease id digits and resourceType', () => {
    const entry = builtInPlatformTypes.netease_player.validate({
      platform: 'netease',
      id: '99',
      resourceType: 'playlist',
    })
    expect(builtInPlatformTypes.netease_player.cspOrigins(entry)).toEqual([
      'https://music.163.com',
    ])
  })
})
