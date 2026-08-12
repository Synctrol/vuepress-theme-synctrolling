import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LanguageSwitcher from '../../../src/client/components/LanguageSwitcher.vue'
import { LOCALE_STORAGE_KEY } from '../../../src/shared/locale-storage'
import { mountShell } from '../harness/mount'

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the full current locale label when collapsed', () => {
    const wrapper = mountShell(LanguageSwitcher, { locale: 'zh' })
    expect(wrapper.get('button.syn-language__toggle').text()).toBe('中文')
  })

  it('expands upward, navigates, persists preference, and closes', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })

    const wrapper = mountShell(LanguageSwitcher, {
      locale: 'zh',
      shellContext: {
        localeAlternates: [
          { locale: 'zh', label: '中文', href: '/zh/' },
          { locale: 'en', label: 'English', href: '/en/' },
        ],
      },
    })

    await wrapper.get('button.syn-language__toggle').trigger('click')
    expect(wrapper.find('.syn-language__list').classes()).toContain(
      'syn-language__list--open',
    )
    const en = wrapper.get('a[href="/en/"]')
    expect(en.text()).toBe('English')

    await en.trigger('click')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(assign).toHaveBeenCalledWith('/en/')
  })

  it('closes on Escape and outside click', async () => {
    const wrapper = mountShell(LanguageSwitcher, { locale: 'en' })
    await wrapper.get('button.syn-language__toggle').trigger('click')
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(false)

    await wrapper.get('button.syn-language__toggle').trigger('click')
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(false)
  })
})
