import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import NavDrawer from '../../../src/client/components/NavDrawer.vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { mountShell } from '../harness/mount'

async function flushTrapActivate(): Promise<void> {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

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

  it('activates focus trap on mount when already open and includes Close', async () => {
    const drawerOpen = ref(true)
    const wrapper = mountShell(NavDrawer, {
      locale: 'en',
      attachTo: document.body,
      global: {
        provide: {
          [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen,
        },
      },
    })

    await flushTrapActivate()

    const dialog = wrapper.get('[role="dialog"]').element as HTMLElement
    const closeBtn = wrapper.get('.syn-nav-drawer__close').element as HTMLButtonElement
    const links = wrapper.findAll('.syn-navigation__link')
    expect(links.length).toBeGreaterThan(0)
    const lastLink = links[links.length - 1]!.element as HTMLAnchorElement

    // Trap container is the dialog root so Close is first focusable
    expect(document.activeElement).toBe(closeBtn)

    lastLink.focus()
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    )
    expect(document.activeElement).toBe(closeBtn)

    wrapper.unmount()
  })

  it('cancels pending trap activate when closed before rAF', async () => {
    document.body.innerHTML = '<button id="outside">outside</button>'
    const outside = document.getElementById('outside') as HTMLButtonElement
    outside.focus()

    const drawerOpen = ref(false)
    const wrapper = mountShell(NavDrawer, {
      locale: 'en',
      attachTo: document.body,
      global: {
        provide: {
          [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen,
        },
      },
    })

    drawerOpen.value = true
    await nextTick()
    drawerOpen.value = false
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const closeBtn = wrapper.get('.syn-nav-drawer__close').element as HTMLButtonElement
    expect(document.activeElement).not.toBe(closeBtn)
    expect(document.activeElement).toBe(outside)

    wrapper.unmount()
  })
})
