/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NewsDetailLayout from '../../../src/client/layouts/NewsDetailLayout.vue'
import type { NewsDetailPageData } from '../../../src/shared/types/news'

const data: NewsDetailPageData = {
  kind: 'news-detail',
  slug: 'launch',
  title: '发布',
  titleLang: 'zh-CN',
  date: '2026-08-11',
  updated: '2026-08-12',
  coverPublicPath: '/base/assets/news.webp',
  tags: [{ key: 'release', title: 'Releases', publicPath: '/base/en/news/tags/release/' }],
  isFallback: true,
  isDraft: true,
  translationUnavailableMessage: 'Unavailable',
  bodyLang: 'zh-CN',
}

describe('NewsDetailLayout', () => {
  it('renders metadata, badges, cover, and slotted markdown body', () => {
    const wrapper = mount(NewsDetailLayout, {
      props: {
        data,
        publishedLabel: 'Published',
        updatedLabel: 'Updated',
        draftLabel: 'Draft',
        formatDate: (date: string) => `fmt:${date}`,
      },
      slots: { default: '<p>Markdown body</p>' },
    })
    expect(wrapper.find('[data-testid="content-column"]').exists()).toBe(true)
    expect(wrapper.find('h1').attributes('lang')).toBe('zh-CN')
    expect(wrapper.find('[data-testid="content-cover"]').attributes('src')).toBe('/base/assets/news.webp')
    expect(wrapper.find('[data-testid="updated-date"]').text()).toContain('fmt:2026-08-12')
    expect(wrapper.find('[data-testid="article-body"]').attributes('lang')).toBe('zh-CN')
    expect(wrapper.find('[data-testid="article-body"]').text()).toContain('Markdown body')
    expect(wrapper.find('[data-testid="search"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'TableOfContents' }).exists()).toBe(false)
  })
})
