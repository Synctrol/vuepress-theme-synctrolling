import type { ContentType } from '../../shared/types.js'

export type PageContentType = ContentType | 'release-collection' | 'news-collection'

export function resolveBackgroundContentType(
  contentType: PageContentType,
): ContentType {
  switch (contentType) {
    case 'release-collection':
      return 'release'
    case 'news-collection':
      return 'news'
    case 'home':
    case 'release':
    case 'news':
    case 'page':
      return contentType
    default: {
      const _exhaustive: never = contentType
      return _exhaustive
    }
  }
}
