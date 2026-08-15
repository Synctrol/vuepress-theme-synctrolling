import { describe, expect, it } from 'vitest'
import { serializeHeadTags } from '../../../src/compiler/seo/serialize-head.js'
import type { PageSeo } from '../../../src/shared/seo/types.js'

const seo: PageSeo = {
  title: 'Launch',
  description: 'Summary',
  canonicalUrl: 'https://synctrol.com/en/article/launch/',
  lang: 'en-US',
  robots: 'index,follow',
  openGraph: { type: 'article', title: 'Launch', description: 'Summary', url: 'https://synctrol.com/en/article/launch/', image: 'https://synctrol.com/cover.webp', locale: 'en-US' },
  hreflang: [{ hreflang: 'zh-CN', href: 'https://synctrol.com/zh/article/launch/' }],
  jsonLd: [{ '@context': 'https://schema.org', '@type': 'Article', headline: 'Launch' }],
}

describe('serializeHeadTags', () => {
  it('emits deterministic title, meta, canonical, hreflang, and json-ld tags', () => {
    const tags = serializeHeadTags(seo)
    expect(tags[0]).toEqual({ tag: 'title', text: 'Launch' })
    expect(tags).toContainEqual({ tag: 'meta', attrs: { name: 'description', content: 'Summary' } })
    expect(tags).toContainEqual({ tag: 'link', attrs: { rel: 'canonical', href: 'https://synctrol.com/en/article/launch/' } })
    expect(tags).toContainEqual({ tag: 'link', attrs: { rel: 'alternate', hreflang: 'zh-CN', href: 'https://synctrol.com/zh/article/launch/' } })
    expect(tags.at(-1)).toEqual({ tag: 'script', attrs: { type: 'application/ld+json' }, text: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Launch' }) })
  })
})
