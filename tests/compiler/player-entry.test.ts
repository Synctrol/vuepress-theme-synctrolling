import { describe, expect, it } from 'vitest'
import { validatePlayerUsage } from '../../src/compiler/player-entry'
import { resolvePlatformTypes } from '../../src/platforms/registry'

describe('validatePlayerUsage', () => {
  const types = resolvePlatformTypes()

  it('normalizes Player attributes through the built-in validator', () => {
    expect(
      validatePlayerUsage(
        {
          type: 'netease_player',
          attrs: {
            url: 'https://music.163.com/#/album?id=123',
          },
          sourcePath: '/content/releases/demo/zh.md',
          line: 8,
        },
        types,
      ),
    ).toEqual({
      platform: 'netease_player',
      id: '123',
      resourceType: 'album',
    })
  })

  it('coerces boolean and integer HTML attributes for validators', () => {
    expect(
      validatePlayerUsage(
        {
          type: 'youtube_player',
          attrs: {
            videoId: 'abcdefghijk',
            start: '12',
            autoplay: 'false',
          },
          sourcePath: '/content/releases/demo/zh.md',
        },
        types,
      ),
    ).toMatchObject({
      platform: 'youtube_player',
      videoId: 'abcdefghijk',
      start: 12,
      autoplay: false,
    })
  })

  it('rejects unknown Player types at the Markdown source', () => {
    expect(() =>
      validatePlayerUsage(
        {
          type: 'custom_player',
          attrs: {},
          sourcePath: '/content/releases/demo/zh.md',
        },
        types,
      ),
    ).toThrow(/Unknown Player type "custom_player"/)
  })
})
