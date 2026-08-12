import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { PlatformLinks } from '../../../src/client/components/platforms/PlatformLinks'
import { resolvePlatformTypes } from '../../../src/platforms/registry'
import { enMessages } from '../../../src/shared/messages'

describe('PlatformLinks', () => {
  it('renders a labeled list and uses definition names for accessibility', async () => {
    const types = resolvePlatformTypes({})
    const wrapper = mount(PlatformLinks, {
      props: {
        entries: [
          { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
          { platform: 'taobao', url: 'https://item.taobao.com/x' },
        ],
        definitions: {
          youtube: { category: 'digital', type: 'youtube_player', name: 'YouTube' },
          taobao: {
            category: 'physical',
            type: 'link',
            name: { zh: '淘宝', en: 'Taobao' },
          },
        },
        types,
        loadStrategy: 'interaction',
        locale: 'en',
        mainLocale: 'zh',
        messages: {
          platformLinks: enMessages.platformLinks,
          activateEmbed: enMessages.activateEmbed,
          embedFailed: enMessages.embedFailed,
          openExternal: enMessages.openExternal,
        },
      },
    })
    expect(wrapper.get('.syn-platform-links__title').text()).toBe('Listen & Get')
    expect(wrapper.findAll('.syn-platform-links__item')).toHaveLength(2)
    expect(wrapper.get('a.syn-platform-link').attributes('aria-label')).toBe('Taobao')
    const activate = wrapper.get('button.syn-platform-embed__activate')
    expect(activate.attributes('aria-label')).toBe('Play YouTube')
  })
})
