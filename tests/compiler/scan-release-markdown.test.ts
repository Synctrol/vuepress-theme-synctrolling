import { describe, expect, it } from 'vitest'
import { scanReleaseMarkdown } from '../../src/compiler/scan-release-markdown'

describe('scanReleaseMarkdown', () => {
  it('extracts unique album src paths and Player attributes', () => {
    const sourcePath = '/content/releases/demo/zh.md'
    const result = scanReleaseMarkdown(
      [
        '<AlbumIdentity src="./album.yml" />',
        '<AlbumTracklist src="./album.yml"></AlbumTracklist>',
        "<AlbumCredit src='./credits.yml' />",
        '<AlbumCovers src="./album.yml" />',
        '<Player type="netease_player" url="https://music.163.com/#/album?id=123" />',
        '<Player type="youtube_player" videoId="abcdefghijk" autoplay="false" />',
      ].join('\n'),
      sourcePath,
    )

    expect(result.albumSrcPaths).toEqual([
      './album.yml',
      './credits.yml',
    ])
    expect(result.players).toEqual([
      {
        type: 'netease_player',
        attrs: {
          url: 'https://music.163.com/#/album?id=123',
        },
        sourcePath,
        line: 5,
      },
      {
        type: 'youtube_player',
        attrs: {
          videoId: 'abcdefghijk',
          autoplay: 'false',
        },
        sourcePath,
        line: 6,
      },
    ])
  })

  it('rejects Album components without a static src', () => {
    expect(() =>
      scanReleaseMarkdown(
        '<AlbumIdentity />',
        '/content/releases/demo/zh.md',
      ),
    ).toThrow(/AlbumIdentity.*src/)
  })

  it('rejects Player without a static type', () => {
    expect(() =>
      scanReleaseMarkdown(
        '<Player url="https://example.com" />',
        '/content/releases/demo/zh.md',
      ),
    ).toThrow(/Player.*type/)
  })
})
