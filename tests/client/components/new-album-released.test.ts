import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NewAlbumReleased from '../../../src/client/components/home/NewAlbumReleased.vue'

vi.mock('../../../src/client/assets/resolve-content-asset.js', () => ({
  resolveContentAsset: (ref: string) => `/assets/content/home/${ref.replace('./assets/', '')}.hash.webp`,
}))

describe('NewAlbumReleased', () => {
  it('renders the resolved cover with title and intro text', () => {
    const wrapper = mount(NewAlbumReleased, {
      props: {
        title: 'NO.9 MUSEUM',
        text: '九号博物馆原声带',
        cover: './assets/new-album.svg',
      },
    })
    expect(wrapper.find('[data-testid="new-album-released"]').exists()).toBe(true)
    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('/assets/content/home/new-album.svg.hash.webp')
    expect(img.attributes('alt')).toBe('NO.9 MUSEUM')
    expect(wrapper.get('.syn-new-album__title').text()).toBe('NO.9 MUSEUM')
    expect(wrapper.get('.syn-new-album__intro').text()).toBe('九号博物馆原声带')
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('links the cover when href is provided and hides the intro when omitted', () => {
    const wrapper = mount(NewAlbumReleased, {
      props: { title: 'NO.9 MUSEUM', href: '/zh/releases/demo/', cover: './assets/new-album.svg' },
    })
    expect(wrapper.get('a').attributes('href')).toBe('/zh/releases/demo/')
    expect(wrapper.find('.syn-new-album__intro').exists()).toBe(false)
  })
})
