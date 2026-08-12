import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'
import type { CompiledPage } from '../../shared/route-types.js'

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

export function sitemapOutputPath(base: string): { routePath: string; outputPath: string; publicPath: string } {
  const routePath = '/sitemap.xml'
  return { routePath, outputPath: 'sitemap.xml', publicPath: joinPublicPath(normalizeBase(base), routePath) }
}

export function selectSitemapUrls(pages: readonly CompiledPage[]): string[] {
  return pages.filter((page) => !page.isDraft && !page.isFallback).map((page) => page.url.absoluteUrl).sort()
}

export function generateSitemapXml(urls: readonly string[]): string {
  const body = urls.map((loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
  </url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
}
