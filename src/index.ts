export { synctrolTheme } from './compiler/theme.js'
export * from './shared/client-options.js'
export * from './shared/types.js'
export * from './shared/messages.js'
export * from './shared/multilanguage.js'
export * from './shared/options.js'
export type {
  BackgroundContext,
  BackgroundController,
  BackgroundLoader,
  BackgroundModule,
} from './shared/background.js'
export * from './compiler/index.js'
export * from './compiler/assets/index.js'
export * from './compiler/seo/index.js'
export type {
  HeadTag,
  HreflangAlternate,
  JsonLdNode,
  OpenGraphData,
  PageSeo,
  RssItem,
  SeoAssetContext,
  SeoContentContext,
} from './shared/seo/types.js'

export { resolvePlatformTypes } from './platforms/registry.js'
export { formatMessage } from './platforms/format-message.js'
export {
  writeSynctrolCspJson,
  assertNoCspMetaInjection,
} from './compiler/platforms/write-csp-artifact.js'
export type {
  PlatformTypeRegistration,
  PlatformsOptions,
  PlatformTypesConfig,
} from './shared/options.js'
export type {
  NewsCollectionPageData,
  NewsDetailPageData,
  NewsListItem,
  NewsTagCount,
  NewsTagLink,
  PageDetailPageData,
  SynctrolHomeFrontmatter,
  SynctrolNewsFrontmatter,
  SynctrolPageFrontmatter,
} from './shared/types/news.js'
