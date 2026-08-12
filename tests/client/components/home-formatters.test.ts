/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HomeFooterSlot from '../../../src/client/components/home/HomeFooterSlot.vue'
import HomeLogoSlot from '../../../src/client/components/home/HomeLogoSlot.vue'

describe('Home formatter slots', () => {
  it('renders logo HTML and ignores SEO title', () => {
    const wrapper = mount(HomeLogoSlot, {
      props: {
        html: '<div data-syn-formatter="home-logo"><h1>SYNCTROL</h1></div>',
        seoTitle: 'Home SEO',
      },
    })
    expect(wrapper.find('[data-testid="home-logo"]').html()).toContain('SYNCTROL')
    expect(wrapper.text()).not.toContain('Home SEO')
  })

  it('renders optional footer HTML or empty content', () => {
    expect(mount(HomeFooterSlot, { props: { html: undefined } }).find('[data-testid="home-footer"]').text()).toBe('')
    expect(mount(HomeFooterSlot, { props: { html: '<p>Contact</p>' } }).text()).toContain('Contact')
  })
})
