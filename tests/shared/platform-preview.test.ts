import { describe, expect, it } from 'vitest'
import { builtInPlatformTypes } from '../../src/platforms/builtins/index'

describe('preview platform types', () => {
  it('marks the audio-ish built-ins as preview', () => {
    expect(builtInPlatformTypes.soundcloud_player.preview).toBe(true)
    expect(builtInPlatformTypes.audio_player.preview).toBe(true)
    expect(builtInPlatformTypes.netease_player.preview).toBe(true)
  })

  it('keeps video player built-ins non-preview', () => {
    expect(builtInPlatformTypes.youtube_player.preview).toBeUndefined()
    expect(builtInPlatformTypes.bilibili_player.preview).toBeUndefined()
    expect(builtInPlatformTypes.spotify_player.preview).toBeUndefined()
    expect(builtInPlatformTypes.apple_music_player.preview).toBeUndefined()
  })
})
