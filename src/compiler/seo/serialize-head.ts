import type { HeadTag, PageSeo } from '../../shared/seo/types.js'

export function serializeHeadTags(seo: PageSeo): HeadTag[] {
  const tags: HeadTag[] = [
    { tag: 'title', text: seo.title },
    { tag: 'meta', attrs: { name: 'description', content: seo.description } },
    { tag: 'meta', attrs: { name: 'robots', content: seo.robots } },
    { tag: 'link', attrs: { rel: 'canonical', href: seo.canonicalUrl } },
    { tag: 'meta', attrs: { property: 'og:type', content: seo.openGraph.type } },
    { tag: 'meta', attrs: { property: 'og:title', content: seo.openGraph.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: seo.openGraph.description } },
    { tag: 'meta', attrs: { property: 'og:url', content: seo.openGraph.url } },
    { tag: 'meta', attrs: { property: 'og:image', content: seo.openGraph.image } },
    { tag: 'meta', attrs: { property: 'og:locale', content: seo.openGraph.locale } },
  ]
  for (const alt of seo.hreflang) {
    tags.push({ tag: 'link', attrs: { rel: 'alternate', hreflang: alt.hreflang, href: alt.href } })
  }
  for (const node of seo.jsonLd) {
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, text: JSON.stringify(node) })
  }
  return tags
}
