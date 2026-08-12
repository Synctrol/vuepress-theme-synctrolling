import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import ShellLayout from '../../../src/client/components/ShellLayout.vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { mountShell } from '../harness/mount'

describe('ShellLayout', () => {
  it('composes header main navigation footer docks and drawer chrome', () => {
    const drawerOpen = ref(false)
    const wrapper = mountShell(ShellLayout, {
      locale: 'zh',
      slots: {
        default: '<p class="syn-main-probe">Main content</p>',
      },
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
    })

    expect(wrapper.find('.syn-header').exists()).toBe(true)
    expect(wrapper.find('.syn-main').exists()).toBe(true)
    expect(wrapper.find('.syn-navigation').exists()).toBe(true)
    expect(wrapper.find('.syn-site-footer').exists()).toBe(true)
    expect(wrapper.find('.syn-shell__dock').exists()).toBe(true)
    expect(wrapper.find('.syn-social-links').exists()).toBe(true)
    expect(wrapper.find('.syn-language').exists()).toBe(true)
    expect(wrapper.find('.syn-nav-drawer').exists()).toBe(true)
    expect(wrapper.text()).toContain('Main content')
  })

  it('marks drawer-open state on the shell root for CSS dock hiding', async () => {
    const drawerOpen = ref(true)
    const wrapper = mountShell(ShellLayout, {
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
    })
    expect(wrapper.get('.syn-shell').classes()).toContain('syn-shell--drawer-open')
  })
})
