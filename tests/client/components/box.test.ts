import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Box from '../../../src/client/components/Box.vue'

describe('Box', () => {
  it('wraps slot content in the bordered shell', () => {
    const wrapper = mount(Box, {
      slots: { default: '<p data-testid="inner">内容</p>' },
    })
    expect(wrapper.get('.syn-box').get('[data-testid="inner"]').text()).toBe('内容')
  })
})
