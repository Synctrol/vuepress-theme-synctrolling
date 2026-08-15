import { describe, expect, it } from 'vitest'
import Button from '../../../src/client/components/Button.vue'
import { mountShell } from '../harness/mount'

describe('Button', () => {
  it('resolves an internal href against the current locale', () => {
    const wrapper = mountShell(Button, {
      locale: 'en',
      props: { href: '/docs/' },
      slots: { default: 'Read more' },
    })
    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('/en/docs/')
    expect(link.classes()).toContain('syn-button')
    expect(link.text()).toBe('Read more')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('passes external hrefs through unchanged', () => {
    const wrapper = mountShell(Button, {
      props: { href: 'https://example.com/' },
      slots: { default: 'Learn more' },
    })
    expect(wrapper.get('a').attributes('href')).toBe('https://example.com/')
  })

  it('renders a plain button without href', () => {
    const wrapper = mountShell(Button, {
      slots: { default: '订阅' },
    })
    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).toContain('syn-button')
    expect(button.text()).toBe('订阅')
    expect(wrapper.find('a').exists()).toBe(false)
  })
})
