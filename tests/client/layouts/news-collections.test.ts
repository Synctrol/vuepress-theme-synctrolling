/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NewsIndexLayout from '../../../src/client/layouts/NewsIndexLayout.vue'
import NewsTagArchiveLayout from '../../../src/client/layouts/NewsTagArchiveLayout.vue'
import NewsTagsIndexLayout from '../../../src/client/layouts/NewsTagsIndexLayout.vue'
import type { NewsCollectionPageData, NewsListItem } from '../../../src/shared/types/news'

const listItem: NewsListItem = {
  identity: 'news:a',
  slug: 'a',
  publicPath: '/base/en/news/a/',
  title: 'A',
  titleLang: 'en-US',
  date: '2026-08-11',
  tags: [],
  isFallback: false,
  isDraft: false,
  excludeFromRss: false,
}

describe('News collection layouts', () => {
  it('renders News index with shared pagination', () => {
    const data: NewsCollectionPageData = {
      kind: 'news-index',
      heading: 'News',
      description: 'All news',
      items: [listItem],
      pagination: { page: 1, pageCount: 2, nextPublicPath: '/base/en/news/page/2/' },
    }
    const wrapper = mount(NewsIndexLayout, {
      props: {
        data,
        emptyLabel: 'No news',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
        previousPageLabel: 'Previous',
        nextPageLabel: 'Next',
        formatDate: (date: string) => date,
      },
    })
    expect(wrapper.find('[data-testid="content-column"]').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('News')
    expect(wrapper.find('[data-testid="pagination-next"]').attributes('href')).toBe('/base/en/news/page/2/')
  })

  it('renders Tags Index with counts and no pagination', () => {
    const data: NewsCollectionPageData = {
      kind: 'news-tags-index',
      heading: 'News tags',
      description: 'Browse tags',
      items: [],
      tags: [{ key: 'release', title: 'Releases', titleLang: 'en-US', count: 2, publicPath: '/base/en/news/tags/release/' }],
      pagination: null,
    }
    const wrapper = mount(NewsTagsIndexLayout, { props: { data } })
    expect(wrapper.find('[data-testid="news-tags-list"]').text()).toContain('Releases')
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(false)
  })

  it('renders Tag Archive with data-tag and optional pagination', () => {
    const data: NewsCollectionPageData = {
      kind: 'news-tag',
      heading: 'Releases · News',
      description: 'All news',
      tagKey: 'release',
      items: [listItem],
      pagination: { page: 1, pageCount: 1 },
    }
    const wrapper = mount(NewsTagArchiveLayout, {
      props: {
        data,
        emptyLabel: 'No news',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
        previousPageLabel: 'Previous',
        nextPageLabel: 'Next',
        formatDate: (date: string) => date,
      },
    })
    expect(wrapper.attributes('data-tag')).toBe('release')
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(false)
  })
})
