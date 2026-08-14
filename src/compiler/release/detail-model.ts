import type {
  Book,
  ContentDefinitions,
  LocaleKey,
  LocaleMessages,
  Multilanguage,
  RouteContentPackage,
} from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import type { CompiledPage } from '../../shared/route-types.js'
import type { ResolvedAsset } from '../../shared/asset-types.js'
import type { ReleaseDetailModel } from '../../shared/release/types.js'
import {
  selectAlbumCovers,
  selectReleaseArtwork,
} from '../../shared/release/image-roles.js'
import { splitPreviewLinks } from '../../shared/release/link-roles.js'
import { numberDiscs } from '../../shared/release/numbering.js'
import { resolveMultilanguage } from '../../shared/multilanguage.js'

export interface BuildReleaseDetailModelInput {
  page: CompiledPage
  pkg: RouteContentPackage
  book: Book | undefined
  messages: LocaleMessages
  mainLocale: LocaleKey
  definitions: ContentDefinitions['platforms']
  platformTypes: Record<string, PlatformTypeRegistration>
  resolveArtwork: (pkg: RouteContentPackage) => ResolvedAsset | undefined
  resolveAlbumCover: (relativePath: string) => ResolvedAsset
  resolveGiftItemCover?: (relativePath: string) => ResolvedAsset
  resolvePlaceholder: () => ResolvedAsset | undefined
  showDrafts: boolean
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

  const artworkPath = selectReleaseArtwork({
    cover: pkg.cover,
    artwork: pkg.artwork,
  })
  const resolvedArtwork = artworkPath ? input.resolveArtwork(pkg) : undefined
  const placeholder = !resolvedArtwork ? input.resolvePlaceholder() : undefined

  let bookData: ReleaseDetailModel['book']
  if (book !== undefined) {
    const title = resolvedText(book.title, page.locale, input.mainLocale)
    const common = {
      title,
      ...(book.copyright === undefined ? {} : { copyright: book.copyright }),
      ...(book.credit === undefined ? {} : { credit: book.credit }),
    }
    if (book.type === 'album') {
      const covers = selectAlbumCovers({ artwork: pkg.artwork, book }).map(
        (p) => input.resolveAlbumCover(p),
      )
      const { previewLinks, platformLinks } = splitPreviewLinks(
        book.album.links ?? [],
        input.definitions,
        input.platformTypes,
      )
      bookData = {
        type: 'album',
        ...common,
        previewLinks,
        platformLinks,
        covers,
        discs: numberDiscs(book.album.discs ?? []),
      }
    } else {
      const resolveCover = input.resolveGiftItemCover ?? input.resolveAlbumCover
      bookData = {
        type: 'gift',
        ...common,
        items: book.gift.items.map((item) => {
          const { previewLinks, platformLinks } = splitPreviewLinks(
            item.links ?? [],
            input.definitions,
            input.platformTypes,
          )
          return {
            id: item.id,
            title: resolvedText(item.title, page.locale, input.mainLocale),
            ...(item.desc
              ? {
                  desc: resolvedText(item.desc, page.locale, input.mainLocale),
                }
              : {}),
            covers: (item.covers ?? []).map((p) => resolveCover(p)),
            previewLinks,
            platformLinks,
            ...(item.copyright ? { copyright: item.copyright } : {}),
          }
        }),
      }
    }
  }

  return {
    showDraftBadge: page.isDraft && input.showDrafts,
    draftLabel: messages.draft,
    includedInIndex: true,
    date: pkg.date ?? '',
    artwork: {
      kind: resolvedArtwork
        ? 'artwork'
        : placeholder
          ? 'placeholder'
          : 'empty-frame',
      artwork: resolvedArtwork ?? placeholder,
      alt: page.title,
    },
    ...(bookData === undefined ? {} : { book: bookData }),
  }
}
