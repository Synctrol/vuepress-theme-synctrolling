import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ReleaseDetail from '../../../src/client/layouts/ReleaseDetail.vue'
import type { ReleaseDetailModel } from '../../../src/shared/release/types'
import { asset, zhMessages, albumBook } from '../../helpers/release-fixtures'
import { numberDiscs } from '../../../src/shared/release/numbering'
import type { ContentDefinitions } from '../../../src/shared/types'
import type { PlatformTypeRegistration } from '../../../src/shared/options'

vi.mock('vuepress/client', () => ({
  Content: defineComponent({
    name: 'Content',
    setup: () => () => h('div', { 'data-testid': 'vuepress-content' }, 'default'),
  }),
}))

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

const albumModel: ReleaseDetailModel = {
  includedInIndex: true,
  showDraftBadge: true,
  draftLabel: '草稿',
  sections: [
    {
      kind: 'return-link',
      href: '/zh/releases/',
      label: zhMessages.returnToReleases,
    },
    {
      kind: 'title-date',
      title: '第一张专辑',
      date: '2026年8月11日',
      dateLabel: zhMessages.published,
    },
    {
      kind: 'artwork',
      artworkKind: 'artwork',
      artwork: asset('/entry.webp'),
      alt: '第一张专辑',
    },
    {
      kind: 'book-identity',
      bookType: 'album',
      title: { text: '第一张专辑' },
      desc: { text: 'SYNCTROL First Release' },
      authors: ['Synctrol'],
    },
    {
      kind: 'album-body',
      order: ['links', 'covers', 'discs'],
      links: albumBook().album.links ?? [],
      covers: [asset('/front.webp')],
      discs: numberDiscs(albumBook().album.discs ?? []),
      labels: {
        platformLinks: zhMessages.platformLinks,
        covers: zhMessages.covers,
        tracklist: zhMessages.tracklist,
        disc: zhMessages.disc,
        track: zhMessages.track,
      },
    },
    {
      kind: 'markdown',
      bodyLang: 'zh',
    },
  ],
}

const platformMessages = {
  platformLinks: zhMessages.platformLinks,
  activateEmbed: zhMessages.activateEmbed,
  embedFailed: zhMessages.embedFailed,
  openExternal: zhMessages.openExternal,
}

describe('ReleaseDetail layout', () => {
  it('renders sections in the required order with draft badge and Content stub for markdown', () => {
    const wrapper = mount(ReleaseDetail, {
      props: {
        model: albumModel,
        authorsLabel: zhMessages.authors,
        locale: 'zh',
        mainLocale: 'zh',
        definitions,
        types,
        loadStrategy: 'interaction' as const,
        platformMessages,
      },
      global: {
        stubs: {
          PlatformLinks: true,
          Content: {
            name: 'Content',
            render: () => h('div', { 'data-testid': 'vuepress-content' }, '正文'),
          },
        },
      },
    })

    const kinds = wrapper
      .findAll('[data-detail-section]')
      .map((n) => n.attributes('data-detail-section'))
    expect(kinds).toEqual([
      'return-link',
      'title-date',
      'artwork',
      'book-identity',
      'album-body',
      'markdown',
    ])
    expect(wrapper.get('[data-testid="draft-badge"]').text()).toBe('草稿')
    expect(wrapper.find('script[type="application/ld+json"]').exists()).toBe(false)
    expect(wrapper.find('.syn-release-detail-artwork').exists()).toBe(true)
    expect(wrapper.get('[data-testid="vuepress-content"]').text()).toBe('正文')
  })

  it('renders markdown-only releases without book sections or JSON-LD', () => {
    const model: ReleaseDetailModel = {
      includedInIndex: true,
      showDraftBadge: false,
      draftLabel: '草稿',
      sections: [
        {
          kind: 'return-link',
          href: '/zh/releases/',
          label: zhMessages.returnToReleases,
        },
        {
          kind: 'title-date',
          title: '笔记',
          date: '2026-08-11',
          dateLabel: zhMessages.published,
        },
        {
          kind: 'artwork',
          artworkKind: 'empty-frame',
          alt: '笔记',
        },
        {
          kind: 'markdown',
          bodyLang: 'zh',
        },
      ],
    }
    const wrapper = mount(ReleaseDetail, {
      props: {
        model,
        authorsLabel: zhMessages.authors,
        locale: 'zh',
        mainLocale: 'zh',
        definitions,
        types,
        loadStrategy: 'interaction' as const,
        platformMessages,
      },
      global: {
        stubs: {
          Content: {
            name: 'Content',
            render: () =>
              h('div', { 'data-testid': 'vuepress-content' }, '仅 Markdown'),
          },
        },
      },
    })
    expect(wrapper.find('[data-testid="book-identity"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="album-book-body"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="gift-book-body"]').exists()).toBe(false)
    expect(wrapper.find('script[type="application/ld+json"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="vuepress-content"]').text()).toBe('仅 Markdown')
  })
})
