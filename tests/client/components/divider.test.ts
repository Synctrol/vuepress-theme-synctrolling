import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Divider from '../../../src/client/components/Divider.vue'

describe('Divider', () => {
  it('renders an optional label between the rules', () => {
    const withLabel = mount(Divider, {
      slots: { default: '更多内容' },
    })
    expect(withLabel.get('.syn-divider').get('.syn-divider__label').text()).toBe('更多内容')

    const bare = mount(Divider)
    expect(bare.find('.syn-divider__label').exists()).toBe(false)
  })
})
