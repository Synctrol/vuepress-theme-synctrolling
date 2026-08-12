import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { resolvePlatformTypes } from '../../src/platforms/registry'
import { builtInPlatformTypes } from '../../src/platforms/builtins'

describe('resolvePlatformTypes', () => {
  it('returns built-ins when custom map is empty', () => {
    const types = resolvePlatformTypes({})
    expect(types.youtube_player).toBe(builtInPlatformTypes.youtube_player)
  })

  it('allows custom types and forbids overriding built-in type names', () => {
    const custom = {
      bandcamp_player: {
        validate(entry: unknown) {
          const e = entry as { platform: string; url: string }
          if (!e.url?.startsWith('https://')) throw new Error('bad')
          return e
        },
        component: defineComponent({ setup: () => () => h('div') }),
        cspOrigins: () => ['https://bandcamp.com'],
        fallbackUrl: (e: { platform: string }) =>
          (e as unknown as { url: string }).url,
      },
    }
    const types = resolvePlatformTypes(custom)
    expect(
      types.bandcamp_player.cspOrigins({
        platform: 'bc',
        url: 'https://bandcamp.com/x',
      } as never),
    ).toEqual(['https://bandcamp.com'])
    expect(() =>
      resolvePlatformTypes({
        youtube_player: custom.bandcamp_player,
      }),
    ).toThrow(/built-in/)
  })
})
