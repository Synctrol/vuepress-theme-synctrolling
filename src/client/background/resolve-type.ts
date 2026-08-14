import type { ContentType } from '../../shared/types.js'
import type { PageContentType } from '../../shared/background.js'

export type { PageContentType } from '../../shared/background.js'

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
