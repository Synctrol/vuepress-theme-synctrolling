import { describe, expect, it } from 'vitest'
import {
  selectAlbumCovers,
  selectReleaseArtwork,
  selectReleaseCover,
  selectReleaseImageRoles,
} from '../../../src/shared/release/image-roles'
import { albumBook, asset } from '../../helpers/release-fixtures'

describe('Release image roles', () => {
  it('keeps cover, artwork, and album.covers independent with no fallback', () => {
    const roles = selectReleaseImageRoles({
      cover: './assets/article-cover.webp',
      artwork: './assets/album-entry.webp',
      book: albumBook(),
    })
    expect(roles.cover).toBe('./assets/article-cover.webp')
    expect(roles.artwork).toBe('./assets/album-entry.webp')
    expect(roles.albumCovers).toEqual([
      './assets/front.webp',
      './assets/back.webp',
    ])
  })

  it('does not use cover when artwork is missing', () => {
    expect(
      selectReleaseArtwork({
        cover: './assets/article-cover.webp',
        artwork: undefined,
      }),
    ).toBeUndefined()
  })

  it('does not use artwork or album covers as cover', () => {
    expect(
      selectReleaseCover({
        cover: undefined,
        artwork: './assets/album-entry.webp',
        book: albumBook(),
      }),
    ).toBeUndefined()
  })

  it('does not use artwork as an album cover substitute', () => {
    expect(
      selectAlbumCovers({
        artwork: './assets/album-entry.webp',
        book: albumBook({ album: { covers: undefined } }),
      }),
    ).toEqual([])
  })

  it('returns empty album covers when there is no album book', () => {
    expect(
      selectAlbumCovers({ artwork: './assets/a.webp', book: undefined }),
    ).toEqual([])
  })

  it('maps resolved assets without cross-role substitution', () => {
    const roles = selectReleaseImageRoles({
      cover: './assets/article-cover.webp',
      artwork: undefined,
      book: albumBook({ album: { covers: ['./assets/front.webp'] } }),
    })
    const resolved = {
      cover: roles.cover
        ? asset('/assets/content/release/first-release/article-cover.hash.webp')
        : undefined,
      artwork: roles.artwork
        ? asset('/assets/content/release/first-release/album-entry.hash.webp')
        : undefined,
      albumCovers: roles.albumCovers.map(() =>
        asset('/assets/content/release/first-release/front.hash.webp'),
      ),
    }
    expect(resolved.cover?.publicPath).toContain('article-cover')
    expect(resolved.artwork).toBeUndefined()
    expect(resolved.albumCovers).toHaveLength(1)
  })
})
