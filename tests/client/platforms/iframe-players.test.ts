import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { YouTubePlayerPlatform } from '../../../src/client/components/platforms/renderers/YouTubePlayerPlatform'
import { BilibiliPlayerPlatform } from '../../../src/client/components/platforms/renderers/BilibiliPlayerPlatform'
import { AppleMusicPlayerPlatform } from '../../../src/client/components/platforms/renderers/AppleMusicPlayerPlatform'
import { SpotifyPlayerPlatform } from '../../../src/client/components/platforms/renderers/SpotifyPlayerPlatform'
import { SoundCloudPlayerPlatform } from '../../../src/client/components/platforms/renderers/SoundCloudPlayerPlatform'
import { NeteasePlayerPlatform } from '../../../src/client/components/platforms/renderers/NeteasePlayerPlatform'

describe('iframe player renderers', () => {
  it('sets descriptive iframe titles and builder-owned src values', () => {
    const yt = mount(YouTubePlayerPlatform, {
      props: {
        entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', start: 30, autoplay: false },
        title: 'YouTube',
      },
    })
    expect(yt.get('iframe').attributes('title')).toBe('YouTube')
    expect(yt.get('iframe').attributes('src')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=30&autoplay=0',
    )
    expect(yt.get('iframe').attributes('loading')).toBe('lazy')
    expect(yt.get('iframe').attributes('referrerpolicy')).toBe('strict-origin-when-cross-origin')

    const bi = mount(BilibiliPlayerPlatform, {
      props: {
        entry: { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 1, autoplay: false },
        title: 'Bilibili',
      },
    })
    expect(bi.get('iframe').attributes('src')).toContain('player.bilibili.com')

    const apple = mount(AppleMusicPlayerPlatform, {
      props: {
        entry: { platform: 'apple', url: 'https://music.apple.com/us/album/x/1' },
        title: 'Apple Music',
      },
    })
    expect(apple.get('iframe').attributes('src')).toBe(
      'https://embed.music.apple.com/us/album/x/1',
    )

    const spotify = mount(SpotifyPlayerPlatform, {
      props: {
        entry: { platform: 'spotify', uri: 'spotify:playlist:abc' },
        title: 'Spotify',
      },
    })
    expect(spotify.get('iframe').attributes('src')).toBe(
      'https://open.spotify.com/embed/playlist/abc',
    )

    const sc = mount(SoundCloudPlayerPlatform, {
      props: {
        entry: { platform: 'soundcloud', url: 'https://soundcloud.com/a/b' },
        title: 'SoundCloud',
      },
    })
    expect(sc.get('iframe').attributes('src')).toContain('w.soundcloud.com/player')

    const ne = mount(NeteasePlayerPlatform, {
      props: {
        entry: { platform: 'netease', id: '1', resourceType: 'album' },
        title: 'NetEase',
      },
    })
    expect(ne.get('iframe').attributes('src')).toContain('music.163.com/outchain/player')
  })
})
