import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AlbumIdentity from '../../../src/client/components/release/AlbumIdentity.vue'
import AlbumTracklist from '../../../src/client/components/release/AlbumTracklist.vue'
import AlbumCredit from '../../../src/client/components/release/AlbumCredit.vue'
import AlbumCovers from '../../../src/client/components/release/AlbumCovers.vue'
import Player from '../../../src/client/components/release/Player.vue'
import { SYNCTROL_RELEASE_CONTEXT_KEY } from '../../../src/client/components/release/release-context'
import type { ReleasePageContext } from '../../../src/client/components/release/release-context'
import { zhMessages } from '../../helpers/release-fixtures'

vi.mock('vuepress/client', () => ({}))

const context = {
  locale: 'zh',
  mainLocale: 'zh',
  date: '2026-08-11',
  artwork: { kind: 'empty-frame', alt: '第一张专辑' },
  albumBySrc: {
    './album.yml': {
      title: { zh: '第一张专辑', en: 'First Album' },
      copyright: '© 2026 Synctrol',
      credit: {
        catalogNumber: 'DVSP-0327',
        illustrator: ['タイキ', '助手'],
      },
      covers: ['/front.webp'],
      discs: [
        {
          title: { zh: '第一碟' },
          tracks: [
            {
              title: { zh: '第一曲' },
              artists: ['Synctrol', 'LelouchSound'],
              duration: 272,
              desc: { zh: '曲目描述' },
            },
          ],
        },
      ],
    },
  },
  loadStrategy: 'interaction',
  messages: zhMessages,
} satisfies ReleasePageContext

function mountWithContext() {
  return {
    global: {
      provide: {
        [SYNCTROL_RELEASE_CONTEXT_KEY as symbol]: context,
      },
    },
  }
}

describe('album components', () => {
  it('uses src to render album identity', () => {
    const wrapper = mount(AlbumIdentity, {
      props: { src: './metadata/../album.yml' },
      ...mountWithContext(),
    })
    expect(wrapper.get('[data-testid="album-identity"]').text()).toBe('第一张专辑')
    expect(wrapper.get('h2').attributes('lang')).toBeUndefined()
  })

  it('uses src to render numbered tracks and optional fields', () => {
    const wrapper = mount(AlbumTracklist, {
      props: { src: './album.yml', showDesc: true },
      ...mountWithContext(),
    })
    expect(wrapper.get('#disc-1-track-1').text()).toContain('第一曲')
    expect(wrapper.get('#disc-1-track-1').text()).toContain(
      'Synctrol / LelouchSound',
    )
    expect(wrapper.get('[data-testid="track-desc"]').text()).toBe('曲目描述')
    expect(wrapper.find('.syn-album-disc h3').exists()).toBe(false)
  })

  it('uses src to render credit in fixed order and copyright last', () => {
    const wrapper = mount(AlbumCredit, {
      props: { src: './album.yml' },
      ...mountWithContext(),
    })
    const rows = wrapper.findAll('[data-testid="credit-row"]')
    expect(rows.map((row) => row.get('dt').text())).toEqual([
      '发行日期',
      '制品编号',
      '插画',
      '版权',
    ])
    expect(
      rows[2]!.findAll('[data-testid="credit-value"]').map((value) => value.text()),
    ).toEqual(['タイキ', '助手'])
  })

  it('uses src to render resolved cover URLs', () => {
    const wrapper = mount(AlbumCovers, {
      props: { src: './album.yml' },
      ...mountWithContext(),
    })
    expect(wrapper.get('[data-testid="album-cover"]').attributes('src')).toBe(
      '/front.webp',
    )
  })

  it('warns and renders nothing when src is absent from albumBySrc', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(AlbumTracklist, {
      props: { src: './missing.yml' },
      ...mountWithContext(),
    })
    expect(wrapper.find('[data-testid="album-tracklist"]').exists()).toBe(false)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('./missing.yml'))
    warn.mockRestore()
  })
})

describe('Player', () => {
  it('coerces kebab-case, integer, and boolean attributes before validation', () => {
    const wrapper = mount(Player, {
      props: {
        type: 'youtube_player',
        'video-id': 'abcdefghijk',
        start: '30',
        autoplay: 'true',
      },
      ...mountWithContext(),
    })

    expect(wrapper.find('.syn-platform-embed').exists()).toBe(true)
  })

  it.each([
    ['audio_player', { src: 'https://cdn.example.com/preview.mp3' }],
    ['netease_player', { url: 'https://music.163.com/#/album?id=123' }],
  ])('renders the embed shell for %s', (type, entryProps) => {
    const wrapper = mount(Player, {
      props: { type, ...entryProps },
      ...mountWithContext(),
    })
    expect(wrapper.find('.syn-platform-embed').exists()).toBe(true)
    expect(wrapper.get('button').text()).toContain(type)
  })
})
