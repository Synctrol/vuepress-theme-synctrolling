import { describe, expect, it } from 'vitest'
import { buildNewsListItems } from '../../../src/compiler/news/build-news-list-items'
import { buildNewsTagsIndex } from '../../../src/compiler/news/build-news-tags-index'
import {
  newsDefinitions,
  newsDetailPage,
  newsPackage,
  tagArchivePage,
  themeOptions,
} from '../../helpers/news-fixtures'

describe('buildNewsTagsIndex', () => {
  it('lists all declared tags with visible counts and compiled archive links', () => {
    const a = newsPackage({ slug: 'a', tags: ['release'] })
    const b = newsPackage({ slug: 'b', tags: ['release', 'tour'] })
    const options = themeOptions()
    const tagPages = [tagArchivePage('release'), tagArchivePage('tour')]
    const items = buildNewsListItems({
      locale: 'en',
      packages: [a, b],
      detailPages: [newsDetailPage(a, 'en'), newsDetailPage(b, 'en')],
      tagArchivePages: tagPages,
      options,
      definitions: newsDefinitions,
      resolveCoverPublicPath: () => undefined,
      base: '/base/',
    })
    expect(
      buildNewsTagsIndex({
        locale: 'en',
        items,
        definitions: newsDefinitions,
        options,
        tagArchivePages: tagPages,
      }),
    ).toEqual([
      {
        key: 'release',
        title: 'Releases',
        titleLang: 'en-US',
        count: 2,
        publicPath: '/base/en/news/tags/release/',
      },
      {
        key: 'tour',
        title: 'Tour',
        titleLang: 'en-US',
        count: 1,
        publicPath: '/base/en/news/tags/tour/',
      },
    ])
  })

  it('keeps unused declared tags at count 0 without fabricating a missing archive link', () => {
    const rows = buildNewsTagsIndex({
      locale: 'zh',
      items: [],
      definitions: newsDefinitions,
      options: themeOptions(),
      tagArchivePages: [],
    })
    expect(rows.find((row) => row.key === 'tour')).toMatchObject({
      title: '巡演',
      titleLang: 'zh-CN',
      count: 0,
      publicPath: undefined,
    })
  })
})
