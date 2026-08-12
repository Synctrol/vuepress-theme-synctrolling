import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { PlatformEmbed } from '../../../src/client/components/platforms/PlatformEmbed'
import { enMessages } from '../../../src/shared/messages'

const FakePlayer = defineComponent({
  name: 'FakePlayer',
  props: {
    entry: { type: Object, required: true },
    title: { type: String, required: true },
  },
  emits: ['error'],
  setup(props) {
    return () =>
      h('iframe', {
        title: props.title,
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      })
  },
})

const messages = {
  activateEmbed: enMessages.activateEmbed,
  embedFailed: enMessages.embedFailed,
  openExternal: enMessages.openExternal,
}

describe('PlatformEmbed', () => {
  it('interaction strategy shows activate control and loads only after click', async () => {
    const wrapper = mount(PlatformEmbed, {
      props: {
        entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
        platformName: 'YouTube',
        loadStrategy: 'interaction',
        messages,
        typeRegistration: {
          validate: (e: unknown) => e as never,
          component: FakePlayer,
          cspOrigins: () => ['https://www.youtube.com'],
          fallbackUrl: () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      },
    })
    expect(wrapper.find('iframe').exists()).toBe(false)
    const button = wrapper.get('button')
    expect(button.text()).toBe('Play YouTube')
    expect(button.attributes('aria-label')).toBe('Play YouTube')
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(true)
    expect(wrapper.find('iframe').attributes('title')).toBe('YouTube')
  })

  it('viewport strategy loads when intersecting', async () => {
    let observerCallback: IntersectionObserverCallback = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          observerCallback = cb
        }
        observe() {}
        disconnect() {}
        unobserve() {}
        takeRecords() {
          return []
        }
        root = null
        rootMargin = ''
        thresholds = []
      },
    )

    const wrapper = mount(PlatformEmbed, {
      props: {
        entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
        platformName: 'YouTube',
        loadStrategy: 'viewport',
        messages,
        typeRegistration: {
          validate: (e: unknown) => e as never,
          component: FakePlayer,
          cspOrigins: () => ['https://www.youtube.com'],
          fallbackUrl: () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      },
      attachTo: document.body,
    })
    expect(wrapper.find('iframe').exists()).toBe(false)
    observerCallback(
      [{ isIntersecting: true, target: wrapper.element } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
    await nextTick()
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(true)
    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('failure falls back to external link when fallbackUrl exists', async () => {
    const Broken = defineComponent({
      name: 'BrokenPlayer',
      props: {
        entry: { type: Object, required: true },
        title: { type: String, required: true },
      },
      emits: ['error'],
      setup(_, { emit }) {
        emit('error')
        return () => h('div')
      },
    })
    const wrapper = mount(PlatformEmbed, {
      props: {
        entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
        platformName: 'YouTube',
        loadStrategy: 'interaction',
        messages,
        typeRegistration: {
          validate: (e: unknown) => e as never,
          component: Broken,
          cspOrigins: () => ['https://www.youtube.com'],
          fallbackUrl: () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      },
    })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(link.text()).toContain('YouTube failed to load')
    expect(link.attributes('aria-label')).toBe('Open YouTube')
  })
})
