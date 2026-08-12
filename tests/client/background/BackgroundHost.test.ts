import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import BackgroundHost from '../../../src/client/background/BackgroundHost.vue'
import { BackgroundRuntime } from '../../../src/client/background/runtime'
import { solidProbeLoader, solidProbeLog } from '../../fixtures/backgrounds/solid-probe'

describe('BackgroundHost', () => {
  it('renders a full-bleed host that does not own layout size', () => {
    const runtime = new BackgroundRuntime({ backgrounds: {} })
    const wrapper = mount(BackgroundHost, {
      props: { runtime },
      attachTo: document.body,
    })

    const el = wrapper.get('.syn-background').element as HTMLElement
    const style = getComputedStyle(el)
    expect(style.position).toBe('fixed')
    // happy-dom does not expose CSS `inset` on computed style; assert equivalent edges.
    if (style.inset) {
      expect(style.inset).toBe('0px')
    } else {
      expect(style.top).toBe('0px')
      expect(style.right).toBe('0px')
      expect(style.bottom).toBe('0px')
      expect(style.left).toBe('0px')
    }
    expect(style.pointerEvents).toBe('none')
    expect(style.zIndex).toBe('0')
    expect(el.style.gridArea).toBe('')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.dataset.synBackground).toBe('solid')
    wrapper.unmount()
  })

  it('keeps shell content stacked above the fixed background layer', () => {
    // Mount minimal shell + host so stacking CSS is asserted (shell above z-index:0).
    const runtime = new BackgroundRuntime({ backgrounds: {} })
    const root = document.createElement('div')
    root.innerHTML = `
      <div class="syn-shell">
        <header class="syn-header"></header>
        <main class="syn-main"><section class="cell cell-title">content</section></main>
        <nav class="syn-navigation"></nav>
        <footer class="syn-site-footer"></footer>
      </div>
    `
    document.body.appendChild(root)
    const hostMount = document.createElement('div')
    document.body.appendChild(hostMount)
    const wrapper = mount(BackgroundHost, {
      props: { runtime },
      attachTo: hostMount,
    })

    const bg = getComputedStyle(wrapper.get('.syn-background').element)
    const shell = getComputedStyle(root.querySelector('.syn-shell') as HTMLElement)
    expect(bg.zIndex).toBe('0')
    expect(Number(shell.zIndex)).toBeGreaterThan(Number(bg.zIndex))
    expect(shell.position).toMatch(/relative|sticky|absolute|fixed/)
    wrapper.unmount()
    root.remove()
    hostMount.remove()
  })

  it('initializes only after the host element exists (client mount)', async () => {
    solidProbeLog.length = 0
    const runtime = new BackgroundRuntime({
      backgrounds: { home: solidProbeLoader },
    })
    const wrapper = mount(BackgroundHost, {
      props: {
        runtime,
        syncInput: {
          contentType: 'home' as const,
          route: '/zh/',
          locale: 'zh',
          colorMode: 'light' as const,
          reducedMotion: false,
        },
      },
      attachTo: document.body,
    })
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog[0]).toMatch(/^init:/)
    wrapper.unmount()
    expect(solidProbeLog).toContain('dispose')
  })

  it('disposes to solid when syncInput becomes null', async () => {
    solidProbeLog.length = 0
    const runtime = new BackgroundRuntime({
      backgrounds: { home: solidProbeLoader },
    })
    const syncInput = ref<{
      contentType: 'home'
      route: string
      locale: string
      colorMode: 'light' | 'dark'
      reducedMotion: boolean
    } | null>({
      contentType: 'home',
      route: '/zh/',
      locale: 'zh',
      colorMode: 'light',
      reducedMotion: false,
    })
    const Parent = defineComponent({
      setup() {
        return () =>
          h(BackgroundHost, {
            runtime,
            syncInput: syncInput.value,
          })
      },
    })
    const wrapper = mount(Parent, { attachTo: document.body })
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog[0]).toMatch(/^init:/)

    syncInput.value = null
    await nextTick()
    await Promise.resolve()

    const el = wrapper.get('.syn-background').element as HTMLElement
    expect(solidProbeLog).toContain('dispose')
    expect(el.dataset.synBackground).toBe('solid')
    wrapper.unmount()
  })
})
