import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import AlbumArtwork from '../../../src/client/components/release/AlbumArtwork.vue'
import AlbumIdentity from '../../../src/client/components/release/AlbumIdentity.vue'
import AlbumPlatformTabs from '../../../src/client/components/release/AlbumPlatformTabs.vue'
import AlbumTracklist from '../../../src/client/components/release/AlbumTracklist.vue'
import AlbumCredit from '../../../src/client/components/release/AlbumCredit.vue'
import AlbumCovers from '../../../src/client/components/release/AlbumCovers.vue'
import GiftItem from '../../../src/client/components/release/GiftItem.vue'
import TabView from '../../../src/client/components/release/TabView.vue'
import TabPanel from '../../../src/client/components/release/TabPanel.vue'
import AlbumPlatform from '../../../src/client/components/release/AlbumPlatform.vue'
import { SYNCTROL_RELEASE_CONTEXT_KEY } from '../../../src/client/components/release/release-context'
import type { ReleasePageContext } from '../../../src/client/components/release/release-context'
import type { ReleaseDetailModel, ReleaseAlbumBookData } from '../../../src/shared/release/types'
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
  date: '2026-08-11',
  artwork: { kind: 'artwork', artwork: asset('/entry.webp'), alt: '第一张专辑' },
  book: {
    type: 'album',
    title: { text: '第一张专辑' },
    copyright: '© 2026 Synctrol',
    credit: { catalogNumber: 'DVSP-0327', illustrator: ['タイキ', '助手'] },
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
            artists: ['Synctrol', 'LelouchSound'],
            durationSeconds: 272,
            durationLabel: '4:32',
            desc: { zh: '曲目描述' },
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
  date: '2026-08-11',
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

const PlatformEntryStub = defineComponent({
  name: 'PlatformEntryStub',
  props: {
    entry: { type: Object, required: true },
    autoActivate: { type: Boolean, default: false },
    standalone: { type: Boolean, default: false },
  },
  setup(props) {
    return () =>
      h(
        'span',
        { 'data-testid': 'entry-stub' },
        `${props.entry.platform}:${String(props.autoActivate)}:${String(
          props.standalone,
        )}`,
      )
  },
})

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

  it('AlbumCredit renders provided keys in fixed order, one value per line, copyright last', () => {
    const wrapper = mount(AlbumCredit, mountWith(albumModel))
    expect(wrapper.get('[data-testid="album-credit"] h2').text()).toBe('幕后')
    const rows = wrapper.findAll('[data-testid="credit-row"]')
    expect(rows.map((r) => r.get('dt').text())).toEqual([
      '发行日期',
      '制品编号',
      '插画',
      '版权',
    ])
    expect(rows.map((r) => r.get('dd').text())).toEqual([
      '2026-08-11',
      'DVSP-0327',
      'タイキ助手',
      '© 2026 Synctrol',
    ])
    const illustratorValues = rows[2]!.findAll('[data-testid="credit-value"]')
    expect(illustratorValues.map((v) => v.text())).toEqual(['タイキ', '助手'])
  })

  it('AlbumCredit hides when no credit keys and no copyright exist', () => {
    const bare: ReleaseDetailModel = {
      ...albumModel,
      book: { ...(albumModel.book as ReleaseAlbumBookData), credit: undefined, copyright: undefined },
    }
    const wrapper = mount(AlbumCredit, mountWith(bare))
    expect(wrapper.find('[data-testid="album-credit"]').exists()).toBe(false)
  })

  it('TabView and TabPanel render labels, default to the first panel, and switch on click', async () => {
    const wrapper = mount(
      defineComponent({
        components: { TabView, TabPanel, AlbumPlatform },
        template: `
          <TabView>
            <TabPanel label="试听"><AlbumPlatform platform="soundcloud" /></TabPanel>
            <TabPanel label="收听与获取"><AlbumPlatform platform="bilibili" /></TabPanel>
          </TabView>`,
      }),
      {
        attachTo: document.body,
        global: {
          ...mountWith(albumModel).global,
          stubs: { PlatformEntry: PlatformEntryStub },
        },
      },
    )
    expect(wrapper.find('[data-testid="tabview"]').exists()).toBe(true)
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.length).toBe(2)
    expect(tabs[0]!.text()).toBe('试听')
    expect(tabs[1]!.text()).toBe('收听与获取')
    expect(tabs[0]!.attributes('aria-selected')).toBe('true')
    expect(tabs[1]!.attributes('aria-selected')).toBe('false')
    const panels = wrapper.findAll('[data-testid="tab-panel"]')
    const entries = wrapper.findAll('[data-testid="album-platform"]')
    expect(entries[0]!.text()).toBe('soundcloud:true:true')
    expect(entries[1]!.text()).toBe('bilibili:false:true')
    expect(panels[1]!.isVisible()).toBe(false)
    await tabs[1]!.trigger('click')
    expect(tabs[0]!.attributes('aria-selected')).toBe('false')
    expect(tabs[1]!.attributes('aria-selected')).toBe('true')
    expect(panels[0]!.isVisible()).toBe(false)
    expect(panels[1]!.isVisible()).toBe(true)
    expect(entries[1]!.text()).toBe('bilibili:true:true')
    wrapper.unmount()
  })

  it('AlbumPlatform resolves the platform from preview links first', () => {
    const wrapper = mount(AlbumPlatform, {
      props: { platform: 'soundcloud' },
      ...mountWith(albumModel),
      global: {
        ...mountWith(albumModel).global,
        stubs: { PlatformEntry: PlatformEntryStub },
      },
    })
    expect(wrapper.get('[data-testid="album-platform"]').text()).toBe('soundcloud:false:true')
    expect(wrapper.findAll('ul').length).toBe(0)
    expect(wrapper.findAll('li').length).toBe(0)
  })

  it('AlbumPlatform resolves the platform from platform links', () => {
    const wrapper = mount(AlbumPlatform, {
      props: { platform: 'bilibili' },
      ...mountWith(albumModel),
      global: {
        ...mountWith(albumModel).global,
        stubs: { PlatformEntry: PlatformEntryStub },
      },
    })
    expect(wrapper.get('[data-testid="album-platform"]').text()).toBe('bilibili:false:true')
    expect(wrapper.findAll('ul').length).toBe(0)
    expect(wrapper.findAll('li').length).toBe(0)
  })

  it('AlbumPlatform warns and renders nothing for an unknown platform', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(AlbumPlatform, {
      props: { platform: 'nope' },
      ...mountWith(albumModel),
      global: {
        ...mountWith(albumModel).global,
        stubs: { PlatformEntry: PlatformEntryStub },
      },
    })
    expect(wrapper.find('[data-testid="album-platform"]').exists()).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('TabPanel outside a TabView warns and renders its content', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(TabPanel, {
      props: { label: '独立面板' },
      slots: { default: '<p data-testid="orphan">content</p>' },
    })
    expect(wrapper.get('[data-testid="orphan"]').text()).toBe('content')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('AlbumTracklist renders tracks with artists under the title and no duration', () => {
    const wrapper = mount(AlbumTracklist, mountWith(albumModel))
    expect(wrapper.find('[data-testid="album-tracklist"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="album-tracklist"] h2').exists()).toBe(false)
    expect(wrapper.find('#disc-1').exists()).toBe(true)
    expect(wrapper.get('#disc-1-track-1').text()).toContain('第一曲')
    expect(wrapper.get('#disc-1-track-1').text()).toContain('Synctrol / LelouchSound')
    expect(wrapper.get('#disc-1-track-1').text()).toContain('曲目描述')
    expect(wrapper.find('[data-testid="track-row"]').text()).not.toContain('4:32')
  })

  it('AlbumTracklist omits the disc header for a single disc', () => {
    const wrapper = mount(AlbumTracklist, mountWith(albumModel))
    expect(wrapper.find('.syn-album-disc h3').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('第 1 碟')
  })

  it('AlbumTracklist numbers multi-disc headers without disc titles', () => {
    const twoDiscs: ReleaseDetailModel = {
      ...albumModel,
      book: {
        ...(albumModel.book as ReleaseAlbumBookData),
        discs: [
          (albumModel.book as ReleaseAlbumBookData).discs[0],
          {
            number: 2,
            anchor: 'disc-2',
            title: { zh: '第二碟' },
            tracks: [
              {
                number: 1,
                anchor: 'disc-2-track-1',
                title: { zh: '第三曲' },
                artists: ['Synctrol'],
                durationSeconds: 180,
                durationLabel: '3:00',
              },
            ],
          },
        ],
      },
    }
    const wrapper = mount(AlbumTracklist, mountWith(twoDiscs))
    const headers = wrapper.findAll('.syn-album-disc h3')
    expect(headers.length).toBe(2)
    expect(headers[0]!.text()).toBe('第 1 碟')
    expect(headers[1]!.text()).toBe('第 2 碟')
    expect(wrapper.text()).not.toContain('第一碟')
    expect(wrapper.text()).not.toContain('第二碟')
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
