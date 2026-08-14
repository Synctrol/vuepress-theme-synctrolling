import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../../../src/client/components/Button.vue'

describe('Button', () => {
  it('renders an anchor when href is provided', () => {
    const wrapper = mount(Button, {
      props: { href: '/docs/' },
      slots: { default: '阅读更多' },
    })
    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('/docs/')
    expect(link.classes()).toContain('syn-button')
    expect(link.text()).toBe('阅读更多')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('renders a plain button without href', () => {
    const wrapper = mount(Button, {
      slots: { default: '订阅' },
    })
    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).toContain('syn-button')
    expect(button.text()).toBe('订阅')
    expect(wrapper.find('a').exists()).toBe(false)
  })
})
