import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GiftBookBody from '../../../src/client/components/release/GiftBookBody.vue'
import { asset, zhMessages } from '../../helpers/release-fixtures'
import type { ContentDefinitions } from '../../../src/shared/types'
import type { PlatformTypeRegistration } from '../../../src/shared/options'

const StubPlatformLinks = {
  name: 'PlatformLinks',
  props: [
    'entries',
    'definitions',
    'types',
    'loadStrategy',
    'locale',
    'mainLocale',
    'messages',
  ],
  template: `<div data-testid="item-links">{{ entries.map(e => e.platform).join(',') }}</div>`,
}

const definitions: ContentDefinitions['platforms'] = {
  taobao: {
    category: 'physical',
    type: 'link',
    name: { zh: '淘宝', en: 'Taobao' },
  },
}

const types: Record<string, PlatformTypeRegistration> = {
  link: {
    validate: () => ({ platform: 'taobao', url: 'https://example.com' }),
    component: { name: 'StubLink', render: () => null },
    cspOrigins: () => [],
    fallbackUrl: () => 'https://example.com',
  },
}

describe('GiftBookBody', () => {
  it('renders each item with covers before that item links and never hoists links', () => {
    const wrapper = mount(GiftBookBody, {
      props: {
        items: [
          {
            id: 'poster',
            title: { text: '纪念海报' },
            covers: [asset('/poster-front.webp')],
            links: [
              { platform: 'taobao', url: 'https://item.taobao.com/example' },
            ],
            coverOrder: 'before-links' as const,
            linksHoisted: false as const,
          },
          {
            id: 'sticker',
            title: { text: '贴纸' },
            covers: [],
            links: [
              { platform: 'taobao', url: 'https://item.taobao.com/sticker' },
            ],
            coverOrder: 'before-links' as const,
            linksHoisted: false as const,
          },
        ],
        labels: {
          giftItems: zhMessages.giftItems,
          covers: zhMessages.covers,
          platformLinks: zhMessages.platformLinks,
        },
        locale: 'zh',
        mainLocale: 'zh',
        definitions,
        types,
        loadStrategy: 'interaction',
        platformMessages: {
          platformLinks: zhMessages.platformLinks,
          activateEmbed: zhMessages.activateEmbed,
          embedFailed: zhMessages.embedFailed,
          openExternal: zhMessages.openExternal,
        },
      },
      global: {
        stubs: { PlatformLinks: StubPlatformLinks },
      },
    })

    expect(wrapper.find('[data-testid="gift-book-level-links"]').exists()).toBe(
      false,
    )
    const items = wrapper.findAll('[data-testid="gift-item"]')
    expect(items).toHaveLength(2)

    const posterSections = items[0]
      .findAll('[data-item-section]')
      .map((n) => n.attributes('data-item-section'))
    expect(posterSections).toEqual(['covers', 'links'])
    expect(items[0].findAll('[data-testid="gift-item-cover"]')).toHaveLength(1)
    expect(items[0].get('[data-testid="item-links"]').text()).toBe('taobao')

    const stickerSections = items[1]
      .findAll('[data-item-section]')
      .map((n) => n.attributes('data-item-section'))
    expect(stickerSections).toEqual(['links'])
  })
})
