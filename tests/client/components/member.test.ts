import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Member from '../../../src/client/components/Member.vue'
import Social from '../../../src/client/components/Social.vue'

vi.mock('../../../src/client/assets/resolve-content-asset.js', () => ({
  resolveContentAsset: (ref: string) => {
    if (ref.includes('nope')) throw new Error('unknown asset')
    return `/assets/content/page/${ref.replace('./assets/', '')}.hash.webp`
  },
}))

describe('Member', () => {
  it('renders a horizontal card with avatar, name, and bio', () => {
    const wrapper = mount(Member, {
      props: {
        name: 'Alice Chen',
        avatar: './assets/alice.webp',
      },
      slots: {
        default: '编曲 / 制作。',
      },
    })

    expect(wrapper.classes()).toContain('syn-member')
    const img = wrapper.get('.syn-member__avatar img')
    expect(img.attributes('src')).toBe(
      '/assets/content/page/alice.webp.hash.webp',
    )
    expect(img.attributes('alt')).toBe('Alice Chen')
    expect(wrapper.get('.syn-member__name').text()).toBe('Alice Chen')
    expect(wrapper.get('.syn-member__bio').text()).toContain('编曲 / 制作。')
    expect(wrapper.find('.syn-member__socials').exists()).toBe(false)
  })

  it('collects nested Social children into the socials row', () => {
    const Host = defineComponent({
      components: { Member, Social },
      setup() {
        return () =>
          h(
            Member,
            { name: 'Alice Chen', avatar: './assets/alice.webp' },
            () => [
              '编曲 / 制作。',
              h(Social, {
                icon: './assets/github.svg',
                href: 'https://github.com/alice',
                label: 'GitHub',
              }),
              h(Social, {
                icon: '/assets/icons/x.svg',
                href: 'https://x.com/alice',
                label: 'X',
              }),
            ],
          )
      },
    })

    const wrapper = mount(Host)

    const socials = wrapper.get('.syn-member__socials')
    const links = socials.findAll('a.syn-social')
    expect(links).toHaveLength(2)
    expect(links[0].attributes('href')).toBe('https://github.com/alice')
    expect(links[0].attributes('aria-label')).toBe('GitHub')
    expect(links[0].get('img').attributes('src')).toBe(
      '/assets/content/page/github.svg.hash.webp',
    )
    expect(links[1].attributes('href')).toBe('https://x.com/alice')
    expect(links[1].get('img').attributes('src')).toBe('/assets/icons/x.svg')
    expect(wrapper.findAll('a.syn-social')).toHaveLength(2)
    expect(wrapper.get('.syn-member__bio').text()).toContain('编曲 / 制作。')
  })

  it('unwraps Social nodes nested in markdown paragraph wrappers', () => {
    const Host = defineComponent({
      components: { Member, Social },
      setup() {
        return () =>
          h(
            Member,
            { name: 'Alice Chen', avatar: './assets/alice.webp' },
            () => [
              h('p', null, '编曲 / 制作。'),
              h('p', null, [
                h(Social, {
                  icon: './assets/github.svg',
                  href: 'https://github.com/alice',
                  label: 'GitHub',
                }),
              ]),
            ],
          )
      },
    })

    const wrapper = mount(Host)
    expect(wrapper.findAll('.syn-member__socials a.syn-social')).toHaveLength(1)
    expect(wrapper.get('.syn-member__bio').text()).toContain('编曲 / 制作。')
    expect(wrapper.find('.syn-member__bio a.syn-social').exists()).toBe(false)
  })

  it('warns and omits the avatar image when the asset is unknown', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(Member, {
      props: {
        name: 'Ghost',
        avatar: './assets/nope.webp',
      },
    })
    expect(wrapper.find('.syn-member__avatar img').exists()).toBe(false)
    expect(wrapper.get('.syn-member__name').text()).toBe('Ghost')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
