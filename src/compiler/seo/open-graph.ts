import type { CompiledPage } from '../../shared/route-types.js'
import type { OpenGraphData } from '../../shared/seo/types.js'

export function buildOpenGraph(input: {
  contentType: CompiledPage['contentType']
  title: string
  description: string
  canonicalUrl: string
  image: string
  lang: string
}): OpenGraphData {
  return {
    type: input.contentType === 'news' ? 'article' : 'website',
    title: input.title,
    description: input.description,
    url: input.canonicalUrl,
    image: input.image,
    locale: input.lang,
  }
}
