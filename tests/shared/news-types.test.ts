import { describe, expect, it } from 'vitest'
import type {
  NewsListItem,
  NewsTagCount,
  SynctrolHomeFrontmatter,
  SynctrolNewsFrontmatter,
  SynctrolPageFrontmatter,
} from '../../src/shared/types/news'

describe('Plan 09 frontmatter types', () => {
  it('models news collection, page detail, and home formatter payloads', () => {
    const item: NewsListItem = {
      identity: 'news:launch',
      slug: 'launch',
      publicPath: '/base/en/news/launch/',
      title: '发布',
      titleLang: 'zh-CN',
      description: '摘要',
      descriptionLang: 'zh-CN',
      date: '2026-08-11',
      updated: '2026-08-12',
      coverPublicPath: undefined,
      tags: [{ key: 'release', title: 'Releases', publicPath: '/base/en/news/tags/release/' }],
      isFallback: true,
      isDraft: false,
      excludeFromRss: true,
    }
    const tag: NewsTagCount = {
      key: 'release',
      title: 'Releases',
      titleLang: 'en-US',
      count: 1,
      publicPath: '/base/en/news/tags/release/',
    }
    const news: SynctrolNewsFrontmatter = {
      kind: 'index',
      data: {
        kind: 'news-index',
        heading: 'News',
        description: 'All news',
        items: [item],
        pagination: null,
      },
    }
    const page: SynctrolPageFrontmatter = {
      kind: 'detail',
      data: {
        kind: 'page-detail',
        slug: 'team',
        title: 'Team',
        titleLang: 'en-US',
        isFallback: false,
        isDraft: false,
        bodyLang: 'en-US',
      },
    }
    const home: SynctrolHomeFrontmatter = {
      kind: 'home',
      logoHtml: '<div data-syn-formatter="home-logo">SYNCTROL</div>',
    }
    expect(news.data.items[0]).toBe(item)
    expect(tag.count).toBe(1)
    expect(page.data.kind).toBe('page-detail')
    expect(home.logoHtml).toContain('home-logo')
  })
})
