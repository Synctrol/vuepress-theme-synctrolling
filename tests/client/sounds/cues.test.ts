import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import HeaderBar from '../../../src/client/components/HeaderBar.vue'
import ThemeMode from '../../../src/client/components/ThemeMode.vue'
import Accordion from '../../../src/client/components/Accordion.vue'
import TabView from '../../../src/client/components/release/TabView.vue'
import TabPanel from '../../../src/client/components/release/TabPanel.vue'
import NavDrawer from '../../../src/client/components/NavDrawer.vue'
import LanguageSwitcher from '../../../src/client/components/LanguageSwitcher.vue'
import { PlatformEmbed } from '../../../src/client/components/platforms/PlatformEmbed'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../../../src/client/composables/keys'
import { SYNCTROL_DRAWER_REQUEST_CLOSE } from '../../../src/client/components/drawer-events'
import { SoundsEngine } from '../../../src/client/sounds/engine'
import type { AudioContextLike } from '../../../src/client/sounds/engine'
import { setSoundsRuntimeForTesting } from '../../../src/client/sounds/runtime'
import type { SoundKey } from '../../../src/shared/options'
import { mountShell } from '../harness/mount'

class SpyEngine extends SoundsEngine {
  readonly played: SoundKey[] = []

  constructor() {
    super({
      storage: { getItem: () => null, setItem: () => {} },
      enabledFallback: true,
      urls: {},
      absoluteUrls: {},
      createContext: () => null as unknown as AudioContextLike,
      fetchBuffer: async () => new ArrayBuffer(0),
    })
  }

  override isEnabled(): boolean {
    return true
  }

  override play(key: SoundKey): void {
    this.played.push(key)
  }
}

function installSpy(): SpyEngine {
  const spy = new SpyEngine()
  setSoundsRuntimeForTesting(spy)
  return spy
}

beforeAll(() => {
  const data = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value)
      },
    },
  })
})

afterEach(() => {
  setSoundsRuntimeForTesting(null)
})

describe('ThemeMode cue', () => {
  it('plays themeCycle on click', async () => {
    const spy = installSpy()
    const wrapper = mountShell(ThemeMode)
    await wrapper.get('.syn-theme-mode__button').trigger('click')
    expect(spy.played).toEqual(['themeCycle'])
  })
})

describe('Accordion cue', () => {
  it('plays accordionToggle on each open and close', async () => {
    const spy = installSpy()
    const wrapper = mountShell(Accordion, { props: { label: '资料' } })
    const header = wrapper.get('.syn-accordion__header')
    await header.trigger('click')
    await header.trigger('click')
    expect(spy.played).toEqual(['accordionToggle', 'accordionToggle'])
  })
})

describe('TabView cue', () => {
  it('plays tabSelect only on a real panel switch', async () => {
    const spy = installSpy()
    const wrapper = mountShell(TabView, {
      slots: {
        default: [h(TabPanel, { label: '试听' }), h(TabPanel, { label: '获取' })],
      },
    })
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(2)
    await tabs[1]!.trigger('click')
    expect(spy.played).toEqual(['tabSelect'])
    await tabs[0]!.trigger('click')
    expect(spy.played).toEqual(['tabSelect', 'tabSelect'])
    await tabs[0]!.trigger('click')
    expect(spy.played).toEqual(['tabSelect', 'tabSelect'])
  })
})

describe('HeaderBar drawer cues', () => {
  it('plays menuOpen then menuClose via the hamburger', async () => {
    const spy = installSpy()
    const drawerOpen = ref(false)
    const wrapper = mountShell(HeaderBar, {
      locale: 'en',
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
    })
    const menu = wrapper.get('.syn-header__menu')
    await menu.trigger('click')
    expect(spy.played).toEqual(['menuOpen'])
    await menu.trigger('click')
    expect(spy.played).toEqual(['menuOpen', 'menuClose'])
  })
})

describe('NavDrawer close cue', () => {
  it('closes and plays menuClose on a drawer-request-close event', async () => {
    const spy = installSpy()
    const drawerOpen = ref(true)
    const wrapper = mountShell(NavDrawer, {
      locale: 'en',
      global: {
        provide: { [SYNCTROL_DRAWER_OPEN_KEY as symbol]: drawerOpen },
      },
    })
    const drawer = wrapper.get('.syn-nav-drawer')
    drawer.element.dispatchEvent(
      new CustomEvent(SYNCTROL_DRAWER_REQUEST_CLOSE, { bubbles: true }),
    )
    await nextTick()
    expect(drawerOpen.value).toBe(false)
    expect(spy.played).toEqual(['menuClose'])
  })
})

describe('LanguageSwitcher cue', () => {
  it('plays localeChange when a language is selected', async () => {
    const spy = installSpy()
    const originalAssign = window.location.assign
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: vi.fn() },
      writable: true,
    })
    try {
      const wrapper = mountShell(LanguageSwitcher, { locale: 'zh' })
      await wrapper.get('.syn-language__toggle').trigger('click')
      const options = wrapper.findAll('.syn-language__option')
      await options[1]!.trigger('click')
      expect(spy.played).toEqual(['localeChange'])
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalAssign ? { ...originalAssign } : window.location,
        writable: true,
      })
    }
  })
})

describe('PlatformEmbed cue', () => {
  it('plays embedActivate exactly once when the embed activates through the button', async () => {
    const spy = installSpy()
    const typeRegistration = {
      validate: (entry: unknown) => entry as never,
      component: () => h('div'),
      cspOrigins: () => [] as string[],
    }
    const wrapper = mountShell(PlatformEmbed as never, {
      props: {
        entry: { url: 'https://example.com/x' },
        platformName: 'YouTube',
        loadStrategy: 'interaction',
        autoActivate: false,
        messages: {
          activateEmbed: 'Play {platform}',
          embedFailed: '{platform} failed to load',
          openExternal: 'Open {platform}',
        },
        typeRegistration,
      },
    })
    const button = wrapper.find('.syn-platform-embed__activate')
    await button.trigger('click')
    expect(spy.played).toEqual(['embedActivate'])
    expect(wrapper.find('.syn-platform-embed__activate').exists()).toBe(false)
  })

  it('stays silent for gesture-free auto activation (initial panel loads)', async () => {
    const spy = installSpy()
    const typeRegistration = {
      validate: (entry: unknown) => entry as never,
      component: () => h('div'),
      cspOrigins: () => [] as string[],
    }
    mountShell(PlatformEmbed as never, {
      props: {
        entry: { url: 'https://example.com/x' },
        platformName: 'SoundCloud',
        loadStrategy: 'interaction',
        autoActivate: true,
        messages: {
          activateEmbed: 'Play {platform}',
          embedFailed: '{platform} failed to load',
          openExternal: 'Open {platform}',
        },
        typeRegistration,
      },
    })
    expect(spy.played).toEqual([])
  })
})
