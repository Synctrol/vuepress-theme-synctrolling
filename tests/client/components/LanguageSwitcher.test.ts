import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LanguageSwitcher from '../../../src/client/components/LanguageSwitcher.vue'
import { LOCALE_STORAGE_KEY } from '../../../src/shared/locale-storage'
import { mountShell } from '../harness/mount'

const alternates = [
  { locale: 'zh', label: '中文', href: '/zh/' },
  { locale: 'en', label: 'English', href: '/en/' },
  { locale: 'ja', label: '日本語', href: '/ja/' },
]

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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
      shellContext: { localeAlternates: alternates.slice(0, 2) },
    })

    await wrapper.get('button.syn-language__toggle').trigger('click')
    expect(wrapper.find('.syn-language__list').classes()).toContain(
      'syn-language__list--open',
    )
    const en = wrapper
      .findAll('[role="option"]')
      .find((option) => option.text() === 'English')
    expect(en).toBeTruthy()
    expect(en!.element.tagName).toBe('BUTTON')

    await en!.trigger('click')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(assign).toHaveBeenCalledWith('/en/')
  })

  it('closes on Escape and outside click', async () => {
    const wrapper = mountShell(LanguageSwitcher, {
      locale: 'en',
      attachTo: document.body,
    })
    const toggle = wrapper.get('button.syn-language__toggle')
    ;(toggle.element as HTMLButtonElement).focus()
    await toggle.trigger('click')
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(false)
    expect(document.activeElement).toBe(toggle.element)

    await toggle.trigger('click')
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(false)
    wrapper.unmount()
  })

  it('implements listbox keyboard navigation with aria-activedescendant', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })

    const wrapper = mountShell(LanguageSwitcher, {
      locale: 'zh',
      shellContext: { localeAlternates: alternates },
      attachTo: document.body,
    })

    const toggle = wrapper.get('button.syn-language__toggle')
    ;(toggle.element as HTMLButtonElement).focus()
    await toggle.trigger('click')

    const listbox = wrapper.get('[role="listbox"]')
    expect(listbox.attributes('id')).toBeTruthy()
    expect(toggle.attributes('aria-haspopup')).toBe('listbox')
    expect(toggle.attributes('aria-controls')).toBe(listbox.attributes('id'))
    expect(toggle.attributes('aria-expanded')).toBe('true')

    const options = wrapper.findAll('[role="option"]')
    expect(options).toHaveLength(3)
    expect(options.every((o) => o.element.tagName === 'BUTTON')).toBe(true)
    expect(options[0]!.attributes('aria-selected')).toBe('true')
    expect(options[1]!.attributes('aria-selected')).toBe('false')
    expect(options[2]!.attributes('aria-selected')).toBe('false')

    const zhId = options[0]!.attributes('id')
    const enId = options[1]!.attributes('id')
    const jaId = options[2]!.attributes('id')
    expect(zhId).toBeTruthy()
    expect(toggle.attributes('aria-activedescendant')).toBe(zhId)

    await toggle.trigger('keydown', { key: 'ArrowDown' })
    expect(toggle.attributes('aria-activedescendant')).toBe(enId)

    await toggle.trigger('keydown', { key: 'ArrowDown' })
    expect(toggle.attributes('aria-activedescendant')).toBe(jaId)

    await toggle.trigger('keydown', { key: 'Home' })
    expect(toggle.attributes('aria-activedescendant')).toBe(zhId)

    await toggle.trigger('keydown', { key: 'End' })
    expect(toggle.attributes('aria-activedescendant')).toBe(jaId)

    await toggle.trigger('keydown', { key: 'ArrowUp' })
    expect(toggle.attributes('aria-activedescendant')).toBe(enId)

    await toggle.trigger('keydown', { key: 'Enter' })
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(assign).toHaveBeenCalledWith('/en/')
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(false)
    wrapper.unmount()
  })

  it('activates the active option with Space and restores focus on Escape', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })

    const wrapper = mountShell(LanguageSwitcher, {
      locale: 'en',
      shellContext: { localeAlternates: alternates.slice(0, 2) },
      attachTo: document.body,
    })

    const toggle = wrapper.get('button.syn-language__toggle')
    ;(toggle.element as HTMLButtonElement).focus()
    await toggle.trigger('click')

    await toggle.trigger('keydown', { key: 'ArrowDown' })
    await toggle.trigger('keydown', { key: ' ' })
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh')
    expect(assign).toHaveBeenCalledWith('/zh/')

    assign.mockClear()
    localStorage.clear()
    await toggle.trigger('click')
    await toggle.trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.find('.syn-language__list--open').exists()).toBe(false)
    expect(document.activeElement).toBe(toggle.element)
    expect(assign).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})