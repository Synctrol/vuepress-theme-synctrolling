import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Figure from '../../../src/client/components/Figure.vue'

describe('Figure', () => {
  it('renders the slot with an optional centered caption', () => {
    const wrapper = mount(Figure, {
      props: { caption: '图 1：封面' },
      slots: { default: '<img data-testid="inner" src="/x.png" alt="x">' },
    })
    expect(wrapper.get('.syn-figure').find('[data-testid="inner"]').exists()).toBe(true)
    expect(wrapper.get('.syn-figure__caption').text()).toBe('图 1：封面')

    const bare = mount(Figure, {
      slots: { default: '<img src="/x.png" alt="x">' },
    })
    expect(bare.find('.syn-figure__caption').exists()).toBe(false)
  })
})
