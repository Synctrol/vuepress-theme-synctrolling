import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
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
    // Mount minimal shell + host so stacking CSS is asserted (content above z-index:0).
    const runtime = new BackgroundRuntime({ backgrounds: {} })
    const root = document.createElement('div')
    root.innerHTML = `
      <div class="syn-shell">
        <header class="syn-header"></header>
        <main class="syn-main"><div class="syn-main__inner">content</div></main>
        <nav class="syn-navigation"></nav>
        <footer class="syn-site-footer"></footer>
        <div class="syn-shell__dock"></div>
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
    const main = getComputedStyle(root.querySelector('.syn-main') as HTMLElement)
    const header = getComputedStyle(root.querySelector('.syn-header') as HTMLElement)
    expect(bg.zIndex).toBe('0')
    expect(Number(main.zIndex)).toBeGreaterThan(Number(bg.zIndex))
    expect(Number(header.zIndex)).toBeGreaterThan(Number(bg.zIndex))
    expect(main.position).toMatch(/relative|sticky|absolute|fixed/)
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
})
