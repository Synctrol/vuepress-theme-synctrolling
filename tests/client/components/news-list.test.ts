/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NewsList from '../../../src/client/components/news/NewsList.vue'
import NewsListItem from '../../../src/client/components/news/NewsListItem.vue'
import type { NewsListItem as Item } from '../../../src/shared/types/news'

function item(partial: Partial<Item> & Pick<Item, 'slug' | 'title'>): Item {
  return {
    identity: `news:${partial.slug}`,
    slug: partial.slug,
    publicPath: partial.publicPath ?? `/base/en/news/${partial.slug}/`,
    title: partial.title,
    titleLang: partial.titleLang ?? 'en-US',
    description: partial.description,
    descriptionLang: partial.descriptionLang,
    date: partial.date ?? '2026-08-11',
    updated: partial.updated,
    coverPublicPath: partial.coverPublicPath,
    tags: partial.tags ?? [{ key: 'release', title: 'Releases', publicPath: '/base/en/news/tags/release/' }],
    isFallback: partial.isFallback ?? false,
    isDraft: partial.isDraft ?? false,
    excludeFromRss: partial.excludeFromRss ?? false,
  }
}

describe('NewsListItem', () => {
  it('uses cover layout when coverPublicPath exists', () => {
    const wrapper = mount(NewsListItem, {
      props: {
        item: item({ slug: 'cover', title: 'Cover', coverPublicPath: '/cover.webp' }),
        formattedDate: 'Aug 11, 2026',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
      },
    })
    expect(wrapper.attributes('data-layout')).toBe('cover')
    expect(wrapper.find('[data-testid="content-cover"]').attributes('src')).toBe('/cover.webp')
  })

  it('uses text layout and fallback/draft badges when needed', () => {
    const wrapper = mount(NewsListItem, {
      props: {
        item: item({
          slug: 'fallback',
          title: '发布',
          titleLang: 'zh-CN',
          description: '中文说明',
          descriptionLang: 'zh-CN',
          isFallback: true,
          isDraft: true,
        }),
        formattedDate: 'Aug 11, 2026',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
      },
    })
    expect(wrapper.attributes('data-layout')).toBe('text')
    expect(wrapper.find('[data-testid="item-title"]').attributes('lang')).toBe('zh-CN')
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="translation-unavailable-badge"]').exists()).toBe(true)
  })
})

describe('NewsList', () => {
  it('renders empty state or one row per item', () => {
    const empty = mount(NewsList, {
      props: {
        items: [],
        emptyLabel: 'No news',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
        formatDate: (date: string) => date,
      },
    })
    expect(empty.find('[data-testid="empty-news"]').text()).toBe('No news')

    const filled = mount(NewsList, {
      props: {
        items: [item({ slug: 'a', title: 'A' }), item({ slug: 'b', title: 'B' })],
        emptyLabel: 'No news',
        draftLabel: 'Draft',
        translationUnavailableLabel: 'Unavailable',
        formatDate: (date: string) => date,
      },
    })
    expect(filled.findAllComponents(NewsListItem)).toHaveLength(2)
  })
})
