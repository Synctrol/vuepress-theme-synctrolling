import type { AssetPath } from '../types.js'
import type { ReleaseImageRoles, ReleaseManifestImages } from './types.js'

export function selectReleaseCover(
  input: Pick<ReleaseManifestImages, 'cover' | 'artwork' | 'book'>,
): AssetPath | undefined {
  return input.cover
}

export function selectReleaseArtwork(
  input: Pick<ReleaseManifestImages, 'cover' | 'artwork'>,
): AssetPath | undefined {
  return input.artwork
}

export function selectAlbumCovers(
  input: Pick<ReleaseManifestImages, 'artwork' | 'book'>,
): AssetPath[] {
  const book = input.book
  if (!book || book.type !== 'album') return []
  return book.album.covers ?? []
}

export function selectReleaseImageRoles(
  input: ReleaseManifestImages,
): ReleaseImageRoles {
  return {
    cover: selectReleaseCover(input),
    artwork: selectReleaseArtwork(input),
    albumCovers: selectAlbumCovers(input),
  }
}
