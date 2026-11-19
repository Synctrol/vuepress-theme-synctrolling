import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Social from '../../../src/client/components/Social.vue'

vi.mock('../../../src/client/assets/resolve-content-asset.js', () => ({
  resolveContentAsset: (ref: string) => {
    if (ref.includes('nope')) throw new Error('unknown asset')
    return `/assets/content/page/${ref.replace('./assets/', '')}.hash.svg`
  },
}))

describe('Social', () => {
  it('renders a standalone external icon link with resolved package asset', () => {
    const wrapper = mount(Social, {
      props: {
        icon: './assets/github.svg',
        href: 'https://github.com/synctrol',
        label: 'GitHub',
      },
    })
    const link = wrapper.get('a.syn-social')
    expect(link.attributes('href')).toBe('https://github.com/synctrol')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(link.attributes('aria-label')).toBe('GitHub')
    const img = link.get('img')
    expect(img.attributes('src')).toBe(
      '/assets/content/page/github.svg.hash.svg',
    )
    expect(img.attributes('alt')).toBe('')
    expect(img.attributes('aria-hidden')).toBe('true')
  })

  it('passes through root-absolute and remote icon URLs without hashing', () => {
    const absolute = mount(Social, {
      props: {
        icon: '/assets/icons/x.svg',
        href: 'https://x.com/synctrol',
        label: 'X',
      },
    })
    expect(absolute.get('img').attributes('src')).toBe('/assets/icons/x.svg')

    const remote = mount(Social, {
      props: {
        icon: 'https://cdn.example/icon.svg',
        href: 'https://example.com',
        label: 'Example',
      },
    })
    expect(remote.get('img').attributes('src')).toBe(
      'https://cdn.example/icon.svg',
    )
  })

  it('warns and hides the icon image when the package asset is unknown', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(Social, {
      props: {
        icon: './assets/nope.svg',
        href: 'https://example.com',
        label: 'Missing',
      },
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('a.syn-social').exists()).toBe(true)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
