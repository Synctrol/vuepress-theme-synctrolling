import { resolveMultilanguage } from '../../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { JsonLdNode, SeoContentContext } from '../../shared/seo/types.js'
import type { AlbumBook, LocaleKey } from '../../shared/types.js'

export function secondsToIsoDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  let out = 'PT'
  if (hours > 0) out += `${hours}H`
  if (minutes > 0) out += `${minutes}M`
  if (seconds > 0 || (hours === 0 && minutes === 0)) out += `${seconds}S`
  return out
}

export function buildOrganizationJsonLd(options: ResolvedSynctrolThemeOptions, logoAbsoluteUrl: string): JsonLdNode {
  return { '@context': 'https://schema.org', '@type': 'Organization', name: options.seo.organization.name, url: options.siteUrl, logo: logoAbsoluteUrl }
}

export function buildWebSiteJsonLd(input: { name: string; url: string; organizationName: string; organizationUrl: string }): JsonLdNode {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: input.name, url: input.url, publisher: { '@type': 'Organization', name: input.organizationName, url: input.organizationUrl } }
}

export function buildArticleJsonLd(input: { headline: string; description: string; canonicalUrl: string; image: string; datePublished: string; dateModified?: string; organizationName: string }): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    image: input.image,
    datePublished: input.datePublished,
    ...(input.dateModified === undefined ? {} : { dateModified: input.dateModified }),
    author: { '@type': 'Organization', name: input.organizationName },
    mainEntityOfPage: input.canonicalUrl,
  }
}

export function buildAlbumJsonLd(input: { book: AlbumBook; locale: LocaleKey; mainLocale: LocaleKey; pageUrl: string }): JsonLdNode[] {
  const name = resolveMultilanguage(input.book.title, input.locale, input.mainLocale).text
  const recordings: JsonLdNode[] = []
  const tracks: JsonLdNode[] = []
  let position = 0
  for (const [discIndex, disc] of (input.book.album.discs ?? []).entries()) {
    for (const [trackIndex, track] of disc.tracks.entries()) {
      position += 1
      const trackName = resolveMultilanguage(track.title, input.locale, input.mainLocale).text
      tracks.push({ '@type': 'MusicRecording', name: trackName, position })
      recordings.push({
        '@context': 'https://schema.org',
        '@type': 'MusicRecording',
        name: trackName,
        byArtist: track.artists.map((artist) => ({ '@type': 'MusicGroup', name: artist })),
        duration: secondsToIsoDuration(track.duration),
        position,
        url: `${input.pageUrl}#disc-${discIndex + 1}-track-${trackIndex + 1}`,
      })
    }
  }
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'MusicAlbum',
      name,
      numTracks: position,
      track: tracks,
      url: input.pageUrl,
    },
    ...recordings,
  ]
}

export function buildPageJsonLd(
  page: CompiledPage,
  options: ResolvedSynctrolThemeOptions,
  content: SeoContentContext,
  meta: { title: string; description: string; canonicalUrl: string; image: string },
): JsonLdNode[] {
  if (page.identity === 'home') {
    return [
      buildOrganizationJsonLd(options, content.assets.organizationLogoAbsoluteUrl),
      buildWebSiteJsonLd({
        name: resolveMultilanguage(options.seo.name, page.locale, options.mainLocale).text,
        url: meta.canonicalUrl,
        organizationName: options.seo.organization.name,
        organizationUrl: options.siteUrl,
      }),
    ]
  }
  if (page.contentType === 'news' && page.packagePath) {
    const datePublished = content.dateByPackagePath.get(page.packagePath)
    if (!datePublished) throw new Error(`Missing news date for ${page.packagePath}`)
    return [buildArticleJsonLd({ headline: meta.title, description: meta.description, canonicalUrl: meta.canonicalUrl, image: meta.image, datePublished, dateModified: content.updatedByPackagePath.get(page.packagePath), organizationName: options.seo.organization.name })]
  }
  if (page.contentType === 'release' && page.packagePath) {
    const book = content.bookByPackagePath.get(page.packagePath)
    return book?.type === 'album' ? buildAlbumJsonLd({ book, locale: page.locale, mainLocale: options.mainLocale, pageUrl: meta.canonicalUrl }) : []
  }
  return []
}
