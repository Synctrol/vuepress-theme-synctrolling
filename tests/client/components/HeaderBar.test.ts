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
