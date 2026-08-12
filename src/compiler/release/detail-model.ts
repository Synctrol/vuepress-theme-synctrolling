import type {
  Book,
  LocaleKey,
  LocaleMessages,
  Multilanguage,
  RouteContentPackage,
} from '../../shared/types.js'
import type { ReleaseOptions } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { ResolvedAsset } from '../../shared/asset-types.js'
import type {
  ReleaseDetailModel,
  ReleaseDetailSection,
} from '../../shared/release/types.js'
import {
  selectAlbumCovers,
  selectReleaseArtwork,
} from '../../shared/release/image-roles.js'
import { numberDiscs } from '../../shared/release/numbering.js'
import { resolveMultilanguage } from '../../shared/multilanguage.js'

export interface BuildReleaseDetailModelInput {
  page: CompiledPage
  pkg: RouteContentPackage
  book: Book | undefined
  messages: LocaleMessages
  mainLocale: LocaleKey
  releaseIndexHref: string
  resolveArtwork: (pkg: RouteContentPackage) => ResolvedAsset | undefined
  resolveAlbumCover: (relativePath: string) => ResolvedAsset
  resolveGiftItemCover?: (relativePath: string) => ResolvedAsset
  resolvePlaceholder: () => ResolvedAsset | undefined
  releaseOptions: ReleaseOptions
  showDrafts: boolean
  formatDate: (yyyyMmDd: string, locale: LocaleKey) => string
}

function resolvedText(
  value: Multilanguage,
  locale: LocaleKey,
  mainLocale: LocaleKey,
) {
  const r = resolveMultilanguage(value, locale, mainLocale)
  return {
    text: r.text,
    ...(r.fellBack ? { lang: r.locale } : {}),
  }
}

export function buildReleaseDetailModel(
  input: BuildReleaseDetailModelInput,
): ReleaseDetailModel {
  const { page, pkg, book, messages } = input
  const sections: ReleaseDetailSection[] = []

  sections.push({
    kind: 'return-link',
    href: input.releaseIndexHref,
    label: messages.returnToReleases,
  })

  sections.push({
    kind: 'title-date',
    title: page.title,
    date: input.formatDate(pkg.date!, page.locale),
    dateLabel: messages.published,
    ...(page.isFallback ? { titleLang: page.bodyLocale } : {}),
  })

  const artworkPath = selectReleaseArtwork({
    cover: pkg.cover,
    artwork: pkg.artwork,
  })
  const resolvedArtwork = artworkPath ? input.resolveArtwork(pkg) : undefined
  const placeholder =
    !resolvedArtwork && input.releaseOptions.artworkPlaceholder
      ? input.resolvePlaceholder()
      : undefined
  sections.push({
    kind: 'artwork',
    artworkKind: resolvedArtwork
      ? 'artwork'
      : placeholder
        ? 'placeholder'
        : 'empty-frame',
    artwork: resolvedArtwork ?? placeholder,
    alt: page.title,
  })

  if (book) {
    sections.push({
      kind: 'book-identity',
      bookType: book.type,
      title: resolvedText(book.title, page.locale, input.mainLocale),
      ...(book.desc
        ? { desc: resolvedText(book.desc, page.locale, input.mainLocale) }
        : {}),
      ...(book.authors ? { authors: book.authors } : {}),
      ...(book.copyright ? { copyright: book.copyright } : {}),
    })

    if (book.type === 'album') {
      const covers = selectAlbumCovers({ artwork: pkg.artwork, book }).map((p) =>
        input.resolveAlbumCover(p),
      )
      sections.push({
        kind: 'album-body',
        order: ['links', 'covers', 'discs'],
        links: book.album.links ?? [],
        covers,
        discs: numberDiscs(book.album.discs ?? []),
        labels: {
          platformLinks: messages.platformLinks,
          covers: messages.covers,
          tracklist: messages.tracklist,
          disc: messages.disc,
          track: messages.track,
        },
      })
    } else {
      const resolveCover = input.resolveGiftItemCover ?? input.resolveAlbumCover
      sections.push({
        kind: 'gift-body',
        items: book.gift.items.map((item) => ({
          id: item.id,
          title: resolvedText(item.title, page.locale, input.mainLocale),
          ...(item.desc
            ? { desc: resolvedText(item.desc, page.locale, input.mainLocale) }
            : {}),
          covers: (item.covers ?? []).map((p) => resolveCover(p)),
          links: item.links ?? [],
          ...(item.copyright ? { copyright: item.copyright } : {}),
          coverOrder: 'before-links' as const,
          linksHoisted: false as const,
        })),
        labels: {
          giftItems: messages.giftItems,
          covers: messages.covers,
          platformLinks: messages.platformLinks,
        },
      })
    }
  }

  sections.push({
    kind: 'markdown',
    bodyLang: page.bodyLocale,
  })

  return {
    sections,
    showDraftBadge: Boolean(input.showDrafts && page.isDraft),
    draftLabel: messages.draft,
    includedInIndex: true,
  }
}
