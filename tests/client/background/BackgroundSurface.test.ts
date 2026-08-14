import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import BackgroundSurface from '../../../src/client/background/BackgroundSurface.vue'
import { BackgroundRuntime } from '../../../src/client/background/runtime'
import { solidProbeLoader, solidProbeLog } from '../../fixtures/backgrounds/solid-probe'
import type {
  BackgroundRequest,
  PageContentType,
} from '../../../src/shared/background'
import type { ContentType } from '../../../src/shared/types'

function makeRuntime() {
  const route = ref<{ path: string; identity?: string }>({ path: '' })
  const contentType = ref<{ raw: PageContentType; resolved: ContentType }>({
    raw: 'home',
    resolved: 'home',
  })
  const locale = ref('zh')
  const colorMode = ref<'light' | 'dark'>('light')
  const reducedMotion = ref(false)
  const runtime = new BackgroundRuntime({
    loader: solidProbeLoader,
    context: { route, contentType, locale, colorMode, reducedMotion },
  })
  return runtime
}

function makeRequest(routePath = '/zh/'): BackgroundRequest {
  return {
    reason: 'navigate',
    routePath,
    contentType: { raw: 'home', resolved: 'home' },
    locale: 'zh',
    colorMode: 'light',
    reducedMotion: false,
  }
}

describe('BackgroundSurface', () => {
  it('renders a full-bleed host that does not own layout size', () => {
    const runtime = new BackgroundRuntime({
      context: {
        route: ref({ path: '' }),
        contentType: ref<{ raw: PageContentType; resolved: ContentType }>({
          raw: 'page',
          resolved: 'page',
        }),
        locale: ref(''),
        colorMode: ref<'light' | 'dark'>('light'),
        reducedMotion: ref(false),
      },
    })
    const wrapper = mount(BackgroundSurface, {
      props: { runtime, requestInput: null },
      attachTo: document.body,
    })

    const el = wrapper.get('.syn-background').element as HTMLElement
    const style = getComputedStyle(el)
    expect(style.position).toBe('fixed')
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
    const runtime = new BackgroundRuntime({
      context: {
        route: ref({ path: '' }),
        contentType: ref<{ raw: PageContentType; resolved: ContentType }>({
          raw: 'page',
          resolved: 'page',
        }),
        locale: ref(''),
        colorMode: ref<'light' | 'dark'>('light'),
        reducedMotion: ref(false),
      },
    })
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
    const wrapper = mount(BackgroundSurface, {
      props: { runtime, requestInput: null },
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

  it('sends an init request on mount and disposes on unmount', async () => {
    solidProbeLog.length = 0
    const runtime = makeRuntime()
    const wrapper = mount(BackgroundSurface, {
      props: { runtime, requestInput: makeRequest('/zh/') },
      attachTo: document.body,
    })
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    expect(solidProbeLog[0]).toMatch(/^init:/)
    expect(solidProbeLog[1]).toMatch(/^request:init:/)
    wrapper.unmount()
    expect(solidProbeLog).toContain('dispose')
  })

  it('forwards navigation requests when requestInput changes', async () => {
    solidProbeLog.length = 0
    const runtime = makeRuntime()
    const requestInput = ref<BackgroundRequest | null>(makeRequest('/zh/'))
    const Parent = defineComponent({
      setup() {
        return () =>
          h(BackgroundSurface, {
            runtime,
            requestInput: requestInput.value,
          })
      },
    })
    const wrapper = mount(Parent, { attachTo: document.body })
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    expect(solidProbeLog.filter((e) => e.startsWith('request:')).length).toBe(1)

    requestInput.value = makeRequest('/zh/releases/')
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog.at(-1)).toMatch(/^request:navigate:\/zh\/releases\//)
    expect(solidProbeLog.filter((e) => e.startsWith('init:')).length).toBe(1)
    wrapper.unmount()
  })

  it('does not request when requestInput is null', async () => {
    solidProbeLog.length = 0
    const runtime = makeRuntime()
    const wrapper = mount(BackgroundSurface, {
      props: { runtime, requestInput: null },
      attachTo: document.body,
    })
    await nextTick()
    await Promise.resolve()
    expect(solidProbeLog).toEqual([])
    expect(
      (wrapper.get('.syn-background').element as HTMLElement).dataset
        .synBackground,
    ).toBe('solid')
    wrapper.unmount()
  })
})
