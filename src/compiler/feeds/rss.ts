import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { RssItem, SeoContentContext } from '../../shared/seo/types.js'
import type { LocaleKey } from '../../shared/types.js'
import { resolvePageDescription } from '../seo/resolve-description.js'

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

export function calendarDateToRfc1123(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!, 0, 0, 0)).toUTCString()
}

export function rssOutputPath(locale: LocaleKey, base: string): { routePath: string; outputPath: string; publicPath: string } {
  const routePath = `/${locale}/rss.xml`
  return { routePath, outputPath: `${locale}/rss.xml`, publicPath: joinPublicPath(normalizeBase(base), routePath) }
}

export function selectRssItems(
  pages: readonly CompiledPage[],
  locale: LocaleKey,
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
): RssItem[] {
  return pages
    .filter((page) => page.locale === locale && (page.contentType === 'news' || page.contentType === 'release') && !page.isDraft && !page.isFallback && page.packagePath)
    .sort((a, b) => {
      const da = content.dateByPackagePath.get(a.packagePath!) ?? ''
      const db = content.dateByPackagePath.get(b.packagePath!) ?? ''
      if (da !== db) return db < da ? -1 : 1
      const ai = String(a.identity)
      const bi = String(b.identity)
      return ai < bi ? -1 : ai > bi ? 1 : 0
    })
    .map((page) => {
      const date = content.dateByPackagePath.get(page.packagePath!)
      if (!date) throw new Error(`Missing date for RSS item ${page.packagePath}`)
      return {
        title: page.title,
        description: resolvePageDescription(page, options, null),
        link: page.url.absoluteUrl,
        guid: page.url.absoluteUrl,
        pubDate: calendarDateToRfc1123(date),
      }
    })
}

export function generateLocaleRssXml(input: { locale: LocaleKey; options: ResolvedSynctrolThemeOptions; channelLink: string; items: readonly RssItem[] }): string {
  const title = resolveMultilanguage(input.options.seo.name, input.locale, input.options.mainLocale).text
  const description = resolveMultilanguage(input.options.seo.description, input.locale, input.options.mainLocale).text
  const itemXml = input.items.map((item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid>${escapeXml(item.guid)}</guid>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(input.channelLink)}</link>
    <description>${escapeXml(description)}</description>
    <language>${escapeXml(input.options.locales[input.locale]!.lang)}</language>
${itemXml}
  </channel>
</rss>
`
}
