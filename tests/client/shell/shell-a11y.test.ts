import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import ShellLayout from '../../../src/client/components/ShellLayout.vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { mountShell } from '../harness/mount'

async function flushTrapActivate(): Promise<void> {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

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
    const menuEl = menu.element as HTMLButtonElement
    menuEl.focus()
    expect(document.activeElement).toBe(menuEl)

    await menu.trigger('click')
    expect(drawerOpen.value).toBe(true)
    expect(wrapper.get('.syn-shell').classes()).toContain('syn-shell--drawer-open')
    expect(wrapper.find('.syn-nav-drawer .syn-navigation').exists()).toBe(true)

    await flushTrapActivate()
    const closeBtn = wrapper.get('.syn-nav-drawer__close').element as HTMLButtonElement
    expect(document.activeElement).toBe(closeBtn)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(drawerOpen.value).toBe(false)
    expect(wrapper.get('.syn-shell').classes()).not.toContain('syn-shell--drawer-open')
    expect(document.activeElement).toBe(menuEl)

    wrapper.unmount()
  })

  it('gives every social icon link an accessible name', () => {
    const wrapper = mountShell(ShellLayout)
    for (const link of wrapper.findAll('.syn-social-links a')) {
      expect(link.attributes('aria-label')).toBeTruthy()
    }
  })
})
