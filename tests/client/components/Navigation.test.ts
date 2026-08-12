import { describe, expect, it } from 'vitest'
import Navigation from '../../../src/client/components/Navigation.vue'
import { mountShell } from '../harness/mount'

describe('Navigation', () => {
  it('renders items in configuration order with localized labels', () => {
    const wrapper = mountShell(Navigation, { locale: 'en' })
    const links = wrapper.findAll('a')
    expect(links).toHaveLength(2)
    expect(links[0]!.text()).toBe('Releases')
    expect(links[0]!.attributes('href')).toBe('/en/releases/')
    expect(links[1]!.text()).toBe('GitHub')
    expect(links[1]!.attributes('href')).toBe('https://github.com/synctrol')
  })

  it('applies externalTarget and safe rel on external links', () => {
    const wrapper = mountShell(Navigation, {
      locale: 'zh',
      themeOverrides: {
        navigation: {
          externalTarget: '_blank',
          items: [
            { label: 'GitHub', href: 'https://github.com/synctrol' },
          ],
        },
      },
    })
    const link = wrapper.get('a')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('uses _self without forcing rel when configured', () => {
    const wrapper = mountShell(Navigation, {
      locale: 'zh',
      themeOverrides: {
        navigation: {
          externalTarget: '_self',
          items: [
            { label: 'GitHub', href: 'https://github.com/synctrol' },
          ],
        },
      },
    })
    const link = wrapper.get('a')
    expect(link.attributes('target')).toBe('_self')
    expect(link.attributes('rel')).toBeUndefined()
  })
})
