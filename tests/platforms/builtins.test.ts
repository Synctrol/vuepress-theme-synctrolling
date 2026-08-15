import { describe, expect, it } from 'vitest'
import { builtInPlatformTypes } from '../../src/platforms/builtins'
import { optionalLabel } from '../../src/platforms/builtins/validate-helpers'
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

  it('accepts and normalizes Spotify share URLs to canonical URIs', () => {
    const reg = builtInPlatformTypes.spotify_player
    expect(
      reg.validate({
        platform: 'spotify',
        uri: 'https://open.spotify.com/album/6sTGvo4ElkLW573RbrH5Yk',
      }),
    ).toMatchObject({ uri: 'spotify:album:6sTGvo4ElkLW573RbrH5Yk' })
    expect(
      reg.validate({
        platform: 'spotify',
        uri: 'https://open.spotify.com/intl-zh/track/abc123?si=xyz',
      }),
    ).toMatchObject({ uri: 'spotify:track:abc123' })
    expect(
      reg.validate({ platform: 'spotify', uri: 'spotify:playlist:abc' }),
    ).toMatchObject({ uri: 'spotify:playlist:abc' })
    expect(() =>
      reg.validate({
        platform: 'spotify',
        uri: 'https://open.spotify.com/artist/abc',
      }),
    ).toThrow()
    expect(() =>
      reg.validate({
        platform: 'spotify',
        uri: 'https://example.com/album/abc',
      }),
    ).toThrow()
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

  it('treats uppercase HTTPS audio src as a remote CSP origin (case-insensitive)', () => {
    const remote = builtInPlatformTypes.audio_player.validate({
      platform: 'host',
      src: 'HTTPS://CDN.Example.com/a.mp3',
      mime: 'audio/mpeg',
    })
    expect(builtInPlatformTypes.audio_player.cspOrigins(remote)).toEqual([
      'https://cdn.example.com',
    ])
    expect(builtInPlatformTypes.audio_player.cspOrigins(remote)).not.toEqual([
      "'self'",
    ])
  })

  it('optionalLabel validates main locale maps and isolates from input mutation', () => {
    const inputLabel = { zh: '试听', en: 'Preview' }
    const entry = builtInPlatformTypes.link.validate({
      platform: 'store',
      label: inputLabel,
      url: 'https://shop.example/item',
    })
    expect(entry.label).toEqual({ zh: '试听', en: 'Preview' })
    expect(entry.label).not.toBe(inputLabel)
    inputLabel.zh = '已修改'
    expect(entry.label).toEqual({ zh: '试听', en: 'Preview' })

    // mainLocale validation is enforced via optionalLabel(entry, mainLocale) —
    // the same helper validatePlatformEntry uses.
    expect(() =>
      optionalLabel({ label: { en: 'Listen' } }, 'zh'),
    ).toThrow(/MISSING_MAIN_LOCALE|mainLocale/)

    const map = { zh: '购买', en: 'Buy' }
    const cloned = optionalLabel({ label: map }, 'zh')
    expect(cloned).toEqual({ zh: '购买', en: 'Buy' })
    expect(cloned).not.toBe(map)
    map.zh = '改'
    expect(cloned).toEqual({ zh: '购买', en: 'Buy' })
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

  it('parses netease song/album/playlist share links into id and resourceType', () => {
    const reg = builtInPlatformTypes.netease_player
    expect(
      reg.validate({
        platform: 'netease',
        url: 'https://music.163.com/#/album?id=368479005',
      }),
    ).toMatchObject({ id: '368479005', resourceType: 'album' })
    expect(
      reg.validate({
        platform: 'netease',
        url: 'https://music.163.com/song?id=123&userid=456',
      }),
    ).toMatchObject({ id: '123', resourceType: 'song' })
    expect(
      reg.validate({
        platform: 'netease',
        url: 'https://music.163.com/#/playlist?id=777',
      }),
    ).toMatchObject({ id: '777', resourceType: 'playlist' })
    expect(() =>
      reg.validate({ platform: 'netease', url: 'https://example.com/song?id=1' }),
    ).toThrow()
    expect(() =>
      reg.validate({
        platform: 'netease',
        url: 'https://music.163.com/#/artist?id=1',
      }),
    ).toThrow()
    expect(() =>
      reg.validate({
        platform: 'netease',
        url: 'https://music.163.com/#/song?id=1',
        id: '2',
        resourceType: 'song',
      }),
    ).toThrow(/either url or id/)
  })

  it('parses youtube watch and youtu.be links into videoId', () => {
    const reg = builtInPlatformTypes.youtube_player
    expect(
      reg.validate({
        platform: 'youtube',
        url: 'https://www.youtube.com/watch?v=nDXVFY_4Aq4',
      }),
    ).toMatchObject({ videoId: 'nDXVFY_4Aq4' })
    expect(
      reg.validate({ platform: 'youtube', url: 'https://youtu.be/nDXVFY_4Aq4' }),
    ).toMatchObject({ videoId: 'nDXVFY_4Aq4' })
    expect(() =>
      reg.validate({ platform: 'youtube', url: 'https://example.com/watch?v=abc' }),
    ).toThrow()
  })

  it('parses bilibili video links into bvid', () => {
    const reg = builtInPlatformTypes.bilibili_player
    expect(
      reg.validate({
        platform: 'bilibili',
        url: 'https://www.bilibili.com/video/BV1TAjT6GEvH/',
      }),
    ).toMatchObject({ bvid: 'BV1TAjT6GEvH' })
    expect(() =>
      reg.validate({ platform: 'bilibili', url: 'https://example.com/video/BV1TAjT6GEvH' }),
    ).toThrow()
  })
})
