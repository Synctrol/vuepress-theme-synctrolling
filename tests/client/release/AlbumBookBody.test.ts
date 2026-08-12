import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AlbumBookBody from '../../../src/client/components/release/AlbumBookBody.vue'
import { numberDiscs } from '../../../src/shared/release/numbering'
import { albumBook, asset, zhMessages } from '../../helpers/release-fixtures'
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
  template: `<div data-testid="platform-links">{{ entries.length }}</div>`,
}

const definitions: ContentDefinitions['platforms'] = {
  bilibili: {
    category: 'digital',
    type: 'bilibili_player',
    name: { zh: '哔哩哔哩', en: 'Bilibili' },
  },
}

const types: Record<string, PlatformTypeRegistration> = {
  bilibili_player: {
    validate: () => ({ platform: 'bilibili' }),
    component: { name: 'StubPlayer', render: () => null },
    cspOrigins: () => [],
    fallbackUrl: () => 'https://example.com',
  },
}

describe('AlbumBookBody', () => {
  it('renders links, then covers, then discs/tracks in that order', () => {
    const book = albumBook()
    const wrapper = mount(AlbumBookBody, {
      props: {
        links: book.album.links ?? [],
        covers: [asset('/front.webp'), asset('/back.webp')],
        discs: numberDiscs(book.album.discs ?? []),
        labels: {
          platformLinks: zhMessages.platformLinks,
          covers: zhMessages.covers,
          tracklist: zhMessages.tracklist,
          disc: zhMessages.disc,
          track: zhMessages.track,
        },
        mainLocale: 'zh',
        locale: 'zh',
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

    const order = wrapper
      .findAll('[data-section]')
      .map((n) => n.attributes('data-section'))
    expect(order).toEqual(['links', 'covers', 'discs'])

    expect(wrapper.get('[data-testid="platform-links"]').text()).toBe('1')
    expect(wrapper.findAll('[data-testid="album-cover"]')).toHaveLength(2)

    const disc = wrapper.get('#disc-1')
    expect(disc.text()).toContain('第 1 碟')
    const tracks = wrapper.findAll('[data-testid="track-row"]')
    expect(tracks).toHaveLength(2)
    expect(tracks[0].attributes('id')).toBe('disc-1-track-1')
    expect(tracks[0].text()).toContain('第 1 曲')
    expect(tracks[0].text()).toContain('4:32')
    expect(tracks[1].text()).toContain('1:01')
  })
})
