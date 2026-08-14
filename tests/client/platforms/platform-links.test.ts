import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { PlatformLinks } from '../../../src/client/components/platforms/PlatformLinks'
import { resolvePlatformTypes } from '../../../src/platforms/registry'
import { enMessages } from '../../../src/shared/messages'
import type { ContentDefinitions, NormalizedPlatformEntry } from '../../../src/shared/types'

const types = resolvePlatformTypes({})

const baseProps = {
  entries: [
    { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
    { platform: 'taobao', url: 'https://item.taobao.com/x' },
  ] as NormalizedPlatformEntry[],
  definitions: {
    youtube: { category: 'digital', type: 'youtube_player', name: 'YouTube' },
    taobao: {
      category: 'physical',
      type: 'link',
      name: { zh: '淘宝', en: 'Taobao' },
    },
  } as ContentDefinitions['platforms'],
  types,
  loadStrategy: 'interaction' as const,
  locale: 'en',
  mainLocale: 'zh',
  messages: {
    platformLinks: enMessages.platformLinks,
    activateEmbed: enMessages.activateEmbed,
    embedFailed: enMessages.embedFailed,
    openExternal: enMessages.openExternal,
  },
}

describe('PlatformLinks', () => {
  it('renders a labeled list and uses definition names for accessibility', async () => {
    const wrapper = mount(PlatformLinks, { props: baseProps })
    expect(wrapper.get('.syn-platform-links__title').text()).toBe('Listen & Get')
    expect(wrapper.findAll('.syn-platform-links__item')).toHaveLength(2)
    expect(wrapper.get('a.syn-platform-link').attributes('aria-label')).toBe('Taobao')
    const activate = wrapper.get('button.syn-platform-embed__activate')
    expect(activate.attributes('aria-label')).toBe('Play YouTube')
  })

  it('uses the optional title prop for the section heading and aria-label', async () => {
    const wrapper = mount(PlatformLinks, {
      props: { ...baseProps, title: 'Preview' },
    })
    expect(wrapper.get('.syn-platform-links__title').text()).toBe('Preview')
    expect(wrapper.get('section').attributes('aria-label')).toBe('Preview')
  })
})
