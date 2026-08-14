import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Figure from '../../../src/client/components/Figure.vue'

vi.mock('../../../src/client/assets/resolve-content-asset.js', () => ({
  resolveContentAsset: (ref: string) => {
    if (ref.includes('nope')) throw new Error('unknown asset')
    return `/assets/content/news/${ref.replace('./assets/', '')}.hash.svg`
  },
}))

describe('Figure', () => {
  it('renders the resolved image with an optional centered caption', () => {
    const wrapper = mount(Figure, {
      props: { src: './assets/sample.svg', alt: '示例图片', caption: '图 1：封面' },
    })
    const img = wrapper.get('.syn-figure img')
    expect(img.attributes('src')).toBe('/assets/content/news/sample.svg.hash.svg')
    expect(img.attributes('alt')).toBe('示例图片')
    expect(wrapper.get('.syn-figure__caption').text()).toBe('图 1：封面')
  })

  it('falls back to the caption for alt and hides the caption when omitted', () => {
    const bare = mount(Figure, {
      props: { src: './assets/sample.svg', caption: '唯一说明' },
    })
    expect(bare.get('img').attributes('alt')).toBe('唯一说明')
    expect(bare.find('.syn-figure__caption').exists()).toBe(true)

    const none = mount(Figure, {
      props: { src: './assets/sample.svg' },
    })
    expect(none.get('img').attributes('alt')).toBe('')
    expect(none.find('.syn-figure__caption').exists()).toBe(false)
  })

  it('warns and renders no image for an unknown asset', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(Figure, {
      props: { src: './assets/nope.svg' },
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
