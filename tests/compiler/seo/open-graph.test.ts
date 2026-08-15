import { describe, expect, it } from 'vitest'
import { buildOpenGraph } from '../../../src/compiler/seo/open-graph.js'

describe('buildOpenGraph', () => {
  it('uses article for news details and website otherwise', () => {
    expect(buildOpenGraph({ contentType: 'news', title: 'Launch', description: 'Summary', canonicalUrl: 'https://synctrol.com/en/article/launch/', image: 'https://synctrol.com/cover.webp', lang: 'en-US' })).toEqual({
      type: 'article',
      title: 'Launch',
      description: 'Summary',
      url: 'https://synctrol.com/en/article/launch/',
      image: 'https://synctrol.com/cover.webp',
      locale: 'en-US',
    })
    expect(buildOpenGraph({ contentType: 'release', title: 'Album', description: 'Desc', canonicalUrl: 'https://synctrol.com/zh/releases/first/', image: 'https://synctrol.com/cover.webp', lang: 'zh-CN' }).type).toBe('website')
  })
})
