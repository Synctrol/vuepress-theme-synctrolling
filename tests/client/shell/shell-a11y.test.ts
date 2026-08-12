import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import ShellLayout from '../../../src/client/components/ShellLayout.vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { mountShell } from '../harness/mount'

describe('shell accessibility', () => {
  it('opens drawer from header, traps focus context, and closes on Escape with restore', async () => {
    const drawerOpen = ref(false)
    const wrapper = mountShell(ShellLayout, {
      locale: 'en',
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
      attachTo: document.body,
    })

    const menu = wrapper.get('.syn-header__menu')
    await menu.trigger('click')
    expect(drawerOpen.value).toBe(true)
    expect(wrapper.get('.syn-shell').classes()).toContain('syn-shell--drawer-open')
    expect(wrapper.find('.syn-nav-drawer .syn-navigation').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(drawerOpen.value).toBe(false)
  })

  it('gives every social icon link an accessible name', () => {
    const wrapper = mountShell(ShellLayout)
    for (const link of wrapper.findAll('.syn-social-links a')) {
      expect(link.attributes('aria-label')).toBeTruthy()
    }
  })
})
