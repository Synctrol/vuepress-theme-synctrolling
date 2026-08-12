import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import Layout from '../../../src/client/layouts/Layout.vue'
import { fixtureThemeOptions } from '../harness/fixtures'
import { mount } from '@vue/test-utils'
import {
  SYNCTROL_THEME_OPTIONS_KEY,
} from '../../../src/client/composables/keys'
import { resolveContentAsset, setContentAssetMap } from '../../../src/client'

const { pageRef } = vi.hoisted(() => {
  const { ref } = require('vue') as typeof import('vue')
  return {
    pageRef: ref({
      path: '/zh/',
      frontmatter: {
        synctrol: {
          identity: 'home',
          locale: 'zh',
          contentAssets: {
            './assets/cover.webp': '/assets/content/home/cover.abc123.webp',
          },
          alternates: [
            { locale: 'zh', publicPath: '/zh/' },
            { locale: 'en', publicPath: '/en/' },
          ],
        },
      },
    }),
  }
})

vi.mock('vuepress/client', () => {
  return {
    Content: defineComponent({
      name: 'Content',
      setup: () => () => h('article', { class: 'vp-content' }, 'Page body'),
    }),
    useRoute: () => ({ path: '/zh/' }),
    useData: () => ({
      page: pageRef,
      siteData: { value: { base: '/' } },
    }),
  }
})

describe('Layout', () => {
  it('wraps Content in the Synctrol shell using nested synctrol frontmatter', async () => {
    setContentAssetMap({})
    const theme = fixtureThemeOptions()
    const wrapper = mount(Layout, {
      global: {
        provide: {
          [SYNCTROL_THEME_OPTIONS_KEY as symbol]: theme,
        },
      },
    })
    await nextTick()
    expect(wrapper.find('.syn-shell').exists()).toBe(true)
    expect(wrapper.find('.vp-content').text()).toBe('Page body')
    expect(wrapper.find('.syn-header').exists()).toBe(true)
    expect(
      resolveContentAsset('./assets/cover.webp'),
    ).toBe('/assets/content/home/cover.abc123.webp')
  })
})
