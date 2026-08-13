import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import HeaderBar from '../../../src/client/components/HeaderBar.vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { mountShell } from '../harness/mount'

describe('HeaderBar', () => {
  it('renders localized topbar text and ThemeMode', () => {
    const drawerOpen = ref(false)
    const wrapper = mountShell(HeaderBar, {
      locale: 'zh',
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
    })
    expect(wrapper.text()).toContain('© 2026 Synctrol')
    expect(wrapper.find('.syn-topbar-text').exists()).toBe(true)
    expect(wrapper.find('.syn-theme-mode').exists()).toBe(true)
  })

  it('renders the home button before the topbar text with the locale home href', () => {
    const wrapper = mountShell(HeaderBar, {
      locale: 'en',
      global: {
        provide: {
          [SYNCTROL_DRAWER_OPEN_KEY as symbol]: ref(false),
        },
      },
    })
    const home = wrapper.get('.syn-header__home')
    expect(home.attributes('href')).toBe('/en/')
    expect(home.attributes('aria-label')).toBe('Home')
    expect(home.find('.syn-header__home-icon').exists()).toBe(true)
    const leading = wrapper.get('.syn-header__leading')
    const firstLink = leading.find('.syn-header__home')
    const firstText = leading.findAll('.syn-topbar-text')
    expect(firstLink.exists()).toBe(true)
    expect(firstText.length).toBe(1)
  })

  it('toggles the drawer via the hamburger button', async () => {
    const drawerOpen = ref(false)
    const wrapper = mountShell(HeaderBar, {
      locale: 'en',
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
    })
    const menu = wrapper.get('.syn-header__menu')
    expect(menu.text()).toBe('MENU')
    await menu.trigger('click')
    expect(drawerOpen.value).toBe(true)
    expect(menu.attributes('aria-expanded')).toBe('true')
  })
})
