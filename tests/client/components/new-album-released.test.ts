import { describe, expect, it, vi } from 'vitest'
import NewAlbumReleased from '../../../src/client/components/home/NewAlbumReleased.vue'
import { mountShell } from '../harness/mount'

vi.mock('../../../src/client/assets/resolve-content-asset.js', () => ({
  resolveContentAsset: (ref: string) =>
    `/assets/content/home/${ref.replace('./assets/', '')}.hash.svg`,
}))

describe('NewAlbumReleased', () => {
  it('renders a fully clickable block with a locale-resolved href', () => {
    const wrapper = mountShell(NewAlbumReleased, {
      locale: 'zh',
      props: {
        title: 'NO.9 MUSEUM',
        text: '九号博物馆原声带',
        href: '/releases/demo/',
        background: './assets/new-album.svg',
      },
    })
    const root = wrapper.get('[data-testid="new-album-released"]')
    expect(root.element.tagName).toBe('A')
    expect(root.attributes('href')).toBe('/zh/releases/demo/')
    expect(root.find('.syn-new-album__body').exists()).toBe(true)
    expect(root.get('.syn-new-album__title').text()).toContain('NO.9 MUSEUM')
    expect(root.get('.syn-new-album__arrow').text()).toBe('↗')
    expect(root.get('.syn-new-album__intro').text()).toBe('九号博物馆原声带')
    const rootStyle = (wrapper.vm as unknown as {
      rootStyle: Record<string, string | undefined>
    }).rootStyle
    expect(rootStyle['--syn-new-album-image']).toContain('new-album.svg.hash.svg')
    expect(rootStyle['--syn-new-album-position']).toBe('right center')
    expect(root.find('img').exists()).toBe(false)
    expect(root.find('a.syn-new-album__cover').exists()).toBe(false)
  })

  it('passes external hrefs through unchanged', () => {
    const wrapper = mountShell(NewAlbumReleased, {
      props: {
        title: 'NO.9 MUSEUM',
        href: 'https://example.com/',
        background: './assets/new-album.svg',
      },
    })
    expect(
      wrapper.get('[data-testid="new-album-released"]').attributes('href'),
    ).toBe('https://example.com/')
  })

  it('honors a custom background position', () => {
    const wrapper = mountShell(NewAlbumReleased, {
      props: {
        title: 'NO.9 MUSEUM',
        background: './assets/new-album.svg',
        position: '80% 20%',
      },
    })
    const rootStyle = (wrapper.vm as unknown as {
      rootStyle: Record<string, string | undefined>
    }).rootStyle
    expect(rootStyle['--syn-new-album-position']).toBe('80% 20%')
  })

  it('renders a non-clickable block without href and hides the intro when omitted', () => {
    const wrapper = mountShell(NewAlbumReleased, {
      props: { title: 'NO.9 MUSEUM', background: './assets/new-album.svg' },
    })
    const root = wrapper.get('[data-testid="new-album-released"]')
    expect(root.element.tagName).toBe('DIV')
    expect(root.find('.syn-new-album__intro').exists()).toBe(false)
  })
})
