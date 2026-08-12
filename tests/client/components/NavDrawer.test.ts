import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import NavDrawer from '../../../src/client/components/NavDrawer.vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { mountShell } from '../harness/mount'

describe('NavDrawer', () => {
  it('renders Navigation only when open and closes on Escape', async () => {
    const drawerOpen = ref(true)
    const wrapper = mountShell(NavDrawer, {
      locale: 'en',
      global: {
        provide: {
          [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen,
        },
      },
    })

    expect(wrapper.find('.syn-navigation').exists()).toBe(true)
    expect(wrapper.find('.syn-site-footer').exists()).toBe(false)
    expect(wrapper.find('.syn-main').exists()).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(drawerOpen.value).toBe(false)
  })

  it('exposes dialog semantics while open', () => {
    const drawerOpen = ref(true)
    const wrapper = mountShell(NavDrawer, {
      locale: 'en',
      global: {
        provide: {
          [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen,
        },
      },
    })
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
  })
})
