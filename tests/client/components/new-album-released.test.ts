import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NewAlbumReleased from '../../../src/client/components/home/NewAlbumReleased.vue'

vi.mock('../../../src/client/assets/resolve-content-asset.js', () => ({
  resolveContentAsset: (ref: string) => `/assets/content/home/${ref.replace('./assets/', '')}.hash.svg`,
}))

describe('NewAlbumReleased', () => {
  it('renders a fully clickable block with title, arrow and intro', () => {
    const wrapper = mount(NewAlbumReleased, {
      props: {
        title: 'NO.9 MUSEUM',
        text: '九号博物馆原声带',
        href: '/zh/releases/demo/',
        background: './assets/new-album.svg',
      },
    })
    const root = wrapper.get('[data-testid="new-album-released"]')
    expect(root.element.tagName).toBe('A')
    expect(root.attributes('href')).toBe('/zh/releases/demo/')
    expect(root.get('.syn-new-album__title').text()).toContain('NO.9 MUSEUM')
    expect(root.get('.syn-new-album__arrow').text()).toBe('↗')
    expect(root.get('.syn-new-album__intro').text()).toBe('九号博物馆原声带')
    const rootStyle = (wrapper.vm as unknown as {
      rootStyle: { backgroundImage?: string }
    }).rootStyle
    expect(rootStyle.backgroundImage).toContain('new-album.svg.hash.svg')
    expect(root.find('img').exists()).toBe(false)
    expect(root.find('a.syn-new-album__cover').exists()).toBe(false)
  })

  it('renders a non-clickable block without href and hides the intro when omitted', () => {
    const wrapper = mount(NewAlbumReleased, {
      props: { title: 'NO.9 MUSEUM', background: './assets/new-album.svg' },
    })
    const root = wrapper.get('[data-testid="new-album-released"]')
    expect(root.element.tagName).toBe('DIV')
    expect(root.find('.syn-new-album__intro').exists()).toBe(false)
  })
})
