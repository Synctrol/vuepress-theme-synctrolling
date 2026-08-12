import { describe, expect, it } from 'vitest'
import { resolveCollectionCopy } from '../../../src/compiler/seo/collection-copy.js'
import { definitions, page, resolvedOptions, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()

describe('resolveCollectionCopy', () => {
  it('returns null for detail pages', () => {
    expect(
      resolveCollectionCopy(
        page({ identity: 'release:first', locale: 'en', contentType: 'release', url: url('https://synctrol.com/en/releases/first/'), title: 'First' }),
        options,
        definitions(),
      ),
    ).toBeNull()
  })

  it('resolves indexes, pagination, and tag archives', () => {
    expect(
      resolveCollectionCopy(
        page({ identity: 'release-index', locale: 'zh', contentType: 'release-collection', url: url('https://synctrol.com/zh/releases/'), collection: { page: 1, pageCount: 1, itemIdentities: [] } }),
        options,
        definitions(),
      ),
    ).toEqual({ title: '作品', description: 'Synctrol 作品列表' })

    expect(
      resolveCollectionCopy(
        page({ identity: 'news-page:2', locale: 'en', contentType: 'news-collection', url: url('https://synctrol.com/en/news/page/2/'), collection: { page: 2, pageCount: 3, itemIdentities: [] } }),
        options,
        definitions(),
      ),
    ).toEqual({ title: 'News · Page 2', description: 'Synctrol news' })

    expect(
      resolveCollectionCopy(
        page({ identity: 'news-tag:release:page:2', locale: 'zh', contentType: 'news-collection', url: url('https://synctrol.com/zh/news/tags/release/page/2/'), collection: { page: 2, pageCount: 2, itemIdentities: [], tag: 'release' } }),
        options,
        definitions({ tags: { release: { title: { zh: '作品发布', en: 'Releases' } } } }),
      ),
    ).toEqual({ title: '作品发布 · 新闻 · 第 2 页', description: 'Synctrol 新闻' })
  })
})
