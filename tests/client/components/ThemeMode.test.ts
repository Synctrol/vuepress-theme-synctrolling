import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ThemeMode from '../../../src/client/components/ThemeMode.vue'
import { COLOR_MODE_STORAGE_KEY } from '../../../src/client/color-mode/storage'
import { __resetColorModeStateForTests } from '../../../src/client/composables/useColorMode'
import { mountShell } from '../harness/mount'

describe('ThemeMode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'light'
  })

  afterEach(() => {
    __resetColorModeStateForTests()
  })

  it('shows the auto icon by default', () => {
    const wrapper = mountShell(ThemeMode, { locale: 'en' })
    expect(wrapper.get('button').attributes('data-mode')).toBe('auto')
  })

  it('cycles AUTO → LIGHT → DARK → AUTO and persists', async () => {
    const wrapper = mountShell(ThemeMode, { locale: 'en' })
    const button = wrapper.get('button')

    await button.trigger('click')
    expect(button.attributes('data-mode')).toBe('light')
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    await button.trigger('click')
    expect(button.attributes('data-mode')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await button.trigger('click')
    expect(button.attributes('data-mode')).toBe('auto')
  })

  it('respects defaultColorMode when storage is empty', () => {
    const wrapper = mountShell(ThemeMode, {
      locale: 'en',
      themeOverrides: { defaultColorMode: 'dark' },
    })
    expect(wrapper.get('button').attributes('data-mode')).toBe('dark')
  })

  it('announces current and next mode for assistive tech', () => {
    const wrapper = mountShell(ThemeMode, { locale: 'en' })
    const live = wrapper.get('[aria-live="polite"]')
    expect(live.text()).toContain('AUTO')
    expect(live.text()).toContain('LIGHT')
  })

  it('cycles with Enter and Space', async () => {
    const wrapper = mountShell(ThemeMode, { locale: 'en' })
    const button = wrapper.get('button')
    await button.trigger('keydown', { key: 'Enter' })
    expect(button.attributes('data-mode')).toBe('light')
    await button.trigger('keydown', { key: ' ' })
    expect(button.attributes('data-mode')).toBe('dark')
  })
})
