import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import Root from '../../../src/client/layouts/Root.vue'
import { fixtureThemeOptions } from '../harness/fixtures'
import { SYNCTROL_THEME_OPTIONS_KEY } from '../../../src/client/composables/keys'
import { LOCALE_STORAGE_KEY } from '../../../src/shared/locale-storage'

vi.mock('vuepress/client', () => {
  return {
    useData: () => ({ siteData: { value: { base: '/' } } }),
  }
})

function stubLocationReplace(): ReturnType<typeof vi.fn> {
  const replace = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, replace },
  })
  return replace
}

describe('Root layout (language router)', () => {
  it('redirects with a client-side replace to the stored locale home', async () => {
    const replace = stubLocationReplace()
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    const theme = fixtureThemeOptions()
    mount(Root, {
      global: {
        provide: { [SYNCTROL_THEME_OPTIONS_KEY as symbol]: theme },
      },
    })
    await nextTick()
    expect(replace).toHaveBeenCalledWith('/en/')
  })

  it('falls back to the browser language when nothing is stored', async () => {
    const replace = stubLocationReplace()
    localStorage.removeItem(LOCALE_STORAGE_KEY)
    vi.stubGlobal('navigator', {
      languages: ['zh-CN', 'en'],
      language: 'zh-CN',
    })
    const theme = fixtureThemeOptions()
    mount(Root, {
      global: {
        provide: { [SYNCTROL_THEME_OPTIONS_KEY as symbol]: theme },
      },
    })
    await nextTick()
    expect(replace).toHaveBeenCalledWith('/zh/')
    vi.unstubAllGlobals()
  })
})
