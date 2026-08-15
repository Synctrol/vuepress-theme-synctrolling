import { describe, expect, it } from 'vitest'
import { resolvePageDescription } from '../../../src/compiler/seo/resolve-description.js'
import { page, resolvedOptions, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()

describe('resolvePageDescription', () => {
  it('prefers page description, then collection copy, then site locale description', () => {
    expect(resolvePageDescription(page({ identity: 'news:launch', locale: 'en', contentType: 'news', url: url('https://synctrol.com/en/article/launch/'), description: 'Launch summary' }), options, null)).toBe('Launch summary')
    expect(resolvePageDescription(page({ identity: 'news-index', locale: 'en', contentType: 'news-collection', url: url('https://synctrol.com/en/news/') }), options, { title: 'News', description: 'Synctrol news' })).toBe('Synctrol news')
    expect(resolvePageDescription(page({ identity: 'page:about', locale: 'zh', contentType: 'page', url: url('https://synctrol.com/zh/about/') }), options, null)).toBe('Synctrol 音乐团队官方网站')
  })
})
