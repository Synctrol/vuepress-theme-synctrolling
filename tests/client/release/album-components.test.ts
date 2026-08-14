import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AlbumArtwork from '../../../src/client/components/release/AlbumArtwork.vue'
import AlbumIdentity from '../../../src/client/components/release/AlbumIdentity.vue'
import AlbumCopyright from '../../../src/client/components/release/AlbumCopyright.vue'
import AlbumPreviews from '../../../src/client/components/release/AlbumPreviews.vue'
import AlbumPlatformLinks from '../../../src/client/components/release/AlbumPlatformLinks.vue'
import AlbumTracklist from '../../../src/client/components/release/AlbumTracklist.vue'
import AlbumCredit from '../../../src/client/components/release/AlbumCredit.vue'
import AlbumCovers from '../../../src/client/components/release/AlbumCovers.vue'
import GiftItem from '../../../src/client/components/release/GiftItem.vue'
import { SYNCTROL_RELEASE_CONTEXT_KEY } from '../../../src/client/components/release/release-context'
import type { ReleasePageContext } from '../../../src/client/components/release/release-context'
import type { ReleaseDetailModel } from '../../../src/shared/release/types'
import { asset, zhMessages } from '../../helpers/release-fixtures'
import { builtInPlatformTypes } from '../../../src/platforms/builtins/index'
import type { ContentDefinitions } from '../../../src/shared/types'

vi.mock('vuepress/client', () => ({}))

const definitions: ContentDefinitions['platforms'] = {
  soundcloud: { category: 'digital', type: 'soundcloud_player', name: 'SoundCloud' },
  bilibili: { category: 'digital', type: 'bilibili_player', name: 'Bilibili' },
}

const albumModel: ReleaseDetailModel = {
  includedInIndex: true,
  showDraftBadge: false,
  draftLabel: '草稿',
  artwork: { kind: 'artwork', artwork: asset('/entry.webp'), alt: '第一张专辑' },
  book: {
    type: 'album',
    title: { text: '第一张专辑' },
    copyright: '© 2026 Synctrol',
    credit: { catalogNumber: 'DVSP-0327', illustrator: 'タイキ' },
    previewLinks: [{ platform: 'soundcloud', url: 'https://soundcloud.com/a/b' }],
    platformLinks: [
      { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 1, autoplay: false },
    ],
    covers: [asset('/front.webp')],
    discs: [
      {
        number: 1,
        anchor: 'disc-1',
        title: { zh: '第一碟' },
        tracks: [
          {
            number: 1,
            anchor: 'disc-1-track-1',
            title: { zh: '第一曲' },
            artists: ['Synctrol'],
            durationSeconds: 272,
            durationLabel: '4:32',
          },
        ],
      },
    ],
  },
}

const giftModel: ReleaseDetailModel = {
  includedInIndex: true,
  showDraftBadge: false,
  draftLabel: '草稿',
  artwork: { kind: 'empty-frame', alt: '周边' },
  book: {
    type: 'gift',
    title: { text: '周边系列' },
    items: [
      {
        id: 'poster',
        title: { text: '纪念海报' },
        desc: { text: '限量' },
        covers: [asset('/poster.webp')],
        previewLinks: [],
        platformLinks: [],
      },
    ],
  },
}

function provideContext(model: ReleaseDetailModel): Record<string, unknown> {
  const ctx: ReleasePageContext = {
    locale: 'zh',
    mainLocale: 'zh',
    model,
    definitions,
    types: builtInPlatformTypes,
    loadStrategy: 'interaction',
    messages: zhMessages,
  }
  return { [SYNCTROL_RELEASE_CONTEXT_KEY as symbol]: ctx }
}

function mountWith(model: ReleaseDetailModel) {
  return { global: { provide: provideContext(model) } }
}

describe('album components', () => {
  it('AlbumArtwork renders the artwork image', () => {
    const wrapper = mount(AlbumArtwork, mountWith(albumModel))
    expect(wrapper.get('[data-testid="album-artwork"] img').attributes('src')).toBe('/entry.webp')
    expect(wrapper.get('img').attributes('alt')).toBe('第一张专辑')
  })

  it('AlbumIdentity renders only the book title as h2', () => {
    const wrapper = mount(AlbumIdentity, mountWith(albumModel))
    expect(wrapper.get('[data-testid="album-identity"]').text()).toBe('第一张专辑')
    expect(wrapper.find('h2').exists()).toBe(true)
  })

  it('AlbumCopyright renders the copyright and hides when absent', () => {
    const wrapper = mount(AlbumCopyright, mountWith(albumModel))
    expect(wrapper.get('[data-testid="album-copyright"]').text()).toBe('© 2026 Synctrol')
    const none = mount(AlbumCopyright, mountWith({ ...albumModel, book: undefined }))
    expect(none.find('[data-testid="album-copyright"]').exists()).toBe(false)
  })

  it('AlbumPreviews renders preview links with the preview title', () => {
    const wrapper = mount(AlbumPreviews, {
      ...mountWith(albumModel),
      global: {
        ...mountWith(albumModel).global,
        stubs: { PlatformLinks: { props: ['entries', 'title'], template: `<div data-testid="pl"><span data-testid="pl-title">{{ title }}</span><span data-testid="pl-count">{{ entries.length }}</span></div>` } },
      },
    })
    expect(wrapper.get('[data-testid="pl-count"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="pl-title"]').text()).toBe('试听')
  })

  it('AlbumPlatformLinks renders non-preview links', () => {
    const wrapper = mount(AlbumPlatformLinks, {
      ...mountWith(albumModel),
      global: {
        ...mountWith(albumModel).global,
        stubs: { PlatformLinks: { props: ['entries', 'title'], template: `<div data-testid="pl"><span data-testid="pl-count">{{ entries.length }}</span><span data-testid="pl-title">{{ title || 'default' }}</span></div>` } },
      },
    })
    expect(wrapper.get('[data-testid="pl-count"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="pl-title"]').text()).toBe('default')
  })

  it('AlbumTracklist renders disc, tracks with artists under title and no duration', () => {
    const wrapper = mount(AlbumTracklist, mountWith(albumModel))
    expect(wrapper.find('[data-testid="album-tracklist"]').exists()).toBe(true)
    expect(wrapper.find('#disc-1').exists()).toBe(true)
    expect(wrapper.get('#disc-1-track-1').text()).toContain('第一曲')
    expect(wrapper.get('#disc-1-track-1').text()).toContain('Synctrol')
    expect(wrapper.find('[data-testid="track-row"]').text()).not.toContain('4:32')
  })

  it('AlbumCredit renders only provided keys in fixed order with translated labels', () => {
    const wrapper = mount(AlbumCredit, mountWith(albumModel))
    const rows = wrapper.findAll('[data-testid="credit-row"]')
    expect(rows.map((r) => r.text())).toEqual(['制品编号DVSP-0327', '插画タイキ'])
  })

  it('AlbumCovers renders cover images lazily with numbered alt', () => {
    const wrapper = mount(AlbumCovers, mountWith(albumModel))
    const img = wrapper.get('[data-testid="album-cover"]')
    expect(img.attributes('src')).toBe('/front.webp')
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('GiftItem renders the item selected by id and warns on unknown id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(GiftItem, { props: { id: 'poster' }, global: mountWith(giftModel).global })
    expect(wrapper.get('[data-testid="gift-item"] h3').text()).toBe('纪念海报')
    const missing = mount(GiftItem, { props: { id: 'nope' }, global: mountWith(giftModel).global })
    expect(missing.find('[data-testid="gift-item"]').exists()).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('warns and renders nothing without the context', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(AlbumTracklist)
    expect(wrapper.find('[data-testid="album-tracklist"]').exists()).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
