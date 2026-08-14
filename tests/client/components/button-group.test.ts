import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ButtonGroup from '../../../src/client/components/ButtonGroup.vue'

describe('ButtonGroup', () => {
  it('renders its slot content with a left default alignment', () => {
    const wrapper = mount(ButtonGroup, {
      slots: { default: '<span class="probe">one</span>' },
    })
    const root = wrapper.get('.syn-button-group')
    expect(root.attributes('data-align')).toBe('left')
    expect(root.get('.probe').text()).toBe('one')
  })

  it.each(['center', 'right', 'stretch'] as const)(
    'exposes the %s alignment via data-align',
    (align) => {
      const wrapper = mount(ButtonGroup, {
        props: { align },
        slots: { default: '<span>one</span>' },
      })
      expect(wrapper.get('.syn-button-group').attributes('data-align')).toBe(align)
    },
  )
})
