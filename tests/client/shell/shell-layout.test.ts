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
    expect(wrapper.find('.syn-shell__dock').exists()).toBe(false)
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

  it('renders the content container as a section and the language switcher inside the footer', () => {
    const wrapper = mountShell(ShellLayout, {
      slots: { default: '<p class="syn-main-probe">Body</p>' },
    })
    const main = wrapper.get('main.syn-main')
    const section = main.find('section.cell.cell-title')
    expect(section.exists()).toBe(true)
    expect(section.find('.syn-main-probe').exists()).toBe(true)
    // The drawer overlays the main area (bars and shell borders stay visible)
    expect(main.find('.syn-nav-drawer').exists()).toBe(true)
    const footer = wrapper.get('footer.syn-site-footer')
    expect(footer.find('.syn-language').exists()).toBe(true)
    expect(footer.find('.syn-social-links').exists()).toBe(true)
    // Language switcher lives only in the footer bar (the drawer has none)
    expect(wrapper.findAll('.syn-language')).toHaveLength(1)
    expect(wrapper.findAll('.syn-social-links')).toHaveLength(1)
  })
})
