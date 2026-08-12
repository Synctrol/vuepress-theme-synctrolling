import type { PageContentType } from './resolve-type.js'

/**
 * Shape of fields read from `page.value.frontmatter.synctrol`
 * (Plans 03–05 nest theme page data here — never `page.synctrol`).
 */
export interface SynctrolClientPageData {
  locale: string
  contentType: PageContentType
  /** Stamped by Plan 06 theme.ts PATCH from `compiled.url.routePath`. */
  routePath: string
  identity?: string
  contentAssets?: Record<string, string>
  alternates?: Array<{ locale: string; publicPath: string }>
}
