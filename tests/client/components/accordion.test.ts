import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Accordion from '../../../src/client/components/Accordion.vue'

describe('Accordion', () => {
  it('collapses by default and toggles on header click', async () => {
    const wrapper = mount(Accordion, {
      attachTo: document.body,
      props: { label: '常见问题' },
      slots: { default: '<p data-testid="inner">答案</p>' },
    })
    const header = wrapper.get('.syn-accordion__header')
    expect(header.text()).toContain('常见问题')
    expect(header.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="accordion-body"]').isVisible()).toBe(false)
    await header.trigger('click')
    expect(header.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-testid="accordion-body"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="inner"]').text()).toBe('答案')
    wrapper.unmount()
  })

  it('starts open when open prop is set', () => {
    const wrapper = mount(Accordion, {
      attachTo: document.body,
      props: { label: '已展开', open: true },
      slots: { default: '<p>内容</p>' },
    })
    expect(wrapper.get('.syn-accordion__header').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-testid="accordion-body"]').isVisible()).toBe(true)
    wrapper.unmount()
  })
})
