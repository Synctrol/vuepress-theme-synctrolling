import type { CompiledSite } from '../compile-site-routes.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { HeadTag, PageSeo, SeoContentContext } from '../../shared/seo/types.js'
import { generateLocaleRssXml, rssOutputPath, selectRssItems } from '../feeds/rss.js'
import { generateSitemapXml, selectSitemapUrls, sitemapOutputPath } from '../feeds/sitemap.js'
import { buildSiteSeo } from './build-page-seo.js'
import { serializeHeadTags } from './serialize-head.js'

export interface FeedFileToWrite {
  outputPath: string
  publicPath: string
  contents: string
}

export interface EmitSeoAndFeedsResult {
  pageSeo: Map<string, PageSeo>
  headTagsByRoute: Map<string, HeadTag[]>
  filesToWrite: FeedFileToWrite[]
}

export function emitSeoAndFeeds(input: {
  site: CompiledSite
  options: ResolvedSynctrolThemeOptions
  content: SeoContentContext
  base: string
}): EmitSeoAndFeedsResult {
  const pageSeo = buildSiteSeo(input.site, input.options, input.content)
  const headTagsByRoute = new Map([...pageSeo].map(([key, seo]) => [key, serializeHeadTags(seo)] as const))
  const filesToWrite: FeedFileToWrite[] = []

  if (input.options.feeds.rss) {
    for (const locale of Object.keys(input.options.locales)) {
      const home = input.site.pages.find((page) => page.locale === locale && page.identity === 'home')
      if (!home) throw new Error(`Missing home page for locale RSS channel: ${locale}`)
      const paths = rssOutputPath(locale, input.base)
      filesToWrite.push({
        outputPath: paths.outputPath,
        publicPath: paths.publicPath,
        contents: generateLocaleRssXml({
          locale,
          options: input.options,
          channelLink: home.url.absoluteUrl,
          items: selectRssItems(input.site.pages, locale, input.options, input.content),
        }),
      })
    }
  }

  if (input.options.feeds.sitemap) {
    const paths = sitemapOutputPath(input.base)
    filesToWrite.push({
      outputPath: paths.outputPath,
      publicPath: paths.publicPath,
      contents: generateSitemapXml(selectSitemapUrls(input.site.pages)),
    })
  }

  return { pageSeo, headTagsByRoute, filesToWrite }
}
