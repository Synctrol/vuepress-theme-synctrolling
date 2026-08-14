import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Notice from '../../../src/client/components/Notice.vue'

describe('Notice', () => {
  it('renders an optional title with the info default type', () => {
    const wrapper = mount(Notice, {
      props: { title: '发售公告' },
      slots: { default: '<p>正文</p>' },
    })
    expect(wrapper.get('.syn-notice').attributes('data-type')).toBe('info')
    expect(wrapper.get('.syn-notice__title').text()).toBe('发售公告')
    expect(wrapper.get('.syn-notice__body').text()).toBe('正文')
  })

  it('exposes the chosen type and hides the title when omitted', () => {
    const wrapper = mount(Notice, {
      props: { type: 'warning' },
      slots: { default: '<p>只读提醒</p>' },
    })
    expect(wrapper.get('.syn-notice').attributes('data-type')).toBe('warning')
    expect(wrapper.find('.syn-notice__title').exists()).toBe(false)
  })
})
