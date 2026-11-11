import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import SoundToggle from '../../../src/client/components/SoundToggle.vue'
import { SoundsEngine } from '../../../src/client/sounds/engine'
import type { AudioContextLike } from '../../../src/client/sounds/engine'
import { setSoundsRuntimeForTesting } from '../../../src/client/sounds/runtime'
import { SOUND_ENABLED_STORAGE_KEY } from '../../../src/client/sounds/storage'
import { mountShell } from '../harness/mount'

function realEngine() {
  const data = new Map<string, string>()
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
  return {
    data,
    engine: new SoundsEngine({
      storage,
      enabledFallback: true,
      urls: {},
      absoluteUrls: {},
      createContext: () => null as unknown as AudioContextLike,
      fetchBuffer: async () => new ArrayBuffer(0),
    }),
  }
}

describe('SoundToggle', () => {
  it('renders nothing when no sound keys are configured', () => {
    const wrapper = mountShell(SoundToggle)
    expect(wrapper.find('.syn-sound-toggle').exists()).toBe(false)
  })

  it('renders the chip and persists the flipped state', async () => {
    const { data, engine } = realEngine()
    setSoundsRuntimeForTesting(engine)
    try {
      const wrapper = mountShell(SoundToggle, {
        themeOverrides: {
          sounds: { enabled: true, keys: { navigate: '/sounds/navigate.webm' } },
        },
      })
      await nextTick()
      const button = wrapper.get('.syn-sound-toggle__button')
      expect(button.attributes('data-enabled')).toBe('true')
      expect(button.attributes('aria-pressed')).toBe('true')
      expect(button.attributes('aria-label')).toBe('音效开')
      await button.trigger('click')
      expect(button.attributes('data-enabled')).toBe('false')
      expect(button.attributes('aria-pressed')).toBe('false')
      expect(button.attributes('aria-label')).toBe('音效关')
      expect(engine.isEnabled()).toBe(false)
      expect(data.get(SOUND_ENABLED_STORAGE_KEY)).toBe('off')
      await button.trigger('click')
      expect(button.attributes('data-enabled')).toBe('true')
      expect(engine.isEnabled()).toBe(true)
    } finally {
      setSoundsRuntimeForTesting(null)
    }
  })
})
