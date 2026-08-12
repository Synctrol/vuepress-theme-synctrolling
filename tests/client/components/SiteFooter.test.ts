import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import SiteFooter from '../../../src/client/components/SiteFooter.vue'
import { mountShell } from '../harness/mount'

describe('SiteFooter', () => {
  it('renders an empty reserved region by default', () => {
    const wrapper = mountShell(SiteFooter)
    expect(wrapper.get('footer.syn-site-footer').text().trim()).toBe('')
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('projects slot content for a future home-footer formatter', () => {
    const wrapper = mountShell(SiteFooter, {
      slots: {
        default: () => h('p', 'Home footer stub'),
      },
    })
    expect(wrapper.text()).toContain('Home footer stub')
  })
})
