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

  it('renders the optional icon mark as an image from the configured URL', () => {
    const wrapper = mountShell(Navigation, {
      locale: 'zh',
      themeOverrides: {
        navigation: {
          externalTarget: '_blank',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/synctrol',
              icon: '/assets/icons/github.svg',
            },
          ],
        },
      },
    })
    const link = wrapper.get('a')
    const mark = link.get('.syn-navigation__mark')
    expect(mark.attributes('aria-hidden')).toBe('true')
    const img = mark.get('img.syn-navigation__mark-icon')
    expect(img.attributes('src')).toBe('/assets/icons/github.svg')
    expect(img.attributes('alt')).toBe('')
    expect(link.get('.syn-navigation__label').text()).toBe('GitHub')
  })

  it('omits the mark when no icon is configured', () => {
    const wrapper = mountShell(Navigation, { locale: 'zh' })
    expect(wrapper.find('.syn-navigation__mark').exists()).toBe(false)
    expect(wrapper.get('a .syn-navigation__label').text()).toBeTruthy()
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
